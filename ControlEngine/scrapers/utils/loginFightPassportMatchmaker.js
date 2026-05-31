// scrapers/utils/loginFightPassportMatchmaker.js
// Aparte matchmaker-login. Gebruik deze ALLEEN voor matchmaker scrapers.
// Vereist opts.matchmakerId of FP_MATCHMAKER_ID. Gebruikt apart Chrome-profiel + cookies per matchmaker.

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

// oude/master paden
const MASTER_COOKIES_PATH = path.join(ROOT, "utils", "cookies.json");

// aparte matchmaker profielen/cookies
const FP_PROFILE_BASE_DIR =
  process.env.FP_PROFILE_BASE_DIR || path.join(ROOT, "..", "fightpassport_profiles");

const FP_URL = "https://fightpassport.nl/";
const SYS42_SELECTOR = 'img[src$="logo_header.svg"], img[src*="logo_header.svg"]';

// --------------------------------------------------
// SESSION MODE
// --------------------------------------------------

function cleanMatchmakerId(v) {
  const x = String(v ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x)
    ? x
    : null;
}

function resolveMatchmakerId(opts = {}) {
  const explicit = cleanMatchmakerId(opts.matchmakerId);
  if (explicit) return explicit;

  const envId = cleanMatchmakerId(process.env.FP_MATCHMAKER_ID);
  if (envId) return envId;

  throw new Error("❌ Matchmaker login vereist matchmakerId of FP_MATCHMAKER_ID");
}

function getSessionPaths(matchmakerId) {
  const id = cleanMatchmakerId(matchmakerId);

  if (!id) {
    return {
      mode: "master",
      cookiesPath: MASTER_COOKIES_PATH,
      userDataDir: null,
    };
  }

  const dir = path.join(FP_PROFILE_BASE_DIR, id);
  fs.mkdirSync(dir, { recursive: true });

  return {
    mode: "matchmaker",
    cookiesPath: path.join(dir, "cookies.json"),
    userDataDir: dir,
  };
}

function readMasterLogin(opts = {}) {
  const envUsername = String(opts.username ?? process.env.FP_LOGIN_USERNAME ?? "").trim();
  const envPassword = String(opts.password ?? process.env.FP_LOGIN_PASSWORD ?? "").trim();

  if (envUsername && envPassword) {
    return { username: envUsername, password: envPassword };
  }

  if (!fs.existsSync(LOGIN_PATH)) {
    throw new Error("❌ login_master.json NIET gevonden");
  }

  const login = JSON.parse(fs.readFileSync(LOGIN_PATH, "utf8"));
  const username = String(login?.username ?? "").trim();
  const password = String(login?.password ?? "").trim();

  if (!username || !password) {
    throw new Error("❌ login_master.json mist username/password");
  }

  return { username, password };
}

function resolveUnlockCode(opts = {}) {
  return String(opts.unlockCode ?? opts.unlock_code ?? process.env.FP_LOGIN_UNLOCK_CODE ?? "").trim();
}

