import { afterEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '@/core/errors';
import { toActionState } from './action-result';

afterEach(() => vi.restoreAllMocks());

describe('toActionState', () => {
  it('maps domain errors to their code and field errors', () => {
    const err = new DomainError('VALIDATION', 'x', { fieldErrors: { email: ['bad'] } });
    expect(toActionState(err)).toEqual({ error: 'VALIDATION', fieldErrors: { email: ['bad'] } });
    expect(toActionState(new DomainError('RATE_LIMITED'))).toEqual({ error: 'RATE_LIMITED', fieldErrors: undefined });
  });

  it('maps unexpected errors to UNKNOWN and logs them', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(toActionState(new Error('db down'))).toEqual({ error: 'UNKNOWN' });
    expect(spy).toHaveBeenCalled();
  });
});
