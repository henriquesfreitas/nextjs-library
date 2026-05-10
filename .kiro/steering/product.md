# Product Overview

Book Management CRUD — a full-stack web application for managing a book inventory. Users can create, view, edit, and delete book records, and mark books as sold via a "Buy" action.

## Core Capabilities

- Browse all books in a list view
- Add new books to inventory (title, author, ISBN, price)
- View full details of any book
- Edit book information with optimistic locking to prevent lost updates
- Delete books with confirmation
- Mark books as sold ("Buy" action), which locks price/status from further edits

## Key Business Rules

- New books default to `AVAILABLE` status
- Sold books (`SOLD` status) cannot have their price or status edited
- The "Buy" button only appears for `AVAILABLE` books
- All mutations use optimistic locking via a `version` field — stale updates return 409 Conflict
- Input validation runs on both client and server using a shared Zod schema
