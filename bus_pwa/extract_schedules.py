"""Extraction des horaires RGTR / AVL 10 depuis les PDF Mobiliteit vers
data/bus-schedules.json (+ data/bus-schedules.js, généré depuis le même
payload pour éviter toute divergence entre les deux fichiers).

Ce script ne sait PAS produire les horaires AVL 10 des deux quais ni les
horaires du train CFL L50 : ces enregistrements présents dans le jeu de
données actuel (884 et 112 respectivement) ont été ajoutés par un procédé
distinct, non reproduit ici. Par défaut, ce script les laisse intacts et ne
régénère que les lignes RGTR pour lesquelles il a un parseur fiable.
"""
import argparse
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent

SOURCES = {
    '801': {'network': 'RGTR', 'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/rgtr//801.pdf'},
    '802': {'network': 'RGTR', 'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/rgtr//802.pdf'},
    '811': {'network': 'RGTR', 'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/rgtr//811.pdf?v=20260512'},
    '812': {'network': 'RGTR', 'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/rgtr//812.pdf'},
    '821': {'network': 'RGTR', 'url': 'https://www.mobiliteit.lu/wp-content/uploads/horaires-new/rgtr//821.pdf'},
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

# Lignes avec un parseur présent mais connu incomplet (voir docstring de
# parse_avl10). Les réextraire écraserait de bonnes données par un jeu
# partiel : on les saute par défaut, sauf --force.
KNOWN_INCOMPLETE_LINES = {'10'}

# Seuil de régression : si une ligne perd plus de X % de ses horaires par
# rapport au fichier existant, on abandonne l'écriture (sauf --force).
REGRESSION_THRESHOLD = 0.8


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
    import pdfplumber  # import différé : évite la dépendance quand aucun PDF n'est traité
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
    # ATTENTION : cette fonction ne détecte pas le service par colonne (une
    # table PDF mixe parfois Lundi-Vendredi/Samedi/Dimanche dans des bandes
    # d'en-tête distinctes) et n'expanse pas les colonnes de cadence
    # ("toutes les NN mn"). Les données actuelles de bus-schedules.json pour
    # la ligne 10 (884 enregistrements, Quai 1 + Quai 2) ont été produites
    # par un procédé plus complet, non présent dans ce script. Relancer
    # cette fonction régénérerait une extraction incomplète (~239
    # enregistrements, Quai 1 seul) — voir KNOWN_INCOMPLETE_LINES, qui saute
    # cette ligne par défaut.
    import pdfplumber  # import différé : évite la dépendance quand aucun PDF n'est traité
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


def dedupe(records):
    """Déduplication conservatrice + tri final, identique à la logique d'origine."""
    seen = set()
    out = []
    for r in records:
        key = (r['line'], r['stop'], r['direction'], r['time'], r.get('course'), r.get('service'), r.get('page'))
        if key not in seen:
            seen.add(key)
            out.append(r)
    out.sort(key=lambda r: (r['target_stop'], r['line'], r['time_minutes'], r['direction'], r['service_label']))
    # Le champ brut 'service' (codes/symboles non décodés) ne sert qu'à la
    # déduplication ci-dessus ; seul 'service_label' est consommé par l'app.
    for r in out:
        r.pop('service', None)
    return out


def load_existing(json_path: Path):
    """Charge le fichier de sortie existant (schedules + metadata), sans planter si absent/corrompu."""
    if not json_path.exists():
        return [], {}
    try:
        payload = json.loads(json_path.read_text(encoding='utf-8'))
        return payload.get('schedules', []), payload.get('metadata', {})
    except (json.JSONDecodeError, OSError) as e:
        print(f'AVERTISSEMENT : impossible de lire {json_path} ({e}) — traité comme absent')
        return [], {}


def build_metadata(existing_metadata):
    """Construit les métadonnées en préservant ce que ce script ne sait pas
    régénérer (couverture AVL 10 réelle, arrêts CFL L50) plutôt que de les
    écraser par les constantes (volontairement plus restreintes) du script."""
    existing_target_stops = existing_metadata.get('target_stops', {})
    target_stops = {
        'rgtr': TARGET_RGTR,
        'avl10': existing_target_stops.get('avl10') or TARGET_AVL10,
    }
    if 'cfl_l50' in existing_target_stops:
        target_stops['cfl_l50'] = existing_target_stops['cfl_l50']

    # Idem pour 'sources' : préserver les entrées que ce script ne gère pas
    # (ex. 'L50' / CFL) plutôt que les faire disparaître des métadonnées.
    sources = {**existing_metadata.get('sources', {}), **SOURCES}

    return {
        'generated_from': 'Mobiliteit PDFs downloaded for offline use',
        'excluded': ['813.pdf'],
        'alert_windows': {
            'morning': {'start': '07:15', 'end': '08:15'},
            'evening': {'start': '17:40', 'end': '19:00'},
            'nearby_minutes': 5,
        },
        'target_stops': target_stops,
        'sources': sources,
    }


def write_outputs(payload, data_dir: Path, dry_run: bool):
    json_path = data_dir / 'bus-schedules.json'
    js_path = data_dir / 'bus-schedules.js'
    text = json.dumps(payload, ensure_ascii=False, indent=2)

    if dry_run:
        print(f'--dry-run : {json_path.name} et {js_path.name} non écrits.')
        return

    data_dir.mkdir(parents=True, exist_ok=True)
    if json_path.exists():
        backup = json_path.with_suffix('.json.bak')
        backup.write_bytes(json_path.read_bytes())
        print(f'Sauvegarde de l\'ancien fichier : {backup.name}')

    json_path.write_text(text, encoding='utf-8')
    js_path.write_text(f'window.BUS_SCHEDULES = {text};\n', encoding='utf-8')
    print(f'Écrit : {json_path.name} et {js_path.name}')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--pdf-dir', type=Path, default=SCRIPT_DIR / 'pdfs', help='Dossier contenant les PDF sources (défaut : ./pdfs)')
    parser.add_argument('--data-dir', type=Path, default=SCRIPT_DIR / 'data', help='Dossier de sortie (défaut : ./data)')
    parser.add_argument('--lines', nargs='*', default=None, metavar='LIGNE', help='Sous-ensemble de lignes à traiter (défaut : toutes celles de SOURCES)')
    parser.add_argument('--force', action='store_true', help='Force la réextraction des lignes connues incomplètes et ignore les régressions de volume détectées')
    parser.add_argument('--dry-run', action='store_true', help="Analyse sans écrire de fichiers")
    args = parser.parse_args()

    unknown = set(args.lines or []) - set(SOURCES)
    if unknown:
        raise SystemExit(f'Lignes inconnues : {sorted(unknown)} (disponibles : {sorted(SOURCES)})')
    requested = args.lines or list(SOURCES)

    json_path = args.data_dir / 'bus-schedules.json'
    existing_schedules, existing_metadata = load_existing(json_path)
    existing_by_line = Counter(r['line'] for r in existing_schedules)

    # Lignes présentes dans les données existantes mais que ce script ne sait
    # produire par aucun parseur (ex. 'L50' / CFL), ou simplement non
    # sélectionnées via --lines cette fois-ci : toujours conservées telles
    # quelles plutôt que traitées comme une régression.
    unmanaged_lines = sorted(set(existing_by_line) - set(SOURCES))
    not_requested   = sorted(set(existing_by_line) & set(SOURCES) - set(requested))
    carry_over_lines = set(unmanaged_lines) | set(not_requested)
    if unmanaged_lines:
        print(f'Lignes conservées telles quelles (aucun parseur pour ce script) : {unmanaged_lines}')
    if not_requested:
        print(f'Lignes conservées telles quelles (non sélectionnées via --lines) : {not_requested}')

    # Enregistrements repris tels quels (déjà dédupliqués lors d'un run
    # précédent, et déjà privés du champ brut 'service') : ne JAMAIS les
    # repasser dans dedupe(), sous peine de fausses collisions (deux
    # horaires distincts qui ne différaient que par 'service' redeviendraient
    # indiscernables une fois ce champ absent).
    carried_records = [r for r in existing_schedules if r['line'] in carry_over_lines]

    fresh_records = []
    skipped_incomplete = []
    for line in requested:
        if line in KNOWN_INCOMPLETE_LINES and not args.force:
            skipped_incomplete.append(line)
            carried_records.extend(r for r in existing_schedules if r['line'] == line)
            continue
        path = args.pdf_dir / f'{line}.pdf'
        if not path.exists():
            print(f'AVERTISSEMENT : PDF manquant pour ligne {line} ({path}) — enregistrements ignorés pour cette ligne')
            continue
        before = len(fresh_records)
        parse_fn = parse_avl10 if line == '10' else parse_rgtr
        fresh_records.extend(parse_fn(line, path))
        if len(fresh_records) == before:
            raise RuntimeError(f'Aucun horaire extrait pour la ligne {line} — vérifier le format PDF')

    if skipped_incomplete:
        print(f'Lignes sautées (parseur connu incomplet, données existantes conservées) : {skipped_incomplete}')
        print('  -> relancer avec --force pour réextraire quand même (jeu de données potentiellement dégradé)')

    unique_records = carried_records + dedupe(fresh_records)
    unique_records.sort(key=lambda r: (r['target_stop'], r['line'], r['time_minutes'], r['direction'], r['service_label']))
    new_by_line = Counter(r['line'] for r in unique_records)

    if not args.force:
        regressions = [
            (line, old, new_by_line.get(line, 0))
            for line, old in existing_by_line.items()
            if old and new_by_line.get(line, 0) < old * REGRESSION_THRESHOLD
        ]
        if regressions:
            detail = '\n'.join(f'  ligne {l} : {old} -> {new} ({new - old:+d})' for l, old, new in regressions)
            raise SystemExit(
                'ABANDON : régression significative du nombre d\'horaires détectée (rien n\'a été écrit) :\n'
                + detail +
                '\nRelancer avec --force si cette baisse est attendue (ex. changement d\'horaires officiel).'
            )

    payload = {'metadata': build_metadata(existing_metadata), 'schedules': unique_records}
    write_outputs(payload, args.data_dir, args.dry_run)

    print('records', len(unique_records))
    print('by line', dict(sorted(new_by_line.items())))
    print('by stop')
    for k, v in sorted(Counter(r['target_stop'] for r in unique_records).items()):
        print(' ', k, v)
    print('alerts morning', sum(1 for r in unique_records if r['period'] == 'morning_alert'))
    print('alerts evening', sum(1 for r in unique_records if r['period'] == 'evening_alert'))


if __name__ == '__main__':
    main()
