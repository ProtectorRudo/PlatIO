import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ConstantsModule from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';

import BluetoothSetupModal from './components/BluetoothSetupModal';

import {
  plantById,
  searchPlants,
  WATER_PROFILE_LABELS,
} from './data/plantCatalog';

const Constants = ConstantsModule.default;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const CENTRAL_CANDIDATES = [
  'http://platio.local',
  'http://192.168.4.1',
];

const STATUS_COPY = {
  OK: {
    emoji: '💚',
    title: 'Está cómoda',
    detail: 'No tenés que hacer nada.',
  },
  WARNING: {
    emoji: '🌤️',
    title: 'Se está secando',
    detail: 'Todavía puede esperar.',
  },
  NEEDS_WATER: {
    emoji: '💧',
    title: 'Le vendría bien agua hoy',
    detail: 'Es un buen momento para regarla.',
  },
  UNCALIBRATED: {
    emoji: '🌱',
    title: 'Estoy aprendiendo esta maceta',
    detail: 'PlatIO necesita observar un poco más.',
  },
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverCentral() {
  for (const baseUrl of CENTRAL_CANDIDATES) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/status`);
      if (response.ok) return { baseUrl, status: await response.json() };
    } catch {
      // Try the next candidate silently.
    }
  }
  return null;
}

async function getPushToken() {
  if (!Device.isDevice) {
    throw new Error('Las notificaciones push necesitan un teléfono físico.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('plant-care', {
      name: 'Cuidado de plantas',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 80, 180],
    });
  }

  let permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== 'granted') {
    permissions = await Notifications.requestPermissionsAsync();
  }
  if (permissions.status !== 'granted') {
    throw new Error('Activá las notificaciones para que PlatIO pueda avisarte.');
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId || projectId === 'REPLACE_WITH_EAS_PROJECT_ID') {
    throw new Error('Falta vincular la app con el proyecto de Expo/EAS.');
  }

  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

async function registerPushToken(baseUrl, token) {
  const body = new URLSearchParams({ token }).toString();
  const response = await fetchWithTimeout(
    `${baseUrl}/api/push/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    },
    5000,
  );
  if (!response.ok) throw new Error(await response.text());
}

function PlantCard({ plant, onChoose }) {
  const copy = STATUS_COPY[plant.state] ?? STATUS_COPY.UNCALIBRATED;
  const species = plantById(plant.speciesId);
  const configured = Boolean(plant.speciesId);

  return (
    <Pressable style={styles.card} onPress={() => onChoose(plant.index)}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.plantName}>
            {configured ? plant.name : `Maceta ${plant.index + 1}`}
          </Text>
          <Text style={styles.scientific}>
            {configured
              ? species?.scientific ?? 'Planta configurada'
              : 'Tocá para decirme qué planta hay acá'}
          </Text>
        </View>
        <Text style={styles.emoji}>{configured ? copy.emoji : '➕'}</Text>
      </View>

      {configured ? (
        <>
          <Text style={styles.stateTitle}>{copy.title}</Text>
          <Text style={styles.stateDetail}>{copy.detail}</Text>
          {!plant.healthy ? (
            <View style={styles.sensorWarning}>
              <Text style={styles.sensorWarningText}>Revisá este sensor</Text>
            </View>
          ) : null}
        </>
      ) : (
        <Text style={styles.addHint}>Elegir planta</Text>
      )}
    </Pressable>
  );
}

