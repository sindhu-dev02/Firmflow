import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Boxes, Users, ReceiptText } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-accent font-display text-lg font-bold text-accent-foreground">
        F
      </span>
      <span
        className={`font-display text-lg font-semibold ${
          dark ? 'text-sidebar-foreground' : 'text-foreground'
        }`}
      >
        FirmFlow
      </span>
    </span>
  );
}

// A small picture of the product, drawn with plain boxes. It is only decoration.
function ProductPeek() {
  const bars = [30, 52, 22, 64, 44, 78, 56];
  return (
    <div aria-hidden="true" className="relative mt-10 max-w-sm">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        className="rounded-lg border border-sidebar-border bg-sidebar-hover p-5"
      >
        <p className="text-xs text-sidebar-muted">Sales this week</p>
        <p className="mt-1 font-display text-3xl font-semibold text-sidebar-foreground">₹12,845</p>
        <div className="mt-4 flex h-16 items-end gap-2">
          {bars.map((h, i) => (
            <span
              key={i}
              style={{ height: `${h}%` }}
              className={`w-full rounded-sm ${
                i === bars.length - 2 ? 'bg-accent' : 'bg-sidebar-active'
              }`}
            />
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
        className="-mt-2 ml-8 flex items-center justify-between gap-3 rounded-lg border border-sidebar-border bg-sidebar px-4 py-3 shadow-lg"
      >
        <div>
          <p className="text-sm font-medium text-sidebar-foreground">Order #4821</p>
          <p className="text-xs text-sidebar-muted">3 items · Ravi Shah</p>
        </div>
        <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent ring-1 ring-inset ring-accent/30">
          Confirmed
        </span>
      </motion.div>
    </div>
  );
}

const POINTS = [
  { icon: Boxes, text: 'Products and stock that update with every order' },
  { icon: Users, text: 'Your team and customers, each with the right access' },
  { icon: ReceiptText, text: 'Plans and billing without the paperwork' },
];

interface AuthShellProps {
  title: string;
  subtitle?: ReactNode;
  // small text above the title, like "Step 2 of 2"
  eyebrow?: string;
  children: ReactNode;
  // under the form, like "Already have an account? Sign in"
  footer?: ReactNode;
}

// The frame for Login, Register, Change password and Set up organization.
// Wide screens: brand panel on the left, form on the right. Phones: just the form.
export function AuthShell({ title, subtitle, eyebrow, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[5fr_6fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-sidebar-border bg-sidebar p-12 text-sidebar-foreground lg:flex">
        {/* soft glow in the corner */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-primary/25 blur-3xl"
        />
        <Logo dark />

        <div className="relative">
          <h2 className="max-w-md font-display text-4xl font-semibold leading-[1.1] text-sidebar-foreground">
            Orders, stock and customers, in one place.
          </h2>
          <p className="mt-4 max-w-md text-base text-sidebar-muted">
            FirmFlow keeps a small business organised, without the spreadsheet mess.
          </p>

          <ul className="mt-8 space-y-3">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-sidebar-foreground">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sidebar-active text-accent">
                  <Icon size={16} />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <ProductPeek />
        </div>

        <p className="relative text-xs text-sidebar-muted">© {new Date().getFullYear()} FirmFlow</p>
      </aside>

      <main className="flex min-h-dvh flex-col px-5 py-5 sm:px-10">
        <div className="flex items-center justify-between">
          <span className="lg:invisible">
            <Logo />
          </span>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full max-w-sm"
          >
            {eyebrow && (
              <p className="mb-3 inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-foreground ring-1 ring-inset ring-accent/40">
                {eyebrow}
              </p>
            )}
            <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}

            <div className="mt-8">{children}</div>

            {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
          </motion.div>
        </div>
      </main>
    </div>
  );
}