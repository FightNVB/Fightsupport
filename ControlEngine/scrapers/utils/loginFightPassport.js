// scrapers/utils/loginFightPassport.js
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ROOT = scrapers/
const ROOT = path.resolve(__dirname, "..");

const LOGIN_PATH = path.join(ROOT, "config", "login_master.json");
const COOKIES_PATH = path.join(ROOT, "utils", "cookies.json");
const SESSION_STATE_PATH = path.join(ROOT, "utils", "fp_session_state.json");

const FP_URL = "https://fightpassport.nl/";

const SYS42_SELECTOR = 'img[src$="logo_header.svg"], img[src*="logo_header.svg"]';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


function writeFpSessionState(status, message, extra = {}) {
  try {
    const payload = {
      status,
      message,
      updated_at: new Date().toISOString(),
      needs_unlock: status === "unlock_required",
      ...extra,
    };

    if (status !== "unlock_required") {
      payload.last_unlock_required_at = null;
    }

    fs.writeFileSync(SESSION_STATE_PATH, JSON.stringify(payload, null, 2), "utf8");
  } catch (e) {
    console.log("⚠️ Kon fp_session_state.json niet bijwerken:", e?.message ?? e);
  }
}

function markFightPassportReady(message = "FightPassport sessie is actief.") {
  writeFpSessionState("ready", message, {
    needs_unlock: false,
    browser_url: null,
  });
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------
async function safeGoto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(300);
}

async function safeZoom100(page) {
  try {
    await page.waitForSelector("body", { timeout: 15000 });
    await page.evaluate(() => {
      document.body.style.zoom = "100%";
      window.scrollTo(0, 0);
    });
  } catch {}
}

async function loginFormVisible(page) {
  // BELANGRIJK: check op ZICHTBAARHEID (DOM-only geeft false positives)
  try {
    return await page.evaluate(() => {
      const el = document.querySelector("input.gebruikersnaam");
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const visible =
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        r.width > 0 &&
        r.height > 0 &&
        el.offsetParent !== null;
      return visible;
    });
  } catch {
    return false;
  }
}

async function loggedInDomProof(page) {
  // ECHTE dashboard-check.
  // Let op: het unlockscherm heeft ook een logo, dus logo_header.svg/SYS42 image alleen is GEEN bewijs.
  try {
    return await page.evaluate(() => {
      function isVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          r.width > 0 &&
          r.height > 0
        );
      }

      const loginInput = document.querySelector("input.gebruikersnaam");
      if (loginInput && isVisible(loginInput)) return false;

      const pinInput =
        document.querySelector("input.pincode") ||
        document.querySelector("input.target_input.pincode") ||
        document.querySelector("input[class*='pincode']");
      if (pinInput && isVisible(pinInput)) return false;

      const txt = String(document.body?.innerText || "").toLowerCase();

      const hasDashboardText = txt.includes("fightpassport") && txt.includes("afmelden");

      const hash = String(window.location.hash || "").toLowerCase();
      const isFighterRoute = hash.includes("#va_vechter/");

      return hasDashboardText || isFighterRoute;
    });
  } catch {
    return false;
  }
}

async function saveCookies(page) {
  try {
    const newCookies = await page.cookies();
    fs.writeFileSync(COOKIES_PATH, JSON.stringify(newCookies, null, 2));
    console.log("💾 Cookies opgeslagen");
  } catch (e) {
    console.log("⚠️ Kon cookies niet opslaan:", e?.message ?? e);
  }
}

async function loadCookiesIfAny(page) {
  if (!fs.existsSync(COOKIES_PATH)) return false;
  try {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, "utf8"));
    if (!Array.isArray(cookies) || !cookies.length) return false;

    await page.setCookie(...cookies);
    return true;
  } catch (e) {
    console.log("⚠️ Cookies konden niet geladen worden:", e?.message ?? e);
    return false;
  }
}


