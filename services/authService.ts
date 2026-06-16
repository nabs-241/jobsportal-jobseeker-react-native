import apiService, { ApiResponse } from './apiService';
import API_CONFIG from '../config/api';

// Authentication interfaces
export interface LoginRequest {
  email: string;
  password: string;
  user_type: 'seeker' | 'company';
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface CompanyRegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  terms_of_use: boolean;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    user_type: 'seeker' | 'company';
    first_name?: string;
    last_name?: string;
    company_name?: string;
    industry?: string;
    phone?: string;
    created_at: string;
    updated_at: string;
  };
  expires_at: string;
}

export interface VerifyEmailCodeRequest {
  email: string;
  verification_code: string;
}

export interface ResendVerificationCodeRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  password_confirmation: string;
}

// Authentication Service
class AuthService {
  /**
   * User login
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    // Use the same login endpoint for both seekers and companies
    const endpoint = API_CONFIG.ENDPOINTS.AUTH.LOGIN;
    
    return apiService.post<AuthResponse>(endpoint, credentials);
  }

  /**
   * User registration (job seeker)
   */
  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return apiService.post<AuthResponse>('/register', userData);
  }

  /**
   * Company registration
   * Returns { token, name } - no email verification
   */
  async companyRegister(userData: CompanyRegisterRequest): Promise<ApiResponse<{ token: string; name: string }>> {
    return apiService.post<{ token: string; name: string }>(
      API_CONFIG.ENDPOINTS.COMPANY.REGISTER,
      { ...userData, terms_of_use: userData.terms_of_use ? 1 : 0 }
    );
  }

  /**
   * User logout
   */
  async logout(token: string): Promise<ApiResponse<void>> {
    return apiService.post<void>(
      API_CONFIG.ENDPOINTS.AUTH.LOGOUT,
      {},
      token
    );
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
    return apiService.post<AuthResponse>(
      API_CONFIG.ENDPOINTS.AUTH.REFRESH_TOKEN,
      { refresh_token: refreshToken }
    );
  }

  /**
   * Forgot password
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse<void>> {
    return apiService.post<void>(
      API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD,
      data
    );
  }

  /**
   * Reset password
   */
  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<void>> {
    return apiService.post<void>(
      API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD,
      data
    );
  }

  /**
   * Verify email code
   */
  async verifyEmailCode(data: VerifyEmailCodeRequest): Promise<ApiResponse<AuthResponse>> {
    return apiService.post<AuthResponse>(
      '/verify-email-code',
      data
    );
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(data: ResendVerificationCodeRequest): Promise<ApiResponse<void>> {
    return apiService.post<void>(
      '/resend-verification-code',
      data
    );
  }

  /**
   * Validate token
   */
  async validateToken(token: string): Promise<ApiResponse<{ valid: boolean }>> {
    // You can implement token validation by making a request to a protected endpoint
    // or create a specific validation endpoint
    try {
      const response = await apiService.get('/user/profile', token);
      return {
        success: response.success,
        data: { valid: response.success },
        statusCode: response.statusCode,
      };
    } catch (error) {
      return {
        success: false,
        data: { valid: false },
        statusCode: 401,
      };
    }
  }
}

// Create and export singleton instance
const authService = new AuthService();
export default authService;

// Export commonly used methods for convenience
export const {
  login,
  register,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  validateToken,
} = authService; 