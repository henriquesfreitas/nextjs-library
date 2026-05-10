# Project Structure

## Architecture

Clean layered architecture following MVP pattern:

```
View (React Components) → Presenter → API Route Handlers → Service → Data Access → PostgreSQL
```

Each layer has a single responsibility. Data flows through transformation boundaries:
- `BookRow` (DB, snake_case) → `Book` (domain, camelCase) → `BookViewModel` (UI, formatted)

## Folder Layout

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Root redirect to /books
│   ├── api/
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
│   ├── BookList.tsx              # Book table/cards with Buy button
│   ├── ConfirmDialog.tsx         # Confirmation modal
│   ├── EmptyState.tsx            # No-books message
│   ├── ErrorMessage.tsx          # Error display
│   └── Notification.tsx          # Toast notifications
├── presenters/
│   └── bookPresenter.ts          # Book → BookViewModel transformation
├── services/
│   └── bookService.ts            # Business logic, orchestrates validation + data access
├── data/
│   ├── db.ts                     # pg Pool + query helper
│   └── bookRepository.ts         # SQL queries (parameterized)
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
    │   ├── validators/           # Validation schema tests + PBT
    │   ├── presenters/           # Presenter tests + PBT
    │   ├── services/             # Service logic tests + PBT
    │   └── errors/               # Error response structure tests
    ├── integration/
    │   └── api/                  # API route handler tests
    └── components/               # React component tests
```

## Conventions

- **Server Components** for read-only pages (list, detail)
- **Client Components** for interactive UI (forms, dialogs, buy buttons)
- **API routes** handle HTTP concerns only — delegate to service layer
- **Service layer** owns business logic and throws typed errors (`NotFoundError`, `ConflictError`, etc.)
- **Data access layer** owns SQL — all queries parameterized, returns `BookRow`
- **Presenter** formats data for display — currency strings, date formatting, derived flags (`canBuy`, `canEdit`)
- **Validators** are shared — same Zod schema runs on client and server
- **Property-based tests** use `fast-check` with minimum 100 iterations, tagged with property number comments
