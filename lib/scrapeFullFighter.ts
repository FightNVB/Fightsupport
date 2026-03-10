// lib/scrapeFullFighter.ts

import path from "path";
import { fileURLToPath } from "url";
import { Fighter } from "./types";

// We gebruiken dynamic import omdat jouw scraper een .js ES-module is
export async function scrapeFullFighterTS(fpNummer: string): Promise<Fighter> {
  if (!fpNummer) throw new Error("scrapeFullFighterTS: geen FP nummer.");

  // Absoluut pad naar jouw JS-scraper
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // pad naar: scrapers/scraper_full_fighter.js
  const scraperPath = path.resolve(__dirname, "../scrapers/scraper_full_fighter.js");

  // Dynamische import van de JS-scraper
  const scraperModule = await import(scraperPath);

  if (!scraperModule.scrapeFullFighter) {
    throw new Error("scraper_full_fighter.js exporteert geen scrapeFullFighter.");
  }

  // Run de JS-scraper
  const raw = await scraperModule.scrapeFullFighter(fpNummer);

  // ------------------------------
  // Mapping naar Fighter (TS type)
  // ------------------------------
  const fighter: Fighter = {
    nvb_nummer: fpNummer,
    naam: raw.naam ?? "",
    geboortedatum: raw.geboortedatum ?? "",
    leeftijd: raw.leeftijd ?? null,

    gewicht: raw.record?.totaal ?? null, // hier kun je ECHT gewicht toevoegen als je dat hebt
    record_total: raw.record?.totaal ?? null,

    gym_naam: raw.gym ?? null,
    gym_nvb_nummer: null, // FightPassport geeft dit niet, Supabase vult later aan

    klasse_kb: raw.klasse ?? null,
    klasse_mt: null,
    klasse_dsb: null,
    klasse_mma: null,

    wins: raw.record?.w ?? null,
    losses: raw.record?.l ?? null,
    draws: raw.record?.d ?? null,
    ko_losses: null,

    startverbod_tot: raw.startverbod_einde ?? null,
    medisch_commentaar: null,
    licentie_geldig_tot: raw.licentie === "Geldig" ? "2099-01-01" : null,

    talent_status: null,
  };

  return fighter;
}
