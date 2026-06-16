import apiService, { ApiResponse } from './apiService';
import API_CONFIG from '../config/api';

// Job interfaces
export interface Job {
  id: number;
  title: string;
  company_id: number;
  company_name: string;
  company_logo?: string;
  description: string;
  requirements: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  salary_type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  job_type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance';
  experience_level: 'entry' | 'mid' | 'senior' | 'executive';
  education_level?: string;
  skills: string[];
  benefits?: string[];
  is_remote: boolean;
  is_active: boolean;
  applications_count: number;
  views_count: number;
  posted_at: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface JobSearchParams {
  query?: string;
  location?: string;
  job_type?: string[];
  experience_level?: string[];
  salary_min?: number;
  salary_max?: number;
  is_remote?: boolean;
  skills?: string[];
  company_id?: number;
  page?: number;
  limit?: number;
  sort_by?: 'relevance' | 'date' | 'salary' | 'applications';
  sort_order?: 'asc' | 'desc';
}

export interface JobSearchResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface JobApplication {
  id: number;
  job_id: number;
  job_title: string;
  seeker_id: number;
  seeker_name: string;
  seeker_email: string;
  resume_url?: string;
  cover_letter?: string;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'accepted';
  applied_at: string;
  reviewed_at?: string;
  notes?: string;
}

export interface ApplyJobRequest {
  job_id: number;
  cover_letter?: string;
  resume_id?: number;
  cv_id?: number;
  current_salary?: string;
  expected_salary?: string;
  currency?: string;
}

export interface SavedJob {
  id: number;
  job_id: number;
  seeker_id: number;
  saved_at: string;
  job: Job;
}

// Jobs Service
class JobsService {
  /**
   * Search jobs
   */
  async searchJobs(params: JobSearchParams, token?: string): Promise<ApiResponse<JobSearchResponse>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v.toString()));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    // Use the correct endpoint from your API routes: /jobs/search
    const endpoint = `/jobs/search?${queryParams.toString()}`;
    return apiService.get<JobSearchResponse>(endpoint, token);
  }

  /**
   * Get job details
   */
  async getJobDetails(jobId: number, token?: string): Promise<ApiResponse<Job>> {
    return apiService.get<Job>(`/job/${jobId}`, token);
  }

  /**
   * Get recommended jobs for seeker
   */
  async getRecommendedJobs(token: string, limit: number = 10): Promise<ApiResponse<Job[]>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.SEEKER.SEARCH_JOBS}/recommended?limit=${limit}`;
    return apiService.get<Job[]>(endpoint, token);
  }

  /**
   * Apply to a job
   */
  async applyToJob(application: ApplyJobRequest, token: string): Promise<ApiResponse<{ application_id: number }>> {
    // Use the correct endpoint from your API routes: /jobs/apply
    return apiService.post<{ application_id: number }>(
      '/jobs/apply',
      application,
      token
    );
  }

  /**
   * Apply to a job by slug (new method for the apply form)
   */
  async applyToJobBySlug(jobSlug: string, application: Omit<ApplyJobRequest, 'job_id'>, token: string): Promise<ApiResponse<{ application_id: number }>> {
    return apiService.post<{ application_id: number }>(
      `/apply/${jobSlug}`,
      application,
      token
    );
  }

  /**
   * Get user's CVs for job application
   */
  async getUserCVs(userId: number, token: string): Promise<ApiResponse<Array<{
    id: number;
    title: string;
    file_name: string;
    is_default: boolean;
  }>>> {
    return apiService.post<Array<{
      id: number;
      title: string;
      file_name: string;
      is_default: boolean;
    }>>(`/show-front-profile-cvs/${userId}`, {}, token);
  }

  /**
   * Get seeker's applications
   */
  async getSeekerApplications(token: string, page: number = 1, limit: number = 10): Promise<ApiResponse<JobApplication[]>> {
    // Use the correct endpoint from your API routes: /my-job-applications
    const endpoint = `/my-job-applications?page=${page}&limit=${limit}`;
    return apiService.get<JobApplication[]>(endpoint, token);
  }

  /**
   * Get saved jobs
   */
  async getSavedJobs(token: string, page: number = 1, limit: number = 10): Promise<ApiResponse<SavedJob[]>> {
    // Use the correct endpoint from your API routes: /my-favourite-jobs
    const endpoint = `/my-favourite-jobs?page=${page}&limit=${limit}`;
    return apiService.get<SavedJob[]>(endpoint, token);
  }

  /**
   * Save a job
   */
  async saveJob(jobId: number, token: string): Promise<ApiResponse<void>> {
    // Use the correct endpoint from your API routes: /add-to-favourite-job/{job_slug}
    const endpoint = `/add-to-favourite-job/${jobId}`;
    return apiService.get<void>(endpoint, token);
  }

  /**
   * Remove saved job
   */
  async removeSavedJob(savedJobId: number, token: string): Promise<ApiResponse<void>> {
    // Use the correct endpoint from your API routes: /remove-from-favourite-job/{job_slug}
    const endpoint = `/remove-from-favourite-job/${savedJobId}`;
    return apiService.get<void>(endpoint, token);
  }

  /**
   * Get company's job postings
   */
  async getCompanyJobPostings(token: string, page: number = 1, limit: number = 10): Promise<ApiResponse<Job[]>> {
    // Use the correct endpoint from your API routes: /post-job
    const endpoint = `/post-job?page=${page}&limit=${limit}`;
    return apiService.get<Job[]>(endpoint, token);
  }

  /**
   * Create a new job posting
   */
  async createJobPosting(jobData: Partial<Job>, token: string): Promise<ApiResponse<Job>> {
    // Use the correct endpoint from your API routes: /store-front-job
    return apiService.post<Job>(
      '/store-front-job',
      jobData,
      token
    );
  }

  /**
   * Update a job posting
   */
  async updateJobPosting(jobId: number, jobData: Partial<Job>, token: string): Promise<ApiResponse<Job>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.COMPANY.UPDATE_JOB}/${jobId}`;
    return apiService.put<Job>(endpoint, jobData, token);
  }

  /**
   * Delete a job posting
   */
  async deleteJobPosting(jobId: number, token: string): Promise<ApiResponse<void>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.COMPANY.DELETE_JOB}/${jobId}`;
    return apiService.delete<void>(endpoint, token);
  }

  /**
   * Get job applications for a company
   */
  async getCompanyJobApplications(token: string, jobId?: number, page: number = 1, limit: number = 10): Promise<ApiResponse<JobApplication[]>> {
    // Use the correct endpoint from your API routes: /list-applied-users/{job_id}
    let endpoint = jobId 
      ? `/list-applied-users/${jobId}?page=${page}&limit=${limit}`
      : `/list-applied-users?page=${page}&limit=${limit}`;
    return apiService.get<JobApplication[]>(endpoint, token);
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(applicationId: number, status: string, token: string, notes?: string): Promise<ApiResponse<void>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.COMPANY.APPLICATIONS}/${applicationId}`;
    return apiService.patch<void>(endpoint, { status, notes }, token);
  }
}

// Create and export singleton instance
const jobsService = new JobsService();
export default jobsService;

// Export commonly used methods for convenience
export const {
  searchJobs,
  getJobDetails,
  getRecommendedJobs,
  applyToJob,
  applyToJobBySlug,
  getUserCVs,
  getSeekerApplications,
  getSavedJobs,
  saveJob,
  removeSavedJob,
  getCompanyJobPostings,
  createJobPosting,
  updateJobPosting,
  deleteJobPosting,
  getCompanyJobApplications,
  updateApplicationStatus,
} = jobsService; 