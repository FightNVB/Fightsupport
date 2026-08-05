import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

function routeFiles(directory: string): string[] {
  const absolute = path.join(root, directory);
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    return entry.isDirectory() ? routeFiles(relative) : entry.name === "route.ts" ? [relative] : [];
  });
}

function expectEveryHandlerGuarded(file: string, guard: string) {
  const source = read(file);
  const handlers = [...source.matchAll(/export async function (GET|POST|PATCH|DELETE)\b/g)];
  expect(handlers.length).toBeGreaterThan(0);
  for (const handler of handlers) {
    const start = handler.index! + handler[0].length;
    const nextHandler = source.slice(start).search(/export async function (GET|POST|PATCH|DELETE)\s*\(/);
    const body = source.slice(start, nextHandler < 0 ? undefined : start + nextHandler);
    const guardAt = body.indexOf(guard);
    const elevatedAt = Math.min(
      ...[".from(", ".storage.", ".auth.admin.", "writeFile", "spawn("]
        .map((needle) => body.indexOf(needle))
        .filter((index) => index >= 0),
    );
    expect(guardAt).toBeGreaterThanOrEqual(0);
    if (Number.isFinite(elevatedAt)) expect(guardAt).toBeLessThan(elevatedAt);
  }
}

describe("second security patch route contracts", () => {
  test.each([
    ...routeFiles("app/api/admin/discipline"),
    ...routeFiles("app/api/admin/beheer/talentstatus").filter((file) => read(file).includes("export async function")),
  ])("%s requires admin before elevated work", (file) => {
    expectEveryHandlerGuarded(file, "requireAdmin(");
  });

  test.each([
    "app/api/admin/algemeen/matchmakings/route.ts",
    "app/api/admin/algemeen/minpunten-analyse/route.ts",
    "app/api/admin/algemeen/afmeldingen-rapport/route.ts",
    "app/api/admin/algemeen/afmeldingen/get/route.ts",
    "app/api/admin/sportscholen/fightcrew/route.ts",
  ])("%s requires admin before elevated work", (file) => {
    expectEveryHandlerGuarded(file, "requireAdmin(");
  });

  test("afmelding detail guards every method", () => {
    const source = read("app/api/admin/algemeen/afmeldingen/[id]/route.ts");
    expect(source).toMatch(/export async function GET[\s\S]*?requireAdmin\(req\)/);
    expect(source).toMatch(/export async function DELETE[\s\S]*?requireAdmin\(req\)/);
    expect(source).toMatch(/export async function POST[\s\S]*?return DELETE\(req, ctx\)/);
  });

  test.each([
    "app/api/officials/bout/set-sportschool/route.ts",
    "app/api/control-engine/run-rules/route.ts",
    "app/api/matchmaker/build-context/route.ts",
    "app/api/matchmaker/afmelden/route.ts",
    "app/api/matchmaker/[matchmakingid]/match-check/route.ts",
  ])("%s authorizes the matchmaking before elevated work", (file) => {
    const source = read(file);
    const roleGuard = source.indexOf("requireUserWithRole(");
    const objectGuard = source.indexOf("assertCanAccessMatchmaking(", roleGuard);
    const elevated = Math.min(
      ...[".from(", "processMatchmakingFighters({", "rulesEngine({", "loadFighterFromDb("]
        .map((needle) => source.indexOf(needle, objectGuard))
        .filter((index) => index >= 0),
    );
    expect(roleGuard).toBeGreaterThanOrEqual(0);
    expect(objectGuard).toBeGreaterThan(roleGuard);
    if (Number.isFinite(elevated)) expect(objectGuard).toBeLessThan(elevated);
  });

  test("sensitive route families receive private no-store headers", () => {
    const config = read("next.config.mjs");
    expect(config).toContain('/api/admin/discipline/:path*');
    expect(config).toContain('/api/admin/beheer/talentstatus/:path*');
    expect(config).toContain('value: "private, no-store"');
    expect(config).toContain('key: "Pragma"');
    expect(config).toContain('value: "no-cache"');
  });
});
