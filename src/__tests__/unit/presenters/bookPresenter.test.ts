import { describe, it, expect } from "vitest";
import {
  toBookViewModel,
  toBookListViewModel,
} from "@/presenters/bookPresenter";
import type { Book } from "@/types/book";

/**
 * Unit tests for the book presenter layer.
 *
 * These tests verify specific formatting and transformation behavior
 * using concrete examples. Property-based tests (Task 7.2) will cover
 * universal properties across all valid inputs.
 */

/** Helper to create a valid Book with sensible defaults. */
function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "1",
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "978-0132350884",
    status: "AVAILABLE",
    price: 12.99,
    createdAt: new Date("2025-01-15T15:30:00Z"),
    updatedAt: null,
    version: 0,
    ...overrides,
  };
}

describe("toBookViewModel", () => {
  it("formats price as a USD currency string", () => {
    const vm = toBookViewModel(makeBook({ price: 12.99 }));
    expect(vm.price).toBe("$12.99");
  });

  it("formats zero price correctly", () => {
    const vm = toBookViewModel(makeBook({ price: 0 }));
    expect(vm.price).toBe("$0.00");
  });

  it("formats large price correctly", () => {
    const vm = toBookViewModel(makeBook({ price: 1234.5 }));
    expect(vm.price).toBe("$1,234.50");
  });

  it("converts null isbn to empty string", () => {
    const vm = toBookViewModel(makeBook({ isbn: null }));
    expect(vm.isbn).toBe("");
  });

  it("preserves non-null isbn", () => {
    const vm = toBookViewModel(makeBook({ isbn: "978-0132350884" }));
    expect(vm.isbn).toBe("978-0132350884");
  });

  it("formats createdAt as a human-readable date string", () => {
    const vm = toBookViewModel(makeBook());
    // The exact format depends on the locale, but it should be a non-empty string
    expect(typeof vm.createdAt).toBe("string");
    expect(vm.createdAt.length).toBeGreaterThan(0);
  });

  it("formats updatedAt when present", () => {
    const vm = toBookViewModel(
      makeBook({ updatedAt: new Date("2025-06-01T10:00:00Z") })
    );
    expect(typeof vm.updatedAt).toBe("string");
    expect(vm.updatedAt!.length).toBeGreaterThan(0);
  });

  it("returns null updatedAt when book has no updatedAt", () => {
    const vm = toBookViewModel(makeBook({ updatedAt: null }));
    expect(vm.updatedAt).toBeNull();
  });

  it("sets canBuy to true when status is AVAILABLE", () => {
    const vm = toBookViewModel(makeBook({ status: "AVAILABLE" }));
    expect(vm.canBuy).toBe(true);
  });

  it("sets canBuy to false when status is SOLD", () => {
    const vm = toBookViewModel(makeBook({ status: "SOLD" }));
    expect(vm.canBuy).toBe(false);
  });

  it("sets canEdit to true when status is AVAILABLE", () => {
    const vm = toBookViewModel(makeBook({ status: "AVAILABLE" }));
    expect(vm.canEdit).toBe(true);
  });

  it("sets canEdit to false when status is SOLD", () => {
    const vm = toBookViewModel(makeBook({ status: "SOLD" }));
    expect(vm.canEdit).toBe(false);
  });

  it("preserves id, title, author, status, and version unchanged", () => {
    const book = makeBook({
      id: "42",
      title: "Test Title",
      author: "Test Author",
      status: "SOLD",
      version: 5,
    });
    const vm = toBookViewModel(book);

    expect(vm.id).toBe("42");
    expect(vm.title).toBe("Test Title");
    expect(vm.author).toBe("Test Author");
    expect(vm.status).toBe("SOLD");
    expect(vm.version).toBe(5);
  });
});

describe("toBookListViewModel", () => {
  it("transforms an array of books into view models", () => {
    const books = [
      makeBook({ id: "1", title: "Book A" }),
      makeBook({ id: "2", title: "Book B", status: "SOLD" }),
    ];
    const vms = toBookListViewModel(books);

    expect(vms).toHaveLength(2);
    expect(vms[0].id).toBe("1");
    expect(vms[0].title).toBe("Book A");
    expect(vms[0].canBuy).toBe(true);
    expect(vms[1].id).toBe("2");
    expect(vms[1].title).toBe("Book B");
    expect(vms[1].canBuy).toBe(false);
  });

  it("returns an empty array for empty input", () => {
    const vms = toBookListViewModel([]);
    expect(vms).toEqual([]);
  });
});

import fc from "fast-check";

/**
 * Property-Based Tests for the book presenter layer.
 *
 * These tests use fast-check to verify universal properties that must hold
 * across ALL valid Book inputs, complementing the unit tests above which
 * check specific examples.
 */

