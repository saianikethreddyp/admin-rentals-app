import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import type { Booking } from '@/api/types';
import { colors, spacing } from '@/theme';
import { dateTime, money } from '@/utils/format';
import { StatusPill } from './ui';

export function BookingCard({ booking: b, onPress, showCustomer = true }: { booking: Booking; onPress: () => void; showCustomer?: boolean }) {
  return (
    <TouchableRipple onPress={onPress} borderless style={styles.touch}>
      <View style={styles.card}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: '600' }}>
              {b.car_brand} {b.car_model}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.muted }}>
              {b.car_plate} · {b.hub_name}
            </Text>
          </View>
          <StatusPill status={b.status} />
        </View>

        {showCustomer ? (
          <View style={styles.line}>
            <Icon source="account-outline" size={16} color={colors.muted} />
            <Text style={styles.lineText} numberOfLines={1}>
              {b.customer.name ?? 'Customer'} · {b.customer.phone}
            </Text>
          </View>
        ) : null}
        <View style={styles.line}>
          <Icon source="clock-outline" size={16} color={colors.muted} />
          <Text style={styles.lineText}>
            {dateTime(b.start_at)} → {dateTime(b.end_at)}
          </Text>
        </View>
        <Text variant="titleSmall" style={{ marginTop: spacing.sm, fontWeight: '700' }}>
          {money(b.total_price)}
        </Text>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  touch: { borderRadius: 14, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  lineText: { color: colors.text, flexShrink: 1, fontSize: 13 },
});
