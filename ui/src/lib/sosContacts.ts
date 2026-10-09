import AsyncStorage from '@react-native-async-storage/async-storage';

export const SOS_CONTACTS_STORAGE_KEY = '@sos_contacts';
const MAX_SOS_CONTACTS = 3;

function emptyContacts() {
  return Array.from({ length: MAX_SOS_CONTACTS }, () => '');
}

export async function loadSosContacts(): Promise<string[]> {
  try {
    const savedContacts = await AsyncStorage.getItem(SOS_CONTACTS_STORAGE_KEY);
    if (!savedContacts) return emptyContacts();

    const parsedContacts: unknown = JSON.parse(savedContacts);
    if (!Array.isArray(parsedContacts)) return emptyContacts();

    return Array.from({ length: MAX_SOS_CONTACTS }, (_, index) =>
      typeof parsedContacts[index] === 'string' ? parsedContacts[index] : '',
    );
  } catch (error) {
    console.error('Failed to load contacts', error);
    return emptyContacts();
  }
}

export async function saveSosContacts(contacts: string[]): Promise<void> {
  await AsyncStorage.setItem(
    SOS_CONTACTS_STORAGE_KEY,
    JSON.stringify(contacts.slice(0, MAX_SOS_CONTACTS)),
  );
}
