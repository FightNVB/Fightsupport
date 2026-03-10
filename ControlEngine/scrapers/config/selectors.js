// scrapers/config/selectors.js
// ===============================================
// Alle selectors van de echte FightPassport website
// ===============================================

export const SELECTORS = {
  // ----------------------------
  // LOGIN PAGE
  // ----------------------------
  login: {
    username: "input.veld.target_input.gebruikersnaam",
    password: "input.veld.target_input.wachtwoord",
    pin: "input.veld.target_input.pincode",
    loginButton: "button.volgende"
  },

  // ----------------------------
  // DASHBOARD TILES
  // ----------------------------
  dashboard: {
    tileVechters: "div.tileHeader.enabled:contains('VECHTERS')",
    tileSportscholen: "div.tileHeader.enabled:contains('SPORTSCHOLEN')",
    tileStartverboden: "div.tileHeader.enabled:contains('STARTVERBODEN')"
  },

  // ----------------------------
  // ZOEKVELD / VECHTERS OVERZICHT
  // ----------------------------
  search: {
    input: "input[type='text']", // veld bij ZOEKEN
    searchButton: "button:contains('ZOEKEN')",
    resultRows: "table tr", // eerste rij overslaan
    firstLink: "table tr td a"
  },

  // ----------------------------
  // VECHTER DETAILS (detailpagina)
  // ----------------------------
  details: {
    naam: "h2", // bevat: Naam (FPnummer)
    geboortedatum: "div.tileHeader + div ul li:nth-child(1)",
    geslacht: "div.tileHeader + div ul li:nth-child(2)",

    // Uit de DETAILS tegel
    tileDetails: "div.tileHeader.enabled:contains('DETAILS')",
    fitToFight: "p:contains('Fit to fight')",
    licentie: "p:contains('Licentie')",

    // Startverbod indicator op detailpagina
    startverbodIndicator: "p:contains('Startverbod')"
  },

  // ----------------------------
  // STARTVERBOD POPUP
  // ----------------------------
  startverbodPopup: {
    rows: "table tr",
    soort: "td:nth-child(1)",
    ingang: "td:nth-child(2)",
    einde: "td:nth-child(3)",
    door: "td:nth-child(4)",
    reden: "td:nth-child(5)",
    evenement: "td:nth-child(6)",
    datum: "td:nth-child(7)"
  },

  // ----------------------------
  // UITSLAGEN POPUP
  // ----------------------------
  uitslagenPopup: {
    rows: "table tr",
    datum: "td:nth-child(1)",
    evenement: "td:nth-child(2)",
    uitslag: "td:nth-child(3)",
    discipline: "td:nth-child(4)",
    klasse: "td:nth-child(5)",
    gewicht: "td:nth-child(6)"
  },

  // ----------------------------
  // 0-MEETING (opmerking)
  // ----------------------------
  zeroMeeting: {
    tileZeroMeeting: "div.tileHeader.enabled:contains('BONDEN')",
    // exact veld wordt later bepaald tijdens inspectie
    text: "div:contains('0-meting'), div:contains('meeting'), div:contains('keuring')"
  }
};
