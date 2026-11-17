import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button } from 'react-native-paper';

import type { CarInput, CarPatch } from '@/api/hooks';
import type { Car, CarStatus, FuelType, Hub, Transmission } from '@/api/types';
import { spacing } from '@/theme';
import { normalizePlate, validateCar, type CarFormValues } from '@/utils/validation';
import { FormField, Select, type Option } from './ui';

const FUEL: Option<FuelType>[] = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'cng', label: 'CNG' },
  { value: 'electric', label: 'Electric' },
];
const TRANSMISSION: Option<Transmission>[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automatic' },
];
const STATUS: Option<CarStatus>[] = [
  { value: 'available', label: 'Available', description: 'Can be booked' },
  { value: 'maintenance', label: 'Under maintenance', description: 'Hidden from customers for now' },
  { value: 'retired', label: 'Retired', description: 'Removed from the fleet (history is kept)' },
];

type Props = {
  hubs: Hub[];
  /** Present when editing an existing car. */
  car?: Car;
  submitting: boolean;
  serverErrors?: Record<string, string>;
  onCreate?: (input: CarInput) => void;
  onUpdate?: (patch: CarPatch) => void;
  defaultHubId?: string;
};

export function CarForm({ hubs, car, submitting, serverErrors, onCreate, onUpdate, defaultHubId }: Props) {
  const [v, setV] = useState<CarFormValues>({
    hub_id: car?.hub_id ?? defaultHubId ?? (hubs.length === 1 ? hubs[0]!.id : ''),
    brand: car?.brand ?? '',
    model: car?.model ?? '',
    plate: car?.plate ?? '',
    year: car ? String(car.year) : String(new Date().getFullYear()),
    fuel_type: car?.fuel_type ?? 'petrol',
    transmission: car?.transmission ?? 'manual',
    seats: car ? String(car.seats) : '5',
    price_per_day: car ? String(car.price_per_day) : '',
  });
  const [status, setStatus] = useState<CarStatus>(car?.status ?? 'available');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof CarFormValues) => (t: string) => setV((s) => ({ ...s, [k]: t }));

  const hubOptions = useMemo<Option<string>[]>(() => hubs.filter((h) => h.active || h.id === car?.hub_id).map((h) => ({ value: h.id, label: h.name, description: h.address })), [hubs, car]);
  const err = (k: string) => errors[k] ?? serverErrors?.[k];

  function submit() {
    const found = validateCar(v, !car);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const common = {
      brand: v.brand.trim(),
      model: v.model.trim(),
      plate: normalizePlate(v.plate),
      year: Number(v.year),
      fuel_type: v.fuel_type as FuelType,
      transmission: v.transmission as Transmission,
      seats: Number(v.seats),
      price_per_day: Number(v.price_per_day),
    };
    if (car) onUpdate?.({ ...common, status });
    else onCreate?.({ ...common, hub_id: v.hub_id });
  }

  return (
    <View>
      <Select label="Hub" value={v.hub_id} options={hubOptions} onChange={(x) => setV((s) => ({ ...s, hub_id: x }))} error={err('hub_id')} disabled={!!car} />
      <FormField label="Brand" value={v.brand} onChangeText={set('brand')} autoCapitalize="words" error={err('brand')} placeholder="Maruti" />
      <FormField label="Model" value={v.model} onChangeText={set('model')} autoCapitalize="words" error={err('model')} placeholder="Swift" />
      <FormField label="Registration number" value={v.plate} onChangeText={(t) => set('plate')(t.toUpperCase())} autoCapitalize="characters" error={err('plate')} placeholder="TS09EA1234" />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <FormField label="Year" value={v.year} onChangeText={set('year')} keyboardType="number-pad" maxLength={4} error={err('year')} />
        </View>
        <View style={{ flex: 1 }}>
          <FormField label="Seats" value={v.seats} onChangeText={set('seats')} keyboardType="number-pad" maxLength={2} error={err('seats')} />
        </View>
      </View>
      <Select label="Fuel" value={v.fuel_type as FuelType} options={FUEL} onChange={(x) => setV((s) => ({ ...s, fuel_type: x }))} error={err('fuel_type')} />
      <Select label="Transmission" value={v.transmission as Transmission} options={TRANSMISSION} onChange={(x) => setV((s) => ({ ...s, transmission: x }))} error={err('transmission')} />
      <FormField label="Price per day (₹)" value={v.price_per_day} onChangeText={set('price_per_day')} keyboardType="number-pad" error={err('price_per_day')} placeholder="1800" />
      {car ? <Select label="Status" value={status} options={STATUS} onChange={setStatus} /> : null}

      <Button mode="contained" onPress={submit} loading={submitting} disabled={submitting} contentStyle={{ paddingVertical: 6 }} style={{ marginTop: spacing.sm }}>
        {car ? 'Save changes' : 'Add car'}
      </Button>
    </View>
  );
}
