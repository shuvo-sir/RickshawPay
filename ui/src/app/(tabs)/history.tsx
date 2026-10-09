import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getAuthCredentials } from '../../lib/userId';

type Ride = {
  _id?: string;
  id?: string;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  distanceKm: number;
  estimatedFare: number;
  actualFarePaid: number;
  date: string;
};

type HistoryResponse = {
  success?: unknown;
  rides?: unknown;
  message?: unknown;
};

function isRide(value: unknown): value is Ride {
  if (!value || typeof value !== 'object') return false;
  const ride = value as Partial<Ride>;
  return typeof ride.distanceKm === 'number'
    && typeof ride.estimatedFare === 'number'
    && typeof ride.actualFarePaid === 'number'
    && typeof ride.date === 'string';
}

export default function HistoryScreen() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingRideId, setDeletingRideId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async (refresh = false) => {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
    if (!backendUrl) {
      setErrorMessage('Set EXPO_PUBLIC_BACKEND_URL to load ride history.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage(null);
    try {
      const credentials = await getAuthCredentials(backendUrl);
      const response = await fetch(`${backendUrl}/api/rides/history`, {
        headers: { Authorization: `Bearer ${credentials.token}` },
      });
      const data: HistoryResponse = await response.json();
      if (!response.ok || data.success !== true || !Array.isArray(data.rides)) {
        throw new Error(typeof data.message === 'string' ? data.message : 'Could not load ride history.');
      }
      setRides(data.rides.filter(isRide));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load ride history.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const deleteRide = useCallback((ride: Ride) => {
    const rideId = ride._id ?? ride.id;
    if (!rideId) {
      Alert.alert('Unable to delete ride', 'This history entry has no valid ride ID.');
      return;
    }

    Alert.alert(
      'Delete ride?',
      'This ride will be permanently removed from your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
              if (!backendUrl) {
                Alert.alert('Backend unavailable', 'Set EXPO_PUBLIC_BACKEND_URL to delete this ride.');
                return;
              }

              setDeletingRideId(rideId);
              try {
                const credentials = await getAuthCredentials(backendUrl);
                const response = await fetch(`${backendUrl}/api/rides/${encodeURIComponent(rideId)}`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${credentials.token}` },
                });
                const data: HistoryResponse = await response.json();
                if (!response.ok || data.success !== true) {
                  throw new Error(typeof data.message === 'string' ? data.message : 'Could not delete this ride.');
                }
                setRides((current) => current.filter((item) => (item._id ?? item.id) !== rideId));
              } catch (error) {
                Alert.alert('Could not delete ride', error instanceof Error ? error.message : 'Try again when your connection is available.');
              } finally {
                setDeletingRideId(null);
              }
            })();
          },
        },
      ],
    );
  }, []);

  const loadHistoryOnMount = useEffectEvent(() => {
    void loadHistory();
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistoryOnMount();
  }, []);

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2b6cb0" /></View>;
  }

  if (errorMessage) {
    return (
      <View style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={52} color="#94a3b8" />
        <Text style={styles.title}>History unavailable</Text>
        <Text style={styles.description}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={rides.length === 0 ? styles.emptyList : styles.list}
      data={rides}
      keyExtractor={(ride, index) => ride._id ?? ride.id ?? `${ride.date}-${index}`}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadHistory(true)} />}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Ionicons name="time-outline" size={60} color="#cbd5e1" />
          <Text style={styles.title}>Ride History</Text>
          <Text style={styles.description}>Your completed rickshaw fares will appear here.</Text>
        </View>
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Ride History</Text>
          <Text style={styles.pageSubtitle}>Review and manage your completed rickshaw fares.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const date = new Date(item.date);
        const isOverEstimate = item.actualFarePaid > item.estimatedFare;
        return (
          <View style={styles.rideCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.date}>{Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString()}</Text>
              <View style={styles.cardActions}>
                <Text style={[styles.difference, isOverEstimate ? styles.over : styles.under]}>
                  {isOverEstimate ? '+' : '-'}Tk {Math.abs(item.actualFarePaid - item.estimatedFare).toFixed(0)}
                </Text>
                <TouchableOpacity
                  accessibilityLabel="Delete ride"
                  accessibilityRole="button"
                  disabled={deletingRideId === (item._id ?? item.id)}
                  onPress={() => deleteRide(item)}
                  style={styles.deleteButton}
                >
                  {deletingRideId === (item._id ?? item.id)
                    ? <ActivityIndicator size="small" color="#dc2626" />
                    : <Ionicons name="trash-outline" size={21} color="#dc2626" />}
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.distance}>{item.distanceKm.toFixed(1)} km ride</Text>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Estimated Tk {item.estimatedFare.toFixed(0)}</Text>
              <Text style={styles.actualFare}>Paid Tk {item.actualFarePaid.toFixed(0)}</Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: '#f9fafb',
    padding: 20,
    paddingBottom: 120,
  },
  emptyList: {
    backgroundColor: '#f9fafb',
    flexGrow: 1,
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  header: {
    marginBottom: 18,
  },
  pageTitle: {
    color: '#1f2937',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 6,
  },
  pageSubtitle: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    marginTop: 15,
    marginBottom: 10,
    color: '#374151',
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardActions: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  deleteButton: { alignItems: 'center', justifyContent: 'center', minHeight: 36, minWidth: 36 },
  date: { color: '#64748b', fontSize: 13 },
  difference: { fontSize: 14, fontWeight: '700' },
  over: { color: '#dc2626' },
  under: { color: '#16a34a' },
  distance: { color: '#1f2937', fontSize: 18, fontWeight: '700', marginTop: 10 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  fareLabel: { color: '#64748b', fontSize: 14 },
  actualFare: { color: '#2b6cb0', fontSize: 14, fontWeight: '700' },
});