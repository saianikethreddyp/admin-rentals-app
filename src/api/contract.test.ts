/**
 * Optional contract check against a running API. It is skipped unless
 * CONTRACT_API_URL, CONTRACT_EMAIL and CONTRACT_PASSWORD are set:
 *
 *   CONTRACT_API_URL=http://localhost:8080 CONTRACT_EMAIL=... CONTRACT_PASSWORD=... npm test -- contract
 *
 * It verifies that real responses contain every field the app's types expect.
 */
import { createClient } from './client';
import type { LoginResult } from './types';

const url = process.env.CONTRACT_API_URL;
const email = process.env.CONTRACT_EMAIL;
const password = process.env.CONTRACT_PASSWORD;
const run = url && email && password ? describe : describe.skip;

const keys = (o: object) => Object.keys(o);

run('API contract', () => {
  const store = { v: null as string | null, getRefresh: async () => store.v, setRefresh: async (t: string | null) => void (store.v = t) };
  const client = createClient({ baseUrl: url ?? '', store, timeoutMs: 30_000 });

  beforeAll(async () => {
    const res = await client.request<LoginResult>('/v1/auth/login', { method: 'POST', body: { email, password }, auth: false });
    await client.setTokens(res.tokens);
    expect(keys(res.admin)).toEqual(expect.arrayContaining(['id', 'email', 'name', 'active', 'last_login_at', 'must_change_password', 'created_at']));
  });

  it('dashboard has the fields the home screen reads', async () => {
    const d = await client.request<any>('/v1/dashboard');
    expect(keys(d.bookings).sort()).toEqual(['active_rides', 'completed_this_month', 'pickups_today', 'revenue_this_month', 'upcoming_confirmed']);
    expect(keys(d.customers).sort()).toEqual(['new_last_7_days', 'total']);
    expect(Array.isArray(d.hubs)).toBe(true);
    for (const h of d.hubs) expect(keys(h).sort()).toEqual(['active', 'available', 'id', 'in_use', 'maintenance', 'name', 'total_cars']);
  });

  it('list endpoints use the page envelope the hooks expect', async () => {
    for (const path of ['/v1/cars', '/v1/bookings', '/v1/users']) {
      const p = await client.request<any>(path, { query: { limit: 5, offset: 0 } });
      expect(keys(p).sort()).toEqual(['data', 'limit', 'offset', 'total']);
    }
  });

  it('hubs and admins are wrapped in {data}', async () => {
    const hubs = await client.request<any>('/v1/hubs');
    expect(Array.isArray(hubs.data)).toBe(true);
    for (const h of hubs.data) expect(keys(h)).toEqual(expect.arrayContaining(['id', 'name', 'address', 'latitude', 'longitude', 'active', 'created_at', 'updated_at']));
    const admins = await client.request<any>('/v1/admins');
    expect(admins.data.length).toBeGreaterThan(0);
    expect(keys(admins.data[0])).toEqual(expect.arrayContaining(['last_login_at', 'must_change_password', 'active']));
  });

  it('cars, bookings and customers carry the fields the screens read', async () => {
    const cars = await client.request<any>('/v1/cars', { query: { limit: 1 } });
    for (const c of cars.data) {
      expect(keys(c)).toEqual(expect.arrayContaining(['id', 'hub_id', 'brand', 'model', 'plate', 'year', 'fuel_type', 'transmission', 'seats', 'price_per_day', 'photos', 'status']));
      for (const p of c.photos) expect(keys(p).sort()).toEqual(['key', 'url']);
    }
    const bookings = await client.request<any>('/v1/bookings', { query: { limit: 1 } });
    for (const b of bookings.data) {
      expect(keys(b)).toEqual(expect.arrayContaining(['id', 'user_id', 'car_id', 'status', 'start_at', 'end_at', 'total_price', 'car_brand', 'car_model', 'car_plate', 'hub_name', 'hub_address', 'hub_latitude', 'hub_longitude', 'customer']));
      expect(keys(b.customer).sort()).toEqual(['name', 'phone']);
    }
    const users = await client.request<any>('/v1/users', { query: { limit: 1 } });
    for (const u of users.data) expect(keys(u).sort()).toEqual(['active', 'contacts_synced_at', 'created_at', 'id', 'name', 'phone']);
  });
});
