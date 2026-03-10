// scrapers/utils/loginStore.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

const CONFIG_DIR = path.resolve(process.cwd(), "scrapers", "config");
const MATCHMAKER_FILE = path.join(CONFIG_DIR, "login_matchmakers.enc");

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/** 🔑 Maak sleutel op basis van geheim */
function deriveKey(secret) {
  if (!secret) throw new Error("❌ MATCHMAKER_SECRET ontbreekt in .env");
  return crypto.scryptSync(secret, "matchcontrol_salt_v1", 32);
}

/** 🧩 Helper om veilig JSON te schrijven */
function safeWriteFile(filePath, content) {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, filePath);
}

/** 🧷 Data versleutelen en opslaan */
export function saveEncrypted(dataObj, secret) {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });

  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(secret);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH });

  const plaintext = Buffer.from(JSON.stringify(dataObj), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const out = Buffer.concat([iv, tag, encrypted]).toString("base64");
  safeWriteFile(MATCHMAKER_FILE, out);
  return true;
}

/** 🗝️ Gegevens ontsleutelen */
export function loadEncrypted(secret) {
  try {
    if (!fs.existsSync(MATCHMAKER_FILE)) return { accounts: [] };

    const raw = fs.readFileSync(MATCHMAKER_FILE, "utf8");
    if (!raw) return { accounts: [] };

    const data = Buffer.from(raw, "base64");
    const iv = data.slice(0, IV_LENGTH);
    const tag = data.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = data.slice(IV_LENGTH + TAG_LENGTH);

    const key = deriveKey(secret);
    const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch (err) {
    console.error("⚠️ Kan login_matchmakers.enc niet ontsleutelen:", err.message);
    return { accounts: [] };
  }
}

/** ➕ Account toevoegen of bijwerken */
export function addMatchmakerAccount(account, secret) {
  const data = loadEncrypted(secret);
  data.accounts = data.accounts || [];

  const existing = data.accounts.find((a) => a.username === account.username);
  if (existing) {
    existing.password = account.password;
    existing.updated_at = new Date().toISOString();
    console.log(`♻️ Account bijgewerkt: ${account.username}`);
  } else {
    data.accounts.push({
      username: account.username,
      password: account.password,
      created_at: new Date().toISOString(),
    });
    console.log(`💾 Nieuw account toegevoegd: ${account.username}`);
  }

  saveEncrypted(data, secret);
  return true;
}

/** 📜 Alle accounts ophalen */
export function getMatchmakerAccounts(secret) {
  const data = loadEncrypted(secret);
  return data.accounts || [];
}

/** ❌ Account verwijderen */
export function removeMatchmakerAccount(username, secret) {
  const data = loadEncrypted(secret);
  const before = data.accounts.length;
  data.accounts = data.accounts.filter((a) => a.username !== username);
  saveEncrypted(data, secret);
  console.log(`🗑️ Verwijderd: ${username} (${before - data.accounts.length} verwijderd)`);
  return true;
}

/** 🧹 Verwijder alle opgeslagen accounts */
export function clearAllMatchmakers(secret) {
  saveEncrypted({ accounts: [] }, secret);
  console.log("🧼 Alle matchmaker logins gewist.");
}
