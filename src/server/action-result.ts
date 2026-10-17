import { type ErrorCode, isDomainError } from '@/core/errors';

export type ActionState =
  | { error?: ErrorCode | 'UNKNOWN'; fieldErrors?: Record<string, string[]> }
  | undefined;

export function toActionState(err: unknown): NonNullable<ActionState> {
  if (isDomainError(err)) return { error: err.code, fieldErrors: err.details?.fieldErrors };
  console.error(err);
  return { error: 'UNKNOWN' };
}
