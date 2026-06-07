import json, re, unicodedata
from pathlib import Path
import pdfplumber

BASE = Path('/mnt/data/bus_pwa')
PDF_DIR = BASE / 'pdfs'
DATA_DIR = BASE / 'data'
DATA_DIR.mkdir(parents=True, exist_ok=True)

SOURCES = {
    '801': {'network': 'RGTR', 'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/rgtr//801.pdf'},
    '802': {'network': 'RGTR', 'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/rgtr//802.pdf'},
    '811': {'network': 'RGTR', 'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/rgtr//811.pdf?v=20260512'},
    '812': {'network': 'RGTR', 'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/rgtr//812.pdf'},
    '822': {'network': 'RGTR', 'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/rgtr//822.pdf'},
    '823': {'network': 'RGTR', 'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/rgtr//823.pdf'},
    '824': {'network': 'RGTR', 'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/rgtr//824.pdf'},
    '850': {'network': 'RGTR', 'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/rgtr//850.pdf'},
    '904': {'network': 'RGTR', 'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/rgtr//904.pdf'},
    '10':  {'network': 'AVL',  'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/avl//10.pdf?v=20260413'},
}

TARGET_RGTR = [
    'FINDEL, Aéroport Quai 4',
    'MAMER, Mambra',
    'MAMER, Eglantiers',
    'BERTRANGE, Belle-Etoile',
]
TARGET_AVL10 = [
    'Bertrange, Belle Étoile Quai 1',
    'Strassen, Bourmicht Quai 1',
    'Gare Centrale Quai 1',
    'Hamilius Quai 1',
]

SERVICE_MAP = {
    '(': 'lu-sa jours ouvrables',
    'Ó': 'lu-ve jours ouvrables',
    'Õ': 'samedis, dimanches et jours fériés',
    'X': 'samedis ouvrables',
    'A': 'lu-ve jours ouvrables',
    'C': 'samedis, dimanches et jours fériés',
    '#': 'véhicule accessible PMR',
}

