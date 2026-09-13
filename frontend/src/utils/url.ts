/**
 * Validate returnUrl to prevent open redirect.
 * Allowed: path-only URLs starting with / (e.g. /, /checkout, /orders/123).
 * Rejected: full URLs (https://...), protocol-relative (//...), javascript:, etc.
 */
export function isValidReturnUrl(value: string | null | undefined): boolean {
  if (value == null || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '') return false;
  if (!trimmed.startsWith('/')) return false;
  if (trimmed.includes('//')) return false;
  if (trimmed.includes(':')) return false;
  return true;
}

/**
 * Get a safe return URL from a raw value. Falls back to '/' if invalid.
 */
export function getSafeReturnUrl(raw: string | null | undefined): string {
  return isValidReturnUrl(raw) ? (raw as string).trim() : '/';
}
