import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import CompanySidebar from './CompanySidebar';
import { useTranslation } from 'react-i18next';
import companyService from '../../services/companyService';
import CompanyBottomNav, { CompanyTabId, COMPANY_BOTTOM_NAV_CONTENT_INSET } from './CompanyBottomNav';

interface CompanyPaymentHistoryProps {
  onBack: () => void;
  onTabPress?: (tab: CompanyTabId) => void;
  onCompanyMenuPress?: (key: string) => void;
  onLogout?: () => void;
  chatUnreadCount?: number;
  menuCompanyName?: string;
  menuCompanyLogo?: string;
}

interface PaymentItem {
  id: number;
  package_title?: string;
  package_type?: string;
  package_price?: number;
  currency?: string;
  payment_method?: string;
  assigned_by?: number | null;
  payment_status?: string;
  transaction_id?: string | null;
  package_start_date?: string | null;
  package_end_date?: string | null;
  jobs_quota?: number;
  cvs_quota?: number;
  created_at?: string | null;
}

const DEFAULT_CURRENCY = 'USD';

const CompanyPaymentHistory: React.FC<CompanyPaymentHistoryProps> = ({
  onBack,
  onTabPress,
  onCompanyMenuPress,
  onLogout,
  chatUnreadCount = 0,
  menuCompanyName,
  menuCompanyLogo,
}) => {
  const { t } = useTranslation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [stats, setStats] = useState<{ total_payments?: number; total_spent?: number; completed_payments?: number } | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<PaymentItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadData = useCallback(async (p = 1, append = false) => {
    try {
      setError(null);
      if (p === 1) setLoading(true);
      if (false) console.log('[CompanyPaymentHistory] loadData page=', p);
      const res = await companyService.getPaymentHistory(p, 15);
      const data = (res as any)?.data ?? (res as any)?.message ?? res;
      const list = Array.isArray(data?.payments)
        ? data.payments
        : Array.isArray(data?.orders)
          ? data.orders
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [];
      if (false) {
        console.log('[CompanyPaymentHistory] after parse:', {
          success: (res as any)?.success,
          statusCode: (res as any)?.statusCode,
          listLength: list.length,
          dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
          firstItemKeys: list[0] && typeof list[0] === 'object' ? Object.keys(list[0]) : [],
        });
      }
      setPayments(append ? (prev) => [...prev, ...list] : list);
      const pag = data?.pagination;
      setHasMore(!!(pag && pag.current_page < pag.last_page));
      if (!(res as any)?.success && list.length === 0) {
        const errMsg = (res as any)?.message ?? (res as any)?.error ?? t('something_went_wrong');
        setError(typeof errMsg === 'string' ? errMsg : t('something_went_wrong'));
      }
    } catch (e) {
      if (false) console.warn('[CompanyPaymentHistory] loadData error:', e);
      setError(t('something_went_wrong'));
      setPayments(append ? (prev) => prev : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  const loadStats = useCallback(async () => {
    try {
      const res = await companyService.getCompanyPaymentStats();
      const data = (res as any)?.data ?? (res as any)?.message ?? res;
      if (data && typeof data === 'object') setStats(data);
    } catch {
      setStats(null);
    }
  }, []);

  useEffect(() => {
    loadData(1);
    loadStats();
  }, [loadData, loadStats]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadData(1);
    loadStats();
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadData(next, true);
  };

  const openOrderDetail = async (orderId: number) => {
    setSelectedOrderId(orderId);
    setOrderDetail(null);
    setLoadingDetail(true);
    try {
      const res = await companyService.getCompanyOrderDetails(orderId);
      const data = (res as any)?.data ?? (res as any)?.message ?? res;
      if (data && typeof data === 'object') setOrderDetail(data as PaymentItem);
    } catch {
      setOrderDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatPrice = (item: PaymentItem) => {
    const c = (item.currency ?? 'USD').toString().toUpperCase();
    const p = item.package_price ?? 0;
    return `${c} ${Number(p).toFixed(2)}`;
  };

  const formatDate = (s: string | null | undefined) => {
    if (!s) return t('not_available');
    try {
      return new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(s);
    }
  };

  const formatDateShort = (s: string | null | undefined) => {
    if (!s) return t('not_available');
    try {
      const d = new Date(s);
      const day = d.getDate();
      const month = d.toLocaleString(undefined, { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month}, ${year}`;
    } catch {
      return String(s);
    }
  };

  const getPaymentSourceLabel = (item: PaymentItem): string => {
    const method = item.payment_method?.trim();
    if (method) return method;
    if (item.assigned_by) return t('assigned_by_admin');
    return t('admin_assign');
  };

  const getPackageTypeLabel = (item: PaymentItem): string => {
    const pt = (item.package_type ?? '').toLowerCase();
    if (pt && (pt === 'job' || pt === 'job_package' || pt === 'jobs')) return t('job_package');
    if (pt && (pt === 'cv' || pt === 'cv_search' || pt === 'cv_search_package' || pt === 'cvs')) return t('cv_search_package');
    const jobs = item.jobs_quota ?? 0;
    const cvs = item.cvs_quota ?? 0;
    if (jobs > 0 && cvs > 0) return `${t('job_package')} / ${t('cv_search_package')}`;
    if (jobs > 0) return t('job_package');
    if (cvs > 0) return t('cv_search_package');
    return t('package_type') || 'Package';
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return '#64748B';
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'success') return '#17D27C';
    if (s === 'pending') return '#F59E0B';
    if (s === 'failed' || s === 'cancelled') return '#EF4444';
    return '#64748B';
  };

  return (
    <View style={styles.container}>
      <Header
        title={t('payment_history')}
        onBack={onBack}
        showBack
        onMenuPress={() => setSidebarVisible(true)}
      />

      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#17D27C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.heroBanner}
      >
        <MaterialIcons name="receipt-long" size={28} color="#fff" style={styles.heroIcon} />
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>{t('package_purchase_history') || 'Package Purchase History'}</Text>
          <Text style={styles.heroSubtitle}>
            {t('package_purchase_history_subtitle') || 'View all your package purchases and transaction details'}
          </Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#17D27C" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#17D27C']} />
          }
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {stats != null && (stats.total_payments != null || stats.total_spent != null) ? (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.total_payments ?? 0}</Text>
                <Text style={styles.statLabel}>{t('total_transactions') || 'Total transactions'}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, styles.statAmount]}>
                  {(() => {
                    const currency = payments[0]?.currency ?? DEFAULT_CURRENCY;
                    return `${String(currency).toUpperCase()} ${(stats.total_spent ?? 0).toFixed(2)}`;
                  })()}
                </Text>
                <Text style={styles.statLabel}>{t('total_spent') || 'Total spent'}</Text>
              </View>
            </View>
          ) : null}

          {payments.length === 0 ? (
            <View style={styles.empty}>
              <MaterialIcons name="inventory-2" size={64} color="#ccc" />
              <Text style={styles.emptyText}>{t('no_payment_history')}</Text>
            </View>
          ) : (
            <>
              {payments.map((item, idx) => (
                <TouchableOpacity
                  key={item.id ?? idx}
                  style={styles.card}
                  onPress={() => openOrderDetail(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardLeftBorder} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardRow1}>
                      <View style={styles.cardTitleRow}>
                        <MaterialIcons name="inventory-2" size={20} color="#8B5CF6" style={styles.cardPackageIcon} />
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.package_title ?? t('package')}
                        </Text>
                      </View>
                      <View style={styles.packageTypePill}>
                        <Text style={styles.packageTypePillText}>{getPackageTypeLabel(item)}</Text>
                      </View>
                      <LinearGradient
                        colors={['#6366F1', '#8B5CF6', '#17D27C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.pricePill}
                      >
                        <MaterialIcons name="sell" size={16} color="#fff" />
                        <Text style={styles.pricePillText}>{formatPrice(item)}</Text>
                      </LinearGradient>
                    </View>
                    <View style={styles.cardPaymentRow}>
                      <MaterialIcons name="payment" size={18} color="#64748B" style={styles.cardPaymentIcon} />
                      <Text style={styles.cardPaymentLabel}>{t('payment') || 'Payment'}: </Text>
                      <Text style={styles.cardPaymentMethod} numberOfLines={1}>
                        {getPaymentSourceLabel(item)}
                      </Text>
                    </View>
                    <View style={styles.cardRow2}>
                      <View style={styles.cardDetailItem}>
                        <MaterialIcons name="work-outline" size={18} color="#17D27C" />
                        <Text style={styles.cardDetailText}>
                          {t('jobs') || 'Jobs'}: {item.jobs_quota ?? 0}
                        </Text>
                      </View>
                      <View style={styles.cardDetailItem}>
                        <MaterialIcons name="event-available" size={18} color="#17D27C" />
                        <Text style={styles.cardDetailText}>
                          {t('start') || 'Start'}: {formatDateShort(item.package_start_date)}
                        </Text>
                      </View>
                      <View style={styles.cardDetailItem}>
                        <MaterialIcons name="event-busy" size={18} color="#17D27C" />
                        <Text style={styles.cardDetailText}>
                          {t('expires') || 'Expires'}: {formatDateShort(item.package_end_date)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#94A3B8" style={styles.cardArrow} />
                </TouchableOpacity>
              ))}
              {hasMore && (
                <TouchableOpacity style={styles.loadMore} onPress={loadMore}>
                  <Text style={styles.loadMoreText}>{t('load_more')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {onTabPress ? (
        <CompanyBottomNav
          activeTab="home"
          onTabPress={(tab) => {
            if (tab === 'home') onBack();
            else onTabPress(tab);
          }}
          chatUnreadCount={chatUnreadCount}
        />
      ) : null}

      <CompanySidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onMenuItemPress={(key) => {
          setSidebarVisible(false);
          onCompanyMenuPress?.(key);
        }}
        onLogout={onLogout ?? (() => {})}
        companyName={menuCompanyName}
        companyLogo={menuCompanyLogo}
      />

      <Modal visible={selectedOrderId != null} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedOrderId(null)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('order_details')}</Text>
              <TouchableOpacity onPress={() => setSelectedOrderId(null)}>
                <MaterialIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            {loadingDetail ? (
              <ActivityIndicator size="small" color="#17D27C" style={styles.modalLoader} />
            ) : orderDetail ? (
              <ScrollView style={styles.detailScroll}>
                <DetailRow label={t('package')} value={orderDetail.package_title ?? t('not_available')} />
                <DetailRow label={t('package_type') || 'Package type'} value={getPackageTypeLabel(orderDetail)} />
                <DetailRow label={t('amount')} value={formatPrice(orderDetail)} />
                <DetailRow label={t('payment_method')} value={getPaymentSourceLabel(orderDetail)} />
                <DetailRow label={t('status')} value={orderDetail.payment_status ?? t('not_available')} />
                <DetailRow label={t('date')} value={formatDate(orderDetail.created_at)} />
                {orderDetail.package_start_date ? (
                  <DetailRow label={t('start_date')} value={orderDetail.package_start_date} />
                ) : null}
                {orderDetail.package_end_date ? (
                  <DetailRow label={t('end_date')} value={orderDetail.package_end_date} />
                ) : null}
                {orderDetail.jobs_quota != null && orderDetail.jobs_quota > 0 ? (
                  <DetailRow label={t('jobs_quota')} value={String(orderDetail.jobs_quota)} />
                ) : null}
                {orderDetail.cvs_quota != null && orderDetail.cvs_quota > 0 ? (
                  <DetailRow label={t('cvs_quota')} value={String(orderDetail.cvs_quota)} />
                ) : null}
              </ScrollView>
            ) : (
              <Text style={styles.detailEmpty}>{t('something_went_wrong')}</Text>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: { marginBottom: 12 },
  label: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  value: { fontSize: 15, color: '#1E293B', fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748' },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroIcon: { marginRight: 14 },
  heroTextWrap: { flex: 1 },
  heroTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 + COMPANY_BOTTOM_NAV_CONTENT_INSET },
  errorBanner: { marginHorizontal: 16, marginTop: 12, padding: 12, backgroundColor: '#FEE2E2', borderRadius: 8 },
  errorText: { color: '#B91C1C', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#2D3748' },
  statAmount: { color: '#17D27C' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, color: '#718096', marginTop: 12 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingLeft: 0,
    paddingVertical: 16,
    paddingRight: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  cardLeftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#8B5CF6',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  cardBody: { marginLeft: 16 },
  cardRow1: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 100,
  },
  cardPackageIcon: { marginRight: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', flex: 1 },
  packageTypePill: {
    backgroundColor: '#E0E7FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  packageTypePillText: { fontSize: 12, fontWeight: '600', color: '#4338CA' },
  cardPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 4,
  },
  cardPaymentIcon: { marginRight: 6 },
  cardPaymentLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  cardPaymentMethod: { fontSize: 13, color: '#1E293B', flex: 1, fontWeight: '500' },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  pricePillText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  cardRow2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  cardDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDetailText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  cardArrow: { position: 'absolute', right: 12, top: '50%', marginTop: -11 },
  loadMore: { padding: 16, alignItems: 'center' },
  loadMoreText: { fontSize: 15, color: '#2E5CD0', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748' },
  modalLoader: { marginVertical: 24 },
  detailScroll: { padding: 16 },
  detailEmpty: { padding: 16, color: '#64748B', textAlign: 'center' },
});

export default CompanyPaymentHistory;
