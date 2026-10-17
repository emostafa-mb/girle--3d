import { ADMIN_NAV } from '@/components/admin/nav';
import { Sidebar } from '@/components/admin/sidebar';
import { Topbar } from '@/components/admin/topbar';
import { can, requireAdmin } from '@/server/session';

export default async function AdminPanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const admin = await requireAdmin(locale);
  const allowedKeys = ADMIN_NAV.filter((i) => can(admin, i.permission)).map((i) => i.key);
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <Topbar adminName={admin.name} />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar allowedKeys={allowedKeys} />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
