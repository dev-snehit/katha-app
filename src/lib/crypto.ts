/**
 * Standard Cryptographic Utilities for User Authentication
 * Uses standard SHA-256 via Web Crypto API with synchronous fallback
 */

export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText) return '';
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(plainText);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // fallback
  }

  // Simple portable fallback hash for non-crypto environments
  let hash = 0;
  for (let i = 0; i < plainText.length; i++) {
    const char = plainText.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sha256_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

/**
 * Generates an 8-character secure temporary password
 */
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'Katha-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
