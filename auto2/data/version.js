// Généré automatiquement — deploy #73
const VERSION = {
  dashboard_version: "2.0",
  deploy_count: 73,
  generated_at: "2026-09-25T18:37:26.321109",
  generated_date: "2026-09-25",
  generated_time: "18:37",
  nb_listings: 6471,
  nb_vendors: 621,
  nb_new_today: 0,
  last_scraping: "21:42"
};

// escapeHtml() globale — échappe tout contenu scrapé avant injection innerHTML (anti-XSS)
// Utilisée par index/deals/rapport/watchlist — NE PAS SUPPRIMER (audit 2026-04-04)
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
