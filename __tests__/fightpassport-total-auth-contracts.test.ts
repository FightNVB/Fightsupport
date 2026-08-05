import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("FightPassport Total authorization contracts", () => {
  test("the Total page uses authenticated calls for start, status, stop and resume", () => {
    const source = read("app/dashboard/admin/fightpassport-beheer/page.tsx");
    expect(source).toContain('import { authedFetch } from "@/lib/api/authedFetch"');
    expect(source).toContain('authedFetch("/api/admin/fightpassport-sync/start"');
    expect(source).toContain('authedFetch("/api/admin/fightpassport-sync/runs"');
    expect(source).toContain('authedFetch("/api/admin/fightpassport-sync/stop"');
    expect(source).toContain('authedFetch("/api/admin/fightpassport-sync/resume"');
  });

  test("Total start keeps its existing role semantics", () => {
    const source = read("app/api/admin/fightpassport-sync/start/route.ts");
    expect(source).toContain('return role === "admin" || role === "superadmin"');
    expect(source).toContain("const { role } = await requireUserWithRole(req)");
  });

  test("Total start authenticates before its first elevated query and process invocation", () => {
    const source = read("app/api/admin/fightpassport-sync/start/route.ts");
    const handler = source.indexOf("export async function POST");
    const guard = source.indexOf("requireUserWithRole(req)", handler);
    const query = source.indexOf('.from("fightpassport_sync_runs")', guard);
    const processStart = source.indexOf("void runNodeScript(", guard);
    expect(guard).toBeGreaterThan(handler);
    expect(guard).toBeLessThan(query);
    expect(guard).toBeLessThan(processStart);
  });

  test("Total start preserves 401/403 Responses instead of converting them to 500", () => {
    const source = read("app/api/admin/fightpassport-sync/start/route.ts");
    expect(source).toContain("if (err instanceof Response) return err;");
  });

  test("active_role remains validated against user_roles without a profile-only superadmin bypass", () => {
    const source = read("app/api/_utils/authz.ts");
    expect(source).toContain("if (!allowedSet.has(activeRole)) throw new Response");
    expect(source).not.toContain('activeRole === "superadmin" && legacyRole === "superadmin"');
  });
});
