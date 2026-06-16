import { getAuthData } from './authStorage';

// User data interface
export interface UserProfile {
  name?: string;
  email?: string;
  profile_image?: string;
  cover_image?: string;
  location?: string;
  resume_complete?: boolean;
}

// Global user data store
let globalUserData: UserProfile | null = null;

// User Service
class UserService {
  /**
   * Set user profile data
   */
  setUserData(userData: UserProfile | null): void {
    globalUserData = userData;
  }

  /**
   * Get user profile data
   */
  getUserData(): UserProfile | null {
    return globalUserData;
  }

  /**
   * Clear user profile data
   */
  clearUserData(): void {
    globalUserData = null;
  }

  /**
   * Get user data from auth storage (fallback)
   */
  async getUserDataFromAuth(): Promise<UserProfile | null> {
    try {
      const authData = await getAuthData();
      if (authData) {
        return {
          name: authData.userId ? `User ${authData.userId}` : 'User',
          email: '',
          profile_image: undefined,
          cover_image: undefined,
          location: 'Location not set',
          resume_complete: false,
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user data with fallback
   */
  async getUserDataWithFallback(): Promise<UserProfile | null> {
    // First try to get from global store
    if (globalUserData) {
      return globalUserData;
    }

    // Fallback to auth data
    return await this.getUserDataFromAuth();
  }
}

// Create and export singleton instance
const userService = new UserService();
export default userService;

// Export commonly used methods for convenience
export const {
  setUserData,
  getUserData,
  clearUserData,
  getUserDataFromAuth,
  getUserDataWithFallback,
} = userService;