function resolveTrustDevice(opts = {}) {
  if (opts.trustDevice === false || opts.trust_device === false) return false;
  if (String(process.env.FP_TRUST_DEVICE ?? "true").toLowerCase() === "false") return false;
  return true;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveUnlockRequestPath(matchmakerId = "") {
  const candidates = [
    path.join(ROOT, "utils", "fp_unlock_request.json"),
  ];

  const id = cleanMatchmakerId(matchmakerId);
  if (id) {
    candidates.unshift(path.join(FP_PROFILE_BASE_DIR, id, "fp_unlock_request.json"));
  }

  return candidates;
}

async function waitForUnlockCodeFromFile(opts = {}, timeoutMs = 10 * 60 * 1000) {
  const matchmakerId = resolveMatchmakerId(opts);
  const paths = resolveUnlockRequestPath(matchmakerId);
  const started = Date.now();

  console.log("🔐 Unlockscherm gevonden. Browser blijft open en wacht op unlockcode uit de UI...");
  console.log("🔐 Unlockcode-bestand:", paths.join(" | "));

  while (Date.now() - started < timeoutMs) {
    for (const unlockPath of paths) {
      try {
        if (!fs.existsSync(unlockPath)) continue;

        const raw = fs.readFileSync(unlockPath, "utf8");
        const data = JSON.parse(raw);
        const code = String(data?.code ?? data?.unlock_code ?? "").trim();

        if (/^\d{7}$/.test(code)) {
          try {
            fs.unlinkSync(unlockPath);
          } catch {}

          console.log("🔐 Unlockcode ontvangen uit UI");
          return code;
        }

        console.log("⚠️ Unlockcode-bestand gevonden, maar code is ongeldig:", unlockPath);
      } catch (e) {
        console.log("⚠️ Unlockcode-bestand kon niet gelezen worden:", e?.message ?? e);
      }
    }

    await sleep(1000);
  }

  throw new Error("UNLOCK_TIMEOUT: Geen unlockcode ontvangen binnen 10 minuten.");
}

async function getUnlockCodeOrWait(opts = {}) {
  const direct = resolveUnlockCode(opts);
  if (/^\d{7}$/.test(direct)) return direct;
  return await waitForUnlockCodeFromFile(opts);
}

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


async function unlockPageVisible(page) {
  // FightPassport kan na login een apparaat/unlock-code pagina tonen.
  // Let op: op die pagina kan het SYS42-logo ook zichtbaar zijn, dus logo alleen is geen bewijs.
  try {
    return await page.evaluate(() => {
      const txt = String(document.body?.innerText || "").toLowerCase();
      const url = String(location.href || "").toLowerCase();
      const hash = String(location.hash || "").toLowerCase();

      const inputs = Array.from(document.querySelectorAll("input"));
      const visibleInputs = inputs.filter((el) => {
        const style = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.opacity !== "0" &&
          r.width > 0 &&
          r.height > 0 &&
          el.offsetParent !== null
        );
      });

      const hasCodeLikeInput = visibleInputs.some((el) => {
        const type = String(el.getAttribute("type") || "").toLowerCase();
        const name = String(el.getAttribute("name") || "").toLowerCase();
        const placeholder = String(el.getAttribute("placeholder") || "").toLowerCase();
        const cls = String(el.getAttribute("class") || "").toLowerCase();
        const maxLength = String(el.getAttribute("maxlength") || "");

        return (
          type === "text" ||
          type === "number" ||
          type === "tel" ||
          name.includes("code") ||
          placeholder.includes("code") ||
          cls.includes("code") ||
          maxLength === "7"
        );
      });

      const hasUnlockText =
        txt.includes("unlock") ||
        txt.includes("apparaat") ||
        txt.includes("device") ||
        txt.includes("vertrouw") ||
        txt.includes("trusted") ||
        txt.includes("registr") ||
        txt.includes("verific") ||
        txt.includes("verification") ||
        txt.includes("e-mail") ||
        txt.includes("email") ||
        txt.includes("code");

      const hasUnlockUrl =
        url.includes("unlock") ||
        url.includes("device") ||
        url.includes("trusted") ||
        url.includes("register") ||
        hash.includes("unlock") ||
        hash.includes("device") ||
        hash.includes("trusted") ||
        hash.includes("register");

      return (hasUnlockText || hasUnlockUrl) && hasCodeLikeInput;
    });
  } catch {
    return false;
  }
}

