import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

async function parseBackendResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || 'unknown content type';
  const body = await response.text();
  if (!contentType.toLowerCase().includes('json')) {
    throw new Error(
      `Backend returned HTTP ${response.status} (${contentType}), not JSON. Restart the backend with the updated Meetup routes.`,
    );
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new Error(`Backend returned invalid JSON (HTTP ${response.status}).`);
  }
}

export default function MeetupScreen() {
  const router = useRouter();
  const [meetupCode, setMeetupCode] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isFindingFriend, setIsFindingFriend] = useState(false);

  useEffect(() => {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
    if (!meetupCode || !isSharing || !backendUrl) return;

    let isActive = true;
    let isUpdating = false;
    const updateMeetupLocation = async () => {
      if (isUpdating) return;
      isUpdating = true;
      try {
        const currentLocation = await Location.getCurrentPositionAsync({});
        if (!isActive) return;

        const response = await fetch(`${backendUrl}/api/meetup/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: meetupCode,
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          }),
        });
        if (!response.ok && isActive) {
          console.error('Could not update Meetup Code location', response.status);
        }
      } catch (error) {
        if (isActive) console.error('Could not update Meetup Code location', error);
      } finally {
        isUpdating = false;
      }
    };

    const interval = setInterval(() => void updateMeetupLocation(), 5000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [meetupCode, isSharing]);

  const generateMeetupCode = async () => {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
    if (!backendUrl) {
      Alert.alert('Backend unavailable', 'Set EXPO_PUBLIC_BACKEND_URL to generate a meetup code.');
      return;
    }

    setIsGenerating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission needed', 'Allow location access to generate a meetup code.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const response = await fetch(`${backendUrl}/api/meetup/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        }),
      });
      const data = await parseBackendResponse(response);
      const result = data as { success?: unknown; code?: unknown; message?: unknown };
      if (!response.ok || result.success !== true || typeof result.code !== 'string') {
        throw new Error(typeof result.message === 'string' ? result.message : 'Could not generate a meetup code.');
      }
      setMeetupCode(result.code);
      setIsSharing(true);
    } catch (error) {
      Alert.alert('Could not generate code', error instanceof Error ? error.message : 'Try again when your connection is available.');
    } finally {
      setIsGenerating(false);
    }
  };

  const stopMeetupSharing = async () => {
    if (!meetupCode) return;
    setIsSharing(false);

    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
    if (!backendUrl) {
      Alert.alert('Sharing stopped locally', 'Location updates stopped, but the code could not be removed without a backend connection.');
      return;
    }

    setIsStopping(true);
    try {
      const response = await fetch(`${backendUrl}/api/meetup/${encodeURIComponent(meetupCode)}`, {
        method: 'DELETE',
      });
      const data = await parseBackendResponse(response);
      const result = data as { success?: unknown; message?: unknown };
      if (!response.ok || result.success !== true) {
        throw new Error(typeof result.message === 'string' ? result.message : 'Could not stop Meetup Code sharing.');
      }

      setMeetupCode(null);
      Alert.alert('Sharing stopped', 'Your Meetup Code was removed.');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Try again when your connection is available.';
      Alert.alert('Sharing stopped locally', `Location updates stopped, but the code could not be removed. Tap Delete Code to retry. ${detail}`);
    } finally {
      setIsStopping(false);
    }
  };

  const findFriend = async () => {
    const code = friendCode.trim();
    if (!/^\d{4}$/.test(code)) {
      Alert.alert('Invalid code', 'Enter the 4-digit friend code.');
      return;
    }

    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
    if (!backendUrl) {
      Alert.alert('Backend unavailable', 'Set EXPO_PUBLIC_BACKEND_URL to connect to the backend.');
      return;
    }

    setIsFindingFriend(true);
    try {
      const response = await fetch(`${backendUrl}/api/meetup/${encodeURIComponent(code)}`);
      const data: unknown = await response.json();
      const meetup = data as {
        success?: unknown;
        latitude?: unknown;
        longitude?: unknown;
        message?: unknown;
      };

      if (
        !response.ok ||
        meetup.success !== true ||
        typeof meetup.latitude !== 'number' ||
        !Number.isFinite(meetup.latitude) ||
        typeof meetup.longitude !== 'number' ||
        !Number.isFinite(meetup.longitude)
      ) {
        Alert.alert(
          'Friend not found',
          typeof meetup.message === 'string' ? meetup.message : 'Check the code and try again.',
        );
        return;
      }

      router.push({
        pathname: '/',
        params: {
          destLat: String(meetup.latitude),
          destLon: String(meetup.longitude),
          destName: "Friend's Location",
          activeCode: code,
        },
      });
    } catch {
      Alert.alert('Connection error', 'Could not fetch your friend’s location. Try again.');
    } finally {
      setIsFindingFriend(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Meetup</Text>
      <Text style={styles.subtitle}>Share your live location with a code, or enter a friend’s code to find them.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Share your location</Text>
        <Text style={styles.sectionDescription}>Your code stays active until you stop sharing or it expires.</Text>
        {meetupCode ? (
          <>
            <Text style={styles.meetupCode}>{meetupCode}</Text>
            <Text style={styles.sharingStatus}>{isSharing ? 'Live location sharing is active' : 'Live location sharing is stopped'}</Text>
            <TouchableOpacity style={styles.stopButton} onPress={() => void stopMeetupSharing()} disabled={isStopping}>
              {isStopping ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isSharing ? 'Stop Sharing' : 'Delete Code'}</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.generateButton} onPress={() => void generateMeetupCode()} disabled={isGenerating}>
            {isGenerating ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generate My Code</Text>}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Find a friend</Text>
        <View style={styles.friendRow}>
          <TextInput
            style={styles.friendCodeInput}
            placeholder="4-digit code"
            keyboardType="number-pad"
            maxLength={4}
            value={friendCode}
            onChangeText={setFriendCode}
          />
          <TouchableOpacity
            style={[styles.findButton, isFindingFriend && styles.disabledButton]}
            onPress={() => void findFriend()}
            disabled={isFindingFriend}
          >
            {isFindingFriend ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Find</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f9fafb', padding: 25, paddingTop: 60, paddingBottom: 120 },
  title: { color: '#1f2937', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#6b7280', fontSize: 15, lineHeight: 22, marginTop: 8 },
  section: { backgroundColor: '#fff', borderRadius: 12, marginTop: 24, padding: 18, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  sectionTitle: { color: '#1f2937', fontSize: 18, fontWeight: '700' },
  sectionDescription: { color: '#6b7280', fontSize: 14, lineHeight: 20, marginTop: 6 },
  meetupCode: { color: '#16a34a', fontSize: 34, fontWeight: '800', marginVertical: 18, textAlign: 'center' },
  sharingStatus: { color: '#6b7280', fontSize: 14, textAlign: 'center' },
  generateButton: { alignItems: 'center', backgroundColor: '#16a34a', borderRadius: 10, marginTop: 16, minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  stopButton: { alignItems: 'center', backgroundColor: '#dc2626', borderRadius: 10, marginTop: 8, minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  friendRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  friendCodeInput: { backgroundColor: '#fff', borderColor: '#d1d5db', borderRadius: 8, borderWidth: 1, flex: 1, fontSize: 16, height: 48, paddingHorizontal: 14 },
  findButton: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 8, justifyContent: 'center', minWidth: 84, paddingHorizontal: 16 },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});