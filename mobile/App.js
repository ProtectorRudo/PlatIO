import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ConstantsModule from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';

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
      if (response.ok) {
        return { baseUrl, status: await response.json() };
      }
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
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

function PlantCard({ plant }) {
  const copy = STATUS_COPY[plant.state] ?? STATUS_COPY.UNCALIBRATED;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.plantName}>{plant.name}</Text>
        <Text style={styles.emoji}>{copy.emoji}</Text>
      </View>
      <Text style={styles.stateTitle}>{copy.title}</Text>
      <Text style={styles.stateDetail}>{copy.detail}</Text>
      {!plant.healthy ? (
        <View style={styles.sensorWarning}>
          <Text style={styles.sensorWarningText}>Revisá este sensor</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function App() {
  const [central, setCentral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pushReady, setPushReady] = useState(false);
  const [message, setMessage] = useState('Buscando tu PlatIO…');

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
      if (plant) {
        setMessage(`Abriste la alerta de ${plant}.`);
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshStatus} />}
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
              <View>
                <Text style={styles.summaryTitle}>Todo en un vistazo</Text>
                <Text style={styles.summaryText}>
                  {plants.filter((p) => p.state === 'NEEDS_WATER').length
                    ? `${plants.filter((p) => p.state === 'NEEDS_WATER').length} planta(s) necesitan atención.`
                    : 'No hay nada urgente ahora.'}
                </Text>
              </View>
              <View style={[styles.pushPill, pushReady ? styles.pushOk : styles.pushPending]}>
                <Text style={styles.pushPillText}>{pushReady ? 'Avisos activos' : 'Activar avisos'}</Text>
              </View>
            </View>

            {plants.map((plant) => (
              <PlantCard key={plant.index} plant={plant} />
            ))}

            <Pressable style={styles.secondaryButton} onPress={testNotification}>
              <Text style={styles.secondaryButtonText}>Probar una notificación</Text>
            </Pressable>

            <Text style={styles.footnote}>
              Los porcentajes y lecturas técnicas quedan ocultos en el modo de diagnóstico.
            </Text>
          </>
        ) : (
          <View style={styles.centerBox}>
            <Text style={styles.emptyEmoji}>📡</Text>
            <Text style={styles.emptyTitle}>Todavía no veo tu PlatIO</Text>
            <Text style={styles.helper}>
              Encendé la central y asegurate de que el teléfono esté en la misma red. El emparejamiento por Bluetooth es el siguiente paso del onboarding.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => connect()}>
              <Text style={styles.primaryButtonText}>Buscar de nuevo</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F7F2' },
  container: { padding: 20, paddingBottom: 48, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  brand: { fontSize: 32, fontWeight: '800', color: '#163F2A', letterSpacing: -1 },
  subtitle: { marginTop: 2, color: '#637168', fontSize: 15 },
  brandEmoji: { fontSize: 38 },
  summary: { backgroundColor: '#173F2B', borderRadius: 22, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  summaryTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
  summaryText: { color: '#DDE9E0', marginTop: 5, maxWidth: 210 },
  pushPill: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 10 },
  pushOk: { backgroundColor: '#DDF2E4' },
  pushPending: { backgroundColor: '#F4E9C7' },
  pushPillText: { color: '#173F2B', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#DFE9E1' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plantName: { fontSize: 19, fontWeight: '750', color: '#1D3024' },
  emoji: { fontSize: 27 },
  stateTitle: { fontSize: 17, fontWeight: '700', color: '#1D3024', marginTop: 11 },
  stateDetail: { color: '#68766D', marginTop: 4, fontSize: 15 },
  sensorWarning: { alignSelf: 'flex-start', marginTop: 12, backgroundColor: '#FCE8E7', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 9 },
  sensorWarningText: { color: '#A52B25', fontWeight: '700', fontSize: 12 },
  centerBox: { minHeight: 360, alignItems: 'center', justifyContent: 'center', padding: 22 },
  helper: { textAlign: 'center', color: '#68766D', marginTop: 12, lineHeight: 21 },
  emptyEmoji: { fontSize: 46 },
  emptyTitle: { marginTop: 12, fontSize: 21, fontWeight: '750', color: '#1D3024' },
  primaryButton: { marginTop: 20, backgroundColor: '#173F2B', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  primaryButtonText: { color: 'white', fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderColor: '#BFCFC3', borderRadius: 14, padding: 13, alignItems: 'center' },
  secondaryButtonText: { color: '#173F2B', fontWeight: '700' },
  footnote: { textAlign: 'center', color: '#839087', fontSize: 12, marginTop: 6, paddingHorizontal: 12 },
});
