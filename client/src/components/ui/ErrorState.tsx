import { TriangleAlert } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert size={22} />
      </span>
      <p className="text-sm font-medium text-foreground">{message}</p>
      <Button type="button" variant="outline" onClick={onRetry ?? (() => window.location.reload())}>
        Try again
      </Button>
    </div>
  );
}