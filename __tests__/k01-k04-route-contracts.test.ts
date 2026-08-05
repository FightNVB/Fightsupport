import fs from "node:fs";
import path from "node:path";

const matchmakingRoutes = [
  "app/api/matchmaker/[matchmakingid]/route.ts",
  "app/api/matchmaker/[matchmakingid]/uitslagen/route.ts",
  "app/api/rapport/excel/route.ts",
  "app/api/rapport/lineup/route.ts",
  "app/api/rapport/official-excel/route.ts",
  "app/api/rapport/voorlopige-lineup-excel/route.ts",
  "app/api/rapport/sportdata-csv/route.ts",
  "app/api/rapport/matchmaker-gecontroleerde-aanmeldingen-excel/route.ts",
  "app/api/admin/uitslagen/export/route.ts",
  "app/api/officials/uitslagen/export/route.ts",
];

const adminRoutes = [
  "app/api/yoc/upload/route.ts",
  "app/api/yoc/delete-event/route.ts",
  "app/api/yoc/[yocId]/correct/route.ts",
  "app/api/yoc/[yocId]/excel/route.ts",
  "app/api/yoc/[yocId]/report/route.ts",
  "app/api/yoc/[yocId]/resultaten/[resultaatId]/review/route.ts",
  "app/api/yoc/[yocId]/rules/route.ts",
  "app/api/yoc/[yocId]/scrape/fighter/route.ts",
  "app/api/yoc/[yocId]/scrape/start/route.ts",
  "app/api/yoc/[yocId]/scrape/status/route.ts",
  "app/api/fightpassport/unlock/route.ts",
  "app/api/fightpassport/session/route.ts",
];

function source(file: string) { return fs.readFileSync(path.join(process.cwd(), file), "utf8"); }
function firstPrivilegedIndex(text: string) {
  return [text.indexOf(".from("), text.indexOf("spawn("), text.indexOf("writeJsonFile("), text.indexOf("readJsonFile(")]
    .filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? Number.MAX_SAFE_INTEGER;
}

describe.each(matchmakingRoutes)("matchmaking security contract: %s", (file) => {
  it("authenticates and checks object access before the first privileged action", () => {
    const text = source(file);
    const handler = text.indexOf("async function handleExport") >= 0 ? text.indexOf("async function handleExport") : text.indexOf("export async");
    const guard = text.indexOf("requireMatchmakingAccess(", handler);
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(firstPrivilegedIndex(text.slice(handler)) + handler);
  });
});

describe.each(adminRoutes)("admin security contract: %s", (file) => {
  it("requires central admin authorization before query, filesystem or child process", () => {
    const text = source(file);
    const handler = text.indexOf("export async");
    const body = text.slice(handler);
    const guard = body.indexOf("requireAdminAccess(");
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(firstPrivilegedIndex(body));
  });
});

describe("sensitive response caching", () => {
  it.each([...matchmakingRoutes, ...adminRoutes].filter((file) => /route\.ts$/.test(file)))("%s does not declare public caching", (file) => {
    expect(source(file)).not.toMatch(/Cache-Control[\s\S]{0,40}["'`]public/i);
  });

  it.each(matchmakingRoutes.filter((file) => file.includes("rapport/") || file.includes("export/")))("%s marks exports private/no-store", (file) => {
    expect(source(file)).toMatch(/PRIVATE_NO_STORE|private, no-store/);
  });
});
