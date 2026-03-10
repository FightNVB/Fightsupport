// scrapers/bin/add_matchmaker.js
import { addMatchmakerAccount } from "../utils/loginStore.js";
import readline from "readline";
import dotenv from "dotenv";
dotenv.config();

function vraag(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(prompt, (a) => { rl.close(); res(a.trim()); }));
}

(async () => {
  const secret = process.env.MATCHMAKER_SECRET;
  if (!secret) return console.error("MATCHMAKER_SECRET ontbreekt in .env");

  const user = await vraag("Matchmaker gebruikersnaam: ");
  const pass = await vraag("Matchmaker wachtwoord: ");
  addMatchmakerAccount({ username: user, password: pass }, secret);
  console.log("✅ Matchmaker toegevoegd en versleuteld opgeslagen.");
})();