async function submitUnlockCode(page, unlockCode, trustDevice = true) {
  const code = String(unlockCode ?? "").trim();

  if (!/^\d{7}$/.test(code)) {
    throw new Error("UNLOCK_REQUIRED: FightPassport vraagt om een unlockcode/apparaatcode.");
  }

  const result = await page.evaluate(
    ({ code, trustDevice }) => {
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

      function setNativeValue(el, value) {
        const proto = Object.getPrototypeOf(el);
        const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
        if (descriptor?.set) descriptor.set.call(el, value);
        else el.value = value;

        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }

      // Exacte FightPassport unlock selectors:
      // <input class="veld target_input pincode">
      // <input class="boolean_input checkbox target_input deviceonthouden">
      const codeInput =
        document.querySelector("input.pincode") ||
        document.querySelector("input.target_input.pincode") ||
        document.querySelector("input[class*='pincode']");

      if (!codeInput || !isVisible(codeInput)) {
        return {
          filled: false,
          clicked: false,
          buttonText: "",
          reason: "input.pincode niet gevonden of niet zichtbaar",
        };
      }

      codeInput.focus();
      setNativeValue(codeInput, "");
      setNativeValue(codeInput, code);
      codeInput.blur?.();

      const remember =
        document.querySelector("input.deviceonthouden") ||
        document.querySelector("input.target_input.deviceonthouden") ||
        document.querySelector("input[class*='deviceonthouden']");

      if (trustDevice && remember && isVisible(remember) && !remember.checked) {
        remember.click?.();
        remember.checked = true;
        remember.dispatchEvent(new Event("input", { bubbles: true }));
        remember.dispatchEvent(new Event("change", { bubbles: true }));
      }

      const clickables = Array.from(
        document.querySelectorAll("button, input[type='submit'], input[type='button'], a")
      ).filter(isVisible);

      // Deze pagina gebruikt onderaan letterlijk de knop AANMELDEN.
      const aanmelden =
        clickables.find((el) =>
          String(el.innerText || el.value || el.textContent || "")
            .trim()
            .toLowerCase()
            .includes("aanmelden")
        ) ||
        clickables.find((el) => {
          const txt = String(el.innerText || el.value || el.textContent || "").trim().toLowerCase();
          const cls = String(el.getAttribute("class") || "").toLowerCase();
          return cls.includes("volgende") || txt.includes("volgende") || txt.includes("bevestig");
        });

      if (!aanmelden) {
        codeInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
        codeInput.dispatchEvent(new KeyboardEvent("keypress", { key: "Enter", code: "Enter", bubbles: true }));
        codeInput.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));

        return {
          filled: true,
          clicked: false,
          buttonText: "ENTER",
          reason: "geen AANMELDEN knop gevonden; Enter gestuurd",
        };
      }

      const buttonText = String(aanmelden.innerText || aanmelden.value || aanmelden.textContent || "").trim();
      aanmelden.click?.();

      return {
        filled: true,
        clicked: true,
        buttonText,
        reason: "",
      };
    },
    { code, trustDevice }
  );

  if (!result?.filled) {
    throw new Error(
      "UNLOCK_REQUIRED: FightPassport vraagt om een unlockcode/apparaatcode, maar het pincodeveld is niet gevonden. debug=" +
        JSON.stringify(result ?? {})
    );
  }

  console.log("🔐 Unlockcode ingevuld in input.pincode");
  console.log(`🔐 AANMELDEN geklikt: ${result.clicked ? "true" : "false"} (${result.buttonText || result.reason || "zonder tekst"})`);

  // Na AANMELDEN gaat FightPassport normaal direct naar dashboard, maar cookies/redirect kunnen even duren.
  await page.waitForTimeout(8000);
}

async function waitAfterUnlockSubmit(page, timeoutMs = 70000) {
  console.log("⏳ Wacht op dashboard na unlock/AANMELDEN...");

  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if ((await loggedInDomProof(page)) && !(await unlockPageVisible(page))) {
      console.log("🟢 Dashboard gevonden na unlock");
      await page.waitForTimeout(1200);
      return true;
    }

    try {
      const state = await page.evaluate(() => ({
        url: location.href,
        hash: location.hash,
        hasPincode: !!document.querySelector("input.pincode"),
        hasLogin: !!document.querySelector("input.gebruikersnaam"),
        text: String(document.body?.innerText || "").slice(0, 180),
      }));

      if (state.hasLogin) {
        throw new Error("UNLOCK_FAILED: Na unlock kwam FightPassport terug op de loginpagina. debug=" + JSON.stringify(state));
      }
    } catch (e) {
      if (String(e?.message ?? e).includes("UNLOCK_FAILED")) throw e;
    }

    await page.waitForTimeout(1000);
  }

  const dbg = await page.evaluate(() => ({
    url: location.href,
    hash: location.hash,
    hasPincode: !!document.querySelector("input.pincode"),
    hasLogin: !!document.querySelector("input.gebruikersnaam"),
    text: String(document.body?.innerText || "").slice(0, 700),
    buttons: Array.from(document.querySelectorAll("button, input[type='submit'], input[type='button'], a"))
      .map((el) => String(el.innerText || el.value || el.textContent || "").trim())
      .filter(Boolean)
      .slice(0, 20),
  }));

  throw new Error("UNLOCK_FAILED: Na AANMELDEN is dashboard niet gevonden. debug=" + JSON.stringify(dbg));
}