async function dashboardReady(page, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const ok = await page.evaluate(() => {
        const hasTiles = document.querySelectorAll(".tileHeader.enabled").length > 0;
        const hasDashboard = !!document.querySelector(".dashboard");
        const txt = String(document.body?.innerText || "").toLowerCase();
        return hasTiles || hasDashboard || txt.includes("dashboard");
      });
      if (ok) return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

async function clearBrowserCookiesOnly(page) {
  try {
    const cookies = await page.cookies();
    if (cookies.length) await page.deleteCookie(...cookies);
    console.log("🧹 Browser-cookies gewist voor deze sessie; cookies.json blijft bewaard");
  } catch (e) {
    console.log("⚠️ Browser-cookies konden niet gewist worden:", e?.message ?? e);
  }
}

// --------------------------------------------------
// ✅ NIEUW: EXPORT ensureLoggedIn(page)
// --------------------------------------------------
// Doel: masterPage opnieuw inloggen (zelfde browser) wanneer een worker LOGIN_PAGE ziet.
// - gebruikt exact jouw DOM-proof + cookies flow
// - force=true: altijd login proberen (handig als sessie verlopen is)
// - saveCookies=true: update cookies.json na (her)login
export async function ensureLoggedIn(page, opts = {}) {
  const {
    force = false,
    saveCookiesToDisk = true,
    timeoutMs = 40000,
  } = opts;

  if (!fs.existsSync(LOGIN_PATH)) {
    throw new Error("❌ login_master.json NIET gevonden");
  }

  const login = JSON.parse(fs.readFileSync(LOGIN_PATH, "utf8"));
  const { username, password } = login;

  async function ensureLoggedInOnce() {
    // 0) open FP (shell trigger)
    await safeGoto(page, FP_URL);
    await safeZoom100(page);

    // 1) al ingelogd?
    if (!force && (await loggedInDomProof(page))) {
      markFightPassportReady("FightPassport was al ingelogd.");
      return;
    }

    // 2) cookies proberen (tenzij force)
    if (!force) {
      const hadCookies = await loadCookiesIfAny(page);
      if (hadCookies) {
        await safeGoto(page, FP_URL);
        await safeZoom100(page);
        if (await loggedInDomProof(page)) {
          console.log("✅ Ingelogd via cookies (trusted device)");
          markFightPassportReady("Ingelogd via cookies (trusted device).");
          return;
        }
        console.log("⚠️ Cookies ongeldig → normale login nodig");
      }
    } else {
      // force: we willen zeker sessie herstellen
      // we kunnen wél eerst cookies proberen (kan sneller), maar als dat faalt gaan we door
      const hadCookies = await loadCookiesIfAny(page);
      if (hadCookies) {
        await safeGoto(page, FP_URL);
        await safeZoom100(page);
        if (await loggedInDomProof(page)) {
          console.log("✅ Ingelogd via cookies (force, quick restore)");
          markFightPassportReady("Ingelogd via cookies (force quick restore).");
          if (saveCookiesToDisk) await saveCookies(page);
          return;
        }
      }
    }

    // 3) normale login
    console.log("➡️ Normale login…");
    await safeGoto(page, FP_URL);
    await safeZoom100(page);

    // wacht tot login form echt zichtbaar is (of al ingelogd)
    const start = Date.now();
    while (Date.now() - start < 60000) {
      if (await loggedInDomProof(page)) {
        console.log("✅ Al ingelogd (na redirect)");
        markFightPassportReady("Al ingelogd na redirect.");
        return;
      }
      if (await loginFormVisible(page)) break;
      await sleep(250);
    }

    if (!(await loginFormVisible(page)) && !(await loggedInDomProof(page))) {
      throw new Error("Login form niet zichtbaar en ook niet ingelogd (onbekende FP state)");
    }

    // invullen + klik
    await page.evaluate(
      (u, p) => {
        const user = document.querySelector("input.gebruikersnaam");
        const pass = document.querySelector("input.wachtwoord");
        const btn = document.querySelector("button.volgende");

        if (user) {
          user.focus();
          user.value = "";
          user.dispatchEvent(new Event("input", { bubbles: true }));
          user.value = u;
          user.dispatchEvent(new Event("input", { bubbles: true }));
        }

        if (pass) {
          pass.focus();
          pass.value = "";
          pass.dispatchEvent(new Event("input", { bubbles: true }));
          pass.value = p;
          pass.dispatchEvent(new Event("input", { bubbles: true }));
        }

        btn?.click?.();
      },
      username,
      password
    );

    console.log("➡️ Login verzonden…");

    // wacht op DOM proof
    const ok = await page
      .waitForFunction(
        (SYS42_SELECTOR) => {
          const loginInput = document.querySelector("input.gebruikersnaam");
          if (loginInput) {
            const style = window.getComputedStyle(loginInput);
            const r = loginInput.getBoundingClientRect();
            const visible =
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              style.opacity !== "0" &&
              r.width > 0 &&
              r.height > 0 &&
              loginInput.offsetParent !== null;
            if (visible) return false;
          }

          if (document.querySelector(SYS42_SELECTOR)) return true;

          const hash = window.location.hash || "";
          if (hash.includes("#va_vechter/")) return true;

          return false;
        },
        { timeout: timeoutMs },
        SYS42_SELECTOR
      )
      .then(() => true)
      .catch(() => false);

    if (!ok) {
      const dbg = await page.evaluate(() => ({
        url: location.href,
        hash: location.hash,
        hasLogin: !!document.querySelector("input.gebruikersnaam"),
        koptekst1: document.querySelector(".koptekst1")?.innerText?.slice(0, 120) || "",
      }));
      throw new Error("Login timeout: niet ingelogd binnen timeout. debug=" + JSON.stringify(dbg));
    }

    console.log("🟢 SUCCESVOL ingelogd");
    markFightPassportReady("Succesvol ingelogd.");
    await sleep(1200);
    await safeZoom100(page);

    if (saveCookiesToDisk) {
      await saveCookies(page);
    }
  }

  // 2 pogingen (zelfde als jouw loginFightPassport)
  try {
    await ensureLoggedInOnce();
  } catch (e1) {
    console.log("⚠️ ensureLoggedIn poging 1 faalde, retry met reload…", e1?.message ?? e1);
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
    } catch {}
    await ensureLoggedInOnce();
  }

  // harde check
  if (!(await loggedInDomProof(page))) {
    throw new Error("ensureLoggedIn eindigde zonder ingelogd bewijs (hard stop)");
  }

  markFightPassportReady("ensureLoggedIn afgerond.");
  return true;
}

