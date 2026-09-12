// Généré automatiquement — deploy #59
const VERSION = {
  dashboard_version: "2.0",
  deploy_count: 59,
  generated_at: "2026-09-12T13:21:39.840386",
  generated_date: "2026-09-12",
  generated_time: "13:21",
  nb_listings: 6259,
  nb_vendors: 687,
  nb_new_today: 2877,
  last_scraping: "13:21"
};

// escapeHtml() globale — échappe tout contenu scrapé avant injection innerHTML (anti-XSS)
// Utilisée par index/deals/rapport/watchlist — NE PAS SUPPRIMER (audit 2026-04-04)
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
