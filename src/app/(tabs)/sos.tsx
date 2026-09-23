import { useEffect, useState } from 'react';
import { Alert, Keyboard, Linking, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { loadSosContacts, saveSosContacts } from '../../lib/sosContacts';
import { getSafetyCoordinate, subscribeToSafetyLocation, SafetyCoordinate } from '../../lib/rideSafety';

function createSafetyMessage(coordinate: SafetyCoordinate | null) {
  if (!coordinate) return null;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${coordinate.latitude},${coordinate.longitude}`;
  return `EMERGENCY (Rickshaw Ride): I feel unsafe. My location is here: ${mapsLink}`;
}

export default function SosScreen() {
  const [contacts, setContacts] = useState(['', '', '', '', '']);
  const [coordinate, setCoordinate] = useState(getSafetyCoordinate());

  useEffect(() => {
    loadSosContacts().then(setContacts);
    const unsubscribe = subscribeToSafetyLocation(setCoordinate);
    return () => {
      unsubscribe();
    };
  }, []);

  const updateContact = (text: string, index: number) => {
    setContacts((current) => current.map((contact, itemIndex) => itemIndex === index ? text : contact));
  };

  const saveContacts = async () => {
    try {
      await saveSosContacts(contacts);
      Keyboard.dismiss();
      Alert.alert('Saved', 'Your five emergency contacts are ready.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not save emergency contacts.');
    }
  };

  const shareSafetyMessage = async () => {
    const message = createSafetyMessage(coordinate);
    if (!message) {
      Alert.alert('Location unavailable', 'Start a ride to enable safety location sharing.');
      return;
    }
    await Share.share({ message });
  };

  const sendSafetySms = async () => {
    const message = createSafetyMessage(coordinate);
    const recipients = contacts.filter((contact) => contact.trim() !== '');
    if (!message) {
      Alert.alert('Location unavailable', 'Start a ride to enable safety location sharing.');
      return;
    }
    if (recipients.length === 0) {
      Alert.alert('No contacts', 'Save at least one emergency contact first.');
      return;
    }
    const smsUrl = `sms:${recipients.join(',')}?body=${encodeURIComponent(message)}`;
    const canOpenSms = await Linking.canOpenURL(smsUrl);
    if (!canOpenSms) {
      Alert.alert('SMS unavailable', 'This device cannot open the SMS composer. Use Share Location instead.');
      return;
    }
    await Linking.openURL(smsUrl);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency SOS</Text>
      <Text style={styles.subtitle}>Save up to five trusted contacts for a quick safety message during your ride.</Text>

      <View style={styles.form}>
        {contacts.map((contact, index) => (
          <View key={index}>
            <Text style={styles.label}>Emergency contact {index + 1}</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              keyboardType="phone-pad"
              value={contact}
              onChangeText={(text) => updateContact(text, index)}
            />
          </View>
        ))}
        <TouchableOpacity style={styles.saveButton} onPress={saveContacts}>
          <Text style={styles.saveButtonText}>Save Contacts</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.smsButton} onPress={sendSafetySms}>
          <Text style={styles.actionText}>Send SOS by SMS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton} onPress={shareSafetyMessage}>
          <Text style={styles.shareText}>Share Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 20, paddingTop: 50 },
  title: { color: '#991b1b', fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#6b7280', fontSize: 15, lineHeight: 22, marginBottom: 18 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  label: { color: '#4b5563', fontSize: 13, fontWeight: '600', marginBottom: 5 },
  input: { backgroundColor: '#f3f4f6', borderRadius: 8, fontSize: 16, height: 42, marginBottom: 10, paddingHorizontal: 12 },
  saveButton: { alignItems: 'center', backgroundColor: '#991b1b', borderRadius: 10, marginTop: 4, paddingVertical: 13 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  actions: { gap: 10, marginTop: 16 },
  smsButton: { alignItems: 'center', backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 16 },
  shareButton: { alignItems: 'center', backgroundColor: '#e5e7eb', borderRadius: 12, paddingVertical: 16 },
  actionText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  shareText: { color: '#374151', fontSize: 16, fontWeight: 'bold' },
});