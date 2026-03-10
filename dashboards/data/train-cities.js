/**
 * Selected Luxembourg Train Stations (CFL Rail Network)
 *
 * IMPORTANT - Dataset Scope:
 * This is a CURATED selection of CFL commuter rail stations serving the Luxembourg
 * metropolitan area, NOT an exhaustive network map. Selection prioritizes:
 * - Accessibility from Luxembourg Gare Centrale
 * - Housing/rental market relevance
 * - Line terminus and major interchange points
 *
 * Public transport is FREE in Luxembourg (second class).
 *
 * Data Quality:
 * - Source: CFL official schedule + estimates
 * - Confidence: Medium (estimates vary by service type RB/RE, time of day)
 * - Last verified: 2026-03-10
 * - Updates: Manual/periodical
 *
 * Notes on estimates:
 * - travel_time: Typical midday service, subject to RB vs RE variation, maintenance windows
 * - headway: Simplification; varies by peak/off-peak/weekends
 * - distance: Estimated via official maps, not surveyed
 */

const TRAIN_LINES = {
    'North Line 10': {
        code: 'N10',
        color: '#FF6B6B',
        description: 'Axe Nord CFL - Luxembourg ↔ Ettelbruck ↔ Troisvierges (main trunk); branche Wiltz via Kautenbach',
    },
    'South Line 60': {
        code: 'S60',
        color: '#4ECDC4',
        description: 'Axe Sud/Centre CFL - Luxembourg → Rodange via Bettembourg (curated selection includes urban/peripheral stations)',
    },
    'East Line 30': {
        code: 'E30',
        color: '#FFE66D',
        description: 'Axe Est CFL - Luxembourg ↔ Wasserbillig, corridor frontalier',
    },
    'West Line 50': {
        code: 'W50',
        color: '#95E1D3',
        description: 'Axe Ouest CFL - Luxembourg ↔ Arlon (Belgium), via Bertrange',
    }
};

/**
 * Mapping: gares de train → communes (pour filtrer les listings)
 * Basé sur proximité géographique et données réelles de listings.js
 */
