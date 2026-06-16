import notificationService, { NotificationType } from './notificationService';
import { getUserId } from '../utils/userHelper';
import apiService from './apiService';

interface JobMatch {
  id: number;
  title: string;
  company_name: string;
  location: string;
  job_type: string;
  salary_range?: string;
  slug: string;
}

interface JobMatchCriteria {
  skills?: string[];
  location?: string;
  job_type?: string;
  experience_level?: string;
  salary_min?: number;
  salary_max?: number;
}

class JobMatchNotificationService {
  private lastCheckTime: Date | null = null;
  private checkInterval: number = 5 * 60 * 1000; // 5 minutes
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start monitoring for new job matches
   */
  startJobMatchMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Check immediately
    this.checkForNewJobMatches();

    // Then check every 5 minutes
    this.intervalId = setInterval(() => {
      this.checkForNewJobMatches();
    }, this.checkInterval);

  }

  /**
   * Stop monitoring for new job matches
   */
  stopJobMatchMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check for new job matches and send notifications
   */
  private async checkForNewJobMatches(): Promise<void> {
    try {
      const userId = await getUserId();
      if (!userId) {
        return;
      }

      // Get user's job match criteria
      const criteria = await this.getUserJobMatchCriteria(userId);
      if (!criteria) {
        return;
      }

      // Get new job matches since last check
      const newMatches = await this.getNewJobMatches(userId, criteria);
      
      if (newMatches.length > 0) {
        await this.sendJobMatchNotifications(newMatches);
      }

      // Update last check time
      this.lastCheckTime = new Date();

    } catch (error) {
      console.error('❌ Error checking for job matches:', error);
    }
  }

  /**
   * Get user's job match criteria from their profile and preferences
   */
  private async getUserJobMatchCriteria(userId: number): Promise<JobMatchCriteria | null> {
    try {
      const token = await this.getAuthToken();
      if (!token) return null;

      // Get user profile data
      const response = await apiService.get(`/user/profile`, token);
      if (!response.success || !response.data) {
        return null;
      }

      const profile: any = response.data;
      const criteria: JobMatchCriteria = {};

      // Extract skills from profile
      if (profile.skills && Array.isArray(profile.skills)) {
        criteria.skills = profile.skills.map((skill: any) => skill.name || skill);
      }

      // Extract location preference
      if (profile.location) {
        criteria.location = profile.location;
      }

      // Extract experience level
      if (profile.experience_level) {
        criteria.experience_level = profile.experience_level;
      }

      // Extract salary expectations
      if (profile.expected_salary_min) {
        criteria.salary_min = parseInt(profile.expected_salary_min);
      }
      if (profile.expected_salary_max) {
        criteria.salary_max = parseInt(profile.expected_salary_max);
      }

      // Default job type preference
      criteria.job_type = 'full-time'; // Default preference

      return criteria;

    } catch (error) {
      console.error('❌ Error getting user job match criteria:', error);
      return null;
    }
  }

  /**
   * Get new job matches based on criteria
   */
  private async getNewJobMatches(userId: number, criteria: JobMatchCriteria): Promise<JobMatch[]> {
    try {
      const token = await this.getAuthToken();
      if (!token) return [];

      // Build search parameters
      const searchParams = new URLSearchParams();
      
      if (criteria.skills && criteria.skills.length > 0) {
        searchParams.append('skills', criteria.skills.join(','));
      }
      if (criteria.location) {
        searchParams.append('location', criteria.location);
      }
      if (criteria.job_type) {
        searchParams.append('job_type', criteria.job_type);
      }
      if (criteria.experience_level) {
        searchParams.append('experience_level', criteria.experience_level);
      }
      if (criteria.salary_min) {
        searchParams.append('salary_min', criteria.salary_min.toString());
      }
      if (criteria.salary_max) {
        searchParams.append('salary_max', criteria.salary_max.toString());
      }

      // Add time filter for new jobs (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      searchParams.append('created_after', yesterday.toISOString());

      // Search for matching jobs
      const response = await apiService.get(`/jobs?${searchParams.toString()}`, token);
      
      if (!response.success || !response.data) {
        return [];
      }

      const jobs = (response.data as any)?.jobs || response.data || [];

      // Filter out jobs user has already applied to
      const appliedJobIds = await this.getUserAppliedJobIds(userId);
      
      return jobs
        .filter((job: any) => !appliedJobIds.includes(job.id))
        .map((job: any) => ({
          id: job.id,
          title: job.title,
          company_name: job.company_name,
          location: `${job.city || ''} ${job.country || ''}`.trim(),
          job_type: job.job_type,
          salary_range: job.formatted_salary || job.salary_range,
          slug: job.slug,
        }));

    } catch (error) {
      console.error('❌ Error getting new job matches:', error);
      return [];
    }
  }

  /**
   * Get list of job IDs user has already applied to
   */
  private async getUserAppliedJobIds(userId: number): Promise<number[]> {
    try {
      const token = await this.getAuthToken();
      if (!token) return [];

      const response = await apiService.get('/my-job-applications', token);
      if (!response.success || !response.data) {
        return [];
      }

      const applications = (response.data as any)?.jobs || response.data || [];
      return (applications as any[]).map((app: any) => app.id || app.job_id).filter(Boolean);

    } catch (error) {
      console.error('❌ Error getting applied job IDs:', error);
      return [];
    }
  }

  /**
   * Send job match notifications
   */
  private async sendJobMatchNotifications(matches: JobMatch[]): Promise<void> {
    try {
      if (matches.length === 0) return;

      // Group matches by company for better notifications
      const matchesByCompany = this.groupMatchesByCompany(matches);

      // Send notifications for each company
      for (const [companyName, companyMatches] of Object.entries(matchesByCompany)) {
        if (companyMatches.length === 1) {
          // Single job match
          const job = companyMatches[0];
          await notificationService.sendLocalNotification({
            type: NotificationType.NEW_JOB_MATCH,
            title: '🎯 New Job Match!',
            body: `${job.title} at ${job.company_name} - ${job.location}`,
            data: {
              job_id: job.id,
              job_slug: job.slug,
              company_name: job.company_name,
              action: 'view_job'
            },
            priority: 'high'
          });
        } else {
          // Multiple job matches from same company
          await notificationService.sendLocalNotification({
            type: NotificationType.NEW_JOB_MATCH,
            title: '🎯 New Job Matches!',
            body: `${companyMatches.length} new jobs at ${companyName}`,
            data: {
              company_name: companyName,
              job_count: companyMatches.length,
              action: 'view_company_jobs'
            },
            priority: 'high'
          });
        }
      }

      // Send summary notification if there are many matches
      if (matches.length >= 5) {
        await notificationService.sendLocalNotification({
          type: NotificationType.NEW_JOB_MATCH,
          title: '🎯 Multiple Job Matches!',
          body: `You have ${matches.length} new job matches. Check them out!`,
          data: {
            total_matches: matches.length,
            action: 'view_job_list'
          },
          priority: 'default'
        });
      }

    } catch (error) {
      console.error('❌ Error sending job match notifications:', error);
    }
  }

  /**
   * Group job matches by company
   */
  private groupMatchesByCompany(matches: JobMatch[]): Record<string, JobMatch[]> {
    return matches.reduce((groups, job) => {
      const company = job.company_name;
      if (!groups[company]) {
        groups[company] = [];
      }
      groups[company].push(job);
      return groups;
    }, {} as Record<string, JobMatch[]>);
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
   * Manually trigger job match check (for testing)
   */
  async triggerJobMatchCheck(): Promise<void> {
    await this.checkForNewJobMatches();
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
}

// Create and export singleton instance
const jobMatchNotificationService = new JobMatchNotificationService();
export default jobMatchNotificationService;

// Export commonly used methods for convenience
export const {
  startJobMatchMonitoring,
  stopJobMatchMonitoring,
  triggerJobMatchCheck,
  getLastCheckTime,
  isMonitoringActive,
} = jobMatchNotificationService;
