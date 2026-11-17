import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Searchbar } from 'react-native-paper';

import { flatten, useBookings, useHubs } from '@/api/hooks';
import type { BookingStatusValue } from '@/api/types';
import { BookingCard } from '@/components/BookingCard';
import { FilterChips, FooterLoader, ListState, type Option } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { dayStart } from '@/utils/format';
import { useDebounced } from '@/utils/hooks';

type StatusFilter = 'all' | BookingStatusValue;
type WhenFilter = 'any' | 'today' | 'tomorrow' | 'week';

const STATUS_OPTIONS: Option<StatusFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'active', label: 'On ride' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const WHEN_OPTIONS: Option<WhenFilter>[] = [
  { value: 'any', label: 'Any pickup date' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week', label: 'Next 7 days' },
];

function rangeFor(when: WhenFilter): { from?: string; to?: string } {
  switch (when) {
    case 'today':
      return { from: dayStart(0).toISOString(), to: dayStart(1).toISOString() };
    case 'tomorrow':
      return { from: dayStart(1).toISOString(), to: dayStart(2).toISOString() };
    case 'week':
      return { from: dayStart(0).toISOString(), to: dayStart(7).toISOString() };
    default:
      return {};
  }
}

export default function BookingsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 400);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [when, setWhen] = useState<WhenFilter>('any');
  const [hub, setHub] = useState('all');

  const hubs = useHubs();
  const hubOptions: Option<string>[] = useMemo(
    () => [{ value: 'all', label: 'All hubs' }, ...(hubs.data ?? []).map((h) => ({ value: h.id, label: h.name }))],
    [hubs.data],
  );
  const range = useMemo(() => rangeFor(when), [when]);

  const query = useBookings({ status: status === 'all' ? undefined : status, hub_id: hub === 'all' ? undefined : hub, q: q || undefined, ...range });
  const items = flatten(query.data);

  const header = (
    <View style={{ paddingTop: spacing.sm }}>
      <Searchbar
        placeholder="Search customer name or phone"
        value={search}
        onChangeText={setSearch}
        style={{ marginHorizontal: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, elevation: 0 }}
        inputStyle={{ minHeight: 0 }}
      />
      <FilterChips options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      <FilterChips options={WHEN_OPTIONS} value={when} onChange={setWhen} />
      {hubOptions.length > 2 ? <FilterChips options={hubOptions} value={hub} onChange={setHub} /> : null}
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      data={items}
      keyExtractor={(b) => b.id}
      renderItem={({ item }) => <BookingCard booking={item} onPress={() => router.push({ pathname: '/bookings/[id]', params: { id: item.id } })} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <ListState
          isLoading={query.isLoading}
          error={query.error}
          onRetry={query.refetch}
          isEmpty={!query.isLoading && !query.error}
          emptyText="No bookings match these filters."
          emptyIcon="calendar-blank-outline"
        />
      }
      ListFooterComponent={<FooterLoader visible={query.isFetchingNextPage} />}
      onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
      onEndReachedThreshold={0.4}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={query.refetch}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 32 }}
    />
  );
}
