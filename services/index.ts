// API Services
export { default as apiService } from './apiService';
export { default as authService } from './authService';
export { languageService } from './languageService';
export { default as jobsService } from './jobsService';
export { default as userService } from './userService';
export { default as cvCompletenessService } from './cvCompletenessService';
export { default as notificationService } from './notificationService';
export { default as jobMatchNotificationService } from './jobMatchNotificationService';
export { default as applicationNotificationService } from './applicationNotificationService';
export { default as companyFollowNotificationService } from './companyFollowNotificationService';
export { default as profileCompletionNotificationService } from './profileCompletionNotificationService';
export { default as resumeUpdateNotificationService } from './resumeUpdateNotificationService';
export { default as jobRecommendationNotificationService } from './jobRecommendationNotificationService';
export { default as securityAlertNotificationService } from './securityAlertNotificationService';
export { default as appUpdateNotificationService } from './appUpdateNotificationService';
export { default as packageService } from './packageService';
export { default as paymentHistoryService } from './paymentHistoryService';
export { default as companyService } from './companyService';
export { default as chatService } from './chatService';

// Re-export commonly used types and methods
export type { ApiResponse, ApiRequestOptions } from './apiService';
export type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest
} from './authService';
export type { PaymentHistoryItem, PaymentHistoryResponse } from './paymentHistoryService';
export type {
  CompanyHomeData,
  CompanyProfile,
  PostedJob,
  SuggestedCandidate,
  CompanyJobPackage,
  CompanyCvPackage
} from './companyService';
export type {
  Job,
  JobSearchParams,
  JobSearchResponse,
  JobApplication,
  ApplyJobRequest,
  SavedJob
} from './jobsService';
export type { UserProfile } from './userService';
export type { CVCompletenessResult } from './cvCompletenessService';
export type { NotificationData, NotificationPreferences } from './notificationService';
export { NotificationType } from './notificationService';

// Re-export helper functions
export {
  buildApiUrl,
  getAuthHeader,
  getCommonHeaders
} from '../config/api';
export {
  API_CONFIG,
  API_ERROR_MESSAGES,
  API_SUCCESS_MESSAGES
} from '../config/api'; 