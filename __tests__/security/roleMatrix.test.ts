// __tests__/security/roleMatrix.test.ts
// Tests for the role-based access control matrix.

import { canDo, getAllowedActions, ROLE_MATRIX } from "@/lib/constants/roleMatrix";
import type { Action } from "@/lib/constants/roleMatrix";
import type { RoleName } from "@/lib/types/workflow";

describe("ROLE_MATRIX", () => {
  it("covers all defined actions", () => {
    const actions: Action[] = Object.keys(ROLE_MATRIX) as Action[];
    expect(actions.length).toBeGreaterThan(0);
  });

  it("each action has at least one allowed role", () => {
    for (const [action, roles] of Object.entries(ROLE_MATRIX)) {
      expect(roles.length).toBeGreaterThan(0);
    }
  });
});

describe("canDo", () => {
  it("superadmin can do everything", () => {
    const actions: Action[] = Object.keys(ROLE_MATRIX) as Action[];
    for (const action of actions) {
      expect(canDo("superadmin", action)).toBe(true);
    }
  });

  it("official can wegen", () => {
    expect(canDo("official", "wegen")).toBe(true);
  });

  it("official cannot give dispensatie", () => {
    expect(canDo("official", "dispensatie_geven")).toBe(false);
  });

  it("official cannot set minpunten", () => {
    expect(canDo("official", "minpunten")).toBe(false);
  });

  it("official can enter uitslagen", () => {
    expect(canDo("official", "uitslagen_invoeren")).toBe(true);
  });

  it("official cannot manage users", () => {
    expect(canDo("official", "user_beheer")).toBe(false);
  });

  it("matchmaker can change partij numbers", () => {
    expect(canDo("matchmaker", "partij_nummer_wijzigen")).toBe(true);
  });

  it("matchmaker cannot enter uitslagen", () => {
    expect(canDo("matchmaker", "uitslagen_invoeren")).toBe(false);
  });

  it("matchmaker cannot wegen", () => {
    expect(canDo("matchmaker", "wegen")).toBe(false);
  });

  it("hoofdofficial can give dispensatie", () => {
    expect(canDo("hoofdofficial", "dispensatie_geven")).toBe(true);
  });

  it("hoofdofficial can set minpunten", () => {
    expect(canDo("hoofdofficial", "minpunten")).toBe(true);
  });

  it("admin can approve matchmaking", () => {
    expect(canDo("admin", "matchmaking_approve")).toBe(true);
  });

  it("admin can manage users", () => {
    expect(canDo("admin", "user_beheer")).toBe(true);
  });

  it("unknown role cannot do anything", () => {
    const actions: Action[] = Object.keys(ROLE_MATRIX) as Action[];
    for (const action of actions) {
      expect(canDo("unknown", action)).toBe(false);
    }
  });

  it("empty role cannot do anything", () => {
    expect(canDo("", "wegen")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(canDo("OFFICIAL", "wegen")).toBe(true);
    expect(canDo("Official", "wegen")).toBe(true);
  });
});

describe("getAllowedActions", () => {
  it("superadmin gets all actions", () => {
    const allActions = Object.keys(ROLE_MATRIX) as Action[];
    const result = getAllowedActions("superadmin");
    expect(result.sort()).toEqual(allActions.sort());
  });

  it("official gets limited set", () => {
    const result = getAllowedActions("official");
    expect(result).toContain("wegen");
    expect(result).toContain("uitslagen_invoeren");
    expect(result).not.toContain("user_beheer");
    expect(result).not.toContain("dispensatie_geven");
  });

  it("unknown role gets empty set", () => {
    const result = getAllowedActions("unknown");
    expect(result).toHaveLength(0);
  });
});