async function loggedInDomProof(page) {
  // ECHTE dashboard-check.
  // Unlock heeft ook een logo, dus logo_header.svg alleen is nooit bewijs.
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

      // Loginpagina = niet ingelogd
      const loginInput = document.querySelector("input.gebruikersnaam");
      if (loginInput && isVisible(loginInput)) return false;

      // Unlockpagina = niet ingelogd
      const pinInput =
        document.querySelector("input.pincode") ||
        document.querySelector("input.target_input.pincode") ||
        document.querySelector("input[class*='pincode']");
      if (pinInput && isVisible(pinInput)) return false;

      const txt = String(document.body?.innerText || "").toLowerCase();

      // Dashboard is betrouwbaar te herkennen aan afmelden + fightpassport,
      // en GEEN pincode. SYS42 kan soms buiten innerText vallen, dus niet verplicht maken.
      const hasLogout = txt.includes("afmelden");
      const hasFightPassport = txt.includes("fightpassport");

      const hash = String(window.location.hash || "").toLowerCase();
      const isFighterRoute = hash.includes("#va_vechter/");

      return (hasLogout && hasFightPassport) || isFighterRoute;
    });
  } catch {
    return false;
  }
}

async function saveCookies(page, session) {
  try {
    const newCookies = await page.cookies();
    fs.mkdirSync(path.dirname(session.cookiesPath), { recursive: true });
    fs.writeFileSync(session.cookiesPath, JSON.stringify(newCookies, null, 2));
    console.log(`💾 Cookies opgeslagen (${session.mode})`);
  } catch (e) {
    console.log("⚠️ Kon cookies niet opslaan:", e?.message ?? e);
  }
}

async function loadCookiesIfAny(page, session) {
  if (!fs.existsSync(session.cookiesPath)) return false;
  try {
    const cookies = JSON.parse(fs.readFileSync(session.cookiesPath, "utf8"));
    if (!Array.isArray(cookies) || !cookies.length) return false;

    await page.setCookie(...cookies);
    return true;
  } catch (e) {
    console.log("⚠️ Cookies konden niet geladen worden:", e?.message ?? e);
    return false;
  }
}

async function waitForLoggedIn(page, timeoutMs, opts = {}, session = null, saveCookiesToDisk = true) {
  const started = Date.now();
  const unlockCode = resolveUnlockCode(opts);
  const trustDevice = resolveTrustDevice(opts);

  while (Date.now() - started < timeoutMs) {
    if (await unlockPageVisible(page)) {
      const codeToUse = unlockCode || await waitForUnlockCodeFromFile(opts);
      await submitUnlockCode(page, codeToUse, trustDevice);
      return await waitAfterUnlockSubmit(page, Math.max(timeoutMs, 70000));
    }

    if (await loggedInDomProof(page)) {
      await page.waitForTimeout(800);

      if (await unlockPageVisible(page)) {
        const codeToUse = unlockCode || await waitForUnlockCodeFromFile(opts);
        await submitUnlockCode(page, codeToUse, trustDevice);
        return await waitAfterUnlockSubmit(page, Math.max(timeoutMs, 70000));
      }

      return true;
    }

    await page.waitForTimeout(500);
  }

  return false;
}

