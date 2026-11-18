import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from 'react-native-paper';

import { useDeleteHub, useHub, useSaveHub } from '@/api/hooks';
import { HubForm } from '@/components/HubForm';
import { confirm, ListState, Screen, showError, useToast } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { fieldErrors } from '@/utils/errors';

export default function EditHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const hub = useHub(id);
  const save = useSaveHub(id);
  const remove = useDeleteHub(id);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  if (!hub.data) return <ListState isLoading={hub.isLoading} error={hub.error} onRetry={hub.refetch} isEmpty={false} emptyText="" />;
  const h = hub.data;

  async function deleteHub() {
    const ok = await confirm('Delete this hub?', 'This removes the hub for good. It only works for a hub with no cars or bookings; otherwise mark it inactive instead.', 'Delete', true);
    if (!ok) return;
    try {
      await remove.mutateAsync();
      toast.show('Hub deleted');
      router.replace('/hubs');
    } catch (e) {
      if ((e as { status?: number }).status === 409) showError(e, 'Cannot delete this hub');
      else showError(e, 'Could not delete the hub');
    }
  }

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
      <Button mode="outlined" icon="trash-can-outline" textColor={colors.red} onPress={deleteHub} loading={remove.isPending} disabled={remove.isPending} style={{ marginTop: spacing.xl, borderColor: colors.red }}>
        Delete hub
      </Button>
    </Screen>
  );
}
