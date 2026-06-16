import { ApiResponse } from './apiService';
import { getAuthToken } from './authStorage';
import { buildApiUrl, getCommonHeaders, API_CONFIG } from '../config/api';

export interface CompanyHomeStats {
  open_jobs: number;
  followers: number;
  messages: number;
}

export interface CompanyJobPackage {
  id?: number;
  title?: string;
  jobs_quota?: number;
  availed_jobs_quota?: number;
  remaining_jobs?: number;
  is_active?: boolean;
  package_end_date?: string;
  end_date?: string;
  start_date?: string;
  price?: number | string;
  currency?: string;
  currency_code?: string;
}

export interface CompanyCvPackage {
  id?: number;
  title?: string;
  cvs_quota?: number;
  availed_cvs_quota?: number;
  remaining_cvs?: number;
  is_active?: boolean;
  package_end_date?: string;
  end_date?: string;
  start_date?: string;
  price?: number | string;
  currency?: string;
  currency_code?: string;
}

export interface CompanyPackageDetailPaymentGateway {
  key: string;
  name: string;
  enabled?: boolean;
  publishable_key?: string | null;
}

export interface CompanyPackageDetail {
  id: number;
  package_title: string;
  package_price: number;
  package_num_days: number;
  package_num_listings?: number;
  package_for: string;
  currency: string;
  is_free: boolean;
  payment_gateways: CompanyPackageDetailPaymentGateway[];
}

export interface SuggestedCandidate {
  id: number;
  name?: string;
  job_title?: string;
  image?: string;
  profile_image?: string;
  headline?: string;
  functional_area?: string;
  career_level?: string;
  city?: string;
  country?: string;
  slug?: string;
  is_featured?: boolean;
  [key: string]: any;
}

export interface CompanyHomeData {
  stats: CompanyHomeStats;
  suggested_candidates: SuggestedCandidate[];
  job_package?: CompanyJobPackage | null;
  cv_package?: CompanyCvPackage | null;
  is_active?: boolean;
  company?: {
    id: number;
    name: string;
    logo?: string;
    industry?: string;
    [key: string]: any;
  };
}

export interface CompanyProfile {
  id: number;
  name: string;
  slug?: string;
  email?: string;
  logo?: string;
  industry?: string;
  industry_id?: number;
  ownership_type_id?: number;
  country_id?: number;
  state_id?: number;
  city_id?: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  contact_name?: string;
  contact_email?: string;
  ceo?: string;
  registration_number?: string;
  no_of_offices?: string;
  no_of_employees?: string;
  established_in?: string;
  map?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  pinterest?: string;
  [key: string]: any;
}

export interface CompanyProfileFormData {
  company: CompanyProfile;
  countries?: { id: number; name: string; country?: string }[];
  industries?: { id: number; name: string; industry?: string }[];
  ownershipTypes?: { id: number; name: string; ownership_type?: string }[];
}

export interface PostedJob {
  id: number;
  title: string;
  slug?: string;
  city?: string;
  country?: string;
  state?: string;
  location?: string;
  job_type?: string;
  salary_from?: number;
  salary_to?: number;
  salary_currency?: string;
  salary_period?: string;
  hide_salary?: boolean;
  expiry_date?: string;
  created_at?: string;
  formatted_date?: string;
  num_views?: number;
  applied_count?: number;
  is_expired?: boolean;
  is_active?: boolean;
  [key: string]: any;
}

class CompanyService {
  private async getToken(): Promise<string | null> {
    return getAuthToken();
  }

