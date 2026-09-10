/**
 * Input Validation and Sanitization Utilities
 *
 * Provides functions to validate and sanitize user input to prevent
 * XSS attacks, SQL injection, and other security vulnerabilities.
 */

/**
 * Sanitize string input by removing potentially dangerous characters
 *
 * @param input - Raw string input
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export function sanitizeString(
  input: string,
  options: {
    maxLength?: number
    allowHtml?: boolean
    allowNewlines?: boolean
  } = {}
): string {
  const { maxLength = 1000, allowHtml = false, allowNewlines = true } = options

  let sanitized = input.trim()

  // Remove HTML tags if not allowed
  if (!allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '')
  }

  // Remove newlines if not allowed
  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]+/g, ' ')
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '')

  // Limit length
  sanitized = sanitized.slice(0, maxLength)

  return sanitized
}

/**
 * Sanitize URL to prevent javascript: and data: URLs
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim()

  // Check for dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:']
  const lowerUrl = trimmed.toLowerCase()

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return ''
    }
  }

  // Validate URL format
  try {
    const parsed = new URL(trimmed)
    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return ''
    }
    return trimmed
  } catch {
    // If not a valid URL, check if it's a relative path
    if (trimmed.startsWith('/')) {
      return trimmed
    }
    return ''
  }
}

/**
 * Sanitize object by applying sanitization to all string values
 *
 * @param obj - Object to sanitize
 * @param options - Sanitization options
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: {
    maxLength?: number
    allowHtml?: boolean
  } = {}
): T {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value, options)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, options)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeString(item, options)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>, options)
            : item
      )
    } else {
      sanitized[key] = value
    }
  }

  return sanitized as T
}
