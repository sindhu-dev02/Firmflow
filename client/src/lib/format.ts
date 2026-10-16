// Amounts throughout the billing API are in the smallest currency unit
// (paise for INR), matching what Razorpay itself uses.

export function formatMoney(
  amountInSubunits: number,
  currency: string,
): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: amountInSubunits % 100 === 0 ? 0 : 2,
  }).format(amountInSubunits / 100);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';

  const date = new Date(iso);
  const isThisYear = date.getFullYear() === new Date().getFullYear();

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(isThisYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
  });
}