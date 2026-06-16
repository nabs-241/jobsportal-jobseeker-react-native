import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getAuthToken, getUserId } from '../utils/userHelper';
import apiService from './apiService';

// Intentionally disabled in release/testing builds to avoid noisy logs
const devLog = (..._args: any[]) => {};

// Notification configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Notification types
export enum NotificationType {
  NEW_JOB_MATCH = 'new_job_match',
  APPLICATION_STATUS_UPDATE = 'application_status_update',
  COMPANY_NEW_JOB = 'company_new_job',
  JOB_ALERT_MATCH = 'job_alert_match',
  PROFILE_COMPLETION = 'profile_completion',
  RESUME_UPDATE = 'resume_update',
  JOB_RECOMMENDATION = 'job_recommendation',
  APPLICATION_REMINDER = 'application_reminder',
  NEW_MESSAGE = 'new_message',
  PROFILE_VIEW = 'profile_view',
  SECURITY_ALERT = 'security_alert',
  APP_UPDATE = 'app_update',
  MAINTENANCE = 'maintenance',
  PREMIUM_JOB = 'premium_job',
  CAREER_INSIGHT = 'career_insight',
  LOCAL_JOB = 'local_job',
  URGENT_JOB = 'urgent_job',
  INACTIVITY_REMINDER = 'inactivity_reminder',
  SUCCESS_CELEBRATION = 'success_celebration',
}

// Notification data interface
export interface NotificationData {
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  badge?: number;
  priority?: 'min' | 'low' | 'default' | 'high' | 'max';
}

// User notification preferences
export interface NotificationPreferences {
  newJobMatches: boolean;
  applicationUpdates: boolean;
  companyJobs: boolean;
  jobAlerts: boolean;
  profileReminders: boolean;
  messages: boolean;
  securityAlerts: boolean;
  appUpdates: boolean;
  marketing: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

class NotificationService {
  private expoPushToken: string | null = null;
  private preferences: NotificationPreferences | null = null;

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    try {
      // Request permissions
      await this.requestPermissions();
      
      // Register for push notifications
      await this.registerForPushNotifications();
      
      // Load user preferences
      await this.loadPreferences();
      
      devLog('✅ Notification service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          devLog('❌ Notification permission denied');
          return false;
        }
        
        devLog('✅ Notification permissions granted');
        return true;
      } else {
        devLog('❌ Must use physical device for push notifications');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get Expo push token
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        devLog('❌ Must use physical device for push notifications');
        return null;
      }

      // Get Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.expoPushToken = token.data;
      devLog('📱 Expo push token:', this.expoPushToken);

      // Send token to backend
      await this.sendTokenToBackend(this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Send push token to backend
   */
  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      const authToken = await getAuthToken();
      const userId = await getUserId();
      
      if (!authToken || !userId) {
        devLog('❌ No auth token or user ID for sending push token');
        return;
      }

      const response = await apiService.post(
        '/update-push-token',
        {
          push_token: token,
          platform: Platform.OS,
          device_id: Device.osInternalBuildId || 'unknown',
        },
        authToken
      );

      if (response.success) {
        devLog('✅ Push token sent to backend');
      } else {
        devLog('❌ Failed to send push token to backend:', response.error);
      }
    } catch (error) {
      console.error('❌ Error sending push token to backend:', error);
    }
  }

  /**
   * Load user notification preferences
   */
  async loadPreferences(): Promise<void> {
    try {
      const authToken = await getAuthToken();
      const userId = await getUserId();
      
      if (!authToken || !userId) {
        devLog('❌ No auth token or user ID for loading preferences');
        return;
      }

      const response = await apiService.get('/notification-preferences', authToken);
      
      if (response.success && response.data) {
        const defaults = this.getDefaultPreferences();
        const data = response.data as any;
        this.preferences = {
          ...defaults,
          ...data,
          quietHours: { ...defaults.quietHours, ...(data.quietHours ?? {}) },
        };
        devLog('✅ Notification preferences loaded');
      } else {
        // Set default preferences
        this.preferences = this.getDefaultPreferences();
        devLog('✅ Using default notification preferences');
      }
    } catch (error) {
      console.error('❌ Error loading preferences:', error);
      this.preferences = this.getDefaultPreferences();
    }
  }

