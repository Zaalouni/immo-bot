// Généré automatiquement — deploy #71
const VERSION = {
  dashboard_version: "2.0",
  deploy_count: 71,
  generated_at: "2026-09-22T21:14:58.385388",
  generated_date: "2026-09-22",
  generated_time: "21:14",
  nb_listings: 6975,
  nb_vendors: 804,
  nb_new_today: 2777,
  last_scraping: "20:09"
};

// escapeHtml() globale — échappe tout contenu scrapé avant injection innerHTML (anti-XSS)
// Utilisée par index/deals/rapport/watchlist — NE PAS SUPPRIMER (audit 2026-04-04)
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
