import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { Button, Icon, IconButton, List, Text } from 'react-native-paper';

import { ApiError } from '@/api';
import { useBooking, useBookingAction, useBookingContacts, type BookingAction } from '@/api/hooks';
import { callPhone, confirm, InfoRow, ListState, openMaps, Panel, Screen, SectionTitle, showError, StatusPill, useToast, whatsapp } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { billableDays, dateTime, money, phoneDisplay } from '@/utils/format';

const ACTIONS: Record<BookingAction, { title: string; message: string; label: string; done: string; destructive?: boolean }> = {
  start: { title: 'Start this ride?', message: 'Confirm the customer has collected the car. The customer is notified.', label: 'Start ride', done: 'Ride started' },
  complete: { title: 'Complete this ride?', message: 'Confirm the car is back. The customer can then delete their shared contacts.', label: 'Complete ride', done: 'Ride completed' },
  cancel: { title: 'Cancel this booking?', message: 'The car becomes available again and the customer is notified.', label: 'Cancel booking', done: 'Booking cancelled', destructive: true },
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: b, isLoading, error, refetch, isRefetching } = useBooking(id);
  const action = useBookingAction();
  const contacts = useBookingContacts(id);

  if (!b) return <ListState isLoading={isLoading} error={error} onRetry={refetch} isEmpty={false} emptyText="" />;

  async function run(a: BookingAction) {
    const c = ACTIONS[a];
    if (!(await confirm(c.title, c.message, c.label, c.destructive))) return;
    try {
      await action.mutateAsync({ id, action: a });
      toast.show(c.done);
    } catch (e) {
      showError(e);
    }
  }

  async function loadContacts() {
    const ok = await confirm(
      'View customer contacts?',
      "These are shown only to trace the car if it is stolen or misused. Each view is recorded with your name.",
      'View contacts',
    );
    if (ok) contacts.refetch();
  }

  const days = billableDays(b.start_at, b.end_at);
  const contactError = contacts.error instanceof ApiError ? contacts.error : null;

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Panel>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Text variant="titleLarge" style={{ fontWeight: '700' }}>
              {b.car_brand} {b.car_model}
            </Text>
            <Text style={{ color: colors.muted }}>{b.car_plate}</Text>
          </View>
          <StatusPill status={b.status} />
        </View>
        <Text variant="bodySmall" style={{ color: colors.muted, marginTop: spacing.sm }}>
          Booking {b.id.slice(0, 8).toUpperCase()}
        </Text>
      </Panel>

      {b.status === 'confirmed' || b.status === 'active' ? (
        <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
          {b.status === 'confirmed' ? (
            <>
              <Button mode="contained" icon="key-variant" loading={action.isPending} disabled={action.isPending} onPress={() => run('start')}>
                Start ride
              </Button>
              <Button mode="outlined" icon="close-circle-outline" textColor={colors.red} disabled={action.isPending} onPress={() => run('cancel')}>
                Cancel booking
              </Button>
            </>
          ) : (
            <Button mode="contained" icon="flag-checkered" loading={action.isPending} disabled={action.isPending} onPress={() => run('complete')}>
              Complete ride
            </Button>
          )}
        </View>
      ) : null}

      <SectionTitle>Schedule</SectionTitle>
      <Panel>
        <InfoRow label="Pickup" value={dateTime(b.start_at)} />
        <InfoRow label="Return" value={dateTime(b.end_at)} />
        <InfoRow label="Duration" value={`${days} day${days > 1 ? 's' : ''} billed`} />
        <InfoRow label="Rate" value={`${money(b.price_per_day)} / day`} />
        <InfoRow label="Total" value={money(b.total_price)} last />
      </Panel>

      <SectionTitle>Customer</SectionTitle>
      <Panel>
        <InfoRow label="Name" value={b.customer.name ?? '—'} onPress={() => router.push({ pathname: '/customers/[id]', params: { id: b.user_id } })} />
        <InfoRow label="Phone" value={phoneDisplay(b.customer.phone)} last />
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <Button mode="contained-tonal" icon="phone" style={{ flex: 1 }} onPress={() => callPhone(b.customer.phone)}>
            Call
          </Button>
          <Button mode="contained-tonal" icon="whatsapp" style={{ flex: 1 }} onPress={() => whatsapp(b.customer.phone)}>
            WhatsApp
          </Button>
        </View>
      </Panel>

      <SectionTitle>Pickup hub</SectionTitle>
      <Panel>
        <InfoRow label="Hub" value={b.hub_name} />
        <InfoRow label="Address" value={b.hub_address} last />
        <Button mode="text" icon="map-marker" onPress={() => openMaps(b.hub_latitude, b.hub_longitude, b.hub_name)} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}>
          Open in Maps
        </Button>
      </Panel>

      <SectionTitle>Timeline</SectionTitle>
      <Panel>
        <InfoRow label="Booked" value={dateTime(b.created_at)} last={!b.started_at && !b.completed_at && !b.cancelled_at} />
        {b.started_at ? <InfoRow label="Ride started" value={dateTime(b.started_at)} last={!b.completed_at} /> : null}
        {b.completed_at ? <InfoRow label="Ride completed" value={dateTime(b.completed_at)} last /> : null}
        {b.cancelled_at ? <InfoRow label="Cancelled" value={dateTime(b.cancelled_at)} last /> : null}
      </Panel>

      <SectionTitle>Safety</SectionTitle>
      <Panel>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
          <Icon source="shield-lock-outline" size={22} color={colors.muted} />
          <Text style={{ flex: 1, color: colors.muted }}>
            The customer's phone contacts are kept encrypted and shown only to trace the car in case of theft. Each view is recorded.
          </Text>
        </View>

        {contacts.data ? (
          <View style={{ marginTop: spacing.md }}>
            <Text variant="labelLarge" style={{ marginBottom: 4 }}>
              {contacts.data.contacts.length} contact{contacts.data.contacts.length === 1 ? '' : 's'}
            </Text>
            {contacts.data.contacts.length === 0 ? (
              <Text style={{ color: colors.muted }}>No contacts stored. The customer may have deleted them after the ride.</Text>
            ) : (
              contacts.data.contacts.map((c) => (
                <List.Item
                  key={c.phone}
                  title={c.name || 'No name'}
                  description={phoneDisplay(c.phone)}
                  style={{ paddingHorizontal: 0 }}
                  right={() => <IconButton icon="phone" onPress={() => callPhone(c.phone)} />}
                />
              ))
            )}
          </View>
        ) : (
          <>
            {contactError ? (
              <Text style={{ color: colors.red, marginTop: spacing.md }}>
                {contactError.status === 403 ? 'Contacts are no longer available for this booking.' : contactError.message}
              </Text>
            ) : null}
            <Button mode="outlined" icon="account-search-outline" loading={contacts.isFetching} disabled={contacts.isFetching} onPress={loadContacts} style={{ marginTop: spacing.md }}>
              View customer contacts
            </Button>
          </>
        )}
      </Panel>
    </Screen>
  );
}
