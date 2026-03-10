import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import pRetry from "p-retry";

puppeteer.use(StealthPlugin());

export async function launchBrowser({ headless = true } = {}) {
  // launch argumenten geoptimaliseerd voor snelheid + stabiel draaien
  const browser = await puppeteer.launch({
    headless: headless === "false" ? false : headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",
      "--disable-background-networking",
      "--window-size=1366,768",
    ],
    defaultViewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();

  // realistische user-agent
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  // blokkeren van afbeeldingen, fonts, stylesheets -> sneller
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const blocked = ["image", "font", "stylesheet", "media"];
    if (blocked.includes(req.resourceType())) req.abort();
    else req.continue();
  });

  // kortere helper-waits kunnen onderdeel zijn van util
  page.setDefaultTimeout(30000);

  return { browser, page };
}

// retry wrapper voor stabielere launch (optioneel)
export async function launchWithRetry(opts = {}) {
  return pRetry(() => launchBrowser(opts), {
    retries: 2,
    onFailedAttempt: (err) =>
      console.warn(`Launch poging ${err.attemptNumber} mislukt. Nog ${err.retriesLeft} pogingen.`),
  });
}
