// ControlEngine/utils/logger.js
import supabase from "./supabaseClient.js";

export async function logScraperStart(va, scraper) {
  await supabase.from("scraper_status").insert({
    va_nummer: va,
    scraper,
    status: "running",
    message: "Scraper gestart"
  });
}

export async function logScraperDone(va, scraper) {
  await supabase.from("scraper_status")
    .update({
      status: "done",
      message: "Scraper afgerond",
      finished_at: new Date().toISOString()
    })
    .eq("va_nummer", va)
    .eq("scraper", scraper);
}

export async function logScraperError(va, scraper, msg) {
  await supabase.from("scraper_status")
    .update({
      status: "error",
      message: msg,
      finished_at: new Date().toISOString()
    })
    .eq("va_nummer", va)
    .eq("scraper", scraper);
}
