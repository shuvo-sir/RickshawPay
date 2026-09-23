import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="time-outline" size={60} color="#cbd5e1" />
      <Text style={styles.title}>Ride History</Text>
      <Text style={styles.description}>Your past rickshaw fares will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
});