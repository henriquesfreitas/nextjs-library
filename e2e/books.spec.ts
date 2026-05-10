import { test, expect } from '@playwright/test';

/**
 * Book Management E2E Tests
 *
 * These tests exercise the full user flow through the browser:
 * creating, viewing, editing, buying, and deleting books.
 *
 * Each test is independent — it creates its own data and cleans up after itself.
 * Tests use the API directly for setup/teardown to keep them fast and focused
 * on the UI behavior being validated.
 */

test.describe('Book List Page', () => {
  test('should display the books page with heading and create link', async ({ page }) => {
    await page.goto('/books');

    await expect(page.getByRole('heading', { name: 'Books' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create Book' })).toBeVisible();
  });

  test('should show empty state when no books exist', async ({ page, request }) => {
    // Clean up any existing books via API
    const response = await request.get('/api/books');
    const books = await response.json();
    for (const book of books) {
      await request.delete(`/api/books/${book.id}`);
    }

    await page.goto('/books');
    // EmptyState component should be visible
    await expect(page.getByText(/no books/i)).toBeVisible();
  });
});

test.describe('Create Book', () => {
  test('should create a new book successfully', async ({ page }) => {
    await page.goto('/books/new');

    await expect(page.getByRole('heading', { name: 'Create New Book' })).toBeVisible();

    // Fill in the form
    await page.getByLabel(/title/i).fill('E2E Test Book');
    await page.getByLabel(/author/i).fill('Test Author');
    await page.getByLabel(/isbn/i).fill('978-1234567890');
    await page.getByLabel(/price/i).fill('19.99');

    // Submit
    await page.getByRole('button', { name: /create book/i }).click();

    // Should show success notification
    await expect(page.getByText(/created successfully/i)).toBeVisible();

    // Should redirect to books list
    await page.waitForURL('/books');
    await expect(page.getByText('E2E Test Book')).toBeVisible();
  });

  test('should show validation errors for empty required fields', async ({ page }) => {
    await page.goto('/books/new');

    // Submit without filling anything
    await page.getByRole('button', { name: /create book/i }).click();

    // Should show validation errors
    await expect(page.getByRole('alert')).toHaveCount(3); // title, author, price
  });

  test('should show validation error for negative price', async ({ page }) => {
    await page.goto('/books/new');

    await page.getByLabel(/title/i).fill('Test Book');
    await page.getByLabel(/author/i).fill('Test Author');
    await page.getByLabel(/price/i).fill('-5');

    await page.getByRole('button', { name: /create book/i }).click();

    // Should show price validation error
    await expect(page.getByText(/price/i).filter({ hasText: /must|positive|greater|minimum/i })).toBeVisible();
  });
});

test.describe('Book Detail Page', () => {
  let bookId: string;

  test.beforeEach(async ({ request }) => {
    // Create a book via API for the test
    const response = await request.post('/api/books', {
      data: {
        title: 'Detail Test Book',
        author: 'Detail Author',
        isbn: '978-0000000001',
        price: 24.99,
      },
    });
    const book = await response.json();
    bookId = book.id;
  });

  test.afterEach(async ({ request }) => {
    // Clean up
    await request.delete(`/api/books/${bookId}`);
  });

  test('should display book details', async ({ page }) => {
    await page.goto(`/books/${bookId}`);

    await expect(page.getByRole('heading', { name: 'Detail Test Book' })).toBeVisible();
    await expect(page.getByText('Detail Author')).toBeVisible();
    await expect(page.getByText('978-0000000001')).toBeVisible();
    await expect(page.getByText('AVAILABLE')).toBeVisible();
  });

  test('should show back link to books list', async ({ page }) => {
    await page.goto(`/books/${bookId}`);

    const backLink = page.getByRole('link', { name: /back to books/i });
    await expect(backLink).toBeVisible();

    await backLink.click();
    await page.waitForURL('/books');
  });

  test('should show 404 for non-existent book', async ({ page }) => {
    await page.goto('/books/99999');

    await expect(page.getByText(/not found/i)).toBeVisible();
  });
});

test.describe('Edit Book', () => {
  let bookId: string;

  test.beforeEach(async ({ request }) => {
    const response = await request.post('/api/books', {
      data: {
        title: 'Edit Test Book',
        author: 'Edit Author',
        isbn: '978-0000000002',
        price: 15.00,
      },
    });
    const book = await response.json();
    bookId = book.id;
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`/api/books/${bookId}`);
  });

  test('should navigate to edit page and update a book', async ({ page }) => {
    await page.goto(`/books/${bookId}`);

    // Click edit button
    await page.getByRole('link', { name: /edit/i }).click();
    await page.waitForURL(`/books/${bookId}/edit`);

    // Verify form is pre-filled
    await expect(page.getByLabel(/title/i)).toHaveValue('Edit Test Book');
    await expect(page.getByLabel(/author/i)).toHaveValue('Edit Author');

    // Update the title
    await page.getByLabel(/title/i).clear();
    await page.getByLabel(/title/i).fill('Updated Book Title');

    // Submit
    await page.getByRole('button', { name: /update book/i }).click();

    // Should show success notification
    await expect(page.getByText(/updated successfully/i)).toBeVisible();

    // Should redirect back to detail page
    await page.waitForURL(`/books/${bookId}`);
    await expect(page.getByRole('heading', { name: 'Updated Book Title' })).toBeVisible();
  });

  test('should cancel edit and return to detail page', async ({ page }) => {
    await page.goto(`/books/${bookId}/edit`);

    await page.getByRole('button', { name: /cancel/i }).click();

    await page.waitForURL(`/books/${bookId}`);
  });
});

test.describe('Buy Book', () => {
  let bookId: string;

  test.beforeEach(async ({ request }) => {
    const response = await request.post('/api/books', {
      data: {
        title: 'Buy Test Book',
        author: 'Buy Author',
        price: 29.99,
      },
    });
    const book = await response.json();
    bookId = book.id;
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`/api/books/${bookId}`);
  });

  test('should buy a book from the detail page', async ({ page }) => {
    await page.goto(`/books/${bookId}`);

    // Buy button should be visible for AVAILABLE books
    const buyButton = page.getByRole('button', { name: /buy/i });
    await expect(buyButton).toBeVisible();

    // Click buy
    await buyButton.click();

    // Confirmation dialog should appear
    await expect(page.getByText(/confirm purchase/i)).toBeVisible();
    await expect(page.getByText(/are you sure/i)).toBeVisible();

    // Confirm the purchase
    await page.getByRole('button', { name: 'Buy' }).click();

    // Should show success notification
    await expect(page.getByText(/marked as sold/i)).toBeVisible();

    // Status should update to SOLD
    await expect(page.getByText('SOLD')).toBeVisible();

    // Buy button should no longer be visible
    await expect(page.getByRole('button', { name: /buy/i })).toBeHidden();
  });

  test('should cancel buy action', async ({ page }) => {
    await page.goto(`/books/${bookId}`);

    await page.getByRole('button', { name: /buy/i }).click();

    // Confirmation dialog appears
    await expect(page.getByText(/confirm purchase/i)).toBeVisible();

    // Cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Dialog should close, book still AVAILABLE
    await expect(page.getByText(/confirm purchase/i)).toBeHidden();
    await expect(page.getByText('AVAILABLE')).toBeVisible();
  });

  test('should buy a book from the list page', async ({ page }) => {
    await page.goto('/books');

    // Find the buy button for our specific book
    const buyButton = page.getByRole('button', { name: /buy "Buy Test Book"/i });
    await expect(buyButton).toBeVisible();

    await buyButton.click();

    // Confirmation dialog
    await expect(page.getByText(/confirm purchase/i)).toBeVisible();
    await page.getByRole('button', { name: 'Buy' }).click();

    // Success notification
    await expect(page.getByText(/marked as sold/i)).toBeVisible();
  });
});

test.describe('Delete Book', () => {
  let bookId: string;

  test.beforeEach(async ({ request }) => {
    const response = await request.post('/api/books', {
      data: {
        title: 'Delete Test Book',
        author: 'Delete Author',
        price: 9.99,
      },
    });
    const book = await response.json();
    bookId = book.id;
  });

  test.afterEach(async ({ request }) => {
    // Attempt cleanup regardless — will 404 if already deleted, which is fine
    await request.delete(`/api/books/${bookId}`);
  });

  test('should delete a book from the detail page', async ({ page }) => {
    await page.goto(`/books/${bookId}`);

    // Click delete
    await page.getByRole('button', { name: /delete/i }).click();

    // Confirmation dialog should appear
    await expect(page.getByText(/confirm deletion/i)).toBeVisible();
    await expect(page.getByText(/cannot be undone/i)).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: 'Delete' }).click();

    // Should show success notification
    await expect(page.getByText(/has been deleted/i)).toBeVisible();

    // Should redirect to books list
    await page.waitForURL('/books');
  });

  test('should cancel delete action', async ({ page }) => {
    await page.goto(`/books/${bookId}`);

    await page.getByRole('button', { name: /delete/i }).click();

    // Confirmation dialog appears
    await expect(page.getByText(/confirm deletion/i)).toBeVisible();

    // Cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Dialog should close, still on detail page
    await expect(page.getByText(/confirm deletion/i)).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Delete Test Book' })).toBeVisible();
  });
});

test.describe('Sold Book Restrictions', () => {
  let bookId: string;

  test.beforeEach(async ({ request }) => {
    // Create and immediately buy a book
    const createResponse = await request.post('/api/books', {
      data: {
        title: 'Sold Restriction Book',
        author: 'Sold Author',
        price: 39.99,
      },
    });
    const book = await createResponse.json();
    bookId = book.id;

    await request.patch(`/api/books/${bookId}/buy`, {
      data: { version: 0 },
    });
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`/api/books/${bookId}`);
  });

  test('should not show buy button for sold books', async ({ page }) => {
    await page.goto(`/books/${bookId}`);

    await expect(page.getByText('SOLD')).toBeVisible();
    await expect(page.getByRole('button', { name: /buy/i })).toBeHidden();
  });

  test('should disable price field when editing a sold book', async ({ page }) => {
    await page.goto(`/books/${bookId}/edit`);

    const priceInput = page.getByLabel(/price/i);
    await expect(priceInput).toBeDisabled();
    await expect(page.getByText(/cannot be changed for sold books/i)).toBeVisible();
  });
});
