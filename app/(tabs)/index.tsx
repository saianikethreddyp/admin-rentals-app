import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text, TouchableRipple } from 'react-native-paper';

import { useDashboard } from '@/api/hooks';
import { useAuth } from '@/auth/AuthContext';
import { ListState, Panel, Screen, SectionTitle } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { money } from '@/utils/format';

function Stat({ icon, label, value, hint, color = colors.primary, onPress }: { icon: string; label: string; value: string | number; hint?: string; color?: string; onPress?: () => void }) {
  const body = (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: color + '1A' }]}>
        <Icon source={icon} size={20} color={color} />
      </View>
      <Text variant="headlineSmall" style={styles.statValue}>
        {value}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.muted }}>
        {label}
      </Text>
      {hint ? (
        <Text variant="labelSmall" style={{ color: colors.muted, marginTop: 2 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
  return (
    <View style={styles.statCell}>
      {onPress ? (
        <TouchableRipple onPress={onPress} borderless style={styles.statTouch}>
          {body}
        </TouchableRipple>
      ) : (
        <View style={styles.statTouch}>{body}</View>
      )}
    </View>
  );
}

function FleetBar({ available, inUse, maintenance }: { available: number; inUse: number; maintenance: number }) {
  const total = available + inUse + maintenance;
  if (total === 0) return <View style={[styles.bar, { backgroundColor: colors.border }]} />;
  const seg = (n: number, c: string) => (n > 0 ? <View style={{ flex: n, backgroundColor: c }} /> : null);
  return (
    <View style={styles.bar}>
      {seg(available, colors.green)}
      {seg(inUse, colors.blue)}
      {seg(maintenance, colors.amber)}
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { admin } = useAuth();
  const { data, isLoading, error, refetch, isRefetching } = useDashboard();

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Text variant="titleLarge" style={{ fontWeight: '700' }}>
        Hello, {admin?.name?.split(' ')[0] ?? 'there'}
      </Text>
      <Text style={{ color: colors.muted, marginBottom: spacing.md }}>Here is what is happening today.</Text>

      {!data ? (
        <ListState isLoading={isLoading} error={error} onRetry={refetch} isEmpty={false} emptyText="" />
      ) : (
        <>
          <View style={styles.grid}>
            <Stat icon="calendar-today" label="Pickups today" value={data.bookings.pickups_today} onPress={() => router.navigate('/bookings')} />
            <Stat icon="car-clock" label="On ride now" value={data.bookings.active_rides} color={colors.green} onPress={() => router.navigate('/bookings')} />
            <Stat icon="calendar-check" label="Upcoming" value={data.bookings.upcoming_confirmed} color={colors.blue} hint="confirmed, not started" />
            <Stat
              icon="account-group"
              label="Customers"
              value={data.customers.total}
              color={colors.amber}
              hint={data.customers.new_last_7_days > 0 ? `+${data.customers.new_last_7_days} this week` : undefined}
              onPress={() => router.push('/customers')}
            />
          </View>

          <Panel style={{ marginTop: spacing.sm }}>
            <Text variant="labelMedium" style={{ color: colors.muted }}>
              REVENUE THIS MONTH
            </Text>
            <Text variant="headlineMedium" style={{ fontWeight: '700', marginTop: 4 }}>
              {money(data.bookings.revenue_this_month)}
            </Text>
            <Text style={{ color: colors.muted }}>{data.bookings.completed_this_month} completed rides</Text>
          </Panel>

          <SectionTitle
            right={
              <Button compact onPress={() => router.push('/hubs')}>
                Manage hubs
              </Button>
            }
          >
            Fleet by hub
          </SectionTitle>
          {data.hubs.length === 0 ? (
            <Panel>
              <Text style={{ color: colors.muted, marginBottom: spacing.md }}>No hubs yet. Add your first hub to start adding cars.</Text>
              <Button mode="contained" onPress={() => router.push('/hubs/new')}>
                Add a hub
              </Button>
            </Panel>
          ) : (
            data.hubs.map((h) => (
              <TouchableRipple key={h.id} onPress={() => router.navigate({ pathname: '/cars', params: { hub_id: h.id } })} borderless style={styles.hubTouch}>
                <Panel style={{ marginBottom: 0 }}>
                  <View style={styles.hubHead}>
                    <Text variant="titleMedium" style={{ fontWeight: '600', flex: 1 }}>
                      {h.name}
                      {h.active ? '' : '  (inactive)'}
                    </Text>
                    <Text style={{ color: colors.muted }}>{h.total_cars} cars</Text>
                  </View>
                  <FleetBar available={h.available} inUse={h.in_use} maintenance={h.maintenance} />
                  <View style={styles.legend}>
                    <Text style={{ color: colors.green }}>{h.available} available</Text>
                    <Text style={{ color: colors.blue }}>{h.in_use} on ride</Text>
                    <Text style={{ color: colors.amber }}>{h.maintenance} service</Text>
                  </View>
                </Panel>
              </TouchableRipple>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  statCell: { width: '50%', padding: 6 },
  statTouch: { borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  stat: { padding: spacing.lg },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statValue: { fontWeight: '700' },
  hubTouch: { borderRadius: 14, marginBottom: spacing.md },
  hubHead: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row', backgroundColor: colors.border },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
});
