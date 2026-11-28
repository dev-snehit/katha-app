/**
 * Kaatha Wholesale Persistent Server Backend Configuration
 *
 * By default, connects to the Google Apps Script Web App acting as the live persistent server.
 * Can be overridden via VITE_GOOGLE_APPS_SCRIPT_URL or localStorage.
 */
export const DEFAULT_SERVER_URL =
  (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbxc7DP7XQHm4-Ro0MtMl61zuErdqhMMhseg6TysR4iPyGKJq4rgr_2LTmCcVQ-cXQ8E/exec";
