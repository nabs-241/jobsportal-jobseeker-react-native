// API Configuration for Jobs Portal App
// Base URL and common API constants
const getI18nLanguage = (): string => {
  try { return (require('../i18n').default?.language) || 'en'; } catch { return 'en'; }
};

export const API_CONFIG = {
  // Base API URL (includes /api). Used for ALL requests: candidate and company.
  // buildApiUrl(endpoint) produces BASE_URL + endpoint, e.g. .../api/company-home, .../api/login
  BASE_URL: 'https://www.sharjeelanjum.com/demos/jobsportal-update/api',

  // API Endpoints
  ENDPOINTS: {
    // Authentication endpoints (for job seekers)
    AUTH: {
      LOGIN: '/login',
      REGISTER: '/register',
      LOGOUT: '/auth/logout',
      REFRESH_TOKEN: '/auth/refresh-token',
      FORGOT_PASSWORD: '/forgot-password',
      RESET_PASSWORD: '/auth/reset-password',
      // New code-based password reset endpoints
      VERIFY_RESET_CODE: '/verify-reset-code',
      RESET_PASSWORD_WITH_CODE: '/reset-password',
    },


    // Job Seeker specific endpoints
    SEEKER: {
      PROFILE: '/seeker/profile',
      UPDATE_PROFILE: '/seeker/profile/update',
      RESUME: '/seeker/resume',
      UPLOAD_RESUME: '/seeker/resume/upload',
      APPLICATIONS: '/seeker/applications',
      SAVED_JOBS: '/seeker/saved-jobs',
      APPLY_JOB: '/seeker/jobs/apply',
      SEARCH_JOBS: '/seeker/jobs/search',
      JOB_DETAILS: '/seeker/jobs',
      // Add the endpoints used in EditProfile
      MY_PROFILE: '/my-profile',
      UPLOAD_PROFILE_IMAGE: '/upload/profile-image',
      // Add other job seeker endpoints
      MY_JOB_APPLICATIONS: '/my-job-applications',
      MY_FAVOURITE_JOBS: '/my-favourite-jobs',
      REMOVE_FROM_FAVOURITE_JOB: '/remove-from-favourite-job',
      MY_FOLLOWINGS: '/my-followings',
      REMOVE_FROM_FAVOURITE_COMPANY: '/remove-from-favourite-company',
      MY_ALERTS: '/my-alerts',
      DELETE_ALERT: '/delete-alert',
      CREATE_ALERT: '/create-alert',
    },

    // Company specific endpoints
    COMPANY: {
      LOGIN: '/login', // POST with user_type: 'company'
      REGISTER: '/company-register',
      FORGOT_PASSWORD: '/company-forgot-password',
      VERIFY_RESET_CODE: '/company-verify-reset-code',
      RESET_PASSWORD: '/company-reset-password',
      PROFILE: '/company-profile',
      HOME: '/company-home',
      POSTED_JOBS: '/posted-jobs',
      COMPANY_PACKAGES: '/company-packages',
      COMPANY_JOB_PACKAGES: '/company-job-packages',
      UPDATE_PROFILE: '/update-company-profile',
      JOB_POSTINGS: '/company/jobs',
      CREATE_JOB: '/company/jobs/create',
      UPDATE_JOB: '/company/jobs/update',
      DELETE_JOB: '/company/jobs/delete',
      APPLICATIONS: '/company/applications',
      CANDIDATES: '/company/candidates',
      ANALYTICS: '/company/analytics',
    },

    // Job related endpoints
    JOBS: {
      LIST: '/jobs',
      DETAIL: '/job',
      APPLY: '/apply-job',
      COMPANY_JOBS: '/company-jobs', // New endpoint for company-specific jobs
    },

    // Common endpoints
    COMMON: {
      JOBS: '/jobs',
      COMPANIES: '/companies',
      NOTIFICATIONS: '/notifications',
      UPLOAD_FILE: '/upload',
      MASTER_DATA: '/master',
      PAYMENT_HISTORY: '/payments',
      USER_PAYMENT_HISTORY: '/user/payment-history',
      // Add master data endpoints used in EditProfile
      MASTER_DATA_ALL: '/master-data/all',
      MASTER_DATA_GENDERS: '/master-data/genders',
      MASTER_DATA_MARITAL_STATUSES: '/master-data/marital-statuses',
      MASTER_DATA_COUNTRIES: '/master-data/countries',
      MASTER_DATA_STATES: '/master-data/states',
      MASTER_DATA_CITIES: '/master-data/cities',
      MASTER_DATA_JOB_EXPERIENCES: '/master-data/job-experiences',
      MASTER_DATA_CAREER_LEVELS: '/master-data/career-levels',
      MASTER_DATA_INDUSTRIES: '/master-data/industries',
      MASTER_DATA_FUNCTIONAL_AREAS: '/master-data/functional-areas',
      // Add other common endpoints
      PUBLIC_HOME_DATA: '/public-home-data',
      HOME_DASHBOARD: '/home-dashboard',
    },

    // Asset URLs
    ASSETS: {
      COMPANY_LOGOS: '/company_logos',
      USER_IMAGES: '/user_images',
      ADMIN_ASSETS: '/admin_assets',
    },
    // Language and Translation endpoints
    LANGUAGES: {
      LIST: '/languages',
      TRANSLATIONS: '/translations', // Will be appended with /{lang}
    },
  },

  // HTTP Headers
  HEADERS: {
    CONTENT_TYPE: 'application/json',
    ACCEPT: 'application/json',
    AUTHORIZATION: 'Bearer', // Will be appended with actual token
  },

  // API Response Status Codes
  STATUS_CODES: {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },

  // Packages: fallback currency only when backend sends empty (app shows API currency e.g. EUR when set)
  PACKAGES_DEFAULT_CURRENCY: 'EUR',
  // If set, only show these job package IDs (e.g. [1] for "Basic Jobs View"). Use when API returns extra packages.
  PACKAGES_JOB_ALLOWED_IDS: undefined as number[] | undefined,
  // Base URL for web payment (e.g. 'https://yoursite.com'). In-app WebView loads {PACKAGES_ORDER_WEB_BASE}/order-package/{id} for paid packages.
  PACKAGES_ORDER_WEB_BASE: undefined as string | undefined,
  // When the payment WebView navigates to a URL containing this string, payment is treated as success and WebView closes (e.g. 'paypal-execute', 'payment-status').
  PACKAGES_PAYMENT_SUCCESS_URL_CONTAINS: 'paypal-execute',
  // Optional: array of URL substrings that indicate payment success (WebView close + refresh). If set, overrides single string above.
  PACKAGES_PAYMENT_SUCCESS_URL_PATTERNS: [
    'paypal-execute',
    'payment-status',
    'paystack-callback',
    'iyzico-callback',
    'payment-success',
    'order-success',
    'razorpay',
    'success',
  ] as string[] | undefined,

  // Rate limiting
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1000,
  },

  // File upload limits
  FILE_UPLOADS: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
  },
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

