/**
 * ConfirmDialog Component Tests
 *
 * Tests the ConfirmDialog component, verifying:
 * - Dialog renders with correct message when isOpen=true
 * - Dialog does not render when isOpen=false
 * - Confirm button triggers the onConfirm callback
 * - Cancel button triggers the onCancel callback
 *
 * Uses @testing-library/react for rendering and interaction, with vitest
 * for assertions. No navigation mocks needed — ConfirmDialog is a pure
 * UI component with no router dependencies.
 *
 * Validates: Requirements 5.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ConfirmDialog from '@/components/ConfirmDialog';

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirm Delete',
    message: 'Are you sure you want to delete this book?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Rendering when open — Requirement 5.2
  // -------------------------------------------------------------------------

  describe('when isOpen is true', () => {
    it('renders the dialog with the correct title', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(
        screen.getByRole('heading', { name: 'Confirm Delete' })
      ).toBeInTheDocument();
    });

    it('renders the dialog with the correct message', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(
        screen.getByText('Are you sure you want to delete this book?')
      ).toBeInTheDocument();
    });

    it('renders confirm and cancel buttons with correct labels', () => {
      render(<ConfirmDialog {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: 'Delete' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Cancel' })
      ).toBeInTheDocument();
    });

    it('renders with role="dialog" and aria-modal="true"', () => {
      render(<ConfirmDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  // -------------------------------------------------------------------------
  // Not rendering when closed
  // -------------------------------------------------------------------------

  describe('when isOpen is false', () => {
    it('does not render the dialog', () => {
      render(<ConfirmDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText(defaultProps.message)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Confirm action — Requirement 5.2
  // -------------------------------------------------------------------------

  describe('confirm action', () => {
    it('calls onConfirm when the confirm button is clicked', () => {
      const onConfirm = vi.fn();
      render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Cancel action — Requirement 5.2
  // -------------------------------------------------------------------------

  describe('cancel action', () => {
    it('calls onCancel when the cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when the overlay is clicked', () => {
      const onCancel = vi.fn();
      render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

      // Click the overlay (the dialog container with role="dialog")
      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Custom labels
  // -------------------------------------------------------------------------

  describe('custom labels', () => {
    it('uses default labels when none are provided', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test"
          message="Test message"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(
        screen.getByRole('button', { name: 'Confirm' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Cancel' })
      ).toBeInTheDocument();
    });

    it('uses custom labels when provided', () => {
      render(
        <ConfirmDialog
          {...defaultProps}
          confirmLabel="Yes, Buy"
          cancelLabel="No, Go Back"
        />
      );

      expect(
        screen.getByRole('button', { name: 'Yes, Buy' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'No, Go Back' })
      ).toBeInTheDocument();
    });
  });
});
