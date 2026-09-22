/* fiab.js — Fiabilité d'un modèle, partagée par les pages (nécessite data/reviews.js + data/version.js).
   Source prioritaire : avis RÉELS de propriétaires (caradisiac, ≥ 5 avis) → REVIEWS.proprietaires
   Sinon : synthèse éditoriale (data/reviews.json) → REVIEWS.reviews[].note_fiabilite
   Clé : "marque|modele" en minuscules (marque_norm / modele_norm des annonces). */
const FIAB = (function () {
  const map = {};
  if (typeof REVIEWS !== 'undefined') {
    (REVIEWS.reviews || []).forEach(r => {
      const k = `${(r.marque || '').toLowerCase()}|${(r.modele || '').toLowerCase()}`;
      if (r.note_fiabilite) map[k] = { note: r.note_fiabilite, source: 'editorial' };
    });
    Object.entries(REVIEWS.proprietaires || {}).forEach(([k, p]) => {
      if (p.fiab && p.nb >= 5) map[k] = { note: p.fiab, source: 'proprietaires', nb: p.nb, avis: p.note, url: p.url };
    });
  }
  const key = l => `${(l.marque_norm || l.marque || '').toLowerCase()}|${(l.modele_norm || l.modele || '').toLowerCase()}`;
  return {
    /** Fiche fiabilité {note, source, nb?, avis?, url?} ou null */
    of: l => map[key(l)] || null,
    /** Note /10 ou 0 si inconnue */
    note: l => (map[key(l)] || {}).note || 0,
    /** Score "Achat" 0-100 : deal 60 % + fiabilité 40 % (fiabilité inconnue comptée 5/10) */
    achat: l => Math.round((l.deal_score || 0) * 0.6 + ((map[key(l)] || {}).note || 5) * 10 * 0.4),
    /** Badge HTML ★ note (👥 = avis propriétaires) */
    badge: l => {
      const f = map[key(l)];
      if (!f) return '';
      const c = f.note >= 7.5 ? 'var(--green)' : f.note >= 6 ? 'var(--amber)' : 'var(--red)';
      const t = f.source === 'proprietaires' ? `Fiabilité propriétaires : ${f.nb} avis (${f.avis}/20)` : 'Fiabilité : synthèse éditoriale';
      return `<span title="${escapeHtml(t)}" style="font-size:10px;font-weight:700;color:${c};white-space:nowrap">★ ${f.note}${f.source === 'proprietaires' ? ' 👥' : ''}</span>`;
    },
  };
})();
