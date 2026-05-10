/**
 * API Error Handling Utility
 *
 * This module provides a centralized error handler for all API route handlers.
 * Instead of duplicating try/catch logic in every route, each handler calls
 * `handleApiError` in its catch block. The function inspects the error type
 * and returns a Next.js `Response` with the correct HTTP status code and a
 * JSON body that always conforms to the `ApiErrorResponse` interface.
 *
 * Why a single handler?
 * ─────────────────────
 * Consistent error responses make life easier for client-side code — it can
 * rely on a predictable shape (`{ status, message, errors? }`) regardless of
 * what went wrong. It also keeps HTTP concerns out of the service layer,
 * which throws typed errors without knowing about status codes or JSON.
 *
 * Mapping:
 *   ValidationError → 400 (includes field-level `errors` array)
 *   NotFoundError   → 404
 *   ConflictError   → 409
 *   Unknown         → 500 (generic message to the client, full stack trace logged server-side)
 */

import { AppError, ValidationError } from "@/errors";
import { ApiErrorResponse } from "@/types/api";
import { logger } from "@/lib/logger";

/**
 * Maps a caught error to a consistent JSON `Response`.
 *
 * @param error - The unknown value caught in a route handler's catch block.
 *                Could be an `AppError` subclass, a native `Error`, or anything else.
 * @returns A `Response` object with the appropriate status code and JSON body.
 *
 * Usage in a route handler:
 * ```ts
 * export async function GET() {
 *   try {
 *     const books = await bookService.getAllBooks();
 *     return Response.json(books);
 *   } catch (error) {
 *     return handleApiError(error);
 *   }
 * }
 * ```
 */
export function handleApiError(error: unknown): Response {
  // ── Known application errors ──────────────────────────────────────────
  // AppError subclasses carry an HTTP status code and a descriptive message.
  // We check for ValidationError first because it extends AppError and adds
  // the `errors` array that clients need for inline field-level feedback.
  if (error instanceof ValidationError) {
    const body: ApiErrorResponse = {
      status: error.status,
      message: error.message,
      errors: error.errors,
    };

    return Response.json(body, { status: error.status });
  }

  if (error instanceof AppError) {
    const body: ApiErrorResponse = {
      status: error.status,
      message: error.message,
    };

    return Response.json(body, { status: error.status });
  }

  // ── Unexpected / unknown errors ───────────────────────────────────────
  // Anything that isn't an AppError is unexpected. We log the full details
  // server-side (including the stack trace) so developers can diagnose the
  // issue, but we return a generic message to the client to avoid leaking
  // internal implementation details.
  logger.error(
    { err: error instanceof Error ? error : new Error(String(error)) },
    "Unhandled error in API route",
  );

  const body: ApiErrorResponse = {
    status: 500,
    message: "An internal error occurred",
  };

  return Response.json(body, { status: 500 });
}
