import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Text } from 'react-native-paper';

import { useCreateCar, useHubs } from '@/api/hooks';
import { CarForm } from '@/components/CarForm';
import { ListState, Panel, Screen, showError, useToast } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { fieldErrors } from '@/utils/errors';
import { useState } from 'react';

export default function NewCarScreen() {
  const router = useRouter();
  const toast = useToast();
  const { hub_id } = useLocalSearchParams<{ hub_id?: string }>();
  const hubs = useHubs();
  const create = useCreateCar();
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  if (!hubs.data) return <ListState isLoading={hubs.isLoading} error={hubs.error} onRetry={hubs.refetch} isEmpty={false} emptyText="" />;

  const activeHubs = hubs.data.filter((h) => h.active);
  if (activeHubs.length === 0) {
    return (
      <Screen>
        <Panel>
          <Text variant="titleMedium" style={{ fontWeight: '600' }}>
            Add a hub first
          </Text>
          <Text style={{ color: colors.muted, marginVertical: spacing.md }}>Every car belongs to a hub, so create at least one active hub before adding cars.</Text>
          <Button mode="contained" onPress={() => router.replace('/hubs/new')}>
            Add a hub
          </Button>
        </Panel>
      </Screen>
    );
  }

  return (
    <Screen>
      <CarForm
        hubs={hubs.data}
        defaultHubId={hub_id}
        submitting={create.isPending}
        serverErrors={serverErrors}
        onCreate={async (input) => {
          setServerErrors({});
          try {
            const car = await create.mutateAsync(input);
            toast.show('Car added. You can add photos now.');
            router.replace({ pathname: '/cars/[id]', params: { id: car.id } });
          } catch (e) {
            const fe = fieldErrors(e);
            if (Object.keys(fe).length) setServerErrors(fe);
            else showError(e, 'Could not add the car');
          }
        }}
      />
    </Screen>
  );
}
