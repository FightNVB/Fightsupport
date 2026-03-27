// __tests__/workflow/meldingValidation.test.ts
// Tests for melding approval validation rules.

import {
  isValidMeldingStatus,
  validateMeldingStatusChange,
} from "@/lib/workflow/meldingValidator";
import type { MeldingStatus } from "@/lib/types/workflow";

describe("isValidMeldingStatus", () => {
  it("accepts valid statuses", () => {
    const valid: MeldingStatus[] = ["pending", "akkoord", "afgewezen", "deleted"];
    for (const s of valid) {
      expect(isValidMeldingStatus(s)).toBe(true);
    }
  });

  it("rejects invalid statuses", () => {
    const invalid = ["ok", "goedgekeurd", "afgekeurd", "", "unknown", "approved"];
    for (const s of invalid) {
      expect(isValidMeldingStatus(s)).toBe(false);
    }
  });
});

describe("validateMeldingStatusChange", () => {
  it("allows pending → akkoord", () => {
    const result = validateMeldingStatusChange("pending", "akkoord");
    expect(result.ok).toBe(true);
  });

  it("allows pending → afgewezen", () => {
    const result = validateMeldingStatusChange("pending", "afgewezen");
    expect(result.ok).toBe(true);
  });

  it("allows pending → deleted", () => {
    const result = validateMeldingStatusChange("pending", "deleted");
    expect(result.ok).toBe(true);
  });

  it("allows akkoord → afgewezen (admin override)", () => {
    const result = validateMeldingStatusChange("akkoord", "afgewezen");
    expect(result.ok).toBe(true);
  });

  it("allows afgewezen → akkoord (admin override)", () => {
    const result = validateMeldingStatusChange("afgewezen", "akkoord");
    expect(result.ok).toBe(true);
  });

  it("blocks transitions from deleted", () => {
    const statuses: MeldingStatus[] = ["pending", "akkoord", "afgewezen"];
    for (const s of statuses) {
      const result = validateMeldingStatusChange("deleted", s);
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    }
  });

  it("returns error for invalid new_status", () => {
    const result = validateMeldingStatusChange("pending", "invalid_status" as any);
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("allows pending → pending (no-op reset)", () => {
    const result = validateMeldingStatusChange("pending", "pending");
    expect(result.ok).toBe(true);
  });
});