  private async companyGet<T>(endpoint: string): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    if (!token) {
      return { success: false, statusCode: 401 };
    }
    const url = buildApiUrl(endpoint);
    const response = await fetch(url, {
      method: 'GET',
      headers: getCommonHeaders(token),
    });
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      return {
        success: false,
        error: text || `HTTP ${response.status}`,
        statusCode: response.status,
      };
    }
    const responseData = await response.json();
    return {
      success: response.ok,
      data: responseData.data ?? responseData,
      message: responseData.message,
      error: responseData.error,
      statusCode: response.status,
    };
  }

  async getCompanyHome(): Promise<ApiResponse<CompanyHomeData>> {
    const token = await this.getToken();
    if (!token) {
      return { success: false, statusCode: 401 };
    }
    const url = buildApiUrl('/company-home');
    const response = await fetch(url, {
      method: 'GET',
      headers: getCommonHeaders(token),
    });
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      return { success: false, error: text || `HTTP ${response.status}`, statusCode: response.status };
    }
    const responseData = await response.json();
    const res: ApiResponse<CompanyHomeData> = {
      success: response.ok,
      data: responseData.data ?? responseData,
      message: responseData.message,
      error: responseData.error,
      statusCode: response.status,
    };
    return res;
  }

  async getCompanyProfile(): Promise<ApiResponse<CompanyProfile>> {
    return this.companyGet<CompanyProfile>('/company-profile');
  }

  async getPostedJobs(page = 1, perPage = 100): Promise<ApiResponse<{ jobs?: PostedJob[]; jobs_id_values?: any; data?: PostedJob[]; pagination?: any }>> {
    const endpoint = `${API_CONFIG.ENDPOINTS.COMPANY.POSTED_JOBS}?page=${page}&per_page=${perPage}`;
    const res = await this.companyGet<{ jobs?: PostedJob[]; jobs_id_values?: any }>(endpoint);
    const raw = (res as any)?.message ?? (res as any)?.data;
    // Laravel sendResponse($success, $data) puts { jobs, jobs_id_values, pagination } in response.message
    const jobsList = Array.isArray(raw?.jobs) ? raw.jobs : Array.isArray(raw?.data) ? raw.data : [];
    return {
      ...res,
      data: raw && typeof raw === 'object' ? { ...raw, jobs: jobsList } : { jobs: jobsList, jobs_id_values: [], pagination: null },
    };
  }

  async deleteJob(jobId: number): Promise<ApiResponse<{ success?: string }>> {
    const token = await this.getToken();
    if (!token) return { success: false, statusCode: 401 };
    const url = buildApiUrl('/delete-front-job');
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: jobId }),
    });
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      return { success: false, error: text || `HTTP ${response.status}`, statusCode: response.status };
    }
    const responseData = await response.json();
    return {
      success: response.ok,
      data: responseData.data ?? responseData,
      message: responseData.message,
      error: responseData.error,
      statusCode: response.status,
    };
  }

  async getCvPackages(): Promise<ApiResponse<{ packages?: any[]; success_package?: any }>> {
    const res = await this.companyGet<{ packages?: any[]; success_package?: any }>('/company-packages');
    const raw = (res as any)?.message ?? (res as any)?.data ?? res;
    return { ...res, data: raw };
  }

  /**
   * Aligns with web: when admin enables CV search packages (`packages_enabled`), unlocking a seeker
   * requires an active package with remaining CV views. When packages are disabled globally, no quota check.
   */
  async getCvUnlockEligibility(): Promise<{
    /** false = admin turned off CV package system → app does not block unlock */
    cvPackagesFeatureEnabled: boolean;
    /** When feature on: company has active package with at least 1 unlock left */
    canUnlock: boolean;
    remainingCvs: number;
    apiOk: boolean;
  }> {
    try {
      const res = await this.getCvPackages();
      const raw = (res as any)?.data ?? (res as any)?.message ?? res;
      if (!res.success || !raw || typeof raw !== 'object') {
        return {
          cvPackagesFeatureEnabled: true,
          canUnlock: false,
          remainingCvs: 0,
          apiOk: false,
        };
      }
      const featureOn = raw.packages_enabled !== false;
      if (!featureOn) {
        return {
          cvPackagesFeatureEnabled: false,
          canUnlock: true,
          remainingCvs: 0,
          apiOk: true,
        };
      }
      const pkg = raw.success_package ?? raw.current_package ?? null;
      if (!pkg || typeof pkg !== 'object') {
        return {
          cvPackagesFeatureEnabled: true,
          canUnlock: false,
          remainingCvs: 0,
          apiOk: true,
        };
      }
      const endRaw = pkg.package_end_date ?? pkg.end_date;
      let expired = false;
      if (endRaw) {
        const end = new Date(String(endRaw));
        if (!Number.isNaN(end.getTime())) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          expired = end < today;
        }
      }
      const quota = Number(pkg.package_num_listings ?? pkg.cvs_quota ?? 0);
      const availed = Number(pkg.availed_cvs_quota ?? 0);
      let remaining =
        pkg.remaining_cvs != null && pkg.remaining_cvs !== ''
          ? Number(pkg.remaining_cvs)
          : Math.max(0, quota - availed);
      if (Number.isNaN(remaining)) remaining = 0;
      const explicitlyInactive = pkg.is_active === false || pkg.is_active === 0;
      const canUnlock = !expired && !explicitlyInactive && remaining > 0;
      return {
        cvPackagesFeatureEnabled: true,
        canUnlock,
        remainingCvs: remaining,
        apiOk: true,
      };
    } catch {
      return {
        cvPackagesFeatureEnabled: true,
        canUnlock: false,
        remainingCvs: 0,
        apiOk: false,
      };
    }
  }

  async getJobPackages(): Promise<ApiResponse<{ packages?: any[]; current_package?: any; jobs_quota?: number; availed_jobs_quota?: number; package_end_date?: string }>> {
    const res = await this.companyGet('/company-job-packages');
    const raw = (res as any)?.message ?? (res as any)?.data ?? res;
    return { ...res, data: raw };
  }

  /**
   * Order free package (company). GET /order-free-package/{id} with company token.
   */
  async orderFreePackage(packageId: number): Promise<ApiResponse<{ package_id?: number; package_title?: string; success?: boolean }>> {
    const res = await this.companyGet<any>(`/order-free-package/${packageId}`);
    return res as ApiResponse<{ package_id?: number; package_title?: string; success?: boolean }>;
  }

  /**
   * Get company package detail with payment gateways. GET /company/package/{id}
   */
  async getPackageDetail(packageId: number): Promise<ApiResponse<CompanyPackageDetail>> {
    const res = await this.companyGet<any>(`/company/package/${packageId}`);
    if (!res.success || res.data == null) return res as ApiResponse<CompanyPackageDetail>;
    const raw = res.data;
    const inner = raw?.data ?? raw;
    const data: CompanyPackageDetail = {
      id: inner.id,
      package_title: inner.package_title,
      package_price: Number(inner.package_price),
      package_num_days: Number(inner.package_num_days),
      package_num_listings: inner.package_num_listings != null ? Number(inner.package_num_listings) : undefined,
      package_for: inner.package_for,
      currency: inner.currency ?? '',
      is_free: Boolean(inner.is_free ?? inner.package_price <= 0),
      payment_gateways: Array.isArray(inner.payment_gateways)
        ? inner.payment_gateways.filter((g: any) => g && g.enabled !== false)
        : [],
    };
    return { ...res, data };
  }

  /**
   * Initiate company PayPal payment. Returns approval_url for in-app WebView.
   * POST /company/initiate-paypal-payment Body: { package_id }
   */
  async initiatePayPalPayment(packageId: number): Promise<ApiResponse<{ approval_url: string; payment_id: string }>> {
    const token = await this.getToken();
    if (!token) return { success: false, statusCode: 401 } as ApiResponse<any>;
    const url = buildApiUrl('/company/initiate-paypal-payment');
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...getCommonHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: packageId }),
    });
    const json = await response.json().catch(() => ({}));
    const inner = json?.data ?? json;
    const approvalUrl = inner?.approval_url ?? inner?.approvalUrl;
    return {
      success: response.ok && !!approvalUrl,
      data: approvalUrl ? { approval_url: approvalUrl, payment_id: inner?.payment_id ?? '' } : undefined,
      message: json?.message,
      error: json?.error,
      statusCode: response.status,
    };
  }

  /**
   * Stripe Checkout Session for company (hosted Stripe page — works in WebView).
   * Uses stripe_secret from site settings. POST /company/stripe-checkout-session
   */
  async createCompanyStripeCheckoutSession(packageId: number): Promise<ApiResponse<{ checkout_url: string }>> {
    const token = await this.getToken();
    if (!token) return { success: false, statusCode: 401 } as ApiResponse<any>;
    const url = buildApiUrl('/company/stripe-checkout-session');
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...getCommonHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: packageId }),
    });
    const json = await response.json().catch(() => ({}));
    const inner = json?.data ?? json;
    const checkoutUrl = inner?.checkout_url ?? inner?.checkoutUrl;
    return {
      success: response.ok && !!checkoutUrl && json?.success !== false,
      data: checkoutUrl ? { checkout_url: checkoutUrl } : undefined,
      message: json?.message,
      error: json?.error ?? json?.message,
      statusCode: response.status,
    };
  }

  /**
   * Company Stripe order (native card token). POST /stripe-order-package with company token.
   * Body: { package_id, stripe_token }
   */
  async stripeOrderPackage(packageId: number, stripeToken: string): Promise<ApiResponse<{ package_id?: number; package_title?: string }>> {
    const token = await this.getToken();
    if (!token) return { success: false, statusCode: 401 } as ApiResponse<any>;
    const url = buildApiUrl('/stripe-order-package');
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...getCommonHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: packageId, stripe_token: stripeToken }),
    });
    const json = await response.json().catch(() => ({}));
    const data = json?.data ?? json;
    const ok = response.ok && json?.success !== false;
    return {
      success: ok,
      data,
      message: json?.message,
      error: json?.error ?? json?.message,
      statusCode: response.status,
    };
  }

  async getPaymentHistory(page = 1, perPage = 15): Promise<ApiResponse<{ payments?: any[]; orders?: any[]; pagination?: any }>> {
    const endpoint = `/company/payment-history?page=${page}&per_page=${perPage}`;
    const res = await this.companyGet(endpoint);
    const raw = (res as any)?.data ?? (res as any)?.message ?? res;
    const payments = Array.isArray(raw?.payments)
      ? raw.payments
      : Array.isArray(raw?.orders)
        ? raw.orders
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw)
            ? raw
            : [];
    const pagination = raw?.pagination ?? null;
    return { ...res, data: { payments, pagination } };
  }

  async getCompanyPaymentStats(): Promise<ApiResponse<{ total_payments?: number; total_spent?: number; completed_payments?: number }>> {
    const res = await this.companyGet('/company/payment-history/stats');
    const raw = (res as any)?.data ?? (res as any)?.message ?? res;
    return { ...res, data: raw };
  }

  async getCompanyOrderDetails(orderId: number): Promise<ApiResponse<Record<string, any>>> {
    const res = await this.companyGet(`/company/payment-history/order/${orderId}`);
    const raw = (res as any)?.data ?? (res as any)?.message ?? res;
    return { ...res, data: raw };
  }

  async getUnlockedUsers(): Promise<ApiResponse<{ users?: any[]; count?: number }>> {
    const res = await this.companyGet<{ users?: any[]; count?: number }>('/unlocked-seekers');
    const message = (res as any)?.message;
    const data = (res as any)?.data;
    // Backend sendResponse($result, $message) puts { users, count } in message
    let list: any[] = [];
    if (message && typeof message === 'object' && Array.isArray(message.users)) list = message.users;
    else if (data && typeof data === 'object' && Array.isArray(data.users)) list = data.users;
    else if (Array.isArray(message)) list = message;
    else if (Array.isArray(data)) list = data;
    const count = (message && typeof message === 'object' && typeof message.count === 'number')
      ? message.count
      : (data && typeof data === 'object' && typeof data.count === 'number') ? data.count : list.length;
    return { ...res, data: { users: list, count } };
  }

  /**
   * List applied users/candidates for a job (with application_status: applied|shortlisted|hired|rejected).
   * Merges list-applied-users, list-hired-users, list-favourite-applied-users, and list-rejected-users.
   * Rejected users come from JobApplyRejected (different table); applied/shortlisted/hired from JobApply.
   */
  async getListAppliedUsers(jobId: number): Promise<ApiResponse<{ applicants?: any[]; job_applications?: any[] }>> {
    const [appliedRes, hiredRes, shortlistRes, rejectedRes] = await Promise.all([
      this.companyGet<any>(`/list-applied-users/${jobId}`),
      this.companyGet<any>(`/list-hired-users/${jobId}`),
      this.companyGet<any>(`/list-favourite-applied-users/${jobId}`),
      this.companyGet<any>(`/list-rejected-users/${jobId}`),
    ]);
    const raw = (appliedRes as any)?.message ?? (appliedRes as any)?.data ?? appliedRes;
    const appliedList = Array.isArray(raw?.job_applications)
      ? raw.job_applications
      : Array.isArray(raw?.applicants)
        ? raw.applicants
        : Array.isArray(raw?.users)
          ? raw.users
          : Array.isArray(raw?.data)
            ? raw.data
            : Array.isArray(raw)
              ? raw
              : [];

    const hiredRaw = (hiredRes as any)?.message ?? (hiredRes as any)?.data ?? hiredRes;
    const hiredList = Array.isArray(hiredRaw?.job_applications) ? hiredRaw.job_applications : [];
    const shortlistRaw = (shortlistRes as any)?.message ?? (shortlistRes as any)?.data ?? shortlistRes;
    const shortlistList = Array.isArray(shortlistRaw?.job_applications) ? shortlistRaw.job_applications : [];

    const rejectedRaw = (rejectedRes as any)?.message ?? (rejectedRes as any)?.data ?? rejectedRes;
    const rejectedList = Array.isArray(rejectedRaw?.job_applications)
      ? rejectedRaw.job_applications
      : Array.isArray(rejectedRaw)
        ? rejectedRaw
        : [];

    const hiredIds = new Set(hiredList.map((a: any) => a.user_id ?? a.user?.id ?? a.id).filter(Boolean));
    const shortlistIds = new Set(shortlistList.map((a: any) => a.user_id ?? a.user?.id ?? a.id).filter(Boolean));
    const rejectedIds = new Set(rejectedList.map((a: any) => a.user_id ?? a.user?.id ?? a.id).filter(Boolean));

    if (__DEV__) {
      console.log('[getListAppliedUsers] merge:', {
        appliedCount: appliedList.length,
        shortlistCount: shortlistList.length,
        shortlistIds: [...shortlistIds],
        hiredCount: hiredList.length,
        hiredIds: [...hiredIds],
        rejectedCount: rejectedList.length,
        shortlistRawKeys: shortlistRaw && typeof shortlistRaw === 'object' ? Object.keys(shortlistRaw) : [],
        firstShortlistItem: shortlistList[0] ? { user_id: shortlistList[0].user_id, userId: shortlistList[0].user?.id } : null,
      });
    }

    // Applied list: prefer JobApply.status from API (matches web); fallback to list-based inference
    const enrichedApplied = appliedList.map((a: any) => {
      const uid = a.user_id ?? a.user?.id ?? a.id;
      const fromApi = (a.application_status ?? a.status ?? '').toString().toLowerCase();
      if (fromApi === 'rejected' || rejectedIds.has(uid)) {
        return { ...a, application_status: 'rejected' as const };
      }
      // Use API status when available (web uses JobApply.status; applied/shortlist/hired)
      if (fromApi === 'applied') return { ...a, application_status: 'applied' as const };
      if (fromApi === 'shortlist' || fromApi === 'shortlisted') return { ...a, application_status: 'shortlisted' as const };
      if (fromApi === 'hired') return { ...a, application_status: 'hired' as const };
      // Fallback: infer from list membership (for backends that omit status)
      let application_status: 'applied' | 'shortlisted' | 'hired' | 'rejected' = 'applied';
      if (hiredIds.has(uid)) application_status = 'hired';
      else if (shortlistIds.has(uid)) application_status = 'shortlisted';
      return { ...a, application_status };
    });

    // Rejected list: JobApplyRejected records - normalize to same shape (id → apply_id for compatibility)
    const normalizedRejected = rejectedList.map((a: any) => {
      const uid = a.user_id ?? a.user?.id ?? a.id;
      if (!uid || hiredIds.has(uid) || shortlistIds.has(uid)) return null;
      return {
        ...a,
        id: a.apply_id ?? a.id,
        application_status: 'rejected' as const,
      };
    }).filter(Boolean) as any[];

    const combined = [...enrichedApplied, ...normalizedRejected];
    return { ...appliedRes, data: { applicants: combined, job_applications: combined } };
  }

  /**
   * Application status change (applied|shortlisted|hired|rejected).
   * Uses unified API: GET /api/set-applicant-status?application_id={id}&status={status}
   * Updates JobApply.status and keeps FavouriteApplicant in sync; works for restore from rejected.
   */
  async setApplicationStatus(
    applicationId: number,
    userId: number,
    jobId: number,
    _companyId: number,
    newStatus: 'applied' | 'shortlisted' | 'hired' | 'rejected',
    currentStatus?: 'applied' | 'shortlisted' | 'hired' | 'rejected',
  ): Promise<ApiResponse<{ success?: boolean }>> {
    const token = await this.getToken();
    if (!token) {
      return { success: false, statusCode: 401 };
    }
    // API uses: applied | shortlist | hired | rejected
    const apiStatus = newStatus === 'shortlisted' ? 'shortlist' : newStatus;
    let url = `${buildApiUrl('/set-applicant-status')}?application_id=${applicationId}&status=${apiStatus}`;
    // When restoring from rejected, application_id refers to JobApplyRejected; backend may need user_id+job_id
    if (currentStatus === 'rejected' && newStatus !== 'rejected') {
      url += `&user_id=${userId}&job_id=${jobId}`;
    }
    try {
      const r = await fetch(url, { method: 'GET', headers: getCommonHeaders(token) });
      const contentType = r.headers.get('content-type');
      let data: any = {};
      if (contentType?.includes('application/json')) {
        try {
          data = await r.json();
        } catch {
          data = {};
        }
      }
      const ok = r.ok && (data.success === true || data.success === 'done');
      return {
        success: ok,
        data: data.data ?? data,
        message: data.message,
        error: data.error,
        statusCode: r.status,
      };
    } catch (e) {
      return { success: false, error: String(e), statusCode: 500 };
    }
  }

  /**
   * Unlock a candidate profile (company uses a CV unlock from their package).
   * GET /api/unlock/{user} with company auth.
   */
  async unlockCandidate(userId: number): Promise<ApiResponse<{ success?: boolean; message?: string }>> {
    const token = await this.getToken();
    if (!token) return { success: false, statusCode: 401 };
    const url = buildApiUrl(`/unlock/${userId}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: getCommonHeaders(token),
    });
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      return { success: false, error: text || `HTTP ${response.status}`, statusCode: response.status };
    }
    const data = await response.json();
    const success = response.ok && (data.success !== false);
    return {
      success,
      data: data.data ?? data,
      message: data.message,
      error: data.error,
      statusCode: response.status,
    };
  }

  async setUnlockedUserStatus(userId: number, status: 'unlocked' | 'shortlist' | 'rejected' | 'hired'): Promise<ApiResponse<{ status?: string }>> {
    const token = await this.getToken();
    if (!token) return { success: false, statusCode: 401 };
    const url = buildApiUrl('/company/unlocked-user-status');
    const response = await fetch(url, {
      method: 'POST',
      headers: getCommonHeaders(token),
      body: JSON.stringify({ user_id: userId, status }),
    });
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      return { success: false, error: text || `HTTP ${response.status}`, statusCode: response.status };
    }
    const responseData = await response.json();
    const data = responseData.data ?? responseData.message ?? responseData;
    return {
      success: response.ok,
      data: typeof data === 'object' && data !== null ? { ...data, status } : { status },
      message: responseData.message,
      error: responseData.error,
      statusCode: response.status,
    };
  }

  async getCompanyFollowers(): Promise<ApiResponse<{ company?: any; users?: any[] }>> {
    const res = await this.companyGet('/company-followers');
    const raw = (res as any)?.message ?? (res as any)?.data ?? res;
    return { ...res, data: raw };
  }

  async getCompanyProfileFormData(): Promise<ApiResponse<CompanyProfileFormData>> {
    const res = await this.companyGet<CompanyProfileFormData | CompanyProfile>('/company-profile');
    // Laravel sendResponse($result, $message) puts profile payload in .message
    const raw = (res as any)?.message ?? (res as any)?.data ?? res;
    const data = (raw?.company ? raw : { company: raw }) as CompanyProfileFormData;
    return { ...res, data };
  }

  async getPostJobFormData(): Promise<ApiResponse<Record<string, any>>> {
    const res = await this.companyGet<Record<string, any>>('/post-job');
    const raw = (res as any)?.data ?? (res as any)?.message ?? res;
    return { ...res, data: raw };
  }

  async getStatesByCountry(countryId: number | string): Promise<ApiResponse<{ id: number; name: string }[]>> {
    const res = await this.companyGet<any>(`/master-data/states/${countryId}`);
    const raw = (res as any)?.data ?? (res as any)?.message ?? res;
    const list = Array.isArray(raw) ? raw : raw?.states ?? [];
    return { ...res, data: list };
  }

  async getCitiesByState(stateId: number | string): Promise<ApiResponse<{ id: number; name: string }[]>> {
    const res = await this.companyGet<any>(`/master-data/cities/${stateId}`);
    const raw = (res as any)?.data ?? (res as any)?.message ?? res;
    const list = Array.isArray(raw) ? raw : raw?.cities ?? [];
    return { ...res, data: list };
  }

  /**
   * Same endpoint as job seeker EditProfile: GET /master-data/functional-areas
   * (Post-job form payload often omits functional areas; load them here.)
   */
  async getMasterFunctionalAreas(): Promise<ApiResponse<{ id: number; name: string }[]>> {
    const res = await this.companyGet<any>('/master-data/functional-areas');
    const raw = (res as any)?.data ?? (res as any)?.message ?? res;
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    if (!Array.isArray(list) || list.length === 0) {
      return { ...res, data: [] };
    }
    const mapRow = (item: any) => ({
      id: Number(item.id),
      name: String(item.functional_area || item.name || '').trim(),
    });
    const isActive = (item: any) => item.is_active === 1 || item.is_active === undefined;
    const active = list.filter(isActive);
    const rows = active.length > 0 ? active : list;
    const englishLike = rows.filter((item: any) => {
      const areaText = item.functional_area || item.name || '';
      const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
      const asciiLabel =
        areaText === '' || /^[a-zA-Z\s\-\.]+$/.test(areaText);
      return asciiLabel && isEnglish;
    });
    const source = englishLike.length > 0 ? englishLike : rows;
    const seen = new Set<number>();
    const mapped: { id: number; name: string }[] = [];
    for (const item of source) {
      const row = mapRow(item);
      if (!row.name || Number.isNaN(row.id)) continue;
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      mapped.push(row);
    }
    return { ...res, data: mapped };
  }

  async submitJob(payload: Record<string, any>): Promise<ApiResponse<{ job_id?: number; slug?: string; message?: string }>> {
    const token = await this.getToken();
    if (!token) return { success: false, statusCode: 401 };
    const url = buildApiUrl('/store-front-job');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      return { success: false, error: text || `HTTP ${response.status}`, statusCode: response.status };
    }
    const responseData = await response.json();
    return {
      success: response.ok,
      data: responseData.data ?? responseData,
      message: responseData.message,
      error: responseData.message || responseData.error,
      statusCode: response.status,
    };
  }

  async getEditJobFormData(jobId: number): Promise<ApiResponse<Record<string, any>>> {
    const res = await this.companyGet<Record<string, any>>(`/edit-front-job/${jobId}`);
    const raw = (res as any)?.data ?? (res as any)?.message ?? res;
    return { ...res, data: raw };
  }

  async updateJob(jobId: number, payload: Record<string, any>): Promise<ApiResponse<{ success?: string; message?: string }>> {
    const token = await this.getToken();
    if (!token) return { success: false, statusCode: 401 };
    const url = buildApiUrl(`/update-front-job/${jobId}`);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      return { success: false, error: text || `HTTP ${response.status}`, statusCode: response.status };
    }
    const responseData = await response.json();
    return {
      success: response.ok,
      data: responseData.data ?? responseData,
      message: responseData.message,
      error: responseData.message || responseData.error,
      statusCode: response.status,
    };
  }

  async updateCompanyProfile(formData: FormData): Promise<ApiResponse<CompanyProfile>> {
    const token = await this.getToken();
    if (!token) return { success: false, statusCode: 401 };
    const url = buildApiUrl('/update-company-profile');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      return { success: false, error: text || `HTTP ${response.status}`, statusCode: response.status };
    }
    const responseData = await response.json();
    return {
      success: response.ok,
      data: responseData.data ?? responseData.company ?? responseData,
      message: responseData.message,
      error: responseData.error,
      statusCode: response.status,
    };
  }
}

const companyService = new CompanyService();
export default companyService;
