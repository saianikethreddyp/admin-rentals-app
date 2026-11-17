import { createContext, forwardRef, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Button, Chip, Dialog, Icon, List, Portal, Snackbar, Text, TextInput, TouchableRipple } from 'react-native-paper';

import { ApiError } from '@/api/client';
import { colors, spacing, statusStyle, type BookingStatus } from '@/theme';
import { errorMessage } from '@/utils/errors';

// ------------------------------------------------------------------ layout

/** A scrolling screen with optional pull-to-refresh. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  contentStyle,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.screenContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {children}
      </Text>
      {right}
    </View>
  );
}

export function InfoRow({ label, value, onPress, last }: { label: string; value: ReactNode; onPress?: () => void; last?: boolean }) {
  const body = (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text variant="bodyMedium" style={{ color: colors.muted }}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={[styles.infoValue, onPress && { color: colors.blue }]}>
        {value}
      </Text>
    </View>
  );
  return onPress ? <TouchableRipple onPress={onPress}>{body}</TouchableRipple> : body;
}

// ------------------------------------------------------------------ status

export function StatusPill({ status }: { status: BookingStatus }) {
  const s = statusStyle[status];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={{ color: s.color, fontSize: 12, fontWeight: '600' }}>{s.label}</Text>
    </View>
  );
}

export function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

// ------------------------------------------------------------ list states

/** Shows a spinner, an error with Retry, or an empty message instead of a list. */
export function ListState({
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyText,
  emptyIcon = 'inbox-outline',
}: {
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  isEmpty: boolean;
  emptyText: string;
  emptyIcon?: string;
}) {
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.centerNote}>Loading…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Icon source="cloud-off-outline" size={40} color={colors.muted} />
        <Text style={styles.centerText}>{errorMessage(error)}</Text>
        <Button mode="contained-tonal" onPress={onRetry} style={{ marginTop: spacing.md }}>
          Try again
        </Button>
      </View>
    );
  }
  if (isEmpty) {
    return (
      <View style={styles.center}>
        <Icon source={emptyIcon} size={40} color={colors.muted} />
        <Text style={styles.centerText}>{emptyText}</Text>
      </View>
    );
  }
  return null;
}

export function FooterLoader({ visible }: { visible: boolean }) {
  return visible ? <ActivityIndicator style={{ margin: spacing.lg }} color={colors.primary} /> : null;
}

// ------------------------------------------------------------------ inputs

type FormFieldProps = Omit<React.ComponentProps<typeof TextInput>, 'error' | 'label'> & { label: string; error?: string };

/** An outlined text input with its error message underneath. Forwards its ref. */
export const FormField = forwardRef<any, FormFieldProps>(function FormField({ label, error, ...props }, ref) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <TextInput ref={ref} mode="outlined" label={label} accessibilityLabel={label} error={!!error} autoCapitalize="none" {...props} />
      {error ? (
        <Text variant="bodySmall" style={{ color: colors.red, marginTop: 2, marginLeft: 4 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});

export type Option<T extends string> = { value: T; label: string; description?: string };

/** A dropdown-style field that opens a list of options. */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  disabled,
}: {
  label: string;
  value: T | undefined;
  options: Option<T>[];
  onChange: (v: T) => void;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <TouchableRipple disabled={disabled} onPress={() => setOpen(true)} borderless style={{ borderRadius: 4 }}>
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label={label}
            value={current?.label ?? ''}
            editable={false}
            error={!!error}
            disabled={disabled}
            right={<TextInput.Icon icon="chevron-down" />}
          />
        </View>
      </TouchableRipple>
      {error ? (
        <Text variant="bodySmall" style={{ color: colors.red, marginTop: 2, marginLeft: 4 }}>
          {error}
        </Text>
      ) : null}
      <Portal>
        <Dialog visible={open} onDismiss={() => setOpen(false)} style={{ maxHeight: '80%' }}>
          <Dialog.Title>{label}</Dialog.Title>
          <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
            <ScrollView>
              {options.length === 0 ? <Text style={{ padding: spacing.lg, color: colors.muted }}>Nothing to choose from yet.</Text> : null}
              {options.map((o) => (
                <List.Item
                  key={o.value}
                  title={o.label}
                  description={o.description}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  right={(p) => (o.value === value ? <List.Icon {...p} icon="check" color={colors.green} /> : null)}
                />
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
        </Dialog>
      </Portal>
    </View>
  );
}

/** A horizontal row of selectable filter chips. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.sm }}>
      {options.map((o) => (
        <Chip key={o.value} selected={o.value === value} showSelectedCheck={false} onPress={() => onChange(o.value)} compact>
          {o.label}
        </Chip>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------- feedback

type ToastValue = { show: (message: string) => void };
const ToastContext = createContext<ToastValue>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const show = useCallback((m: string) => {
    setMessage(m);
    setVisible(true);
  }, []);
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={3500} action={{ label: 'OK', onPress: () => setVisible(false) }}>
        {message}
      </Snackbar>
    </ToastContext.Provider>
  );
}

/** Shows an error. Session-expiry errors are handled by the sign-in gate instead. */
export function showError(e: unknown, title = 'Could not complete that') {
  if (e instanceof ApiError && e.code === 'session_expired') return;
  Alert.alert(title, errorMessage(e));
}

/** Resolves true if the person confirms. */
export function confirm(title: string, message: string, confirmLabel = 'Confirm', destructive = false): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export const callPhone = (phone: string) => Linking.openURL(`tel:${phone}`);
export const whatsapp = (phone: string) => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`);
export const openMaps = (lat: number, lng: number, label: string) =>
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(label)}`);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: spacing.lg, paddingBottom: 48 },
  panel: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.sm },
  sectionTitle: { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: spacing.lg },
  infoValue: { flexShrink: 1, textAlign: 'right', fontWeight: '500' },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  centerNote: { color: colors.muted, marginTop: spacing.md },
  centerText: { color: colors.muted, marginTop: spacing.md, textAlign: 'center' },
});
