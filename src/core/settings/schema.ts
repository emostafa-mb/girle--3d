import { z } from 'zod';
import { brand } from '@/brand/brand.config';
import { LOCALES } from '../i18n/locales';

const localizedSchema = z.object({
  en: z.string().max(200).optional(),
  ar: z.string().max(200).optional(),
});

export const defaultSettings = {
  storeName: { ...brand.name },
  logoLight: null as string | null,
  logoDark: null as string | null,
  primaryColor: brand.primaryColor,
  radius: brand.radius,
  defaultLocale: brand.defaultLocale,
  enabledLocales: [...brand.enabledLocales],
  currency: brand.currency,
  contactEmail: null as string | null,
  contactPhone: null as string | null,
};

/** Lenient reader: any invalid field silently falls back to its default. */
export const settingsSchema = z.object({
  storeName: localizedSchema.catch(defaultSettings.storeName),
  logoLight: z.string().nullable().catch(null),
  logoDark: z.string().nullable().catch(null),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).catch(defaultSettings.primaryColor),
  radius: z.number().min(0).max(2).catch(defaultSettings.radius),
  defaultLocale: z.enum(LOCALES).catch(defaultSettings.defaultLocale),
  enabledLocales: z.array(z.enum(LOCALES)).min(1).catch(defaultSettings.enabledLocales),
  currency: z.string().regex(/^[A-Z]{3}$/).catch(defaultSettings.currency),
  contactEmail: z.email().nullable().catch(null),
  contactPhone: z.string().max(30).nullable().catch(null),
});

export type Settings = z.infer<typeof settingsSchema>;

export function readSettings(raw: unknown): Settings {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return settingsSchema.parse(obj);
}
