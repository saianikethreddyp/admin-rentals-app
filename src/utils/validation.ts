// Client-side checks. They mirror the server rules so people get instant
// feedback; the server remains the source of truth.

const PLATE_RE = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

export function normalizePlate(s: string): string {
  return s.toUpperCase().replace(/[\s-]/g, '');
}

export type CarFormValues = {
  hub_id: string;
  brand: string;
  model: string;
  plate: string;
  year: string;
  fuel_type: string;
  transmission: string;
  seats: string;
  price_per_day: string;
};

export function validateCar(v: CarFormValues, needHub: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (needHub && !v.hub_id) e.hub_id = 'Choose a hub';
  if (!v.brand.trim()) e.brand = 'Enter the brand';
  if (!v.model.trim()) e.model = 'Enter the model';
  if (!PLATE_RE.test(normalizePlate(v.plate))) e.plate = 'Use a registration number like TS09EA1234';
  const year = Number(v.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) e.year = 'Enter a year between 2000 and 2100';
  if (!v.fuel_type) e.fuel_type = 'Choose a fuel type';
  if (!v.transmission) e.transmission = 'Choose a transmission';
  const seats = Number(v.seats);
  if (!Number.isInteger(seats) || seats < 1 || seats > 20) e.seats = 'Enter 1 to 20 seats';
  const price = Number(v.price_per_day);
  if (!Number.isInteger(price) || price < 1 || price > 1_000_000) e.price_per_day = 'Enter the daily price in whole rupees';
  return e;
}

export type HubFormValues = { name: string; address: string; latitude: number | null; longitude: number | null };

export function validateHub(v: HubFormValues): Record<string, string> {
  const e: Record<string, string> = {};
  const name = v.name.trim();
  if (name.length < 2 || name.length > 100) e.name = 'Enter a name (2 to 100 characters)';
  const address = v.address.trim();
  if (address.length < 5 || address.length > 300) e.address = 'Enter the full address (5 to 300 characters)';
  if (v.latitude === null || v.longitude === null) e.location = 'Pin the hub location on the map';
  return e;
}

/** Password rule shared with the server: 12 to 128 characters. */
export function validateNewPassword(pw: string): string | null {
  if (pw.length < 12) return 'Use at least 12 characters';
  if (pw.length > 128) return 'Use at most 128 characters';
  return null;
}

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()) && s.trim().length <= 254;
}
