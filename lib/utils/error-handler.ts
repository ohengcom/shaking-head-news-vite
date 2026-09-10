/**
 * Error handling utilities for the application
 * Provides consistent error handling across Server Actions and API routes
 */

import { z } from 'zod'

/**
 * Custom API Error class with status code and error code support
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * Authentication Error
 */
export class AuthError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'AUTH_ERROR')
    this.name = 'AuthError'
  }
}

/**
 * Validation Error
 */
export class ValidationError extends APIError {
  constructor(
    message: string = 'Validation failed',
    public errors?: Record<string, string>
  ) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR')
    this.name = 'RateLimitError'
  }
}

/**
 * Validate data with Zod schema and throw ValidationError if invalid
 */
export function validateOrThrow<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errors: Record<string, string> = {}
    result.error.issues.forEach((issue) => {
      const path = issue.path.join('.')
      errors[path] = issue.message
    })
    throw new ValidationError('Validation failed', errors)
  }

  return result.data
}

/**
 * Log error for monitoring (can be extended to send to Sentry, etc.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Context can contain any type of data for error logging
export function logError(error: unknown, context?: Record<string, any>) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
    context,
  }

  console.error('Application error:', errorInfo)

  // Extension point: integrate external error monitoring (e.g. Sentry)
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: context })
  // }
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
  } = {}
): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, backoffFactor = 2 } = options

  let lastError: unknown
  let delay = initialDelay

  const isRetryableError = (error: unknown) => {
    if (
      error instanceof AuthError ||
      error instanceof ValidationError ||
      error instanceof NotFoundError
    ) {
      return false
    }

    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : undefined

    if (
      typeof statusCode === 'number' &&
      statusCode >= 400 &&
      statusCode < 500 &&
      statusCode !== 429
    ) {
      return false
    }

    return true
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on non-retryable application errors.
      if (!isRetryableError(error)) {
        throw error
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Increase delay for next attempt
      delay = Math.min(delay * backoffFactor, maxDelay)
    }
  }

  throw lastError
}
