import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, View } from 'react-native';
import { FAB, Icon, Switch, Text, TouchableRipple } from 'react-native-paper';

import { flatten, useCars, useHubs, useUpdateCar } from '@/api/hooks';
import type { Car, CarStatus } from '@/api/types';
import { confirm, FilterChips, FooterLoader, ListState, Pill, showError, useToast, type Option } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { money } from '@/utils/format';

type StatusFilter = 'all' | CarStatus;

const STATUS_OPTIONS: Option<StatusFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
];

const carStatus: Record<CarStatus, { label: string; color: string; bg: string }> = {
  available: { label: 'Available', color: colors.green, bg: '#D1FAE5' },
  maintenance: { label: 'Maintenance', color: colors.amber, bg: '#FEF3C7' },
  retired: { label: 'Retired', color: colors.slate, bg: '#E2E8F0' },
};

function CarRow({ car, hubName, onPress }: { car: Car; hubName?: string; onPress: () => void }) {
  const s = carStatus[car.status];
  const toast = useToast();
  const update = useUpdateCar(car.id);
  const enabled = car.status === 'available';
  async function toggle(next: boolean) {
    if (!next && !(await confirm('Disable this car?', 'Customers will no longer see or book it. Existing bookings are not cancelled.', 'Disable', true))) return;
    try {
      await update.mutateAsync({ status: next ? 'available' : 'maintenance' });
      toast.show(next ? 'Car enabled' : 'Car disabled');
    } catch (e) {
      showError(e, next ? 'Could not enable the car' : 'Could not disable the car');
    }
  }
  const photo = car.photos[0]?.url;
  return (
    <TouchableRipple onPress={onPress} borderless style={styles.touch}>
      <View style={[styles.card, car.status === 'retired' && { opacity: 0.6 }]}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Icon source="car-side" size={28} color={colors.muted} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ fontWeight: '600' }} numberOfLines={1}>
            {car.brand} {car.model}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.muted }} numberOfLines={1}>
            {car.plate}
            {hubName ? ` · ${hubName}` : ''}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.muted, textTransform: 'capitalize' }} numberOfLines={1}>
            {car.year} · {car.fuel_type} · {car.transmission} · {car.seats} seats
          </Text>
          <View style={styles.bottom}>
            <Text variant="titleSmall" style={{ fontWeight: '700' }}>
              {money(car.price_per_day)}
              <Text variant="bodySmall" style={{ color: colors.muted }}>
                {' '}
                / day
              </Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Pill label={s.label} color={s.color} bg={s.bg} />
              <Switch value={enabled} onValueChange={toggle} disabled={update.isPending} accessibilityLabel={`${enabled ? 'Disable' : 'Enable'} ${car.brand} ${car.model}`} />
            </View>
          </View>
        </View>
      </View>
    </TouchableRipple>
  );
}

export default function CarsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ hub_id?: string }>();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [hub, setHub] = useState(params.hub_id ?? 'all');
  useEffect(() => {
    if (params.hub_id) setHub(params.hub_id);
  }, [params.hub_id]);

  const hubs = useHubs();
  const hubOptions = useMemo<Option<string>[]>(() => [{ value: 'all', label: 'All hubs' }, ...(hubs.data ?? []).map((h) => ({ value: h.id, label: h.name }))], [hubs.data]);
  const hubName = (id: string) => hubs.data?.find((h) => h.id === id)?.name;

  const query = useCars({ status: status === 'all' ? undefined : status, hub_id: hub === 'all' ? undefined : hub });
  const items = flatten(query.data);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CarRow car={item} hubName={hubName(item.hub_id)} onPress={() => router.push({ pathname: '/cars/[id]', params: { id: item.id } })} />}
        ListHeaderComponent={
          <View>
            <FilterChips options={STATUS_OPTIONS} value={status} onChange={setStatus} />
            {hubOptions.length > 2 ? <FilterChips options={hubOptions} value={hub} onChange={setHub} /> : null}
          </View>
        }
        ListEmptyComponent={
          <ListState
            isLoading={query.isLoading}
            error={query.error}
            onRetry={query.refetch}
            isEmpty={!query.isLoading && !query.error}
            emptyText="No cars here yet. Tap + to add one."
            emptyIcon="car-off"
          />
        }
        ListFooterComponent={<FooterLoader visible={query.isFetchingNextPage} />}
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={query.refetch}
        contentContainerStyle={{ paddingBottom: 96 }}
      />
      <FAB icon="plus" label="Add car" style={styles.fab} color="#fff" onPress={() => router.push({ pathname: '/cars/new', params: hub !== 'all' ? { hub_id: hub } : {} })} />
    </View>
  );
}

const styles = StyleSheet.create({
  touch: { borderRadius: 14, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  card: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  thumb: { width: 92, height: 92, borderRadius: 10, backgroundColor: colors.border },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, backgroundColor: colors.primary },
});
