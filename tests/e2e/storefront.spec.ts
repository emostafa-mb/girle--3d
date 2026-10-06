import { expect, test } from '@playwright/test';

const uniqueEmail = () => `shopper-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

test('root redirects to English home, LTR', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome to My Store');
});

test('switching to Arabic sets RTL and Arabic text', async ({ page }) => {
  await page.goto('/en');
  await page.getByTestId('locale-switch').click();
  await expect(page).toHaveURL(/\/ar$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('أهلاً بك في متجري');
});

test('sign up, sign out, then sign in with different email case', async ({ page }) => {
  const email = uniqueEmail();
  await page.goto('/en/auth/signup');
  await page.getByLabel('Full name').fill('Sara Ali');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('secret-pass-1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  await expect(page.getByText('Hello, Sara Ali')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

  await page.goto('/en/auth/signin');
  await page.getByLabel('Email').fill(`  ${email.toUpperCase()} `);
  await page.getByLabel('Password').fill('secret-pass-1');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
});

test('wrong password shows a translated error', async ({ page }) => {
  await page.goto('/ar/auth/signin');
  await page.getByLabel('البريد الإلكتروني').fill('nobody@example.com');
  await page.getByLabel('كلمة المرور').fill('wrong-password');
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await expect(page.getByTestId('form-error')).toHaveText('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
});

test('account page requires sign-in', async ({ page }) => {
  await page.goto('/en/account');
  await expect(page).toHaveURL(/\/en\/auth\/signin$/);
});

test('dark mode toggles and persists across reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/en');
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});
