import { useEffect } from 'react';

/**
 * Custom hook to handle Esc key and modal dismiss accessibility behavior.
 * Automatically attaches an 'Escape' key event listener to the window when modal is open.
 */
export function useModalDismiss(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
}
