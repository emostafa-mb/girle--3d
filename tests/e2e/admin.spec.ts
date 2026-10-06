import { expect, type Page, test } from '@playwright/test';
import { E2E } from './fixtures';

async function adminLogin(page: Page, email: string, password: string, locale = 'en') {
  await page.goto(`/${locale}/admin/login`);
  await page.getByLabel(locale === 'ar' ? 'البريد الإلكتروني' : 'Email').fill(email);
  await page.getByLabel(locale === 'ar' ? 'كلمة المرور' : 'Password').fill(password);
  await page.getByRole('button', { name: locale === 'ar' ? 'تسجيل الدخول' : 'Sign in' }).click();
}

test('signed-out visitor is sent to the admin login page', async ({ page }) => {
  await page.goto('/en/admin');
  await expect(page).toHaveURL(/\/en\/admin\/login$/);
});

test('owner signs in, sees overview, signs out', async ({ page }) => {
  await adminLogin(page, E2E.owner.email, E2E.owner.password);
  await expect(page).toHaveURL(/\/en\/admin$/);
  await expect(page.getByTestId('admin-welcome')).toHaveText(`Welcome back, ${E2E.owner.name}`);
  await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/en\/admin\/login$/);
  await page.goto('/en/admin');
  await expect(page).toHaveURL(/\/en\/admin\/login$/);
});

test('wrong admin password shows an error', async ({ page }) => {
  await adminLogin(page, E2E.owner.email, 'not-the-password');
  await expect(page.getByTestId('form-error')).toHaveText('Email or password is incorrect.');
});

test('a customer session does not grant admin access', async ({ page }) => {
  const email = `cust-${Date.now()}@example.com`;
  await page.goto('/en/auth/signup');
  await page.getByLabel('Full name').fill('Customer');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('secret-pass-1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  // Put the customer token into the admin cookie: still rejected.
  const cookies = await page.context().cookies();
  const customer = cookies.find((c) => c.name === 'cus_session');
  expect(customer).toBeDefined();
  await page.context().addCookies([{ ...customer!, name: 'adm_session' }]);
  await page.goto('/en/admin');
  await expect(page).toHaveURL(/\/en\/admin\/login$/);
});

test('admin without dashboard permission sees no-access message', async ({ page }) => {
  await adminLogin(page, E2E.viewer.email, E2E.viewer.password);
  await expect(page).toHaveURL(/\/en\/admin$/);
  await expect(page.getByTestId('no-access')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Overview' })).toHaveCount(0);
});

test('Arabic admin login is right-to-left', async ({ page }) => {
  await page.goto('/ar/admin/login');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'دخول الإدارة' })).toBeVisible();
});
