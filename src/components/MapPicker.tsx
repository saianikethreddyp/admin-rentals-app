import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, List, Text, TextInput } from 'react-native-paper';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { colors, spacing } from '@/theme';

export type LatLng = { latitude: number; longitude: number };

// Hyderabad, used until a pin is placed.
const DEFAULT_CENTER: LatLng = { latitude: 17.385, longitude: 78.4867 };

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const GEOCODER_HEADERS = { Accept: 'application/json', 'Accept-Language': 'en', 'User-Agent': 'ThandraAdmin/1.0' };

export type Place = { name: string; latitude: number; longitude: number };

/** Looks up places in India by free text, using OpenStreetMap's Nominatim. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `${NOMINATIM}/search?format=jsonv2&limit=6&countrycodes=in&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: GEOCODER_HEADERS, signal });
  if (!res.ok) throw new Error('Place search is unavailable right now.');
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return rows.map((r) => ({ name: r.display_name, latitude: Number(r.lat), longitude: Number(r.lon) }));
}

/** Turns coordinates into a readable address. Returns null if none is found. */
export async function reverseGeocode(p: LatLng, signal?: AbortSignal): Promise<string | null> {
  const url = `${NOMINATIM}/reverse?format=jsonv2&lat=${p.latitude}&lon=${p.longitude}`;
  const res = await fetch(url, { headers: GEOCODER_HEADERS, signal });
  if (!res.ok) return null;
  const json = (await res.json()) as { display_name?: string };
  return json.display_name ?? null;
}

function buildHtml(initial: LatLng | null) {
  const c = initial ?? DEFAULT_CENTER;
  const zoom = initial ? 16 : 12;
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;padding:0;background:#e2e8f0}</style></head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map').setView([${c.latitude}, ${c.longitude}], ${zoom});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  var marker = null;
  function post(lat, lng) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pin', lat: lat, lng: lng })); }
  function setPin(lat, lng, pan) {
    if (!marker) {
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', function () { var p = marker.getLatLng(); post(p.lat, p.lng); });
    } else { marker.setLatLng([lat, lng]); }
    if (pan) map.setView([lat, lng], Math.max(map.getZoom(), 16));
  }
  window.setPin = setPin;
  map.on('click', function (e) { setPin(e.latlng.lat, e.latlng.lng, false); post(e.latlng.lat, e.latlng.lng); });
  ${initial ? `setPin(${initial.latitude}, ${initial.longitude}, false);` : ''}
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
</script></body></html>`;
}

type Props = {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  height?: number;
};

/**
 * Pick a hub location: search for a place or tap/drag the pin on an
 * OpenStreetMap map. Coordinates are never typed by hand.
 */
export function MapPicker({ value, onChange, height = 280 }: Props) {
  const web = useRef<WebView>(null);
  const html = useMemo(() => buildHtml(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  function onMessage(e: WebViewMessageEvent) {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === 'ready') setReady(true);
      if (m.type === 'pin') onChange({ latitude: m.lat, longitude: m.lng });
    } catch {
      // ignore malformed messages
    }
  }

  async function search() {
    const q = query.trim();
    if (q.length < 3) {
      setMessage('Type at least 3 letters, for example "Madhapur Hyderabad".');
      return;
    }
    abort.current?.abort();
    abort.current = new AbortController();
    setSearching(true);
    setMessage('');
    try {
      const found = await searchPlaces(q, abort.current.signal);
      setResults(found);
      if (found.length === 0) setMessage('No place found. Try a nearby landmark, or tap the map.');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setMessage((err as Error).message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  }

  function choose(p: Place) {
    setResults([]);
    setQuery('');
    onChange({ latitude: p.latitude, longitude: p.longitude });
    web.current?.injectJavaScript(`window.setPin(${p.latitude}, ${p.longitude}, true); true;`);
  }

  return (
    <View>
      <TextInput
        mode="outlined"
        label="Search for a place"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={search}
        returnKeyType="search"
        right={<TextInput.Icon icon="magnify" onPress={search} />}
        autoCapitalize="none"
      />
      {searching ? <ActivityIndicator style={{ margin: spacing.sm }} color={colors.primary} /> : null}
      {message ? <Text style={styles.note}>{message}</Text> : null}
      {results.length > 0 ? (
        <View style={styles.results}>
          {results.map((r, i) => (
            <List.Item key={`${r.latitude},${r.longitude},${i}`} title={r.name} titleNumberOfLines={2} onPress={() => choose(r)} left={(p) => <List.Icon {...p} icon="map-marker-outline" />} />
          ))}
        </View>
      ) : null}

      <View style={[styles.mapBox, { height }]}>
        <WebView ref={web} originWhitelist={['*']} source={{ html }} onMessage={onMessage} javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false} style={{ flex: 1 }} />
        {!ready ? (
          <View style={styles.mapLoading} pointerEvents="none">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
      </View>
      <Text variant="bodySmall" style={styles.note}>
        {value ? `Pinned at ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}. Drag the pin to adjust it.` : 'Tap the map to drop a pin on the exact entrance.'}
      </Text>
      <Button compact onPress={() => web.current?.reload()} style={{ alignSelf: 'flex-start' }}>
        Reload map
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm },
  mapLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  note: { color: colors.muted, marginVertical: 6 },
  results: { backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginTop: 4 },
});
