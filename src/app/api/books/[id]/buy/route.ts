/**
 * API Route Handler — PATCH /api/books/[id]/buy
 *
 * This file defines the HTTP handler for the "Buy" action, which marks a
 * book as sold. It lives in its own route segment (`/buy`) rather than
 * being another method on the `[id]` route because buying is a distinct
 * business action — it only transitions the status to SOLD, not a general
 * update of the book's content fields.
 *
 * The handler is intentionally thin: it extracts the `id` from the URL,
 * parses the `version` from the request body (needed for optimistic locking),
 * and delegates everything else to the service layer. The service handles:
 *
 *   - Input validation (version must be a non-negative integer)
 *   - Existence check (throws NotFoundError → 404)
 *   - Status transition (AVAILABLE → SOLD)
 *   - Optimistic locking (version mismatch → ConflictError → 409)
 *
 * Why PATCH instead of PUT?
 * ─────────────────────────
 * PATCH is the correct HTTP method here because we're making a partial
 * modification — only the `status` field changes. PUT implies a full
 * replacement of the resource, which doesn't match the semantics of a
 * buy action.
 */

import { bookService } from "@/services/bookService";
import { handleApiError } from "@/app/api/utils";

/**
 * PATCH /api/books/[id]/buy — Mark a book as sold.
 *
 * Expects a JSON body with `{ version: number }` for optimistic locking.
 * The version must match the book's current version in the database;
 * otherwise the service throws a ConflictError (409) to prevent lost
 * updates from concurrent purchases.
 *
 * @returns 200 with the updated `Book` JSON object (status now SOLD)
 * @returns 400 if the version field is missing or invalid
 * @returns 404 if no book exists with the given ID
 * @returns 409 if the version doesn't match (concurrent modification)
 * @returns 500 if an unexpected error occurs
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const book = await bookService.buyBook(id, body.version);
    return Response.json(book);
  } catch (error) {
    return handleApiError(error);
  }
}
