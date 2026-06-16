import notificationService, { NotificationType } from './notificationService';
import { getUserId } from '../utils/userHelper';
import apiService from './apiService';
import { getAuthToken as _getAuthToken } from './authStorage';

interface ApplicationStatusUpdate {
  application_id: number;
  job_id: number;
  job_title: string;
  company_name: string;
  old_status: string;
  new_status: string;
  updated_at: string;
  message?: string;
}

class ApplicationNotificationService {
  private lastCheckTime: Date | null = null;
  private checkInterval: number = 2 * 60 * 1000; // 2 minutes
  private intervalId: NodeJS.Timeout | null = null;
  private lastKnownStatuses: Map<number, string> = new Map();

  /**
   * Start monitoring for application status updates
   */
  startApplicationMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Check immediately
    this.checkForApplicationUpdates();

    // Then check every 2 minutes
    this.intervalId = setInterval(() => {
      this.checkForApplicationUpdates();
    }, this.checkInterval);

  }

  /**
   * Stop monitoring for application status updates
   */
  stopApplicationMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check for application status updates and send notifications
   */
  private async checkForApplicationUpdates(): Promise<void> {
    try {
      const userId = await getUserId();
      if (!userId) {
        return;
      }

      // Get current application statuses
      const currentStatuses = await this.getCurrentApplicationStatuses(userId);
      if (!currentStatuses || currentStatuses.length === 0) {
        // This is normal if user hasn't applied to any jobs yet
        return;
      }

      // Check for status changes
      const statusUpdates = this.detectStatusChanges(currentStatuses);
      
      if (statusUpdates.length > 0) {
        await this.sendApplicationStatusNotifications(statusUpdates);
      }

      // Update last known statuses
      this.updateLastKnownStatuses(currentStatuses);
      this.lastCheckTime = new Date();

    } catch (error) {
      console.error('❌ Error checking for application updates:', error);
    }
  }

  /**
   * Get current application statuses from API
   */
  private async getCurrentApplicationStatuses(userId: number): Promise<ApplicationStatusUpdate[] | null> {
    try {
      const token = await this.getAuthToken();
      if (!token) return null;

      const response = await apiService.get('/my-job-applications', token);
      if (!response.success || !response.data) {
        return null;
      }

      const applications = (response.data as any)?.jobs || response.data || [];
      
      // Ensure applications is an array before mapping
      if (!Array.isArray(applications)) {
        return [];
      }
      
      return applications.map((app: any) => ({
        application_id: app.id || app.application_id,
        job_id: app.job_id || app.id,
        job_title: app.job_title || app.title,
        company_name: app.company_name,
        old_status: this.lastKnownStatuses.get(app.id || app.application_id) || 'applied',
        new_status: app.application_status || app.status || 'applied',
        updated_at: app.updated_at || app.applied_at || new Date().toISOString(),
        message: app.status_message || app.message
      }));

    } catch (error) {
      console.error('❌ Error getting current application statuses:', error);
      return null;
    }
  }

  /**
   * Detect status changes by comparing with last known statuses
   */
  private detectStatusChanges(currentStatuses: ApplicationStatusUpdate[]): ApplicationStatusUpdate[] {
    return currentStatuses.filter(app => {
      const lastStatus = this.lastKnownStatuses.get(app.application_id);
      return lastStatus && lastStatus !== app.new_status;
    });
  }

  /**
   * Update last known statuses
   */
  private updateLastKnownStatuses(currentStatuses: ApplicationStatusUpdate[]): void {
    currentStatuses.forEach(app => {
      this.lastKnownStatuses.set(app.application_id, app.new_status);
    });
  }

  /**
   * Send application status update notifications
   */
  private async sendApplicationStatusNotifications(updates: ApplicationStatusUpdate[]): Promise<void> {
    try {
      for (const update of updates) {
        const notification = this.createStatusNotification(update);
        if (notification) {
          await notificationService.sendLocalNotification(notification);
        }
      }
    } catch (error) {
      console.error('❌ Error sending application status notifications:', error);
    }
  }

  /**
   * Create notification based on status update
   */
  private createStatusNotification(update: ApplicationStatusUpdate): any {
    const { job_title, company_name, new_status } = update;

    switch (new_status.toLowerCase()) {
      case 'shortlist':
      case 'shortlisted':
        return {
          type: NotificationType.APPLICATION_STATUS_UPDATE,
          title: '🎉 Application Shortlisted!',
          body: `Your application for "${job_title}" at ${company_name} has been shortlisted!`,
          data: {
            application_id: update.application_id,
            job_id: update.job_id,
            job_title,
            company_name,
            status: new_status,
            action: 'view_application'
          },
          priority: 'high'
        };

      case 'hired':
      case 'accepted':
        return {
          type: NotificationType.APPLICATION_STATUS_UPDATE,
          title: '🎊 Congratulations! You\'re Hired!',
          body: `Great news! You've been hired for "${job_title}" at ${company_name}!`,
          data: {
            application_id: update.application_id,
            job_id: update.job_id,
            job_title,
            company_name,
            status: new_status,
            action: 'view_application'
          },
          priority: 'max'
        };

      case 'rejected':
      case 'declined':
        return {
          type: NotificationType.APPLICATION_STATUS_UPDATE,
          title: 'Application Update',
          body: `Your application for "${job_title}" at ${company_name} was not selected this time.`,
          data: {
            application_id: update.application_id,
            job_id: update.job_id,
            job_title,
            company_name,
            status: new_status,
            action: 'view_application'
          },
          priority: 'default'
        };

      case 'interview':
      case 'interview_scheduled':
        return {
          type: NotificationType.APPLICATION_STATUS_UPDATE,
          title: '📅 Interview Scheduled!',
          body: `You have an interview scheduled for "${job_title}" at ${company_name}`,
          data: {
            application_id: update.application_id,
            job_id: update.job_id,
            job_title,
            company_name,
            status: new_status,
            action: 'view_application'
          },
          priority: 'high'
        };

      case 'reviewed':
      case 'under_review':
        return {
          type: NotificationType.APPLICATION_STATUS_UPDATE,
          title: '📋 Application Under Review',
          body: `Your application for "${job_title}" at ${company_name} is being reviewed`,
          data: {
            application_id: update.application_id,
            job_id: update.job_id,
            job_title,
            company_name,
            status: new_status,
            action: 'view_application'
          },
          priority: 'default'
        };

      default:
        // Generic status update
        return {
          type: NotificationType.APPLICATION_STATUS_UPDATE,
          title: 'Application Status Updated',
          body: `Your application for "${job_title}" at ${company_name} status changed to ${new_status}`,
          data: {
            application_id: update.application_id,
            job_id: update.job_id,
            job_title,
            company_name,
            status: new_status,
            action: 'view_application'
          },
          priority: 'default'
        };
    }
  }

  /**
   * Get auth token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await _getAuthToken();
    } catch {
      return null;
    }
  }

  /**
   * Manually trigger application status check (for testing)
   */
  async triggerApplicationStatusCheck(): Promise<void> {
    await this.checkForApplicationUpdates();
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
   * Clear last known statuses (useful for testing)
   */
  clearLastKnownStatuses(): void {
    this.lastKnownStatuses.clear();
  }
}

// Create and export singleton instance
const applicationNotificationService = new ApplicationNotificationService();
export default applicationNotificationService;

// Export commonly used methods for convenience
export const {
  startApplicationMonitoring,
  stopApplicationMonitoring,
  triggerApplicationStatusCheck,
  getLastCheckTime,
  isMonitoringActive,
  clearLastKnownStatuses,
} = applicationNotificationService;
