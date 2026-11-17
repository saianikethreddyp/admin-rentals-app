import { ApiError } from '@/api/client';

/** A message that is safe and useful to show to the person using the app. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.details?.length) return e.details.map((d) => `${labelFor(d.field)} ${d.message}`).join('\n');
    return e.message;
  }
  return 'Something went wrong. Please try again.';
}

/** Field errors keyed by field name, for showing under each input. */
export function fieldErrors(e: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (e instanceof ApiError && e.details) for (const d of e.details) out[d.field] = d.message;
  return out;
}

function labelFor(field: string): string {
  const s = field.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
