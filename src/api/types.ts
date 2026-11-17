// Shapes returned by the Thandra API (see thandra-api/api/openapi.yaml).

export type Page<T> = { data: T[]; total: number; limit: number; offset: number };

export type Admin = {
  id: string;
  email: string;
  name: string;
  active: boolean;
  last_login_at: string | null;
  must_change_password: boolean;
  created_at: string;
};

export type TokenPair = {
  access_token: string;
  access_expires_at: string;
  refresh_token: string;
  refresh_expires_at: string;
};

export type LoginResult = { tokens: TokenPair; admin: Admin };

export type Hub = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type FuelType = 'petrol' | 'diesel' | 'electric' | 'cng';
export type Transmission = 'manual' | 'automatic';
export type CarStatus = 'available' | 'maintenance' | 'retired';

export type CarPhoto = { key: string; url: string };

export type Car = {
  id: string;
  hub_id: string;
  brand: string;
  model: string;
  plate: string;
  year: number;
  fuel_type: FuelType;
  transmission: Transmission;
  seats: number;
  price_per_day: number;
  photos: CarPhoto[];
  status: CarStatus;
  created_at: string;
  updated_at: string;
};

export type BookingStatusValue = 'confirmed' | 'active' | 'completed' | 'cancelled';

export type Booking = {
  id: string;
  user_id: string;
  car_id: string;
  hub_id: string;
  start_at: string;
  end_at: string;
  status: BookingStatusValue;
  price_per_day: number;
  total_price: number;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  car_brand: string;
  car_model: string;
  car_plate: string;
  hub_name: string;
  hub_address: string;
  hub_latitude: number;
  hub_longitude: number;
  customer: { name: string | null; phone: string };
};

export type Customer = {
  id: string;
  phone: string;
  name: string | null;
  active: boolean;
  contacts_synced_at: string | null;
  created_at: string;
};

export type Contact = { name: string; phone: string };

export type Dashboard = {
  bookings: {
    pickups_today: number;
    active_rides: number;
    upcoming_confirmed: number;
    completed_this_month: number;
    revenue_this_month: number;
  };
  customers: { total: number; new_last_7_days: number };
  hubs: {
    id: string;
    name: string;
    active: boolean;
    total_cars: number;
    available: number;
    in_use: number;
    maintenance: number;
  }[];
};
