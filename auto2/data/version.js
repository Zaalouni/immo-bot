// Généré automatiquement — deploy #54
const VERSION = {
  dashboard_version: "2.0",
  deploy_count: 54,
  generated_at: "2026-09-12T12:14:50.040667",
  generated_date: "2026-09-12",
  generated_time: "12:14",
  nb_listings: 5133,
  nb_vendors: 511,
  nb_new_today: 1720,
  last_scraping: "12:14"
};

// escapeHtml() globale — échappe tout contenu scrapé avant injection innerHTML (anti-XSS)
// Utilisée par index/deals/rapport/watchlist — NE PAS SUPPRIMER (audit 2026-04-04)
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
