import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Text } from 'react-native-paper';

import { useAuth } from '@/auth/AuthContext';
import { FormField, Panel, Screen, showError, useToast } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { fieldErrors } from '@/utils/errors';
import { validateNewPassword } from '@/utils/validation';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const toast = useToast();
  const { admin, changePassword } = useAuth();
  const forced = !!admin?.must_change_password;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    const found: Record<string, string> = {};
    if (!current) found.current_password = 'Enter your current password';
    const pw = validateNewPassword(next);
    if (pw) found.new_password = pw;
    else if (next === current) found.new_password = 'Choose a password you have not used here';
    if (next !== again) found.again = 'The two passwords do not match';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await changePassword(current, next);
      toast.show('Password changed. Other devices were signed out.');
      if (!forced && router.canGoBack()) router.back();
    } catch (e) {
      const fe = fieldErrors(e);
      if (Object.keys(fe).length) setErrors(fe);
      else showError(e, 'Could not change the password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      {forced ? (
        <Panel style={{ backgroundColor: '#FEF3C7', borderColor: 'transparent' }}>
          <Text style={{ color: colors.amber, fontWeight: '600' }}>You are using a temporary password. Choose a new one to continue.</Text>
        </Panel>
      ) : null}
      <FormField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" error={errors.current_password} />
      <FormField label="New password" value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" error={errors.new_password} />
      <FormField label="Repeat new password" value={again} onChangeText={setAgain} secureTextEntry error={errors.again} />
      <Text variant="bodySmall" style={{ color: colors.muted, marginBottom: spacing.lg }}>
        Use at least 12 characters. Changing it signs you out on other devices.
      </Text>
      <Button mode="contained" onPress={submit} loading={busy} disabled={busy} contentStyle={{ paddingVertical: 6 }}>
        Change password
      </Button>
    </Screen>
  );
}
