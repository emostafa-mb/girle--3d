import { describe, expect, it } from 'vitest';
import { DomainError, isDomainError } from './errors';

describe('DomainError', () => {
  it('carries a code and optional field errors', () => {
    const err = new DomainError('VALIDATION', 'bad input', { fieldErrors: { email: ['INVALID'] } });
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('VALIDATION');
    expect(err.message).toBe('bad input');
    expect(err.details?.fieldErrors?.email).toEqual(['INVALID']);
  });

  it('defaults the message to the code', () => {
    expect(new DomainError('NOT_FOUND').message).toBe('NOT_FOUND');
  });

  it('isDomainError distinguishes domain errors from other errors', () => {
    expect(isDomainError(new DomainError('FORBIDDEN'))).toBe(true);
    expect(isDomainError(new Error('x'))).toBe(false);
    expect(isDomainError('FORBIDDEN')).toBe(false);
  });
});
