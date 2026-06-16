import AsyncStorage from '@react-native-async-storage/async-storage';

// Authentication token storage keys
const AUTH_KEYS = {
  TOKEN: 'authToken',
  USER_ID: 'userId',
  USER_TYPE: 'userType',
  REFRESH_TOKEN: 'refreshToken',
  EXPIRES_AT: 'expiresAt',
};

// Authentication storage interface
export interface AuthData {
  token: string;
  userId?: string;
  userType?: 'seeker' | 'company';
  refreshToken?: string;
  expiresAt?: string;
}

/**
 * Store authentication data in AsyncStorage
 */
export const storeAuthData = async (authData: AuthData): Promise<void> => {
  try {
    // Store token
    await AsyncStorage.setItem('authToken', authData.token);
    
    // Store user ID
    if (authData.userId) {
      await AsyncStorage.setItem('userId', authData.userId.toString());
    }
    
    // Store user type
    if (authData.userType) {
      await AsyncStorage.setItem('userType', authData.userType);
    }
    
    // Store refresh token
    if (authData.refreshToken) {
      await AsyncStorage.setItem('refreshToken', authData.refreshToken);
    }
    
    // Store expiration time
    if (authData.expiresAt) {
      await AsyncStorage.setItem('expiresAt', authData.expiresAt);
    }
    
  } catch (error) {
    throw new Error(`Failed to store authentication data: ${error}`);
  }
};

/**
 * Get authentication token from AsyncStorage
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_KEYS.TOKEN);
  } catch {
    return null;
  }
};

/**
 * Get all authentication data from AsyncStorage
 */
export const getAuthData = async (): Promise<AuthData | null> => {
  try {
    const [token, userId, userType, refreshToken, expiresAt] = await AsyncStorage.multiGet([
      AUTH_KEYS.TOKEN,
      AUTH_KEYS.USER_ID,
      AUTH_KEYS.USER_TYPE,
      AUTH_KEYS.REFRESH_TOKEN,
      AUTH_KEYS.EXPIRES_AT,
    ]);

    if (token[1]) {
      return {
        token: token[1],
        userId: userId[1] || undefined,
        userType: (userType[1] as 'seeker' | 'company') || undefined,
        refreshToken: refreshToken[1] || undefined,
        expiresAt: expiresAt[1] || undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Clear all authentication data from AsyncStorage
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      AUTH_KEYS.TOKEN,
      AUTH_KEYS.USER_ID,
      AUTH_KEYS.USER_TYPE,
      AUTH_KEYS.REFRESH_TOKEN,
      AUTH_KEYS.EXPIRES_AT,
    ]);
  } catch (error) {
    throw error;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    return !!token;
  } catch {
    return false;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = async (): Promise<boolean> => {
  try {
    const expiresAt = await AsyncStorage.getItem(AUTH_KEYS.EXPIRES_AT);
    if (!expiresAt) return false;
    
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    
    return now > expirationDate;
  } catch (error) {
    return false;
  }
};

/**
 * Update only the authentication token
 */
export const updateAuthToken = async (newToken: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(AUTH_KEYS.TOKEN, newToken);
  } catch (error) {
    throw error;
  }
};

export default {
  storeAuthData,
  getAuthToken,
  getAuthData,
  clearAuthData,
  isAuthenticated,
  isTokenExpired,
  updateAuthToken,
};
