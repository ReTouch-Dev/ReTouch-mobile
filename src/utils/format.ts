/**
 * Pure formatting utilities.
 * No React imports, no side-effects — safe to use anywhere.
 */

/** Format a monetary value with the given ISO-4217 currency code (default HKD). */
export function formatCurrency(
  value: number | null | undefined,
  currency: string | null | undefined = 'HKD',
  opts: { showSign?: boolean } = {},
): string {
  if (value == null) return '—';
  const code = currency || 'HKD';
  let formatted: string;
  try {
    formatted = value.toLocaleString('en', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    formatted = `${code} ${value.toFixed(2)}`;
  }
  return opts.showSign && value > 0 ? `+${formatted}` : formatted;
}

/** Format an ISO date string. Returns "—" for falsy input. */
export function formatDate(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-HK', opts);
  } catch {
    return '—';
  }
}

/** Format an ISO date string as relative (e.g. "2 days ago"). */
export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(iso, { day: 'numeric', month: 'short' });
}

/** Format a "HH:MM:SS" time string to 12-hour format. Returns "—" for falsy input. */
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m} ${suffix}`;
}

/** Format a decimal ratio (0–1) as a percentage string. */
export function formatConfidence(ratio: number | null | undefined): string {
  if (ratio == null) return '—';
  return `${(ratio * 100).toFixed(0)}%`;
}

/** Extract the first initial from a name or email. */
export function getInitial(name: string | null | undefined, fallback = '?'): string {
  if (name && name.trim().length > 0) return name.trim()[0].toUpperCase();
  return fallback;
}

/** Truncate a string to maxLen characters, appending "…". */
export function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : `${str.slice(0, maxLen - 1)}…`;
}
