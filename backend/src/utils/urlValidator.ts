/**
 * URL Validator
 * Validates image URLs to prevent SSRF attacks
 */

const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const ALLOWED_HOSTS = [
  'supabase.co',
  'supabase.in',
  'storage.googleapis.com',
  'amazonaws.com',
  'cloudinary.com',
];

export function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return false;
    }

    // Check host (allow localhost in development)
    const host = parsedUrl.hostname.toLowerCase();
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    const isAllowedHost = ALLOWED_HOSTS.some((allowed) =>
      host.includes(allowed)
    );

    if (!isLocalhost && !isAllowedHost) {
      return false;
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /^10\./, // Private IP range
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private IP range
      /^192\.168\./, // Private IP range
      /^127\./, // Loopback
      /^169\.254\./, // Link-local
      /^0\.0\.0\.0/, // Invalid
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(host))) {
      return false;
    }

    // Check file extension (optional, for additional safety)
    const path = parsedUrl.pathname.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const hasImageExtension = imageExtensions.some((ext) =>
      path.endsWith(ext)
    );

    // Allow URLs without extension (e.g., CDN URLs with query params)
    return true;
  } catch {
    return false;
  }
}

export function validateImageUrl(url: string | string[] | null | undefined): boolean {
  if (!url) return true; // Allow null/undefined

  if (Array.isArray(url)) {
    return url.every((u) => isValidImageUrl(u));
  }

  if (typeof url === 'string') {
    return isValidImageUrl(url);
  }

  return false;
}
