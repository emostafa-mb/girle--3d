'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { customerSignInAction } from '@/server/actions/auth';

export function SignInForm() {
  const [state, action, pending] = useActionState(customerSignInAction, undefined);
  const locale = useLocale();
  const t = useTranslations('auth');
  const te = useTranslations('errors');
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Field label={t('email')} name="email" type="email" autoComplete="email" required />
      <Field label={t('password')} name="password" type="password" autoComplete="current-password" required />
      {state?.error && (
        <p role="alert" data-testid="form-error" className="text-sm text-destructive">
          {te(state.error)}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {t('submitSignIn')}
      </Button>
    </form>
  );
}
