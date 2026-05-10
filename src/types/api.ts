/**
 * API Error Response Types
 *
 * These types define the consistent error response structure returned by all
 * API route handlers. Every error — whether a validation failure, a missing
 * resource, or an internal server error — follows the same shape so that
 * client-side code can handle errors uniformly.
 *
 * The error handling utility (`src/app/api/utils.ts`) maps custom error
 * classes (ValidationError, NotFoundError, ConflictError) into this format
 * before sending the HTTP response.
 */

/**
 * Standard error response body returned by all API endpoints.
 *
 * - `status`: HTTP status code (e.g., 400, 404, 409, 500)
 * - `message`: Human-readable description of the error
 * - `errors`: Optional array of field-level validation errors, present only
 *   when the error is a validation failure (status 400). This allows the
 *   client to display inline error messages next to individual form fields.
 */
export interface ApiErrorResponse {
  status: number;
  message: string;
  errors?: FieldError[];
}

/**
 * Describes a validation error on a specific input field.
 *
 * Used inside `ApiErrorResponse.errors` to communicate which field failed
 * validation and why. For example:
 *   { field: "title", message: "Title is required" }
 *   { field: "price", message: "Price must be a non-negative number" }
 */
export interface FieldError {
  field: string;
  message: string;
}
