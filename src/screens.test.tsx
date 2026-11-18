import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { PaperProvider } from 'react-native-paper';

import { ApiError } from '@/api/client';
import type { Booking, Car, Hub } from '@/api/types';
import { theme } from '@/theme';

// ---- mocks -----------------------------------------------------------------

jest.mock('@/components/MapPicker', () => {
  const { Pressable, Text } = require('react-native');
  return {
    MapPicker: ({ onChange }: { onChange: (p: { latitude: number; longitude: number }) => void }) => (
      <Pressable onPress={() => onChange({ latitude: 17.4483, longitude: 78.3915 })}>
        <Text>drop pin</Text>
      </Pressable>
    ),
    reverseGeocode: jest.fn(async () => 'Hitech City Road, Madhapur, Hyderabad'),
    searchPlaces: jest.fn(async () => []),
  };
});

const mockLogin = jest.fn();
jest.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, offline: false, retryRestore: jest.fn(), admin: { id: 'a1', name: 'Asha Rao', email: 'asha@thandra.local', must_change_password: false } }),
}));

const mockDashboard = jest.fn();
jest.mock('@/api/hooks', () => ({
  useDashboard: () => mockDashboard(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

// ---- helpers ---------------------------------------------------------------

const renderWithPaper = async (ui: ReactElement) => render(<PaperProvider theme={theme}>{ui}</PaperProvider>);

const hub: Hub = { id: 'h1', name: 'Madhapur', address: 'Hitech City Road', latitude: 17.4, longitude: 78.3, active: true, created_at: '', updated_at: '' };
const car: Car = {
  id: 'c1', hub_id: 'h1', brand: 'Maruti', model: 'Swift', plate: 'TS09EA1234', year: 2023, fuel_type: 'petrol', transmission: 'manual',
  seats: 5, price_per_day: 1800, photos: [], status: 'available', created_at: '', updated_at: '',
};

// ---- tests -----------------------------------------------------------------

describe('CarForm', () => {
  const { CarForm } = require('@/components/CarForm');

  it('shows validation errors and does not submit an empty form', async () => {
    const onCreate = jest.fn();
    await renderWithPaper(<CarForm hubs={[hub, { ...hub, id: 'h2', name: 'KPHB' }]} submitting={false} onCreate={onCreate} />);
    await fireEvent.press(screen.getByText('Add car'));
    expect(screen.getByText('Choose a hub')).toBeTruthy();
    expect(screen.getByText('Enter the brand')).toBeTruthy();
    expect(screen.getByText('Use a registration number like TS09EA1234')).toBeTruthy();
    expect(screen.getByText('Enter the daily price in whole rupees')).toBeTruthy();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('submits normalized values when valid', async () => {
    const onCreate = jest.fn();
    await renderWithPaper(<CarForm hubs={[hub]} submitting={false} onCreate={onCreate} />);
    await fireEvent.changeText(screen.getByLabelText('Brand'), ' Maruti ');
    await fireEvent.changeText(screen.getByLabelText('Model'), 'Swift');
    await fireEvent.changeText(screen.getByLabelText('Registration number'), 'ts 09 ea 1234');
    await fireEvent.changeText(screen.getByLabelText('Price per day (₹)'), '1800');
    await fireEvent.press(screen.getByText('Add car'));
    expect(onCreate).toHaveBeenCalledWith({
      hub_id: 'h1', brand: 'Maruti', model: 'Swift', plate: 'TS09EA1234', year: new Date().getFullYear(),
      fuel_type: 'petrol', transmission: 'manual', seats: 5, price_per_day: 1800, enabled: true,
    });
  });

  it('can add a car as disabled', async () => {
    const onCreate = jest.fn();
    await renderWithPaper(<CarForm hubs={[hub]} submitting={false} onCreate={onCreate} />);
    await fireEvent.changeText(screen.getByLabelText('Brand'), 'Maruti');
    await fireEvent.changeText(screen.getByLabelText('Model'), 'Swift');
    await fireEvent.changeText(screen.getByLabelText('Registration number'), 'TS09EA1234');
    await fireEvent.changeText(screen.getByLabelText('Price per day (₹)'), '1800');
    await fireEvent(screen.getByRole('switch'), 'valueChange', false);
    await fireEvent.press(screen.getByText('Add car'));
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('edits an existing car without asking for the hub', async () => {
    const onUpdate = jest.fn();
    await renderWithPaper(<CarForm hubs={[hub]} car={car} submitting={false} onUpdate={onUpdate} />);
    await fireEvent.changeText(screen.getByLabelText('Price per day (₹)'), '2000');
    await fireEvent.press(screen.getByText('Save changes'));
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ price_per_day: 2000, status: 'available', plate: 'TS09EA1234' }));
  });

  it('shows errors returned by the server under the field', async () => {
    await renderWithPaper(<CarForm hubs={[hub]} car={car} submitting={false} serverErrors={{ plate: 'a car with this plate already exists' }} />);
    expect(screen.getByText('a car with this plate already exists')).toBeTruthy();
  });
});

describe('HubForm', () => {
  const { HubForm } = require('@/components/HubForm');

  it('requires a pin on the map before saving', async () => {
    const onSubmit = jest.fn();
    await renderWithPaper(<HubForm submitting={false} onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByLabelText('Hub name'), 'Madhapur');
    await fireEvent.changeText(screen.getByLabelText('Address'), 'Hitech City Road, Madhapur');
    await fireEvent.press(screen.getByText('Add hub'));
    expect(screen.getByText('Pin the hub location on the map')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits coordinates taken from the pin and fills the address automatically', async () => {
    const onSubmit = jest.fn();
    await renderWithPaper(<HubForm submitting={false} onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByLabelText('Hub name'), 'Madhapur');
    await fireEvent.press(screen.getByText('drop pin'));
    await waitFor(() => expect(screen.getByDisplayValue('Hitech City Road, Madhapur, Hyderabad')).toBeTruthy());
    await fireEvent.press(screen.getByText('Add hub'));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Madhapur', address: 'Hitech City Road, Madhapur, Hyderabad', latitude: 17.4483, longitude: 78.3915 });
  });

  it('never overwrites an address the admin typed', async () => {
    await renderWithPaper(<HubForm submitting={false} onSubmit={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText('Address'), 'Plot 5, Near metro station');
    await fireEvent.press(screen.getByText('drop pin'));
    await waitFor(() => expect(screen.getByDisplayValue('Plot 5, Near metro station')).toBeTruthy());
  });

  it('offers the active switch only when editing', async () => {
    await renderWithPaper(<HubForm hub={hub} submitting={false} onSubmit={jest.fn()} />);
    expect(screen.getByText('Active')).toBeTruthy();
  });
});

describe('Login screen', () => {
  const LoginScreen = require('../app/login').default;

  beforeEach(() => { mockLogin.mockReset(); });

  it('signs in with the typed credentials', async () => {
    mockLogin.mockResolvedValue(undefined);
    await renderWithPaper(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'asha@thandra.local');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'a-very-long-password');
    await fireEvent.press(screen.getByText('Sign in'));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('asha@thandra.local', 'a-very-long-password'));
  });

  it('shows a clear message for a wrong password', async () => {
    mockLogin.mockRejectedValue(new ApiError(401, 'unauthorized', 'invalid email or password'));
    await renderWithPaper(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'asha@thandra.local');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'wrong');
    await fireEvent.press(screen.getByText('Sign in'));
    expect(await screen.findByText('Wrong email or password.')).toBeTruthy();
  });

  it('keeps Sign in disabled until both fields are filled', async () => {
    await renderWithPaper(<LoginScreen />);
    await fireEvent.press(screen.getByText('Sign in'));
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

describe('Dashboard', () => {
  const DashboardScreen = require('../app/(tabs)/index').default;

  const stats = {
    bookings: { pickups_today: 3, active_rides: 2, upcoming_confirmed: 5, completed_this_month: 12, revenue_this_month: 125000 },
    customers: { total: 48, new_last_7_days: 6 },
    hubs: [{ id: 'h1', name: 'Madhapur', active: true, total_cars: 8, available: 5, in_use: 2, maintenance: 1 }],
  };

  it('shows the headline numbers and the fleet per hub', async () => {
    mockDashboard.mockReturnValue({ data: stats, isLoading: false, error: null, refetch: jest.fn(), isRefetching: false });
    await renderWithPaper(<DashboardScreen />);
    expect(screen.getByText('Hello, Asha')).toBeTruthy();
    expect(screen.getByText('Pickups today')).toBeTruthy();
    expect(screen.getByText('₹1,25,000')).toBeTruthy();
    expect(screen.getByText('12 completed rides')).toBeTruthy();
    expect(screen.getByText('+6 this week')).toBeTruthy();
    expect(screen.getByText('Madhapur')).toBeTruthy();
    expect(screen.getByText('5 available')).toBeTruthy();
  });

  it('guides the admin to add a first hub when there are none', async () => {
    mockDashboard.mockReturnValue({ data: { ...stats, hubs: [] }, isLoading: false, error: null, refetch: jest.fn(), isRefetching: false });
    await renderWithPaper(<DashboardScreen />);
    expect(screen.getByText('Add a hub')).toBeTruthy();
  });

  it('shows a retry option when loading fails', async () => {
    mockDashboard.mockReturnValue({ data: undefined, isLoading: false, error: new ApiError(0, 'network', "Can't reach the server. Check your internet connection."), refetch: jest.fn(), isRefetching: false });
    await renderWithPaper(<DashboardScreen />);
    expect(screen.getByText("Can't reach the server. Check your internet connection.")).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
  });
});

describe('BookingCard', () => {
  const { BookingCard } = require('@/components/BookingCard');
  const booking: Booking = {
    id: 'b1', user_id: 'u1', car_id: 'c1', hub_id: 'h1', start_at: '2026-11-20T10:00:00+05:30', end_at: '2026-11-21T10:00:00+05:30',
    status: 'confirmed', price_per_day: 1800, total_price: 1800, started_at: null, completed_at: null, cancelled_at: null, created_at: '2026-11-17T10:00:00Z',
    car_brand: 'Maruti', car_model: 'Swift', car_plate: 'TS09EA1234', hub_name: 'Madhapur', hub_address: 'Hitech City', hub_latitude: 17.4, hub_longitude: 78.3,
    customer: { name: 'Asha', phone: '+919876543210' },
  };

  it('summarizes the booking', async () => {
    const onPress = jest.fn();
    await renderWithPaper(<BookingCard booking={booking} onPress={onPress} />);
    expect(screen.getByText('Maruti Swift')).toBeTruthy();
    expect(screen.getByText('Confirmed')).toBeTruthy();
    expect(screen.getByText('₹1,800')).toBeTruthy();
    expect(screen.getByText(/Asha/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Maruti Swift'));
    expect(onPress).toHaveBeenCalled();
  });
});
