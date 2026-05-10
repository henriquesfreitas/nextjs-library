# Requirements Document

## Introduction

This document defines the requirements for a Book Management CRUD application built with React and Next.js. The application allows users to create, read, update, and delete book records stored in an existing PostgreSQL (Neon) database. Users can also mark books as sold via a dedicated "Buy" action. The system follows clean architecture principles, the MVP pattern, and addresses security concerns including input validation, SQL injection prevention, and optimistic locking for concurrent updates.

## Glossary

- **App**: The Next.js full-stack web application serving both the UI and API routes
- **Book_List_Page**: The page that displays all books in a tabular or card-based layout
- **Book_Form**: The UI component used for creating and editing book records
- **Book_API**: The set of Next.js API route handlers that perform CRUD operations against the database
- **Book_Record**: A single row in the `books` database table representing one book
- **Database**: The PostgreSQL (Neon) database containing the `books` table
- **Presenter**: The layer responsible for transforming data between the API and the UI components following the MVP pattern
- **Validator**: The module responsible for validating user input on both client and server sides
- **Status**: The state of a Book_Record, either `AVAILABLE` or `SOLD`
- **Version**: An integer field on a Book_Record used for optimistic locking to prevent lost updates during concurrent edits

## Requirements

### Requirement 1: List All Books

**User Story:** As a user, I want to see a list of all books, so that I can browse the available inventory.

#### Acceptance Criteria

1. WHEN the user navigates to the Book_List_Page, THE App SHALL fetch all Book_Records from the Database and display them in a structured layout
2. THE Book_List_Page SHALL display the following fields for each Book_Record: title, author, isbn, status, price, and created_at
3. WHEN the Database returns zero Book_Records, THE Book_List_Page SHALL display an empty state message indicating no books are available
4. IF the Database connection fails during fetch, THEN THE App SHALL display an error message to the user and log the error on the server

### Requirement 2: Create a New Book

**User Story:** As a user, I want to add a new book to the system, so that I can expand the inventory.

#### Acceptance Criteria

1. WHEN the user submits the Book_Form with valid data, THE Book_API SHALL insert a new Book_Record into the Database with status set to `AVAILABLE` and created_at set to the current timestamp
2. THE Validator SHALL enforce the following constraints on the Book_Form input: title is required and has a maximum length of 100 characters, author is required and has a maximum length of 255 characters, isbn is optional and has a maximum length of 255 characters, and price is required and must be a non-negative number
3. WHEN the Book_API successfully creates a Book_Record, THE App SHALL redirect the user to the Book_List_Page and display a success notification
4. IF the Validator detects invalid input on the client side, THEN THE Book_Form SHALL display field-level error messages without submitting to the Book_API
5. IF the Book_API receives invalid input that bypasses client validation, THEN THE Book_API SHALL return a 400 status code with descriptive error messages
6. IF the Database rejects the insert operation, THEN THE Book_API SHALL return an appropriate error response and THE App SHALL display an error message to the user

### Requirement 3: View Book Details

**User Story:** As a user, I want to view the full details of a specific book, so that I can see all information about that book.

#### Acceptance Criteria

1. WHEN the user selects a Book_Record from the Book_List_Page, THE App SHALL navigate to a detail view displaying all fields of the Book_Record: id, title, author, isbn, status, price, created_at, and updated_at
2. IF the requested Book_Record does not exist in the Database, THEN THE App SHALL display a "Book not found" message and provide navigation back to the Book_List_Page
3. IF the Database connection fails during fetch, THEN THE App SHALL display an error message to the user

### Requirement 4: Update an Existing Book

**User Story:** As a user, I want to edit a book's information, so that I can correct or update its details.

#### Acceptance Criteria

1. WHEN the user submits the Book_Form with valid updated data, THE Book_API SHALL update the corresponding Book_Record in the Database, set updated_at to the current timestamp, and increment the Version field
2. THE Book_API SHALL use optimistic locking by including the Version field in the update query's WHERE clause to prevent lost updates from concurrent edits
3. IF the Version in the update request does not match the current Version in the Database, THEN THE Book_API SHALL return a 409 Conflict status code and THE App SHALL inform the user that the Book_Record was modified by another process
4. THE Validator SHALL enforce the same input constraints for update operations as defined in Requirement 2, Acceptance Criterion 2
5. WHEN the Book_API successfully updates a Book_Record, THE App SHALL redirect the user to the book detail view and display a success notification
6. IF the requested Book_Record does not exist in the Database, THEN THE Book_API SHALL return a 404 status code
7. WHILE a Book_Record has a Status of `SOLD`, THE Book_Form SHALL disable editing of the status and price fields to prevent modification of completed sales

