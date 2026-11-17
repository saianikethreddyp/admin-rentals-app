import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { FAB, Icon, Text, TouchableRipple } from 'react-native-paper';

import { useHubs } from '@/api/hooks';
import { ListState, Pill } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function HubsScreen() {
  const router = useRouter();
  const hubs = useHubs();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={hubs.data ?? []}
        keyExtractor={(h) => h.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 96 }}
        renderItem={({ item: h }) => (
          <TouchableRipple onPress={() => router.push({ pathname: '/hubs/[id]', params: { id: h.id } })} borderless style={styles.touch}>
            <View style={[styles.card, !h.active && { opacity: 0.65 }]}>
              <Icon source="map-marker" size={26} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                  {h.name}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.muted }} numberOfLines={2}>
                  {h.address}
                </Text>
              </View>
              <Pill label={h.active ? 'Active' : 'Inactive'} color={h.active ? colors.green : colors.slate} bg={h.active ? '#D1FAE5' : '#E2E8F0'} />
            </View>
          </TouchableRipple>
        )}
        ListEmptyComponent={
          <ListState isLoading={hubs.isLoading} error={hubs.error} onRetry={hubs.refetch} isEmpty={!hubs.isLoading && !hubs.error} emptyText="No hubs yet. Tap + to add your first hub." emptyIcon="map-marker-off-outline" />
        }
        refreshing={hubs.isRefetching}
        onRefresh={hubs.refetch}
      />
      <FAB icon="plus" label="Add hub" color="#fff" style={styles.fab} onPress={() => router.push('/hubs/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  touch: { borderRadius: 14, marginBottom: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, backgroundColor: colors.primary },
});
