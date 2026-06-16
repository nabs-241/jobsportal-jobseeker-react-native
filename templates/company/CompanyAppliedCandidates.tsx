import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import CompanySidebar from './CompanySidebar';
import CompanyBottomNav, { CompanyTabId, COMPANY_BOTTOM_NAV_CONTENT_INSET } from './CompanyBottomNav';
import { useTranslation } from 'react-i18next';
import companyService from '../../services/companyService';
import { buildUserImageUrl } from '../../config/api';

export type ApplicationStatusType = 'applied' | 'shortlisted' | 'hired' | 'rejected';

interface CompanyAppliedCandidatesProps {
  jobId: number;
  jobTitle: string;
  companyId: number;
  onBack: () => void;
  onViewProfile: (seekerId: number, application: { applicationId: number; jobId: number; companyId: number; status: ApplicationStatusType }) => void;
  onCompanyMenuPress?: (key: string) => void;
  onLogout?: () => void;
  onCompanyNavPress?: (tab: CompanyTabId) => void;
  chatUnreadCount?: number;
  menuCompanyName?: string;
  menuCompanyLogo?: string;
}

const STATUS_OPTIONS: { value: ApplicationStatusType; labelKey: string }[] = [
  { value: 'applied', labelKey: 'status_applied' },
  { value: 'shortlisted', labelKey: 'status_shortlisted' },
  { value: 'hired', labelKey: 'status_hired' },
  { value: 'rejected', labelKey: 'status_rejected' },
];

