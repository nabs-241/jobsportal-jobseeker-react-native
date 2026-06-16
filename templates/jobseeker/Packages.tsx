import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import Sidebar from '../Sidebar';
import Navigation from '../Navigation';
import { handleNavigation, NavigationFunctions } from '../../utils/navigationHandler';
import { useTranslation } from 'react-i18next';
import { packageService, API_CONFIG } from '../../services';
import type {
  FeaturedPackageItem,
  JobApplyPackageItem,
  PackagesResponse,
} from '../../services/packageService';

interface PackagesProps {
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
  onNavigateToPackagePurchase?: (packageId: number) => void;
  onNavigateToPaymentHistory?: () => void;
}

const Packages: React.FC<PackagesProps> = ({
  onMenuPress,
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
  onNavigateToPackagePurchase,
  onNavigateToPaymentHistory,
}) => {
  const { t } = useTranslation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PackagesResponse | null>(null);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  const loadPackages = useCallback(async () => {
    const res = await packageService.getPackages();
    if (res.success && res.data) {
      setData(res.data);
      setError(null);
    } else {
      setError(res.error || t('something_went_wrong'));
      setData(null);
    }
  }, [t]);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    await loadPackages();
    setLoading(false);
  }, [loadPackages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPackages();
    setRefreshing(false);
  }, [loadPackages]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleActivateFree = async (id: number) => {
    setActivatingId(id);
    const res = await packageService.orderFreePackage(id);
    setActivatingId(null);
    if (res.success) {
      await loadPackages();
      Alert.alert(t('success'), t('package_activated_successfully') || 'Package activated successfully.');
    } else {
      Alert.alert(t('error'), res.error || t('something_went_wrong'));
    }
  };

  const handleBuyPackage = (id: number, isFree: boolean) => {
    if (isFree) {
      handleActivateFree(id);
      return;
    }
    onNavigateToPackagePurchase?.(id);
  };

  const formatPrice = (price: number, currency: string | undefined | null) => {
    // Use API currency (e.g. EUR); fallback only when backend sends empty
    const defaultCurrency = (API_CONFIG as any).PACKAGES_DEFAULT_CURRENCY;
    const c = (currency && currency.trim()) || defaultCurrency || 'USD';
    const sym = c === 'USD' ? '$' : c === 'EUR' ? '€' : c;
    return `${sym}${price}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

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
    onNavigateToPaymentHistory,
  };

  if (loading && !data) {
    return (
      <View style={styles.container}>
        <Header
          title={t('packages')}
          onMenuPress={onMenuPress}
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

  if (error && !data) {
    return (
      <View style={styles.container}>
        <Header
          title={t('packages')}
          onMenuPress={onMenuPress}
          onBack={onBack}
          showBack={!!onBack}
        />
        <View style={styles.centerWrap}>
          <MaterialIcons name="error-outline" size={56} color="#94A3B8" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPackages}>
            <Text style={styles.retryButtonText}>{t('try_again')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const featured: FeaturedPackageItem | null = data?.featured_package ?? null;
  // API returns only job packages in job_apply_packages; show all (optionally filter by allowed IDs)
  const rawJobPackages = data?.job_apply_packages ?? [];
  const allowedIds = (API_CONFIG as any).PACKAGES_JOB_ALLOWED_IDS as number[] | undefined;
  const jobPackages: JobApplyPackageItem[] = (() => {
    const list = Array.isArray(rawJobPackages)
      ? rawJobPackages.filter((p: any) => p && (p.id != null || p.package_title != null))
      : [];
    if (allowedIds && Array.isArray(allowedIds) && allowedIds.length > 0) {
      return list.filter((p) => p.id != null && allowedIds.includes(Number(p.id)));
    }
    return list;
  })();

  return (
    <View style={styles.container}>
      <Header
        title={t('packages')}
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
        {/* Featured Packages */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <MaterialIcons name="star" size={20} color="#F59E0B" />
            </View>
            <Text style={styles.sectionTitle}>{t('featured_packages')}</Text>
          </View>

          {featured ? (
            featured.is_purchased && featured.expires_at ? (
              <View style={styles.featuredActiveCard}>
                <Text style={styles.featuredActiveTitle}>{t('featured_profile')}</Text>
                <Text style={styles.featuredActiveCongrats}>{t('featured_profile_congrats')}</Text>
                <View style={styles.featuredActiveBenefits}>
                  {[
                    { icon: 'star' as const, label: t('premium_badge') },
                    { icon: 'trending-up' as const, label: t('rank_booster') },
                    { icon: 'bookmark' as const, label: t('cv_above_others') },
                    { icon: 'work' as const, label: t('more_job_opportunities') },
                    { icon: 'visibility' as const, label: t('higher_profile_views') },
                    { icon: 'notifications' as const, label: t('exclusive_alerts') },
                  ].map((item, i) => (
                    <View key={i} style={styles.featuredActiveBenefitRow}>
                      <MaterialIcons name={item.icon} size={20} color="#FCD34D" />
                      <Text style={styles.featuredActiveBenefitText}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.featuredActiveDates}>
                  {(() => {
                    const endDate = featured.expires_at ? formatDate(featured.expires_at) : '';
                    const days = featured.package_num_days || 0;
                    let startDate = '';
                    if (featured.expires_at && days > 0) {
                      const d = new Date(featured.expires_at);
                      d.setDate(d.getDate() - days);
                      startDate = formatDate(d.toISOString());
                    }
                    return (
                      <>
                        {startDate ? (
                          <View style={styles.featuredActiveDateBlock}>
                            <Text style={styles.featuredActiveDateLabel}>{t('package_starts_on')}</Text>
                            <Text style={styles.featuredActiveDateValue}>{startDate}</Text>
                          </View>
                        ) : null}
                        <View style={styles.featuredActiveDateBlock}>
                          <Text style={styles.featuredActiveDateLabel}>{t('package_ends_on')}</Text>
                          <Text style={styles.featuredActiveDateValue}>{endDate}</Text>
                        </View>
                      </>
                    );
                  })()}
                </View>
              </View>
            ) : (
            <View style={styles.featuredCard}>
              <View style={styles.featuredTop}>
                <View style={styles.featuredBadge}>
                  <MaterialIcons name="bolt" size={18} color="#fff" />
                  <Text style={styles.featuredBadgeText}>{featured.package_title}</Text>
                </View>
              </View>
              <Text style={styles.featuredPrice}>
                {formatPrice(featured.package_price, featured.currency)} {t('for')} {featured.package_num_days} {t('days')}
              </Text>
              <Text style={styles.featuredDesc}>
                {t('featured_profile_benefit')}
              </Text>
              <View style={styles.featuredBullets}>
                {[t('premium_badge'), t('rank_booster'), t('cv_above_others'), t('more_job_opportunities'), t('higher_profile_views'), t('exclusive_alerts')].map((label, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <MaterialIcons name="check-circle" size={18} color="#6366F1" />
                    <Text style={styles.bulletText}>{label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleBuyPackage(featured.id, featured.package_price <= 0)}
                disabled={activatingId === featured.id}
              >
                {activatingId === featured.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="shopping-cart" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>{featured.package_price <= 0 ? t('activate_free') : t('buy_now')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            )
          ) : (
            <View style={styles.emptyCard}>
              <MaterialIcons name="star-border" size={40} color="#CBD5E1" />
              <Text style={styles.emptyCardText}>{t('no_featured_package')}</Text>
            </View>
          )}
        </View>

        {/* Active Package Details (web-style summary when user has active job package) */}
        {(() => {
          const activeJobPackage = jobPackages.find((p) => p.is_current);
          if (!activeJobPackage) return null;
          const quota = activeJobPackage.jobs_quota ?? 0;
          const used = activeJobPackage.availed_jobs_quota ?? 0;
          const endDate = activeJobPackage.package_end_date;
          const startDate = (activeJobPackage as any).package_start_date
            ? formatDate((activeJobPackage as any).package_start_date)
            : endDate && activeJobPackage.package_num_days
              ? (() => {
                  const d = new Date(endDate);
                  d.setDate(d.getDate() - activeJobPackage.package_num_days);
                  return formatDate(d.toISOString());
                })()
              : '—';
          const endDateFormatted = endDate ? formatDate(endDate) : '—';
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconWrap, styles.activeDetailHeaderIcon]}>
                  <MaterialIcons name="card-giftcard" size={20} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>{t('active_package_details')}</Text>
              </View>
              <View style={styles.activeDetailGrid}>
                <View style={styles.activeDetailCard}>
                  <View style={styles.activeDetailCardInner}>
                    <View style={styles.activeDetailIconWrap}>
                      <MaterialIcons name="star" size={22} color="#fff" />
                    </View>
                    <Text style={styles.activeDetailLabel}>{t('package_name').toUpperCase()}</Text>
                    <Text style={styles.activeDetailValue} numberOfLines={2}>{activeJobPackage.package_title}</Text>
                  </View>
                </View>
                <View style={styles.activeDetailCard}>
                  <View style={styles.activeDetailCardInner}>
                    <View style={styles.activeDetailIconWrap}>
                      <MaterialIcons name="attach-money" size={22} color="#fff" />
                    </View>
                    <Text style={styles.activeDetailLabel}>{t('price').toUpperCase()}</Text>
                    <Text style={styles.activeDetailValue}>{formatPrice(activeJobPackage.package_price, activeJobPackage.currency)}</Text>
                  </View>
                </View>
                <View style={styles.activeDetailCard}>
                  <View style={[styles.activeDetailCardInner, styles.activeDetailCardInnerHighlight]}>
                    <View style={styles.activeDetailIconWrap}>
                      <MaterialIcons name="work" size={22} color="#fff" />
                    </View>
                    <Text style={styles.activeDetailLabel}>{t('applications_quota').toUpperCase()}</Text>
                    <Text style={styles.activeDetailValue}>
                      <Text style={styles.activeDetailQuotaUsed}>{used}</Text>
                      <Text style={styles.activeDetailValue}>/{quota}</Text>
                    </Text>
                  </View>
                </View>
                <View style={styles.activeDetailCard}>
                  <View style={[styles.activeDetailCardInner, styles.activeDetailCardInnerHighlight]}>
                    <View style={styles.activeDetailIconWrap}>
                      <MaterialIcons name="event-available" size={22} color="#fff" />
                    </View>
                    <Text style={styles.activeDetailLabel}>{t('started_on').toUpperCase()}</Text>
                    <Text style={styles.activeDetailValue}>{startDate}</Text>
                  </View>
                </View>
                <View style={styles.activeDetailCardWide}>
                  <View style={styles.activeDetailCardInner}>
                    <View style={styles.activeDetailIconWrapRed}>
                      <MaterialIcons name="event-busy" size={22} color="#fff" />
                    </View>
                    <Text style={styles.activeDetailLabel}>{t('expires_on').toUpperCase()}</Text>
                    <Text style={styles.activeDetailValue}>{endDateFormatted}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })()}

        {/* For Job Packages */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, styles.sectionIconJob]}>
              <MaterialIcons name="work" size={20} color="#0EA5E9" />
            </View>
            <Text style={styles.sectionTitle}>{t('for_job_packages')}</Text>
          </View>

          {jobPackages.length > 0 ? (
            jobPackages.map((pkg) => (
              <View key={pkg.id} style={[styles.jobCard, pkg.is_current && styles.jobCardCurrent]}>
                <View style={styles.jobCardTop}>
                  <Text style={styles.jobCardTitle}>{pkg.package_title}</Text>
                  {pkg.is_current && (
                    <View style={styles.currentChip}>
                      <Text style={styles.currentChipText}>{t('current_plan')}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.jobPriceRow}>
                  <Text style={styles.jobPrice}>{formatPrice(pkg.package_price, pkg.currency)}</Text>
                  <Text style={styles.jobMeta}> • {pkg.package_num_days} {t('days')}</Text>
                </View>
                <View style={styles.jobFeatures}>
                  <View style={styles.jobFeature}>
                    <MaterialIcons name="description" size={18} color="#64748B" />
                    <Text style={styles.jobFeatureText}>{pkg.package_num_listings} {t('job_applications')}</Text>
                  </View>
                  <View style={styles.jobFeature}>
                    <MaterialIcons name="support-agent" size={18} color="#64748B" />
                    <Text style={styles.jobFeatureText}>{t('premium_support')}</Text>
                  </View>
                </View>
                {pkg.is_current && pkg.package_end_date && (
                  <Text style={styles.jobExpires}>{t('expires_on')} {formatDate(pkg.package_end_date)}</Text>
                )}
                {pkg.is_current && pkg.jobs_quota != null && pkg.availed_jobs_quota != null && (
                  <Text style={styles.jobQuota}>{t('applications_remaining')}: {Math.max(0, pkg.jobs_quota - pkg.availed_jobs_quota)}</Text>
                )}
                {!pkg.is_current && (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => handleBuyPackage(pkg.id, pkg.package_price <= 0)}
                    disabled={activatingId === pkg.id}
                  >
                    {activatingId === pkg.id ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <>
                        <MaterialIcons name="arrow-upward" size={18} color="#6366F1" />
                        <Text style={styles.secondaryButtonText}>{pkg.package_price <= 0 ? t('activate_free') : t('upgrade_now')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <MaterialIcons name="work-off" size={40} color="#CBD5E1" />
              <Text style={styles.emptyCardText}>{t('no_job_packages')}</Text>
            </View>
          )}
        </View>

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
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionIconJob: {
    backgroundColor: '#E0F2FE',
  },
  activeDetailHeaderIcon: {
    backgroundColor: '#17D27C',
  },
  activeDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  activeDetailCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  activeDetailCardWide: {
    width: '100%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  activeDetailCardInner: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    minHeight: 100,
  },
  activeDetailCardInnerHighlight: {
    borderColor: '#17D27C',
    borderWidth: 2,
  },
  activeDetailIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#17D27C',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  activeDetailIconWrapRed: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  activeDetailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  activeDetailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  activeDetailQuotaUsed: {
    color: '#17D27C',
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  featuredActiveCard: {
    backgroundColor: '#62c95c',
    borderRadius: 20,
    padding: 20,
    marginBottom: 0,
    borderBottomWidth: 5,
    borderBottomColor: '#40a13b',
  },
  featuredActiveTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  featuredActiveCongrats: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    opacity: 0.95,
    marginBottom: 18,
  },
  featuredActiveBenefits: {
    marginBottom: 20,
  },
  featuredActiveBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  featuredActiveBenefitText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
    fontWeight: '500',
  },
  featuredActiveDates: {
    gap: 16,
  },
  featuredActiveDateBlock: {
    marginBottom: 4,
  },
  featuredActiveDateLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 2,
  },
  featuredActiveDateValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  featuredCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  featuredTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  featuredBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  activeChip: {
    backgroundColor: '#D1FAE5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  activeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  featuredPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 8,
  },
  featuredDesc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 14,
  },
  featuredBullets: {
    marginBottom: 16,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  bulletText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  expiresText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  jobCardCurrent: {
    borderColor: '#6366F1',
    borderWidth: 2,
    backgroundColor: '#FAFAFF',
  },
  jobCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  jobCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  currentChip: {
    backgroundColor: '#6366F1',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  currentChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  jobPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  jobPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0EA5E9',
  },
  jobMeta: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
  },
  jobFeatures: {
    marginBottom: 12,
  },
  jobFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  jobFeatureText: {
    fontSize: 14,
    color: '#64748B',
  },
  jobExpires: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  jobQuota: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
    marginBottom: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#6366F1',
    fontSize: 15,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 100,
  },
});

export default Packages;
