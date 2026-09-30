import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = '@device_user_id';

export async function getOrCreateUserId(): Promise<string> {
  const storedUserId = await AsyncStorage.getItem(USER_ID_KEY);
  if (storedUserId) return storedUserId;

  const userId = `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  await AsyncStorage.setItem(USER_ID_KEY, userId);
  return userId;
}