import notificationService, { NotificationType } from './notificationService';
import { getUserId } from '../utils/userHelper';
import apiService from './apiService';
import cvCompletenessService from './cvCompletenessService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileCompletionData {
  isComplete: boolean;
  missingSections: string[];
  completedSections: string[];
  percentage: number;
  lastReminderSent?: Date;
}

class ProfileCompletionNotificationService {
  private lastCheckTime: Date | null = null;
  private checkInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private intervalId: NodeJS.Timeout | null = null;
  private reminderCooldown: number = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Start monitoring for profile completion
   */
  startProfileCompletionMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Check immediately
    this.checkProfileCompletion();

    // Then check every 24 hours
    this.intervalId = setInterval(() => {
      this.checkProfileCompletion();
    }, this.checkInterval);

  }

  /**
   * Stop monitoring for profile completion
   */
  stopProfileCompletionMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check profile completion and send reminders if needed
   */
  private async checkProfileCompletion(): Promise<void> {
    try {
      const userId = await getUserId();
      if (!userId) {
        return;
      }

      // Get profile completion data
      const completionData = await this.getProfileCompletionData(userId);
      if (!completionData) {
        return;
      }

      // Check if reminder should be sent
      if (this.shouldSendReminder(completionData)) {
        await this.sendProfileCompletionReminder(completionData);
      }

      this.lastCheckTime = new Date();

    } catch (error) {
      console.error('❌ Error checking profile completion:', error);
    }
  }

  /**
   * Get profile completion data
   */
  private async getProfileCompletionData(userId: number): Promise<ProfileCompletionData | null> {
    try {
      // Get CV completeness data
      const cvResponse = await cvCompletenessService.checkCVCompleteness();
      if (!cvResponse.success || !cvResponse.data) {
        return null;
      }

      const cvData = cvResponse.data;

      // Get user profile data for additional checks
      const token = await this.getAuthToken();
      if (!token) return null;

      const profileResponse = await apiService.get('/user/profile', token);
      if (!profileResponse.success || !profileResponse.data) {
        return null;
      }

      const profile = profileResponse.data;

      // Check additional profile fields
      const additionalMissingFields = this.checkAdditionalProfileFields(profile);

      return {
        isComplete: cvData.isComplete && additionalMissingFields.length === 0,
        missingSections: [...cvData.missingSections, ...additionalMissingFields],
        completedSections: cvData.completedSections,
        percentage: Math.min(cvData.percentage, 100),
        lastReminderSent: await this.getLastReminderSent(userId)
      };

    } catch (error) {
      console.error('❌ Error getting profile completion data:', error);
      return null;
    }
  }

  /**
   * Check additional profile fields beyond CV sections
   */
  private checkAdditionalProfileFields(profile: any): string[] {
    const missingFields: string[] = [];

    // Check profile image
    if (!profile.profile_image || profile.profile_image === '') {
      missingFields.push('profile_image');
    }

    // Check cover image
    if (!profile.cover_image || profile.cover_image === '') {
      missingFields.push('cover_image');
    }

    // Check location
    if (!profile.location || profile.location === '') {
      missingFields.push('location');
    }

    // Check phone number
    if (!profile.phone || profile.phone === '') {
      missingFields.push('phone');
    }

    // Check bio/summary
    if (!profile.bio || profile.bio === '') {
      missingFields.push('bio');
    }

    return missingFields;
  }

  /**
   * Check if reminder should be sent
   */
  private shouldSendReminder(data: ProfileCompletionData): boolean {
    // Don't send if profile is complete
    if (data.isComplete) {
      return false;
    }

    // Don't send if percentage is too high (user is almost done)
    if (data.percentage >= 90) {
      return false;
    }

    // Check cooldown period
    if (data.lastReminderSent) {
      const timeSinceLastReminder = Date.now() - data.lastReminderSent.getTime();
      if (timeSinceLastReminder < this.reminderCooldown) {
        return false;
      }
    }

    return true;
  }

  /**
   * Send profile completion reminder notification
   */
  private async sendProfileCompletionReminder(data: ProfileCompletionData): Promise<void> {
    try {
      const userId = await getUserId();
      if (!userId) return;

      // Create personalized reminder message
      const message = this.createReminderMessage(data);

      await notificationService.sendLocalNotification({
        type: NotificationType.PROFILE_COMPLETION,
        title: '📝 Complete Your Profile',
        body: message,
        data: {
          completion_percentage: data.percentage,
          missing_sections: data.missingSections,
          action: 'complete_profile'
        },
        priority: 'default'
      });

      // Update last reminder sent time
      await this.updateLastReminderSent(userId);


    } catch (error) {
      console.error('❌ Error sending profile completion reminder:', error);
    }
  }

  /**
   * Create personalized reminder message
   */
  private createReminderMessage(data: ProfileCompletionData): string {
    const { percentage, missingSections } = data;

    if (percentage < 30) {
      return `Your profile is only ${percentage}% complete. Add your basic information to get started!`;
    } else if (percentage < 60) {
      return `Your profile is ${percentage}% complete. Add more details to stand out to employers!`;
    } else if (percentage < 90) {
      return `You're ${percentage}% done! Just a few more sections to complete your profile.`;
    } else {
      return `You're almost there! Complete the remaining sections to have a perfect profile.`;
    }
  }

  /**
   * Get last reminder sent time from storage
   */
  private async getLastReminderSent(userId: number): Promise<Date | null> {
    try {
      const stored = await AsyncStorage.getItem(`profile_reminder_${userId}`);
      return stored ? new Date(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Update last reminder sent time in storage
   */
  private async updateLastReminderSent(userId: number): Promise<void> {
    try {
      await AsyncStorage.setItem(`profile_reminder_${userId}`, new Date().toISOString());
    } catch {
      // ignore
    }
  }

  /**
   * Get auth token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const { getAuthToken } = await import('./authStorage');
      return await getAuthToken();
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Manually trigger profile completion check (for testing)
   */
  async triggerProfileCompletionCheck(): Promise<void> {
    await this.checkProfileCompletion();
  }

  /**
   * Get last check time
   */
  getLastCheckTime(): Date | null {
    return this.lastCheckTime;
  }

  /**
   * Check if monitoring is active
   */
  isMonitoringActive(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Reset reminder cooldown (for testing)
   */
  async resetReminderCooldown(): Promise<void> {
    try {
      const userId = await getUserId();
      if (!userId) return;

      await AsyncStorage.removeItem(`profile_reminder_${userId}`);
    } catch (error) {
      console.error('❌ Error resetting reminder cooldown:', error);
    }
  }
}

// Create and export singleton instance
const profileCompletionNotificationService = new ProfileCompletionNotificationService();
export default profileCompletionNotificationService;

// Export commonly used methods for convenience
export const {
  startProfileCompletionMonitoring,
  stopProfileCompletionMonitoring,
  triggerProfileCompletionCheck,
  getLastCheckTime,
  isMonitoringActive,
  resetReminderCooldown,
} = profileCompletionNotificationService;
