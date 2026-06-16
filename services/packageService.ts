import apiService, { ApiResponse } from './apiService';
import { getAuthToken } from './authStorage';

// Featured package (make profile featured)
export interface FeaturedPackageItem {
  id: number;
  package_title: string;
  package_price: number;
  package_num_days: number;
  currency: string;
  package_for: 'featured';
  is_purchased: boolean;
  expires_at: string | null;
}

// Job apply package
export interface JobApplyPackageItem {
  id: number;
  package_title: string;
  package_price: number;
  package_num_days: number;
  package_num_listings: number;
  currency: string;
  package_for: 'job_apply';
  is_current: boolean;
  package_end_date: string | null;
  jobs_quota: number | null;
  availed_jobs_quota: number | null;
}

export interface MyPackageStatus {
  is_featured: boolean;
  featured_expires_at: string | null;
  current_job_package_id: number | null;
  job_package_expires_at: string | null;
  jobs_quota: number;
  availed_jobs_quota: number;
}

export interface PackagesResponse {
  featured_package: FeaturedPackageItem | null;
  job_apply_packages: JobApplyPackageItem[];
  my_status: MyPackageStatus;
  /** When true, jobseeker must have an active job package to apply; when false, apply is allowed without package. */
  packages_job_apply_enabled?: boolean;
}

export interface PackageDetailPaymentGateway {
  key: string;
  name: string;
  enabled?: boolean;
  publishable_key?: string | null;
}

export interface PackageDetail {
  id: number;
  package_title: string;
  package_price: number;
  package_num_days: number;
  package_num_listings?: number;
  package_for: string;
  currency: string;
  is_free: boolean;
  payment_gateways: PackageDetailPaymentGateway[];
}

const ENDPOINTS = {
  PACKAGES: '/user/packages',
  PACKAGES_FEATURED: '/user/packages/featured',
  PACKAGES_JOB_APPLY: '/user/packages/job-apply',
  PACKAGE_STATUS: '/user/package-status',
  PACKAGE_DETAIL: (id: number) => `/user/package/${id}`,
  ORDER_FREE_PACKAGE: (id: number) => `/user/order-free-package/${id}`,
  PAYMENT_GATEWAYS: '/user/payment-gateways',
  INITIATE_PAYPAL: '/user/initiate-paypal-payment',
  USER_STRIPE_CHECKOUT_SESSION: '/user/stripe-checkout-session',
  STRIPE_ORDER_PACKAGE: '/user/stripe-order-package',
  INITIATE_PAYSTACK: '/user/initiate-paystack-payment',
  INITIATE_IZYICO: '/user/initiate-iyzico-payment',
  INITIATE_RAZORPAY: '/user/initiate-razorpay-order',
  VERIFY_RAZORPAY: '/user/verify-razorpay-payment',
};

export interface InitiatePayPalResponse {
  approval_url: string;
  payment_id: string;
}

export interface StripeOrderResponse {
  package_id: number;
  package_title: string;
  transaction_id?: string;
}

export interface InitiatePaystackResponse {
  authorization_url: string;
  reference: string;
}

export interface InitiateIyzicoResponse {
  payment_page_url: string;
  conversation_id: string;
}

export interface InitiateRazorpayResponse {
  order_id: string;
  amount: number;
  currency: string;
  key: string;
}

