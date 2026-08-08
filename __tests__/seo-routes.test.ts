import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("SEO route isolation", () => {
  test("sitemap only contains indexable public pages", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://fightsupport.nl/");
    expect(urls).not.toContain("https://fightsupport.nl/login");
    expect(urls.some((url) => /dashboard|api|token|doping|openbare-matchmaking/.test(url))).toBe(false);
    expect(entries.every((entry) => entry.lastModified && !Number.isNaN(new Date(entry.lastModified).valueOf()))).toBe(true);
  });

  test("robots points at the sitemap and blocks sensitive route groups", () => {
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];

    expect(result.sitemap).toBe("https://fightsupport.nl/sitemap.xml");
    expect(disallow).toEqual(expect.arrayContaining(["/api", "/dashboard", "/login", "/doping"]));
  });
});
