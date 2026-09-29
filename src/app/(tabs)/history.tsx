import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

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
      const response = await fetch(`${backendUrl}/api/rides/history`);
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
      renderItem={({ item }) => {
        const date = new Date(item.date);
        const isOverEstimate = item.actualFarePaid > item.estimatedFare;
        return (
          <View style={styles.rideCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.date}>{Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString()}</Text>
              <Text style={[styles.difference, isOverEstimate ? styles.over : styles.under]}>
                {isOverEstimate ? '+' : '-'}Tk {Math.abs(item.actualFarePaid - item.estimatedFare).toFixed(0)}
              </Text>
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
  date: { color: '#64748b', fontSize: 13 },
  difference: { fontSize: 14, fontWeight: '700' },
  over: { color: '#dc2626' },
  under: { color: '#16a34a' },
  distance: { color: '#1f2937', fontSize: 18, fontWeight: '700', marginTop: 10 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  fareLabel: { color: '#64748b', fontSize: 14 },
  actualFare: { color: '#2b6cb0', fontSize: 14, fontWeight: '700' },
});