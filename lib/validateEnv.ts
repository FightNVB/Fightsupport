/**
 * lib/validateEnv.ts
 * Validates required environment variables at startup.
 * Call validateEnv() early in your app entrypoint or middleware.
 */

const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

/**
 * Validates that all required environment variables are present.
 * Throws an error if any are missing (fail-fast).
 * Logs which keys are present (never logs values).
 */
export function validateEnv(): void {
  const missing: string[] = [];
  const present: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key];
    if (!value || value.trim() === "") {
      missing.push(key);
    } else {
      present.push(key);
    }
  }

  if (present.length > 0) {
    console.info("[validateEnv] Environment variables loaded:", present.join(", "));
  }

  if (missing.length > 0) {
    const msg = `[validateEnv] FATAL: Missing required environment variables: ${missing.join(", ")}`;
    console.error(msg);
    throw new Error(msg);
  }
}

/**
 * Returns a required env var, throwing if missing.
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(`[validateEnv] Missing required environment variable: ${key}`);
  }
  return value.trim();
}

/**
 * Returns true when all required env vars are present (non-throwing version).
 */
export function hasRequiredEnv(): boolean {
  return REQUIRED_ENV_VARS.every((key) => {
    const v = process.env[key];
    return v && v.trim() !== "";
  });
}
