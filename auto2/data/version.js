// Généré automatiquement — deploy #77
const VERSION = {
  dashboard_version: "2.0",
  deploy_count: 77,
  generated_at: "2026-09-25T20:00:04.426409",
  generated_date: "2026-09-25",
  generated_time: "20:00",
  nb_listings: 25121,
  nb_vendors: 898,
  nb_new_today: 19125,
  last_scraping: "19:53"
};

// escapeHtml() globale — échappe tout contenu scrapé avant injection innerHTML (anti-XSS)
// Utilisée par index/deals/rapport/watchlist — NE PAS SUPPRIMER (audit 2026-04-04)
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
