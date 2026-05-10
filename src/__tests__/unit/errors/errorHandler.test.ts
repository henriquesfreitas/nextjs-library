/**
 * Unit Tests for API Error Handling Utility
 *
 * These tests verify that `handleApiError` correctly maps each error type
 * to the appropriate HTTP status code and JSON response body conforming
 * to the `ApiErrorResponse` interface.
 *
 * The tests cover:
 *   - ValidationError → 400 with field-level `errors` array
 *   - NotFoundError   → 404 with descriptive message
 *   - ConflictError   → 409 with conflict message
 *   - Unknown errors  → 500 with generic message (no internal details leaked)
 *
 * Requirements reference: 7.6, 8.5
 */

import { describe, it, expect, vi } from "vitest";
import { handleApiError } from "@/app/api/utils";
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
} from "@/errors";

// Mock the Pino logger to prevent actual log output during tests and to
// verify that unknown errors are logged with full details.
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import the mocked logger so we can assert on calls
import { logger } from "@/lib/logger";

describe("handleApiError", () => {
  // ── ValidationError → 400 ──────────────────────────────────────────────

  it("returns 400 with errors array for ValidationError", async () => {
    const fieldErrors = [
      { field: "title", message: "Title is required" },
      { field: "price", message: "Price must be a non-negative number" },
    ];
    const error = new ValidationError(fieldErrors);

    const response = handleApiError(error);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe(400);
    expect(body.message).toBe("Validation failed");
    expect(body.errors).toEqual(fieldErrors);
  });

  it("returns 400 with empty errors array for ValidationError with no field errors", async () => {
    const error = new ValidationError([]);

    const response = handleApiError(error);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.status).toBe(400);
    expect(body.message).toBe("Validation failed");
    expect(body.errors).toEqual([]);
  });

  // ── NotFoundError → 404 ────────────────────────────────────────────────

  it("returns 404 for NotFoundError with default resource", async () => {
    const error = new NotFoundError();

    const response = handleApiError(error);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.status).toBe(404);
    expect(body.message).toBe("Resource not found");
    expect(body.errors).toBeUndefined();
  });

  it("returns 404 for NotFoundError with custom resource name", async () => {
    const error = new NotFoundError("Book");

    const response = handleApiError(error);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.status).toBe(404);
    expect(body.message).toBe("Book not found");
    expect(body.errors).toBeUndefined();
  });

  // ── ConflictError → 409 ────────────────────────────────────────────────

  it("returns 409 for ConflictError with default message", async () => {
    const error = new ConflictError();

    const response = handleApiError(error);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.status).toBe(409);
    expect(body.message).toBe("Resource was modified by another process");
    expect(body.errors).toBeUndefined();
  });

  it("returns 409 for ConflictError with custom message", async () => {
    const error = new ConflictError(
      "Book was modified by another process. Please refresh and try again."
    );

    const response = handleApiError(error);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.status).toBe(409);
    expect(body.message).toBe(
      "Book was modified by another process. Please refresh and try again."
    );
  });

  // ── Generic AppError ───────────────────────────────────────────────────

  it("returns correct status for a generic AppError", async () => {
    const error = new AppError(422, "Unprocessable entity");

    const response = handleApiError(error);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.status).toBe(422);
    expect(body.message).toBe("Unprocessable entity");
    expect(body.errors).toBeUndefined();
  });

  // ── Unknown errors → 500 ───────────────────────────────────────────────

  it("returns 500 with generic message for unknown Error", async () => {
    const error = new Error("Database connection failed");

    const response = handleApiError(error);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.status).toBe(500);
    expect(body.message).toBe("An internal error occurred");
    expect(body.errors).toBeUndefined();
  });

  it("returns 500 with generic message for non-Error thrown value", async () => {
    const response = handleApiError("something went wrong");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.status).toBe(500);
    expect(body.message).toBe("An internal error occurred");
  });

  it("returns 500 with generic message for null error", async () => {
    const response = handleApiError(null);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.status).toBe(500);
    expect(body.message).toBe("An internal error occurred");
  });

  // ── Logging for unknown errors ─────────────────────────────────────────

  it("logs unknown Error with full details via Pino logger", () => {
    const error = new Error("DB timeout");

    handleApiError(error);

    expect(logger.error).toHaveBeenCalledWith(
      { err: error },
      "Unhandled error in API route"
    );
  });

  it("logs non-Error thrown value wrapped in an Error via Pino logger", () => {
    handleApiError("string error");

    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      "Unhandled error in API route"
    );
  });

  it("does not log known AppError subclasses", () => {
    vi.mocked(logger.error).mockClear();

    handleApiError(new NotFoundError("Book"));
    handleApiError(new ConflictError());
    handleApiError(new ValidationError([{ field: "title", message: "Required" }]));

    expect(logger.error).not.toHaveBeenCalled();
  });
});

// Feature: book-management-crud, Property 9: Error responses have consistent structure

import fc from "fast-check";

