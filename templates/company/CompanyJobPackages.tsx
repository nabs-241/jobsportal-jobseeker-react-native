import React, { useState, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import CompanySidebar from './CompanySidebar';
import CompanyBottomNav, { CompanyTabId, COMPANY_BOTTOM_NAV_CONTENT_INSET } from './CompanyBottomNav';
import { useTranslation } from 'react-i18next';
import companyService from '../../services/companyService';
import API_CONFIG from '../../config/api';

interface CompanyJobPackagesProps {
  onBack: () => void;
  onNavigateToPackagePurchase?: (packageId: number, isFree: boolean, source: 'job' | 'cv') => void;
  onCompanyMenuPress?: (key: string) => void;
  onLogout?: () => void;
  onCompanyNavPress?: (tab: CompanyTabId) => void;
  chatUnreadCount?: number;
  bottomNavActiveTab?: CompanyTabId;
  menuCompanyName?: string;
  menuCompanyLogo?: string;
}

const CompanyJobPackages: React.FC<CompanyJobPackagesProps> = ({
  onBack,
  onNavigateToPackagePurchase,
  onCompanyMenuPress,
  onLogout,
  onCompanyNavPress,
  chatUnreadCount = 0,
  bottomNavActiveTab,
  menuCompanyName,
  menuCompanyLogo,
}) => {
  const { t } = useTranslation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [currentPackage, setCurrentPackage] = useState<any>(null);
  const [packagesEnabled, setPackagesEnabled] = useState(true);

  const loadData = async () => {
    try {
      const res = await companyService.getJobPackages();
      const data = (res as any)?.message ?? (res as any)?.data ?? res;
      setPackages(Array.isArray(data?.packages) ? data.packages : []);
      setCurrentPackage(data?.current_package ?? null);
      setPackagesEnabled(data?.packages_enabled !== false);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatPrice = (pkg: any) => {
    const currency = (pkg.currency ?? pkg.currency_code ?? pkg.package_currency ?? 'USD').toString().toUpperCase();
    const price = pkg.package_price ?? pkg.price ?? 0;
    return `${currency} ${price}`;
  };

  const jobPostings = (pkg: any) => pkg.package_num_listings ?? pkg.jobs_quota ?? pkg.num_listings;
  const jobDays = (pkg: any) => pkg.package_num_days ?? pkg.num_days ?? pkg.duration_days;
  const price = (pkg: any) => Number(pkg.package_price ?? pkg.price ?? 0);
  const isBasicTier = (pkg: any) => price(pkg) <= 10;

  const handleBuyNow = (pkg: any) => {
    const id = pkg?.id ?? pkg?.package_id;
    if (id == null || id === '') {
      Alert.alert(t('error') || 'Error', t('invalid_package') || 'Invalid package.');
      return;
    }
    if (!onNavigateToPackagePurchase) {
      Alert.alert(t('error') || 'Error', 'Cannot open purchase screen.');
      return;
    }
    const isFree = price(pkg) <= 0;
    onNavigateToPackagePurchase(Number(id), isFree, 'job');
  };

  return (
    <View style={styles.container}>
      <Header
        title={t('company_view_job_packages')}
        onBack={onBack}
        showBack
        onMenuPress={() => setSidebarVisible(true)}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#17D27C" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            onCompanyNavPress ? { paddingBottom: COMPANY_BOTTOM_NAV_CONTENT_INSET } : undefined,
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={['#17D27C']} />}
        >
          {!packagesEnabled ? (
            <View style={styles.empty}>
              <MaterialIcons name="block" size={64} color="#ccc" />
              <Text style={styles.emptyText}>{t('packages_not_available')}</Text>
            </View>
          ) : packages.length === 0 ? (
            <View style={styles.empty}>
              <MaterialIcons name="work-off" size={64} color="#ccc" />
              <Text style={styles.emptyText}>{t('no_job_packages')}</Text>
            </View>
          ) : (
            packages.map((pkg) => {
              const postings = jobPostings(pkg);
              const days = jobDays(pkg);
              const basic = isBasicTier(pkg);
              const CheckIcon = () => <MaterialIcons name="check-circle" size={18} color="#17D27C" style={styles.featureIcon} />;
              const CrossIcon = () => <MaterialIcons name="cancel" size={18} color="#94A3B8" style={styles.featureIcon} />;
              return (
                <View key={pkg.id} style={styles.packageCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIcon}>
                      <MaterialIcons name="work" size={28} color="#6366F1" />
                    </View>
                    <Text style={styles.packageTitle}>{pkg.package_title ?? pkg.title ?? `Package ${pkg.id}`}</Text>
                  </View>
                  <View style={styles.priceBlock}>
                    <Text style={styles.priceText}>{formatPrice(pkg)}</Text>
                  </View>
                  <View style={styles.featuresList}>
                    {postings != null && (
                      <View style={styles.featureRow}>
                        <MaterialIcons name="check-circle" size={18} color="#17D27C" style={styles.featureIcon} />
                        <Text style={styles.featureText}>{t('job_posting')} {postings}</Text>
                      </View>
                    )}
                    {days != null && (
                      <View style={styles.featureRow}>
                        <MaterialIcons name="check-circle" size={18} color="#17D27C" style={styles.featureIcon} />
                        <Text style={styles.featureText}>{t('job_displayed_for_days')} {days} {t('days')}</Text>
                      </View>
                    )}
                    <View style={styles.featureRow}>
                      {basic ? <CrossIcon /> : <CheckIcon />}
                      <Text style={[styles.featureText, basic && styles.featureDisabled]}>
                        {basic ? t('highlights_jobs') : t('highlights_jobs_on_demand')}
                      </Text>
                    </View>
                    <View style={styles.featureRow}>
                      {basic ? <CrossIcon /> : <CheckIcon />}
                      <Text style={[styles.featureText, basic && styles.featureDisabled]}>{t('premium_support')}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.buyBtn} onPress={() => handleBuyNow(pkg)} activeOpacity={0.85}>
                    <Text style={styles.buyBtnText}>{t('buy_now')}</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          <View style={{ height: onCompanyNavPress ? 8 : 32 }} />
        </ScrollView>
      )}

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
      {onCompanyNavPress && (
        <CompanyBottomNav
          activeTab={bottomNavActiveTab}
          onTabPress={onCompanyNavPress}
          chatUnreadCount={chatUnreadCount}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, color: '#718096', marginTop: 12 },
  packageCard: {
    backgroundColor: '#fff',
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 0,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  packageTitle: { fontSize: 20, fontWeight: '700', color: '#1A202C', flex: 1 },
  priceBlock: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    alignItems: 'center',
  },
  priceText: { fontSize: 30, fontWeight: '700', color: '#000' },
  featuresList: { marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  featureIcon: { marginRight: 10 },
  featureText: { fontSize: 15, color: '#4A5568', flex: 1 },
  featureDisabled: { color: '#94A3B8', fontStyle: 'italic' },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2E5CD0',
    paddingVertical: 14,
    borderRadius: 12,
  },
  buyBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

export default CompanyJobPackages;
