import { loginFightPassport } from "../utils/loginFightPassport.js";
import { supabase } from "../utils/supabaseClient.js";

export async function scrapeTeamFighter(vaNummer, teamId) {
  console.log("🏫 TEAM SCRAPER – VA:", vaNummer);

  const { browser, page } = await loginFightPassport();

  try {
    await page.goto(`https://fightpassport.nl/#va_vechter/${vaNummer}`, {
      waitUntil: "networkidle2",
    });
    await page.waitForTimeout(1200);

    const info = await page.evaluate(() => {
      const out = {
        naam: "",
        klasse: "",
        licentie: "",
        startverbod: "",
      };

      const tiles = [...document.querySelectorAll(".tile")];

      const detailsTile = tiles.find(t => 
        t.querySelector(".tileHeader")?.innerText.trim().toUpperCase() === "DETAILS"
      );

      if (detailsTile) {
        const ps = [...detailsTile.querySelectorAll("p")];

        for (const p of ps) {
          const txt = p.innerText.toLowerCase();

          if (txt.includes("naam")) out.naam = p.innerText.split(":")[1].trim();
          if (txt.includes("licentie")) out.licentie = txt.includes("ja") ? "Ja" : "Nee";
          if (txt.includes("startverbod")) out.startverbod = "Ja";
        }
      }

      const recordTile = tiles.find(t => 
        t.querySelector(".tileHeader")?.innerText.trim().toUpperCase() === "WEDSTRIJD RECORD"
      );

      if (recordTile) {
        const pList = [...recordTile.querySelectorAll("p")];
        pList.forEach(p => {
          const txt = p.innerText.toLowerCase();
          if (txt.startsWith("w:")) out.record_w = parseInt(txt.split(":")[1]);
          if (txt.startsWith("l:")) out.record_l = parseInt(txt.split(":")[1]);
          if (txt.startsWith("d:")) out.record_d = parseInt(txt.split(":")[1]);
          if (txt.startsWith("o:")) out.record_o = parseInt(txt.split(":")[1]);
        });
      }

      return out;
    });

    // Opslaan in team_fighters tabel
    await supabase.from("team_fighters").upsert(
      {
        team_id: teamId,
        va_nummer: vaNummer,
        ...info,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_id,va_nummer" }
    );

    console.log("✅ Team-fighter opgeslagen");
  } catch (err) {
    console.error("❌ team scraper fout:", err);
  } finally {
    await browser.close();
  }
}

if (process.argv[2] && process.argv[3]) {
  scrapeTeamFighter(process.argv[2], process.argv[3]);
}
