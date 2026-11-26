import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useModalDismiss } from '../src/hooks/useModalDismiss';

describe('useModalDismiss hook', () => {
  it('calls onClose when Escape key is pressed while isOpen is true', () => {
    const onClose = vi.fn();
    renderHook(() => useModalDismiss(true, onClose));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when Escape key is pressed while isOpen is false', () => {
    const onClose = vi.fn();
    renderHook(() => useModalDismiss(false, onClose));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not call onClose when other keys are pressed', () => {
    const onClose = vi.fn();
    renderHook(() => useModalDismiss(true, onClose));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
