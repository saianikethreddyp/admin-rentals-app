import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { Avatar, Button, Text } from 'react-native-paper';

import { flatten, useBookings, useCustomer, useSetCustomerActive } from '@/api/hooks';
import { BookingCard } from '@/components/BookingCard';
import { callPhone, confirm, InfoRow, ListState, Panel, Pill, Screen, SectionTitle, showError, useToast, whatsapp } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { fullDate, initials, phoneDisplay, timeAgo } from '@/utils/format';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const customer = useCustomer(id);
  const bookings = useBookings({ user_id: id });
  const setActive = useSetCustomerActive(id);

  if (!customer.data) return <ListState isLoading={customer.isLoading} error={customer.error} onRetry={customer.refetch} isEmpty={false} emptyText="" />;
  const c = customer.data;
  const history = flatten(bookings.data);

  async function toggleBlock() {
    const block = c.active;
    const ok = await confirm(
      block ? 'Block this customer?' : 'Unblock this customer?',
      block ? 'They will be signed out and cannot log in or book. Their past bookings stay on record.' : 'They will be able to log in and book again.',
      block ? 'Block' : 'Unblock',
      block,
    );
    if (!ok) return;
    try {
      await setActive.mutateAsync(!block);
      toast.show(block ? 'Customer blocked' : 'Customer unblocked');
    } catch (e) {
      showError(e);
    }
  }

  return (
    <Screen refreshing={customer.isRefetching} onRefresh={() => { customer.refetch(); bookings.refetch(); }}>
      <Panel style={{ alignItems: 'center' }}>
        <Avatar.Text size={64} label={initials(c.name)} style={{ backgroundColor: colors.primary }} />
        <Text variant="titleLarge" style={{ fontWeight: '700', marginTop: spacing.md }}>
          {c.name ?? 'No name'}
        </Text>
        <Text style={{ color: colors.muted }}>{phoneDisplay(c.phone)}</Text>
        {!c.active ? (
          <View style={{ marginTop: spacing.sm }}>
            <Pill label="Blocked" color={colors.red} bg="#FEE2E2" />
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, width: '100%' }}>
          <Button mode="contained-tonal" icon="phone" style={{ flex: 1 }} onPress={() => callPhone(c.phone)}>
            Call
          </Button>
          <Button mode="contained-tonal" icon="whatsapp" style={{ flex: 1 }} onPress={() => whatsapp(c.phone)}>
            WhatsApp
          </Button>
        </View>
      </Panel>

      <SectionTitle>Account</SectionTitle>
      <Panel>
        <InfoRow label="Joined" value={fullDate(c.created_at)} />
        <InfoRow label="Contacts shared" value={c.contacts_synced_at ? timeAgo(c.contacts_synced_at) : 'Not shared'} last />
      </Panel>

      <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
        <Button mode="outlined" icon="bell-outline" disabled={!c.active} onPress={() => router.push({ pathname: '/notify', params: { user_id: c.id, name: c.name ?? c.phone } })}>
          Send notification
        </Button>
        <Button mode="outlined" icon={c.active ? 'account-cancel-outline' : 'account-check-outline'} textColor={c.active ? colors.red : colors.green} loading={setActive.isPending} disabled={setActive.isPending} onPress={toggleBlock}>
          {c.active ? 'Block customer' : 'Unblock customer'}
        </Button>
      </View>

      <SectionTitle>Booking history ({bookings.data?.pages[0]?.total ?? 0})</SectionTitle>
      {history.length === 0 ? (
        <ListState isLoading={bookings.isLoading} error={bookings.error} onRetry={bookings.refetch} isEmpty={!bookings.isLoading} emptyText="No bookings yet." emptyIcon="calendar-blank-outline" />
      ) : (
        <View style={{ marginHorizontal: -spacing.lg }}>
          {history.map((b) => (
            <BookingCard key={b.id} booking={b} showCustomer={false} onPress={() => router.push({ pathname: '/bookings/[id]', params: { id: b.id } })} />
          ))}
          {bookings.hasNextPage ? (
            <Button onPress={() => bookings.fetchNextPage()} loading={bookings.isFetchingNextPage}>
              Show more
            </Button>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
