import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from 'react-native-paper';

import { useHub, useSaveHub } from '@/api/hooks';
import { HubForm } from '@/components/HubForm';
import { confirm, ListState, Screen, showError, useToast } from '@/components/ui';
import { spacing } from '@/theme';
import { fieldErrors } from '@/utils/errors';

export default function EditHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const hub = useHub(id);
  const save = useSaveHub(id);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  if (!hub.data) return <ListState isLoading={hub.isLoading} error={hub.error} onRetry={hub.refetch} isEmpty={false} emptyText="" />;
  const h = hub.data;

  return (
    <Screen>
      <Button mode="contained-tonal" icon="car-multiple" onPress={() => router.navigate({ pathname: '/cars', params: { hub_id: h.id } })} style={{ marginBottom: spacing.lg }}>
        See cars in this hub
      </Button>
      <HubForm
        key={h.updated_at}
        hub={h}
        submitting={save.isPending}
        serverErrors={serverErrors}
        onSubmit={async (input) => {
          if (h.active && input.active === false) {
            const ok = await confirm('Deactivate this hub?', 'Customers will no longer see it, and no new cars can be added. Existing bookings are not affected.', 'Deactivate', true);
            if (!ok) return;
          }
          setServerErrors({});
          try {
            await save.mutateAsync(input);
            toast.show('Saved');
          } catch (e) {
            const fe = fieldErrors(e);
            if (Object.keys(fe).length) setServerErrors(fe);
            else if ((e as { status?: number }).status === 409) setServerErrors({ name: 'A hub with this name already exists' });
            else showError(e, 'Could not save');
          }
        }}
      />
    </Screen>
  );
}
