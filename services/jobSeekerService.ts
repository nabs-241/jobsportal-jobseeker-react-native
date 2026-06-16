import { buildApiUrl, getCommonHeaders } from '../config/api';
import { getAuthToken } from './authStorage';

export interface JobSeekerListItem {
  id: number;
  name: string | null;
  job_title: string | null;
  image: string | null;
  functional_area: string | null;
  career_level: string | null;
  job_experience: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  is_featured: boolean;
}

export interface JobSeekersListResponse {
  success: boolean;
  job_seekers: JobSeekerListItem[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ViewPublicProfileResponse {
  success: boolean;
  user: Record<string, any>;
  profileCv: Record<string, any> | null;
  page_title?: string;
  form_title?: string;
  summary?: { summary?: string } | null;
  skills?: { id?: number; skill?: string }[];
  languages?: { id?: number; language?: string; language_level?: number }[];
  experience?: Array<Record<string, any>>;
  education?: Array<Record<string, any>>;
  portfolio?: Array<Record<string, any>>;
  /** When company views profile: true if they have unlocked this candidate (or from job application). */
  can_view_contact?: boolean;
  /** When company views profile: true if they can download CV. */
  can_download_cv?: boolean;
}

export async function getJobSeekersList(params: {
  page?: number;
  per_page?: number;
  search?: string;
}): Promise<{ success: boolean; data?: JobSeekersListResponse; error?: string; statusCode?: number }> {
  const { page = 1, per_page = 15, search = '' } = params;
  const url = buildApiUrl(
    `/job-seekers-list?page=${page}&per_page=${per_page}&search=${encodeURIComponent(search)}`
  );
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getCommonHeaders(),
    });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      if (__DEV__) {
        console.log('[jobSeekerService] getJobSeekersList non-JSON:', response.status, text?.slice(0, 300));
      }
      return {
        success: false,
        error: response.ok ? 'Invalid response format' : `HTTP ${response.status}: ${text?.slice(0, 100) || 'Server error'}`,
        statusCode: response.status,
      };
    }
    const json = await response.json();
    const payload = json.message ?? json.data ?? json;
    const list =
      Array.isArray(payload?.job_seekers) ? payload.job_seekers
      : Array.isArray(json.data?.job_seekers) ? json.data.job_seekers
      : Array.isArray(json.job_seekers) ? json.job_seekers
      : [];
    const pagination = payload?.pagination ?? json.data?.pagination ?? json.pagination ?? {
      current_page: 1,
      last_page: 1,
      per_page: per_page,
      total: list.length,
    };
    if (__DEV__) {
      console.log('[jobSeekerService] getJobSeekersList:', {
        status: response.status,
        ok: response.ok,
        listLength: list.length,
        total: pagination?.total,
        hasMessage: !!json.message,
        hasData: !!json.data,
      });
    }
    return {
      success: response.ok,
      data: {
        success: json.success !== false,
        job_seekers: list,
        pagination,
      },
      statusCode: response.status,
    };
  } catch (e) {
    if (__DEV__) {
      console.warn('[jobSeekerService] getJobSeekersList error:', e);
    }
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Request failed',
    };
  }
}

export async function getViewPublicProfile(
  userId: number
): Promise<{ success: boolean; data?: ViewPublicProfileResponse; error?: string; statusCode?: number }> {
  const url = buildApiUrl(`/view-public-profile/${userId}`);
  const token = await getAuthToken();
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getCommonHeaders(token || undefined),
    });
    const json = await response.json();
    // API returns payload in data: { user, profileCv, page_title, form_title }; message is often a string
    const payload =
      json.data && typeof json.data === 'object' && (json.data.user != null || json.data.profileCv != null)
        ? json.data
        : json.message && typeof json.message === 'object'
          ? json.message
          : json;
    return {
      success: response.ok,
      data: {
        success: json.success !== false,
        user: payload?.user ?? payload ?? {},
        profileCv: payload?.profileCv ?? null,
        page_title: payload?.page_title,
        form_title: payload?.form_title,
        summary: payload?.summary ?? null,
        skills: Array.isArray(payload?.skills) ? payload.skills : [],
        languages: Array.isArray(payload?.languages) ? payload.languages : [],
        experience: Array.isArray(payload?.experience) ? payload.experience : [],
        education: Array.isArray(payload?.education) ? payload.education : [],
        portfolio: Array.isArray(payload?.portfolio) ? payload.portfolio : [],
        can_view_contact: payload?.can_view_contact === true,
        can_download_cv: payload?.can_download_cv === true,
      },
      statusCode: response.status,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Request failed',
    };
  }
}
