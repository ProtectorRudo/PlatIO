import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

export const PLATIO_BLE = {
  service: '7b48a6f0-6c55-4aa0-96c4-8ce2f08b9a10',
  status: '7b48a6f1-6c55-4aa0-96c4-8ce2f08b9a10',
  ssid: '7b48a6f2-6c55-4aa0-96c4-8ce2f08b9a10',
  password: '7b48a6f3-6c55-4aa0-96c4-8ce2f08b9a10',
  command: '7b48a6f4-6c55-4aa0-96c4-8ce2f08b9a10',
};

const manager = new BleManager();

function utf8ToBase64(value) {
  return global.btoa(unescape(encodeURIComponent(value)));
}

function base64ToUtf8(value) {
  return decodeURIComponent(escape(global.atob(value)));
}

export async function ensureBluetoothPermissions() {
  if (Platform.OS !== 'android') return true;

  const api = Number(Platform.Version);
  if (api >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return (
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function waitForBluetoothOn(timeoutMs = 8000) {
  const state = await manager.state();
  if (state === 'PoweredOn') return true;

  return await new Promise((resolve) => {
    let done = false;
    const subscription = manager.onStateChange((next) => {
      if (done) return;
      if (next === 'PoweredOn') {
        done = true;
        subscription.remove();
        resolve(true);
      }
    }, true);

    setTimeout(() => {
      if (done) return;
      done = true;
      subscription.remove();
      resolve(false);
    }, timeoutMs);
  });
}

export async function scanPlatIODevices(timeoutMs = 7000) {
  const granted = await ensureBluetoothPermissions();
  if (!granted) throw new Error('Necesito permiso de Bluetooth para encontrar PlatIO.');

  const powered = await waitForBluetoothOn();
  if (!powered) throw new Error('Encendé Bluetooth para configurar PlatIO.');

  return await new Promise((resolve, reject) => {
    const found = new Map();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      manager.stopDeviceScan();
      resolve([...found.values()]);
    };

    manager.startDeviceScan(
      [PLATIO_BLE.service],
      { allowDuplicates: false },
      (error, device) => {
        if (settled) return;
        if (error) {
          settled = true;
          manager.stopDeviceScan();
          reject(error);
          return;
        }

        if (!device) return;
        if (
          device.name === 'PlatIO' ||
          device.localName === 'PlatIO' ||
          device.serviceUUIDs?.some(
            (uuid) => uuid.toLowerCase() === PLATIO_BLE.service,
          )
        ) {
          found.set(device.id, device);
          if (found.size === 1) {
            setTimeout(finish, 700);
          }
        }
      },
    );

    setTimeout(finish, timeoutMs);
  });
}

export async function connectPlatIO(deviceId) {
  const device = await manager.connectToDevice(deviceId, { timeout: 10000 });
  await device.discoverAllServicesAndCharacteristics();
  return device;
}

export function monitorProvisioning(device, onEvent) {
  return device.monitorCharacteristicForService(
    PLATIO_BLE.service,
    PLATIO_BLE.status,
    (error, characteristic) => {
      if (error) {
        onEvent({ type: 'ERROR', message: error.message });
        return;
      }
      if (!characteristic?.value) return;

      const raw = base64ToUtf8(characteristic.value);
      if (raw.startsWith('NET|')) {
        const [, rssi, ...ssidParts] = raw.split('|');
        onEvent({
          type: 'NETWORK',
          network: {
            ssid: ssidParts.join('|'),
            rssi: Number(rssi),
          },
        });
        return;
      }
      if (raw === 'SCAN_BEGIN') onEvent({ type: 'SCAN_BEGIN' });
      else if (raw === 'SCAN_DONE') onEvent({ type: 'SCAN_DONE' });
      else if (raw === 'SAVED') onEvent({ type: 'SAVED' });
      else if (raw.startsWith('ERROR|')) {
        onEvent({ type: 'ERROR', message: raw.slice(6) });
      } else {
        onEvent({ type: 'STATUS', message: raw });
      }
    },
  );
}

async function write(device, uuid, value) {
  await device.writeCharacteristicWithResponseForService(
    PLATIO_BLE.service,
    uuid,
    utf8ToBase64(value),
  );
}

export async function requestWifiScan(device) {
  await write(device, PLATIO_BLE.command, 'SCAN');
}

export async function sendWifiCredentials(device, ssid, password) {
  await write(device, PLATIO_BLE.ssid, ssid);
  await write(device, PLATIO_BLE.password, password);
  await write(device, PLATIO_BLE.command, 'SAVE');
}

export async function disconnectPlatIO(device) {
  try {
    if (device?.id) await manager.cancelDeviceConnection(device.id);
  } catch {
    // Best-effort cleanup.
  }
}

export function destroyBleManager() {
  manager.destroy();
}
