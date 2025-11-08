'use client';

import { Modal } from './Modal';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleConfirm();
    }
  };

  // Button styles based on variant
  const confirmButtonStyles = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';

  const iconColor = variant === 'danger'
    ? 'text-red-600 dark:text-red-500'
    : 'text-blue-600 dark:text-blue-500';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="
              px-4 py-2 rounded-lg
              text-sm font-medium
              text-gray-700 dark:text-gray-300
              bg-gray-100 dark:bg-gray-700
              hover:bg-gray-200 dark:hover:bg-gray-600
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            onKeyDown={handleKeyPress}
            className={`
              px-4 py-2 rounded-lg
              text-sm font-medium
              text-white
              ${confirmButtonStyles}
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-offset-2
              flex items-center gap-2
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      }
    >
      <div className="flex gap-4">
        {/* Warning Icon */}
        <div className="flex-shrink-0">
          <div className={`
            p-2 rounded-full
            ${variant === 'danger'
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-blue-100 dark:bg-blue-900/30'
            }
          `}>
            <AlertTriangle className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>

        {/* Message */}
        <div className="flex-1 pt-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
}
