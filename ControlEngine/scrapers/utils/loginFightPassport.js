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

const FP_URL = "https://fightpassport.nl/";

const SYS42_SELECTOR = 'img[src$="logo_header.svg"], img[src*="logo_header.svg"]';

// --------------------------------------------------
// HELPERS
// --------------------------------------------------
async function safeGoto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(300);
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
  // “Hard proof” dat we in de FP shell zitten en NIET op login
  try {
    return await page.evaluate((SYS42_SELECTOR) => {
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

      // SYS42 logo in header = je zit in FP shell (ingelogd UI)
      const sys = document.querySelector(SYS42_SELECTOR);
      if (sys) return true;

      // of we zitten al op een vechter-route
      const hash = window.location.hash || "";
      if (hash.includes("#va_vechter/")) return true;

      return false;
    }, SYS42_SELECTOR);
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
    if (!force && (await loggedInDomProof(page))) return;

    // 2) cookies proberen (tenzij force)
    if (!force) {
      const hadCookies = await loadCookiesIfAny(page);
      if (hadCookies) {
        await safeGoto(page, FP_URL);
        await safeZoom100(page);
        if (await loggedInDomProof(page)) {
          console.log("✅ Ingelogd via cookies (trusted device)");
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
        return;
      }
      if (await loginFormVisible(page)) break;
      await page.waitForTimeout(250);
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
    await page.waitForTimeout(1200);
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
    headless: false,
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
    if (await loggedInDomProof(page)) return;

    // 2) cookies proberen
    const hadCookies = await loadCookiesIfAny(page);
    if (hadCookies) {
      await safeGoto(page, FP_URL);
      await safeZoom100(page);
      if (await loggedInDomProof(page)) {
        console.log("✅ Ingelogd via cookies (trusted device)");
        return;
      }
      console.log("⚠️ Cookies ongeldig → normale login nodig");
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
        return;
      }
      if (await loginFormVisible(page)) break;
      await page.waitForTimeout(250);
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
    await page.waitForTimeout(1200);
    await safeZoom100(page);

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

  return { browser, page };
}