const STATION_TO_COMMUNES = {
    // Tous les quartiers de Luxembourg-Ville sont accessibles depuis Gare Centrale (0-5 min)
    'Pfaffenthal-Kirchberg': ['Kirchberg', 'Luxembourg', 'Limpertsberg', 'Belair', 'Bonnevoie', 'Centre', 'Gare', 'Neudorf', 'Eich', 'Cessange', 'Gasperich', 'Merl', 'Muhlenbach', 'Cents', 'Verlorenkost', 'Rollingergrund', 'Gare-Boulevard-De-La-Ptrusse'],
    'Hollerich': ['Hollerich', 'Bonnevoie', 'Centre', 'Luxembourg', 'Gare', 'Belair', 'Limpertsberg', 'Kirchberg', 'Neudorf', 'Eich', 'Cessange', 'Gasperich', 'Merl', 'Muhlenbach', 'Cents', 'Verlorenkost', 'Rollingergrund', 'Gare-Boulevard-De-La-Ptrusse'],
    'Dommeldange': ['Dommeldange', 'Limpertsberg', 'Centre', 'Luxembourg', 'Kirchberg', 'Belair', 'Bonnevoie', 'Gare', 'Neudorf', 'Eich', 'Cents', 'Muhlenbach', 'Gasperich', 'Cessange', 'Merl', 'Verlorenkost', 'Rollingergrund', 'Gare-Boulevard-De-La-Ptrusse'],
    'Howald': ['Howald', 'Hesperange', 'Roeser', 'Gasperich', 'Cessange', 'Itzig'],
    'Bertrange-Strassen': ['Bertrange', 'Strassen', 'Strassen&nbsp;', 'Bridel', 'Kehlen', 'Olm'],
    'Mamer': ['Mamer', 'Steinfort', 'Kehlen', 'Kopstal', 'Bridel'],
    'Walferdange': ['Walferdange', 'Helmsange', 'Bereldange', 'Steinsel'],
    'Lorentzweiler': ['Lorentzweiler', 'Mersch', 'Hunsdorf', 'Angelsberg', 'Beringen-Mersch'],
    'Mersch': ['Mersch', 'Bissen', 'Lorentzweiler', 'Beringen-Mersch', 'Hunsdorf', 'Angelsberg'],
    'Schieren': ['Schieren', 'Diekirch'],
    'Ettelbruck': ['Ettelbruck', 'Diekirch'],
    'Wiltz': ['Wiltz'],
    'Troisvierges': ['Troisvierges'],
    'Berchem': ['Berchem', 'Roeser', 'Crauthem'],
    'Bettembourg': ['Bettembourg', 'Dudelange', 'Fentange', 'Bergem'],
    'Schifflange': ['Schifflange', 'Kayl'],
    'Esch-sur-Alzette': ['Esch-sur-Alzette', 'Esch-Sur-Alzette', 'Alzette', 'Al-Esch-(esch-Sur-Alzette)', 'Belval', 'Belvaux', 'Differdange', 'Lallange', 'Hautcharage'],
    'Belval-Université': ['Belval', 'Esch-sur-Alzette', 'Esch-Sur-Alzette', 'Belvaux', 'Al-Esch-(esch-Sur-Alzette)', 'Alzette', 'Differdange', 'Lallange', 'Hautcharage'],
    'Leudelange': ['Leudelange', 'Bascharage'],
    'Pétange': ['Pétange', 'Petange', 'Bascharage', 'Differdange', 'Rodange', 'Lallange', 'Hautcharage', 'Garnich', 'Kahler', 'Schouweiler', 'Sprinkange', 'Tétange', 'Rollingen'],
    'Rodange': ['Rodange', 'Pétange', 'Petange', 'Bascharage'],
    'Sandweiler-Contern': ['Sandweiler', 'Contern', 'Findel', 'Itzig', 'Hesperange', 'Senningerberg'],
    'Oetrange': ['Oetrange', 'Junglinster', 'Canach'],
    'Munsbach': ['Munsbach', 'Senningerberg', 'Junglinster'],
    'Roodt': ['Roodt-Sur-Syre', 'Syre', 'Moutfort'],
    'Mertert': ['Mertert', 'Wasserbillig', 'Grevenmacher', 'Wormeldange', 'Bains'],
    'Wasserbillig': ['Wasserbillig', 'Mertert', 'Grevenmacher'],
    'Capellen': ['Capellen', 'Kopstal', 'Bridel', 'Mamer', 'Kehlen', 'Olm'],
    'Kleinbettingen': ['Kleinbettingen', 'Steinfort', 'Mersch'],
    'Arlon': ['Arlon', 'Hassel', 'Basse-Rentgen', 'Roussy-Le-Village']
};

/**
 * Récupère toutes les communes pour une gare
 * @param {string} stationName - Nom de la gare
 * @returns {Array<string>} Liste des communes associées
 */
function getCommunitiesForStation(stationName) {
    return STATION_TO_COMMUNES[stationName] || [stationName];
}

