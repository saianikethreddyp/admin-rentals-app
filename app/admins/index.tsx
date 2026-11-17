import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Dialog, FAB, Portal, Text, TouchableRipple } from 'react-native-paper';

import { useAdmins, useResetAdminPassword, useSetAdminActive } from '@/api/hooks';
import type { Admin } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { confirm, FormField, ListState, Pill, showError, useToast } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { timeAgo } from '@/utils/format';
import { generatePassword } from '@/utils/password';
import { validateNewPassword } from '@/utils/validation';

export default function AdminsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { admin: me } = useAuth();
  const admins = useAdmins();
  const setActive = useSetAdminActive();
  const reset = useResetAdminPassword();
  const [selected, setSelected] = useState<Admin | null>(null);
  const [resetting, setResetting] = useState(false);
  const [password, setPassword] = useState('');
  const [issued, setIssued] = useState<string | null>(null);

  const isMe = selected?.id === me?.id;
  const pwError = password ? validateNewPassword(password) : null;

  function close() {
    setSelected(null);
    setResetting(false);
    setPassword('');
    setIssued(null);
  }

  async function toggleActive(a: Admin) {
    const deactivating = a.active;
    const ok = await confirm(
      deactivating ? `Deactivate ${a.name}?` : `Reactivate ${a.name}?`,
      deactivating ? 'They are signed out immediately and cannot log in until reactivated.' : 'They will be able to log in again.',
      deactivating ? 'Deactivate' : 'Reactivate',
      deactivating,
    );
    if (!ok) return;
    try {
      await setActive.mutateAsync({ id: a.id, active: !a.active });
      toast.show(deactivating ? `${a.name} deactivated` : `${a.name} reactivated`);
      close();
    } catch (e) {
      showError(e);
    }
  }

  async function doReset() {
    if (!selected || validateNewPassword(password)) return;
    try {
      await reset.mutateAsync({ id: selected.id, password });
      setIssued(password);
    } catch (e) {
      showError(e, 'Could not reset the password');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={admins.data ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 96 }}
        renderItem={({ item: a }) => (
          <TouchableRipple onPress={() => setSelected(a)} borderless style={styles.touch}>
            <View style={[styles.card, !a.active && { opacity: 0.6 }]}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                  {a.name}
                  {a.id === me?.id ? '  (you)' : ''}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.muted }}>
                  {a.email}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.muted }}>
                  Last login: {timeAgo(a.last_login_at)}
                </Text>
              </View>
              <View style={{ gap: 4, alignItems: 'flex-end' }}>
                <Pill label={a.active ? 'Active' : 'Deactivated'} color={a.active ? colors.green : colors.slate} bg={a.active ? '#D1FAE5' : '#E2E8F0'} />
                {a.must_change_password ? <Pill label="Must change password" color={colors.amber} bg="#FEF3C7" /> : null}
              </View>
            </View>
          </TouchableRipple>
        )}
        ListEmptyComponent={<ListState isLoading={admins.isLoading} error={admins.error} onRetry={admins.refetch} isEmpty={!admins.isLoading && !admins.error} emptyText="No admins." />}
        refreshing={admins.isRefetching}
        onRefresh={admins.refetch}
      />
      <FAB icon="account-plus" label="Add admin" color="#fff" style={styles.fab} onPress={() => router.push('/admins/new')} />

      <Portal>
        <Dialog visible={!!selected} onDismiss={close}>
          <Dialog.Title>{selected?.name}</Dialog.Title>
          <Dialog.Content>
            {issued ? (
              <View>
                <Text style={{ marginBottom: spacing.sm }}>Temporary password set. Share it securely; they must change it when they sign in.</Text>
                <Text selectable variant="titleMedium" style={styles.secret}>
                  {issued}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.muted, marginTop: spacing.sm }}>
                  It is shown only now. Press and hold to copy.
                </Text>
              </View>
            ) : resetting ? (
              <View>
                <FormField label="Temporary password" value={password} onChangeText={setPassword} error={pwError ?? undefined} autoCorrect={false} />
                <Button compact icon="dice-5-outline" onPress={() => setPassword(generatePassword())} style={{ alignSelf: 'flex-start' }}>
                  Generate one
                </Button>
              </View>
            ) : (
              <Text style={{ color: colors.muted }}>{selected?.email}</Text>
            )}
          </Dialog.Content>
          <Dialog.Actions style={{ flexWrap: 'wrap' }}>
            {issued ? (
              <Button onPress={close}>Done</Button>
            ) : resetting ? (
              <>
                <Button onPress={() => setResetting(false)}>Back</Button>
                <Button onPress={doReset} loading={reset.isPending} disabled={!password || !!pwError || reset.isPending}>
                  Set password
                </Button>
              </>
            ) : (
              <>
                <Button onPress={close}>Close</Button>
                {!isMe ? <Button onPress={() => setResetting(true)}>Reset password</Button> : null}
                {!isMe && selected ? (
                  <Button textColor={selected.active ? colors.red : colors.green} onPress={() => toggleActive(selected)} loading={setActive.isPending}>
                    {selected.active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                ) : null}
              </>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  touch: { borderRadius: 14, marginBottom: spacing.md },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, backgroundColor: colors.primary },
  secret: { backgroundColor: colors.bg, borderRadius: 8, padding: spacing.md, fontFamily: 'monospace', letterSpacing: 1 },
});
