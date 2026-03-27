// __tests__/workflow/stateGates.test.ts
// Tests for state transition logic.

import { isValidTransition, getNextState, MATCHMAKING_STATES, VALID_TRANSITIONS } from "@/lib/constants/states";
import type { MatchmakingState } from "@/lib/types/workflow";

describe("MATCHMAKING_STATES", () => {
  it("has correct order", () => {
    expect(MATCHMAKING_STATES).toEqual(["draft", "approved", "weging", "lineup", "complete"]);
  });
});

describe("isValidTransition", () => {
  it("allows valid forward transitions", () => {
    expect(isValidTransition("draft", "approved")).toBe(true);
    expect(isValidTransition("approved", "weging")).toBe(true);
    expect(isValidTransition("weging", "lineup")).toBe(true);
    expect(isValidTransition("lineup", "complete")).toBe(true);
  });

  it("rejects backward transitions", () => {
    expect(isValidTransition("approved", "draft")).toBe(false);
    expect(isValidTransition("weging", "approved")).toBe(false);
    expect(isValidTransition("lineup", "weging")).toBe(false);
    expect(isValidTransition("complete", "lineup")).toBe(false);
  });

  it("rejects skipping states", () => {
    expect(isValidTransition("draft", "weging")).toBe(false);
    expect(isValidTransition("draft", "lineup")).toBe(false);
    expect(isValidTransition("draft", "complete")).toBe(false);
    expect(isValidTransition("approved", "lineup")).toBe(false);
    expect(isValidTransition("approved", "complete")).toBe(false);
  });

  it("rejects staying in same state", () => {
    const states: MatchmakingState[] = ["draft", "approved", "weging", "lineup", "complete"];
    for (const state of states) {
      expect(isValidTransition(state, state)).toBe(false);
    }
  });

  it("complete state has no valid next state", () => {
    const states: MatchmakingState[] = ["draft", "approved", "weging", "lineup", "complete"];
    for (const state of states) {
      expect(isValidTransition("complete", state)).toBe(false);
    }
  });
});

describe("getNextState", () => {
  it("returns correct next state for each", () => {
    expect(getNextState("draft")).toBe("approved");
    expect(getNextState("approved")).toBe("weging");
    expect(getNextState("weging")).toBe("lineup");
    expect(getNextState("lineup")).toBe("complete");
  });

  it("returns null for complete (end state)", () => {
    expect(getNextState("complete")).toBeNull();
  });
});

describe("VALID_TRANSITIONS coverage", () => {
  it("each state except complete has exactly one next state", () => {
    const states: MatchmakingState[] = ["draft", "approved", "weging", "lineup"];
    for (const state of states) {
      expect(VALID_TRANSITIONS[state]).toHaveLength(1);
    }
    expect(VALID_TRANSITIONS.complete).toHaveLength(0);
  });
});
