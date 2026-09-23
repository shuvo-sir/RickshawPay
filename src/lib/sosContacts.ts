import AsyncStorage from '@react-native-async-storage/async-storage';

export const SOS_CONTACTS_STORAGE_KEY = '@sos_contacts';

export async function loadSosContacts(): Promise<string[]> {
  try {
    const savedContacts = await AsyncStorage.getItem(SOS_CONTACTS_STORAGE_KEY);
    if (!savedContacts) return ['', '', '', '', ''];

    const parsedContacts: unknown = JSON.parse(savedContacts);
    if (!Array.isArray(parsedContacts)) return ['', '', '', '', ''];

    return Array.from({ length: 5 }, (_, index) =>
      typeof parsedContacts[index] === 'string' ? parsedContacts[index] : '',
    );
  } catch (error) {
    console.error('Failed to load contacts', error);
    return ['', '', '', '', ''];
  }
}

export async function saveSosContacts(contacts: string[]): Promise<void> {
  await AsyncStorage.setItem(
    SOS_CONTACTS_STORAGE_KEY,
    JSON.stringify(contacts.slice(0, 5)),
  );
}
