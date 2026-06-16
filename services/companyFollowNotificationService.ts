import notificationService, { NotificationType } from './notificationService';
import { getUserId } from '../utils/userHelper';
import apiService from './apiService';

interface FollowedCompany {
  id: number;
  name: string;
  slug: string;
  logo?: string;
  industry: string;
  location: string;
}

interface CompanyJob {
  id: number;
  title: string;
  company_name: string;
  company_slug: string;
  location: string;
  job_type: string;
  salary_range?: string;
  slug: string;
  created_at: string;
}

class CompanyFollowNotificationService {
  private lastCheckTime: Date | null = null;
  private checkInterval: number = 10 * 60 * 1000; // 10 minutes
  private intervalId: NodeJS.Timeout | null = null;
  private lastKnownJobIds: Map<number, Set<number>> = new Map(); // company_id -> set of job_ids

  /**
   * Start monitoring for new jobs from followed companies
   */
  startCompanyJobMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Check immediately
    this.checkForCompanyJobs();

    // Then check every 10 minutes
    this.intervalId = setInterval(() => {
      this.checkForCompanyJobs();
    }, this.checkInterval);

  }

  /**
   * Stop monitoring for company jobs
   */
  stopCompanyJobMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check for new jobs from followed companies and send notifications
   */
  private async checkForCompanyJobs(): Promise<void> {
    try {
      const userId = await getUserId();
      if (!userId) {
        return;
      }

      // Get followed companies
      const followedCompanies = await this.getFollowedCompanies(userId);
      if (!followedCompanies || followedCompanies.length === 0) {
        // This is normal if user hasn't followed any companies yet
        return;
      }

      // Check for new jobs from each followed company
      for (const company of followedCompanies) {
        await this.checkCompanyNewJobs(company);
      }

      this.lastCheckTime = new Date();

    } catch (error) {
      console.error('❌ Error checking for company jobs:', error);
    }
  }

  /**
   * Get user's followed companies
   */
  private async getFollowedCompanies(userId: number): Promise<FollowedCompany[] | null> {
    try {
      const token = await this.getAuthToken();
      if (!token) return null;

      const response = await apiService.get('/my-followings', token);
      if (!response.success || !response.data) {
        return null;
      }

      const followings = (response.data as any)?.followings || response.data || [];
      
      // Ensure followings is an array before mapping
      if (!Array.isArray(followings)) {
        return [];
      }
      
      return followings.map((company: any) => ({
        id: company.id,
        name: company.name,
        slug: company.slug,
        logo: company.logo,
        industry: company.industry || 'Unknown',
        location: company.location || 'Unknown'
      }));

    } catch (error) {
      console.error('❌ Error getting followed companies:', error);
      return null;
    }
  }

  /**
   * Check for new jobs from a specific company
   */
  private async checkCompanyNewJobs(company: FollowedCompany): Promise<void> {
    try {
      const token = await this.getAuthToken();
      if (!token) return;

      // Get jobs from this company
      const response = await apiService.get(`/companies/${company.slug}/jobs`, token);
      if (!response.success || !response.data) {
        return;
      }

      const jobs = (response.data as any)?.jobs || response.data || [];
      
      // Filter for recent jobs (last 24 hours)
      const recentJobs = jobs.filter((job: any) => {
        const jobDate = new Date(job.created_at || job.posted_at);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return jobDate >= yesterday;
      });

      if (recentJobs.length === 0) {
        return;
      }

      // Get last known job IDs for this company
      const lastKnownJobIds = this.lastKnownJobIds.get(company.id) || new Set();
      
      // Find new jobs
      const newJobs = recentJobs.filter((job: any) => 
        !lastKnownJobIds.has(job.id)
      );

      if (newJobs.length > 0) {
        await this.sendCompanyJobNotifications(company, newJobs);
        
        // Update last known job IDs
        const newJobIds = new Set([...lastKnownJobIds, ...newJobs.map((job: any) => job.id)]);
        this.lastKnownJobIds.set(company.id, newJobIds);
      }

    } catch (error) {
      console.error(`❌ Error checking jobs for company ${company.name}:`, error);
    }
  }

  /**
   * Send notifications for new company jobs
   */
  private async sendCompanyJobNotifications(company: FollowedCompany, jobs: CompanyJob[]): Promise<void> {
    try {
      if (jobs.length === 0) return;

      if (jobs.length === 1) {
        // Single new job
        const job = jobs[0];
        await notificationService.sendLocalNotification({
          type: NotificationType.COMPANY_NEW_JOB,
          title: '🏢 New Job from Followed Company!',
          body: `${company.name} posted: ${job.title}`,
          data: {
            company_id: company.id,
            company_name: company.name,
            company_slug: company.slug,
            job_id: job.id,
            job_title: job.title,
            job_slug: job.slug,
            action: 'view_job'
          },
          priority: 'high'
        });
      } else {
        // Multiple new jobs
        await notificationService.sendLocalNotification({
          type: NotificationType.COMPANY_NEW_JOB,
          title: '🏢 Multiple New Jobs!',
          body: `${company.name} posted ${jobs.length} new jobs`,
          data: {
            company_id: company.id,
            company_name: company.name,
            company_slug: company.slug,
            job_count: jobs.length,
            action: 'view_company_jobs'
          },
          priority: 'high'
        });

        // Send individual notifications for each job (optional)
        for (const job of jobs.slice(0, 3)) { // Limit to first 3 jobs
          await notificationService.sendLocalNotification({
            type: NotificationType.COMPANY_NEW_JOB,
            title: '🏢 New Job Available',
            body: `${job.title} at ${company.name}`,
            data: {
              company_id: company.id,
              company_name: company.name,
              company_slug: company.slug,
              job_id: job.id,
              job_title: job.title,
              job_slug: job.slug,
              action: 'view_job'
            },
            priority: 'default'
          });
        }
      }

    } catch (error) {
      console.error('❌ Error sending company job notifications:', error);
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
   * Manually trigger company job check (for testing)
   */
  async triggerCompanyJobCheck(): Promise<void> {
    await this.checkForCompanyJobs();
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
   * Clear last known job IDs (useful for testing)
   */
  clearLastKnownJobIds(): void {
    this.lastKnownJobIds.clear();
  }

  /**
   * Get followed companies count
   */
  async getFollowedCompaniesCount(): Promise<number> {
    try {
      const userId = await getUserId();
      if (!userId) return 0;

      const companies = await this.getFollowedCompanies(userId);
      return companies ? companies.length : 0;
    } catch (error) {
      console.error('❌ Error getting followed companies count:', error);
      return 0;
    }
  }
}

// Create and export singleton instance
const companyFollowNotificationService = new CompanyFollowNotificationService();
export default companyFollowNotificationService;

// Export commonly used methods for convenience
export const {
  startCompanyJobMonitoring,
  stopCompanyJobMonitoring,
  triggerCompanyJobCheck,
  getLastCheckTime,
  isMonitoringActive,
  clearLastKnownJobIds,
  getFollowedCompaniesCount,
} = companyFollowNotificationService;
