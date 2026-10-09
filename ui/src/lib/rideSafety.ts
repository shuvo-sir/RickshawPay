import * as Location from 'expo-location';

export type SafetyCoordinate = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

type SafetyListener = (coordinate: SafetyCoordinate | null) => void;

let watcher: Location.LocationSubscription | null = null;
let currentCoordinate: SafetyCoordinate | null = null;
const listeners = new Set<SafetyListener>();

export function getSafetyCoordinate() {
  return currentCoordinate;
}

export function subscribeToSafetyLocation(listener: SafetyListener) {
  listeners.add(listener);
  listener(currentCoordinate);
  return () => listeners.delete(listener);
}

export async function startSafetyTracking() {
  if (watcher) return;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Location permission was denied.');

  watcher = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10,
      timeInterval: 5000,
    },
    (location) => {
      currentCoordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
      };
      listeners.forEach((listener) => listener(currentCoordinate));
    },
  );
}

export function stopSafetyTracking() {
  watcher?.remove();
  watcher = null;
  currentCoordinate = null;
  listeners.forEach((listener) => listener(null));
}

export function isSafetyTrackingActive() {
  return watcher !== null;
}