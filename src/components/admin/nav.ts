import { LayoutDashboard, type LucideIcon } from 'lucide-react';
import type { Permission } from '@/core/auth/permissions';

/** Sidebar entries. Later milestones append items here. `key` is a message key under `admin`. */
export const ADMIN_NAV: { key: string; href: string; icon: LucideIcon; permission: Permission }[] = [
  { key: 'overview', href: '/admin', icon: LayoutDashboard, permission: 'dashboard.read' },
];
