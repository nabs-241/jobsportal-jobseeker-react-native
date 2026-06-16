import apiService, { ApiResponse } from './apiService';
import { getAuthToken } from './authStorage';
import { API_CONFIG } from '../config/api';

export interface PaymentHistoryItem {
  id: number;
  package_id: number;
  package_title: string;
  package_type: string; // 'job_seeker' | 'featured_profile'
  package_price: number;
  currency: string;
  payment_method: string;
  transaction_id?: string | null;
  payment_status: string;
  package_start_date: string | null;
  package_end_date: string | null;
  jobs_quota: number;
  cvs_quota: number;
  created_at: string;
}

export interface PaymentHistoryResponse {
  payments: PaymentHistoryItem[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

const ENDPOINT = (API_CONFIG.ENDPOINTS.COMMON as { USER_PAYMENT_HISTORY?: string }).USER_PAYMENT_HISTORY || '/user/payment-history';

class PaymentHistoryService {
  /**
   * Get user payment history (list of purchased/assigned packages).
   * GET /api/user/payment-history
   */
  async getPaymentHistory(params?: {
    per_page?: number;
    package_type?: string;
    payment_method?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<ApiResponse<PaymentHistoryResponse>> {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Unauthorized', statusCode: 401 };
    }
    const query = new URLSearchParams();
    if (params?.per_page != null) query.set('per_page', String(params.per_page));
    if (params?.package_type) query.set('package_type', params.package_type);
    if (params?.payment_method) query.set('payment_method', params.payment_method);
    if (params?.date_from) query.set('date_from', params.date_from);
    if (params?.date_to) query.set('date_to', params.date_to);
    const path = query.toString() ? `${ENDPOINT}?${query.toString()}` : ENDPOINT;
    const res = await apiService.get<any>(path, token);
    if (!res.success || res.data == null) {
      return res as ApiResponse<PaymentHistoryResponse>;
    }
    const raw = res.data;
    const inner = raw && typeof raw === 'object' && raw.payments ? raw : (raw?.data ?? raw);
    const payments = Array.isArray(inner?.payments) ? inner.payments : [];
    const pagination = inner?.pagination && typeof inner.pagination === 'object'
      ? inner.pagination
      : { current_page: 1, last_page: 1, per_page: 15, total: payments.length };
    return {
      success: true,
      data: { payments, pagination },
      message: res.message,
      statusCode: res.statusCode,
    };
  }
}

export default new PaymentHistoryService();