class PackageService {
  /**
   * Get all packages (featured + job-apply) and current user status.
   * Uses GET /user/packages for featured + status; GET /user/packages/job-apply for job packages (correct API).
   */
  async getPackages(): Promise<ApiResponse<PackagesResponse>> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    const res = await apiService.get<any>(ENDPOINTS.PACKAGES, token);
    if (!res.success || res.data == null) {
      return res as ApiResponse<PackagesResponse>;
    }
    const raw = res.data;
    const inner =
      raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object'
        ? raw.data
        : raw;
    const defaultStatus: MyPackageStatus = {
      is_featured: false,
      featured_expires_at: null,
      current_job_package_id: null,
      job_package_expires_at: null,
      jobs_quota: 0,
      availed_jobs_quota: 0,
    };
    // Job packages: use dedicated endpoint GET /user/packages/job-apply (per API routes)
    const jobApplyRes = await apiService.get<any>(ENDPOINTS.PACKAGES_JOB_APPLY, token);
    let jobApplyList: JobApplyPackageItem[] = [];
    if (jobApplyRes.success && jobApplyRes.data != null) {
      const jobRaw = jobApplyRes.data;
      const arr = Array.isArray(jobRaw)
        ? jobRaw
        : Array.isArray((jobRaw as any)?.data)
          ? (jobRaw as any).data
          : Array.isArray((jobRaw as any)?.job_apply_packages)
            ? (jobRaw as any).job_apply_packages
            : Array.isArray((jobRaw as any)?.packages)
              ? (jobRaw as any).packages
              : [];
      jobApplyList = arr;
    }
    // Fallback: if main /user/packages response includes job_apply_packages, use when job endpoint returned nothing
    if (jobApplyList.length === 0) {
      const fromMain = inner?.job_apply_packages ?? (inner && typeof inner === 'object' ? (inner as any).job_packages ?? (inner as any).packages : undefined);
      if (Array.isArray(fromMain)) jobApplyList = fromMain;
    }
    const data: PackagesResponse = {
      featured_package: inner?.featured_package ?? null,
      job_apply_packages: jobApplyList,
      my_status: (inner?.my_status && typeof inner.my_status === 'object') ? inner.my_status : defaultStatus,
      packages_job_apply_enabled: !!(inner?.packages_job_apply_enabled),
    };
    return { success: true, data, message: res.message, statusCode: res.statusCode };
  }

  /**
   * Get featured package only.
   */
  async getFeaturedPackage(): Promise<ApiResponse<FeaturedPackageItem | null>> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    return apiService.get<FeaturedPackageItem | null>(ENDPOINTS.PACKAGES_FEATURED, token) as Promise<ApiResponse<FeaturedPackageItem | null>>;
  }

  /**
   * Get job-apply packages only.
   */
  async getJobApplyPackages(): Promise<ApiResponse<JobApplyPackageItem[]>> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    return apiService.get<JobApplyPackageItem[]>(ENDPOINTS.PACKAGES_JOB_APPLY, token) as Promise<ApiResponse<JobApplyPackageItem[]>>;
  }

  /**
   * Get my package status (quota, expiry, can_apply).
   */
  async getMyPackageStatus(): Promise<ApiResponse<MyPackageStatus>> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    return apiService.get<MyPackageStatus>(ENDPOINTS.PACKAGE_STATUS, token) as Promise<ApiResponse<MyPackageStatus>>;
  }

  /**
   * Get single package detail + payment gateways (for payment flow).
   */
  async getPackageDetail(id: number): Promise<ApiResponse<PackageDetail>> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    const res = await apiService.get<any>(ENDPOINTS.PACKAGE_DETAIL(id), token);
    if (!res.success || res.data == null) {
      return res as ApiResponse<PackageDetail>;
    }
    const raw = res.data;
    const inner = raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object' && 'payment_gateways' in raw.data ? raw.data : raw;
    const data: PackageDetail = {
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
    return { success: true, data, message: res.message, statusCode: res.statusCode };
  }

  /**
   * Activate free package (GET).
   */
  async orderFreePackage(id: number): Promise<ApiResponse<{ package_id: number; package_title: string; package_num_days: number; package_num_listings?: number; package_end_date: string | null; jobs_quota?: number | null }>> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    const res = await apiService.get<any>(ENDPOINTS.ORDER_FREE_PACKAGE(id), token);
    return res as ApiResponse<any>;
  }

  /**
   * Initiate PayPal payment. Returns approval_url to open in WebView.
   * POST /api/user/initiate-paypal-payment Body: { package_id }
   */
  async initiatePayPalPayment(packageId: number): Promise<ApiResponse<InitiatePayPalResponse>> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    const res = await apiService.post<InitiatePayPalResponse>(ENDPOINTS.INITIATE_PAYPAL, { package_id: packageId }, token);
    if (!res.success || !res.data) return res as ApiResponse<InitiatePayPalResponse>;
    const raw = res.data as any;
    const inner = raw?.data ?? raw;
    const approvalFromLinks = Array.isArray(inner?.links)
      ? inner.links.find((l: any) => (l?.rel || '').toLowerCase() === 'approval_url')?.href
      : undefined;
    const approvalUrl =
      inner?.approval_url ??
      inner?.approvalUrl ??
      inner?.redirect_url ??
      inner?.payment_url ??
      approvalFromLinks;
    const paymentId = inner?.payment_id ?? inner?.paymentId;
    return {
      success: true,
      data: { approval_url: approvalUrl, payment_id: paymentId },
      message: res.message,
      statusCode: res.statusCode,
    };
  }

  /**
   * Process Stripe payment with token from Stripe SDK.
   * POST /api/user/stripe-order-package Body: { package_id, stripe_token }
   */
  async stripeOrderPackage(packageId: number, stripeToken: string): Promise<ApiResponse<StripeOrderResponse>> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    const res = await apiService.post<any>(ENDPOINTS.STRIPE_ORDER_PACKAGE, { package_id: packageId, stripe_token: stripeToken }, token);
    if (!res.success) return res as ApiResponse<StripeOrderResponse>;
    const raw = res.data as any;
    const data = raw?.data ?? raw;
    return { success: true, data: data || {}, message: res.message, statusCode: res.statusCode };
  }

  /**
   * Create Stripe Checkout Session (hosted page) for jobseeker package payment.
   * POST /api/user/stripe-checkout-session Body: { package_id }
   */
  async createUserStripeCheckoutSession(packageId: number): Promise<ApiResponse<{ checkout_url: string }>> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    const res = await apiService.post<any>(ENDPOINTS.USER_STRIPE_CHECKOUT_SESSION, { package_id: packageId }, token);
    if (!res.success || !res.data) return res as ApiResponse<{ checkout_url: string }>;
    const raw = res.data as any;
    const inner = raw?.data ?? raw;
    const checkoutUrl = inner?.checkout_url ?? inner?.url;
    return {
      success: !!checkoutUrl,
      data: { checkout_url: checkoutUrl },
      message: res.message,
      statusCode: res.statusCode,
      error: checkoutUrl ? undefined : 'Missing checkout URL',
    };
  }

  /**
   * Initiate Paystack payment. Returns authorization_url to open in WebView.
   * POST /api/user/initiate-paystack-payment Body: { package_id }
   */
  async initiatePaystackPayment(packageId: number): Promise<ApiResponse<InitiatePaystackResponse>> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    const res = await apiService.post<any>(ENDPOINTS.INITIATE_PAYSTACK, { package_id: packageId }, token);
    if (!res.success || !res.data) return res as ApiResponse<InitiatePaystackResponse>;
    const raw = res.data as any;
    const inner = raw?.data ?? raw;
    const authUrl = inner?.authorization_url ?? inner?.authorizationUrl;
    const reference = inner?.reference;
    return {
      success: true,
      data: { authorization_url: authUrl, reference },
      message: res.message,
      statusCode: res.statusCode,
    };
  }

  /**
   * Initiate Iyzico payment. Returns payment_page_url to open in WebView.
   * POST /api/user/initiate-iyzico-payment Body: { package_id }
   */
  async initiateIyzicoPayment(packageId: number): Promise<ApiResponse<InitiateIyzicoResponse>> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    const res = await apiService.post<any>(ENDPOINTS.INITIATE_IZYICO, { package_id: packageId }, token);
    if (!res.success || !res.data) return res as ApiResponse<InitiateIyzicoResponse>;
    const raw = res.data as any;
    const inner = raw?.data ?? raw;
    const pageUrl = inner?.payment_page_url ?? inner?.paymentPageUrl;
    const conversationId = inner?.conversation_id ?? inner?.conversationId;
    return {
      success: true,
      data: { payment_page_url: pageUrl, conversation_id: conversationId },
      message: res.message,
      statusCode: res.statusCode,
    };
  }

  /**
   * Initiate Razorpay order. Returns order_id, key, amount, currency for Razorpay Checkout.
   * POST /api/user/initiate-razorpay-order Body: { package_id }
   */
  async initiateRazorpayOrder(packageId: number): Promise<ApiResponse<InitiateRazorpayResponse>> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    const res = await apiService.post<any>(ENDPOINTS.INITIATE_RAZORPAY, { package_id: packageId }, token);
    if (!res.success || !res.data) return res as ApiResponse<InitiateRazorpayResponse>;
    const raw = res.data as any;
    const inner = raw?.data ?? raw;
    return {
      success: true,
      data: {
        order_id: inner?.order_id ?? inner?.orderId,
        amount: inner?.amount ?? 0,
        currency: inner?.currency ?? 'INR',
        key: inner?.key ?? '',
      },
      message: res.message,
      statusCode: res.statusCode,
    };
  }

  /**
   * Verify Razorpay payment after user completes checkout.
   * POST /api/user/verify-razorpay-payment Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
   */
  async verifyRazorpayPayment(orderId: string, paymentId: string, signature: string): Promise<ApiResponse<{ package_id: number; package_title: string }>> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    const res = await apiService.post<any>(ENDPOINTS.VERIFY_RAZORPAY, {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    }, token);
    if (!res.success) return res as ApiResponse<{ package_id: number; package_title: string }>;
    const raw = res.data as any;
    const data = raw?.data ?? raw;
    return { success: true, data: data || {}, message: res.message, statusCode: res.statusCode };
  }
}

const packageService = new PackageService();
export default packageService;
