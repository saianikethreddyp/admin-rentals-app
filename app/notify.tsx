import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Avatar, Button, List, Searchbar, Text } from 'react-native-paper';

import { flatten, useCustomers, useSendNotification } from '@/api/hooks';
import { FormField, Panel, Screen, showError } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { phoneDisplay } from '@/utils/format';
import { useDebounced } from '@/utils/hooks';

export default function NotifyScreen() {
  const params = useLocalSearchParams<{ user_id?: string; name?: string }>();
  const [target, setTarget] = useState<{ id: string; name: string } | null>(params.user_id ? { id: params.user_id, name: params.name ?? 'Customer' } : null);
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 400);
  const customers = useCustomers(q);
  const send = useSendNotification();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const canSend = !!target && title.trim().length > 0 && body.trim().length > 0 && !send.isPending;

  async function submit() {
    if (!target) return;
    setResult(null);
    try {
      const r = await send.mutateAsync({ user_id: target.id, title: title.trim(), body: body.trim() });
      setResult(r.devices_notified);
      if (r.devices_notified > 0) {
        setTitle('');
        setBody('');
      }
    } catch (e) {
      showError(e, 'Could not send');
    }
  }

  if (!target) {
    const list = flatten(customers.data);
    return (
      <Screen>
        <Text style={{ color: colors.muted, marginBottom: spacing.md }}>Choose the customer who should receive the notification.</Text>
        <Searchbar placeholder="Search by name or phone" value={search} onChangeText={setSearch} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, elevation: 0, marginBottom: spacing.md }} inputStyle={{ minHeight: 0 }} />
        {list.length === 0 && !customers.isLoading ? <Text style={{ color: colors.muted }}>No customers found.</Text> : null}
        {list.map((c) => (
          <List.Item
            key={c.id}
            title={c.name ?? 'No name'}
            description={phoneDisplay(c.phone)}
            left={() => <Avatar.Icon size={40} icon="account" style={{ backgroundColor: colors.primary }} />}
            onPress={() => setTarget({ id: c.id, name: c.name ?? c.phone })}
          />
        ))}
      </Screen>
    );
  }

  return (
    <Screen>
      <Panel>
        <Text variant="labelMedium" style={{ color: colors.muted }}>
          TO
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="titleMedium" style={{ fontWeight: '600', flex: 1 }}>
            {target.name}
          </Text>
          <Button compact onPress={() => { setTarget(null); setResult(null); }}>
            Change
          </Button>
        </View>
      </Panel>

      <FormField label="Title" value={title} onChangeText={setTitle} maxLength={100} autoCapitalize="sentences" />
      <FormField label="Message" value={body} onChangeText={setBody} maxLength={500} multiline numberOfLines={4} autoCapitalize="sentences" />
      <Text variant="bodySmall" style={{ color: colors.muted, textAlign: 'right', marginTop: -8, marginBottom: spacing.md }}>
        {body.length}/500
      </Text>

      {result !== null ? (
        <Panel style={{ backgroundColor: result > 0 ? '#D1FAE5' : '#FEF3C7', borderColor: 'transparent' }}>
          <Text style={{ color: result > 0 ? colors.green : colors.amber, fontWeight: '600' }}>
            {result > 0 ? `Sent to ${result} device${result === 1 ? '' : 's'}.` : 'Not delivered: this customer has no registered device yet (they need the app installed and notifications allowed).'}
          </Text>
        </Panel>
      ) : null}

      <Button mode="contained" icon="send" onPress={submit} disabled={!canSend} loading={send.isPending} contentStyle={{ paddingVertical: 6 }}>
        Send notification
      </Button>
    </Screen>
  );
}