const TRAIN_CITIES = [
    // ─────── NORTH LINE 10 ───────
    // Main trunk: Luxembourg → Troisvierges; Branch: Wiltz via Kautenbach
    {
        id: 'pfaffenthal',
        city: 'Pfaffenthal-Kirchberg',
        line: 'North Line 10',
        distance_km_estimate: 2,
        typical_travel_time_min: 3,
        typical_headway_min: 10,
        transport_notes: 'Multimodal hub: CFL rail + tram connexion to Kirchberg district'
    },
    {
        id: 'walferdange',
        city: 'Walferdange',
        line: 'North Line 10',
        distance_km_estimate: 7,
        typical_travel_time_min: 7,
        typical_headway_min: 15,
        transport_notes: ''
    },
    {
        id: 'lorentzweiler',
        city: 'Lorentzweiler',
        line: 'North Line 10',
        distance_km_estimate: 10,
        typical_travel_time_min: 9,
        typical_headway_min: 20,
        transport_notes: ''
    },
    {
        id: 'mersch',
        city: 'Mersch',
        line: 'North Line 10',
        distance_km_estimate: 15,
        typical_travel_time_min: 15,
        typical_headway_min: 15,
        transport_notes: 'Regional transport interchange'
    },
    {
        id: 'schieren',
        city: 'Schieren',
        line: 'North Line 10',
        distance_km_estimate: 18,
        typical_travel_time_min: 16,
        typical_headway_min: 20,
        transport_notes: ''
    },
    {
        id: 'ettelbruck',
        city: 'Ettelbruck',
        line: 'North Line 10',
        distance_km_estimate: 26,
        typical_travel_time_min: 25,
        typical_headway_min: 20,
        transport_notes: 'Major northern rail hub'
    },
    {
        id: 'wiltz',
        city: 'Wiltz',
        line: 'North Line 10',
        distance_km_estimate: 45,
        typical_travel_time_min: 38,
        typical_headway_min: 30,
        transport_notes: 'Secondary branch via Kautenbach (NOT main trunk)'
    },
    {
        id: 'troisvierges',
        city: 'Troisvierges',
        line: 'North Line 10',
        distance_km_estimate: 66,
        typical_travel_time_min: 55,
        typical_headway_min: 30,
        transport_notes: 'Northern terminus, main trunk'
    },

    // ─────── SOUTH LINE 60 ───────
    {
        id: 'hollerich',
        city: 'Hollerich',
        line: 'South Line 60',
        distance_km_estimate: 2,
        typical_travel_time_min: 3,
        typical_headway_min: 15,
        transport_notes: 'City center station, immediate proximity to Gare Centrale'
    },
    {
        id: 'dommeldange',
        city: 'Dommeldange',
        line: 'South Line 60',
        distance_km_estimate: 5,
        typical_travel_time_min: 6,
        typical_headway_min: 20,
        transport_notes: 'Stop on main south line'
    },
    {
        id: 'howald',
        city: 'Howald',
        line: 'South Line 60',
        distance_km_estimate: 7,
        typical_travel_time_min: 8,
        typical_headway_min: 20,
        transport_notes: 'Multimodal interchange: rail + tram access'
    },
    {
        id: 'berchem',
        city: 'Berchem',
        line: 'South Line 60',
        distance_km_estimate: 8,
        typical_travel_time_min: 10,
        typical_headway_min: 20,
        transport_notes: ''
    },
    {
        id: 'bettembourg',
        city: 'Bettembourg',
        line: 'South Line 60',
        distance_km_estimate: 11,
        typical_travel_time_min: 15,
        typical_headway_min: 20,
        transport_notes: 'Major southern rail junction, line interchange point'
    },
    {
        id: 'schifflange',
        city: 'Schifflange',
        line: 'South Line 60',
        distance_km_estimate: 17,
        typical_travel_time_min: 20,
        typical_headway_min: 20,
        transport_notes: ''
    },
    {
        id: 'esch',
        city: 'Esch-sur-Alzette',
        line: 'South Line 60',
        distance_km_estimate: 21,
        typical_travel_time_min: 25,
        typical_headway_min: 20,
        transport_notes: 'Second-largest city in Luxembourg'
    },
    {
        id: 'belval',
        city: 'Belval-Université',
        line: 'South Line 60',
        distance_km_estimate: 24,
        typical_travel_time_min: 28,
        typical_headway_min: 20,
        transport_notes: 'University campus zone, modern infrastructure'
    },
    {
        id: 'leudelange',
        city: 'Leudelange',
        line: 'South Line 60',
        distance_km_estimate: 26,
        typical_travel_time_min: 30,
        typical_headway_min: 30,
        transport_notes: ''
    },
    {
        id: 'petange',
        city: 'Pétange',
        line: 'South Line 60',
        distance_km_estimate: 28,
        typical_travel_time_min: 32,
        typical_headway_min: 30,
        transport_notes: ''
    },
    {
        id: 'rodange',
        city: 'Rodange',
        line: 'South Line 60',
        distance_km_estimate: 29,
        typical_travel_time_min: 35,
        typical_headway_min: 30,
        transport_notes: 'Southern terminus'
    },

    // ─────── EAST LINE 30 ───────
    {
        id: 'sandweiler',
        city: 'Sandweiler-Contern',
        line: 'East Line 30',
        distance_km_estimate: 8,
        typical_travel_time_min: 9,
        typical_headway_min: 30,
        transport_notes: ''
    },
    {
        id: 'oetrange',
        city: 'Oetrange',
        line: 'East Line 30',
        distance_km_estimate: 11,
        typical_travel_time_min: 12,
        typical_headway_min: 30,
        transport_notes: ''
    },
    {
        id: 'munsbach',
        city: 'Munsbach',
        line: 'East Line 30',
        distance_km_estimate: 13,
        typical_travel_time_min: 15,
        typical_headway_min: 30,
        transport_notes: ''
    },
    {
        id: 'roodt',
        city: 'Roodt',
        line: 'East Line 30',
        distance_km_estimate: 18,
        typical_travel_time_min: 20,
        typical_headway_min: 30,
        transport_notes: ''
    },
    {
        id: 'mertert',
        city: 'Mertert',
        line: 'East Line 30',
        distance_km_estimate: 27,
        typical_travel_time_min: 27,
        typical_headway_min: 30,
        transport_notes: ''
    },
    {
        id: 'wasserbillig',
        city: 'Wasserbillig',
        line: 'East Line 30',
        distance_km_estimate: 29,
        typical_travel_time_min: 29,
        typical_headway_min: 30,
        transport_notes: 'Major eastern station, cross-border mobility corridor'
    },

    // ─────── WEST LINE 50 ───────
    {
        id: 'bertrange',
        city: 'Bertrange-Strassen',
        line: 'West Line 50',
        distance_km_estimate: 6,
        typical_travel_time_min: 6,
        typical_headway_min: 30,
        transport_notes: ''
    },
    {
        id: 'mamer',
        city: 'Mamer',
        line: 'West Line 50',
        distance_km_estimate: 9,
        typical_travel_time_min: 9,
        typical_headway_min: 30,
        transport_notes: ''
    },
    {
        id: 'capellen',
        city: 'Capellen',
        line: 'West Line 50',
        distance_km_estimate: 14,
        typical_travel_time_min: 14,
        typical_headway_min: 30,
        transport_notes: ''
    },
    {
        id: 'kleinbettingen',
        city: 'Kleinbettingen',
        line: 'West Line 50',
        distance_km_estimate: 17,
        typical_travel_time_min: 18,
        typical_headway_min: 30,
        transport_notes: ''
    },
    {
        id: 'arlon',
        city: 'Arlon',
        line: 'West Line 50',
        distance_km_estimate: 27,
        typical_travel_time_min: 28,
        typical_headway_min: 30,
        transport_notes: 'Western terminus in Belgium'
    }
];

// Helper function to get cities by line
function getCitiesByLine(lineName) {
    return TRAIN_CITIES.filter(c => c.line === lineName);
}

// Helper function to get city by ID
function getCityById(id) {
    return TRAIN_CITIES.find(c => c.id === id);
}

// Helper function to sort cities by travel time
function getCitiesSortedByTime() {
    return [...TRAIN_CITIES].sort((a, b) => a.typical_travel_time_min - b.typical_travel_time_min);
}

// ─────── EXPORTS ───────
module.exports = {
    TRAIN_LINES,
    TRAIN_CITIES,
    STATION_TO_COMMUNES,
    getCommunitiesForStation,
    getCitiesByLine,
    getCityById,
    getCitiesSortedByTime
};
