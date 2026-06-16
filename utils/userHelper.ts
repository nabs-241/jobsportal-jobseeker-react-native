import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Get user ID from stored user data
 */
export const getUserId = async (): Promise<number | null> => {
  try {
    // Try userData key first (written by Login flow)
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      const uid = parsed.id || parsed.user_id || parsed.userId || parsed.user?.id || parsed.user?.user_id;
      if (uid) return Number(uid);
    }
    // Fall back to authStorage userId key (written by all auth flows via storeAuthData)
    const uid = await AsyncStorage.getItem('userId');
    return uid ? Number(uid) : null;
  } catch {
    return null;
  }
};

/**
 * Get user data from storage
 */
export const getUserData = async (): Promise<any | null> => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  } catch {
    return null;
  }
};

/**
 * Get auth token from storage
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
};
