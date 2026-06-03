// ControlEngine/scrapers/yoc/scraper_yoc_bundle.js
// YOC intake scraper: opent FightPassport per VA en schrijft FightPassport-snapshot naar yoc_fighters_raw.
// CLI:
//   node scraper_yoc_bundle.js <yoc_event_id> <yoc_run_id> [va1 va2 va3]
// Als er geen VA's worden meegegeven, haalt hij alle geldige VA's op uit yoc_fighters.

import { loginFightPassport, ensureLoggedIn } from "../utils/loginFightPassport.js";
import supabase from "../utils/supabaseClient.js";

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err?.stack ?? err);
  process.exitCode = 1;
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err?.stack ?? err);
  process.exitCode = 1;
});

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeVaStrict(v) {
  const s = String(v ?? "").trim();
  const digits = s.replace(/\D/g, "");
  return /^\d{3,5}$/.test(digits) ? digits : null;
}

function normalizeText(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

async function withTimeout(promiseFactory, ms, label, onTimeout) {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(async () => {
      try {
        if (typeof onTimeout === "function") await onTimeout();
      } catch {}
      rej(new Error(`HARD TIMEOUT ${ms}ms for ${label}`));
    }, ms);
  });

  try {
    const p = Promise.resolve().then(() => promiseFactory());
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(t);
  }
}

async function closeAnyModal(page) {
  const selectors = [
    "button#sluit_inr_detail",
    "button.sluit_scherm.overview",
    "button.sluit_scherm",
    "img.sluit_modal",
    "button.ui-dialog-titlebar-close",
  ];

  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click();
        await wait(120);
      }
    } catch {}
  }

  try {
    await page.keyboard.press("Escape");
    await wait(80);
    await page.keyboard.press("Escape");
    await wait(80);
  } catch {}
}

async function readHeaderInfo(page) {
  try {
    return await page.evaluate(() => {
      const k1 = document.querySelector(".koptekst1");
      const t = (k1?.innerText || "").trim();
      const m = t.match(/\((\d{3,5})\)$/);
      return { gotVa: m ? m[1] : null, koptekst1: t };
    });
  } catch {
    return { gotVa: null, koptekst1: "" };
  }
}

function fighterUrl(va) {
  return `https://fightpassport.nl/#va_vechter/${va}`;
}

async function isLoginPage(page) {
  try {
    return await page.evaluate(() => {
      function isVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && r.width > 0 && r.height > 0;
      }
      const pincode = document.querySelector("input.pincode") || document.querySelector("input.target_input.pincode") || document.querySelector("input[class*='pincode']");
      if (pincode && isVisible(pincode)) return false;
      const loginEl = document.querySelector("input.gebruikersnaam");
      if (loginEl && isVisible(loginEl)) return true;
      const u = String(location.href || "").toLowerCase();
      return u.includes("login") || u.includes("#login") || u.includes("aanmeld");
    });
  } catch {}
  return false;
}

async function hardClosePage(page) {
  if (!page) return;
  try {
    const client = await page.target().createCDPSession();
    await client.send("Page.stopLoading").catch(() => {});
    await client.detach().catch(() => {});
  } catch {}
  try {
    await page.close({ runBeforeUnload: true }).catch(() => {});
  } catch {}
}

async function createWorkerContext(browser) {
  if (browser && typeof browser.createBrowserContext === "function") return await browser.createBrowserContext();
  if (browser && typeof browser.createIncognitoBrowserContext === "function") return await browser.createIncognitoBrowserContext();
  return null;
}

async function closeWorkerContext(ctx) {
  if (!ctx) return;
  try {
    const pages = await ctx.pages().catch(() => []);
    for (const p of pages) await hardClosePage(p).catch(() => {});
  } catch {}
  try {
    await ctx.close().catch(() => {});
  } catch {}
}

