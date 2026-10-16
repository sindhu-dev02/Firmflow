// One-time restyle helper. Run it from the client folder:  node restyle.mjs
// It swaps old fixed colors and styles in the pages for the new theme.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const swaps = [
  // table headers: sentence case instead of ALL CAPS
  ['text-xs font-medium uppercase text-muted-foreground', 'text-[13px] font-medium text-muted-foreground'],
  // flat cards: no grey shadow
  ['bg-card text-foreground shadow-sm', 'bg-card text-foreground ring-1 ring-border'],
  ['bg-card shadow-sm', 'bg-card'],
  ['bg-card p-8 shadow-sm', 'bg-card p-8'],
  // fixed colors -> theme colors
  ['text-green-600', 'text-success'],
  ['text-red-500', 'text-destructive'],
  ['text-sky-600 dark:text-sky-400', 'text-primary'],
  ['text-emerald-500', 'text-success'],
  [
    "'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400'",
    "'bg-success/10 text-success ring-success/25'",
  ],
  [
    'bg-amber-500/10 px-3 py-2 text-sm text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400',
    'bg-warning/15 px-3 py-2 text-sm text-foreground ring-1 ring-inset ring-warning/40',
  ],
  // form boxes sit on white cards, not on the page color
  ['bg-background px-3', 'bg-card px-3'],
  ['bg-background px-2', 'bg-card px-2'],
  // marigold text is too faint on white, so use a darker amber in light mode
  ["'text-warning'", "'text-amber-700 dark:text-warning'"],
  // big numbers on the dashboard use the display font
  ['mt-2 text-3xl font-bold text-foreground', 'mt-2 font-display text-3xl font-semibold text-foreground'],
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.tsx') ? [full] : [];
  });
}

const counts = new Map();
for (const file of walk('src')) {
  let text = readFileSync(file, 'utf8');
  const before = text;
  for (const [from, to] of swaps) {
    const parts = text.split(from);
    if (parts.length > 1) {
      counts.set(from, (counts.get(from) ?? 0) + parts.length - 1);
      text = parts.join(to);
    }
  }
  if (text !== before) writeFileSync(file, text);
}

for (const [from] of swaps) {
  console.log(`${String(counts.get(from) ?? 0).padStart(3)}  ${from.slice(0, 70)}`);
}
