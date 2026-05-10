import Link from 'next/link';

/**
 * EmptyState Component — Shown when the book list has zero results.
 *
 * This is a Server Component (no 'use client' directive) because it has
 * no interactivity — it only renders static content and a navigation link.
 * Server Components are the default in Next.js App Router and produce
 * zero client-side JavaScript, which improves page load performance.
 *
 * The component provides a friendly message and a clear call-to-action
 * so the user knows what to do next (create their first book).
 *
 * Accessibility:
 * - Uses semantic HTML (section, heading, paragraph, link)
 * - The link is a standard <a> via Next.js <Link>, fully keyboard-navigable
 * - role="status" signals to assistive tech that this is an informational region
 *
 * Validates: Requirements 1.3
 */

export interface EmptyStateProps {
  /** Message displayed to the user. Defaults to "No books found". */
  message?: string;
}

/* ------------------------------------------------------------------ */
/*  Inline styles                                                      */
/* ------------------------------------------------------------------ */

const containerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '3rem 1.5rem',
  textAlign: 'center',
};

const iconStyles: React.CSSProperties = {
  fontSize: '3rem',
  marginBottom: '1rem',
};

const headingStyles: React.CSSProperties = {
  margin: '0 0 0.5rem',
  fontSize: '1.25rem',
  fontWeight: 600,
  color: '#374151',
};

const descriptionStyles: React.CSSProperties = {
  margin: '0 0 1.5rem',
  fontSize: '0.95rem',
  color: '#6b7280',
  lineHeight: 1.5,
};

const linkStyles: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.6rem 1.25rem',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  borderRadius: '0.375rem',
  textDecoration: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
};

export default function EmptyState({
  message = 'No books found',
}: EmptyStateProps) {
  return (
    <section style={containerStyles} role="status">
      <div style={iconStyles} aria-hidden="true">
        📚
      </div>
      <h2 style={headingStyles}>{message}</h2>
      <p style={descriptionStyles}>
        Get started by adding your first book to the inventory.
      </p>
      <Link href="/books/new" style={linkStyles}>
        Create a Book
      </Link>
    </section>
  );
}
