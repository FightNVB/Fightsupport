/**
 * lib/api/response.ts
 * Standardized API response helpers.
 *
 * Success: { ok: true, data: {...}, message?: "..." }
 * Error:   { ok: false, error: "...", code?: "SPECIFIC_CODE" }
 * List:    { ok: true, data: [...], meta: { total, page } }
 */

import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SuccessResponse<T = unknown> {
  ok: true;
  data: T;
  message?: string;
}

export interface SuccessListResponse<T = unknown> {
  ok: true;
  data: T[];
  meta: {
    total: number;
    page?: number;
    perPage?: number;
  };
}

export interface ErrorResponse {
  ok: false;
  error: string;
  code?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a success response.
 * @example successResponse({ id: "abc" }, "Created successfully")
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status = 200
): NextResponse<SuccessResponse<T>> {
  const body: SuccessResponse<T> = { ok: true, data };
  if (message) body.message = message;
  return NextResponse.json(body, { status });
}

/**
 * Build a paginated list response.
 */
export function listResponse<T>(
  data: T[],
  meta: { total: number; page?: number; perPage?: number }
): NextResponse<SuccessListResponse<T>> {
  return NextResponse.json({ ok: true, data, meta });
}

/**
 * Build an error response.
 * @example errorResponse("Niet ingelogd.", "UNAUTHORIZED", 401)
 */
export function errorResponse(
  error: string,
  code?: string,
  status = 400
): NextResponse<ErrorResponse> {
  const body: ErrorResponse = { ok: false, error };
  if (code) body.code = code;
  return NextResponse.json(body, { status });
}

// ---------------------------------------------------------------------------
// Shorthand error factories
// ---------------------------------------------------------------------------

export const unauthorized = (message = "Niet ingelogd.") =>
  errorResponse(message, "UNAUTHORIZED", 401);

export const forbidden = (message = "Geen toegang.") =>
  errorResponse(message, "FORBIDDEN", 403);

export const notFound = (message = "Niet gevonden.") =>
  errorResponse(message, "NOT_FOUND", 404);

export const badRequest = (message: string, code = "BAD_REQUEST") =>
  errorResponse(message, code, 400);

export const tooManyRequests = (message = "Te veel verzoeken. Probeer later opnieuw.") =>
  errorResponse(message, "RATE_LIMITED", 429);

export const internalError = (message = "Er is een interne fout opgetreden.") =>
  errorResponse(message, "INTERNAL_ERROR", 500);
