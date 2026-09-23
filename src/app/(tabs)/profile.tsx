import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Safety Settings</Text>
      <Text style={styles.subtitle}>
        Manage emergency contacts and live ride safety from the dedicated safety pages.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/sos')}>
        <Text style={styles.buttonText}>Manage SOS Contacts</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/location')}>
        <Text style={styles.secondaryButtonText}>Open Safety Location</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 25,
    paddingTop: 60,
  },
  title: {
    color: '#1f2937',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 30,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#2b6cb0',
    borderRadius: 10,
    paddingVertical: 15,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: { alignItems: 'center', backgroundColor: '#e5e7eb', borderRadius: 10, marginTop: 12, paddingVertical: 15 },
  secondaryButtonText: { color: '#374151', fontSize: 16, fontWeight: 'bold' },
});