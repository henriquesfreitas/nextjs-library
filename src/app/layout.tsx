/**
 * Root Layout — Base HTML Structure
 *
 * This is the top-level layout for the entire application. Next.js App Router
 * requires a root layout that defines the <html> and <body> tags. Every page
 * in the app is rendered as a child of this layout.
 *
 * Responsibilities:
 *   - Sets the document language to English for accessibility
 *   - Exports metadata (title, description) used by Next.js for <head> tags
 *   - Imports global CSS reset and base typography
 *   - Wraps all page content in a container for consistent max-width and padding
 */

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Book Management',
  description:
    'A full-stack book management application for browsing, creating, editing, and purchasing books.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            maxWidth: '1024px',
            margin: '0 auto',
            padding: '1rem',
            minHeight: '100vh',
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
