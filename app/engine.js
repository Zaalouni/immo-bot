/* ═══════════════════════════════════════════════════════
   ENGINE.JS — Moteur de génération YouTube SEO
   Template-based, 100% offline, aucune API externe
   ═══════════════════════════════════════════════════════ */

'use strict'

// ── UTILS ──────────────────────────────────────────────────
const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const pickN = (arr, n) => [...arr].sort(() => Math.random() - .5).slice(0, Math.min(n, arr.length))
const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

// ── STOP WORDS ─────────────────────────────────────────────
const STOPS = new Set([
  'le','la','les','de','du','des','un','une','et','est','en','au','aux','ce','se',
  'son','sa','ses','mon','ma','mes','ton','ta','tes','je','tu','il','elle','nous',
  'vous','ils','elles','que','qui','quoi','dont','où','comment','pourquoi','quand',
  'faire','avoir','être','avec','pour','sur','sous','par','dans','à','the','to',
  'of','and','in','is','it','on','an','as','at','be','by','do','if','or','but',
  'from','this','that','with','for','are','was','not','have','you','can','will',
  'your','all','more','they','my','has','its','been','also','just','what','how',
  'when','why','get','use','about','which','there','their','also','une','pas','plus',
  'très','bien','tout','même','aussi','car','mais','donc','or','ni','or','car'
])

