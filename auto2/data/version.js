// Généré automatiquement — deploy #56
const VERSION = {
  dashboard_version: "2.0",
  deploy_count: 56,
  generated_at: "2026-09-12T13:09:42.497870",
  generated_date: "2026-09-12",
  generated_time: "13:09",
  nb_listings: 5139,
  nb_vendors: 516,
  nb_new_today: 1733,
  last_scraping: "13:09"
};

// escapeHtml() globale — échappe tout contenu scrapé avant injection innerHTML (anti-XSS)
// Utilisée par index/deals/rapport/watchlist — NE PAS SUPPRIMER (audit 2026-04-04)
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
