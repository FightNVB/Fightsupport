// Admin sportschool-bewijspass.
//
// Hoort uitsluitend bij de admincontrole. Na de eigen full admin-scrape leest
// deze pass de actuele SPORTSCHOLEN-tegel per VA en vult controle_fighter_actueel.
// De live sportschool is alleen bewijs voor enrich; de MM-sportschool blijft
// de harde waarheid waarvan het keurmerk op de eventdatum moet worden gevonden.

await import("../fp_mm/scraper_fp_mm.js");
