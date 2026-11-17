import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { FormField } from '@/components/ui';
import { API_URL } from '@/config';
import { colors, spacing } from '@/theme';

export default function LoginScreen() {
  const { login, offline, retryRestore } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef<any>(null);

  // The hosting plan can sleep; explain a long wait instead of looking frozen.
  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, [busy]);

  const canSubmit = email.trim().length > 3 && password.length > 0 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.status === 401 ? 'Wrong email or password.' : e.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Icon source="car-key" size={44} color={colors.gold} />
            <Text variant="headlineMedium" style={styles.title}>
              Thandra Admin
            </Text>
            <Text style={styles.subtitle}>Sign in to manage cars, hubs and bookings.</Text>
          </View>

          <View style={styles.card}>
            {offline ? (
              <View style={styles.banner}>
                <Text style={{ color: colors.red, flex: 1 }}>Can't reach the server right now.</Text>
                <Button compact onPress={retryRestore}>
                  Retry
                </Button>
              </View>
            ) : null}

            <FormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              disabled={busy}
            />
            <FormField
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              disabled={busy}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {slow ? <Text style={styles.note}>The server is waking up. This can take up to a minute the first time.</Text> : null}

            <Button mode="contained" onPress={submit} disabled={!canSubmit} loading={busy} contentStyle={{ paddingVertical: 6 }} style={{ marginTop: spacing.sm }}>
              Sign in
            </Button>
            <Button compact onPress={() => setShowPassword((s) => !s)} style={{ marginTop: spacing.sm }}>
              {showPassword ? 'Hide password' : 'Show password'}
            </Button>
          </View>

          <Text style={styles.footer}>{API_URL.replace('https://', '')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  title: { color: '#FFFFFF', fontWeight: '700', marginTop: spacing.md },
  subtitle: { color: '#CBD5E1', marginTop: spacing.sm, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: spacing.xl },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', borderRadius: 10, paddingLeft: spacing.md, marginBottom: spacing.md },
  error: { color: colors.red, marginBottom: spacing.sm },
  note: { color: colors.muted, marginBottom: spacing.sm },
  footer: { color: '#64748B', textAlign: 'center', marginTop: spacing.xl, fontSize: 12 },
});
