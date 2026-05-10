/**
 * API Route Handlers — /api/books/[id]
 *
 * This file defines the HTTP handlers for individual book operations.
 * Following Next.js App Router conventions, each exported async function
 * corresponds to an HTTP method:
 *
 *   GET    /api/books/[id]  → Retrieve a single book by ID
 *   PUT    /api/books/[id]  → Update an existing book (with optimistic locking)
 *   DELETE /api/books/[id]  → Remove a book from the database
 *
 * Like the collection endpoint (`/api/books/route.ts`), these handlers are
 * intentionally thin. They extract the dynamic `id` parameter from the URL,
 * delegate to the service layer, and format the response. Business logic
 * (validation, not-found checks, version conflict detection) lives in the
 * service layer.
 *
 * In Next.js 15 App Router, dynamic route params are delivered as a Promise
 * that must be awaited. This is a change from earlier versions where params
 * were a plain object. The second argument to each handler provides the
 * `params` promise containing the `id` segment.
 */

import { bookService } from "@/services/bookService";
import { handleApiError } from "@/app/api/utils";

/**
 * GET /api/books/[id] — Retrieve a single book by its ID.
 *
 * The service layer throws `NotFoundError` if no book exists with the given
 * ID, which `handleApiError` converts into a 404 JSON response.
 *
 * @returns 200 with the `Book` JSON object
 * @returns 404 if no book exists with the given ID
 * @returns 500 if an unexpected error occurs
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const book = await bookService.getBookById(id);
    return Response.json(book);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/books/[id] — Update an existing book.
 *
 * Parses the JSON request body and passes it along with the book ID to the
 * service layer. The service handles:
 *   - Input validation (Zod schema)
 *   - Existence check (throws NotFoundError → 404)
 *   - Sold-book restrictions (cannot change price of a sold book → 400)
 *   - Optimistic locking (version mismatch → ConflictError → 409)
 *
 * The request body must include a `version` field for optimistic locking.
 * If the version doesn't match the database's current version, the service
 * throws a ConflictError and the client receives a 409 response.
 *
 * @returns 200 with the updated `Book` JSON object
 * @returns 400 if the request body fails validation
 * @returns 404 if no book exists with the given ID
 * @returns 409 if the version doesn't match (concurrent edit detected)
 * @returns 500 if an unexpected error occurs
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const book = await bookService.updateBook(id, body);
    return Response.json(book);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/books/[id] — Remove a book from the database.
 *
 * The service layer throws `NotFoundError` if no book exists with the given
 * ID. On successful deletion, returns 204 No Content with an empty body,
 * following REST conventions for delete operations.
 *
 * @returns 204 with no body on successful deletion
 * @returns 404 if no book exists with the given ID
 * @returns 500 if an unexpected error occurs
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await bookService.deleteBook(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
