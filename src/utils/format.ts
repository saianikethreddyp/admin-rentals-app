const rupee = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** 1800 -> "₹1,800"; 125000 -> "₹1,25,000" */
export function money(n: number): string {
  return `₹${rupee.format(n)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/** "17 Nov" */
export function shortDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "3:05 PM" */
export function timeOfDay(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "17 Nov, 3:05 PM" */
export function dateTime(iso: string | Date): string {
  return `${shortDate(iso)}, ${timeOfDay(iso)}`;
}

/** "17 Nov 2026" */
export function fullDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${shortDate(d)} ${d.getFullYear()}`;
}

/** "5 min ago", "3 h ago", "2 d ago", or a date for older times. */
export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return 'never';
  const secs = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} h ago`;
  if (secs < 7 * 86400) return `${Math.floor(secs / 86400)} d ago`;
  return fullDate(iso);
}

/** "+919876543210" -> "+91 98765 43210". Other formats are returned unchanged. */
export function phoneDisplay(e164: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

/** Whole days (rounded up) between two ISO times, at least 1. */
export function billableDays(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

/** Start of the day (local time) plus an offset in days. */
export function dayStart(offsetDays = 0, from: Date = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays, 0, 0, 0, 0);
  return d;
}

export function initials(name: string | null | undefined, fallback = '?'): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return (parts[0]![0]! + (parts.length > 1 ? parts[parts.length - 1]![0]! : '')).toUpperCase();
}
