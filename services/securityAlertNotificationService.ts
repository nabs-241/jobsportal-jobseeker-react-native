import notificationService, { NotificationType } from './notificationService';
import { getUserId } from '../utils/userHelper';
import apiService from './apiService';

interface SecurityEvent {
  type: 'login' | 'password_change' | 'profile_update' | 'suspicious_activity' | 'new_device';
  timestamp: Date;
  location?: string;
  device?: string;
  ip_address?: string;
  details: string;
}

class SecurityAlertNotificationService {
  private lastCheckTime: Date | null = null;
  private checkInterval: number = 5 * 60 * 1000; // 5 minutes
  private intervalId: NodeJS.Timeout | null = null;
  private lastKnownEvents: Set<string> = new Set();

  /**
   * Start monitoring for security events
   */
  startSecurityMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Check immediately
    this.checkForSecurityEvents();

    // Then check every 5 minutes
    this.intervalId = setInterval(() => {
      this.checkForSecurityEvents();
    }, this.checkInterval);

  }

  /**
   * Stop monitoring for security events
   */
  stopSecurityMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check for security events and send alerts
   */
  private async checkForSecurityEvents(): Promise<void> {
    try {
      const userId = await getUserId();
      if (!userId) {
        return;
      }

      // Get recent security events
      const events = await this.getRecentSecurityEvents(userId);
      if (!events || events.length === 0) {
        return;
      }

      // Filter for new events
      const newEvents = events.filter(event => 
        !this.lastKnownEvents.has(this.getEventId(event))
      );

      if (newEvents.length > 0) {
        await this.sendSecurityAlerts(newEvents);
        
        // Update known events
        newEvents.forEach(event => {
          this.lastKnownEvents.add(this.getEventId(event));
        });
      }

      this.lastCheckTime = new Date();

    } catch (error) {
      console.error('❌ Error checking for security events:', error);
    }
  }

  /**
   * Get recent security events from API
   */
  private async getRecentSecurityEvents(userId: number): Promise<SecurityEvent[] | null> {
    try {
      const token = await this.getAuthToken();
      if (!token) return null;

      const response = await apiService.get('/security-events', token);
      if (!response.success || !response.data) {
        return null;
      }

      const events = (response.data as any)?.events || response.data || [];
      
      return events.map((event: any) => ({
        type: event.type || 'suspicious_activity',
        timestamp: new Date(event.timestamp || event.created_at),
        location: event.location,
        device: event.device,
        ip_address: event.ip_address,
        details: event.details || event.description
      }));

    } catch (error) {
      console.error('❌ Error getting security events:', error);
      return null;
    }
  }

  /**
   * Generate unique event ID
   */
  private getEventId(event: SecurityEvent): string {
    return `${event.type}_${event.timestamp.getTime()}_${event.ip_address || 'unknown'}`;
  }

  /**
   * Send security alert notifications
   */
  private async sendSecurityAlerts(events: SecurityEvent[]): Promise<void> {
    try {
      for (const event of events) {
        const alert = this.createSecurityAlert(event);
        if (alert) {
          await notificationService.sendLocalNotification(alert);
        }
      }
    } catch (error) {
      console.error('❌ Error sending security alerts:', error);
    }
  }

  /**
   * Create security alert notification
   */
  private createSecurityAlert(event: SecurityEvent): any {
    switch (event.type) {
      case 'login':
        return {
          type: NotificationType.SECURITY_ALERT,
          title: '🔐 New Login Detected',
          body: `Your account was accessed from ${event.location || 'unknown location'}`,
          data: {
            event_type: event.type,
            timestamp: event.timestamp.toISOString(),
            location: event.location,
            device: event.device,
            ip_address: event.ip_address,
            action: 'view_security'
          },
          priority: 'high'
        };

      case 'password_change':
        return {
          type: NotificationType.SECURITY_ALERT,
          title: '🔑 Password Changed',
          body: 'Your password was successfully changed',
          data: {
            event_type: event.type,
            timestamp: event.timestamp.toISOString(),
            action: 'view_security'
          },
          priority: 'default'
        };

      case 'profile_update':
        return {
          type: NotificationType.SECURITY_ALERT,
          title: '👤 Profile Updated',
          body: 'Your profile information was updated',
          data: {
            event_type: event.type,
            timestamp: event.timestamp.toISOString(),
            details: event.details,
            action: 'view_profile'
          },
          priority: 'low'
        };

      case 'suspicious_activity':
        return {
          type: NotificationType.SECURITY_ALERT,
          title: '⚠️ Suspicious Activity Detected',
          body: event.details || 'Unusual activity detected on your account',
          data: {
            event_type: event.type,
            timestamp: event.timestamp.toISOString(),
            details: event.details,
            action: 'view_security'
          },
          priority: 'max'
        };

      case 'new_device':
        return {
          type: NotificationType.SECURITY_ALERT,
          title: '📱 New Device Detected',
          body: `A new device accessed your account from ${event.location || 'unknown location'}`,
          data: {
            event_type: event.type,
            timestamp: event.timestamp.toISOString(),
            location: event.location,
            device: event.device,
            ip_address: event.ip_address,
            action: 'view_security'
          },
          priority: 'high'
        };

      default:
        return {
          type: NotificationType.SECURITY_ALERT,
          title: '🔒 Security Alert',
          body: event.details || 'A security event occurred on your account',
          data: {
            event_type: event.type,
            timestamp: event.timestamp.toISOString(),
            details: event.details,
            action: 'view_security'
          },
          priority: 'default'
        };
    }
  }

  /**
   * Manually trigger security event (for testing)
   */
  async triggerSecurityEvent(type: SecurityEvent['type'], details: string): Promise<void> {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const token = await this.getAuthToken();
      if (!token) return;

      // Create a test security event
      const testEvent: SecurityEvent = {
        type,
        timestamp: new Date(),
        location: 'Test Location',
        device: 'Test Device',
        ip_address: '127.0.0.1',
        details
      };

      // Send to backend
      await apiService.post('/security-events', {
        type: testEvent.type,
        timestamp: testEvent.timestamp.toISOString(),
        location: testEvent.location,
        device: testEvent.device,
        ip_address: testEvent.ip_address,
        details: testEvent.details
      }, token);


    } catch (error) {
      console.error('❌ Error triggering security event:', error);
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
   * Manually trigger security check (for testing)
   */
  async triggerSecurityCheck(): Promise<void> {
    await this.checkForSecurityEvents();
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
   * Clear known events (for testing)
   */
  clearKnownEvents(): void {
    this.lastKnownEvents.clear();
  }
}

// Create and export singleton instance
const securityAlertNotificationService = new SecurityAlertNotificationService();
export default securityAlertNotificationService;

// Export commonly used methods for convenience
export const {
  startSecurityMonitoring,
  stopSecurityMonitoring,
  triggerSecurityEvent,
  triggerSecurityCheck,
  getLastCheckTime,
  isMonitoringActive,
  clearKnownEvents,
} = securityAlertNotificationService;
