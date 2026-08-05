import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

function indexAfter(source: string, needle: string, after = 0) {
  const index = source.indexOf(needle, after);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe("third security patch route contracts", () => {
  test.each([
    "app/api/admin/algemeen/afmeldingen/goedkeuren/route.ts",
    "app/api/admin/algemeen/afmeldingen/afkeuren/route.ts",
  ])("%s authenticates before reading the requested object", (file) => {
    const source = read(file);
    const handler = indexAfter(source, "export async function POST");
    const guard = indexAfter(source, "requireAdmin(req)", handler);
    const objectRead = indexAfter(source, '.from("afmeldingen")', handler);
    expect(guard).toBeLessThan(objectRead);
    expect(source).toContain("beoordeeld_door: auth.userId");
    expect(source).not.toContain("async function getUserId");
    expect(source).toContain("privateJson");
  });

  test.each([
    "app/api/admin/algemeen/snapshots/route.ts",
    "app/api/admin/algemeen/snapshots/[snapshotId]/route.ts",
  ])("%s requires admin before snapshot queries", (file) => {
    const source = read(file);
    const handler = indexAfter(source, "export async function GET");
    const guard = indexAfter(source, "requireAdmin(req)", handler);
    const query = indexAfter(source, ".from(", handler);
    expect(guard).toBeLessThan(query);
    expect(source).toContain("privateJson");
    expect(source).not.toContain("getSupabaseFromAuthHeader");
  });

  test("snapshot detail validates the path id before its object query", () => {
    const source = read("app/api/admin/algemeen/snapshots/[snapshotId]/route.ts");
    expect(source.indexOf("test(snapshotId)")).toBeLessThan(source.indexOf('.from("admin_beheer_matchmaking_snapshots")'));
  });

  test("fighter review derives and authorizes matchmaking scope before dossier access", () => {
    const source = read("app/api/matchmaker/fighter-review/route.ts");
    const handler = indexAfter(source, "export async function PATCH");
    const role = indexAfter(source, "requireUserWithRole(req", handler);
    const object = indexAfter(source, "resolveAndAssertFighterReviewAccess", role);
    const dossier = indexAfter(source, '.from("matchmaker_fighter_resultaten")', object);
    expect(role).toBeLessThan(object);
    expect(object).toBeLessThan(dossier);
    expect(source).not.toContain("body?.matchmaking_id");
    expect(source).toContain("reviewed_by: auth.userId");
  });

  test.each([
    "app/api/matchmaker/return-matchmaking/route.ts",
    "app/api/admin/archief/verplaats/route.ts",
  ])("%s checks role and object before its first route query", (file) => {
    const source = read(file);
    const handler = indexAfter(source, "export async function POST");
    const role = indexAfter(source, "requireUserWithRole(req", handler);
    const object = indexAfter(source, "assertCanAccessMatchmaking", role);
    const query = indexAfter(source, ".from(", object);
    expect(role).toBeLessThan(object);
    expect(object).toBeLessThan(query);
    expect(source).not.toMatch(/async function getUserFromBearer|async function getUserRoles/);
  });

  test("central fighter-review lookup reveals only scope and authorizes it", () => {
    const source = read("app/api/_utils/authz.ts");
    const helper = indexAfter(source, "resolveAndAssertFighterReviewAccess");
    const minimalRead = indexAfter(source, '.select("id,matchmaking_id,inschrijving_id")', helper);
    const objectGuard = indexAfter(source, "await assertCanAccessMatchmaking", minimalRead);
    expect(minimalRead).toBeLessThan(objectGuard);
  });
});
