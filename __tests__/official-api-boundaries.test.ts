import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

function filesBelow(relative: string): string[] {
  const absolute = path.join(process.cwd(), relative);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relative, entry.name);
    return entry.isDirectory() ? filesBelow(child) : [child];
  });
}

describe("official API boundaries", () => {
  test("official browser code does not call admin APIs", () => {
    for (const file of filesBelow("app/dashboard/officials").filter((name) => /\.(ts|tsx)$/.test(name))) {
      expect(read(file)).not.toContain("/api/admin/");
    }
  });

  test.each([
    "app/api/officials/uitslagen/[matchmakingId]/route.ts",
    "app/api/officials/weegstation/data/route.ts",
  ])("%s checks role and matchmaking before its first elevated query", (file) => {
    const source = read(file);
    const handler = source.indexOf("export async function GET");
    const role = source.indexOf("requireUserWithRole(req", handler);
    const object = source.indexOf("assertCanAccessMatchmaking", role);
    const query = source.indexOf(".from(", object);
    expect(role).toBeGreaterThan(handler);
    expect(role).toBeLessThan(object);
    expect(object).toBeLessThan(query);
    expect(source).toContain('"official", "hoofdofficial", "admin", "superadmin"');
  });

  test("fighter reference lookup checks matchmaking before resolving the supplied id", () => {
    const source = read("app/api/officials/matchmaking/[matchmakingId]/fighter-ref/[fighterRef]/route.ts");
    expect(source.indexOf("assertCanAccessMatchmaking")).toBeLessThan(source.indexOf('.from("matchmaker_fighter_context")'));
    expect(source).toContain("isUuid");
  });

  test.each(["GET", "POST", "PATCH"])("control-results %s uses the central scoped authorizer", (method) => {
    const source = read("app/api/officials/control-results/route.ts");
    const handler = source.indexOf(`export async function ${method}`);
    const authorize = source.indexOf("authorize(req, matchmakingId)", handler);
    const query = source.indexOf(".from(", authorize);
    expect(authorize).toBeGreaterThan(handler);
    expect(authorize).toBeLessThan(query);
  });

  test.each([
    "app/api/officials/weegstation/update/route.ts",
    "app/api/officials/weegstation/dispensatie/route.ts",
  ])("%s scopes the row query by an already-authorized matchmaking", (file) => {
    const source = read(file);
    const handler = source.indexOf("export async function POST");
    const guard = source.indexOf("getWeegstationAuthContext(req, matchmakingId)", handler);
    const rowQuery = source.indexOf('.from("weigh_in_bouts")', handler);
    expect(guard).toBeGreaterThan(handler);
    expect(guard).toBeLessThan(rowQuery);
    expect(source).toContain('.eq("matchmaking_id", matchmakingId)');
  });

  test("uitslagen submit authorizes before workflow state reads", () => {
    const source = read("app/api/officials/uitslagen/submit/route.ts");
    const handler = source.indexOf("export async function POST");
    expect(source.indexOf("assertCanAccessMatchmaking({ matchmaking_id", handler)).toBeLessThan(source.indexOf("assertMatchmakingInState", handler));
  });

  test("official send-to-admin keeps the lifecycle action behind role and object guards", () => {
    const source = read("app/api/officials/send-to-admin/route.ts");
    const handler = source.indexOf("export async function POST");
    const role = source.indexOf("requireUserWithRole(req", handler);
    const object = source.indexOf("assertCanAccessMatchmaking", role);
    const query = source.indexOf('.from("matchmakings")', object);
    const mutation = source.indexOf("transferLifecycle", query);
    expect(role).toBeGreaterThan(handler);
    expect(role).toBeLessThan(object);
    expect(object).toBeLessThan(query);
    expect(query).toBeLessThan(mutation);
    expect(source).toContain('"official"');
    expect(source).toContain('"hoofdofficial"');
    expect(source).toContain("privateJson");
    expect(source).toContain("secureError");
  });

  test("official pages do not navigate back into the matchmaker dashboard", () => {
    const fighter = read("app/dashboard/officials/controle/[matchmakingId]/fighter/[fighterId]/page.tsx");
    expect(fighter).not.toContain("/dashboard/matchmaker/");
    expect(fighter).toContain("/dashboard/officials/controle/${matchmakingId}");
  });

  test("weegstation build authorizes role and matchmaking before cleanup, refresh and lifecycle writes", () => {
    const source = read("app/api/officials/weegstation/build/route.ts");
    const handler = source.indexOf("export async function POST");
    const role = source.indexOf("requireUserWithRole(req", handler);
    const guard = source.indexOf("assertCanAccessMatchmaking", role);
    const readQuery = source.indexOf('.from("matchmakings")', guard);
    const cleanup = source.indexOf("cleanupOldWeegstationData(admin, matchmakingId)", readQuery);
    const refresh = source.indexOf("refreshAuthorizedWeegstation(", cleanup);
    expect(role).toBeGreaterThan(handler);
    expect(role).toBeLessThan(guard);
    expect(guard).toBeLessThan(readQuery);
    expect(readQuery).toBeLessThan(cleanup);
    expect(cleanup).toBeLessThan(refresh);
    expect(source).toContain('"matchmaker"');
  });
});
