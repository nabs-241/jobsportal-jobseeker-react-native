import apiService, { ApiResponse } from './apiService';
import { getAuthToken } from './authStorage';
import { buildApiUrl } from '../config/api';

// Dashboard interfaces
export interface DashboardUserProfile {
  name: string;
  email: string;
  profile_image?: string;
  cover_image?: string;
  location?: string;
  resume_complete: boolean;
}

export interface DashboardUserStats {
  profile_views: number;
  followings: number;
  cv_count: number;
  messages: number;
  applied_jobs_count: number;
  favourite_jobs_count: number;
}

export interface DashboardJob {
  id: number;
  slug: string;
  title: string;
  company_name: string;
  company_logo?: string;
  city: string;
  country: string;
  formatted_salary: string;
  job_type: string;
  formatted_date: string;
  is_expired: boolean;
}

export interface DashboardCompany {
  id: number;
  name: string;
  slug: string;
  logo?: string;
  industry: string;
  location: string;
  open_jobs_count: number;
}

export interface DashboardAppliedJob {
  id: number;
  title: string;
  slug: string;
  company_name: string;
  city: string;
  applied_date: string;
}

export interface DashboardProfileCompletion {
  fields: {
    profile_summary: boolean;
    profile_cvs: boolean;
    profile_experience: boolean;
    profile_education: boolean;
    profile_skills: boolean;
    profile_projects: boolean;
  };
  completed_count: number;
  total_count: number;
  percentage: number;
  is_complete: boolean;
}

export interface DashboardData {
  user_profile: DashboardUserProfile;
  user_stats: DashboardUserStats;
  matching_jobs: DashboardJob[];
  followings: DashboardCompany[];
  applied_jobs: DashboardAppliedJob[];
  profile_completion: DashboardProfileCompletion;
  user_info: {
    id: number;
    name: string;
    email: string;
    phone: string;
    location: string;
    avatar: string;
    cover_image: string;
  };
}

// Dashboard Service
class DashboardService {
  /**
   * Get matching jobs for job seeker
   */
  async getMatchingJobs(): Promise<ApiResponse<DashboardJob[]>> {
    try {
      const token = await getAuthToken();
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found',
          statusCode: 401,
        };
      }

