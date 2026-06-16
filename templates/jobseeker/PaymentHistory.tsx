import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import Sidebar from '../Sidebar';
import Navigation from '../Navigation';
import { handleNavigation, NavigationFunctions } from '../../utils/navigationHandler';
import { useTranslation } from 'react-i18next';
import { paymentHistoryService, API_CONFIG } from '../../services';
import type { PaymentHistoryItem } from '../../services/paymentHistoryService';

interface PaymentHistoryProps {
  onMenuPress: () => void;
  onBack?: () => void;
  onLogout?: () => void;
  messageUnreadCount?: number;
  onNavigateToJobDetail?: (jobSlug: string) => void;
  onNavigateToJobAlerts?: () => void;
  onNavigateToMyFollowings?: () => void;
  onNavigateToEditProfile?: () => void;
  onNavigateToBuildResume?: () => void;
  onNavigateToMyApplications?: () => void;
  onNavigateToFavouriteJobs?: () => void;
  onNavigateToJobSearch?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToCompanies?: () => void;
  onNavigateToPackages?: () => void;
  onNavigateToPaymentHistory?: () => void;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  onBack,
  onLogout,
  messageUnreadCount = 0,
  onNavigateToJobDetail,
  onNavigateToJobAlerts,
  onNavigateToMyFollowings,
  onNavigateToEditProfile,
  onNavigateToBuildResume,
  onNavigateToMyApplications,
  onNavigateToFavouriteJobs,
  onNavigateToJobSearch,
  onNavigateToProfile,
  onNavigateToMessages,
  onNavigateToCompanies,
  onNavigateToPackages,
  onNavigateToPaymentHistory,
}) => {
  const { t } = useTranslation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);

  const formatPrice = (price: number, currency: string | undefined | null) => {
    const defaultCurrency = (API_CONFIG as any).PACKAGES_DEFAULT_CURRENCY;
    const c = (currency && currency.trim()) || defaultCurrency || 'USD';
    const sym = c === 'USD' ? '$' : c === 'EUR' ? '€' : c;
    return `${sym}${price}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getDurationDays = (start: string | null, end: string | null): number | null => {
    if (!start || !end) return null;
    try {
      const a = new Date(start).getTime();
      const b = new Date(end).getTime();
      return Math.round((b - a) / (24 * 60 * 60 * 1000));
    } catch {
      return null;
    }
  };

  const isActive = (endDate: string | null): boolean => {
    if (!endDate) return false;
    try {
      return new Date(endDate) >= new Date();
    } catch {
      return false;
    }
  };

  const isAdminAssigned = (paymentMethod: string): boolean => {
    const method = (paymentMethod || '').toLowerCase();
    return method.includes('admin') || method.includes('assign');
  };

  const loadHistory = useCallback(async () => {
    const res = await paymentHistoryService.getPaymentHistory({ per_page: 50 });
    if (res.success && res.data) {
      setPayments(res.data.payments || []);
      setError(null);
    } else {
      setError(res.error || t('something_went_wrong'));
      setPayments([]);
    }
  }, [t]);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    await loadHistory();
    setLoading(false);
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const navigationFunctions: NavigationFunctions = {
    onNavigateToJobDetail,
    onNavigateToJobAlerts,
    onNavigateToMyFollowings,
    onNavigateToEditProfile,
    onNavigateToBuildResume,
    onNavigateToMyApplications,
    onNavigateToFavouriteJobs,
    onNavigateToJobSearch,
    onNavigateToProfile,
    onNavigateToMessages,
    onNavigateToCompanies,
    onNavigateToPackages,
  };

  if (loading && payments.length === 0) {
    return (
      <View style={styles.container}>
        <Header
          title={t('payment_history')}
          onMenuPress={() => setSidebarVisible(true)}
          onBack={onBack}
          showBack={!!onBack}
        />
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>{t('loading')}...</Text>
        </View>
      </View>
    );
  }

  if (error && payments.length === 0) {
    return (
      <View style={styles.container}>
        <Header
          title={t('payment_history')}
          onMenuPress={() => setSidebarVisible(true)}
          onBack={onBack}
          showBack={!!onBack}
        />
        <View style={styles.centerWrap}>
          <MaterialIcons name="error-outline" size={56} color="#94A3B8" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchHistory}>
            <Text style={styles.retryButtonText}>{t('try_again')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={t('payment_history')}
        onMenuPress={() => setSidebarVisible(true)}
        onBack={onBack}
        showBack={!!onBack}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
        }
      >
        {payments.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="history" size={48} color="#CBD5E1" />
            <Text style={styles.emptyCardText}>{t('no_payment_history')}</Text>
          </View>
        ) : (
          payments.map((item) => {
            const active = isActive(item.package_end_date);
            const adminAssigned = isAdminAssigned(item.payment_method);
            const durationDays = getDurationDays(item.package_start_date, item.package_end_date);
            const isJob = item.package_type === 'job_seeker' || item.package_type === 'job_apply';

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.cardIconWrap, isJob ? styles.cardIconJob : styles.cardIconFeatured]}>
                      <MaterialIcons
                        name={isJob ? 'work' : 'star'}
                        size={22}
                        color="#fff"
                      />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.package_title}</Text>
                  </View>
                  <View style={styles.cardHeaderRight}>
                   
                    <View style={styles.priceTag}>
                      <MaterialIcons name="euro" size={14} color="#fff" />
                      <Text style={styles.priceTagText}>{formatPrice(item.package_price, item.currency)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsGrid}>
                    <View style={[styles.paymentMethodTag, adminAssigned ? styles.paymentMethodAdmin : styles.paymentMethodStripe]}>
                      <MaterialIcons
                        name={adminAssigned ? 'person' : 'credit-card'}
                        size={14}
                        color="#fff"
                      />
                      <Text style={styles.paymentMethodText} numberOfLines={1}>
                        {item.payment_method || t('admin_assigned')}
                      </Text>
                    </View>

                  {isJob ? (
                    <View style={styles.detailBlock}>
                      <MaterialIcons name="work" size={18} color="#17D27C" />
                      <Text style={styles.detailLabel}>{t('applications_quota').toUpperCase()}</Text>
                      <Text style={styles.detailValue}>{item.jobs_quota}</Text>
                    </View>
                  ) : (
                    <View style={styles.detailBlock}>
                      <MaterialIcons name="star" size={18} color="#17D27C" />
                      <Text style={styles.detailLabel}>{t('type').toUpperCase()}</Text>
                      <Text style={styles.detailValue}>{t('featured_profile')}</Text>
                    </View>
                  )}
                  <View style={styles.detailBlock}>
                    <MaterialIcons name="calendar-today" size={18} color="#17D27C" />
                    <Text style={styles.detailLabel}>{t('duration').toUpperCase()}</Text>
                    <Text style={styles.detailValue}>
                      {durationDays != null ? `${durationDays} ${t('days')}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.detailBlock}>
                    <MaterialIcons name="event-available" size={18} color="#17D27C" />
                    <Text style={styles.detailLabel}>{t('started_on').toUpperCase()}</Text>
                    <Text style={styles.detailValue}>{formatDate(item.package_start_date)}</Text>
                  </View>
                  <View style={styles.detailBlock}>
                    <MaterialIcons name="event-busy" size={18} color="#64748B" />
                    <Text style={styles.detailLabel}>{t('expires_on').toUpperCase()}</Text>
                    <View style={styles.expiresRow}>
                      <Text style={styles.detailValue}>{formatDate(item.package_end_date)}</Text>
                      <View style={[styles.statusBadge, active ? styles.statusActive : styles.statusExpired]}>
                        <Text style={styles.statusBadgeText}>{active ? t('active') : t('expired')}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        userType="seeker"
        onMenuItemPress={(action) => {
          setSidebarVisible(false);
          const success = handleNavigation({
            action,
            userType: 'seeker',
            navigationFunctions,
            onLogout: onLogout || onBack,
          });
          if (!success) console.warn(`Navigation failed for action: ${action}`);
        }}
        onLogout={onLogout || onBack || (() => {})}
      />

      <Navigation
        activeTab={activeTab}
        messageUnreadCount={messageUnreadCount}
        onTabPress={(tab) => {
          setActiveTab(tab);
          switch (tab) {
            case 'home':
              onBack?.();
              break;
            case 'search':
              onNavigateToJobSearch?.();
              break;
            case 'companies':
              onNavigateToCompanies?.();
              break;
            case 'profile':
              onNavigateToProfile?.();
              break;
          }
        }}
        userType="seeker"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#6366F1',
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCardText: {
    marginTop: 12,
    fontSize: 15,
    color: '#94A3B8',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconJob: {
    backgroundColor: '#17D27C',
  },
  cardIconFeatured: {
    backgroundColor: '#17D27C',
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  paymentMethodTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,    
    alignSelf: 'flex-start',
  },
  paymentMethodStripe: {
    backgroundColor: '#7C3AED',
  },
  paymentMethodAdmin: {
    backgroundColor: '#EA580C',
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    maxWidth: 100,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17D27C',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
  },
  priceTagText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  detailsGrid: {
    gap: 12,
  },
  detailBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.5,
    width: 90,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  expiresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#17D27C',
  },
  statusExpired: {
    backgroundColor: '#DC2626',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  bottomSpacer: {
    height: 100,
  },
});

export default PaymentHistory;
