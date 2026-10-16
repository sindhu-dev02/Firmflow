import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  noun?: string; // "products", "orders"
}

// "Showing 21–40 of 53"  [Previous] [Next]. Hidden when everything fits on one page.
export function Pagination({ page, pages, total, limit, onPageChange, noun = 'items' }: PaginationProps) {
  if (pages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <nav aria-label="Pages" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {total} {noun}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Page {page} of {pages}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={14} /> Previous
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          Next <ChevronRight size={14} />
        </Button>
      </div>
    </nav>
  );
}