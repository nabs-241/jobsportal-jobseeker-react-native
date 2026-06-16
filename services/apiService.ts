import API_CONFIG, { buildApiUrl, getCommonHeaders, getAuthHeader } from '../config/api';

// API Response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
}

// API Request options interface
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  token?: string;
  timeout?: number;
}

// API Service class
class ApiService {
  private baseUrl: string;
  private defaultTimeout: number = 30000; // 30 seconds

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  /**
   * Make HTTP request to API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      token,
      timeout = this.defaultTimeout
    } = options;

    const url = buildApiUrl(endpoint);
    const requestHeaders = getCommonHeaders(token);

    // Merge custom headers
    Object.assign(requestHeaders, headers);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        return {
          success: false,
          error: `Server returned non-JSON response (${response.status})`,
          statusCode: response.status,
        };
      }

      const responseData = await response.json();

      const payloadSuccess =
        typeof responseData.success === 'boolean' ? responseData.success : undefined;
      const success =
        payloadSuccess !== undefined ? payloadSuccess && response.ok : response.ok;

      return {
        success,
        data: responseData.data ?? responseData,
        message: responseData.message,
        error: responseData.error,
        statusCode: response.status,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
          statusCode: 408,
        };
      }

      return {
        success: false,
        error: error.message || 'Network error',
        statusCode: 0,
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, token?: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET', token });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data: any, token?: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'POST', body: data, token });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data: any, token?: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'PUT', body: data, token });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data: any, token?: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'PATCH', body: data, token });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, token?: string, body?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE', token, body });
  }

  /**
   * Upload file
   */
  async uploadFile<T>(
    endpoint: string,
    file: File | FormData,
    token?: string,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint);
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = getAuthHeader(token);
    }

    // Don't set Content-Type for FormData (browser will set it with boundary)
    if (!(file instanceof FormData)) {
      headers['Content-Type'] = 'multipart/form-data';
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: file,
      });

      const responseData = await response.json();

      return {
        success: response.ok,
        data: responseData.data || responseData,
        message: responseData.message,
        error: responseData.error,
        statusCode: response.status,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Upload failed',
        statusCode: 0,
      };
    }
  }

  /**
   * Handle API errors
   */
  handleError(response: ApiResponse): string {
    if (response.error) {
      return response.error;
    }

    switch (response.statusCode) {
      case 400:
        return 'Bad request. Please check your input.';
      case 401:
        return 'Unauthorized. Please login again.';
      case 403:
        return 'Access denied. You don\'t have permission.';
      case 404:
        return 'Resource not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return 'An unexpected error occurred.';
    }
  }

  /**
   * Check if response is successful
   */
  isSuccess(response: ApiResponse): boolean {
    return response.success && response.statusCode >= 200 && response.statusCode < 300;
  }
}

// Create and export singleton instance
const apiService = new ApiService();
export default apiService;

// Export commonly used methods for convenience
export const {
  get,
  post,
  put,
  patch,
  delete: deleteRequest,
  uploadFile,
  handleError,
  isSuccess,
} = apiService; 