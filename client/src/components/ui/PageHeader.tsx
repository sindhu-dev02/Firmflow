import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  // the main button on the right, like "Add product"
  action?: ReactNode;
  // extra controls next to the button, like a search box or filter
  extra?: ReactNode;
}

export function PageHeader({ title, description, action, extra }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {(extra || action) && (
        <div className="flex flex-wrap items-center gap-3">
          {extra}
          {action}
        </div>
      )}
    </div>
  );
}