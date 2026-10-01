import {
  LayoutDashboard,
  Users,
  User,
  CreditCard,
  Package,
  History,
  ShoppingCart,
  Tags,
  Contact,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

export interface NavGroup {
  label?: string; // small heading above the group
  items: NavItem[];
}

const STAFF: Role[] = ['org_owner', 'employee'];

// One place that lists every page in the menu.
// The sidebar, the mobile menu and the Ctrl+K search all read from here.
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['org_owner', 'employee', 'customer'] },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/orders', label: 'Orders', icon: ShoppingCart, roles: STAFF },
      { to: '/customers', label: 'Customers', icon: Contact, roles: STAFF },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/products', label: 'Products', icon: Package, roles: STAFF },
      { to: '/categories', label: 'Categories', icon: Tags, roles: STAFF },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/team', label: 'Team', icon: Users, roles: STAFF },
      { to: '/billing', label: 'Billing', icon: CreditCard, roles: STAFF },
      { to: '/activity', label: 'Activity', icon: History, roles: ['org_owner'] },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile', label: 'Profile', icon: User, roles: ['org_owner', 'employee', 'customer', 'super_admin'] },
    ],
  },
];

// Only the groups and items this person is allowed to see
export function getVisibleGroups(role: Role | undefined): NavGroup[] {
  if (!role) return [];
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

export function isPathActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

const EXTRA_TITLES: Record<string, string> = {
  '/billing/plans': 'Plans & Pricing',
};

export function getPageTitle(pathname: string) {
  if (EXTRA_TITLES[pathname]) return EXTRA_TITLES[pathname];
  const match = NAV_GROUPS.flatMap((g) => g.items).find((item) =>
    isPathActive(pathname, item.to),
  );
  return match?.label ?? 'FirmFlow';
}