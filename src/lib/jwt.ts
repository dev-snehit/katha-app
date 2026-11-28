/**
 * Client-side JWT payload inspection helpers.
 * Signature verification is enforced on the backend; the client decodes
 * `exp` / `iat` claims to drive the 1-hour expiry and 5-minute warning UI.
 */

export interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  status?: string;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export function decodeJwtPayload(token: string | null | undefined): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = base64 + (pad === 2 ? '==' : pad === 3 ? '=' : '');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getJwtRemainingSeconds(
  token: string | null | undefined,
  nowMs: number = Date.now()
): number {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return 0;
  return Math.max(0, Math.floor(payload.exp - nowMs / 1000));
}

export function isJwtExpired(
  token: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return nowMs / 1000 >= payload.exp;
}
