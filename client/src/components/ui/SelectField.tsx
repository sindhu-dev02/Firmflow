import { type SelectHTMLAttributes, forwardRef } from 'react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

// Same look as TextField, but a dropdown
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, hint, id, children, ...rest }, ref) => {
    const selectId = id ?? rest.name;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={`rounded-md border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:ring-2 focus:ring-ring ${
            error ? 'border-destructive' : 'border-border'
          }`}
          {...rest}
        >
          {children}
        </select>
        {hint && !error && <span className="text-xs text-muted-foreground">{hint}</span>}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  },
);
SelectField.displayName = 'SelectField';