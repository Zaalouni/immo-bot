BUS OFFLINE - HORAIRES CIBLES

Contenu :
- index.html : application web offline
- data/bus-schedules.json : données extraites des PDF
- data/bus-schedules.js : données embarquées pour ouverture directe en file://
- assets/app.js et assets/app.css : logique et interface
- manifest.webmanifest et service-worker.js : PWA offline
- pdfs/ : copie locale des PDF sources utilisés

Utilisation simple :
1. Dézipper le dossier.
2. Ouvrir index.html dans un navigateur.

Utilisation PWA :
1. Dézipper le dossier.
2. Lancer un petit serveur local depuis le dossier :
   python -m http.server 8080
3. Ouvrir http://localhost:8080
4. Utiliser le bouton Installer si le navigateur le propose.

Périmètre :
- 813.pdf exclu car non disponible.
- Données limitées aux arrêts demandés.
- Fenêtres d'alerte : matin 07:15-08:15, soir 17:40-19:00.
- Prochains bus : fenêtre dynamique autour de l'heure du navigateur, ±5 minutes.
