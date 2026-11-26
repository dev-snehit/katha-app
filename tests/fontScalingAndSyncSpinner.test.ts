import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, applyBaseFontSize } from '../src/store/useAppStore';

describe('Base Font Size & Accessibility Scaling Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.getState().setBaseFontSize(16);
  });

  it('initializes with default base font size of 16px', () => {
    expect(useAppStore.getState().baseFontSize).toBe(16);
  });

  it('updates base font size and applies root CSS font size and variables', () => {
    useAppStore.getState().setBaseFontSize(18);
    expect(useAppStore.getState().baseFontSize).toBe(18);
    expect(document.documentElement.style.fontSize).toBe('18px');
    expect(document.documentElement.style.getPropertyValue('--app-base-font-size')).toBe('18px');
    expect(document.documentElement.style.getPropertyValue('--font-scale-factor')).toBe((18 / 16).toString());
  });

  it('persists base font size in localStorage so it is retained across logins and sessions', () => {
    useAppStore.getState().setBaseFontSize(20);
    const stored = JSON.parse(localStorage.getItem('katha_wholesale_baseFontSize') || '0');
    expect(stored).toBe(20);
  });

  it('clamps font sizes within comfortable bounds (12px min to 26px max)', () => {
    useAppStore.getState().setBaseFontSize(8);
    expect(useAppStore.getState().baseFontSize).toBe(12);

    useAppStore.getState().setBaseFontSize(35);
    expect(useAppStore.getState().baseFontSize).toBe(26);
  });

  it('applyBaseFontSize gracefully updates root styles', () => {
    applyBaseFontSize(15);
    expect(document.documentElement.style.fontSize).toBe('15px');
    expect(document.documentElement.style.getPropertyValue('--font-scale-factor')).toBe((15 / 16).toString());
  });
});

describe('Server Connection Loading State Engine', () => {
  it('starts with isConnectingServer as false', () => {
    expect(useAppStore.getState().isConnectingServer).toBe(false);
  });

  it('allows setting and toggling isConnectingServer state', () => {
    useAppStore.getState().setIsConnectingServer(true);
    expect(useAppStore.getState().isConnectingServer).toBe(true);

    useAppStore.getState().setIsConnectingServer(false);
    expect(useAppStore.getState().isConnectingServer).toBe(false);
  });
});