/**
 * Generates a valid Date from a random integer timestamp.
 *
 * Uses integer timestamps (ms since epoch) mapped to Date objects to avoid
 * fast-check v4's fc.date() occasionally producing Date(NaN).
 * Range: 2000-01-01 to 2099-12-31.
 */
const validDateArbitrary = fc
  .integer({
    min: new Date("2000-01-01T00:00:00Z").getTime(),
    max: new Date("2099-12-31T23:59:59Z").getTime(),
  })
  .map((ts) => new Date(ts));

/**
 * Arbitrary that generates valid Book objects with realistic random data.
 *
 * Uses fc.record to mirror the Book interface from src/types/book.ts,
 * constraining each field to its domain (e.g., non-empty title ≤100 chars,
 * non-negative price, status is one of AVAILABLE or SOLD).
 */
const bookArbitrary = fc.record({
  id: fc.nat({ max: 9999999999 }).map(String),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  author: fc.string({ minLength: 1, maxLength: 255 }),
  isbn: fc.oneof(fc.string({ minLength: 0, maxLength: 255 }), fc.constant(null)),
  status: fc.constantFrom("AVAILABLE" as const, "SOLD" as const),
  price: fc.double({ min: 0, max: 999999.99, noNaN: true, noDefaultInfinity: true }),
  createdAt: validDateArbitrary,
  updatedAt: fc.oneof(validDateArbitrary, fc.constant(null)),
  version: fc.nat({ max: 1000 }),
});

// Feature: book-management-crud, Property 1: Presenter produces all required fields
describe("Property 1: Presenter produces all required fields", () => {
  it("toBookViewModel produces non-undefined values for all required display fields for any valid Book", () => {
    /**
     * **Validates: Requirements 1.2, 3.1**
     *
     * For any valid Book, the presenter must produce a BookViewModel where
     * every required display field (id, title, author, isbn, status, price,
     * createdAt, version) is defined and non-undefined.
     */
    fc.assert(
      fc.property(bookArbitrary, (book) => {
        const vm = toBookViewModel(book);

        expect(vm.id).not.toBeUndefined();
        expect(vm.title).not.toBeUndefined();
        expect(vm.author).not.toBeUndefined();
        expect(vm.isbn).not.toBeUndefined();
        expect(vm.status).not.toBeUndefined();
        expect(vm.price).not.toBeUndefined();
        expect(vm.createdAt).not.toBeUndefined();
        expect(vm.version).not.toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: book-management-crud, Property 2: Presenter status flags are correctly derived
describe("Property 2: Presenter status flags are correctly derived", () => {
  /** Arbitrary that generates Books with status fixed to AVAILABLE */
  const availableBookArbitrary = fc.record({
    id: fc.nat({ max: 9999999999 }).map(String),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    author: fc.string({ minLength: 1, maxLength: 255 }),
    isbn: fc.oneof(fc.string({ minLength: 0, maxLength: 255 }), fc.constant(null)),
    status: fc.constant("AVAILABLE" as const),
    price: fc.double({ min: 0, max: 999999.99, noNaN: true, noDefaultInfinity: true }),
    createdAt: validDateArbitrary,
    updatedAt: fc.oneof(validDateArbitrary, fc.constant(null)),
    version: fc.nat({ max: 1000 }),
  });

  /** Arbitrary that generates Books with status fixed to SOLD */
  const soldBookArbitrary = fc.record({
    id: fc.nat({ max: 9999999999 }).map(String),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    author: fc.string({ minLength: 1, maxLength: 255 }),
    isbn: fc.oneof(fc.string({ minLength: 0, maxLength: 255 }), fc.constant(null)),
    status: fc.constant("SOLD" as const),
    price: fc.double({ min: 0, max: 999999.99, noNaN: true, noDefaultInfinity: true }),
    createdAt: validDateArbitrary,
    updatedAt: fc.oneof(validDateArbitrary, fc.constant(null)),
    version: fc.nat({ max: 1000 }),
  });

  it("sets canBuy and canEdit to true for any AVAILABLE book", () => {
    /**
     * **Validates: Requirements 4.7, 6.1, 6.5**
     *
     * For any Book with status AVAILABLE, the presenter must derive
     * canBuy = true and canEdit = true, enabling purchase and edit actions.
     */
    fc.assert(
      fc.property(availableBookArbitrary, (book) => {
        const vm = toBookViewModel(book);

        expect(vm.canBuy).toBe(true);
        expect(vm.canEdit).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("sets canBuy and canEdit to false for any SOLD book", () => {
    /**
     * **Validates: Requirements 4.7, 6.1, 6.5**
     *
     * For any Book with status SOLD, the presenter must derive
     * canBuy = false and canEdit = false, preventing further purchase or edit.
     */
    fc.assert(
      fc.property(soldBookArbitrary, (book) => {
        const vm = toBookViewModel(book);

        expect(vm.canBuy).toBe(false);
        expect(vm.canEdit).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
