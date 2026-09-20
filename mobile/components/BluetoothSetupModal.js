import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  connectPlatIO,
  disconnectPlatIO,
  monitorProvisioning,
  requestWifiScan,
  scanPlatIODevices,
  sendWifiCredentials,
} from '../ble/provisioning';

export default function BluetoothSetupModal({
  visible,
  onClose,
  onProvisioned,
}) {
  const [step, setStep] = useState('SEARCHING');
  const [devices, setDevices] = useState([]);
  const [device, setDevice] = useState(null);
  const [networks, setNetworks] = useState([]);
  const [selectedSsid, setSelectedSsid] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('Buscando tu PlatIO…');
  const monitorRef = useRef(null);
  const deviceRef = useRef(null);

  const sortedNetworks = useMemo(() => {
    return [...networks]
      .sort((a, b) => b.rssi - a.rssi)
      .filter((network, index, all) => {
        return all.findIndex((item) => item.ssid === network.ssid) === index;
      });
  }, [networks]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    async function start() {
      setStep('SEARCHING');
      setDevices([]);
      setDevice(null);
      setNetworks([]);
      setSelectedSsid('');
      setPassword('');
      setMessage('Buscando tu PlatIO…');

      try {
        const found = await scanPlatIODevices();
        if (cancelled) return;

        setDevices(found);

        if (found.length === 0) {
          setStep('NO_DEVICE');
          setMessage('No encontré ninguna central cerca.');
          return;
        }

        if (found.length === 1) {
          await connectTo(found[0]);
          return;
        }

        setStep('CHOOSE_DEVICE');
        setMessage('Encontré más de una central.');
      } catch (error) {
        if (cancelled) return;
        setStep('ERROR');
        setMessage(error.message);
      }
    }

    start();

    return () => {
      cancelled = true;
      monitorRef.current?.remove?.();
      monitorRef.current = null;
      disconnectPlatIO(deviceRef.current);
      deviceRef.current = null;
    };
  }, [visible]);

  async function connectTo(foundDevice) {
    setStep('CONNECTING');
    setMessage('Conectando…');

    try {
      const connected = await connectPlatIO(foundDevice.id);
      deviceRef.current = connected;
      setDevice(connected);
      setNetworks([]);

      monitorRef.current?.remove?.();
      monitorRef.current = monitorProvisioning(connected, (event) => {
        if (event.type === 'SCAN_BEGIN') {
          setStep('SCANNING_WIFI');
          setMessage('Buscando redes Wi‑Fi…');
        } else if (event.type === 'NETWORK') {
          setNetworks((current) => [...current, event.network]);
        } else if (event.type === 'SCAN_DONE') {
          setStep('CHOOSE_WIFI');
          setMessage('Elegí tu red Wi‑Fi.');
        } else if (event.type === 'SAVED') {
          setStep('DONE');
          setMessage('Listo. PlatIO ya tiene tu Wi‑Fi.');
          setTimeout(() => onProvisioned?.(), 1100);
        } else if (event.type === 'ERROR') {
          setStep('ERROR');
          setMessage(event.message || 'No pude completar la configuración.');
        }
      });

      await requestWifiScan(connected);
    } catch (error) {
      setStep('ERROR');
      setMessage(error.message);
    }
  }

  async function saveWifi() {
    if (!device || !selectedSsid) return;

    setStep('SAVING');
    setMessage('Guardando Wi‑Fi…');

    try {
      await sendWifiCredentials(device, selectedSsid, password);
    } catch (error) {
      setStep('ERROR');
      setMessage(error.message);
    }
  }

  function retry() {
    onClose?.();
    setTimeout(() => onProvisioned?.({ retrySetup: true }), 250);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Agregar central</Text>
            <Text style={styles.title}>Configurar PlatIO</Text>
          </View>
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {['SEARCHING', 'CONNECTING', 'SCANNING_WIFI', 'SAVING'].includes(step) ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" />
              <Text style={styles.message}>{message}</Text>
            </View>
          ) : null}

          {step === 'CHOOSE_DEVICE' ? (
            <>
              <Text style={styles.sectionTitle}>¿Cuál es tu PlatIO?</Text>
              {devices.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.card}
                  onPress={() => connectTo(item)}
                >
                  <Text style={styles.cardTitle}>🌿 {item.name || 'PlatIO'}</Text>
                  <Text style={styles.cardMeta}>Central cercana</Text>
                </Pressable>
              ))}
            </>
          ) : null}

          {step === 'CHOOSE_WIFI' ? (
            <>
              <Text style={styles.sectionTitle}>Elegí tu Wi‑Fi</Text>
              <Text style={styles.helper}>
                PlatIO encontró estas redes cerca de la central.
              </Text>

              <View style={styles.networkList}>
                {sortedNetworks.map((network) => {
                  const selected = selectedSsid === network.ssid;
                  return (
                    <Pressable
                      key={network.ssid}
                      style={[styles.network, selected && styles.networkSelected]}
                      onPress={() => {
                        setSelectedSsid(network.ssid);
                        setPassword('');
                      }}
                    >
                      <View style={styles.networkText}>
                        <Text style={styles.networkName}>{network.ssid || 'Red oculta'}</Text>
                        <Text style={styles.cardMeta}>
                          {network.rssi > -55
                            ? 'Señal excelente'
                            : network.rssi > -67
                              ? 'Buena señal'
                              : 'Señal débil'}
                        </Text>
                      </View>
                      <Text style={styles.radio}>{selected ? '●' : '○'}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {selectedSsid ? (
                <View style={styles.passwordBlock}>
                  <Text style={styles.label}>Contraseña de {selectedSsid}</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Contraseña"
                    style={styles.input}
                  />
                  <Pressable style={styles.primary} onPress={saveWifi}>
                    <Text style={styles.primaryText}>Conectar PlatIO</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}

          {step === 'DONE' ? (
            <View style={styles.center}>
              <Text style={styles.doneEmoji}>✅</Text>
              <Text style={styles.doneTitle}>Listo</Text>
              <Text style={styles.message}>
                PlatIO se está conectando a tu Wi‑Fi. La app lo va a encontrar sola.
              </Text>
            </View>
          ) : null}

          {step === 'NO_DEVICE' ? (
            <View style={styles.center}>
              <Text style={styles.doneEmoji}>📡</Text>
              <Text style={styles.doneTitle}>No veo la central</Text>
              <Text style={styles.message}>
                Acercate a PlatIO, verificá que esté encendido y probá nuevamente.
              </Text>
              <Pressable style={styles.primary} onPress={retry}>
                <Text style={styles.primaryText}>Buscar de nuevo</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'ERROR' ? (
            <View style={styles.center}>
              <Text style={styles.doneEmoji}>⚠️</Text>
              <Text style={styles.doneTitle}>No pude terminar</Text>
              <Text style={styles.message}>{message}</Text>
              <Pressable style={styles.primary} onPress={retry}>
                <Text style={styles.primaryText}>Intentar otra vez</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F7F2' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#758178',
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.7,
  },
  title: { fontSize: 27, fontWeight: '800', color: '#173F2B', marginTop: 2 },
  close: {
    backgroundColor: '#E7EFE9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  closeText: { color: '#173F2B', fontWeight: '700' },
  content: { padding: 20, paddingBottom: 50 },
  center: {
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  message: {
    textAlign: 'center',
    color: '#65736A',
    lineHeight: 21,
    marginTop: 13,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A3D2A',
    marginBottom: 4,
  },
  helper: { color: '#708077', marginBottom: 16 },
  card: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DFE8E1',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  cardTitle: { fontSize: 17, fontWeight: '750', color: '#1D3024' },
  cardMeta: { marginTop: 3, color: '#79867E', fontSize: 12 },
  networkList: { gap: 9 },
  network: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DFE8E1',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  networkSelected: { borderColor: '#26724C', backgroundColor: '#EFF7F2' },
  networkText: { flex: 1 },
  networkName: { fontSize: 16, fontWeight: '700', color: '#1D3024' },
  radio: { color: '#26724C', fontSize: 22 },
  passwordBlock: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DFE8E1',
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
  },
  label: { color: '#314D3C', fontWeight: '700', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#CDDAD0',
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1D3024',
  },
  primary: {
    backgroundColor: '#173F2B',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryText: { color: 'white', fontWeight: '750' },
  doneEmoji: { fontSize: 50 },
  doneTitle: { marginTop: 12, fontSize: 24, fontWeight: '800', color: '#173F2B' },
});
