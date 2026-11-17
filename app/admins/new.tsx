import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Text } from 'react-native-paper';

import { useCreateAdmin } from '@/api/hooks';
import { FormField, Panel, Screen, showError, useToast } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { fieldErrors } from '@/utils/errors';
import { generatePassword } from '@/utils/password';
import { isEmail, validateNewPassword } from '@/utils/validation';

export default function NewAdminScreen() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateAdmin();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  async function submit() {
    const found: Record<string, string> = {};
    if (!name.trim()) found.name = 'Enter their name';
    if (!isEmail(email)) found.email = 'Enter a valid email address';
    const pw = validateNewPassword(password);
    if (pw) found.password = pw;
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await create.mutateAsync({ name: name.trim(), email: email.trim(), password });
      setCreated({ email: email.trim().toLowerCase(), password });
      toast.show('Admin added');
    } catch (e) {
      const fe = fieldErrors(e);
      if (Object.keys(fe).length) setErrors(fe);
      else if ((e as { status?: number }).status === 409) setErrors({ email: 'An admin with this email already exists' });
      else showError(e, 'Could not add the admin');
    }
  }

  if (created) {
    return (
      <Screen>
        <Panel>
          <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: spacing.sm }}>
            Admin created
          </Text>
          <Text style={{ color: colors.muted, marginBottom: spacing.md }}>Share these details securely. They can change the password after signing in.</Text>
          <Text variant="labelMedium" style={{ color: colors.muted }}>
            EMAIL
          </Text>
          <Text selectable variant="titleMedium" style={{ marginBottom: spacing.md }}>
            {created.email}
          </Text>
          <Text variant="labelMedium" style={{ color: colors.muted }}>
            PASSWORD
          </Text>
          <Text selectable variant="titleMedium" style={{ fontFamily: 'monospace', letterSpacing: 1 }}>
            {created.password}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.muted, marginTop: spacing.md }}>
            This password is shown only now. Press and hold to copy.
          </Text>
        </Panel>
        <Button mode="contained" onPress={() => router.back()}>
          Done
        </Button>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={{ color: colors.muted, marginBottom: spacing.lg }}>New admins have full access, the same as you.</Text>
      <FormField label="Name" value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
      <FormField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" error={errors.email} />
      <FormField label="Password" value={password} onChangeText={setPassword} error={errors.password} autoCorrect={false} />
      <Button compact icon="dice-5-outline" onPress={() => setPassword(generatePassword())} style={{ alignSelf: 'flex-start', marginTop: -8, marginBottom: spacing.lg }}>
        Generate a strong password
      </Button>
      <Button mode="contained" onPress={submit} loading={create.isPending} disabled={create.isPending} contentStyle={{ paddingVertical: 6 }}>
        Add admin
      </Button>
    </Screen>
  );
}
