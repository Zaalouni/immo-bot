// Généré automatiquement — deploy #45
const VERSION = {
  dashboard_version: "2.0",
  deploy_count: 45,
  generated_at: "2026-07-03T08:20:12.868534",
  generated_date: "2026-07-03",
  generated_time: "08:20",
  nb_listings: 5213,
  nb_vendors: 572,
  nb_new_today: 226,
  last_scraping: "08:19"
};

// escapeHtml() globale — échappe tout contenu scrapé avant injection innerHTML (anti-XSS)
// Utilisée par index/deals/rapport/watchlist — NE PAS SUPPRIMER (audit 2026-04-04)
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
