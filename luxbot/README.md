# LUX-BOT Dashboard

Dashboard web pour visualiser les deals et activités scrapés par LUX-BOT.

## 🎯 Fonctionnalités

- ✅ **Deals** : promotions Auchan (prix, réductions, magasin)
- ✅ **Activités** : cours & événements jeunes 13-17 ans (Mamer, SNJ)
- ✅ **Stats temps réel** : nombre d'items, dernière mise à jour
- ✅ **Responsive** : mobile-friendly (Tailwind CSS)
- ✅ **Auto-refresh** : données actualisées toutes les 5 minutes

## 📂 Structure

```
dashboard/
├── index.html          # Page principale (Vue unifiée)
├── data/               # JSON exportés par le bot
│   ├── deals.json      # Promotions actives
│   ├── activites.json  # Événements jeunes
│   ├── emploi.json     # Offres emploi (vide pour l'instant)
│   └── stats.json      # Statistiques globales
└── README.md
```

## 🚀 Utilisation locale

```bash
# Générer les données JSON
cd /home/test/lux-bot
python3.9 main.py --module all

# Lancer serveur local
cd dashboard
python3.9 -m http.server 8080

# Ouvrir dans navigateur
http://localhost:8080/
```

## 🌐 Déploiement GitHub Pages

### Méthode 1 : Manuel (simple)

1. **Commit le dashboard** :
```bash
git add dashboard/
git commit -m "feat(dashboard): add web interface"
git push
```

2. **Activer GitHub Pages** :
   - Aller sur GitHub → Settings → Pages
   - Source : Deploy from a branch
   - Branch : `main` → folder `/dashboard`
   - Save

3. **Accéder au site** :
   - URL : `https://<username>.github.io/<repo-name>/`
   - Exemple : `https://votre-user.github.io/lux-bot/`

### Méthode 2 : GitHub Actions (auto-update)

Créer `.github/workflows/update-dashboard.yml` :

```yaml
name: Update Dashboard Data

on:
  schedule:
    - cron: '0 */1 * * *'  # Toutes les heures
  workflow_dispatch:        # Trigger manuel

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      
      - name: Install dependencies
        run: pip install -r requirements.txt
      
      - name: Run scraper
        run: python3.9 main.py --module all
        env:
          TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: ${{ secrets.TELEGRAM_CHAT_ID }}
      
      - name: Commit data
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add dashboard/data/*.json
          git commit -m "chore: update dashboard data" || echo "No changes"
          git push
```

**Note** : Ajouter les secrets Telegram dans GitHub → Settings → Secrets

## 📱 Stack technique

- **Frontend** : HTML5 + Vanilla JavaScript (ES6+)
- **CSS** : Tailwind CSS (CDN)
- **Data** : JSON statique (généré par Python)
- **Hébergement** : GitHub Pages (gratuit)

## 🔄 Flux de données

```
SQLite DB → Python export → JSON files → Dashboard web
   ↑             ↑              ↑            ↑
scrapers      main.py      data/*.json   index.html
```

## 🎨 Personnalisation

### Changer les couleurs

Modifier dans `index.html` :
```html
<!-- Deals = bleu -->
<div class="bg-blue-600">  <!-- Changer en bg-green-600, etc. -->

<!-- Activités = violet -->
<div class="bg-purple-600">
```

### Ajouter des filtres

Exemple filtre par magasin :
```javascript
// Dans renderDeals()
const filtered = deals.filter(d => d.store === 'Auchan');
```

## 📊 Données affichées

### Deals
- Titre, prix, réduction
- Magasin, catégorie
- Date validité
- Lien vers offre

### Activités
- Titre, description
- Date, lieu
- Tranche d'âge
- Prix, organisateur
- Lien infos

## 🐛 Debug

```bash
# Vérifier JSON générés
ls -lh dashboard/data/*.json

# Tester contenu
cat dashboard/data/stats.json

# Logs Python
tail -f logs/lux_bot.log
```

## 📝 TODO (extensions futures)

- [ ] Carte Leaflet (géolocalisation)
- [ ] Filtres interactifs (prix, date, catégorie)
- [ ] Export iCal pour activités
- [ ] Favoris (localStorage)
- [ ] Search bar
- [ ] Dark mode
- [ ] Notifications push (si nouveaux deals)

---

**Généré par LUX-BOT** 🤖
