/**
 * Kaatha Wholesale Persistent Server Backend Configuration
 *
 * Strictly sourced from VITE_GOOGLE_APPS_SCRIPT_URL (injected at build time
 * from GitHub Actions secret GAS_WEB_APP_URL or local .env).
 * Zero hardcoded production URLs or fallbacks are stored in source control.
 */
export const DEFAULT_SERVER_URL: string =
  ((import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL || '').toString().trim();

export function getRequiredServerUrl(url: string = DEFAULT_SERVER_URL): string {
  const clean = (url || '').toString().trim();
  if (!clean || !clean.startsWith('http')) {
    throw new Error(
      'VITE_GOOGLE_APPS_SCRIPT_URL is not configured. Set GAS_WEB_APP_URL in GitHub Repository Secrets or VITE_GOOGLE_APPS_SCRIPT_URL in local .env.'
    );
  }
  return clean;
}
