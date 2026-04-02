// Genere le 02/04/2026 09:14
// 43 anomalies detectees
const ANOMALIES = [
  {
    "listing_id": "vivi_213793",
    "title": "1",
    "city": "Luxembourg",
    "price": 1700,
    "surface": 30,
    "site": "VIVI.lu",
    "url": "https://www.vivi.lu/fr/propriete/lieu/appartement/luxembourg/studio-1-chambre-a-louer/213793",
    "reasons": [
      "Prix/m² élevé: 56.7€/m²"
    ]
  },
  {
    "listing_id": "athome_8270247",
    "title": "+352 691 222 295 bernard@mtinvest.lu +352 691 348 042 felix@mtinvest.l",
    "city": "Centre",
    "price": 1900,
    "surface": 30,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/studio/luxembourg-centre-ville/id-8270247.html",
    "reasons": [
      "Prix/m² élevé: 63.3€/m²"
    ]
  },
  {
    "listing_id": "immolu_1681427",
    "title": "Appartement 1 chambre a louer — Luxembourg-Rollingergrund",
    "city": "Rollingergrund",
    "price": 1790,
    "surface": 34,
    "site": "Immo.lu",
    "url": "https://www.immo.lu/Scripts/sql.exe?SqlDB=immo&Sql=Details.phs&item=1681427&c=55736",
    "reasons": [
      "Prix/m² élevé: 52.6€/m²"
    ]
  },
  {
    "listing_id": "ddimmo_851494",
    "title": "Appartement Fentange - 34m² - 2 ch.",
    "city": "Fentange",
    "price": 1950,
    "surface": 34,
    "site": "DDImmo.lu",
    "url": "https://www.ddimmo.lu/nos-locations/851494",
    "reasons": [
      "Prix/m² élevé: 57.4€/m²"
    ]
  },
  {
    "listing_id": "ddimmo_851502",
    "title": "Appartement Fentange - 34m² - 2 ch.",
    "city": "Fentange",
    "price": 1950,
    "surface": 34,
    "site": "DDImmo.lu",
    "url": "https://www.ddimmo.lu/nos-locations/851502",
    "reasons": [
      "Prix/m² élevé: 57.4€/m²"
    ]
  },
  {
    "listing_id": "rockenbrod_lux-limpertsberg-avenue-victor-hugo-2",
    "title": "Rockenbrod Agence Immobilière",
    "city": "Limpertsberg",
    "price": 1800,
    "surface": 33,
    "site": "Rockenbrod.lu",
    "url": "https://www.rockenbrod.lu/proprietes/lux-limpertsberg-avenue-victor-hugo-2/",
    "reasons": [
      "Prix/m² élevé: 54.5€/m²"
    ]
  },
  {
    "listing_id": "wortimmo_510955",
    "title": "Chambre 4 chambre(s) à louer à Itzig",
    "city": "Itzig",
    "price": 1300,
    "surface": 25,
    "site": "Wortimmo.lu",
    "url": "https://www.wortimmo.lu/fr/location-chambre-centre-itzig-id_510955",
    "reasons": [
      "Prix/m² élevé: 52.0€/m²"
    ]
  },
  {
    "listing_id": "wortimmo_468555",
    "title": "Appartement 1 chambre(s) à louer à Luxembourg-Limpertsberg",
    "city": "Limpertsberg",
    "price": 1850,
    "surface": 32,
    "site": "Wortimmo.lu",
    "url": "https://www.wortimmo.lu/fr/location-appartement-centre-luxembourg-limpertsberg-id_468555",
    "reasons": [
      "Prix/m² élevé: 57.8€/m²"
    ]
  },
  {
    "listing_id": "wortimmo_515112",
    "title": "Appartement 1 chambre(s) à louer à Luxembourg-Pfaffenthall",
    "city": "Pfaffenthall",
    "price": 1650,
    "surface": 30,
    "site": "Wortimmo.lu",
    "url": "https://www.wortimmo.lu/fr/location-appartement-centre-luxembourg-pfaffenthall-id_515112",
    "reasons": [
      "Prix/m² élevé: 55.0€/m²"
    ]
  },
  {
    "listing_id": "wortimmo_512793",
    "title": "Appartement 1 chambre(s) à louer à Luxembourg-Hollerich",
    "city": "Hollerich",
    "price": 1840,
    "surface": 30,
    "site": "Wortimmo.lu",
    "url": "https://www.wortimmo.lu/fr/location-appartement-centre-luxembourg-hollerich-id_512793",
    "reasons": [
      "Prix/m² élevé: 61.3€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_13349",
    "title": "Appartement a Luxembourg-Clausen - 30m2 - 1 chambre",
    "city": "Clausen",
    "price": 1900,
    "surface": 30,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/13349",
    "reasons": [
      "Prix/m² élevé: 63.3€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_13348",
    "title": "Appartement a Luxembourg-Clausen - 30m2 - 1 chambre",
    "city": "Clausen",
    "price": 1695,
    "surface": 30,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/13348",
    "reasons": [
      "Prix/m² élevé: 56.5€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_12883",
    "title": "Appartement a Luxembourg-Centre ville - 30m2 - 1 chambre",
    "city": "Centre",
    "price": 1540,
    "surface": 30,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/12883",
    "reasons": [
      "Prix/m² élevé: 51.3€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_12878",
    "title": "Appartement a Luxembourg-Centre ville - 26m2",
    "city": "Centre",
    "price": 1540,
    "surface": 26,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/12878",
    "reasons": [
      "Prix/m² élevé: 59.2€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_45714",
    "title": "Appartement a Luxembourg-Clausen - 30m2",
    "city": "Clausen",
    "price": 1695,
    "surface": 30,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/45714",
    "reasons": [
      "Prix/m² élevé: 56.5€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_45633",
    "title": "Appartement a Luxembourg-Clausen - 30m2",
    "city": "Clausen",
    "price": 1900,
    "surface": 30,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/45633",
    "reasons": [
      "Prix/m² élevé: 63.3€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_12684",
    "title": "Appartement a Luxembourg-Muhlenbach - 33m2",
    "city": "Muhlenbach",
    "price": 1800,
    "surface": 33,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/12684",
    "reasons": [
      "Prix/m² élevé: 54.5€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_16393",
    "title": "Appartement a Bertrange - 30m2",
    "city": "Bertrange",
    "price": 1650,
    "surface": 30,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/16393",
    "reasons": [
      "Prix/m² élevé: 55.0€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_46509",
    "title": "Appartement a ITZIG - 25m2 - 4 chambres",
    "city": "Itzig",
    "price": 1300,
    "surface": 25,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/46509",
    "reasons": [
      "Prix/m² élevé: 52.0€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_46212",
    "title": "Appartement a Luxembourg-Centre ville - 30m2 - 1 chambre",
    "city": "Centre",
    "price": 1700,
    "surface": 30,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/46212",
    "reasons": [
      "Prix/m² élevé: 56.7€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_47146",
    "title": "Appartement a Luxembourg-Bonnevoie - 26m2",
    "city": "Bonnevoie",
    "price": 1675,
    "surface": 26,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/47146",
    "reasons": [
      "Prix/m² élevé: 64.4€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_47148",
    "title": "Appartement a Luxembourg-Bonnevoie - 26m2",
    "city": "Bonnevoie",
    "price": 1675,
    "surface": 26,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/47148",
    "reasons": [
      "Prix/m² élevé: 64.4€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_18901",
    "title": "Appartement a Luxembourg-Limpertsberg - 30m2",
    "city": "Limpertsberg",
    "price": 1600,
    "surface": 30,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/18901",
    "reasons": [
      "Prix/m² élevé: 53.3€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_48187",
    "title": "Appartement a Luxembourg-Gare - 30m2 - 1 chambre",
    "city": "Gare",
    "price": 1950,
    "surface": 30,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/48187",
    "reasons": [
      "Prix/m² élevé: 65.0€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_46938",
    "title": "Appartement a Luxembourg-Rollingergrund - 34m2 - 1 chambre",
    "city": "Rollingergrund",
    "price": 1790,
    "surface": 34,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/46938",
    "reasons": [
      "Prix/m² élevé: 52.6€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_16379",
    "title": "Appartement a Luxembourg-Gasperich - 27m2",
    "city": "Gasperich",
    "price": 1600,
    "surface": 27,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/16379",
    "reasons": [
      "Prix/m² élevé: 59.3€/m²"
    ]
  },
  {
    "listing_id": "nextimmo_46889",
    "title": "Appartement a Luxembourg-Centre ville - 37m2 - 1 chambre",
    "city": "Centre",
    "price": 1950,
    "surface": 37,
    "site": "Nextimmo.lu",
    "url": "https://nextimmo.lu/properties/46889",
    "reasons": [
      "Prix/m² élevé: 52.7€/m²"
    ]
  },
  {
    "listing_id": "immotop_1903159",
    "title": "Appartement 1 chambre excellent état, premier étage, Pfaffenthal, Luxe",
    "city": "Luxembourg",
    "price": 1650,
    "surface": 30,
    "site": "Immotop.lu",
    "url": "https://www.immotop.lu/annonces/1903159/",
    "reasons": [
      "Prix/m² élevé: 55.0€/m²"
    ]
  },
  {
    "listing_id": "athome_7678375",
    "title": "Démarrez votre nouvelle vie à Luxembourg avec ce charmant appartement ",
    "city": "Cents",
    "price": 1880,
    "surface": 30,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/appartement/luxembourg-cents/id-7678375.html",
    "reasons": [
      "Prix/m² élevé: 62.7€/m²"
    ]
  },
  {
    "listing_id": "athome_7708618",
    "title": "Sentez-vous comme chez vous avec Blueground. Vous allez adorer ce élég",
    "city": "Bonnevoie",
    "price": 1570,
    "surface": 30,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/appartement/luxembourg-bonnevoie/id-7708618.html",
    "reasons": [
      "Prix/m² élevé: 52.3€/m²"
    ]
  },
  {
    "listing_id": "athome_8188135",
    "title": "Sentez-vous comme chez vous avec Blueground. Vous allez adorer ce bell",
    "city": "Cessange",
    "price": 1720,
    "surface": 34,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/appartement/luxembourg-cessange/id-8188135.html",
    "reasons": [
      "Prix/m² élevé: 50.6€/m²"
    ]
  },
  {
    "listing_id": "athome_7797405",
    "title": "Sentez-vous comme chez vous avec Blueground. Vous allez adorer ce spac",
    "city": "Muhlenbach",
    "price": 1740,
    "surface": 32,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/studio/luxembourg-muhlenbach/id-7797405.html",
    "reasons": [
      "Prix/m² élevé: 54.4€/m²"
    ]
  },
  {
    "listing_id": "athome_8270237",
    "title": "+352 691 222 295 bernard@mtinvest.lu +352 691 348 042 felix@mtinvest.l",
    "city": "Kirchberg",
    "price": 1900,
    "surface": 30,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/studio/luxembourg-kirchberg/id-8270237.html",
    "reasons": [
      "Prix/m² élevé: 63.3€/m²"
    ]
  },
  {
    "listing_id": "athome_8992487",
    "title": "RE/MAX Luxembourg vous propose cet appartement rénové, disponible à la",
    "city": "Rollingergrund",
    "price": 1790,
    "surface": 34,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/appartement/luxembourg-rollingergrund/id-8992487.html",
    "reasons": [
      "Prix/m² élevé: 52.6€/m²"
    ]
  },
  {
    "listing_id": "athome_9016327",
    "title": "En plein centre de Luxembourg ville, à proximité des rues piétonnes, l",
    "city": "Centre",
    "price": 1700,
    "surface": 30,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/studio/luxembourg-centre-ville/id-9016327.html",
    "reasons": [
      "Prix/m² élevé: 56.7€/m²"
    ]
  },
  {
    "listing_id": "athome_8792795",
    "title": "Bienvenue chez Blank Page,\r\n\r\nNous sommes ravis de vous présenter cett",
    "city": "Clausen",
    "price": 1695,
    "surface": 30,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/studio/luxembourg-clausen/id-8792795.html",
    "reasons": [
      "Prix/m² élevé: 56.5€/m²"
    ]
  },
  {
    "listing_id": "athome_8792544",
    "title": "Bienvenue chez Blank Page,\r\n\r\nNous sommes ravis de vous présenter cett",
    "city": "Clausen",
    "price": 1695,
    "surface": 30,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/studio/luxembourg-clausen/id-8792544.html",
    "reasons": [
      "Prix/m² élevé: 56.5€/m²"
    ]
  },
  {
    "listing_id": "athome_8194935",
    "title": "Bienvenue chez Blank Page,\r\n\r\nNous sommes ravis de vous présenter cett",
    "city": "Clausen",
    "price": 1900,
    "surface": 30,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/studio/luxembourg-clausen/id-8194935.html",
    "reasons": [
      "Prix/m² élevé: 63.3€/m²"
    ]
  },
  {
    "listing_id": "athome_9007135",
    "title": "+++KIRCHBERG+++ COUP DE COEUR! DISPONIBLE IMMEDIATEMENT+++EUREKA REAL ",
    "city": "Kirchberg",
    "price": 1650,
    "surface": 25,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/studio/luxembourg-kirchberg/id-9007135.html",
    "reasons": [
      "Prix/m² élevé: 66.0€/m²"
    ]
  },
  {
    "listing_id": "athome_9007132",
    "title": "+++KIRCHBERG+++ COUP DE COEUR! DISPONIBLE IMMEDIATEMENT+++EUREKA REAL ",
    "city": "Kirchberg",
    "price": 1700,
    "surface": 25,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/studio/luxembourg-kirchberg/id-9007132.html",
    "reasons": [
      "Prix/m² élevé: 68.0€/m²"
    ]
  },
  {
    "listing_id": "athome_9007137",
    "title": "+++KIRCHBERG+++ COUP DE COEUR! DISPONIBLE 01.09.2026+++EUREKA REAL EST",
    "city": "Kirchberg",
    "price": 1700,
    "surface": 25,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/studio/luxembourg-kirchberg/id-9007137.html",
    "reasons": [
      "Prix/m² élevé: 68.0€/m²"
    ]
  },
  {
    "listing_id": "athome_9007134",
    "title": "+++KIRCHBERG+++ COUP DE COEUR! DISPONIBLE IMMEDIATEMENT+++EUREKA REAL ",
    "city": "Kirchberg",
    "price": 1700,
    "surface": 25,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/studio/luxembourg-kirchberg/id-9007134.html",
    "reasons": [
      "Prix/m² élevé: 68.0€/m²"
    ]
  },
  {
    "listing_id": "athome_9007130",
    "title": "+++KIRCHBERG+++ COUP DE COEUR! DISPONIBLE 01.10.2026+++EUREKA REAL EST",
    "city": "Kirchberg",
    "price": 1700,
    "surface": 25,
    "site": "Athome.lu",
    "url": "https://www.athome.lu/location/studio/luxembourg-kirchberg/id-9007130.html",
    "reasons": [
      "Prix/m² élevé: 68.0€/m²"
    ]
  }
];
