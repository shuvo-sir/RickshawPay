import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = '@installation_auth';

export type AuthCredentials = {
  userId: string;
  token: string;
};

type RegistrationResponse = {
  success?: unknown;
  userId?: unknown;
  token?: unknown;
};

let registrationPromise: Promise<AuthCredentials> | null = null;

export async function getAuthCredentials(backendUrl: string): Promise<AuthCredentials> {
  const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (stored) {
    try {
      const parsed: unknown = JSON.parse(stored);
      if (
        parsed
        && typeof parsed === 'object'
        && typeof (parsed as AuthCredentials).userId === 'string'
        && typeof (parsed as AuthCredentials).token === 'string'
      ) {
        return parsed as AuthCredentials;
      }
    } catch {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  if (!registrationPromise) {
    registrationPromise = (async () => {
      const response = await fetch(`${backendUrl}/api/auth/register`, { method: 'POST' });
      const data: RegistrationResponse = await response.json();
      if (
        !response.ok
        || data.success !== true
        || typeof data.userId !== 'string'
        || typeof data.token !== 'string'
      ) {
        throw new Error('Could not register this device with the backend.');
      }

      const credentials = { userId: data.userId, token: data.token };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(credentials));
      return credentials;
    })();
  }

  try {
    return await registrationPromise;
  } finally {
    registrationPromise = null;
  }
}
