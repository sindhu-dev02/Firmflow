import { useEffect, useState } from 'react';
import { Outlet, Link, NavLink, useLocation } from 'react-router';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Menu, ChevronsLeft, X, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { getVisibleGroups, getPageTitle, isPathActive } from './navItems';

const COLLAPSE_KEY = 'firmflow-sidebar-collapsed';

function Logo({ showName }: { showName: boolean }) {
  return (
    <>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        F
      </span>
      {showName && (
        <span className="whitespace-nowrap text-lg font-bold text-foreground">FirmFlow</span>
      )}
    </>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold uppercase text-primary ring-1 ring-inset ring-primary/20">
      {name.trim().charAt(0) || '?'}
    </span>
  );
}

// The menu list. Used by both the desktop sidebar and the phone drawer.
function SidebarNav({
  id,
  collapsed,
  onNavigate,
}: {
  id: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const groups = getVisibleGroups(user?.role);

  return (
    <LayoutGroup id={id}>
      <nav aria-label="Main menu" className="flex-1 overflow-y-auto p-3">
        {groups.map((group, index) => (
          <div key={group.label ?? 'main'} className={index === 0 ? '' : 'mt-4'}>
            {group.label &&
              (collapsed ? (
                <div className="mx-3 mb-2 border-t border-border" />
              ) : (
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
              ))}

            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = isPathActive(pathname, item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-label={item.label}
                    className="relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="active-nav-pill"
                        className="absolute inset-0 rounded-md bg-primary/10 ring-1 ring-inset ring-primary/20"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <item.icon
                      size={18}
                      strokeWidth={2}
                      className={`relative shrink-0 ${isActive ? 'text-primary' : ''}`}
                    />
                    {!collapsed && (
                      <span className={`relative whitespace-nowrap ${isActive ? 'text-foreground' : ''}`}>
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </LayoutGroup>
  );
}

// Name, role and log out button at the bottom of the menu
function SidebarUser({ collapsed, onBeforeLogout }: { collapsed: boolean; onBeforeLogout?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  if (!user) return null;

  return (
    <div className={`flex items-center gap-2 ${collapsed ? 'flex-col' : ''}`}>
      <Link to="/profile" onClick={onBeforeLogout} title="Your profile" className="shrink-0">
        <Avatar name={user.name} />
      </Link>
      {!collapsed && (
        <div className="min-w-0 flex-1 text-sm">
          <p className="truncate font-medium text-foreground">{user.name}</p>
          <p className="truncate text-xs capitalize text-muted-foreground">
            {user.role.replace('_', ' ')}
          </p>
        </div>
      )}
      <button
        type="button"
        title="Log out"
        aria-label="Log out"
        disabled={logout.isPending}
        onClick={() => {
          onBeforeLogout?.();
          logout.mutate();
        }}
        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Remember the sidebar choice
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* storage not available, that's fine */
    }
  }, [collapsed]);

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="flex h-dvh bg-background">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden shrink-0 flex-col border-r border-border bg-card md:flex"
      >
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link to="/dashboard" className="flex items-center gap-2 overflow-hidden">
            <Logo showName={!collapsed} />
          </Link>
        </div>

        <SidebarNav id="desktop" collapsed={collapsed} />

        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            className="mb-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
          >
            <motion.span animate={{ rotate: collapsed ? 180 : 0 }}>
              <ChevronsLeft size={16} />
            </motion.span>
            {!collapsed && 'Collapse'}
          </button>
          <SidebarUser collapsed={collapsed} />
        </div>
      </motion.aside>

      {/* Phone drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card md:hidden"
            >
              <div className="flex h-14 items-center justify-between border-b border-border px-4">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <Logo showName />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              <SidebarNav id="mobile" collapsed={false} onNavigate={() => setMobileOpen(false)} />

              <div className="border-t border-border p-3">
                <SidebarUser collapsed={false} onBeforeLogout={() => setMobileOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main section */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <kbd className="hidden items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:flex">
              Ctrl K
            </kbd>
            {user && (
              <Link to="/profile" title={`${user.name} · your profile`} className="md:hidden">
                <Avatar name={user.name} />
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}