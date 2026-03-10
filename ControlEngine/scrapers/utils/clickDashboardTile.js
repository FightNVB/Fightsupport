/**
 * Klikt op een tegel op het FIGHTPASSPORT dashboard.
 * Werkt op basis van class "tileHeader enabled".
 */
async function clickDashboardTile(page, label) {
  const wanted = label.trim().toUpperCase();

  const found = await page.waitForFunction(
    (wanted) => {
      const headers = Array.from(document.querySelectorAll(".tileHeader.enabled"));
      const el = headers.find(h =>
        (h.textContent || "").trim().toUpperCase() === wanted
      );

      if (!el) return false;

      el.click();
      return true;
    },
    { timeout: 15000 },
    wanted
  );

  if (!found) {
    throw new Error(`Kon tegel "${label}" niet vinden op dashboard.`);
  }

  // Laat de pagina laden
  await new Promise(res => setTimeout(res, 1500));
}
