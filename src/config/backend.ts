/**
 * Katha Wholesale Persistent Server Backend Configuration
 *
 * By default, connects to the Google Apps Script Web App acting as the live persistent server.
 * Can be overridden via VITE_GOOGLE_APPS_SCRIPT_URL or localStorage.
 */
export const DEFAULT_SERVER_URL =
  (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbxIlyLjXX5Z-0YTrep3Ax4wOr0W4Drqv2Ib3lnWE9bmo2X3E5Oznz1TtLX6cYwPTxKV/exec";
