/**
 * API Route Handlers — /api/books
 *
 * This file defines the HTTP handlers for the books collection endpoint.
 * Following Next.js App Router conventions, each exported async function
 * corresponds to an HTTP method:
 *
 *   GET  /api/books  → List all books
 *   POST /api/books  → Create a new book
 *
 * These handlers are intentionally thin — they parse the request, delegate
 * to the service layer for business logic, and format the response. No
 * validation or business rules live here; that's the service layer's job.
 *
 * Error handling is centralized through `handleApiError`, which maps typed
 * errors (ValidationError, NotFoundError, etc.) to consistent JSON responses.
 * This keeps the handlers clean and ensures every error follows the same
 * `ApiErrorResponse` shape defined in `src/types/api.ts`.
 */

import { bookService } from "@/services/bookService";
import { handleApiError } from "@/app/api/utils";

/**
 * GET /api/books — Retrieve all books.
 *
 * Returns a JSON array of all books ordered by most recently created first.
 * The service layer handles the database query and row-to-domain transformation.
 *
 * @returns 200 with `Book[]` JSON array
 * @returns 500 if an unexpected error occurs (e.g., database connection failure)
 */
export async function GET() {
  try {
    const books = await bookService.getAllBooks();
    return Response.json(books);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/books — Create a new book.
 *
 * Parses the JSON request body and passes it to the service layer, which
 * validates the input (via Zod), inserts the record, and returns the created
 * book with database-generated defaults (id, status=AVAILABLE, version=0).
 *
 * @returns 201 with the created `Book` JSON object
 * @returns 400 if the request body fails validation (field-level errors included)
 * @returns 500 if an unexpected error occurs
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const book = await bookService.createBook(body);
    return Response.json(book, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
