export type RuntimeRun = {
  status?: unknown;
  started_at?: unknown;
  finished_at?: unknown;
  completed_at?: unknown;
  ended_at?: unknown;
  meta?: Record<string, unknown> | null;
};

function timestamp(value: unknown): number | null {
  if (!value) return null;
  const valueMs = new Date(String(value)).getTime();
  return Number.isFinite(valueMs) ? valueMs : null;
}

function storedRuntime(meta: Record<string, unknown>): number | null {
  const value = Number(meta.accumulated_runtime_ms);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function segmentStart(run: RuntimeRun, meta: Record<string, unknown>): number | null {
  return timestamp(meta.resumed_at) ?? timestamp(meta.cycle_started_at) ?? timestamp(run.started_at);
}

function legacyPreviousRuntime(run: RuntimeRun, meta: Record<string, unknown>): number {
  const stoppedAt = timestamp(meta.last_stopped_at);
  const startedAt = timestamp(meta.cycle_started_at) ?? timestamp(run.started_at);
  return stoppedAt != null && startedAt != null && stoppedAt >= startedAt
    ? stoppedAt - startedAt
    : 0;
}

/** Actieve verwerkingstijd; kalenderpauzes worden niet meegeteld. */
export function getActiveRuntimeMs(run: RuntimeRun, nowMs = Date.now()): number | null {
  const meta = run.meta && typeof run.meta === "object" ? run.meta : {};
  const status = String(run.status ?? "").toLowerCase();
  const stored = storedRuntime(meta);

  if (status === "running") {
    const startedAt = segmentStart(run, meta);
    if (startedAt == null || nowMs < startedAt) return stored;
    const previous = stored ?? (meta.resumed_at ? legacyPreviousRuntime(run, meta) : 0);
    return previous + (nowMs - startedAt);
  }

  if (stored != null) return stored;

  const stoppedAt = status === "paused" ? timestamp(meta.last_stopped_at) : null;
  const endedAt =
    stoppedAt ??
    timestamp(run.finished_at) ??
    timestamp(run.completed_at) ??
    timestamp(run.ended_at);
  const startedAt = segmentStart(run, meta);
  if (startedAt == null || endedAt == null || endedAt < startedAt) return null;
  return (meta.resumed_at ? legacyPreviousRuntime(run, meta) : 0) + (endedAt - startedAt);
}

/** Parallelle processrecords binnen één batch delen dezelfde batchlooptijd. */
export function getBatchActiveRuntimeMs(runs: RuntimeRun[], nowMs = Date.now()): number | null {
  const durations = runs
    .map((run) => getActiveRuntimeMs(run, nowMs))
    .filter((value): value is number => value != null);
  return durations.length ? Math.max(...durations) : null;
}

export function formatRuntimeMs(runtimeMs: number | null): string {
  if (runtimeMs == null || !Number.isFinite(runtimeMs) || runtimeMs < 0) return "-";
  const totalSeconds = Math.floor(runtimeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}u ${minutes}m`;
  if (hours > 0) return `${hours}u ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatActiveRuntime(run: RuntimeRun, nowMs = Date.now()): string {
  return formatRuntimeMs(getActiveRuntimeMs(run, nowMs));
}
