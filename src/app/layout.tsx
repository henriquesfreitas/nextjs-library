/**
 * Root Layout — Base HTML Structure
 *
 * This is the top-level layout for the entire application. Next.js App Router
 * requires a root layout that defines the <html> and <body> tags.
 *
 * Why this file exists:
 * In the Next.js App Router, a root layout is mandatory. It wraps every page in
 * the application and is responsible for:
 * 1. Setting the document language (`lang="en"`) for accessibility — screen readers
 *    use this to select the correct pronunciation rules.
 * 2. Exporting `metadata` which Next.js uses to generate <head> tags (title,
 *    description) for SEO and browser tab display.
 * 3. Importing the global CSS file (`globals.css`) which includes Tailwind's base,
 *    components, and utilities layers. This single import makes Tailwind classes
 *    available throughout the entire component tree.
 * 4. Wrapping all page content in a max-width container with padding, providing
 *    consistent page margins and preventing content from stretching too wide on
 *    large screens. The `min-h-screen` ensures the container fills the viewport.
 *
 * Styling uses Tailwind utility classes for maintainability and responsive design support.
 * The container uses `max-w-5xl` (1024px) to keep content readable on wide displays.
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
        <div className="max-w-5xl mx-auto p-4 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