function PlantPicker({ visible, slot, onClose, onSelect }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const results = useMemo(() => searchPlants(query, 40), [query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.pickerHeader}>
          <View>
            <Text style={styles.pickerEyebrow}>
              {slot === null ? 'Maceta' : `Maceta ${slot + 1}`}
            </Text>
            <Text style={styles.pickerTitle}>¿Qué planta hay acá?</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Cerrar</Text>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Ej: jazmín, potus, lengua de suegra…"
            placeholderTextColor="#8B968F"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <ScrollView contentContainerStyle={styles.results}>
          {results.length ? (
            results.map((plant) => (
              <Pressable
                key={plant.id}
                style={styles.resultCard}
                onPress={() => onSelect(plant)}
              >
                <View style={styles.resultText}>
                  <Text style={styles.resultName}>{plant.name}</Text>
                  <Text style={styles.resultScientific}>{plant.scientific}</Text>
                  <Text style={styles.resultProfile}>
                    {WATER_PROFILE_LABELS[plant.profile]}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))
          ) : (
            <View style={styles.noResults}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyTitle}>Todavía no la encontré</Text>
              <Text style={styles.helper}>
                La biblioteca va a seguir creciendo. Mientras tanto podremos sumar una
                especie nueva sin actualizar el firmware del ESP32.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function App() {
  const [central, setCentral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pushReady, setPushReady] = useState(false);
  const [message, setMessage] = useState('Buscando tu PlatIO…');
  const [pickerSlot, setPickerSlot] = useState(null);
  const [savingPlant, setSavingPlant] = useState(false);
  const [bleSetupOpen, setBleSetupOpen] = useState(false);

  const plants = useMemo(() => central?.status?.plants ?? [], [central]);

  const connect = useCallback(async ({ manual = false } = {}) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    try {
      setMessage('Buscando tu PlatIO…');
      const found = await discoverCentral();

      if (!found) {
        setCentral(null);
        setPushReady(false);
        setMessage('No encontré la central todavía.');
        return;
      }

      setCentral(found);
      setMessage('PlatIO encontrado.');

      try {
        const token = await getPushToken();
        await registerPushToken(found.baseUrl, token);
        setPushReady(true);
      } catch (pushError) {
        setPushReady(Boolean(found.status?.pushConfigured));
        setMessage(pushError.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!central?.baseUrl) {
      await connect({ manual: true });
      return;
    }

    setRefreshing(true);
    try {
      const response = await fetchWithTimeout(`${central.baseUrl}/api/status`);
      if (!response.ok) throw new Error('No pude leer la central.');
      const status = await response.json();
      setCentral({ baseUrl: central.baseUrl, status });
    } catch {
      await connect({ manual: true });
    } finally {
      setRefreshing(false);
    }
  }, [central?.baseUrl, connect]);

  const assignPlant = useCallback(
    async (species) => {
      if (pickerSlot === null || !central?.baseUrl || savingPlant) return;

      setSavingPlant(true);
      try {
        const body = new URLSearchParams({
          index: String(pickerSlot),
          name: species.name,
          speciesId: species.id,
          profile: species.profile,
        }).toString();

        const response = await fetchWithTimeout(
          `${central.baseUrl}/api/plant/profile`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          },
          5000,
        );

        if (!response.ok) throw new Error(await response.text());

        setPickerSlot(null);
        await refreshStatus();
      } catch (error) {
        Alert.alert('No pude guardar la planta', error.message);
      } finally {
        setSavingPlant(false);
      }
    },
    [pickerSlot, central?.baseUrl, savingPlant, refreshStatus],
  );

  const testNotification = useCallback(async () => {
    if (!central?.baseUrl) return;
    try {
      const response = await fetchWithTimeout(
        `${central.baseUrl}/api/push/test`,
        { method: 'POST' },
        6000,
      );
      const result = await response.text();
      if (!response.ok) throw new Error(result);
      Alert.alert('Listo', 'Te envié una notificación de prueba.');
    } catch (error) {
      Alert.alert('No pude enviarla', error.message);
    }
  }, [central?.baseUrl]);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const plant = response.notification.request.content.data?.plant;
      if (plant) setMessage(`Abriste la alerta de ${plant}.`);
    });
    return () => subscription.remove();
  }, []);

  const urgentCount = plants.filter((p) => p.state === 'NEEDS_WATER').length;
  const configuredCount = plants.filter((p) => p.speciesId).length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshStatus} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>PlatIO</Text>
            <Text style={styles.subtitle}>Tus plantas, sin adivinar.</Text>
          </View>
          <Text style={styles.brandEmoji}>🌿</Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" />
            <Text style={styles.helper}>{message}</Text>
          </View>
        ) : central ? (
          <>
            <View style={styles.summary}>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryTitle}>
                  {urgentCount ? 'Hay algo para hacer' : 'Todo en calma'}
                </Text>
                <Text style={styles.summaryText}>
                  {urgentCount
                    ? `${urgentCount} planta(s) necesitan agua hoy.`
                    : configuredCount
                      ? 'No hay nada urgente ahora.'
                      : 'Empezá diciéndome qué planta hay en cada maceta.'}
                </Text>
              </View>
              <View
                style={[
                  styles.pushPill,
                  pushReady ? styles.pushOk : styles.pushPending,
                ]}
              >
                <Text style={styles.pushPillText}>
                  {pushReady ? 'Avisos activos' : 'Activar avisos'}
                </Text>
              </View>
            </View>

            {plants.map((plant) => (
              <PlantCard
                key={plant.index}
                plant={plant}
                onChoose={setPickerSlot}
              />
            ))}

            <Pressable style={styles.secondaryButton} onPress={testNotification}>
              <Text style={styles.secondaryButtonText}>
                Probar una notificación
              </Text>
            </Pressable>

            <Text style={styles.footnote}>
              Los porcentajes, ADC y umbrales quedan ocultos en modo diagnóstico.
            </Text>
          </>
        ) : (
          <View style={styles.centerBox}>
            <Text style={styles.emptyEmoji}>📡</Text>
            <Text style={styles.emptyTitle}>Todavía no veo tu PlatIO</Text>
            <Text style={styles.helper}>
              Encendé la central y asegurate de que el teléfono esté en la misma red.
              El emparejamiento por Bluetooth será el siguiente paso del onboarding.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => setBleSetupOpen(true)}
            >
              <Text style={styles.primaryButtonText}>Agregar PlatIO</Text>
            </Pressable>
            <Pressable
              style={styles.linkButton}
              onPress={() => connect()}
            >
              <Text style={styles.linkButtonText}>Ya está configurado · buscar de nuevo</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <BluetoothSetupModal
        visible={bleSetupOpen}
        onClose={() => setBleSetupOpen(false)}
        onProvisioned={(options) => {
          setBleSetupOpen(false);
          if (options?.retrySetup) {
            setTimeout(() => setBleSetupOpen(true), 300);
            return;
          }
          setTimeout(() => connect(), 2500);
        }}
      />

      <PlantPicker
        visible={pickerSlot !== null}
        slot={pickerSlot}
        onClose={() => setPickerSlot(null)}
        onSelect={assignPlant}
      />

      {savingPlant ? (
        <View style={styles.savingOverlay}>
          <View style={styles.savingCard}>
            <ActivityIndicator />
            <Text style={styles.savingText}>Configurando esta maceta…</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F7F2' },
  container: { padding: 20, paddingBottom: 48, gap: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: '#163F2A',
    letterSpacing: -1,
  },
  subtitle: { marginTop: 2, color: '#637168', fontSize: 15 },
  brandEmoji: { fontSize: 38 },
  summary: {
    backgroundColor: '#173F2B',
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
  summaryText: { color: '#DDE9E0', marginTop: 5, lineHeight: 19 },
  pushPill: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 10 },
  pushOk: { backgroundColor: '#DDF2E4' },
  pushPending: { backgroundColor: '#F4E9C7' },
  pushPillText: { color: '#173F2B', fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#DFE9E1',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitleBlock: { flex: 1 },
  plantName: { fontSize: 19, fontWeight: '750', color: '#1D3024' },
  scientific: {
    marginTop: 3,
    color: '#7A877F',
    fontSize: 12,
    fontStyle: 'italic',
  },
  emoji: { fontSize: 27 },
  stateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1D3024',
    marginTop: 13,
  },
  stateDetail: { color: '#68766D', marginTop: 4, fontSize: 15 },
  addHint: {
    color: '#28714D',
    fontWeight: '700',
    marginTop: 14,
  },
  sensorWarning: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#FCE8E7',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  sensorWarningText: { color: '#A52B25', fontWeight: '700', fontSize: 12 },
  centerBox: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  helper: {
    textAlign: 'center',
    color: '#68766D',
    marginTop: 12,
    lineHeight: 21,
  },
  emptyEmoji: { fontSize: 46 },
  emptyTitle: {
    marginTop: 12,
    fontSize: 21,
    fontWeight: '750',
    color: '#1D3024',
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: '#173F2B',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: { color: 'white', fontWeight: '700' },
  linkButton: { marginTop: 14, paddingVertical: 9, paddingHorizontal: 12 },
  linkButtonText: { color: '#557064', fontWeight: '650', textAlign: 'center' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#BFCFC3',
    borderRadius: 14,
    padding: 13,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#173F2B', fontWeight: '700' },
  footnote: {
    textAlign: 'center',
    color: '#839087',
    fontSize: 12,
    marginTop: 6,
    paddingHorizontal: 12,
  },
  pickerHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerEyebrow: {
    fontSize: 12,
    color: '#6F7C73',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  pickerTitle: {
    marginTop: 3,
    fontSize: 25,
    fontWeight: '800',
    color: '#183E2A',
  },
  closeButton: {
    backgroundColor: '#E8EFEA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  closeText: { color: '#183E2A', fontWeight: '700' },
  searchWrap: { paddingHorizontal: 20, paddingBottom: 12 },
  searchInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D9E4DC',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 16,
    color: '#1D3024',
  },
  results: { paddingHorizontal: 20, paddingBottom: 40, gap: 9 },
  resultCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DFE9E1',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultText: { flex: 1 },
  resultName: { fontSize: 17, fontWeight: '750', color: '#1D3024' },
  resultScientific: {
    marginTop: 2,
    color: '#748178',
    fontSize: 12,
    fontStyle: 'italic',
  },
  resultProfile: {
    marginTop: 7,
    color: '#397052',
    fontSize: 12,
    fontWeight: '600',
  },
  chevron: { fontSize: 32, color: '#95A39A', fontWeight: '300' },
  noResults: { padding: 38, alignItems: 'center' },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#173F2B33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    minWidth: 220,
  },
  savingText: { marginTop: 10, color: '#1D3024', fontWeight: '650' },
});
