import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import CompanySidebar from './CompanySidebar';
import CompanyBottomNav, { CompanyTabId, COMPANY_BOTTOM_NAV_CONTENT_INSET } from './CompanyBottomNav';
import { useTranslation } from 'react-i18next';
import companyService, { PostedJob } from '../../services/companyService';
import API_CONFIG from '../../config/api';

interface CompanyManageJobsProps {
  onBack: () => void;
  onJobPress?: (job: PostedJob) => void;
  onEditJob?: (job: PostedJob) => void;
  onViewCandidates?: (job: PostedJob) => void;
  onCompanyMenuPress?: (key: string) => void;
  onLogout?: () => void;
  onCompanyNavPress?: (tab: CompanyTabId) => void;
  chatUnreadCount?: number;
  menuCompanyName?: string;
  menuCompanyLogo?: string;
}

type TabType = 'active' | 'expired';

const CompanyManageJobs: React.FC<CompanyManageJobsProps> = ({
  onBack,
  onJobPress,
  onEditJob,
  onViewCandidates,
  onCompanyMenuPress,
  onLogout,
  onCompanyNavPress,
  chatUnreadCount = 0,
  menuCompanyName,
  menuCompanyLogo,
}) => {
  const { t } = useTranslation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<PostedJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('active');

  const loadJobs = async () => {
    try {
      setError(null);
      const res = await companyService.getPostedJobs();
      const r = res as any;
      // Service normalizes so data.jobs is always an array; API returns payload in response.message
      const list = Array.isArray(r?.data?.jobs) ? r.data.jobs : [];
      setJobs(list);
      if (list.length === 0 && !r?.success && (r?.message || r?.error)) {
        const errMsg = typeof r.message === 'string' ? r.message : r?.error;
        if (errMsg) setError(errMsg);
      }
    } catch (e) {
      setError(t('something_went_wrong'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const activeJobs = useMemo(() => jobs.filter((j) => !j.is_expired), [jobs]);
  const expiredJobs = useMemo(() => jobs.filter((j) => j.is_expired), [jobs]);
  const list = activeTab === 'active' ? activeJobs : expiredJobs;

  const webBase = API_CONFIG.PACKAGES_ORDER_WEB_BASE ?? API_CONFIG.BASE_URL?.replace('/api', '') ?? '';

  const openCandidates = (job: PostedJob) => {
    if (onViewCandidates) {
      onViewCandidates(job);
    } else {
      const url = `${webBase}/list-applied-users/${job.id}`;
      Linking.openURL(url);
    }
  };

  const openEdit = (job: PostedJob) => {
    if (onEditJob) {
      onEditJob(job);
    } else {
      const url = `${webBase}/edit-front-job/${job.id}`;
      Linking.openURL(url);
    }
  };

  const confirmDelete = (job: PostedJob) => {
    Alert.alert(
      t('delete_job') || 'Delete Job',
      t('delete_job_confirm') || 'Are you sure you want to delete this job?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await companyService.deleteJob(job.id);
            const data = (res as any)?.data ?? (res as any)?.message;
            const deleted = (res as any)?.success && (data?.deleted === true || data?.success === 'done' || (res as any)?.message === 'Job has been deleted!');
            if (deleted) {
              setJobs((prev) => prev.filter((j) => j.id !== job.id));
            } else {
              Alert.alert(t('error') || 'Error', (res as any)?.error || (typeof data === 'string' ? data : null) || t('something_went_wrong'));
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatSalary = (job: PostedJob) => {
    if (job.hide_salary || (job.salary_from == null && job.salary_to == null)) return null;
    const cur = job.salary_currency ?? '';
    const from = job.salary_from ?? job.salary_to ?? '';
    const to = job.salary_to ?? job.salary_from ?? '';
    const period = job.salary_period ? `/${job.salary_period}` : '';
    if (from && to && from !== to) return `Salary: ${cur}${from} - ${cur}${to}${period}`;
    return `Salary: ${cur}${from}${period}`;
  };

  return (
    <View style={styles.container}>
      <Header
        title={t('company_manage_jobs')}
        onBack={onBack}
        showBack
        onMenuPress={() => setSidebarVisible(true)}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#17D27C" />
        </View>
      ) : (
        <>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'active' && styles.tabActive]}
              onPress={() => setActiveTab('active')}
            >
              <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
                {t('active_jobs')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'expired' && styles.tabActive]}
              onPress={() => setActiveTab('expired')}
            >
              <Text style={[styles.tabText, activeTab === 'expired' && styles.tabTextActive]}>
                {t('expired_jobs')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#17D27C']} />
            }
          >
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : list.length === 0 ? (
              <View style={styles.empty}>
                <MaterialIcons name="work-off" size={64} color="#ccc" />
                <Text style={styles.emptyText}>
                  {activeTab === 'active' ? t('company_no_posted_jobs') : t('no_expired_jobs')}
                </Text>
              </View>
            ) : (
              list.map((job) => (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobCardTop}>
                    <View style={styles.jobTypeRow}>
                      <MaterialIcons name="work-outline" size={18} color="#64748B" />
                      <Text style={styles.jobTypeText}>{job.job_type || t('job')}</Text>
                    </View>
                    <Text style={styles.jobTitle} numberOfLines={2}>
                      {job.title}
                    </Text>
                    {formatSalary(job) ? (
                      <Text style={styles.salaryText}>{formatSalary(job)}</Text>
                    ) : null}
                    <View style={styles.locationRow}>
                      <MaterialIcons name="location-on" size={16} color="#2E5CD0" />
                      <Text style={styles.locationText} numberOfLines={1}>
                        {job.location || job.city || job.country || '–'}
                      </Text>
                      <Text style={styles.dateText}>{formatDate(job.expiry_date || job.created_at)}</Text>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.btnCandidates}
                      onPress={() => openCandidates(job)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="people-outline" size={18} color="#fff" />
                      <Text style={styles.btnCandidatesText}>
                        {t('candidates')} {job.applied_count ?? 0}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnEdit}
                      onPress={() => openEdit(job)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="edit" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnDelete}
                      onPress={() => confirmDelete(job)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="delete-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <MaterialIcons name="visibility" size={16} color="#64748B" />
                      <Text style={styles.statLabel}>{t('total_visitors')}:</Text>
                      <View style={styles.statBadge}>
                        <Text style={styles.statValue}>{job.num_views ?? 0}</Text>
                      </View>
                    </View>
                    <View style={styles.statItem}>
                      <MaterialIcons name="people" size={16} color="#64748B" />
                      <Text style={styles.statLabel}>{t('applied_candidates')}:</Text>
                      <View style={styles.statBadge}>
                        <Text style={styles.statValue}>{job.applied_count ?? 0}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
            <View style={{ height: onCompanyNavPress ? 24 + COMPANY_BOTTOM_NAV_CONTENT_INSET : 24 }} />
          </ScrollView>
        </>
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
        <CompanyBottomNav onTabPress={onCompanyNavPress} chatUnreadCount={chatUnreadCount} />
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#2E5CD0' },
  tabText: { fontSize: 15, color: '#2E5CD0', fontWeight: '500' },
  tabTextActive: { fontWeight: '700', color: '#1E40AF' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  errorText: { color: '#E53E3E', padding: 20, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, color: '#718096', marginTop: 12 },
  jobCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  jobCardTop: { marginBottom: 16 },
  jobTypeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  jobTypeText: { fontSize: 13, color: '#64748B', marginLeft: 6 },
  jobTitle: { fontSize: 18, fontWeight: '700', color: '#1A202C', marginBottom: 6 },
  salaryText: { fontSize: 14, color: '#4A5568', marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  locationText: { fontSize: 14, color: '#4A5568', marginLeft: 4, flex: 1 },
  dateText: { fontSize: 13, color: '#718096', marginLeft: 8 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  btnCandidates: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E5CD0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 8,
  },
  btnCandidatesText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 6 },
  btnEdit: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#EAB308',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  btnDelete: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statLabel: { fontSize: 13, color: '#64748B', marginLeft: 6 },
  statBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 4,
  },
  statValue: { fontSize: 13, fontWeight: '600', color: '#065F46' },
});

export default CompanyManageJobs;
