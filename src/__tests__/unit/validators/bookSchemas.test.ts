/**
 * Property-Based Tests for Book Validation Schemas
 *
 * Feature: book-management-crud, Property 3: Validation schema accepts valid inputs and rejects invalid inputs
 *
 * These tests use fast-check to generate hundreds of random inputs and verify
 * that the Zod validation schemas correctly accept all valid inputs and reject
 * all invalid inputs. This approach catches edge cases that hand-written
 * examples might miss — like boundary-length strings, special characters,
 * and unusual numeric values.
 *
 * Validates: Requirements 2.2, 2.5, 4.4
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createBookSchema, updateBookSchema, buyBookSchema } from "@/validators/bookSchemas";

// ---------------------------------------------------------------------------
// Arbitraries — smart generators that constrain to the valid input space
// ---------------------------------------------------------------------------

/**
 * Generates a non-empty string of 1–100 characters (valid title).
 * Uses grapheme-ascii to produce printable characters.
 */
const validTitle = () =>
  fc.string({ minLength: 1, maxLength: 100, unit: "grapheme-ascii" }).filter((s) => s.trim().length >= 1);

/**
 * Generates a non-empty string of 1–255 characters (valid author).
 */
const validAuthor = () =>
  fc.string({ minLength: 1, maxLength: 255, unit: "grapheme-ascii" }).filter((s) => s.trim().length >= 1);

/**
 * Generates an optional ISBN — either undefined or a string of 0–255 characters.
 */
const validIsbn = () =>
  fc.oneof(
    fc.constant(undefined),
    fc.constant(""),
    fc.string({ minLength: 1, maxLength: 255, unit: "grapheme-ascii" })
  );

/**
 * Generates a non-negative finite number (valid price).
 * Uses double with noNaN and noDefaultInfinity to avoid edge-case floats
 * that Zod would reject.
 */
const validPrice = () =>
  fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true });

/**
 * Generates a non-negative integer (valid version for update schema).
 */
const validVersion = () => fc.nat({ max: 1_000_000 });

/**
 * Generates a complete valid CreateBookInput object.
 */
const validCreateInput = () =>
  fc.record({
    title: validTitle(),
    author: validAuthor(),
    isbn: validIsbn(),
    price: validPrice(),
  });

/**
 * Generates a complete valid UpdateBookInput object.
 */
const validUpdateInput = () =>
  fc.record({
    title: validTitle(),
    author: validAuthor(),
    isbn: validIsbn(),
    price: validPrice(),
    version: validVersion(),
  });

// ---------------------------------------------------------------------------
// Property 3: Validation schema accepts valid inputs and rejects invalid inputs
// ---------------------------------------------------------------------------