// ── EXTRACTION MOTS-CLÉS ───────────────────────────────────
function extractKeywords(sujet) {
  const words = sujet.toLowerCase()
    .replace(/[^a-zàâäéèêëîïôöùûüç\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPS.has(w))

  const unique = [...new Set(words)]
  const bigrams = []
  for (let i = 0; i < words.length - 1; i++) {
    if (!STOPS.has(words[i]) && !STOPS.has(words[i+1]))
      bigrams.push(`${words[i]} ${words[i+1]}`)
  }

  return {
    all: unique,
    main: unique[0] || sujet.toLowerCase(),
    secondary: unique.slice(1, 4),
    bigrams,
    original: sujet,
    cap: cap(sujet)
  }
}

// ── TITRES CHOCS ───────────────────────────────────────────
const TITRES_TEMPLATES = {
  choc: [
    kw => `Ce que personne ne te dit sur ${kw.original}`,
    kw => `La vérité choquante sur ${kw.original} (ça va tout changer)`,
    kw => `J'ai testé ${kw.original} pendant 30 jours : voici ce qui s'est passé`,
    kw => `Pourquoi tu RATES tout sur ${kw.original} (et comment corriger ça)`,
    kw => `${kw.cap} : l'erreur que tout le monde fait (et toi aussi)`
  ],
  liste: [
    kw => `7 erreurs à éviter absolument avec ${kw.original}`,
    kw => `5 techniques de ${kw.original} que les experts ne veulent pas que tu saches`,
    kw => `Top 10 astuces ${kw.original} pour débutants en 2024`,
    kw => `3 méthodes pour maîtriser ${kw.original} rapidement`,
    kw => `10 secrets de ${kw.original} que personne ne t'explique`
  ],
  curiosite: [
    kw => `J'ai découvert le secret de ${kw.original} (et ça a tout changé)`,
    kw => `Ce hack ${kw.original} m'a fait gagner des milliers de vues`,
    kw => `Voici pourquoi ${kw.original} va transformer ta chaîne`,
    kw => `La méthode ${kw.original} que les top créateurs cachent`,
    kw => `J'ai copié la stratégie des meilleurs sur ${kw.original}`
  ],
  question: [
    kw => `Comment maîtriser ${kw.original} en moins de 7 jours ?`,
    kw => `Tu galères avec ${kw.original} ? Regarde ça`,
    kw => `${kw.cap} : par où commencer quand on est nul ?`,
    kw => `Est-ce que ${kw.original} vaut vraiment la peine en 2024 ?`,
    kw => `Pourquoi ${kw.original} est plus simple que tu ne le crois`
  ],
  nombre: [
    kw => `0 → 10 000 vues grâce à ${kw.original} (ma méthode complète)`,
    kw => `${kw.cap} en 2024 : guide COMPLET pour débutants`,
    kw => `30 minutes pour comprendre ${kw.original} (tutoriel accéléré)`,
    kw => `${kw.cap} : résultats après 90 jours de test`,
    kw => `${kw.cap} — 100% gratuit, 0% blabla`
  ]
}

function generateTitles(sujet) {
  const kw = extractKeywords(sujet)
  const types = ['choc','liste','curiosite','question','nombre']
  return types.map(type => ({
    type,
    titre: pick(TITRES_TEMPLATES[type])(kw)
  }))
}

// ── SECTIONS DESCRIPTION ───────────────────────────────────

const ABOUT_INTROS = {
  professionnel: [
    kw => `Dans cette vidéo, nous explorons en profondeur le sujet de ${kw.original}. Vous trouverez ici une analyse complète, des conseils pratiques et des méthodes éprouvées pour obtenir des résultats concrets.`,
    kw => `Cette vidéo est un guide complet sur ${kw.original}. J'ai compilé les meilleures stratégies et techniques pour vous aider à progresser rapidement et efficacement.`,
    kw => `Bienvenue dans ce tutoriel dédié à ${kw.original}. Que vous soyez débutant ou confirmé, vous repartirez avec des outils concrets et immédiatement applicables.`
  ],
  decontracte: [
    kw => `Salut ! Dans cette vidéo, on parle de ${kw.original} sans prise de tête. J'ai tout simplifié pour que tu comprennes rapidement et que tu puisses passer à l'action dès aujourd'hui.`,
    kw => `Hey ! Aujourd'hui on attaque ${kw.original} ensemble. Pas de blabla inutile — que du concret, des exemples réels et des astuces que j'utilise moi-même.`,
    kw => `Yo ! Tu veux enfin comprendre ${kw.original} ? T'es au bon endroit. Je te donne tout ce que j'aurais aimé savoir quand j'ai commencé.`
  ],
  humoristique: [
    kw => `Alors comme ça, tu veux apprendre ${kw.original} ? Bonne nouvelle : tu n'as pas besoin d'être un génie. Mauvaise nouvelle : tu vas quand même devoir regarder cette vidéo jusqu'au bout. 😄`,
    kw => `${kw.cap} — le sujet qui fait peur à 90% des créateurs. Moi, j'ai décidé de vous montrer que c'est (presque) aussi simple que de commander une pizza. Presque.`,
    kw => `Spoiler : à la fin de cette vidéo sur ${kw.original}, vous allez soit être un expert, soit avoir très faim. Dans les deux cas, restez !`
  ]
}

const ABOUT_CORPS = {
  professionnel: [
    kw => `\n\nCe que vous allez apprendre :\n✅ Les fondamentaux de ${kw.main} expliqués clairement\n✅ Les meilleures pratiques utilisées par les experts\n✅ Des erreurs fréquentes à éviter absolument\n✅ Une méthode étape par étape, immédiatement applicable\n✅ Des ressources et outils recommandés`,
    kw => `\n\nAu programme :\n→ Comprendre les bases de ${kw.main} sans jargon technique\n→ Mettre en place une stratégie efficace dès aujourd'hui\n→ Optimiser vos résultats avec les techniques avancées\n→ Aller plus loin avec des ressources complémentaires`
  ],
  decontracte: [
    kw => `\n\nDans cette vidéo, on voit :\n👉 C'est quoi ${kw.main} exactement (expliqué simplement)\n👉 Comment démarrer sans se perdre\n👉 Mes astuces perso qui marchent vraiment\n👉 Ce qu'il faut absolument éviter\n👉 Comment progresser vite et bien`,
    kw => `\n\nOn touche à :\n🔥 Les bases de ${kw.main} expliquées clairement\n🔥 Ma méthode perso testée et approuvée\n🔥 Des exemples concrets (pas de théorie chiante)\n🔥 Les erreurs classiques à éviter\n🔥 Tes prochaines étapes`
  ],
  humoristique: [
    kw => `\n\nAu menu (pas de dessert, désolé) :\n🎯 ${kw.main} expliqué pour les humains normaux\n🎯 Les techniques qui fonctionnent (et celles qui font perdre du temps)\n🎯 Mes galères personnelles + les leçons tirées\n🎯 Des conseils actionnables (promis, pas que des blagues)\n🎯 La méthode complète pour enfin avancer`,
    kw => `\n\nCe que tu vas apprendre (si tu restes éveillé) :\n😂 Les bases de ${kw.main} sans le bla-bla habituel\n😂 Comment éviter les pièges classiques\n😂 Des astuces utiles + quelques sourires en bonus`
  ]
}

const TIMESTAMPS_TEMPLATE = `\n\n⏱️ TIMESTAMPS\n0:00 - Introduction\n1:30 - [À compléter]\n3:00 - [À compléter]\n5:30 - [À compléter]\n8:00 - Conseils avancés\n10:00 - Conclusion & récapitulatif`

const CHAINE_TEMPLATES = {
  professionnel: [
    `\n\n📺 À PROPOS DE LA CHAÎNE\nCette chaîne est dédiée à vous aider à progresser avec des contenus clairs, concrets et directement applicables. Chaque semaine, une nouvelle vidéo pour vous faire gagner du temps et des résultats.\n\n🔔 Abonnez-vous pour ne rien manquer !`,
    `\n\n📺 LA CHAÎNE\nNous publions régulièrement des tutoriels, guides et analyses pour vous aider à maîtriser votre domaine. Des conseils d'expert, accessibles à tous.\n\n→ Abonnez-vous et activez la cloche !`
  ],
  decontracte: [
    `\n\n📺 LA CHAÎNE\nIci, c'est la chaîne sans prise de tête pour apprendre des trucs utiles. On publie régulièrement du contenu concret, sans blabla. Si t'as pas encore cliqué sur Abonner... c'est le moment ! 😄\n\n🔔 Abonne-toi pour pas rater la suite !`,
    `\n\n📺 C'EST QUI MOI ?\nPassionné par [ton domaine], je partage tout ce que j'apprends pour que toi tu n'aies pas à faire les mêmes erreurs que moi. Vidéo chaque semaine !\n\n→ Abonne-toi si t'es du genre à vouloir progresser !`
  ],
  humoristique: [
    `\n\n📺 LA CHAÎNE (oui, il faut en parler)\nOn publie des vidéos pour les gens qui veulent apprendre sans s'endormir. Si tu cherches du contenu sérieux-mais-pas-chiant, t'es au bon endroit.\n\n🔔 Abonne-toi — la cloche ne mord pas !`,
    `\n\n📺 QUI JE SUIS ?\nQuelqu'un qui a fait TOUTES les erreurs possibles avant de trouver ce qui marche. Je te partage le résumé pour que tu évites mes galères. Tu peux me remercier en t'abonnant. 😄`
  ]
}

const PRODUITS_TEMPLATES = [
  `\n\n🛒 PRODUITS & SERVICES\n[Décris ici tes produits, formations ou services]\n→ [Lien produit 1]\n→ [Lien produit 2]`,
  `\n\n💼 MES SERVICES\nTu veux aller plus loin ? Découvre mes offres :\n→ [Formation complète]\n→ [Accompagnement personnalisé]\n→ [Ressources gratuites]`
]

const CTAS = {
  professionnel: [
    `\n\n─────────────────────────────\n👍 Si cette vidéo vous a aidé, un like est le meilleur moyen de le montrer.\n💬 Des questions ? Posez-les en commentaire, je réponds à chacun.\n🔔 Abonnez-vous et activez la notification pour ne rien manquer.\n📤 Partagez cette vidéo à quelqu'un qui en a besoin.\n─────────────────────────────`,
  ],
  decontracte: [
    `\n\n━━━━━━━━━━━━━━━━━━━━━━\n❤️ T'as kiffé la vidéo ? Un like, c'est 2 secondes !\n💬 Dis-moi en commentaire ce que tu veux voir ensuite\n🔔 Abonne-toi pour pas rater la suite\n📤 Partage à un pote qui galère sur ce sujet !\n━━━━━━━━━━━━━━━━━━━━━━`,
  ],
  humoristique: [
    `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━\n👍 Un like si t'as survécu jusqu'ici !\n💬 Commente "J'AI SURVÉCU" si t'as tout regardé\n🔔 Abonne-toi (la cloche ne mord pas, promis)\n📤 Partage — misery loves company !\n━━━━━━━━━━━━━━━━━━━━━━━━━`,
  ]
}

const LIENS_TEMPLATE = `\n\n🔗 LIENS UTILES\n→ [Lien ressource 1]\n→ [Lien ressource 2]\n→ Mon site web : [URL]\n→ Mes réseaux sociaux : [URL]`

function generateDescription(sujet, ton, sections) {
  const kw = extractKeywords(sujet)
  const t = ton || 'professionnel'
  let desc = ''

  if (sections.about) {
    desc += pick(ABOUT_INTROS[t] || ABOUT_INTROS.professionnel)(kw)
    desc += pick(ABOUT_CORPS[t] || ABOUT_CORPS.professionnel)(kw)
  }

  if (sections.timestamps) {
    desc += TIMESTAMPS_TEMPLATE
  }

  if (sections.chaine) {
    desc += pick(CHAINE_TEMPLATES[t] || CHAINE_TEMPLATES.professionnel)
  }

  if (sections.produits) {
    desc += pick(PRODUITS_TEMPLATES)
  }

  if (sections.liens) {
    desc += LIENS_TEMPLATE
  }

  if (sections.cta) {
    desc += pick(CTAS[t] || CTAS.professionnel)
  }

  return desc.trim()
}

// ── TAGS ───────────────────────────────────────────────────
const TAG_SUFFIXES_FR = [
  '', ' tutoriel', ' guide', ' 2024', ' débutant', ' avancé',
  ' technique', ' méthode', ' stratégie', ' astuce', ' conseil',
  ' formation', ' cours', ' complet', ' facile', ' rapide'
]
const TAG_PREFIXES_FR = [
  'comment ', 'apprendre ', 'maîtriser ', 'comprendre ',
  'optimiser ', 'formation ', 'guide ', 'tuto '
]
const GENERIC_TAGS_FR = [
  'tutoriel francais', 'formation en ligne', 'apprendre facilement',
  'conseils pratiques', 'guide complet', 'tuto', 'débutant',
  'astuces', 'formation gratuite', 'comment faire'
]
const GENERIC_TAGS_EN = [
  'tutorial', 'how to', 'tips and tricks', 'beginners guide',
  'step by step', 'learn fast', 'complete guide', 'for beginners',
  'best tips', 'easy method', 'free tutorial'
]

function generateTags(sujet, langue) {
  const kw = extractKeywords(sujet)
  const lang = langue || 'fr'
  const tags = new Set()

  tags.add(sujet.toLowerCase().trim())
  kw.all.forEach(w => { if (w.length > 3) tags.add(w) })
  kw.bigrams.forEach(bg => tags.add(bg))

  const mainWords = kw.all.slice(0, 3)
  const suffixes = lang === 'fr' ? TAG_SUFFIXES_FR : ['', ' tutorial', ' guide', ' tips', ' 2024', ' beginner', ' advanced']
  const prefixes = lang === 'fr' ? TAG_PREFIXES_FR : ['how to ', 'learn ', 'master ', 'best ', 'free ']

  mainWords.forEach(word => {
    pickN(suffixes, 4).forEach(s => tags.add(word + s))
    pickN(prefixes, 2).forEach(p => tags.add(p + word))
  })

  const pool = lang === 'fr' ? GENERIC_TAGS_FR : GENERIC_TAGS_EN
  pickN(pool, 4).forEach(t => tags.add(t))

  return [...tags]
    .map(t => t.trim())
    .filter(t => t.length > 2 && t.length < 50)
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 15)
}

