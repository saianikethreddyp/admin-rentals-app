import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Avatar, Searchbar, Text, TouchableRipple } from 'react-native-paper';

import { flatten, useCustomers } from '@/api/hooks';
import { FooterLoader, ListState, Pill } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { fullDate, initials, phoneDisplay } from '@/utils/format';
import { useDebounced } from '@/utils/hooks';

export default function CustomersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 400);
  const query = useCustomers(q);
  const items = flatten(query.data);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      data={items}
      keyExtractor={(c) => c.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <Searchbar
          placeholder="Search by name or phone"
          value={search}
          onChangeText={setSearch}
          style={{ margin: spacing.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, elevation: 0 }}
          inputStyle={{ minHeight: 0 }}
        />
      }
      renderItem={({ item: c }) => (
        <TouchableRipple onPress={() => router.push({ pathname: '/customers/[id]', params: { id: c.id } })} borderless style={styles.touch}>
          <View style={styles.card}>
            <Avatar.Text size={42} label={initials(c.name)} style={{ backgroundColor: colors.primary }} />
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ fontWeight: '600' }} numberOfLines={1}>
                {c.name ?? 'No name'}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.muted }}>
                {phoneDisplay(c.phone)} · joined {fullDate(c.created_at)}
              </Text>
            </View>
            {!c.active ? <Pill label="Blocked" color={colors.red} bg="#FEE2E2" /> : null}
          </View>
        </TouchableRipple>
      )}
      ListEmptyComponent={
        <ListState
          isLoading={query.isLoading}
          error={query.error}
          onRetry={query.refetch}
          isEmpty={!query.isLoading && !query.error}
          emptyText={q ? 'No customers match your search.' : 'No customers yet. They appear here after signing up in the app.'}
          emptyIcon="account-search-outline"
        />
      }
      ListFooterComponent={<FooterLoader visible={query.isFetchingNextPage} />}
      onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
      onEndReachedThreshold={0.4}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={query.refetch}
      contentContainerStyle={{ paddingBottom: 32 }}
    />
  );
}

const styles = StyleSheet.create({
  touch: { borderRadius: 14, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
});