describe("Property 9: Error responses have consistent structure", () => {
  /**
   * Validates: Requirements 7.6
   *
   * For any API error response, the response body SHALL contain a `status`
   * field (number) and a `message` field (string). When the error is a
   * validation error, the response body SHALL additionally contain an `errors`
   * array of objects each with `field` and `message` string fields.
   */

  // ── Arbitrary generators ────────────────────────────────────────────────

  /** Generates random AppError instances with arbitrary status codes and messages */
  const appErrorArb = fc
    .record({
      status: fc.integer({ min: 400, max: 599 }),
      message: fc.string({ minLength: 1, maxLength: 200 }),
    })
    .map(({ status, message }) => new AppError(status, message));

  /** Generates random ValidationError instances with random field error arrays */
  const validationErrorArb = fc
    .array(
      fc.record({
        field: fc.string({ minLength: 1, maxLength: 50 }),
        message: fc.string({ minLength: 1, maxLength: 200 }),
      }),
      { minLength: 0, maxLength: 10 }
    )
    .map((errors) => new ValidationError(errors));

  /** Generates random NotFoundError instances with optional resource names */
  const notFoundErrorArb = fc
    .oneof(
      fc.constant(new NotFoundError()),
      fc.string({ minLength: 1, maxLength: 50 }).map((r) => new NotFoundError(r))
    );

  /** Generates random ConflictError instances with optional custom messages */
  const conflictErrorArb = fc
    .oneof(
      fc.constant(new ConflictError()),
      fc.string({ minLength: 1, maxLength: 200 }).map((m) => new ConflictError(m))
    );

  /** Generates random unknown Error instances (non-AppError) */
  const unknownErrorArb = fc
    .oneof(
      fc.string({ minLength: 0, maxLength: 200 }).map((m) => new Error(m)),
      fc.string({ minLength: 0, maxLength: 200 }),
      fc.constant(null),
      fc.constant(undefined),
      fc.integer()
    );

  // ── Property: All error types produce status (number) + message (string) ──

  it("all AppError instances produce response with status (number) and message (string)", async () => {
    await fc.assert(
      fc.asyncProperty(appErrorArb, async (error) => {
        const response = handleApiError(error);
        const body = await response.json();

        expect(typeof body.status).toBe("number");
        expect(typeof body.message).toBe("string");
        expect(body.status).toBe(error.status);
        expect(body.message).toBe(error.message);
      }),
      { numRuns: 100 }
    );
  });

  it("all NotFoundError instances produce response with status (number) and message (string)", async () => {
    await fc.assert(
      fc.asyncProperty(notFoundErrorArb, async (error) => {
        const response = handleApiError(error);
        const body = await response.json();

        expect(typeof body.status).toBe("number");
        expect(typeof body.message).toBe("string");
        expect(body.status).toBe(404);
        expect(body.errors).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it("all ConflictError instances produce response with status (number) and message (string)", async () => {
    await fc.assert(
      fc.asyncProperty(conflictErrorArb, async (error) => {
        const response = handleApiError(error);
        const body = await response.json();

        expect(typeof body.status).toBe("number");
        expect(typeof body.message).toBe("string");
        expect(body.status).toBe(409);
        expect(body.errors).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it("all unknown error types produce response with status (number) and message (string)", async () => {
    await fc.assert(
      fc.asyncProperty(unknownErrorArb, async (error) => {
        const response = handleApiError(error);
        const body = await response.json();

        expect(typeof body.status).toBe("number");
        expect(typeof body.message).toBe("string");
        expect(body.status).toBe(500);
        expect(body.message).toBe("An internal error occurred");
        expect(body.errors).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  // ── Property: ValidationError responses include well-structured errors array ──

  it("all ValidationError instances produce response with errors array of { field: string, message: string }", async () => {
    await fc.assert(
      fc.asyncProperty(validationErrorArb, async (error) => {
        const response = handleApiError(error);
        const body = await response.json();

        // Base structure assertions
        expect(typeof body.status).toBe("number");
        expect(typeof body.message).toBe("string");
        expect(body.status).toBe(400);
        expect(body.message).toBe("Validation failed");

        // Errors array structure assertions
        expect(Array.isArray(body.errors)).toBe(true);
        expect(body.errors.length).toBe(error.errors.length);

        for (const fieldError of body.errors) {
          expect(typeof fieldError.field).toBe("string");
          expect(typeof fieldError.message).toBe("string");
        }
      }),
      { numRuns: 100 }
    );
  });

  // ── Property: Any error type fed to handleApiError always produces consistent structure ──

  it("any error type always produces a response body with status (number) and message (string)", async () => {
    const anyErrorArb = fc.oneof(
      appErrorArb,
      validationErrorArb,
      notFoundErrorArb,
      conflictErrorArb,
      unknownErrorArb
    );

    await fc.assert(
      fc.asyncProperty(anyErrorArb, async (error) => {
        const response = handleApiError(error);
        const body = await response.json();

        // Every response must have status as number and message as string
        expect(typeof body.status).toBe("number");
        expect(typeof body.message).toBe("string");
        expect(body.status).toBeGreaterThanOrEqual(400);
        expect(body.status).toBeLessThanOrEqual(599);
        expect(body.message.length).toBeGreaterThan(0);

        // If errors is present, it must be an array of { field: string, message: string }
        if (body.errors !== undefined) {
          expect(Array.isArray(body.errors)).toBe(true);
          for (const fieldError of body.errors) {
            expect(typeof fieldError.field).toBe("string");
            expect(typeof fieldError.message).toBe("string");
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
