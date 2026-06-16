import notificationService, { NotificationType } from './notificationService';
import { getUserId } from '../utils/userHelper';
import apiService from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ResumeUpdateData {
  lastUpdated: Date | null;
  profileViews: number;
  applicationCount: number;
  successRate: number;
  needsUpdate: boolean;
  suggestions: string[];
}

class ResumeUpdateNotificationService {
  private lastCheckTime: Date | null = null;
  private checkInterval: number = 7 * 24 * 60 * 60 * 1000; // 7 days
  private intervalId: NodeJS.Timeout | null = null;
  private reminderCooldown: number = 14 * 24 * 60 * 60 * 1000; // 14 days

  /**
   * Start monitoring for resume update suggestions
   */
  startResumeUpdateMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Check immediately
    this.checkResumeUpdateNeeds();

    // Then check every 7 days
    this.intervalId = setInterval(() => {
      this.checkResumeUpdateNeeds();
    }, this.checkInterval);

  }

  /**
   * Stop monitoring for resume updates
   */
  stopResumeUpdateMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check if resume needs updates and send suggestions
   */
  private async checkResumeUpdateNeeds(): Promise<void> {
    try {
      const userId = await getUserId();
      if (!userId) {
        return;
      }

      // Get resume update data
      const updateData = await this.getResumeUpdateData(userId);
      if (!updateData) {
        return;
      }

      // Check if suggestion should be sent
      if (this.shouldSendSuggestion(updateData)) {
        await this.sendResumeUpdateSuggestion(updateData);
      }

      this.lastCheckTime = new Date();

    } catch (error) {
      console.error('❌ Error checking resume update needs:', error);
    }
  }

  /**
   * Get resume update data and analysis
   */
  private async getResumeUpdateData(userId: number): Promise<ResumeUpdateData | null> {
    try {
      const token = await this.getAuthToken();
      if (!token) return null;

      // Get user profile and statistics
      const [profileResponse, statsResponse] = await Promise.all([
        apiService.get('/user/profile', token),
        apiService.get('/user/stats', token)
      ]);

      if (!profileResponse.success || !statsResponse.success) {
        return null;
      }

      const profile: any = profileResponse.data;
      const stats: any = statsResponse.data;

      // Analyze resume update needs
      const lastUpdated = await this.getLastResumeUpdate(userId);
      const profileViews = stats.profile_views || 0;
      const applicationCount = stats.applied_jobs_count || 0;
      const successRate = this.calculateSuccessRate(stats);
      const needsUpdate = this.analyzeUpdateNeeds(lastUpdated, profileViews, applicationCount, successRate);
      const suggestions = this.generateSuggestions(profile, lastUpdated, profileViews, successRate);

      return {
        lastUpdated,
        profileViews,
        applicationCount,
        successRate,
        needsUpdate,
        suggestions
      };

    } catch (error) {
      console.error('❌ Error getting resume update data:', error);
      return null;
    }
  }

  /**
   * Get last resume update time
   */
  private async getLastResumeUpdate(userId: number): Promise<Date | null> {
    try {
      const stored = await AsyncStorage.getItem(`resume_last_updated_${userId}`);
      return stored ? new Date(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Calculate application success rate
   */
  private calculateSuccessRate(stats: any): number {
    const totalApplications = stats.applied_jobs_count || 0;
    const shortlisted = stats.shortlisted_count || 0;
    const hired = stats.hired_count || 0;
    
    if (totalApplications === 0) return 0;
    return Math.round(((shortlisted + hired) / totalApplications) * 100);
  }

  /**
   * Analyze if resume needs updates
   */
  private analyzeUpdateNeeds(
    lastUpdated: Date | null,
    profileViews: number,
    applicationCount: number,
    successRate: number
  ): boolean {
    const now = new Date();
    
    // Never updated
    if (!lastUpdated) return true;
    
    // Not updated in 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    if (lastUpdated < threeMonthsAgo) return true;
    
    // Low success rate with many applications
    if (applicationCount > 10 && successRate < 20) return true;
    
    // High profile views but low applications
    if (profileViews > 50 && applicationCount < 5) return true;
    
    // Not updated in 1 month with low success rate
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    if (lastUpdated < oneMonthAgo && successRate < 30) return true;
    
    return false;
  }

  /**
   * Generate personalized suggestions
   */
  private generateSuggestions(
    profile: any,
    lastUpdated: Date | null,
    profileViews: number,
    successRate: number
  ): string[] {
    const suggestions: string[] = [];

    // Time-based suggestions
    if (!lastUpdated) {
      suggestions.push('Add your work experience and skills');
    } else {
      const daysSinceUpdate = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate > 90) {
        suggestions.push('Update your recent work experience');
      }
    }

    // Success rate based suggestions
    if (successRate < 20) {
      suggestions.push('Improve your skills section with relevant keywords');
      suggestions.push('Add a compelling professional summary');
    }

    // Profile views based suggestions
    if (profileViews > 50) {
      suggestions.push('Your profile gets many views - optimize it for better results');
    }

    // Profile completeness suggestions
    if (!profile.profile_image) {
      suggestions.push('Add a professional profile photo');
    }

    if (!profile.bio || profile.bio.length < 100) {
      suggestions.push('Write a detailed professional summary');
    }

    if (!profile.location) {
      suggestions.push('Add your location to help employers find you');
    }

    // Skills suggestions
    if (!profile.skills || profile.skills.length < 5) {
      suggestions.push('Add more relevant skills to your profile');
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Check if suggestion should be sent
   */
  private shouldSendSuggestion(data: ResumeUpdateData): boolean {
    // Don't send if resume doesn't need updates
    if (!data.needsUpdate) {
      return false;
    }

    // Check cooldown period
    const lastReminder = this.getLastReminderSent();
    if (lastReminder) {
      const timeSinceLastReminder = Date.now() - lastReminder.getTime();
      if (timeSinceLastReminder < this.reminderCooldown) {
        return false;
      }
    }

    return true;
  }

  /**
   * Send resume update suggestion notification
   */
  private async sendResumeUpdateSuggestion(data: ResumeUpdateData): Promise<void> {
    try {
      const userId = await getUserId();
      if (!userId) return;

      // Create personalized suggestion message
      const message = this.createSuggestionMessage(data);

      await notificationService.sendLocalNotification({
        type: NotificationType.RESUME_UPDATE,
        title: '📄 Update Your Resume',
        body: message,
        data: {
          suggestions: data.suggestions,
          success_rate: data.successRate,
          profile_views: data.profileViews,
          action: 'update_resume'
        },
        priority: 'default'
      });

      // Update last reminder sent time
      this.updateLastReminderSent();


    } catch (error) {
      console.error('❌ Error sending resume update suggestion:', error);
    }
  }

  /**
   * Create personalized suggestion message
   */
  private createSuggestionMessage(data: ResumeUpdateData): string {
    const { successRate, profileViews, suggestions } = data;

    if (successRate < 20 && profileViews > 20) {
      return `Your profile gets ${profileViews} views but low success rate. ${suggestions[0]} to improve your chances!`;
    } else if (successRate < 30) {
      return `Improve your resume to increase your success rate. ${suggestions[0]}!`;
    } else if (profileViews > 50) {
      return `Your profile is popular! ${suggestions[0]} to convert more views into applications.`;
    } else {
      return `Keep your resume fresh! ${suggestions[0]} to stay competitive.`;
    }
  }

  /**
   * Get last reminder sent time
   */
  private getLastReminderSent(): Date | null {
    return null; // checked asynchronously via AsyncStorage instead
  }

  /**
   * Update last reminder sent time
   */
  private updateLastReminderSent(): void {
    AsyncStorage.setItem('resume_reminder_sent', new Date().toISOString()).catch(() => {});
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
   * Manually trigger resume update check (for testing)
   */
  async triggerResumeUpdateCheck(): Promise<void> {
    await this.checkResumeUpdateNeeds();
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
  resetReminderCooldown(): void {
    AsyncStorage.removeItem('resume_reminder_sent').catch(() => {});
  }
}

// Create and export singleton instance
const resumeUpdateNotificationService = new ResumeUpdateNotificationService();
export default resumeUpdateNotificationService;

// Export commonly used methods for convenience
export const {
  startResumeUpdateMonitoring,
  stopResumeUpdateMonitoring,
  triggerResumeUpdateCheck,
  getLastCheckTime,
  isMonitoringActive,
  resetReminderCooldown,
} = resumeUpdateNotificationService;
