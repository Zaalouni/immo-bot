/**
 * Profils qualitatifs des villes accessibles par train
 * Sources: Données immobilières (listings.js), réseau CFL, retours communautés
 */

const VILLE_PROFILS = {
    'Pfaffenthal-Kirchberg': {
        security: 'Très bon',
        schools: 'Très bon',
        quality_of_life: 'Très bon',
        real_estate_potential: 'Très fort',
        synthesis: 'Hub urbain central, connexion tram & train, très connecté',
        target_profiles: ['Jeunes pros', 'Couples urbains']
    },
    'Bertrange-Strassen': {
        security: 'Très bon',
        schools: 'Excellent',
        quality_of_life: 'Très bon',
        real_estate_potential: 'Très fort',
        synthesis: 'Zone résidentielle premium, gare CFL confirmée, très accessible',
        target_profiles: ['Familles', 'Expatriés']
    },
    'Mamer': {
        security: 'Très bon',
        schools: 'Excellent',
        quality_of_life: 'Très bon',
        real_estate_potential: 'Fort',
        synthesis: 'Bon équilibre famille + train, zones résidentielles établies',
        target_profiles: ['Familles', 'Télétravailleurs']
    },
    'Walferdange': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Très bon',
        real_estate_potential: 'Fort',
        synthesis: 'Accès nord, cadre résidentiel avec espaces verts',
        target_profiles: ['Familles', 'Couples']
    },
    'Lorentzweiler': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Très bon',
        real_estate_potential: 'Fort',
        synthesis: 'Environnement résidentiel calme avec accès train',
        target_profiles: ['Familles tranquilles', 'Couples']
    },
    'Mersch': {
        security: 'Très bon',
        schools: 'Excellent',
        quality_of_life: 'Très bon',
        real_estate_potential: 'Fort',
        synthesis: 'Pôle régional scolaire (École Anne Beffort), bon compromis mobilité',
        target_profiles: ['Familles', 'Jeunes familles']
    },
    'Schieren': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Bon',
        real_estate_potential: 'Moyen',
        synthesis: 'Village du nord avec gare CFL, accès régional',
        target_profiles: ['Couples', 'Familles']
    },
    'Ettelbruck': {
        security: 'Bon',
        schools: 'Très bon',
        quality_of_life: 'Bon',
        real_estate_potential: 'Moyen/Fort',
        synthesis: 'Hub régional nord, gare CFL majeure, bien connecté régionalement',
        target_profiles: ['Familles régionales', 'Couples']
    },
    'Wiltz': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Très bon',
        real_estate_potential: 'Moyen',
        synthesis: 'Village montagneux nord, cadre naturel, accès train limité',
        target_profiles: ['Amoureux nature', 'Retraités']
    },
    'Troisvierges': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Bon',
        real_estate_potential: 'Moyen',
        synthesis: 'Extrême nord, très rural, terminus ligne CFL',
        target_profiles: ['Amoureux nature']
    },
    'Hollerich': {
        security: 'Très bon',
        schools: 'Très bon',
        quality_of_life: 'Très bon',
        real_estate_potential: 'Très fort',
        synthesis: 'Centre-ville, accès immédiat, très pratique, petite surface',
        target_profiles: ['Jeunes pros', 'Couples urbains']
    },
    'Berchem': {
        security: 'Bon à très bon',
        schools: 'Bon',
        quality_of_life: 'Très bon',
        real_estate_potential: 'Fort',
        synthesis: 'Proche sud-ville, cadre calme, accessible en train',
        target_profiles: ['Jeunes familles', 'Couples']
    },
    'Bettembourg': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Bon',
        real_estate_potential: 'Fort',
        synthesis: 'Hub sud CFL majeur, mobilité régionale forte, accessible',
        target_profiles: ['Couples', 'Familles']
    },
    'Schifflange': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Bon',
        real_estate_potential: 'Moyen/Fort',
        synthesis: 'Gare sud, zone industrielle en reconversion, prix accessibles',
        target_profiles: ['Budgets modérés', 'Couples']
    },
    'Esch-sur-Alzette': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Bon',
        real_estate_potential: 'Moyen/Fort',
        synthesis: 'Deuxième ville, dynamique, caractère urbain affirmé',
        target_profiles: ['Couples urbains', 'Jeunes actifs']
    },
    'Belval-Université': {
        security: 'Très bon',
        schools: 'Excellent',
        quality_of_life: 'Très bon',
        real_estate_potential: 'Fort',
        synthesis: 'Pôle universitaire, jeune et dynamique, infrastructure moderne',
        target_profiles: ['Étudiants', 'Jeunes pro', 'Familles']
    },
    'Pétange': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Bon',
        real_estate_potential: 'Moyen',
        synthesis: 'Gare sud-ouest, zone résidentielle, moins densifiée',
        target_profiles: ['Budgets modérés', 'Couples']
    },
    'Rodange': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Bon',
        real_estate_potential: 'Moyen',
        synthesis: 'Terminus sud-ouest CFL, accès plus long, marché localisé',
        target_profiles: ['Budgets modérés', 'Frontaliers']
    },
    'Sandweiler-Contern': {
        security: 'Bon',
        schools: 'Bon à très bon',
        quality_of_life: 'Très bon',
        real_estate_potential: 'Fort',
        synthesis: 'Est proche, cadre résidentiel calme et équipé',
        target_profiles: ['Familles tranquilles', 'Couples']
    },
    'Oetrange': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Bon',
        real_estate_potential: 'Moyen',
        synthesis: 'Petit village de l\'est lointain, accès régional',
        target_profiles: ['Couples', 'Retraités']
    },
    'Munsbach': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Bon',
        real_estate_potential: 'Moyen',
        synthesis: 'Village de l\'est, très rural, accessibilité limitée',
        target_profiles: ['Amoureux nature', 'Retraités']
    },
    'Roodt': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Bon',
        real_estate_potential: 'Moyen',
        synthesis: 'Extrême est, très rural, peu peuplé',
        target_profiles: ['Retraités ruraux']
    },
    'Mertert': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Bon',
        real_estate_potential: 'Moyen',
        synthesis: 'Gare est lointaine, cadre de Moselle luxembourgeoise',
        target_profiles: ['Frontaliers', 'Retraités']
    },
    'Wasserbillig': {
        security: 'Bon',
        schools: 'Bon',
        quality_of_life: 'Bon',
        real_estate_potential: 'Moyen',
        synthesis: 'Gare CFL est, point de connexion régional est, accès lointain',
        target_profiles: ['Frontaliers']
    }
};