async function openTabToFighterVerified(browser, context, cookies, va, opts) {
  const { maxAttempts = 3, softWaitMs = 900, betweenAttemptsMs = 400, workerLabel = "" } = opts ?? {};

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const p = context ? await context.newPage() : await browser.newPage();
    await p.setCacheEnabled(false);

    try {
      if (Array.isArray(cookies) && cookies.length) await p.setCookie(...cookies);
    } catch {}

    await p.goto(fighterUrl(va), { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    await wait(softWaitMs);

    if (await isLoginPage(p)) {
      await hardClosePage(p).catch(() => {});
      throw new Error("LOGIN_PAGE");
    }

    const info = await readHeaderInfo(p);
    const gotVa = info?.gotVa ?? null;
    if (gotVa && String(gotVa) === String(va)) return p;

    console.log(`[yoc_bundle] ↪️ openTab mismatch/empty ${workerLabel}`, {
      requested: String(va),
      gotVa: gotVa ?? null,
      attempt,
      urlNow: p.url(),
      koptekst1: info?.koptekst1 ?? "",
    });

    await hardClosePage(p).catch(() => {});
    await wait(betweenAttemptsMs);
  }

  return null;
}

async function scrapeHeader(page) {
  await page.waitForSelector(".koptekst1", { timeout: 20000 });

  return await page.evaluate(() => {
    const r = { va_nummer: null, naam: null, geboortedatum: null, leeftijd: null, geslacht: null };
    const k1 = document.querySelector(".koptekst1");
    const k2 = document.querySelector(".koptekst2");
    const nameBlock = k1?.innerText?.trim() || "";
    const infoBlock = k2?.innerText?.trim() || "";
    const m = nameBlock.match(/^(.+)\((\d+)\)$/);
    if (m) {
      r.naam = m[1].trim();
      r.va_nummer = m[2].trim();
    }
    const p = infoBlock.split(" ");
    if (p[0]?.match(/^\d{2}-\d{2}-\d{4}$/)) r.geboortedatum = p[0];
    const age = infoBlock.match(/\((\d+)\s*jr/);
    if (age) r.leeftijd = parseInt(age[1], 10);
    const low = infoBlock.toLowerCase();
    if (low.includes("vrouw")) r.geslacht = "vrouw";
    else if (low.includes("man")) r.geslacht = "man";
    return r;
  });
}

async function openTile(page, va, title) {
  await closeAnyModal(page);
  await page.evaluate((va, title) => {
    const tab = document.querySelector(`.internal_tab.va_vechter_${va}`);
    if (!tab) return;
    const head = [...tab.querySelectorAll(".tileHeader.enabled")].find((h) => (h.innerText || "").trim().toUpperCase() === title.toUpperCase());
    head?.closest(".tile")?.click();
  }, va, title);
  await wait(650);
}

async function scrapeDetails(page, va) {
  return await page.evaluate((va) => {
    const tab = document.querySelector(`.internal_tab.va_vechter_${va}`);
    if (!tab) return null;
    const tile = tab.querySelector(`div[title="DETAILS"]`);
    if (!tile) return null;
    const p = [...tile.querySelectorAll("ul.get_tile_content p")];
    let licentie = null;
    let totaal = null;
    let gewonnen = null;
    let heeft_startverbod = false;
    for (const row of p) {
      const raw = row.innerText || "";
      const txt = raw.toLowerCase().trim();
      if (txt.startsWith("licentie")) licentie = (raw.split(":")[1] ?? "").trim() || null;
      if (txt.startsWith("wedstrijden")) {
        const m = raw.match(/\d+/);
        totaal = m ? parseInt(m[0], 10) : null;
      }
      if (txt.startsWith("gewonnen")) {
        const m = raw.match(/\d+/);
        gewonnen = m ? parseInt(m[0], 10) : null;
      }
      if (txt.includes("startverbod")) {
        if (txt.includes("nee") || txt.includes("geen")) heeft_startverbod = false;
        else if (txt.includes("ja") || txt.includes("actief")) heeft_startverbod = true;
        else if (/\d{2}-\d{2}-\d{4}/.test(raw)) heeft_startverbod = true;
      }
    }
    return { licentie, totaal, gewonnen, heeft_startverbod };
  }, va);
}

async function scrapeZeroMeting(page) {
  const exists = await page.$("input.dnva_nulmetingaantalwedstr");
  if (!exists) {
    await closeAnyModal(page);
    return { totaal: 0, opmerking: "", klasse: null };
  }

  const result = await page.evaluate(() => {
    const totaal = parseInt((document.querySelector("input.dnva_nulmetingaantalwedstr")?.value || "").replace(/\D/g, "")) || 0;
    const opmerking = document.querySelector("textarea.dvcz_omschr2")?.value?.trim() || "";
    let klasse = null;
    const sel = document.querySelector("select.dvnulmetingklasseoms");
    if (sel) {
      const opt = sel.options[sel.selectedIndex];
      klasse = opt?.textContent?.trim() || sel.value || null;
    }
    return { totaal, opmerking, klasse };
  });

  await closeAnyModal(page);
  return result;
}

function toIsoDateFromNl(v) {
  if (!v) return null;
  const m = String(v).trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

async function fetchYocRows(yoc_event_id, explicitVaList) {
  const { data, error } = await supabase
    .from("yoc_fighters")
    .select("id,yoc_event_id,row_index,naam_mm,geslacht_mm,sportschool_mm,gewicht_mm,va_nummer_mm")
    .eq("yoc_event_id", yoc_event_id)
    .order("row_index", { ascending: true });

  if (error) throw error;

  const explicit = new Set((explicitVaList ?? []).map(String));
  const rows = (data ?? []).map((r) => ({ ...r, va_norm: normalizeVaStrict(r.va_nummer_mm) }));

  if (explicit.size) return rows.filter((r) => r.va_norm && explicit.has(String(r.va_norm)));
  return rows.filter((r) => r.va_norm);
}

async function saveYocRawForRow(row, scrape) {
  const header = scrape?.header ?? {};
  const details = scrape?.details ?? {};
  const zero = scrape?.zero ?? {};
  const vaNummer = normalizeVaStrict(header.va_nummer ?? row.va_norm);

  const payload = {
    yoc_event_id: row.yoc_event_id,
    controle_run_id: scrape.yoc_run_id,
    va_nummer: vaNummer ? Number(vaNummer) : null,
    naam: header.naam ?? row.naam_mm ?? null,
    geboortedatum: toIsoDateFromNl(header.geboortedatum),
    geslacht: header.geslacht ?? row.geslacht_mm ?? null,
    licentie: details.licentie ?? null,
    heeft_startverbod: details.heeft_startverbod ? "Ja" : "Nee",
    totaal_wedstrijden: details.totaal ?? 0,
    gewonnen: details.gewonnen ?? 0,
    nulmeting_totaal: zero.totaal ?? 0,
    nulmeting_opmerking: zero.opmerking || null,
    nulmeting_klasse: zero.klasse || null,
    updated_at: new Date().toISOString(),
  };

  // Eerst proberen te updaten zodat we niet afhankelijk zijn van een onConflict constraint.
  // Daarna insert als er nog geen raw-snapshot voor deze YOC-event + VA bestaat.
  if (payload.va_nummer !== null) {
    const { data: updated, error: updateError } = await supabase
      .from("yoc_fighters_raw")
      .update(payload)
      .eq("yoc_event_id", row.yoc_event_id)
      .eq("va_nummer", payload.va_nummer)
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;
    if (updated?.id) return updated.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("yoc_fighters_raw")
    .insert(payload)
    .select("id")
    .single();

  if (insertError) throw insertError;
  return inserted.id;
}

async function saveYocRawErrorForRow(row, yoc_run_id, message) {
  const payload = {
    yoc_event_id: row.yoc_event_id,
    controle_run_id: yoc_run_id,
    va_nummer: row.va_norm ? Number(row.va_norm) : null,
    naam: row.naam_mm ?? null,
    geslacht: row.geslacht_mm ?? null,
    licentie: null,
    heeft_startverbod: null,
    totaal_wedstrijden: null,
    gewonnen: null,
    nulmeting_totaal: null,
    nulmeting_opmerking: message,
    nulmeting_klasse: null,
    updated_at: new Date().toISOString(),
  };

  if (payload.va_nummer !== null) {
    const { data: updated, error: updateError } = await supabase
      .from("yoc_fighters_raw")
      .update(payload)
      .eq("yoc_event_id", row.yoc_event_id)
      .eq("va_nummer", payload.va_nummer)
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;
    if (updated?.id) return updated.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("yoc_fighters_raw")
    .insert(payload)
    .select("id")
    .single();

  if (insertError) throw insertError;
  return inserted.id;
}

async function saveYocContextForRow(row, scrape, fighterRawId) {
  const header = scrape?.header ?? {};
  const details = scrape?.details ?? {};
  const zero = scrape?.zero ?? {};

  const payload = {
    yoc_event_id: row.yoc_event_id,
    yoc_run_id: scrape.yoc_run_id,
    fighter_raw_id: fighterRawId,

    va_nummer: row.va_norm,

    naam_mm: row.naam_mm ?? null,
    geslacht_mm: row.geslacht_mm ?? null,
    sportschool_mm: row.sportschool_mm ?? null,
    gewicht_mm: row.gewicht_mm ?? null,

    naam_fp: header.naam ?? null,
    geboortedatum_fp: toIsoDateFromNl(header.geboortedatum),
    geslacht_fp: header.geslacht ?? null,
    licentie: details.licentie ?? null,
    heeft_startverbod: Boolean(details.heeft_startverbod),
    totaal_wedstrijden: details.totaal ?? null,
    gewonnen: details.gewonnen ?? null,
    nulmeting_totaal: zero.totaal ?? null,
    nulmeting_opmerking: zero.opmerking || null,
    nulmeting_klasse: zero.klasse || null,

    scrape_status: "ok",
    scrape_error: null,
  };

  const { error } = await supabase.from("yoc_fighter_context").upsert(payload, {
    onConflict: "yoc_event_id,fighter_raw_id",
  });

  if (error) throw error;
}

async function saveYocErrorForRow(row, yoc_run_id, message) {
  let fighterRawId = null;
  try {
    fighterRawId = await saveYocRawErrorForRow(row, yoc_run_id, message);
  } catch (e) {
    console.log("[yoc_bundle] ❌ raw error upsert fout:", e?.message ?? String(e));
  }

  if (!fighterRawId) return;

  const payload = {
    yoc_event_id: row.yoc_event_id,
    yoc_run_id,
    fighter_raw_id: fighterRawId,
    va_nummer: row.va_norm ?? null,
    naam_mm: row.naam_mm ?? null,
    geslacht_mm: row.geslacht_mm ?? null,
    sportschool_mm: row.sportschool_mm ?? null,
    gewicht_mm: row.gewicht_mm ?? null,
    scrape_status: "failed",
    scrape_error: message,
  };

  const { error } = await supabase.from("yoc_fighter_context").upsert(payload, {
    onConflict: "yoc_event_id,fighter_raw_id",
  });

  if (error) console.log("[yoc_bundle] ❌ error context upsert fout:", error.message);
}

async function markInvalidVaRows(yoc_event_id, yoc_run_id) {
  const { data, error } = await supabase
    .from("yoc_fighters")
    .select("id,yoc_event_id,row_index,naam_mm,geslacht_mm,sportschool_mm,gewicht_mm,va_nummer_mm")
    .eq("yoc_event_id", yoc_event_id);

  if (error) throw error;

  const invalidRows = (data ?? []).filter((r) => !normalizeVaStrict(r.va_nummer_mm));

  for (const f of invalidRows) {
    await saveYocErrorForRow(
      { ...f, va_norm: null },
      yoc_run_id,
      "Geen geldig VA nummer in upload."
    );
  }

  return invalidRows.length;
}

async function doFullfighter(page, va) {
  const header = await scrapeHeader(page);
  if (!header?.va_nummer || String(header.va_nummer) !== String(va)) {
    throw new Error(`Header VA mismatch: requested=${va} got=${header?.va_nummer ?? "null"}`);
  }

  await openTile(page, va, "DETAILS");
  const details = await scrapeDetails(page, va);
  const zero = await scrapeZeroMeting(page);
  return { header, details, zero };
}

async function runYocBundle(yoc_event_id, yoc_run_id, explicitVaList, workers = 5) {
  const skippedInvalid = await markInvalidVaRows(yoc_event_id, yoc_run_id);
  const rows = await fetchYocRows(yoc_event_id, explicitVaList);

  console.log("[yoc_bundle] rows loaded", { validRows: rows.length, skippedInvalid });

  const { browser, page: masterPage } = await loginFightPassport();
  let cookies = [];
  try {
    cookies = await masterPage.cookies();
  } catch {}

  console.log("[yoc_bundle] ✅ Master logged in (cookies captured)");

  let masterRefreshPromise = null;
  async function refreshMasterSessionLocked(reason = "") {
    if (masterRefreshPromise) {
      try { await masterRefreshPromise; } catch {}
      return cookies;
    }

    masterRefreshPromise = (async () => {
      console.log(`[yoc_bundle] 🔁 master ensureLoggedIn(force) start ${reason ? `(${reason})` : ""}`);
      await ensureLoggedIn(masterPage, { force: true });
      try { cookies = await masterPage.cookies(); } catch {}
      console.log("[yoc_bundle] ✅ master refreshed (cookies updated)");
      return cookies;
    })();

    try {
      return await masterRefreshPromise;
    } finally {
      masterRefreshPromise = null;
    }
  }

  const FULLFIGHTER_TIMEOUT_MS = Number(process.env.FULLFIGHTER_TIMEOUT_MS ?? "35000");
  let idx = 0;
  let ok = 0;
  let failed = 0;

  async function workerLoop(workerIdx) {
    const STAGGER = Number(process.env.STAGGER_MS ?? "350");
    await wait(workerIdx * STAGGER);
    let ctx = await createWorkerContext(browser);

    async function resetWorkerContext(reason) {
      console.log(`[yoc_bundle] 🧨 reset worker context (worker${workerIdx + 1}) ${reason ? `(${reason})` : ""}`);
      await closeWorkerContext(ctx).catch(() => {});
      ctx = await createWorkerContext(browser);
    }

    while (true) {
      const myIdx = idx++;
      if (myIdx >= rows.length) break;

      const row = rows[myIdx];
      const va = row.va_norm;
      const label = `worker${workerIdx + 1}/${workers}`;
      let page = null;

      console.log(`[yoc_bundle] 🤖 ${label} → VA ${va} | ${row.naam_mm ?? ""}`);

      try {
        page = await openTabToFighterVerified(browser, ctx, cookies, va, {
          maxAttempts: Number(process.env.TAB_ATTEMPTS ?? "6"),
          softWaitMs: Number(process.env.SOFT_WAIT_MS ?? "900"),
          betweenAttemptsMs: Number(process.env.BETWEEN_ATTEMPTS_MS ?? "450"),
          workerLabel: `[${label}]`,
        });

        if (!page) throw new Error(`Kon fighter niet openen na retries: VA ${va}`);

        const scrape = await withTimeout(
          () => doFullfighter(page, va),
          FULLFIGHTER_TIMEOUT_MS,
          `yoc fullfighter ${va}`,
          async () => {
            await resetWorkerContext(`fullfighter timeout VA ${va}`);
            page = null;
          }
        );

        const fighterRawId = await saveYocRawForRow(row, { ...scrape, yoc_run_id });
        await saveYocContextForRow(row, { ...scrape, yoc_run_id }, fighterRawId);
        ok++;
        console.log(`[yoc_bundle] ✅ saved raw VA ${va} | raw_id=${fighterRawId} | MM=${row.naam_mm ?? ""} | FP=${scrape.header?.naam ?? ""}`);
      } catch (e) {
        const msg = e?.message ?? String(e);

        if (msg === "LOGIN_PAGE") {
          console.log(`[yoc_bundle] 🔐 ${label} LOGIN_PAGE (VA ${va}) → master refresh`);
          try {
            await refreshMasterSessionLocked(`LOGIN_PAGE from ${label} VA ${va}`);
            await resetWorkerContext(`login refresh VA ${va}`);
          } catch (err) {
            console.log("[yoc_bundle] ❌ master refresh failed:", err?.message ?? String(err));
          }
        }

        failed++;
        await saveYocErrorForRow(row, yoc_run_id, msg);
        console.log(`[yoc_bundle] ❌ ${label} fout VA ${va}:`, msg);
      } finally {
        try {
          if (page) {
            await closeAnyModal(page).catch(() => {});
            await hardClosePage(page).catch(() => {});
          }
        } catch {}
      }
    }

    await closeWorkerContext(ctx).catch(() => {});
  }

  try {
    await Promise.all(Array.from({ length: workers }, (_, i) => workerLoop(i)));
  } finally {
    try { await masterPage.close(); } catch {}
    try { await browser.close(); } catch {}
  }

  return { ok, failed, skippedInvalid, total: rows.length + skippedInvalid };
}

const yoc_event_id = (process.argv[2] ?? "").trim();
const yoc_run_id = (process.argv[3] ?? "").trim();
const explicitVaList = process.argv.slice(4).map(normalizeVaStrict).filter(Boolean).map(String);

if (!yoc_event_id) {
  console.error("❌ yoc_event_id ontbreekt");
  process.exit(1);
}

if (!yoc_run_id) {
  console.error("❌ yoc_run_id ontbreekt");
  process.exit(1);
}

const WORKERS = Number(process.env.WORKERS ?? "5");
const workers = Number.isFinite(WORKERS) && WORKERS > 0 ? Math.min(10, Math.max(1, Math.floor(WORKERS))) : 5;

console.log("SCRAPER — YOC_BUNDLE", {
  yoc_event_id,
  yoc_run_id,
  explicit_count: explicitVaList.length,
  workers,
  stagger_ms: Number(process.env.STAGGER_MS ?? "350"),
  tab_attempts: Number(process.env.TAB_ATTEMPTS ?? "6"),
  fullfighter_timeout_ms: Number(process.env.FULLFIGHTER_TIMEOUT_MS ?? "35000"),
  va_sample: explicitVaList.slice(0, 6),
});

runYocBundle(yoc_event_id, yoc_run_id, explicitVaList, workers)
  .then(async (res) => {
    console.log("✅ YOC bundle klaar", res);
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ YOC bundle hard failed:", e?.stack ?? e?.message ?? String(e));
    process.exit(1);
  });
