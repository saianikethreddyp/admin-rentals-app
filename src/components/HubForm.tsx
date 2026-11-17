import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Switch, Text } from 'react-native-paper';

import type { HubInput } from '@/api/hooks';
import type { Hub } from '@/api/types';
import { colors, spacing } from '@/theme';
import { validateHub } from '@/utils/validation';
import { MapPicker, reverseGeocode, type LatLng } from './MapPicker';
import { FormField, SectionTitle } from './ui';

type Props = {
  hub?: Hub;
  submitting: boolean;
  serverErrors?: Record<string, string>;
  onSubmit: (input: HubInput & { active?: boolean }) => void;
};

export function HubForm({ hub, submitting, serverErrors, onSubmit }: Props) {
  const [name, setName] = useState(hub?.name ?? '');
  const [address, setAddress] = useState(hub?.address ?? '');
  const [pin, setPin] = useState<LatLng | null>(hub ? { latitude: hub.latitude, longitude: hub.longitude } : null);
  const [active, setActive] = useState(hub?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lookingUp, setLookingUp] = useState(false);
  const addressTouched = useRef(!!hub); // never overwrite an address the admin has typed
  const err = (k: string) => errors[k] ?? serverErrors?.[k];

  async function onPin(p: LatLng) {
    setPin(p);
    setErrors((e) => ({ ...e, location: '' }));
    if (addressTouched.current) return;
    setLookingUp(true);
    try {
      const found = await reverseGeocode(p);
      if (found && !addressTouched.current) setAddress(found);
    } catch {
      // The admin can still type the address.
    } finally {
      setLookingUp(false);
    }
  }

  async function useMapAddress() {
    if (!pin) return;
    setLookingUp(true);
    try {
      const found = await reverseGeocode(pin);
      if (found) setAddress(found);
    } finally {
      setLookingUp(false);
    }
  }

  function submit() {
    const found = validateHub({ name, address, latitude: pin?.latitude ?? null, longitude: pin?.longitude ?? null });
    setErrors(found);
    if (Object.keys(found).length > 0 || !pin) return;
    onSubmit({ name: name.trim(), address: address.trim(), latitude: pin.latitude, longitude: pin.longitude, ...(hub ? { active } : {}) });
  }

  return (
    <View>
      <FormField label="Hub name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Madhapur" error={err('name')} />
      <FormField
        label="Address"
        value={address}
        onChangeText={(t) => {
          addressTouched.current = true;
          setAddress(t);
        }}
        multiline
        numberOfLines={3}
        autoCapitalize="sentences"
        error={err('address')}
        placeholder="Street, area, city"
      />
      {pin ? (
        <Button compact icon="map-marker-radius" loading={lookingUp} disabled={lookingUp} onPress={useMapAddress} style={{ alignSelf: 'flex-start', marginTop: -8, marginBottom: spacing.sm }}>
          Fill address from the pin
        </Button>
      ) : null}

      <SectionTitle>Location</SectionTitle>
      <MapPicker value={pin} onChange={onPin} />
      {err('location') ? <Text style={{ color: colors.red, marginTop: 4 }}>{err('location')}</Text> : null}

      {hub ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg }}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text variant="titleSmall">Active</Text>
            <Text variant="bodySmall" style={{ color: colors.muted }}>
              Inactive hubs are hidden from customers and cannot receive new cars.
            </Text>
          </View>
          <Switch value={active} onValueChange={setActive} />
        </View>
      ) : null}

      <Button mode="contained" onPress={submit} loading={submitting} disabled={submitting} contentStyle={{ paddingVertical: 6 }} style={{ marginTop: spacing.xl }}>
        {hub ? 'Save changes' : 'Add hub'}
      </Button>
    </View>
  );
}