// --------------------------------------------------
// HOOFDLOGIN (ongewijzigd gedrag)
// --------------------------------------------------
export async function loginFightPassport() {
  if (!fs.existsSync(LOGIN_PATH)) {
    throw new Error("❌ login_master.json NIET gevonden");
  }

  const login = JSON.parse(fs.readFileSync(LOGIN_PATH, "utf8"));
  const { username, password } = login;

  const browser = await puppeteer.launch({
    headless: String(process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "false").toLowerCase() === "true" ? true : false,
    defaultViewport: null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1600,1000",
      "--force-device-scale-factor=1",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });

  async function ensureLoggedInOnce() {
    // 0) open FP
    await safeGoto(page, FP_URL);
    await safeZoom100(page);

    // 1) al ingelogd?
    if (await loggedInDomProof(page)) {
      markFightPassportReady("FightPassport was al ingelogd.");
      return;
    }

    // 2) cookies proberen
    const hadCookies = await loadCookiesIfAny(page);
    if (hadCookies) {
      await safeGoto(page, FP_URL);
      await safeZoom100(page);

      if (await loginFormVisible(page)) {
        console.log("⚠️ Cookies aanwezig, maar loginpagina staat open → normale login nodig");
      } else if (await loggedInDomProof(page)) {
        const dashOk = await dashboardReady(page, 12000);
        if (dashOk) {
          console.log("✅ Ingelogd via cookies (trusted device)");
          markFightPassportReady("Ingelogd via cookies (trusted device).");
          return;
        }

        console.log("⚠️ Cookies lijken geldig, maar dashboard is niet gevonden → opnieuw master-login uitvoeren");
        await clearBrowserCookiesOnly(page);
      } else {
        console.log("⚠️ Cookies ongeldig → normale login nodig");
      }
    }

    // 3) normale login
    console.log("➡️ Normale login…");
    await safeGoto(page, FP_URL);
    await safeZoom100(page);

    // wacht tot login form echt zichtbaar is (of al ingelogd)
    const start = Date.now();
    while (Date.now() - start < 60000) {
      if (await loggedInDomProof(page)) {
        console.log("✅ Al ingelogd (na redirect)");
        markFightPassportReady("Al ingelogd na redirect.");
        return;
      }
      if (await loginFormVisible(page)) break;
      await sleep(250);
    }

    if (!(await loginFormVisible(page)) && !(await loggedInDomProof(page))) {
      throw new Error("Login form niet zichtbaar en ook niet ingelogd (onbekende FP state)");
    }

    // invullen + klik
    await page.evaluate(
      (u, p) => {
        const user = document.querySelector("input.gebruikersnaam");
        const pass = document.querySelector("input.wachtwoord");
        const btn = document.querySelector("button.volgende");

        if (user) {
          user.focus();
          user.value = "";
          user.dispatchEvent(new Event("input", { bubbles: true }));
          user.value = u;
          user.dispatchEvent(new Event("input", { bubbles: true }));
        }

        if (pass) {
          pass.focus();
          pass.value = "";
          pass.dispatchEvent(new Event("input", { bubbles: true }));
          pass.value = p;
          pass.dispatchEvent(new Event("input", { bubbles: true }));
        }

        btn?.click?.();
      },
      username,
      password
    );

    console.log("➡️ Login verzonden…");

    const ok = await page
      .waitForFunction(
        (SYS42_SELECTOR) => {
          const loginInput = document.querySelector("input.gebruikersnaam");
          if (loginInput) {
            const style = window.getComputedStyle(loginInput);
            const r = loginInput.getBoundingClientRect();
            const visible =
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              style.opacity !== "0" &&
              r.width > 0 &&
              r.height > 0 &&
              loginInput.offsetParent !== null;
            if (visible) return false;
          }

          if (document.querySelector(SYS42_SELECTOR)) return true;

          const hash = window.location.hash || "";
          if (hash.includes("#va_vechter/")) return true;

          return false;
        },
        { timeout: 90000 },
        SYS42_SELECTOR
      )
      .then(() => true)
      .catch(() => false);

    if (!ok) {
      const dbg = await page.evaluate(() => ({
        url: location.href,
        hash: location.hash,
        hasLogin: !!document.querySelector("input.gebruikersnaam"),
        koptekst1: document.querySelector(".koptekst1")?.innerText?.slice(0, 120) || "",
      }));
      throw new Error("Login timeout: niet ingelogd binnen 90s. debug=" + JSON.stringify(dbg));
    }

    console.log("🟢 SUCCESVOL ingelogd");
    markFightPassportReady("Succesvol ingelogd.");
    await sleep(1200);
    await safeZoom100(page);

    const dashOkAfterLogin = await dashboardReady(page, 15000);
    if (!dashOkAfterLogin) {
      console.log("⚠️ Ingelogd, maar dashboard nog niet gevonden. Scraper probeert alsnog verder.");
    }

    await saveCookies(page);
  }

  // 2 pogingen
  try {
    await ensureLoggedInOnce();
  } catch (e1) {
    console.log("⚠️ Login poging 1 faalde, retry met reload…", e1?.message ?? e1);
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
    } catch {}
    await ensureLoggedInOnce();
  }

  // laatste check
  if (!(await loggedInDomProof(page))) {
    throw new Error("loginFightPassport eindigde zonder ingelogd bewijs (hard stop)");
  }

  markFightPassportReady("loginFightPassport afgerond.");
  return { browser, page };
}
