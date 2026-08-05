import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

function filesBelow(relative: string): string[] {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relative, entry.name);
    return entry.isDirectory() ? filesBelow(child) : [child];
  });
}

describe("matchmaker API boundaries", () => {
  test("matchmaker pages and components do not call admin APIs", () => {
    const files = [
      ...filesBelow("app/dashboard/matchmaker"),
      ...filesBelow("app/matchmaker"),
      ...filesBelow("components/matchmaker"),
    ].filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));

    for (const file of files) expect(read(file)).not.toContain("/api/admin/");
  });

  test("return-to-matchmaker authenticates and checks object access before elevated reads", () => {
    const source = read("app/api/matchmaker/return-to-matchmaker/route.ts");
    const role = source.indexOf("requireUserWithRole(req");
    const object = source.indexOf("assertCanAccessMatchmaking", role);
    const query = source.indexOf('.from("matchmakings")', object);
    expect(role).toBeGreaterThanOrEqual(0);
    expect(role).toBeLessThan(object);
    expect(object).toBeLessThan(query);
    expect(source).toContain('["matchmaker", "admin", "superadmin"]');
    expect(source).toContain("privateJson");
  });

  test("FightPassport bridge validates role, matchmaking and fighter binding before mirror reads", () => {
    const source = read("app/api/matchmaker/[matchmakingid]/fightpassport/route.ts");
    const role = source.indexOf("requireUserWithRole(req");
    const object = source.indexOf("assertCanAccessMatchmaking", role);
    const binding = source.indexOf('.from("aanmeldingen")', object);
    const mirror = source.indexOf('.from("fightpassport_fighters")', binding);
    expect(role).toBeGreaterThanOrEqual(0);
    expect(role).toBeLessThan(object);
    expect(object).toBeLessThan(binding);
    expect(binding).toBeLessThan(mirror);
    expect(source).toContain("requestedVas.some");
    expect(source).toContain("privateJson");
  });

  test("browser code no longer queries FightPassport mirror tables directly", () => {
    const files = filesBelow("app/dashboard/matchmaker").filter((file) => /\.(ts|tsx)$/.test(file));
    for (const file of files) {
      expect(read(file)).not.toMatch(/\.from\(["']fightpassport_(fighters|results|startbans|licenses)["']\)/);
    }
  });

  test("matchmaker browser code obtains session profile and roles through /api/me/profile", () => {
    const files = filesBelow("app/dashboard/matchmaker").filter((file) => /\.(ts|tsx)$/.test(file));
    for (const file of files) {
      expect(read(file)).not.toMatch(/\.from\(["'](?:user_profiles|user_roles|roles)["']\)/);
    }

    const centralProfile = read("app/api/me/profile/route.ts");
    expect(centralProfile).toContain('role: active_role');
    expect(centralProfile).toContain("active_role,");
    expect(centralProfile).toContain("available_roles,");
    expect(centralProfile).toContain("bondteam:");
    expect(centralProfile).toContain("full_name:");
    expect(centralProfile).toContain("email:");
  });

  test("the shared weighstation mutation authorizer still excludes matchmakers", () => {
    const source = read("lib/weegstation/routeAuth.ts");
    const roleList = source.slice(source.indexOf("requireAnyRole(req"), source.indexOf("]);", source.indexOf("requireAnyRole(req")));
    expect(roleList).not.toContain('"matchmaker"');
  });

  test.each([
    "app/api/officials/weegstation/update/route.ts",
    "app/api/officials/weegstation/dispensatie/route.ts",
    "app/api/officials/weegstation/finalize/route.ts",
  ])("%s keeps matchmakers behind the unchanged official mutation guard", (file) => {
    const source = read(file);
    expect(source).toContain("getWeegstationAuthContext(req, matchmakingId)");
    expect(source).not.toContain('"matchmaker"');
  });

  test.each([
    ["app/api/officials/weegstation/build/route.ts", "POST"],
    ["app/api/officials/weegstation/data/route.ts", "GET"],
  ])("%s admits matchmakers only after scoped matchmaking authorization", (file, method) => {
    const source = read(file);
    const handler = source.indexOf(`export async function ${method}`);
    const role = source.indexOf("requireUserWithRole(req", handler);
    const object = source.indexOf("assertCanAccessMatchmaking", role);
    const query = source.indexOf(".from(", object);
    expect(source).toContain('"matchmaker"');
    expect(role).toBeGreaterThan(handler);
    expect(role).toBeLessThan(object);
    expect(object).toBeLessThan(query);
  });

  test("matchmaker upload posts to the existing role-scoped upload route", () => {
    const source = read("app/dashboard/matchmaker/upload/page.tsx");
    expect(source).toContain('/api/matchmaker/submit-matchmaking');
    expect(source).not.toContain('/api/submit_matchmaking/start');
  });
});