async function performNormalLogin(page, username, password, timeoutMs, session, saveCookiesToDisk, opts = {}) {
  console.log(`➡️ Normale login… (${session.mode})`);
  await safeGoto(page, FP_URL);
  await safeZoom100(page);

  // wacht tot login form echt zichtbaar is (of al ingelogd)
  const start = Date.now();
  while (Date.now() - start < 60000) {
    if (await unlockPageVisible(page)) {
      const unlockCode = await getUnlockCodeOrWait(opts);
      await submitUnlockCode(page, unlockCode, resolveTrustDevice(opts));
      const okAfterUnlock = await waitAfterUnlockSubmit(page, Math.max(timeoutMs, 70000));
      if (okAfterUnlock) return;
    }
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

  // Dit is bewust exact jouw oude stabiele invulmethode.
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

  const ok = await waitForLoggedIn(page, timeoutMs, opts, session, saveCookiesToDisk);

  if (!ok) {
    const dbg = await page.evaluate(() => ({
      url: location.href,
      hash: location.hash,
      hasLogin: !!document.querySelector("input.gebruikersnaam"),
      hasPassword: !!document.querySelector("input.wachtwoord"),
      koptekst1: document.querySelector(".koptekst1")?.innerText?.slice(0, 120) || "",
    }));
    throw new Error("Login timeout: niet ingelogd binnen timeout. debug=" + JSON.stringify(dbg));
  }

  console.log("🟢 SUCCESVOL ingelogd");
  await page.waitForTimeout(1200);
  await safeZoom100(page);

  if (saveCookiesToDisk) {
    await saveCookies(page, session);
  }
}

async function ensureLoggedInOnPage(page, opts = {}) {
  const {
    force = false,
    saveCookiesToDisk = true,
    timeoutMs = 40000,
  } = opts;

  const matchmakerId = resolveMatchmakerId(opts);
  const session = getSessionPaths(matchmakerId);
  const { username, password } = readMasterLogin(opts);

  async function ensureLoggedInOnce() {
    // 0) open FP (shell trigger)
    await safeGoto(page, FP_URL);
    await safeZoom100(page);

    // 1) al ingelogd?
    if (!force && (await unlockPageVisible(page))) {
      const unlockCode = await getUnlockCodeOrWait(opts);
      await submitUnlockCode(page, unlockCode, resolveTrustDevice(opts));
      await waitAfterUnlockSubmit(page, Math.max(timeoutMs, 70000));
      if (saveCookiesToDisk) await saveCookies(page, session);
      return;
    }
    if (!force && (await loggedInDomProof(page))) return;

    // 2) cookies proberen (tenzij force)
    if (!force) {
      const hadCookies = await loadCookiesIfAny(page, session);
      if (hadCookies) {
        await safeGoto(page, FP_URL);
        await safeZoom100(page);
        if (await unlockPageVisible(page)) {
          const unlockCode = await getUnlockCodeOrWait(opts);
          await submitUnlockCode(page, unlockCode, resolveTrustDevice(opts));
          await waitAfterUnlockSubmit(page, Math.max(timeoutMs, 70000));
          if (saveCookiesToDisk) await saveCookies(page, session);
          return;
        }
        if (await loggedInDomProof(page)) {
          console.log(`✅ Ingelogd via cookies (trusted device, ${session.mode})`);
          return;
        }
        console.log("⚠️ Cookies ongeldig → normale login nodig");
      }
    } else {
      // force: we willen zeker sessie herstellen
      const hadCookies = await loadCookiesIfAny(page, session);
      if (hadCookies) {
        await safeGoto(page, FP_URL);
        await safeZoom100(page);
        if (await unlockPageVisible(page)) {
          const unlockCode = await getUnlockCodeOrWait(opts);
          await submitUnlockCode(page, unlockCode, resolveTrustDevice(opts));
          await waitAfterUnlockSubmit(page, Math.max(timeoutMs, 70000));
          if (saveCookiesToDisk) await saveCookies(page, session);
          return;
        }
        if (await loggedInDomProof(page)) {
          console.log(`✅ Ingelogd via cookies (force, quick restore, ${session.mode})`);
          if (saveCookiesToDisk) await saveCookies(page, session);
          return;
        }
      }
    }

    // 3) normale login
    await performNormalLogin(page, username, password, timeoutMs, session, saveCookiesToDisk, opts);
  }

  // 2 pogingen
  try {
    await ensureLoggedInOnce();
  } catch (e1) {
    const msg = String(e1?.message ?? e1);
    if (msg.includes("UNLOCK_REQUIRED") || msg.includes("UNLOCK_FAILED")) {
      throw e1;
    }

    console.log("⚠️ Login poging 1 faalde, retry met reload…", e1?.message ?? e1);
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
    } catch {}
    await ensureLoggedInOnce();
  }

  // harde check
  if (await unlockPageVisible(page)) {
    const unlockCode = await getUnlockCodeOrWait(opts);
    await submitUnlockCode(page, unlockCode, resolveTrustDevice(opts));
    await waitAfterUnlockSubmit(page, Math.max(timeoutMs, 70000));
    if (saveCookiesToDisk) await saveCookies(page, session);
  }

  if (!(await loggedInDomProof(page))) {
    throw new Error("loginFightPassport eindigde zonder ingelogd bewijs (hard stop)");
  }

  if (saveCookiesToDisk) {
    await saveCookies(page, session);
  }

  return true;
}