      const url = buildApiUrl('/matching-jobs');
      const fetchResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (fetchResponse.ok) {
        const data = await fetchResponse.json();
        
        return {
          success: true,
          data: data.data?.matching_jobs || [],
          statusCode: fetchResponse.status,
        };
      } else {
        const errorText = await fetchResponse.text();
        return {
          success: false,
          error: `HTTP ${fetchResponse.status}: ${errorText}`,
          statusCode: fetchResponse.status,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500,
      };
    }
  }

  /**
   * Get dashboard data for job seeker
   */
  async getDashboardData(): Promise<ApiResponse<DashboardData>> {
    try {
      const token = await getAuthToken();
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found',
          statusCode: 401,
        };
      }
      
      // Try multiple endpoints to get dashboard data
      let response;
      
      // First try the main home-dashboard endpoint
      try {
        const url = buildApiUrl('/home-dashboard');
        const fetchResponse = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        if (fetchResponse.ok) {
          const data = await fetchResponse.json();
          
          return {
            success: true,
            data: data.data || data,
            statusCode: fetchResponse.status,
          };
        }
      } catch (error) {
        // Continue to next endpoint
      }

      // If main endpoint fails, try to get data from individual endpoints 
      try {
        // Get user profile
        const profileResponse = await apiService.get('/my-profile', token);
        
        // Get applied jobs
        const applicationsResponse = await apiService.get('/my-job-applications', token);
        
        // Get favourite jobs
        const favouriteJobsResponse = await apiService.get('/my-favourite-jobs', token);
        
        // Get favourite jobs count
        const favouriteJobsCountResponse = await apiService.get('/favourite-jobs-count', token);
        
        // Get applied jobs count
        const appliedJobsCountResponse = await apiService.get('/applied-jobs-count', token);
        
        // Combine the data
        const combinedData: DashboardData = {
          user_profile: (profileResponse.data as DashboardUserProfile) || {
            name: 'User',
            email: '',
            location: 'Location not set',
            resume_complete: false,
          },
          user_stats: {
            profile_views: (profileResponse.data as any)?.num_profile_views || 0,
            followings: 0,
            cv_count: 0,
            messages: 0,
            applied_jobs_count: (appliedJobsCountResponse.data as any)?.count || 0,
            favourite_jobs_count: (favouriteJobsCountResponse.data as any)?.count || 0,
          },
          matching_jobs: [],
          followings: [],
          applied_jobs: (applicationsResponse.data as DashboardAppliedJob[]) || [],
          profile_completion: {
            fields: {
              profile_summary: false,
              profile_cvs: false,
              profile_experience: false,
              profile_education: false,
              profile_skills: false,
              profile_projects: false,
            },
            completed_count: 0,
            total_count: 6,
            percentage: 0,
            is_complete: false,
          },
          user_info: (profileResponse.data as any) || {
            id: 0,
            name: 'User',
            email: '',
            phone: '',
            location: '',
            avatar: '',
            cover_image: '',
          },
        };
        
        return {
          success: true,
          data: combinedData,
          statusCode: 200,
        };
      } catch (error) {
        // Return fallback data
        const fallbackData: DashboardData = {
          user_profile: {
            name: 'User',
            email: '',
            location: 'Location not set',
            resume_complete: false,
          },
          user_stats: {
            profile_views: 0,
            followings: 0,
            cv_count: 0,
            messages: 0,
            applied_jobs_count: 0,
            favourite_jobs_count: 0,
          },
          matching_jobs: [],
          followings: [],
          applied_jobs: [],
          profile_completion: {
            fields: {
              profile_summary: false,
              profile_cvs: false,
              profile_experience: false,
              profile_education: false,
              profile_skills: false,
              profile_projects: false,
            },
            completed_count: 0,
            total_count: 6,
            percentage: 0,
            is_complete: false,
          },
          user_info: {
            id: 0,
            name: 'User',
            email: '',
            phone: '',
            location: '',
            avatar: '',
            cover_image: '',
          },
        };

        return {
          success: false,
          data: fallbackData,
          statusCode: 503,
          error: 'All dashboard endpoints failed',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch dashboard data',
        statusCode: 0,
      };
    }
  }

  /**
   * Get user profile data
   */
  async getUserProfile(): Promise<ApiResponse<DashboardUserProfile>> {
    try {
      const token = await getAuthToken();
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found',
          statusCode: 401,
        };
      }

      const endpoint = '/my-profile';
      return apiService.get<DashboardUserProfile>(endpoint, token);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch user profile',
        statusCode: 0,
      };
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<ApiResponse<DashboardUserStats>> {
    try {
      const token = await getAuthToken();
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found',
          statusCode: 401,
        };
      }

      const endpoint = '/user-stats';
      return apiService.get<DashboardUserStats>(endpoint, token);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch user stats',
        statusCode: 0,
      };
    }
  }

  /**
   * Get recommended jobs
   */
  async getRecommendedJobs(limit: number = 10): Promise<ApiResponse<DashboardJob[]>> {
    try {
      const token = await getAuthToken();
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found',
          statusCode: 401,
        };
      }

      const endpoint = `/recommended-jobs?limit=${limit}`;
      return apiService.get<DashboardJob[]>(endpoint, token);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch recommended jobs',
        statusCode: 0,
      };
    }
  }

  /**
   * Get following companies
   */
  async getFollowingCompanies(): Promise<ApiResponse<DashboardCompany[]>> {
    try {
      const token = await getAuthToken();
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found',
          statusCode: 401,
        };
      }

      const endpoint = '/my-followings';
      return apiService.get<DashboardCompany[]>(endpoint, token);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch following companies',
        statusCode: 0,
      };
    }
  }

  /**
   * Get applied jobs
   */
  async getAppliedJobs(): Promise<ApiResponse<DashboardAppliedJob[]>> {
    try {
      const token = await getAuthToken();
      if (!token) {
        return {
          success: false,
          error: 'No authentication token found',
          statusCode: 401,
        };
      }

      const endpoint = '/my-job-applications';
      return apiService.get<DashboardAppliedJob[]>(endpoint, token);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch applied jobs',
        statusCode: 0,
      };
    }
  }
}

// Create and export singleton instance
const dashboardService = new DashboardService();
export default dashboardService;

// Export commonly used methods for convenience
export const {
  getDashboardData,
  getMatchingJobs,
  getUserProfile,
  getUserStats,
  getRecommendedJobs,
  getFollowingCompanies,
  getAppliedJobs,
} = dashboardService;