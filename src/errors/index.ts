/**
 * Custom Error Hierarchy for API Error Handling
 *
 * This module defines a hierarchy of error classes that map directly to HTTP
 * status codes. The API route handlers catch these typed errors and convert
 * them into consistent JSON responses (see `src/app/api/utils.ts`).
 *
 * The hierarchy:
 *
 *   Error (built-in)
 *     └── AppError (base, carries an HTTP status code)
 *           ├── ValidationError  → 400 Bad Request
 *           ├── NotFoundError    → 404 Not Found
 *           └── ConflictError    → 409 Conflict
 *
 * Why custom error classes?
 * ─────────────────────────
 * Throwing typed errors from the service layer lets the API handlers use a
 * single try/catch block and branch on `instanceof` to pick the right HTTP
 * status code. This keeps HTTP concerns out of the service layer while
 * ensuring every error response follows the same `ApiErrorResponse` shape
 * defined in `src/types/api.ts`.
 */

import { FieldError } from "@/types/api";

/**
 * Base application error that carries an HTTP status code.
 *
 * All domain-specific errors extend this class so that the API error handler
 * can distinguish application errors (expected) from unexpected runtime errors
 * (which become 500 Internal Server Error).
 */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    // Restore the prototype chain — required when extending built-in classes
    // in TypeScript, otherwise `instanceof` checks may fail after transpilation.
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
  }
}

/**
 * 400 Bad Request — thrown when user input fails Zod schema validation.
 *
 * Carries an array of `FieldError` objects so the API handler can include
 * per-field error messages in the response body. The client uses these to
 * display inline validation feedback next to each form field.
 *
 * Example response:
 * ```json
 * {
 *   "status": 400,
 *   "message": "Validation failed",
 *   "errors": [
 *     { "field": "title", "message": "Title is required" },
 *     { "field": "price", "message": "Price must be a non-negative number" }
 *   ]
 * }
 * ```
 */
export class ValidationError extends AppError {
  constructor(public errors: FieldError[]) {
    super(400, "Validation failed");
  }
}

/**
 * 404 Not Found — thrown when a requested resource does not exist.
 *
 * Accepts an optional `resource` name so the error message reads naturally
 * for any entity (e.g., "Book not found" instead of a generic "Not found").
 *
 * Example response:
 * ```json
 * { "status": 404, "message": "Book not found" }
 * ```
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(404, `${resource} not found`);
  }
}

/**
 * 409 Conflict — thrown when optimistic locking detects a version mismatch.
 *
 * This happens when two users try to update or buy the same book concurrently.
 * The first write succeeds and increments the version; the second write finds
 * a version mismatch and receives this error, prompting the user to refresh
 * and retry.
 *
 * Example response:
 * ```json
 * { "status": 409, "message": "Resource was modified by another process" }
 * ```
 */
export class ConflictError extends AppError {
  constructor(
    message: string = "Resource was modified by another process",
  ) {
    super(409, message);
  }
}