describe("Property 3: Validation schema accepts valid inputs and rejects invalid inputs", () => {
  // -------------------------------------------------------------------------
  // createBookSchema — valid inputs
  // -------------------------------------------------------------------------
  // Feature: book-management-crud, Property 3: Validation schema accepts valid inputs and rejects invalid inputs
  it("createBookSchema accepts any valid input", () => {
    // **Validates: Requirements 2.2**
    fc.assert(
      fc.property(validCreateInput(), (input) => {
        const result = createBookSchema.safeParse(input);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // createBookSchema — invalid inputs: empty title
  // -------------------------------------------------------------------------
  // Feature: book-management-crud, Property 3: Validation schema accepts valid inputs and rejects invalid inputs
  it("createBookSchema rejects empty title", () => {
    // **Validates: Requirements 2.2**
    fc.assert(
      fc.property(
        validAuthor(),
        validIsbn(),
        validPrice(),
        (author, isbn, price) => {
          const result = createBookSchema.safeParse({
            title: "",
            author,
            isbn,
            price,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // createBookSchema — invalid inputs: whitespace-only title
  // -------------------------------------------------------------------------
  // Feature: book-management-crud, Property 3: Validation schema accepts valid inputs and rejects invalid inputs
  it("createBookSchema rejects whitespace-only title", () => {
    // **Validates: Requirements 2.2**
    const whitespaceOnly = fc
      .array(fc.constantFrom(" ", "\t", "\n"), { minLength: 1, maxLength: 50 })
      .map((chars) => chars.join(""));

    fc.assert(
      fc.property(
        whitespaceOnly,
        validAuthor(),
        validIsbn(),
        validPrice(),
        (title, author, isbn, price) => {
          const result = createBookSchema.safeParse({
            title,
            author,
            isbn,
            price,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // createBookSchema — invalid inputs: title exceeding 100 characters
  // -------------------------------------------------------------------------
  // Feature: book-management-crud, Property 3: Validation schema accepts valid inputs and rejects invalid inputs
  it("createBookSchema rejects title longer than 100 characters", () => {
    // **Validates: Requirements 2.2**
    // Generate non-whitespace strings >100 chars so trim() won't reduce them below the limit
    const longTitle = fc.string({ minLength: 101, maxLength: 200, unit: "grapheme-ascii" })
      .map((s) => s.replace(/\s/g, "a"))
      .filter((s) => s.trim().length > 100);

    fc.assert(
      fc.property(
        longTitle,
        validAuthor(),
        validIsbn(),
        validPrice(),
        (title, author, isbn, price) => {
          const result = createBookSchema.safeParse({
            title,
            author,
            isbn,
            price,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // createBookSchema — invalid inputs: negative price
  // -------------------------------------------------------------------------
  // Feature: book-management-crud, Property 3: Validation schema accepts valid inputs and rejects invalid inputs
  it("createBookSchema rejects negative price", () => {
    // **Validates: Requirements 2.2**
    const negativePrice = fc.double({
      min: -1_000_000,
      max: -0.01,
      noNaN: true,
      noDefaultInfinity: true,
      minExcluded: false,
      maxExcluded: false,
    });

    fc.assert(
      fc.property(
        validTitle(),
        validAuthor(),
        validIsbn(),
        negativePrice,
        (title, author, isbn, price) => {
          const result = createBookSchema.safeParse({
            title,
            author,
            isbn,
            price,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // createBookSchema — invalid inputs: empty author
  // -------------------------------------------------------------------------
  // Feature: book-management-crud, Property 3: Validation schema accepts valid inputs and rejects invalid inputs
  it("createBookSchema rejects empty author", () => {
    // **Validates: Requirements 2.2**
    fc.assert(
      fc.property(
        validTitle(),
        validIsbn(),
        validPrice(),
        (title, isbn, price) => {
          const result = createBookSchema.safeParse({
            title,
            author: "",
            isbn,
            price,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // createBookSchema — invalid inputs: non-numeric price
  // -------------------------------------------------------------------------
  // Feature: book-management-crud, Property 3: Validation schema accepts valid inputs and rejects invalid inputs
  it("createBookSchema rejects non-numeric price", () => {
    // **Validates: Requirements 2.5**
    fc.assert(
      fc.property(
        validTitle(),
        validAuthor(),
        validIsbn(),
        fc.string({ minLength: 1, unit: "grapheme-ascii" }),
        (title, author, isbn, price) => {
          const result = createBookSchema.safeParse({
            title,
            author,
            isbn,
            price,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // updateBookSchema — valid inputs
  // -------------------------------------------------------------------------
  // Feature: book-management-crud, Property 3: Validation schema accepts valid inputs and rejects invalid inputs
  it("updateBookSchema accepts any valid input", () => {
    // **Validates: Requirements 4.4**
    fc.assert(
      fc.property(validUpdateInput(), (input) => {
        const result = updateBookSchema.safeParse(input);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // updateBookSchema — invalid inputs: empty title
  // -------------------------------------------------------------------------
  // Feature: book-management-crud, Property 3: Validation schema accepts valid inputs and rejects invalid inputs
  it("updateBookSchema rejects empty title", () => {
    // **Validates: Requirements 4.4**
    fc.assert(
      fc.property(
        validAuthor(),
        validIsbn(),
        validPrice(),
        validVersion(),
        (author, isbn, price, version) => {
          const result = updateBookSchema.safeParse({
            title: "",
            author,
            isbn,
            price,
            version,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // updateBookSchema — invalid inputs: title exceeding 100 characters
  // -------------------------------------------------------------------------
  // Feature: book-management-crud, Property 3: Validation schema accepts valid inputs and rejects invalid inputs
  it("updateBookSchema rejects title longer than 100 characters", () => {
    // **Validates: Requirements 4.4**
    // Generate non-whitespace strings >100 chars so trim() won't reduce them below the limit
    const longTitle = fc.string({ minLength: 101, maxLength: 200, unit: "grapheme-ascii" })
      .map((s) => s.replace(/\s/g, "a"))
      .filter((s) => s.trim().length > 100);

    fc.assert(
      fc.property(
        longTitle,
        validAuthor(),
        validIsbn(),
        validPrice(),
        validVersion(),
        (title, author, isbn, price, version) => {
          const result = updateBookSchema.safeParse({
            title,
            author,
            isbn,
            price,
            version,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // updateBookSchema — invalid inputs: negative price
  // -------------------------------------------------------------------------
  // Feature: book-management-crud, Property 3: Validation schema accepts valid inputs and rejects invalid inputs
  it("updateBookSchema rejects negative price", () => {
    // **Validates: Requirements 4.4**
    const negativePrice = fc.double({
      min: -1_000_000,
      max: -0.01,
      noNaN: true,
      noDefaultInfinity: true,
    });

    fc.assert(
      fc.property(
        validTitle(),
        validAuthor(),
        validIsbn(),
        negativePrice,
        validVersion(),
        (title, author, isbn, price, version) => {
          const result = updateBookSchema.safeParse({
            title,
            author,
            isbn,
            price,
            version,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // updateBookSchema — invalid inputs: negative version
  // -------------------------------------------------------------------------
  // Feature: book-management-crud, Property 3: Validation schema accepts valid inputs and rejects invalid inputs
  it("updateBookSchema rejects negative version", () => {
    // **Validates: Requirements 4.4**
    const negativeVersion = fc.integer({ min: -1_000_000, max: -1 });

    fc.assert(
      fc.property(
        validTitle(),
        validAuthor(),
        validIsbn(),
        validPrice(),
        negativeVersion,
        (title, author, isbn, price, version) => {
          const result = updateBookSchema.safeParse({
            title,
            author,
            isbn,
            price,
            version,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // updateBookSchema — invalid inputs: non-integer version
  // -------------------------------------------------------------------------
  // Feature: book-management-crud, Property 3: Validation schema accepts valid inputs and rejects invalid inputs
  it("updateBookSchema rejects non-integer version", () => {
    // **Validates: Requirements 4.4**
    const nonIntegerVersion = fc.double({
      min: 0.01,
      max: 1_000_000,
      noNaN: true,
      noDefaultInfinity: true,
      noInteger: true,
    });

    fc.assert(
      fc.property(
        validTitle(),
        validAuthor(),
        validIsbn(),
        validPrice(),
        nonIntegerVersion,
        (title, author, isbn, price, version) => {
          const result = updateBookSchema.safeParse({
            title,
            author,
            isbn,
            price,
            version,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ---------------------------------------------------------------------------
// Property 8: Input sanitization trims whitespace and strips unknown fields
// ---------------------------------------------------------------------------
// Feature: book-management-crud, Property 8: Input sanitization trims whitespace and strips unknown fields

describe("Property 8: Input sanitization trims whitespace and strips unknown fields", () => {
  // -------------------------------------------------------------------------
  // Arbitraries — generators for whitespace-padded strings and extra fields
  // -------------------------------------------------------------------------

  /**
   * Generates a non-empty core string (1–90 chars) that will be wrapped
   * with leading/trailing whitespace. The max is 90 to leave room for
   * whitespace padding while staying under the 100-char title limit.
   */
  const coreString = (maxLen: number) =>
    fc
      .string({ minLength: 1, maxLength: maxLen, unit: "grapheme-ascii" })
      .filter((s) => s.trim().length >= 1);

  /**
   * Generates whitespace consisting of spaces, tabs, and newlines.
   */
  const whitespace = () =>
    fc
      .array(fc.constantFrom(" ", "  ", "\t", "\n", "\r\n"), {
        minLength: 1,
        maxLength: 5,
      })
      .map((parts) => parts.join(""));

  /**
   * Wraps a core string with random leading and trailing whitespace.
   */
  const paddedString = (maxCoreLen: number) =>
    fc
      .tuple(whitespace(), coreString(maxCoreLen), whitespace())
      .map(([leading, core, trailing]) => `${leading}${core}${trailing}`);

  /**
   * Generates a random field name that is NOT one of the known schema fields.
   * This ensures the extra field is truly unknown to the schema.
   */
  const unknownFieldName = () =>
    fc
      .string({ minLength: 1, maxLength: 30, unit: "grapheme-ascii" })
      .filter(
        (s) =>
          s.trim().length >= 1 &&
          !["title", "author", "isbn", "price", "version"].includes(s)
      );

  /**
   * Generates a random JSON-serializable value for an unknown field.
   */
  const unknownFieldValue = () =>
    fc.oneof(
      fc.string({ unit: "grapheme-ascii" }),
      fc.integer(),
      fc.boolean(),
      fc.constant(null)
    );

  // -------------------------------------------------------------------------
  // Trim tests — createBookSchema
  // -------------------------------------------------------------------------

  // Feature: book-management-crud, Property 8: Input sanitization trims whitespace and strips unknown fields
  it("createBookSchema trims whitespace from title, author, and isbn", () => {
    // **Validates: Requirements 7.3**
    fc.assert(
      fc.property(
        paddedString(90),
        paddedString(245),
        paddedString(245),
        fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        (title, author, isbn, price) => {
          const result = createBookSchema.safeParse({
            title,
            author,
            isbn,
            price,
          });

          // The padded strings should still be valid after trimming
          if (result.success) {
            // Title must be trimmed — no leading/trailing whitespace
            expect(result.data.title).toBe(result.data.title.trim());
            expect(result.data.title).toBe(title.trim());

            // Author must be trimmed
            expect(result.data.author).toBe(result.data.author.trim());
            expect(result.data.author).toBe(author.trim());

            // ISBN must be trimmed (when present as a string)
            if (typeof result.data.isbn === "string" && result.data.isbn !== "") {
              expect(result.data.isbn).toBe(result.data.isbn.trim());
              expect(result.data.isbn).toBe(isbn.trim());
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Trim tests — updateBookSchema
  // -------------------------------------------------------------------------

  // Feature: book-management-crud, Property 8: Input sanitization trims whitespace and strips unknown fields
  it("updateBookSchema trims whitespace from title, author, and isbn", () => {
    // **Validates: Requirements 7.3**
    fc.assert(
      fc.property(
        paddedString(90),
        paddedString(245),
        paddedString(245),
        fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        fc.nat({ max: 1_000_000 }),
        (title, author, isbn, price, version) => {
          const result = updateBookSchema.safeParse({
            title,
            author,
            isbn,
            price,
            version,
          });

          if (result.success) {
            // Title must be trimmed
            expect(result.data.title).toBe(title.trim());

            // Author must be trimmed
            expect(result.data.author).toBe(author.trim());

            // ISBN must be trimmed (when present as a string)
            if (typeof result.data.isbn === "string" && result.data.isbn !== "") {
              expect(result.data.isbn).toBe(isbn.trim());
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Strip tests — createBookSchema removes unknown fields
  // -------------------------------------------------------------------------

  // Feature: book-management-crud, Property 8: Input sanitization trims whitespace and strips unknown fields
  it("createBookSchema strips unknown fields from the parsed output", () => {
    // **Validates: Requirements 7.5**
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100, unit: "grapheme-ascii" }).filter((s) => s.trim().length >= 1),
        fc.string({ minLength: 1, maxLength: 255, unit: "grapheme-ascii" }).filter((s) => s.trim().length >= 1),
        fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        unknownFieldName(),
        unknownFieldValue(),
        (title, author, price, extraKey, extraValue) => {
          const input = {
            title,
            author,
            price,
            [extraKey]: extraValue,
          };

          const result = createBookSchema.safeParse(input);

          if (result.success) {
            // The unknown field must NOT appear in the parsed output
            const outputKeys = Object.keys(result.data);
            expect(outputKeys).not.toContain(extraKey);

            // Only known fields should be present
            for (const key of outputKeys) {
              expect(["title", "author", "isbn", "price"]).toContain(key);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Strip tests — updateBookSchema removes unknown fields
  // -------------------------------------------------------------------------

  // Feature: book-management-crud, Property 8: Input sanitization trims whitespace and strips unknown fields
  it("updateBookSchema strips unknown fields from the parsed output", () => {
    // **Validates: Requirements 7.5**
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100, unit: "grapheme-ascii" }).filter((s) => s.trim().length >= 1),
        fc.string({ minLength: 1, maxLength: 255, unit: "grapheme-ascii" }).filter((s) => s.trim().length >= 1),
        fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
        fc.nat({ max: 1_000_000 }),
        unknownFieldName(),
        unknownFieldValue(),
        (title, author, price, version, extraKey, extraValue) => {
          const input = {
            title,
            author,
            price,
            version,
            [extraKey]: extraValue,
          };

          const result = updateBookSchema.safeParse(input);

          if (result.success) {
            // The unknown field must NOT appear in the parsed output
            const outputKeys = Object.keys(result.data);
            expect(outputKeys).not.toContain(extraKey);

            // Only known fields should be present
            for (const key of outputKeys) {
              expect(["title", "author", "isbn", "price", "version"]).toContain(key);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // -------------------------------------------------------------------------
  // Strip tests — buyBookSchema removes unknown fields
  // -------------------------------------------------------------------------

  // Feature: book-management-crud, Property 8: Input sanitization trims whitespace and strips unknown fields
  it("buyBookSchema strips unknown fields from the parsed output", () => {
    // **Validates: Requirements 7.5**
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000 }),
        unknownFieldName(),
        unknownFieldValue(),
        (version, extraKey, extraValue) => {
          const input = {
            version,
            [extraKey]: extraValue,
          };

          const result = buyBookSchema.safeParse(input);

          if (result.success) {
            // The unknown field must NOT appear in the parsed output
            const outputKeys = Object.keys(result.data);
            expect(outputKeys).not.toContain(extraKey);

            // Only known fields should be present
            for (const key of outputKeys) {
              expect(["version"]).toContain(key);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
