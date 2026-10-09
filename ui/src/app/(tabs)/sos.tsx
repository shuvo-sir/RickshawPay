import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { loadSosContacts, saveSosContacts } from '../../lib/sosContacts';
import { getSafetyCoordinate, subscribeToSafetyLocation, SafetyCoordinate } from '../../lib/rideSafety';

function createSafetyMessage(coordinate: SafetyCoordinate | null) {
  if (!coordinate) return null;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${coordinate.latitude},${coordinate.longitude}`;
  return `Emergency: I feel unsafe. My location is here: ${mapsLink}`;
}

export default function SosScreen() {
  const [contacts, setContacts] = useState(['', '', '']);
  const [coordinate, setCoordinate] = useState(getSafetyCoordinate());

  useEffect(() => {
    loadSosContacts().then((savedContacts) => {
      setContacts(savedContacts);
    });

    const unsubscribe = subscribeToSafetyLocation(setCoordinate);
    return () => {
      unsubscribe();
    };
  }, []);

  const updateContact = (text: string, index: number) => {
    setContacts((current) => current.map((contact, itemIndex) => (itemIndex === index ? text : contact)));
  };

  const saveContacts = async () => {
    try {
      await saveSosContacts(contacts);
      Keyboard.dismiss();
      Alert.alert('Saved', 'Your emergency contacts are ready.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not save emergency contacts.');
    }
  };

  const sendSafetySms = async () => {
    const message = createSafetyMessage(coordinate);
    const recipients = contacts.filter((contact) => contact.trim() !== '');

    if (!message) {
      Alert.alert('Location unavailable', 'Start a ride to enable live location sharing.');
      return;
    }

    if (recipients.length === 0) {
      Alert.alert('No contacts', 'Add at least one emergency contact first.');
      return;
    }

    const smsUrl = `sms:${recipients.join(',')}?body=${encodeURIComponent(message)}`;
    const canOpenSms = await Linking.canOpenURL(smsUrl);

    if (!canOpenSms) {
      Alert.alert('SMS unavailable', 'This device cannot open the SMS composer. Try again on a phone with SMS support.');
      return;
    }

    await Linking.openURL(smsUrl);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Emergency SOS</Text>
        <Text style={styles.subtitle}>Send your trusted contacts an emergency text with your ride location.</Text>
      </View>

      <TouchableOpacity
        accessibilityLabel="Send an emergency SMS with your location"
        accessibilityRole="button"
        activeOpacity={0.85}
        style={styles.panicButton}
        onPress={sendSafetySms}
      >
        <Ionicons name="alert-circle" size={64} color="#ffffff" />
        <Text style={styles.panicButtonText}>SEND SOS</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trusted Contacts</Text>
        {contacts.map((contact, index) => (
          <View key={index} style={styles.field}>
            <Text style={styles.label}>Contact {index + 1}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                value={contact}
                onChangeText={(text) => updateContact(text, index)}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.saveButton} onPress={saveContacts}>
          <Text style={styles.saveButtonText}>Save Contacts</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 140,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: '#1f2937',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
  },
  panicButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#ef4444',
    borderColor: '#fca5a5',
    borderRadius: 90,
    borderWidth: 10,
    height: 180,
    justifyContent: 'center',
    marginBottom: 30,
    shadowColor: '#7f1d1d',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    width: 180,
  },
  panicButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    flexDirection: 'row',
    height: 52,
    paddingHorizontal: 14,
  },
  input: {
    color: '#111827',
    flex: 1,
    fontSize: 16,
    height: '100%',
    paddingLeft: 12,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 14,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});