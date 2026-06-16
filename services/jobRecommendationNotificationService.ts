import notificationService, { NotificationType } from './notificationService';
import { getUserId } from '../utils/userHelper';
import apiService from './apiService';

interface JobRecommendation {
  id: number;
  title: string;
  company_name: string;
  location: string;
  job_type: string;
  salary_range?: string;
  slug: string;
  match_score: number;
  reason: string;
}

interface RecommendationCriteria {
  skills: string[];
  experience_level: string;
  location: string;
  job_type: string;
  salary_range: { min: number; max: number };
  industry_preferences: string[];
}

class JobRecommendationNotificationService {
  private lastCheckTime: Date | null = null;
  private checkInterval: number = 2 * 24 * 60 * 60 * 1000; // 2 days
  private intervalId: NodeJS.Timeout | null = null;
  private lastRecommendationSent: Date | null = null;
  private recommendationCooldown: number = 3 * 24 * 60 * 60 * 1000; // 3 days

  /**
   * Start monitoring for job recommendations
   */
  startJobRecommendationMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Check immediately
    this.checkForJobRecommendations();

    // Then check every 2 days
    this.intervalId = setInterval(() => {
      this.checkForJobRecommendations();
    }, this.checkInterval);

  }

  /**
   * Stop monitoring for job recommendations
   */
  stopJobRecommendationMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check for job recommendations and send notifications
   */
  private async checkForJobRecommendations(): Promise<void> {
    try {
      const userId = await getUserId();
      if (!userId) {
        return;
      }

      // Check if recommendation should be sent
      if (!this.shouldSendRecommendation()) {
        return;
      }

      // Get user's recommendation criteria
      const criteria = await this.getRecommendationCriteria(userId);
      if (!criteria) {
        return;
      }

      // Get personalized job recommendations
      const recommendations = await this.getJobRecommendations(userId, criteria);
      
      if (recommendations.length > 0) {
        await this.sendJobRecommendationNotifications(recommendations);
      }

      this.lastCheckTime = new Date();

    } catch (error) {
      console.error('❌ Error checking for job recommendations:', error);
    }
  }

  /**
   * Get user's recommendation criteria
   */
  private async getRecommendationCriteria(userId: number): Promise<RecommendationCriteria | null> {
    try {
      const token = await this.getAuthToken();
      if (!token) return null;

      // Get user profile data
      const response = await apiService.get('/user/profile', token);
      if (!response.success || !response.data) {
        return null;
      }

      const profile: any = response.data;

      // Extract skills
      const skills = profile.skills ?
        profile.skills.map((skill: any) => skill.name || skill) :
        [];

      // Extract experience level
      const experienceLevel = this.determineExperienceLevel(profile.experience);

      // Extract location preference
      const location = profile.location || '';

      // Extract job type preference
      const jobType = profile.preferred_job_type || 'full-time';

      // Extract salary expectations
      const salaryRange = {
        min: parseInt(profile.expected_salary_min) || 0,
        max: parseInt(profile.expected_salary_max) || 100000
      };

      // Extract industry preferences
      const industryPreferences = profile.industry_preferences || [];

      return {
        skills,
        experience_level: experienceLevel,
        location,
        job_type: jobType,
        salary_range: salaryRange,
        industry_preferences: industryPreferences
      };

    } catch (error) {
      console.error('❌ Error getting recommendation criteria:', error);
      return null;
    }
  }

  /**
   * Determine experience level from profile
   */
  private determineExperienceLevel(experience: any[]): string {
    if (!experience || experience.length === 0) {
      return 'entry';
    }

    const totalYears = experience.reduce((total, exp) => {
      const startDate = new Date(exp.start_date);
      const endDate = exp.end_date ? new Date(exp.end_date) : new Date();
      const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return total + years;
    }, 0);

    if (totalYears < 2) return 'entry';
    if (totalYears < 5) return 'mid';
    if (totalYears < 10) return 'senior';
    return 'executive';
  }

  /**
   * Get personalized job recommendations
   */
  private async getJobRecommendations(
    userId: number, 
    criteria: RecommendationCriteria
  ): Promise<JobRecommendation[]> {
    try {
      const token = await this.getAuthToken();
      if (!token) return [];

      // Build search parameters for recommendations
      const searchParams = new URLSearchParams();
      
      if (criteria.skills.length > 0) {
        searchParams.append('skills', criteria.skills.slice(0, 5).join(',')); // Top 5 skills
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
      if (criteria.salary_range.min > 0) {
        searchParams.append('salary_min', criteria.salary_range.min.toString());
      }
      if (criteria.salary_range.max < 100000) {
        searchParams.append('salary_max', criteria.salary_range.max.toString());
      }

      // Add recommendation-specific parameters
      searchParams.append('recommended', 'true');
      searchParams.append('limit', '5'); // Limit to 5 recommendations

      // Search for recommended jobs
      const response = await apiService.get(`/jobs/recommendations?${searchParams.toString()}`, token);
      
      if (!response.success || !response.data) {
        return [];
      }

      const jobs = (response.data as any)?.jobs || response.data || [];
      
      // Filter out jobs user has already applied to
      const appliedJobIds = await this.getUserAppliedJobIds(userId);
      
      return jobs
        .filter((job: any) => !appliedJobIds.includes(job.id))
        .slice(0, 3) // Limit to 3 recommendations
        .map((job: any) => ({
          id: job.id,
          title: job.title,
          company_name: job.company_name,
          location: `${job.city || ''} ${job.country || ''}`.trim(),
          job_type: job.job_type,
          salary_range: job.formatted_salary || job.salary_range,
          slug: job.slug,
          match_score: this.calculateMatchScore(job, criteria),
          reason: this.generateRecommendationReason(job, criteria)
        }));

    } catch (error) {
      console.error('❌ Error getting job recommendations:', error);
      return [];
    }
  }

  /**
   * Calculate match score for a job
   */
  private calculateMatchScore(job: any, criteria: RecommendationCriteria): number {
    let score = 0;

    // Skills match (40% weight)
    if (criteria.skills.length > 0 && job.required_skills) {
      const jobSkills = job.required_skills.toLowerCase();
      const matchingSkills = criteria.skills.filter(skill => 
        jobSkills.includes(skill.toLowerCase())
      ).length;
      score += (matchingSkills / criteria.skills.length) * 40;
    }

    // Location match (20% weight)
    if (criteria.location && job.location) {
      if (job.location.toLowerCase().includes(criteria.location.toLowerCase())) {
        score += 20;
      }
    }

    // Job type match (15% weight)
    if (criteria.job_type === job.job_type) {
      score += 15;
    }

    // Experience level match (15% weight)
    if (criteria.experience_level === job.experience_level) {
      score += 15;
    }

    // Salary range match (10% weight)
    if (job.salary_min && criteria.salary_range.min) {
      if (job.salary_min >= criteria.salary_range.min && 
          job.salary_min <= criteria.salary_range.max) {
        score += 10;
      }
    }

    return Math.round(score);
  }

  /**
   * Generate recommendation reason
   */
  private generateRecommendationReason(job: any, criteria: RecommendationCriteria): string {
    const reasons = [];

    if (criteria.skills.length > 0 && job.required_skills) {
      const matchingSkills = criteria.skills.filter(skill => 
        job.required_skills.toLowerCase().includes(skill.toLowerCase())
      );
      if (matchingSkills.length > 0) {
        reasons.push(`matches your skills: ${matchingSkills.slice(0, 2).join(', ')}`);
      }
    }

    if (criteria.location && job.location) {
      if (job.location.toLowerCase().includes(criteria.location.toLowerCase())) {
        reasons.push('in your preferred location');
      }
    }

    if (criteria.job_type === job.job_type) {
      reasons.push(`matches your preferred job type (${job.job_type})`);
    }

    if (reasons.length === 0) {
      return 'matches your profile';
    }

    return reasons.join(' and ');
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
   * Send job recommendation notifications
   */
  private async sendJobRecommendationNotifications(recommendations: JobRecommendation[]): Promise<void> {
    try {
      if (recommendations.length === 0) return;

      // Send notification for top recommendation
      const topRecommendation = recommendations[0];
      await notificationService.sendLocalNotification({
        type: NotificationType.JOB_RECOMMENDATION,
        title: '💡 Perfect Job Match!',
        body: `${topRecommendation.title} at ${topRecommendation.company_name} - ${topRecommendation.reason}`,
        data: {
          job_id: topRecommendation.id,
          job_slug: topRecommendation.slug,
          company_name: topRecommendation.company_name,
          match_score: topRecommendation.match_score,
          action: 'view_job'
        },
        priority: 'high'
      });

      // If there are multiple recommendations, send a summary
      if (recommendations.length > 1) {
        await notificationService.sendLocalNotification({
          type: NotificationType.JOB_RECOMMENDATION,
          title: '💡 More Job Recommendations',
          body: `We found ${recommendations.length} great jobs that match your profile!`,
          data: {
            recommendation_count: recommendations.length,
            action: 'view_recommendations'
          },
          priority: 'default'
        });
      }

      // Update last recommendation sent time
      this.updateLastRecommendationSent();

    } catch (error) {
      console.error('❌ Error sending job recommendation notifications:', error);
    }
  }

  /**
   * Check if recommendation should be sent
   */
  private shouldSendRecommendation(): boolean {
    if (this.lastRecommendationSent) {
      const timeSinceLastRecommendation = Date.now() - this.lastRecommendationSent.getTime();
      if (timeSinceLastRecommendation < this.recommendationCooldown) {
        return false;
      }
    }
    return true;
  }

  /**
   * Update last recommendation sent time
   */
  private updateLastRecommendationSent(): void {
    this.lastRecommendationSent = new Date();
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
   * Manually trigger job recommendation check (for testing)
   */
  async triggerJobRecommendationCheck(): Promise<void> {
    await this.checkForJobRecommendations();
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
   * Reset recommendation cooldown (for testing)
   */
  resetRecommendationCooldown(): void {
    this.lastRecommendationSent = null;
  }
}

// Create and export singleton instance
const jobRecommendationNotificationService = new JobRecommendationNotificationService();
export default jobRecommendationNotificationService;

// Export commonly used methods for convenience
export const {
  startJobRecommendationMonitoring,
  stopJobRecommendationMonitoring,
  triggerJobRecommendationCheck,
  getLastCheckTime,
  isMonitoringActive,
  resetRecommendationCooldown,
} = jobRecommendationNotificationService;
