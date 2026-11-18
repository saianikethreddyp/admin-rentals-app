import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, IconButton, Switch, Text, TouchableRipple } from 'react-native-paper';

import { useCar, useDeletePhoto, useHubs, useUpdateCar, useUploadPhoto } from '@/api/hooks';
import { CarForm } from '@/components/CarForm';
import { confirm, ListState, Panel, Screen, SectionTitle, showError, useToast } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { fieldErrors } from '@/utils/errors';

const MAX_PHOTOS = 10;

export default function CarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const car = useCar(id);
  const hubs = useHubs();
  const update = useUpdateCar(id);
  const upload = useUploadPhoto(id);
  const removePhoto = useDeletePhoto(id);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);

  if (!car.data || !hubs.data) {
    return (
      <ListState
        isLoading={car.isLoading || hubs.isLoading}
        error={car.error ?? hubs.error}
        onRetry={() => {
          car.refetch();
          hubs.refetch();
        }}
        isEmpty={false}
        emptyText=""
      />
    );
  }
  const c = car.data;
  const hubName = hubs.data.find((h) => h.id === c.hub_id)?.name;

  async function addPhotos() {
    const remaining = MAX_PHOTOS - c.photos.length;
    if (remaining <= 0) {
      toast.show(`A car can have at most ${MAX_PHOTOS} photos.`);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (res.canceled || res.assets.length === 0) return;

    let done = 0;
    setUploading({ done, total: res.assets.length });
    try {
      for (const asset of res.assets) {
        await upload.mutateAsync({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName });
        done += 1;
        setUploading({ done, total: res.assets.length });
      }
      toast.show(done === 1 ? 'Photo added' : `${done} photos added`);
    } catch (e) {
      showError(e, done > 0 ? `Added ${done}, then it failed` : 'Could not upload the photo');
    } finally {
      setUploading(null);
    }
  }

  const enabled = c.status === 'available';
  async function toggleEnabled(next: boolean) {
    if (!next && !(await confirm('Disable this car?', 'Customers will no longer see or book it. Existing bookings are not cancelled.', 'Disable', true))) return;
    try {
      await update.mutateAsync({ status: next ? 'available' : 'maintenance' });
      toast.show(next ? 'Car enabled' : 'Car disabled');
    } catch (e) {
      showError(e, next ? 'Could not enable the car' : 'Could not disable the car');
    }
  }

  async function deletePhoto(key: string) {
    if (!(await confirm('Delete this photo?', 'It will be removed from the car for good.', 'Delete', true))) return;
    try {
      await removePhoto.mutateAsync(key);
    } catch (e) {
      showError(e);
    }
  }

  return (
    <Screen refreshing={car.isRefetching} onRefresh={car.refetch}>
      <Text variant="titleLarge" style={{ fontWeight: '700' }}>
        {c.brand} {c.model}
      </Text>
      <Text style={{ color: colors.muted, marginBottom: spacing.sm }}>
        {c.plate}
        {hubName ? ` · ${hubName}` : ''}
      </Text>

      <Panel style={styles.enableRow}>
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text variant="titleSmall">{enabled ? 'Enabled' : c.status === 'retired' ? 'Retired' : 'Disabled'}</Text>
          <Text variant="bodySmall" style={{ color: colors.muted }}>
            {enabled ? 'Customers can see and book this car.' : 'Hidden from customers. Turn on to make it bookable again.'}
          </Text>
        </View>
        <Switch value={enabled} onValueChange={toggleEnabled} disabled={update.isPending} />
      </Panel>

      <SectionTitle>
        Photos ({c.photos.length}/{MAX_PHOTOS})
      </SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.sm }}>
        {c.photos.map((p) => (
          <View key={p.key} style={styles.photoWrap}>
            <Image source={{ uri: p.url }} style={styles.photo} />
            <IconButton icon="close" size={16} iconColor="#fff" containerColor="rgba(15,23,42,0.75)" style={styles.photoDelete} onPress={() => deletePhoto(p.key)} />
          </View>
        ))}
        {c.photos.length < MAX_PHOTOS ? (
          <TouchableRipple onPress={addPhotos} disabled={!!uploading} borderless style={[styles.photoWrap, styles.addTile]}>
            <View style={{ alignItems: 'center' }}>
              {uploading ? (
                <>
                  <ActivityIndicator color={colors.primary} />
                  <Text variant="labelSmall" style={{ marginTop: 6 }}>
                    {uploading.done}/{uploading.total}
                  </Text>
                </>
              ) : (
                <>
                  <Icon source="image-plus" size={28} color={colors.muted} />
                  <Text variant="labelSmall" style={{ color: colors.muted, marginTop: 4 }}>
                    Add photo
                  </Text>
                </>
              )}
            </View>
          </TouchableRipple>
        ) : null}
      </ScrollView>
      {c.photos.length === 0 && !uploading ? <Text style={{ color: colors.muted, marginBottom: spacing.sm }}>No photos yet. Customers see cars with photos first.</Text> : null}

      <SectionTitle>Details</SectionTitle>
      <CarForm
        key={c.updated_at}
        hubs={hubs.data}
        car={c}
        submitting={update.isPending}
        serverErrors={serverErrors}
        onUpdate={async (patch) => {
          setServerErrors({});
          try {
            await update.mutateAsync(patch);
            toast.show('Saved');
          } catch (e) {
            const fe = fieldErrors(e);
            if (Object.keys(fe).length) setServerErrors(fe);
            else showError(e, 'Could not save');
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  enableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoWrap: { width: 120, height: 90, borderRadius: 12 },
  photo: { width: 120, height: 90, borderRadius: 12, backgroundColor: colors.border },
  photoDelete: { position: 'absolute', top: -4, right: -4, margin: 0 },
  addTile: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.muted, backgroundColor: colors.card },
});
