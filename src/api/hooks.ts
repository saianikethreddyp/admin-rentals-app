import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/api';
import { PAGE_SIZE } from '@/config';
import type { Admin, Booking, Car, CarStatus, Contact, Customer, Dashboard, FuelType, Hub, Page, Transmission } from './types';

type Query = Record<string, string | number | boolean | undefined | null>;

function useInfiniteList<T>(key: unknown[], path: string, query: Query, enabled = true) {
  return useInfiniteQuery({
    queryKey: key,
    enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => api.request<Page<T>>(path, { query: { ...query, limit: PAGE_SIZE, offset: pageParam } }),
    getNextPageParam: (last) => {
      const next = last.offset + last.data.length;
      return next < last.total ? next : undefined;
    },
  });
}

/** Flattens the pages of an infinite query into one array. */
export function flatten<T>(data: { pages: Page<T>[] } | undefined): T[] {
  return data?.pages.flatMap((p) => p.data) ?? [];
}

// ---------------------------------------------------------------- dashboard

export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: () => api.request<Dashboard>('/v1/dashboard'), refetchInterval: 60_000 });

// ----------------------------------------------------------------- bookings

export type BookingFilters = { status?: string; hub_id?: string; from?: string; to?: string; q?: string; user_id?: string };

export const useBookings = (f: BookingFilters) => useInfiniteList<Booking>(['bookings', f], '/v1/bookings', f);

export const useBooking = (id: string) => useQuery({ queryKey: ['booking', id], queryFn: () => api.request<Booking>(`/v1/bookings/${id}`) });

export type BookingAction = 'start' | 'complete' | 'cancel';

export function useBookingAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: BookingAction }) =>
      api.request<Booking>(`/v1/bookings/${id}/${action}`, { method: 'POST' }),
    onSuccess: (b) => {
      qc.setQueryData(['booking', b.id], b);
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Contacts are only fetched on demand: every view is written to the audit log. */
export const useBookingContacts = (id: string) =>
  useQuery({
    queryKey: ['booking-contacts', id],
    queryFn: () => api.request<{ booking_id: string; contacts: Contact[] }>(`/v1/bookings/${id}/contacts`),
    enabled: false,
    staleTime: 0,
    gcTime: 0,
  });

// --------------------------------------------------------------------- cars

export type CarFilters = { hub_id?: string; status?: string };

export const useCars = (f: CarFilters) => useInfiniteList<Car>(['cars', f], '/v1/cars', f);

export const useCar = (id: string, enabled = true) =>
  useQuery({ queryKey: ['car', id], queryFn: () => api.request<Car>(`/v1/cars/${id}`), enabled });

export type CarInput = {
  hub_id: string;
  brand: string;
  model: string;
  plate: string;
  year: number;
  fuel_type: FuelType;
  transmission: Transmission;
  seats: number;
  price_per_day: number;
};

export type CarPatch = Partial<Omit<CarInput, 'hub_id'>> & { status?: CarStatus };

function useCarCache() {
  const qc = useQueryClient();
  return (car: Car) => {
    qc.setQueryData(['car', car.id], car);
    qc.invalidateQueries({ queryKey: ['cars'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

/** `enabled: false` adds the car disabled (status "maintenance"), so customers cannot see or book it yet. */
export type NewCar = CarInput & { enabled?: boolean };

export function useCreateCar() {
  const cache = useCarCache();
  return useMutation({
    mutationFn: async ({ enabled = true, ...input }: NewCar) => {
      const car = await api.request<Car>('/v1/cars', { method: 'POST', body: input });
      if (enabled) return car;
      return api.request<Car>(`/v1/cars/${car.id}`, { method: 'PATCH', body: { status: 'maintenance' } satisfies CarPatch });
    },
    onSuccess: cache,
  });
}

export function useUpdateCar(id: string) {
  const cache = useCarCache();
  return useMutation({ mutationFn: (patch: CarPatch) => api.request<Car>(`/v1/cars/${id}`, { method: 'PATCH', body: patch }), onSuccess: cache });
}

export type PickedImage = { uri: string; mimeType?: string | null; fileName?: string | null };

export function useUploadPhoto(carId: string) {
  const cache = useCarCache();
  return useMutation({
    mutationFn: (img: PickedImage) => {
      const form = new FormData();
      form.append('file', { uri: img.uri, name: img.fileName ?? 'photo.jpg', type: img.mimeType ?? 'image/jpeg' } as unknown as Blob);
      return api.request<Car>(`/v1/cars/${carId}/photos`, { method: 'POST', form });
    },
    onSuccess: cache,
  });
}

export function useDeletePhoto(carId: string) {
  const cache = useCarCache();
  return useMutation({
    mutationFn: (key: string) => api.request<Car>(`/v1/cars/${carId}/photos`, { method: 'DELETE', body: { key } }),
    onSuccess: cache,
  });
}

// --------------------------------------------------------------------- hubs

export const useHubs = () =>
  useQuery({ queryKey: ['hubs'], queryFn: async () => (await api.request<{ data: Hub[] }>('/v1/hubs')).data });

export const useHub = (id: string, enabled = true) =>
  useQuery({ queryKey: ['hub', id], queryFn: () => api.request<Hub>(`/v1/hubs/${id}`), enabled });

export type HubInput = { name: string; address: string; latitude: number; longitude: number };

export function useSaveHub(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HubInput & { active?: boolean }) =>
      id ? api.request<Hub>(`/v1/hubs/${id}`, { method: 'PATCH', body: input }) : api.request<Hub>('/v1/hubs', { method: 'POST', body: input }),
    onSuccess: (hub) => {
      qc.setQueryData(['hub', hub.id], hub);
      qc.invalidateQueries({ queryKey: ['hubs'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Deletes a hub that has no cars or bookings. The API answers 409 otherwise. */
export function useDeleteHub(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.request<void>(`/v1/hubs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['hub', id] });
      qc.invalidateQueries({ queryKey: ['hubs'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ---------------------------------------------------------------- customers

export const useCustomers = (q: string) => useInfiniteList<Customer>(['customers', q], '/v1/users', { q });

export const useCustomer = (id: string) => useQuery({ queryKey: ['customer', id], queryFn: () => api.request<Customer>(`/v1/users/${id}`) });

export function useSetCustomerActive(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (active: boolean) => api.request<Customer>(`/v1/users/${id}`, { method: 'PATCH', body: { active } }),
    onSuccess: (c) => {
      qc.setQueryData(['customer', id], c);
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

// ------------------------------------------------------------------- admins

export const useAdmins = () =>
  useQuery({ queryKey: ['admins'], queryFn: async () => (await api.request<{ data: Admin[] }>('/v1/admins')).data });

export function useCreateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; name: string; password: string }) => api.request<Admin>('/v1/admins', { method: 'POST', body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admins'] }),
  });
}

export function useSetAdminActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.request<Admin>(`/v1/admins/${id}`, { method: 'PATCH', body: { active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admins'] }),
  });
}

export function useResetAdminPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.request<void>(`/v1/admins/${id}/reset-password`, { method: 'POST', body: { new_password: password } }),
  });
}

// ------------------------------------------------------------ notifications

export function useSendNotification() {
  return useMutation({
    mutationFn: (input: { user_id: string; title: string; body: string }) =>
      api.request<{ devices_notified: number }>('/v1/notifications', { method: 'POST', body: input }),
  });
}
