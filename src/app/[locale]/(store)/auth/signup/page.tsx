import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { safeLocale } from "@/core/i18n/locales";
import { SignUpForm } from "@/components/store/sign-up-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { getCurrentCustomer } from "@/server/session";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (await getCurrentCustomer()) redirect(`/${safeLocale(locale)}/account`);
  const t = await getTranslations("auth");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>{t("signUpTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignUpForm />
          <p className="text-sm text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link
              href="/auth/signin"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("submitSignIn")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
