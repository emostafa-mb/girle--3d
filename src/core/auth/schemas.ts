import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from './password';

export const signInSchema = z.object({
  email: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(200),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(200),
  phone: z.string().trim().max(30).optional(),
});
