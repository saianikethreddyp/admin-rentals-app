import { billableDays, dayStart, initials, money, phoneDisplay, timeAgo } from './format';
import { isEmail, normalizePlate, validateCar, validateHub, validateNewPassword, type CarFormValues } from './validation';

describe('format', () => {
  it('formats rupees with Indian grouping', () => {
    expect(money(1800)).toBe('₹1,800');
    expect(money(125000)).toBe('₹1,25,000');
  });

  it('formats phone numbers', () => {
    expect(phoneDisplay('+919876543210')).toBe('+91 98765 43210');
    expect(phoneDisplay('+14155552671')).toBe('+14155552671');
  });

  it('rounds booking days up with a minimum of one', () => {
    expect(billableDays('2026-11-20T10:00:00Z', '2026-11-20T12:00:00Z')).toBe(1);
    expect(billableDays('2026-11-20T10:00:00Z', '2026-11-21T10:00:00Z')).toBe(1);
    expect(billableDays('2026-11-20T10:00:00Z', '2026-11-21T10:01:00Z')).toBe(2);
  });

  it('describes how long ago something happened', () => {
    const now = new Date('2026-11-17T12:00:00Z');
    expect(timeAgo(null, now)).toBe('never');
    expect(timeAgo('2026-11-17T11:59:40Z', now)).toBe('just now');
    expect(timeAgo('2026-11-17T11:30:00Z', now)).toBe('30 min ago');
    expect(timeAgo('2026-11-17T09:00:00Z', now)).toBe('3 h ago');
    expect(timeAgo('2026-11-15T12:00:00Z', now)).toBe('2 d ago');
  });

  it('computes day boundaries and initials', () => {
    const d = dayStart(1, new Date(2026, 10, 17, 15, 30));
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 18, 0]);
    expect(initials('Asha Rao')).toBe('AR');
    expect(initials('  madonna ')).toBe('M');
    expect(initials(null)).toBe('?');
  });
});

describe('validation', () => {
  const good: CarFormValues = { hub_id: 'h1', brand: 'Maruti', model: 'Swift', plate: 'ts 09 ea 1234', year: '2023', fuel_type: 'petrol', transmission: 'manual', seats: '5', price_per_day: '1800' };

  it('accepts a valid car and normalizes plates', () => {
    expect(validateCar(good, true)).toEqual({});
    expect(normalizePlate('ts 09-ea 1234')).toBe('TS09EA1234');
  });

  it('flags each invalid car field', () => {
    const e = validateCar({ ...good, hub_id: '', brand: ' ', plate: 'NOPE', year: '1999', seats: '0', price_per_day: '12.5' }, true);
    expect(Object.keys(e).sort()).toEqual(['brand', 'hub_id', 'plate', 'price_per_day', 'seats', 'year']);
    expect(validateCar({ ...good, hub_id: '' }, false)).toEqual({}); // hub is fixed when editing
  });

  it('requires a hub name, address and a pin', () => {
    expect(validateHub({ name: 'Madhapur', address: 'Hitech City Road', latitude: 17.4, longitude: 78.3 })).toEqual({});
    expect(Object.keys(validateHub({ name: 'M', address: 'x', latitude: null, longitude: null })).sort()).toEqual(['address', 'location', 'name']);
  });

  it('applies the password and email rules', () => {
    expect(validateNewPassword('short')).not.toBeNull();
    expect(validateNewPassword('a-long-enough-password')).toBeNull();
    expect(validateNewPassword('x'.repeat(129))).not.toBeNull();
    expect(isEmail('admin@thandra.local')).toBe(true);
    expect(isEmail('not-an-email')).toBe(false);
  });
});
