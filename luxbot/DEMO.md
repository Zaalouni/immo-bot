# 🎨 LUX-BOT Dashboard - Preview

## 📸 Aperçu visuel

Le dashboard affiche :

### 🏷️ Section Deals
```
┌─────────────────────────────────────┐
│ Pâques                         -20% │
│ 12.99€  ̶1̶5̶.̶9̶9̶€̶               │
│ [Auchan] • Alimentaire              │
│ [Voir l'offre →]                    │
└─────────────────────────────────────┘
```

### 🎭 Section Activités  
```
┌─────────────────────────────────────┐
│ AQUA-FIT                            │
│ Cours de fitness aquatique          │
│ 📅 Mercredi 19h-20h                 │
│ 📍 Mamer                            │
│ 👥 13-17 ans                        │
│ 💰 Gratuit                          │
│ 🎪 Commune de Mamer                 │
│ [Plus d'infos →]                    │
└─────────────────────────────────────┘
```

## 🎯 Fonctionnalités

✅ **Responsive** : s'adapte mobile/tablette/desktop
✅ **Cards hover** : effet survol pour UX
✅ **Tabs** : basculer entre Deals (bleu) / Activités (violet)
✅ **Stats live** : compteurs en haut de page
✅ **Auto-refresh** : données actualisées toutes les 5 min
✅ **Links externes** : clic → ouvre offre originale

## 🌈 Palette couleurs

- **Header** : Gradient bleu → violet
- **Deals** : Bleu (#2563eb)
- **Activités** : Violet (#9333ea)
- **Badges réduction** : Rouge (#dc2626)
- **Prix** : Bleu foncé (#1e40af)

## 📱 Responsive breakpoints

- **Mobile** : 1 colonne (< 768px)
- **Tablette** : 2 colonnes (768-1024px)
- **Desktop** : 3 colonnes (> 1024px)

## 🔗 Test local

```bash
cd /home/test/lux-bot/dashboard
python3.9 -m http.server 8080
```

Ouvrir : http://localhost:8080/

## 🚀 Déploiement

GitHub Pages : https://VOTRE-USER.github.io/lux-bot/

---

**Stack** : HTML5 + Tailwind CSS + Vanilla JS
**Poids** : ~11KB HTML + CDN Tailwind
**Navigateurs** : Chrome, Firefox, Safari, Edge (modernes)