/**
 * Calcule un score de score global basé sur critères objectifs
 * @param {Object} city - Données de la ville (train-cities.js)
 * @param {Array} listings - Annonces pour cette ville
 * @returns {Object} Score et ranking
 */
function calculateCityScore(city, listings) {
    if (!city) return null;

    // Critères objectifs
    const travelTime = city.typical_travel_time_min;
    const distance = city.distance_km_estimate;
    const frequency = city.typical_headway_min;
    const listingCount = listings ? listings.length : 0;

    // Calcul prix/m² et loyer moyen
    let avgPrice = 0;
    let avgPricePerM2 = 0;
    if (listings && listings.length > 0) {
        avgPrice = Math.round(listings.reduce((s, apt) => s + apt.price, 0) / listings.length);
        avgPricePerM2 = Math.round(listings.reduce((s, apt) => s + apt.price_m2, 0) / listings.length);
    }

    // Scoring (0-100)
    let score = 50; // Base

    // Travel time scoring (très important)
    if (travelTime <= 10) score += 30;
    else if (travelTime <= 15) score += 25;
    else if (travelTime <= 20) score += 20;
    else if (travelTime <= 30) score += 15;
    else score += 5;

    // Frequency scoring
    if (frequency <= 15) score += 15;
    else if (frequency <= 20) score += 10;
    else score += 5;

    // Price/m² scoring (moins cher = mieux)
    if (avgPricePerM2 > 0) {
        if (avgPricePerM2 <= 24) score += 15;
        else if (avgPricePerM2 <= 27) score += 10;
        else if (avgPricePerM2 <= 30) score += 5;
    }

    // Listing availability bonus
    if (listingCount > 10) score += 10;
    else if (listingCount > 5) score += 5;

    return {
        score: Math.min(100, score),
        avgPrice,
        avgPricePerM2,
        listingCount,
        budget85m2: Math.round(avgPricePerM2 * 85)
    };
}

/**
 * Récupère le profil d'une ville
 */
function getCityProfile(cityName) {
    return VILLE_PROFILS[cityName] || {
        security: 'À explorer',
        schools: 'À explorer',
        quality_of_life: 'À explorer',
        real_estate_potential: 'À évaluer',
        synthesis: 'Données limitées',
        target_profiles: []
    };
}

/**
 * Détermine couleur/emoji basé sur note
 */
function getScoreColor(score) {
    if (score >= 80) return { color: '#4ADE80', emoji: '🟢' }; // Vert
    if (score >= 65) return { color: '#FBBF24', emoji: '🟡' }; // Jaune
    if (score >= 50) return { color: '#F97316', emoji: '🟠' }; // Orange
    return { color: '#EF4444', emoji: '🔴' }; // Rouge
}