/**
 * Base URL for chat attachment files.
 * Backend stores files in public/chat/attachments (not storage), so this URL serves from there.
 * Example: https://www.sharjeelanjum.com/demos/jobsportal-update/chat/attachments
 */
export const getChatAttachmentsBaseUrl = (): string => {
  const base = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '');
  return `${base}/chat/attachments`;
};

// Helper function to build asset URL
export const buildAssetUrl = (assetPath: string): string => {
  return `${API_CONFIG.BASE_URL.replace('/api', '')}${assetPath}`;
};

// Helper function to build company logo URL
export const buildCompanyLogoUrl = (logoPath: string): string => {
  if (!logoPath) return '';
  return buildAssetUrl(`/company_logos/${logoPath}`);
};

// Helper function to build user image URL
export const buildUserImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  return buildAssetUrl(`/user_images/${imagePath}`);
};

// Helper function to build admin asset URL
export const buildAdminAssetUrl = (assetPath: string): string => {
  return buildAssetUrl(`/admin_assets/${assetPath}`);
};

// Helper function to get authorization header
export const getAuthHeader = (token: string): string => {
  return `${API_CONFIG.HEADERS.AUTHORIZATION} ${token}`;
};

export const getCommonHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': API_CONFIG.HEADERS.CONTENT_TYPE,
    'Accept': API_CONFIG.HEADERS.ACCEPT,
    'Accept-Language': getI18nLanguage(),
  };

  if (token) {
    headers['Authorization'] = getAuthHeader(token);
  }

  return headers;
};

// API Error Messages
export const API_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied. You don\'t have permission for this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  TIMEOUT_ERROR: 'Request timeout. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

// API Success Messages
export const API_SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  REGISTER_SUCCESS: 'Registration successful!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  JOB_APPLIED: 'Job application submitted successfully!',
  JOB_POSTED: 'Job posted successfully!',
  JOB_UPDATED: 'Job updated successfully!',
  JOB_DELETED: 'Job deleted successfully!',
  RESUME_UPLOADED: 'Resume uploaded successfully!',
  LOGOUT_SUCCESS: 'Logged out successfully!',
};

export default API_CONFIG; 