  /**
   * Get default notification preferences
   */
  private getDefaultPreferences(): NotificationPreferences {
    return {
      newJobMatches: true,
      applicationUpdates: true,
      companyJobs: true,
      jobAlerts: true,
      profileReminders: true,
      messages: true,
      securityAlerts: true,
      appUpdates: true,
      marketing: false,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
      },
    };
  }

  /**
   * Check if notification should be sent based on preferences and quiet hours
   */
  private shouldSendNotification(type: NotificationType): boolean {
    if (!this.preferences) return true;

    // Check if quiet hours are active
    if (this.preferences.quietHours?.enabled) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const startTime = this.parseTime(this.preferences.quietHours.start);
      const endTime = this.parseTime(this.preferences.quietHours.end);
      
      if (this.isInQuietHours(currentTime, startTime, endTime)) {
        return false;
      }
    }

    // Check notification type preferences
    switch (type) {
      case NotificationType.NEW_JOB_MATCH:
        return this.preferences.newJobMatches;
      case NotificationType.APPLICATION_STATUS_UPDATE:
        return this.preferences.applicationUpdates;
      case NotificationType.COMPANY_NEW_JOB:
        return this.preferences.companyJobs;
      case NotificationType.JOB_ALERT_MATCH:
        return this.preferences.jobAlerts;
      case NotificationType.PROFILE_COMPLETION:
      case NotificationType.RESUME_UPDATE:
        return this.preferences.profileReminders;
      case NotificationType.NEW_MESSAGE:
        return this.preferences.messages;
      case NotificationType.SECURITY_ALERT:
        return this.preferences.securityAlerts;
      case NotificationType.APP_UPDATE:
        return this.preferences.appUpdates;
      case NotificationType.PREMIUM_JOB:
      case NotificationType.CAREER_INSIGHT:
        return this.preferences.marketing;
      default:
        return true;
    }
  }

  /**
   * Parse time string (HH:MM) to minutes
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(currentTime: number, startTime: number, endTime: number): boolean {
    if (startTime <= endTime) {
      // Same-day window (e.g., 08:00–22:00)
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Overnight window (e.g., 22:00–08:00 next day)
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(notificationData: NotificationData): Promise<void> {
    try {
      if (!this.shouldSendNotification(notificationData.type)) {
        devLog('🔇 Notification blocked by preferences or quiet hours');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          sound: notificationData.sound !== false,
          badge: notificationData.badge,
          priority: notificationData.priority || 'default',
        },
        trigger: null, // Send immediately
      });

      devLog('📱 Local notification sent:', notificationData.title);
    } catch (error) {
      console.error('❌ Error sending local notification:', error);
    }
  }

  /**
   * Send push notification via backend
   */
  async sendPushNotification(notificationData: NotificationData): Promise<void> {
    try {
      if (!this.shouldSendNotification(notificationData.type)) {
        devLog('🔇 Push notification blocked by preferences or quiet hours');
        return;
      }

      const authToken = await getAuthToken();
      const userId = await getUserId();
      
      if (!authToken || !userId) {
        devLog('❌ No auth token or user ID for sending push notification');
        return;
      }

      const response = await apiService.post(
        '/send-push-notification',
        {
          type: notificationData.type,
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          sound: notificationData.sound !== false,
          badge: notificationData.badge,
          priority: notificationData.priority || 'default',
        },
        authToken
      );

      if (response.success) {
      devLog('📱 Push notification sent via backend');
      } else {
        devLog('❌ Failed to send push notification:', response.error);
      }
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
    }
  }

  /**
   * Schedule notification for later
   */
  async scheduleNotification(
    notificationData: NotificationData,
    trigger: Notifications.NotificationTriggerInput
  ): Promise<void> {
    try {
      if (!this.shouldSendNotification(notificationData.type)) {
        devLog('🔇 Scheduled notification blocked by preferences');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          sound: notificationData.sound !== false,
          badge: notificationData.badge,
          priority: notificationData.priority || 'default',
        },
        trigger,
      });

      devLog('⏰ Notification scheduled:', notificationData.title);
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      devLog('🗑️ All scheduled notifications cancelled');
    } catch (error) {
      console.error('❌ Error cancelling notifications:', error);
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(): Promise<Notifications.Notification[]> {
    try {
      return await Notifications.getPresentedNotificationsAsync();
    } catch (error) {
      console.error('❌ Error getting notification history:', error);
      return [];
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      const authToken = await getAuthToken();
      const userId = await getUserId();
      
      if (!authToken || !userId) {
        devLog('❌ No auth token or user ID for updating preferences');
        return;
      }

      const response = await apiService.post(
        '/update-notification-preferences',
        preferences,
        authToken
      );

      if (response.success) {
        this.preferences = { ...this.preferences, ...preferences };
        devLog('✅ Notification preferences updated');
      } else {
        devLog('❌ Failed to update preferences:', response.error);
      }
    } catch (error) {
      console.error('❌ Error updating preferences:', error);
    }
  }

  /**
   * Get current preferences
   */
  getPreferences(): NotificationPreferences | null {
    return this.preferences;
  }

  /**
   * Get Expo push token
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}

// Create and export singleton instance
const notificationService = new NotificationService();
export default notificationService;

// Export commonly used methods for convenience
export const {
  initialize,
  sendLocalNotification,
  sendPushNotification,
  scheduleNotification,
  updatePreferences,
  getPreferences,
  getExpoPushToken,
} = notificationService;