const CompanyAppliedCandidates: React.FC<CompanyAppliedCandidatesProps> = ({
  jobId,
  jobTitle,
  companyId,
  onBack,
  onViewProfile,
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
  const [applicants, setApplicants] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusModalApp, setStatusModalApp] = useState<any | null>(null);
  const [answersModalApp, setAnswersModalApp] = useState<any | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const res = await companyService.getListAppliedUsers(jobId);
      const data = (res as any)?.data;
      const list =
        Array.isArray(data?.job_applications) ? data.job_applications
        : Array.isArray(data?.applicants) ? data.applicants
        : Array.isArray(data?.users) ? data.users
        : Array.isArray(data) ? data
        : [];
      setApplicants(list);
      if (!(res as any)?.success && list.length === 0) {
        const errMsg = (res as any)?.error ?? (res as any)?.message;
        setError(typeof errMsg === 'string' ? errMsg : t('something_went_wrong'));
      }
    } catch (e) {
      setApplicants([]);
      setError(t('something_went_wrong'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [jobId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getUserId = (a: any) => a.user_id ?? a.id ?? a.user?.id;
  const getApplicationId = (a: any) => a.id ?? a.application_id;
  const getStatus = (a: any): ApplicationStatusType =>
    (a.application_status === 'shortlisted' || a.application_status === 'hired' || a.application_status === 'rejected'
      ? a.application_status
      : 'applied') as ApplicationStatusType;

  const getName = (a: any) => {
    const u = a.user ?? a;
    const fullName = a.name ?? u.name ?? [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    return fullName || u.email || a.email || t('user');
  };

  const getSubtitle = (a: any) => {
    const u = a.user ?? a;
    const parts = [];
    if (a.job_title ?? u.job_title) parts.push(a.job_title ?? u.job_title);
    if (a.functional_area ?? u.functional_area) parts.push(a.functional_area ?? u.functional_area);
    const loc = [a.city ?? u.city, a.state ?? u.state, a.country ?? u.country].filter(Boolean).join(', ');
    if (loc) parts.push(loc);
    return parts.join(' · ') || null;
  };

  const getAvatarUri = (a: any) => {
    const u = a.user ?? a;
    const img = a.image ?? u.image ?? a.profile_image ?? u.profile_image;
    if (!img) return null;
    const path = String(img).replace(/^.*\/user_images\/?/, '');
    return buildUserImageUrl(path || img);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusLabel = (status: ApplicationStatusType) => {
    if (status === 'shortlisted') return t('status_shortlisted');
    if (status === 'rejected') return t('status_rejected');
    if (status === 'hired') return t('status_hired');
    return t('status_applied');
  };

  const getStatusColor = (status: ApplicationStatusType) => {
    if (status === 'hired') return '#17D27C';
    if (status === 'shortlisted') return '#F59E0B';
    if (status === 'rejected') return '#EF4444';
    return '#64748B';
  };

  /** Returns displayable Q&A; show View Answers only when this has items */
  const getAnswersList = (a: any): { question_title: string; answer: string }[] => {
    const qa = a.question_answers ?? a.questionAnswers;
    if (!Array.isArray(qa) || qa.length === 0) return [];
    return qa
      .map((x: any) => ({
        question_title: x.question_title ?? x.questionTitle ?? '',
        answer: String(x.answer ?? '').trim(),
      }))
      .filter((x: any) => x.question_title || x.answer);
  };

  const hasAnswersToShow = (a: any) => getAnswersList(a).length > 0;

  const handleSetStatus = async (app: any, newStatus: ApplicationStatusType) => {
    setStatusModalApp(null);
    const applicationId = getApplicationId(app);
    const userId = Number(getUserId(app));
    const currentStatus = getStatus(app);
    const compId = app.job?.company_id ?? app.company_id ?? companyId;

    // Optimistic update: change UI immediately so it feels instant
    const previousApplicants = [...applicants];
    setApplicants((prev) =>
      prev.map((a) =>
        getApplicationId(a) === applicationId ? { ...a, application_status: newStatus } : a
      )
    );
    const statusLabel = getStatusLabel(newStatus);
    Alert.alert(t('success'), t('moved_user_to_status', { status: statusLabel }));

    // API call in background; revert on failure
    try {
      const res = await companyService.setApplicationStatus(applicationId, userId, jobId, compId, newStatus, currentStatus);
      if (!(res as any)?.success) {
        setApplicants(previousApplicants);
        const errMsg = typeof (res as any)?.error === 'string' ? (res as any).error
          : typeof (res as any)?.message === 'string' ? (res as any).message
          : (res as any)?.data?.error ?? (res as any)?.data?.message ?? t('something_went_wrong');
        Alert.alert(t('error'), String(errMsg));
      }
    } catch (e) {
      setApplicants(previousApplicants);
      if (false) console.log('[CompanyAppliedCandidates] handleSetStatus exception:', e);
      Alert.alert(t('error'), (e instanceof Error ? e.message : String(e)) || t('something_went_wrong'));
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={t('applied_candidates')}
        onBack={onBack}
        showBack
        onMenuPress={() => setSidebarVisible(true)}
      />

      <View style={styles.jobTitleBar}>
        <Text style={styles.jobTitleText} numberOfLines={2}>{jobTitle}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2E5CD0" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E5CD0']} />
          }
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : applicants.length === 0 ? (
            <View style={styles.empty}>
              <MaterialIcons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>{t('no_job_seekers_found')}</Text>
            </View>
          ) : (
            applicants.map((a) => {
              const userId = getUserId(a);
              const appId = getApplicationId(a);
              const status = getStatus(a);
              if (!userId) return null;
              return (
                <View key={`${userId}-${appId}`} style={styles.userCard}>
                  <TouchableOpacity
                    style={styles.cardMain}
                    onPress={() =>
                      onViewProfile(Number(userId), {
                        applicationId: appId,
                        jobId,
                        companyId: a.job?.company_id ?? a.company_id ?? companyId,
                        status,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    {getAvatarUri(a) ? (
                      <Image source={{ uri: getAvatarUri(a)! }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <MaterialIcons name="person" size={28} color="#718096" />
                      </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{getName(a)}</Text>
                      {getSubtitle(a) ? (
                        <Text style={styles.userSubtitle} numberOfLines={1}>{getSubtitle(a)}</Text>
                      ) : null}
                      {(a.applied_date ?? a.created_at) && (
                        <Text style={styles.dateText}>
                          {t('applied_date', { date: formatDate(a.applied_date ?? a.created_at) })}
                        </Text>
                      )}
                      <TouchableOpacity
                        style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}
                        onPress={() => setStatusModalApp(a)}
                      >
                        <Text style={[styles.statusBadgeText, { color: getStatusColor(status) }]}>
                          {getStatusLabel(status)}
                        </Text>
                        <MaterialIcons name="arrow-drop-down" size={18} color={getStatusColor(status)} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.viewProfileBtn}
                      onPress={() =>
                        onViewProfile(Number(userId), {
                          applicationId: appId,
                          jobId,
                          companyId: a.job?.company_id ?? a.company_id ?? companyId,
                          status,
                        })
                      }
                    >
                      <MaterialIcons name="person-outline" size={18} color="#2E5CD0" />
                      <Text style={styles.viewProfileBtnText}>{t('view_profile')}</Text>
                    </TouchableOpacity>
                    {hasAnswersToShow(a) && (
                      <TouchableOpacity
                        style={styles.viewAnswersBtn}
                        onPress={() => setAnswersModalApp(a)}
                      >
                        <MaterialIcons name="question-answer" size={18} color="#17D27C" />
                        <Text style={styles.viewAnswersBtnText}>{t('view_answers')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: onCompanyNavPress ? 24 + COMPANY_BOTTOM_NAV_CONTENT_INSET : 24 }} />
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
        <CompanyBottomNav onTabPress={onCompanyNavPress} chatUnreadCount={chatUnreadCount} />
      )}

      <Modal visible={!!statusModalApp} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusModalApp(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{t('set_status')}</Text>
            {statusModalApp &&
              STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.modalOption}
                  onPress={() => handleSetStatus(statusModalApp, opt.value)}
                >
                  <Text style={styles.modalOptionText}>{t(opt.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setStatusModalApp(null)}
            >
              <Text style={styles.modalCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!answersModalApp} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAnswersModalApp(null)}
        >
          <View style={styles.answersModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.answersModalHeader}>
              <Text style={styles.answersModalTitle}>
                {t('answers_from_user', { name: answersModalApp ? getName(answersModalApp) : '' })}
              </Text>
              <TouchableOpacity onPress={() => setAnswersModalApp(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <MaterialIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.answersScroll} showsVerticalScrollIndicator={false}>
              {answersModalApp ? (
                (() => {
                  const list = getAnswersList(answersModalApp);
                  return list.length > 0 ? (
                    list.map((qa, idx) => (
                      <View key={idx} style={styles.answerBlock}>
                        <Text style={styles.answerQuestion}>{qa.question_title || `Question ${idx + 1}`}</Text>
                        <View style={styles.answerBox}>
                          <Text style={styles.answerText}>{qa.answer || '—'}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.answersEmpty}>{t('no_answers')}</Text>
                  );
                })()
              ) : null}
            </ScrollView>
            <TouchableOpacity style={styles.answersCloseBtn} onPress={() => setAnswersModalApp(null)}>
              <Text style={styles.answersCloseBtnText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  jobTitleBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  jobTitleText: { fontSize: 16, fontWeight: '600', color: '#475569' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  errorBanner: {
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: { color: '#B91C1C', fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, color: '#718096', marginTop: 12 },
  userCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: '600', color: '#2D3748' },
  userSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  dateText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  viewProfileBtn: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2E5CD018',
    gap: 6,
  },
  viewProfileBtnText: { fontSize: 14, fontWeight: '600', color: '#2E5CD0' },
  viewAnswersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#17D27C18',
    gap: 6,
  },
  viewAnswersBtnText: { fontSize: 14, fontWeight: '600', color: '#17D27C' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalOptionText: { fontSize: 16, color: '#334155' },
  modalCancel: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 16, color: '#64748B' },
  answersModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  answersModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  answersModalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', flex: 1 },
  answersScroll: { maxHeight: 320 },
  answerBlock: { marginBottom: 16 },
  answerQuestion: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 6 },
  answerBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
  },
  answerText: { fontSize: 14, color: '#334155' },
  answersEmpty: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 24 },
  answersCloseBtn: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#64748B',
    borderRadius: 8,
    alignItems: 'center',
  },
  answersCloseBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});

export default CompanyAppliedCandidates;
