export type ErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'RATE_LIMITED';

export type ErrorDetails = { fieldErrors?: Record<string, string[]> };

export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly details?: ErrorDetails;

  constructor(code: ErrorCode, message?: string, details?: ErrorDetails) {
    super(message ?? code);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

export function isDomainError(e: unknown): e is DomainError {
  return e instanceof DomainError;
}