### Requirement 5: Delete a Book

**User Story:** As a user, I want to delete a book from the system, so that I can remove books that are no longer relevant.

#### Acceptance Criteria

1. WHEN the user confirms deletion of a Book_Record, THE Book_API SHALL remove the corresponding Book_Record from the Database
2. THE App SHALL display a confirmation dialog before executing the delete operation to prevent accidental deletions
3. WHEN the Book_API successfully deletes a Book_Record, THE App SHALL redirect the user to the Book_List_Page and display a success notification
4. IF the requested Book_Record does not exist in the Database, THEN THE Book_API SHALL return a 404 status code
5. IF the Database rejects the delete operation, THEN THE Book_API SHALL return an appropriate error response and THE App SHALL display an error message to the user

### Requirement 6: Buy a Book (Mark as Sold)

**User Story:** As a user, I want to mark a book as sold by clicking a "Buy" button, so that I can track which books have been purchased.

#### Acceptance Criteria

1. WHILE a Book_Record has a Status of `AVAILABLE`, THE Book_List_Page and the book detail view SHALL display a "Buy" button for that Book_Record
2. WHEN the user clicks the "Buy" button and confirms the action, THE Book_API SHALL update the Book_Record's Status to `SOLD` and set updated_at to the current timestamp
3. THE Book_API SHALL use optimistic locking via the Version field when updating the Status to prevent concurrent purchase conflicts
4. IF the Version in the buy request does not match the current Version in the Database, THEN THE Book_API SHALL return a 409 Conflict status code and THE App SHALL inform the user that the Book_Record was modified by another process
5. WHILE a Book_Record has a Status of `SOLD`, THE App SHALL hide the "Buy" button for that Book_Record
6. WHEN the buy operation succeeds, THE App SHALL display a success notification and refresh the displayed data to reflect the updated Status

### Requirement 7: Input Validation and Security

**User Story:** As a developer, I want the application to validate all inputs and follow secure coding practices, so that the system is protected against common vulnerabilities.

#### Acceptance Criteria

1. THE Book_API SHALL use parameterized queries for all Database operations to prevent SQL injection attacks
2. THE Validator SHALL perform input validation on both the client side (for user experience) and the server side (for security) using a shared validation schema
3. THE Book_API SHALL sanitize all user-provided string inputs by trimming whitespace before processing
4. THE App SHALL store Database credentials in environment variables and THE App SHALL NOT expose Database credentials in client-side code or API responses
5. IF the Book_API receives a request with an unexpected field not defined in the Book_Record schema, THEN THE Book_API SHALL strip the unexpected field before processing
6. THE Book_API SHALL return consistent error response structures containing a status code, an error message, and field-level validation details when applicable

### Requirement 8: API Design and Architecture

**User Story:** As a developer, I want the application to follow clean architecture and consistent API conventions, so that the codebase is maintainable and extensible.

#### Acceptance Criteria

1. THE App SHALL implement a layered architecture separating concerns into presentation (React components and Presenters), API route handlers, service logic, and data access layers
2. THE Book_API SHALL expose RESTful endpoints following these conventions: GET /api/books for listing, POST /api/books for creation, GET /api/books/[id] for retrieval, PUT /api/books/[id] for update, and DELETE /api/books/[id] for deletion
3. THE Book_API SHALL expose a PATCH /api/books/[id]/buy endpoint for the buy operation to separate the purchase action from general updates
4. THE App SHALL use the Presenter layer to transform Book_Records from the API response format into the view model format consumed by React components
5. THE Book_API SHALL return appropriate HTTP status codes: 200 for successful retrieval, 201 for successful creation, 204 for successful deletion, 400 for validation errors, 404 for missing resources, and 409 for version conflicts
