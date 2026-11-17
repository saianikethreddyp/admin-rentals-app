import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Avatar, Button, Divider, List, Text } from 'react-native-paper';

import { useAuth } from '@/auth/AuthContext';
import { API_URL } from '@/config';
import { confirm, Panel, Screen, SectionTitle } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { initials } from '@/utils/format';

function Item({ icon, title, description, onPress }: { icon: string; title: string; description?: string; onPress: () => void }) {
  return <List.Item title={title} description={description} onPress={onPress} left={(p) => <List.Icon {...p} icon={icon} color={colors.primary} />} right={(p) => <List.Icon {...p} icon="chevron-right" />} />;
}

export default function MoreScreen() {
  const router = useRouter();
  const { admin, logout } = useAuth();

  async function signOut() {
    if (await confirm('Sign out?', 'You will need your email and password to sign in again.', 'Sign out', true)) await logout();
  }

  return (
    <Screen>
      <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar.Text size={48} label={initials(admin?.name)} style={{ backgroundColor: colors.primary }} />
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ fontWeight: '600' }}>
            {admin?.name}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.muted }}>
            {admin?.email}
          </Text>
        </View>
      </Panel>

      <SectionTitle>Manage</SectionTitle>
      <Panel style={{ paddingVertical: 0 }}>
        <Item icon="map-marker-multiple-outline" title="Hubs" description="Locations where cars are kept" onPress={() => router.push('/hubs')} />
        <Divider />
        <Item icon="account-group-outline" title="Customers" description="Search, view history, block" onPress={() => router.push('/customers')} />
        <Divider />
        <Item icon="bell-outline" title="Send notification" description="Message a customer's phone" onPress={() => router.push('/notify')} />
      </Panel>

      <SectionTitle>Account</SectionTitle>
      <Panel style={{ paddingVertical: 0 }}>
        <Item icon="shield-account-outline" title="Admin team" description="Add admins, reset passwords" onPress={() => router.push('/admins')} />
        <Divider />
        <Item icon="lock-reset" title="Change password" onPress={() => router.push('/change-password')} />
      </Panel>

      <Button mode="outlined" icon="logout" textColor={colors.red} onPress={signOut} style={{ marginTop: spacing.md }}>
        Sign out
      </Button>

      <Text variant="bodySmall" style={{ color: colors.muted, textAlign: 'center', marginTop: spacing.xl }}>
        Thandra Admin {Constants.expoConfig?.version ?? ''}
        {'\n'}
        {API_URL.replace('https://', '')}
      </Text>
    </Screen>
  );
}