// --------------------------------------------------
// EXPORT ensureLoggedIn(page)
// --------------------------------------------------
export async function ensureLoggedIn(page, opts = {}) {
  return ensureLoggedInOnPage(page, opts);
}

// --------------------------------------------------
// HOOFDLOGIN
// --------------------------------------------------
export async function loginFightPassport(opts = {}) {
  const matchmakerId = resolveMatchmakerId(opts);
  const session = getSessionPaths(matchmakerId);

  const launchOptions = {
    headless: String(process.env.PUPPETEER_HEADLESS ?? process.env.HEADLESS ?? "true").toLowerCase() === "true" ? true : false,
    defaultViewport: null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1600,1000",
      "--force-device-scale-factor=1",
    ],
  };

  // Master blijft zoals je oude versie: geen userDataDir.
  // Matchmaker krijgt wel eigen Chrome-profiel.
  if (session.userDataDir) {
    launchOptions.userDataDir = session.userDataDir;
  }

  console.log(`🔑 FightPassport login mode: ${session.mode}${matchmakerId ? ` (${matchmakerId})` : ""}`);

  const browser = await puppeteer.launch(launchOptions);

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });

  // Stap 2 van koppelen: NIET opnieuw inloggen, want dan stuurt FightPassport
  // direct een nieuwe unlockmail. Alleen bestaande profielsessie openen,
  // pincode invullen, device onthouden aanvinken en AANMELDEN klikken.
  if (opts.unlockOnly === true || process.env.FP_UNLOCK_ONLY === "true") {
    const unlockCode = await getUnlockCodeOrWait(opts);

    await safeGoto(page, FP_URL);
    await safeZoom100(page);

    if (!(await unlockPageVisible(page))) {
      const state = await page.evaluate(() => ({
        url: location.href,
        hash: location.hash,
        hasPincode: !!document.querySelector("input.pincode"),
        hasLogin: !!document.querySelector("input.gebruikersnaam"),
        text: String(document.body?.innerText || "").slice(0, 500),
      }));
      throw new Error(
        "UNLOCK_FAILED: Unlockcode ontvangen, maar het bestaande unlockscherm is niet gevonden. Start niet opnieuw inloggen, want dan komt er een nieuwe code. debug=" +
          JSON.stringify(state)
      );
    }

    await submitUnlockCode(page, unlockCode, resolveTrustDevice(opts));
    await waitAfterUnlockSubmit(page, opts.timeoutMs ?? 90000);

    if (opts.saveCookiesToDisk !== false) {
      await saveCookies(page, session);
    }

    return { browser, page };
  }

  await ensureLoggedInOnPage(page, {
    ...opts,
    timeoutMs: opts.timeoutMs ?? 90000,
  });

  return { browser, page };
}
