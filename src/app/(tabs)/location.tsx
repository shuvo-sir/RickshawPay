import { useEffect, useState } from 'react';
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  getSafetyCoordinate,
  isSafetyTrackingActive,
  startSafetyTracking,
  stopSafetyTracking,
  subscribeToSafetyLocation,
  SafetyCoordinate,
} from '../../lib/rideSafety';

function createMapsLink(coordinate: SafetyCoordinate | null) {
  if (!coordinate) return null;
  return `https://www.google.com/maps/search/?api=1&query=${coordinate.latitude},${coordinate.longitude}`;
}

export default function LocationScreen() {
  const [coordinate, setCoordinate] = useState(getSafetyCoordinate());
  const [isSharing, setIsSharing] = useState(isSafetyTrackingActive());

  useEffect(() => {
    const unsubscribe = subscribeToSafetyLocation((nextCoordinate) => {
      setCoordinate(nextCoordinate);
      setIsSharing(isSafetyTrackingActive());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const toggleSharing = async () => {
    if (isSharing) {
      stopSafetyTracking();
      setIsSharing(false);
      return;
    }

    try {
      await startSafetyTracking();
      setIsSharing(true);
    } catch (error) {
      Alert.alert('Location unavailable', error instanceof Error ? error.message : 'Could not start location sharing.');
    }
  };

  const shareLocation = async () => {
    const mapsLink = createMapsLink(coordinate);
    if (!mapsLink) {
      Alert.alert('No location yet', 'Start a ride or location sharing first.');
      return;
    }
    await Share.share({ message: `My current rickshaw ride location: ${mapsLink}` });
  };

  const copyLocation = async () => {
    const mapsLink = createMapsLink(coordinate);
    if (!mapsLink) {
      Alert.alert('No location yet', 'Start a ride or location sharing first.');
      return;
    }
    await Share.share({ message: mapsLink });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerIcon}><Text style={styles.headerIconText}>+</Text></View>
      <Text style={styles.title}>Safety Location</Text>
      <Text style={styles.subtitle}>Location sharing follows your active ride and stops when the ride is completed.</Text>
      <View style={[styles.statusCard, isSharing && styles.statusCardActive]}>
        <View style={[styles.statusDot, isSharing && styles.statusDotActive]} />
        <View>
          <Text style={styles.statusTitle}>{isSharing ? 'Sharing is active' : 'Sharing is off'}</Text>
          <Text style={styles.statusText}>
            {coordinate ? `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}` : 'Waiting for a ride location'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={toggleSharing}>
        <Text style={styles.primaryButtonText}>{isSharing ? 'Stop Sharing' : 'Start Sharing'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={shareLocation}>
        <Text style={styles.secondaryButtonText}>Share Current Link</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={copyLocation}>
        <Text style={styles.secondaryButtonText}>Share Location Link</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 24, paddingTop: 60 },
  headerIcon: { alignItems: 'center', backgroundColor: '#dbeafe', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  headerIconText: { color: '#2563eb', fontSize: 30, fontWeight: 'bold' },
  title: { color: '#1f2937', fontSize: 28, fontWeight: 'bold', marginTop: 18 },
  subtitle: { color: '#6b7280', fontSize: 15, lineHeight: 22, marginTop: 8 },
  statusCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row', gap: 12, marginTop: 28, padding: 18, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  statusCardActive: { borderColor: '#93c5fd', borderWidth: 1 },
  statusDot: { backgroundColor: '#9ca3af', borderRadius: 8, height: 16, width: 16 },
  statusDotActive: { backgroundColor: '#16a34a' },
  statusTitle: { color: '#1f2937', fontSize: 17, fontWeight: 'bold' },
  statusText: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 12, marginTop: 18, paddingVertical: 16 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: { alignItems: 'center', backgroundColor: '#e5e7eb', borderRadius: 12, marginTop: 10, paddingVertical: 15 },
  secondaryButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' },
});