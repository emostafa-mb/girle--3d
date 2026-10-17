'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { customerSignUpAction } from '@/server/actions/auth';

export function SignUpForm() {
  const [state, action, pending] = useActionState(customerSignUpAction, undefined);
  const locale = useLocale();
  const t = useTranslations('auth');
  const te = useTranslations('errors');
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <Field label={t('name')} name="name" autoComplete="name" required maxLength={100} errors={state?.fieldErrors?.name} />
      <Field label={t('email')} name="email" type="email" autoComplete="email" required errors={state?.fieldErrors?.email} />
      <Field
        label={t('password')}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint={t('passwordHint')}
        errors={state?.fieldErrors?.password}
      />
      <Field label={t('phone')} name="phone" type="tel" autoComplete="tel" maxLength={30} />
      {state?.error && (
        <p role="alert" data-testid="form-error" className="text-sm text-destructive">
          {te(state.error)}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {t('submitSignUp')}
      </Button>
    </form>
  );
}
