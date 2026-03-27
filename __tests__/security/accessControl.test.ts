// __tests__/security/accessControl.test.ts
// Tests for role-check helpers and normalization utilities.

import { normalizeRole, isAdminLike, isOfficialLike, assertCan, canEnterUitslagen, canWegen, canGiveDispensatie } from "@/lib/auth/roleChecks";
import type { RoleName } from "@/lib/types/workflow";

describe("normalizeRole", () => {
  it("normalizes known roles", () => {
    const cases: [unknown, RoleName][] = [
      ["admin", "admin"],
      ["superadmin", "superadmin"],
      ["matchmaker", "matchmaker"],
      ["official", "official"],
      ["hoofdofficial", "hoofdofficial"],
      ["dispensatie_admin", "dispensatie_admin"],
    ];
    for (const [input, expected] of cases) {
      expect(normalizeRole(input)).toBe(expected);
    }
  });

  it("normalizes unknown values to 'unknown'", () => {
    expect(normalizeRole("")).toBe("unknown");
    expect(normalizeRole(null)).toBe("unknown");
    expect(normalizeRole(undefined)).toBe("unknown");
    expect(normalizeRole("notarole")).toBe("unknown");
    expect(normalizeRole(123)).toBe("unknown");
  });

  it("is case-insensitive", () => {
    expect(normalizeRole("ADMIN")).toBe("admin");
    expect(normalizeRole("OFFICIAL")).toBe("official");
    expect(normalizeRole("Superadmin")).toBe("superadmin");
  });

  it("trims whitespace", () => {
    expect(normalizeRole("  admin  ")).toBe("admin");
    expect(normalizeRole(" official\t")).toBe("official");
  });
});

describe("isAdminLike", () => {
  it("returns true for admin-like roles", () => {
    expect(isAdminLike("admin")).toBe(true);
    expect(isAdminLike("superadmin")).toBe(true);
    expect(isAdminLike("dispensatie_admin")).toBe(true);
  });

  it("returns false for non-admin roles", () => {
    expect(isAdminLike("official")).toBe(false);
    expect(isAdminLike("matchmaker")).toBe(false);
    expect(isAdminLike("hoofdofficial")).toBe(false);
    expect(isAdminLike("unknown")).toBe(false);
  });
});

describe("isOfficialLike", () => {
  it("returns true for official-like roles", () => {
    expect(isOfficialLike("official")).toBe(true);
    expect(isOfficialLike("hoofdofficial")).toBe(true);
  });

  it("returns false for non-official roles", () => {
    expect(isOfficialLike("admin")).toBe(false);
    expect(isOfficialLike("matchmaker")).toBe(false);
    expect(isOfficialLike("superadmin")).toBe(false);
  });
});

describe("canEnterUitslagen", () => {
  it("official can enter uitslagen", () => {
    expect(canEnterUitslagen("official")).toBe(true);
  });

  it("hoofdofficial can enter uitslagen", () => {
    expect(canEnterUitslagen("hoofdofficial")).toBe(true);
  });

  it("matchmaker cannot enter uitslagen", () => {
    expect(canEnterUitslagen("matchmaker")).toBe(false);
  });
});

describe("canWegen", () => {
  it("official can wegen", () => {
    expect(canWegen("official")).toBe(true);
  });

  it("matchmaker cannot wegen", () => {
    expect(canWegen("matchmaker")).toBe(false);
  });
});

describe("canGiveDispensatie", () => {
  it("hoofdofficial can give dispensatie", () => {
    expect(canGiveDispensatie("hoofdofficial")).toBe(true);
  });

  it("official cannot give dispensatie", () => {
    expect(canGiveDispensatie("official")).toBe(false);
  });

  it("admin can give dispensatie", () => {
    expect(canGiveDispensatie("admin")).toBe(true);
  });
});

describe("assertCan", () => {
  it("does not throw when role is allowed", () => {
    expect(() => assertCan("admin", "user_beheer")).not.toThrow();
  });

  it("throws when role is not allowed", () => {
    expect(() => assertCan("official", "user_beheer")).toThrow();
  });

  it("superadmin never throws", () => {
    expect(() => assertCan("superadmin", "user_beheer")).not.toThrow();
    expect(() => assertCan("superadmin", "wegen")).not.toThrow();
  });
});
