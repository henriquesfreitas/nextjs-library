# Book Management CRUD 

A full-stack web application for managing a book inventory. Users can create, view, edit, and delete book records, and mark books as sold via a "Buy" action. Built with Next.js (App Router), React, TypeScript, and PostgreSQL (Neon), following clean architecture principles. 

## Technology Stack

| Category | Technology | Purpose |
|---|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) | Full-stack React framework with server-side rendering |
| **UI** | [React 19](https://react.dev/) | Server Components for data fetching, Client Components for interactivity |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict typing throughout the codebase |
| **Database** | [PostgreSQL (Neon)](https://neon.tech/) | Hosted Postgres, connected via the `pg` library (no ORM) |
| **Validation** | [Zod](https://zod.dev/) | Input validation shared between client and server |
| **Logging** | [Pino](https://getpino.io/) | Structured server-side logging |
| **Testing** | [Vitest](https://vitest.dev/) | Unit, integration, and component test runner |
| **E2E Testing** | [Playwright](https://playwright.dev/) | End-to-end browser tests against the running application |
| **Property Testing** | [fast-check](https://fast-check.dev/) | Property-based testing with 100+ iterations per property |
| **Component Testing** | [React Testing Library](https://testing-library.com/react) | DOM-based React component tests |
| **Containerization** | [Docker](https://www.docker.com/) | Multi-stage builds for dev and production |

## Prerequisites

- **Docker** (v20+)
- **Docker Compose** (v2+)

> **No local Node.js installation required.** All dependency installation, builds, and test execution happen exclusively inside Docker containers.

## Getting Started

### 1. Clone and configure

```bash
git clone <repository-url>
cd book-management-crud

# Create your local environment file from the template
cp .env.example .env.local

# Enable the pre-commit hook (runs tests before every commit)
git config core.hooksPath .githooks
```

Edit `.env.local` and set your Neon PostgreSQL connection string:

```dotenv
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

### 2. Run the development server

```bash
docker compose up dev
```

The application starts at [http://localhost:3000](http://localhost:3000) with hot module replacement — source code changes on the host are reflected instantly.

### 3. Run the test suite

```bash
# Run all unit/component tests
docker compose run --rm test

# Run a specific test directory
docker compose run --rm test npx vitest --run src/__tests__/unit/validators

# Run tests matching a pattern
docker compose run --rm test npx vitest --run --testNamePattern "presenter"
```

### 4. Run end-to-end tests

```bash
# Run all e2e tests (starts dev server automatically via docker-compose dependency)
docker compose run --rm e2e

# Run a specific e2e test by name
docker compose run --rm e2e npx playwright test --config=playwright.docker.config.ts --grep "Create Book"
```

> The `e2e` service depends on the `dev` service being healthy. Docker Compose starts the dev server and waits for it to respond before running Playwright tests.

### 5. Build the production image

```bash
# Build the multi-stage production image
docker build -t book-management-crud .

# Run the production container
docker run -p 3000:3000 --env-file .env.local book-management-crud
```

### 6. Rebuild after dependency changes

If `package.json` changes, rebuild the dev image to install new dependencies:

```bash
docker compose build dev
```

## Project Architecture

The application follows **clean architecture** principles with a strict layered separation of concerns. Each layer has a single responsibility, and data flows through well-defined transformation boundaries.

### Data Flow

```
View (React Components)
  → Presenter (format for display)
    → API Route Handlers (HTTP layer)
      → Service (business logic)
        → Data Access (SQL queries)
          → PostgreSQL
```

### Data Transformation

```
BookRow (DB, snake_case) → Book (domain, camelCase) → BookViewModel (UI, formatted)
```

### Folder Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Root redirect → /books
│   ├── layout.tsx                # Base HTML structure and global styles
│   ├── globals.css               # Global CSS
│   ├── api/
│   │   ├── utils.ts              # Centralized API error handler
│   │   └── books/
│   │       ├── route.ts          # GET (list), POST (create)
│   │       └── [id]/
│   │           ├── route.ts      # GET (detail), PUT (update), DELETE
│   │           └── buy/
│   │               └── route.ts  # PATCH (buy)
│   └── books/
│       ├── page.tsx              # Book list page (Server Component)
│       ├── new/
│       │   └── page.tsx          # Create book page
│       └── [id]/
│           ├── page.tsx          # Book detail page (Server Component)
│           └── edit/
│               └── page.tsx      # Edit book page
├── components/                   # React components
│   ├── BookForm.tsx              # Create/edit form (Client Component)
│   ├── BookList.tsx              # Book table with Buy buttons (Client Component)
│   ├── BookDetailClient.tsx      # Book detail interactive actions
│   ├── ConfirmDialog.tsx         # Confirmation modal
│   ├── EmptyState.tsx            # No-books message
│   ├── ErrorMessage.tsx          # Error display
│   └── Notification.tsx          # Toast-style notifications
├── presenters/
│   └── bookPresenter.ts          # Book → BookViewModel transformation
├── services/
│   └── bookService.ts            # Business logic and orchestration
├── data/
│   ├── db.ts                     # pg Pool + query helper
│   └── bookRepository.ts         # Parameterized SQL queries
├── validators/
│   └── bookSchemas.ts            # Zod schemas (shared client/server)
├── errors/
│   └── index.ts                  # AppError, ValidationError, NotFoundError, ConflictError
├── types/
│   ├── book.ts                   # BookRow, Book, CreateBookInput, UpdateBookInput
│   └── api.ts                    # ApiErrorResponse, FieldError
├── lib/
│   └── logger.ts                 # Pino logger instance
└── __tests__/
    ├── unit/
    │   ├── validators/           # Validation schema tests + property-based tests
    │   ├── presenters/           # Presenter tests + property-based tests
    │   ├── services/             # Service logic tests + property-based tests
    │   └── errors/               # Error response structure tests
    └── components/               # React component tests

e2e/
└── books.spec.ts                 # Playwright end-to-end browser tests
```

## API Endpoints

All endpoints are prefixed with `/api/books`. Request and response bodies are JSON.

### List All Books

```
GET /api/books
```

**Response:** `200 OK`

```json
[
  {
    "id": "1",
    "title": "The Pragmatic Programmer",
    "author": "David Thomas, Andrew Hunt",
    "isbn": "978-0135957059",
    "status": "AVAILABLE",
    "price": 49.99,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": null,
    "version": 0
  }
]
```

### Create a Book

```
POST /api/books
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "isbn": "978-0132350884",
  "price": 39.99
}
```

**Response:** `201 Created`

```json
{
  "id": "2",
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "isbn": "978-0132350884",
  "status": "AVAILABLE",
  "price": 39.99,
  "createdAt": "2024-01-15T11:00:00.000Z",
  "updatedAt": null,
  "version": 0
}
```

### Get Book by ID

```
GET /api/books/:id
```

**Response:** `200 OK`

```json
{
  "id": "1",
  "title": "The Pragmatic Programmer",
  "author": "David Thomas, Andrew Hunt",
  "isbn": "978-0135957059",
  "status": "AVAILABLE",
  "price": 49.99,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": null,
  "version": 0
}
```

### Update a Book

```
PUT /api/books/:id
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "The Pragmatic Programmer (20th Anniversary)",
  "author": "David Thomas, Andrew Hunt",
  "isbn": "978-0135957059",
  "price": 54.99,
  "version": 0
}
```

**Response:** `200 OK`

```json
{
  "id": "1",
  "title": "The Pragmatic Programmer (20th Anniversary)",
  "author": "David Thomas, Andrew Hunt",
  "isbn": "978-0135957059",
  "status": "AVAILABLE",
  "price": 54.99,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z",
  "version": 1
}
```

### Delete a Book

```
DELETE /api/books/:id
```

**Response:** `204 No Content` (empty body)

### Buy a Book (Mark as Sold)

```
PATCH /api/books/:id/buy
Content-Type: application/json
```

**Request Body:**

```json
{
  "version": 0
}
```

**Response:** `200 OK`

```json
{
  "id": "1",
  "title": "The Pragmatic Programmer",
  "author": "David Thomas, Andrew Hunt",
  "isbn": "978-0135957059",
  "status": "SOLD",
  "price": 49.99,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T14:00:00.000Z",
  "version": 1
}
```

### Error Responses

All errors follow a consistent structure:

```json
{
  "status": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "title", "message": "String must contain at least 1 character(s)" },
    { "field": "price", "message": "Number must be greater than or equal to 0" }
  ]
}
```

| Status | Meaning | When |
|---|---|---|
| `400` | Validation Error | Invalid input (missing fields, constraint violations). Includes `errors` array with field-level details. |
| `404` | Not Found | Book ID does not exist in the database. |
| `409` | Conflict | Optimistic locking version mismatch — the book was modified by another process. |
| `500` | Internal Server Error | Database connection failure or unexpected error. Logged server-side. |

### Endpoint Summary

| Method | Path | Description | Success | Error Codes |
|---|---|---|---|---|
| `GET` | `/api/books` | List all books | `200` | `500` |
| `POST` | `/api/books` | Create a new book | `201` | `400`, `500` |
| `GET` | `/api/books/:id` | Get book by ID | `200` | `404`, `500` |
| `PUT` | `/api/books/:id` | Update a book | `200` | `400`, `404`, `409`, `500` |
| `DELETE` | `/api/books/:id` | Delete a book | `204` | `404`, `500` |
| `PATCH` | `/api/books/:id/buy` | Mark book as sold | `200` | `400`, `404`, `409`, `500` |

## Environment Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL (Neon) connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `NODE_ENV` | No | Runtime environment (`development`, `test`, `production`) | `development` |

Environment files:

- **`.env.example`** — Template with placeholder values. Committed to version control.
- **`.env.local`** — Your actual credentials. Gitignored — never committed.

## Design Patterns

### Repository Pattern

The **data access layer** (`src/data/bookRepository.ts`) encapsulates all SQL queries behind a clean interface. The rest of the application never writes raw SQL — it calls repository methods like `findAll()`, `findById()`, `insert()`, `update()`, and `deleteById()`. This makes it straightforward to swap the database implementation without touching business logic.

All queries use **parameterized statements** to prevent SQL injection.

### Service Layer

The **service layer** (`src/services/bookService.ts`) owns all business logic. It orchestrates validation, calls the repository, and enforces business rules such as:

- New books default to `AVAILABLE` status
- Sold books cannot have their price or status edited
- Optimistic locking via a `version` field — stale updates return a `ConflictError`

### Presenter / MVP Pattern

The **presenter layer** (`src/presenters/bookPresenter.ts`) transforms domain objects (`Book`) into view models (`BookViewModel`) for the UI. This includes:

- Formatting prices as currency strings (e.g., `"$12.99"`)
- Formatting dates as human-readable strings
- Deriving display flags (`canBuy`, `canEdit`) from the book's status
- Converting `null` ISBN to empty string

This keeps formatting logic out of React components and makes it independently testable.

### Clean Architecture Layers

Each layer has a single responsibility and depends only on the layer below it:

| Layer | Responsibility | Depends On |
|---|---|---|
| **View** (React Components) | Render UI, handle user interactions | Presenter |
| **Presenter** | Transform data for display | — |
| **API Route Handlers** | Parse HTTP requests, return HTTP responses | Service |
| **Service** | Business logic, validation, error throwing | Data Access, Validator |
| **Data Access** | SQL queries, row-to-domain mapping | Database |
| **Validator** (Zod) | Input validation (shared client/server) | — |

### Optimistic Locking

Every book record has a `version` field. When updating or buying a book, the client sends the version it last read. The SQL query includes `WHERE version = $n` — if the version doesn't match (another process modified the record), zero rows are updated and the service throws a `ConflictError` (HTTP 409). This prevents lost updates without pessimistic database locks.

### Custom Error Hierarchy

Typed error classes (`ValidationError`, `NotFoundError`, `ConflictError`) extend a base `AppError`. The centralized `handleApiError` utility maps each error type to the correct HTTP status code and response structure, ensuring consistent error responses across all endpoints.

## Testing

The project uses a layered testing strategy with both example-based and property-based tests.

```bash
# Run all tests
docker compose run --rm test

# Run specific test suites
docker compose run --rm test npx vitest --run src/__tests__/unit/validators
docker compose run --rm test npx vitest --run src/__tests__/unit/presenters
docker compose run --rm test npx vitest --run src/__tests__/unit/services
docker compose run --rm test npx vitest --run src/__tests__/unit/errors
docker compose run --rm test npx vitest --run src/__tests__/components
```

### Property-Based Tests

Property-based tests use `fast-check` to verify that invariants hold across hundreds of randomly generated inputs (minimum 100 iterations per property):

| Property | What It Verifies |
|---|---|
| Presenter field completeness | `toBookViewModel` produces all required display fields |
| Presenter status flags | `canBuy`/`canEdit` correctly derived from status |
| Validation accept/reject | Schema accepts valid inputs, rejects invalid ones |
| Created book defaults | New books have status `AVAILABLE`, version `0` |
| Update version increment | Updates increment version and set `updatedAt` |
| Buy status transition | Buy changes status to `SOLD` |
| Optimistic locking | Stale versions are rejected with conflict error |
| Input sanitization | Whitespace is trimmed, unknown fields are stripped |
| Error response structure | All errors have consistent `status` and `message` fields |

### Component Tests

React component tests use Testing Library to verify:

- **BookForm** — renders in create/edit modes, shows validation errors, disables fields for sold books
- **BookList** — renders book data, shows empty state, shows/hides Buy button by status
- **ConfirmDialog** — opens with correct message, triggers callbacks on confirm/cancel

### End-to-End Tests

E2E tests use Playwright to exercise the full application through a real browser (Chromium). They run against the live dev server and validate complete user flows:

```bash
# Run all e2e tests
docker compose run --rm e2e
```

| Test Suite | What It Covers |
|---|---|
| Book List Page | Page loads with heading and create link, empty state display |
| Create Book | Form submission, success redirect, validation errors |
| Book Detail | Displays all fields, back navigation, 404 handling |
| Edit Book | Pre-filled form, update flow, cancel navigation |
| Buy Book | Purchase from detail/list page, confirmation dialog, cancel |
| Delete Book | Deletion with confirmation, cancel, cleanup |
| Sold Book Restrictions | No buy button for sold books, disabled price field in edit |

Each test creates its own data via the API in `beforeEach` and cleans up in `afterEach`, ensuring test isolation.

## License

This project is provided as-is for educational and demonstration purposes.