def norm(s: str) -> str:
    s = s or ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    s = s.replace('É', 'E').replace('é', 'e')
    s = re.sub(r'[·¸#]', '', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip().lower()

def clean_stop(s: str) -> str:
    s = s or ''
    s = s.replace('\n', ' ')
    s = re.sub(r'[·¸]', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def clean_cell(s):
    if s is None:
        return ''
    return re.sub(r'\s+', ' ', str(s).strip())

def is_time(value: str) -> bool:
    return bool(re.fullmatch(r'\d{1,2}:\d{2}', clean_cell(value)))

def minutes(t: str) -> int:
    h, m = map(int, t.split(':'))
    return h * 60 + m

def classify_window(t: str) -> str:
    m = minutes(t)
    if 7 * 60 + 15 <= m <= 8 * 60 + 15:
        return 'morning_alert'
    if 17 * 60 + 40 <= m <= 19 * 60:
        return 'evening_alert'
    return 'normal'

def matches_target(line, stop_name):
    n = norm(stop_name)
    targets = TARGET_AVL10 if line == '10' else TARGET_RGTR
    out = []
    for t in targets:
        nt = norm(t)
        if nt in n or n in nt:
            # Pour l'aéroport, ne garder que Quai 4 comme demandé.
            if 'aeroport' in nt and 'quai 4' not in n:
                continue
            # Pour AVL 10, ne garder que Quai 1 comme demandé.
            if line == '10' and 'quai 1' not in n:
                continue
            out.append(t)
    return out[0] if out else None

def table_direction(table, start_idx):
    stop_rows = []
    for row in table[start_idx:]:
        first = clean_stop(row[0] if row else '')
        if not first or first.lower().startswith('explications') or first.lower().startswith('jours de circulation'):
            continue
        if re.search(r'[A-Za-zÀ-ÿ]', first):
            stop_rows.append(first)
    if len(stop_rows) >= 2:
        return f'{stop_rows[0]} → {stop_rows[-1]}'
    return 'Direction non déterminée'

def detect_avl_service(page_index, table_index):
    if page_index in (0,): return 'Lundi-Vendredi'
    if page_index == 1 and table_index == 0: return 'Lundi-Vendredi / Samedi'
    if page_index == 1 and table_index == 1: return 'Samedi / Dimanche et jours fériés'
    if page_index == 2: return 'Dimanche et jours fériés'
    if page_index in (3,): return 'Lundi-Vendredi'
    if page_index == 4: return 'Lundi-Vendredi'
    if page_index == 5: return 'Lundi-Vendredi'
    if page_index == 6: return 'Samedi'
    if page_index == 7: return 'Dimanche et jours fériés'
    return 'Service selon PDF'

def parse_rgtr(line, path):
    records = []
    with pdfplumber.open(path) as pdf:
        for pno, page in enumerate(pdf.pages, start=1):
            for tno, table in enumerate(page.extract_tables() or [], start=1):
                if not table or len(table) < 4:
                    continue
                if 'N° de courses' not in clean_cell(table[0][0]):
                    continue
                courses = [clean_cell(x) for x in table[0]]
                services = [clean_cell(x) for x in table[1]] if len(table) > 1 else []
                notes = [clean_cell(x) for x in table[2]] if len(table) > 2 else []
                direction = table_direction(table, 3)
                for row in table[3:]:
                    if not row: continue
                    stop = clean_stop(row[0])
                    target = matches_target(line, stop)
                    if not target:
                        continue
                    for i, cell in enumerate(row[1:], start=1):
                        val = clean_cell(cell)
                        if not is_time(val):
                            continue
                        rec = {
                            'id': f'{line}-{pno}-{tno}-{i}-{norm(stop).replace(" ","_")}',
                            'line': line,
                            'network': 'RGTR',
                            'stop': stop,
                            'target_stop': target,
                            'direction': direction,
                            'time': val,
                            'time_minutes': minutes(val),
                            'period': classify_window(val),
                            'course': courses[i] if i < len(courses) else '',
                            'service': services[i] if i < len(services) else '',
                            'service_label': SERVICE_MAP.get(services[i] if i < len(services) else '', services[i] if i < len(services) else 'Selon PDF'),
                            'note': notes[i] if i < len(notes) else '',
                            'source_pdf': f'{line}.pdf',
                            'source_url': SOURCES[line]['url'],
                            'page': pno,
                        }
                        records.append(rec)
    return records

def parse_avl10(line, path):
    records = []
    with pdfplumber.open(path) as pdf:
        for pno0, page in enumerate(pdf.pages):
            for tno0, table in enumerate(page.extract_tables() or []):
                if not table or len(table) < 4:
                    continue
                direction = table_direction(table, 2)
                service = detect_avl_service(pno0, tno0)
                for row in table[2:]:
                    if not row: continue
                    stop = clean_stop(row[0])
                    target = matches_target(line, stop)
                    if not target:
                        continue
                    for i, cell in enumerate(row[1:], start=1):
                        val = clean_cell(cell)
                        if not is_time(val):
                            continue
                        rec = {
                            'id': f'10-{pno0+1}-{tno0+1}-{i}-{norm(stop).replace(" ","_")}',
                            'line': '10',
                            'network': 'AVL',
                            'stop': stop,
                            'target_stop': target,
                            'direction': direction,
                            'time': val,
                            'time_minutes': minutes(val),
                            'period': classify_window(val),
                            'course': '',
                            'service': service,
                            'service_label': service,
                            'note': '',
                            'source_pdf': '10.pdf',
                            'source_url': SOURCES['10']['url'],
                            'page': pno0 + 1,
                        }
                        records.append(rec)
    return records

all_records = []
for line in SOURCES:
    path = PDF_DIR / f'{line}.pdf'
    if not path.exists():
        continue
    if line == '10':
        all_records.extend(parse_avl10(line, path))
    else:
        all_records.extend(parse_rgtr(line, path))

# Déduplication conservatrice
seen = set()
unique = []
for r in all_records:
    key = (r['line'], r['stop'], r['direction'], r['time'], r.get('course'), r.get('service'), r.get('page'))
    if key not in seen:
        seen.add(key)
        unique.append(r)
unique.sort(key=lambda r: (r['target_stop'], r['line'], r['time_minutes'], r['direction'], r['service_label']))

# Le champ brut 'service' (codes/symboles non decodes) ne sert qu'a la
# deduplication ci-dessus ; on le retire de la sortie (seul 'service_label',
# decode et lisible, est consomme par l'app).
for r in unique:
    r.pop('service', None)

metadata = {
    'generated_from': 'Mobiliteit PDFs downloaded for offline use',
    'excluded': ['813.pdf'],
    'alert_windows': {
        'morning': {'start': '07:15', 'end': '08:15'},
        'evening': {'start': '17:40', 'end': '19:00'},
        'nearby_minutes': 5,
    },
    'target_stops': {'rgtr': TARGET_RGTR, 'avl10': TARGET_AVL10},
    'sources': SOURCES,
}

payload = {'metadata': metadata, 'schedules': unique}
(DATA_DIR / 'bus-schedules.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')

# Diagnostic summary
from collections import Counter
print('records', len(unique))
print('by line', dict(sorted(Counter(r['line'] for r in unique).items())))
print('by stop')
for k,v in sorted(Counter(r['target_stop'] for r in unique).items()):
    print(' ', k, v)
print('alerts morning', sum(1 for r in unique if r['period']=='morning_alert'))
print('alerts evening', sum(1 for r in unique if r['period']=='evening_alert'))
