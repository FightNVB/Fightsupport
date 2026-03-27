/**
 * lib/logger.ts
 * Structured logging for the Fightsupport application.
 * Never logs sensitive data (passwords, tokens, full names).
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  userId?: string;
  action?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

function buildEntry(
  level: LogLevel,
  message: string,
  opts?: Omit<LogEntry, "level" | "message" | "timestamp">
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...opts,
  };
}

function emit(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(
    message: string,
    opts?: Omit<LogEntry, "level" | "message" | "timestamp">
  ) {
    emit(buildEntry("info", message, opts));
  },

  warn(
    message: string,
    opts?: Omit<LogEntry, "level" | "message" | "timestamp">
  ) {
    emit(buildEntry("warn", message, opts));
  },

  error(
    message: string,
    opts?: Omit<LogEntry, "level" | "message" | "timestamp">
  ) {
    emit(buildEntry("error", message, opts));
  },

  debug(
    message: string,
    opts?: Omit<LogEntry, "level" | "message" | "timestamp">
  ) {
    if (process.env.NODE_ENV !== "production") {
      emit(buildEntry("debug", message, opts));
    }
  },

  /** Log authentication failures (no tokens or passwords in meta). */
  authFailure(
    reason: string,
    opts?: { userId?: string; context?: string; meta?: Record<string, unknown> }
  ) {
    emit(
      buildEntry("warn", `Auth failure: ${reason}`, {
        context: opts?.context ?? "auth",
        userId: opts?.userId,
        action: "auth_failure",
        meta: opts?.meta,
      })
    );
  },

  /** Log permission denials. */
  accessDenied(
    userId: string,
    resource: string,
    opts?: { context?: string; meta?: Record<string, unknown> }
  ) {
    emit(
      buildEntry("warn", `Access denied to ${resource}`, {
        context: opts?.context ?? "authz",
        userId,
        action: "access_denied",
        meta: { resource, ...opts?.meta },
      })
    );
  },

  /** Log data modifications (who changed what when). */
  dataChange(
    userId: string,
    action: string,
    resource: string,
    opts?: { context?: string; meta?: Record<string, unknown> }
  ) {
    emit(
      buildEntry("info", `Data change: ${action} on ${resource}`, {
        context: opts?.context ?? "data",
        userId,
        action,
        meta: { resource, ...opts?.meta },
      })
    );
  },

  /** Log file uploads (filename, size, uploader — no sensitive content). */
  fileUpload(
    userId: string,
    filename: string,
    sizeBytes: number,
    opts?: { context?: string; meta?: Record<string, unknown> }
  ) {
    emit(
      buildEntry("info", `File upload: ${filename}`, {
        context: opts?.context ?? "upload",
        userId,
        action: "file_upload",
        meta: { filename, sizeBytes, ...opts?.meta },
      })
    );
  },

  /** Log API errors with request context. */
  apiError(
    message: string,
    opts?: {
      userId?: string;
      context?: string;
      statusCode?: number;
      meta?: Record<string, unknown>;
    }
  ) {
    emit(
      buildEntry("error", message, {
        context: opts?.context ?? "api",
        userId: opts?.userId,
        action: "api_error",
        meta: { statusCode: opts?.statusCode, ...opts?.meta },
      })
    );
  },
};