// ── HASHTAGS ───────────────────────────────────────────────
const GENERIC_HT_FR = ['#Tutoriel','#Formation','#ApprendreFacile','#Conseils','#Astuces','#TutoFrancais','#GuideComplet','#LearnFrench']
const GENERIC_HT_EN = ['#Tutorial','#HowTo','#TipsAndTricks','#LearnOnline','#Guide','#Education','#Learning','#Beginner']

function generateHashtags(sujet, langue) {
  const kw = extractKeywords(sujet)
  const lang = langue || 'fr'
  const hts = []

  kw.all.slice(0, 4).forEach(w => {
    const ht = '#' + cap(w.replace(/\s+/g,'').replace(/-/g,''))
    if (ht.length > 2) hts.push(ht)
  })

  const pool = lang === 'fr' ? GENERIC_HT_FR : GENERIC_HT_EN
  pickN(pool, 4).forEach(h => hts.push(h))

  return [...new Set(hts)].slice(0, 8)
}

// ── DENSITÉ MOTS-CLÉS ──────────────────────────────────────
function checkDensity(description, keywords) {
  const desc = description.toLowerCase()
  return keywords
    .filter(kw => kw && kw.trim().length > 0)
    .map(kw => {
      const term = kw.toLowerCase().trim()
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      const count = (desc.match(regex) || []).length
      return { keyword: kw, count, good: count >= 3 }
    })
}

// ── EXPORT PUBLIC ──────────────────────────────────────────
window.Engine = {
  generate(sujet, ton, langue, sections, keywords) {
    if (!sujet || sujet.trim().length < 3) return null

    const description = generateDescription(sujet, ton, sections)
    const tags        = generateTags(sujet, langue)
    const hashtags    = generateHashtags(sujet, langue)
    const titles      = generateTitles(sujet)
    const density     = checkDensity(description, keywords || [])

    return {
      sujet, ton, langue, sections,
      timestamp: new Date().toISOString(),
      titles, description, tags, hashtags, density
    }
  }
}
