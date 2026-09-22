// Généré automatiquement — deploy #72
const VERSION = {
  dashboard_version: "2.0",
  deploy_count: 72,
  generated_at: "2026-09-22T21:45:47.808781",
  generated_date: "2026-09-22",
  generated_time: "21:45",
  nb_listings: 6471,
  nb_vendors: 621,
  nb_new_today: 2718,
  last_scraping: "21:42"
};

// escapeHtml() globale — échappe tout contenu scrapé avant injection innerHTML (anti-XSS)
// Utilisée par index/deals/rapport/watchlist — NE PAS SUPPRIMER (audit 2026-04-04)
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
