import {
  formatActiveRuntime,
  getActiveRuntimeMs,
  getBatchActiveRuntimeMs,
} from "@/lib/fightpassport/activeRuntime";

const hour = 60 * 60 * 1000;

describe("FightPassport Total actieve looptijd", () => {
  test("lopende run zonder pauze telt vanaf started_at", () => {
    const run = { status: "running", started_at: "2026-08-06T10:00:00.000Z", meta: {} };
    expect(getActiveRuntimeMs(run, Date.parse("2026-08-06T14:00:00.000Z"))).toBe(4 * hour);
    expect(formatActiveRuntime(run, Date.parse("2026-08-06T14:00:00.000Z"))).toBe("4u 0m 0s");
  });

  test("gepauzeerde run bevriest bij de opgebouwde actieve looptijd", () => {
    const run = {
      status: "paused",
      started_at: "2026-08-05T10:00:00.000Z",
      meta: { accumulated_runtime_ms: 4 * hour, last_stopped_at: "2026-08-05T14:00:00.000Z" },
    };
    expect(getActiveRuntimeMs(run, Date.parse("2026-08-06T14:00:00.000Z"))).toBe(4 * hour);
  });

  test("hervatte run telt de kalenderpauze niet mee", () => {
    const run = {
      status: "running",
      started_at: "2026-08-05T10:00:00.000Z",
      meta: {
        accumulated_runtime_ms: 4 * hour,
        last_stopped_at: "2026-08-05T14:00:00.000Z",
        resumed_at: "2026-08-06T10:00:00.000Z",
      },
    };
    expect(getActiveRuntimeMs(run, Date.parse("2026-08-06T14:00:00.000Z"))).toBe(8 * hour);
  });

  test("afgeronde hervatte run toont de definitief opgeslagen actieve looptijd", () => {
    const run = {
      status: "completed",
      started_at: "2026-08-05T10:00:00.000Z",
      finished_at: "2026-08-06T14:00:00.000Z",
      meta: { accumulated_runtime_ms: 8 * hour, resumed_at: "2026-08-06T10:00:00.000Z" },
    };
    expect(getActiveRuntimeMs(run)).toBe(8 * hour);
  });

  test("parallelle processrecords gebruiken dezelfde batchtijd en worden niet opgeteld", () => {
    const runs = [
      { status: "running", started_at: "2026-08-06T10:00:00.000Z", meta: {} },
      { status: "running", started_at: "2026-08-06T10:05:00.000Z", meta: {} },
    ];
    expect(getBatchActiveRuntimeMs(runs, Date.parse("2026-08-06T14:00:00.000Z"))).toBe(4 * hour);
  });
});
