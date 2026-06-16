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
  Linking,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import CompanySidebar from './CompanySidebar';
import CompanyBottomNav, { CompanyTabId, COMPANY_BOTTOM_NAV_CONTENT_INSET } from './CompanyBottomNav';
import { useTranslation } from 'react-i18next';
import companyService from '../../services/companyService';
import { buildUserImageUrl, buildAssetUrl } from '../../config/api';

export type UnlockedUserStatusType = 'unlocked' | 'shortlist' | 'rejected' | 'hired';

interface CompanyUnlockedUsersProps {
  onBack: () => void;
  onUserPress?: (user: any) => void;
  onChatWithUser?: (user: any) => void;
  onCompanyMenuPress?: (key: string) => void;
  onLogout?: () => void;
  onCompanyNavPress?: (tab: CompanyTabId) => void;
  chatUnreadCount?: number;
  menuCompanyName?: string;
  menuCompanyLogo?: string;
}

const STATUS_OPTIONS: { value: UnlockedUserStatusType; labelKey: string }[] = [
  { value: 'unlocked', labelKey: 'status_unlocked' },
  { value: 'shortlist', labelKey: 'status_shortlisted' },
  { value: 'rejected', labelKey: 'status_rejected' },
  { value: 'hired', labelKey: 'status_hired' },
];

const CompanyUnlockedUsers: React.FC<CompanyUnlockedUsersProps> = ({
  onBack,
  onUserPress,
  onChatWithUser,
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
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusModalUser, setStatusModalUser] = useState<any | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadData = async () => {
    try {
      setError(null);
      const res = await companyService.getUnlockedUsers();
      const data = (res as any)?.data ?? (res as any)?.message ?? res;
      const list = Array.isArray(data?.users) ? data.users : Array.isArray(data) ? data : [];
      setUsers(list);
      if (!(res as any)?.success && list.length === 0) {
        const errMsg = (res as any)?.error ?? (res as any)?.message;
        setError(typeof errMsg === 'string' ? errMsg : t('something_went_wrong'));
      }
    } catch (e) {
      setUsers([]);
      setError(t('something_went_wrong'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getName = (u: any) => {
    const fullName = u.name ?? [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    return fullName || u.email || t('user');
  };

  const getSubtitle = (u: any) => {
    const parts = [];
    if (u.job_title) parts.push(u.job_title);
    const loc = [u.city, u.state, u.country].filter(Boolean).join(', ');
    if (loc) parts.push(loc);
    return parts.join(' · ') || null;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'shortlist') return t('status_shortlisted');
    if (status === 'rejected') return t('status_rejected');
    if (status === 'hired') return t('status_hired');
    return t('status_unlocked');
  };

  const getStatusColor = (status: string) => {
    if (status === 'hired') return '#17D27C';
    if (status === 'shortlist') return '#F59E0B';
    if (status === 'rejected') return '#EF4444';
    return '#64748B';
  };

  const handleSetStatus = async (user: any, newStatus: UnlockedUserStatusType) => {
    setStatusModalUser(null);
    setUpdatingStatus(true);
    try {
      const res = await companyService.setUnlockedUserStatus(user.id, newStatus);
      if ((res as any)?.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
        );
      } else {
        Alert.alert(t('error'), (res as any)?.error ?? t('something_went_wrong'));
      }
    } catch (e) {
      Alert.alert(t('error'), t('something_went_wrong'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openViewProfile = (user: any) => {
    if (onUserPress) {
      onUserPress(user);
      return;
    }
    const url = buildAssetUrl(`/view-public-profile/${user.id}`);
    Linking.openURL(url).catch(() => Alert.alert(t('error'), t('cannot_open_browser')));
  };

  const openChat = (user: any) => {
    if (onChatWithUser) {
      onChatWithUser(user);
      return;
    }
    const url = buildAssetUrl('/company-messages');
    Linking.openURL(url).catch(() => Alert.alert(t('error'), t('cannot_open_browser')));
  };

  return (
    <View style={styles.container}>
      <Header
        title={t('company_unlocked_users')}
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
          contentContainerStyle={onCompanyNavPress ? { paddingBottom: COMPANY_BOTTOM_NAV_CONTENT_INSET } : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={['#17D27C']}
            />
          }
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setLoading(true);
                  loadData();
                }}
              >
                <Text style={styles.retryBtnText}>{t('retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {users.length === 0 && !error ? (
            <View style={styles.empty}>
              <MaterialIcons name="lock-open" size={64} color="#ccc" />
              <Text style={styles.emptyText}>{t('no_unlocked_users')}</Text>
            </View>
          ) : (
            users.map((user) => {
              const status = user.status ?? 'unlocked';
              return (
                <View key={user.id} style={styles.userCard}>
                  <TouchableOpacity
                    style={styles.cardMain}
                    onPress={() => onUserPress?.(user)}
                    activeOpacity={0.8}
                  >
                    {(user.image || user.profile_image) ? (
                      <Image
                        source={{ uri: buildUserImageUrl(user.image || user.profile_image) }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <MaterialIcons name="person" size={28} color="#718096" />
                      </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{getName(user)}</Text>
                      {getSubtitle(user) ? (
                        <Text style={styles.userSubtitle} numberOfLines={1}>
                          {getSubtitle(user)}
                        </Text>
                      ) : null}
                      {user.email ? (
                        <Text style={styles.userEmail} numberOfLines={1}>
                          {user.email}
                        </Text>
                      ) : null}
                      <TouchableOpacity
                        style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}
                        onPress={() => setStatusModalUser(user)}
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
                      onPress={() => openViewProfile(user)}
                    >
                      <MaterialIcons name="person-outline" size={18} color="#17D27C" />
                      <Text style={styles.viewProfileBtnText}>{t('view_profile')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.chatBtn} onPress={() => openChat(user)}>
                      <MaterialIcons name="chat-bubble-outline" size={18} color="#3B82F6" />
                      <Text style={styles.chatBtnText}>{t('company-chat')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 24 }} />
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

      <Modal visible={!!statusModalUser} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusModalUser(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{t('set_status')}</Text>
            {statusModalUser &&
              STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.modalOption}
                  onPress={() => handleSetStatus(statusModalUser, opt.value)}
                >
                  <Text style={styles.modalOptionText}>{t(opt.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setStatusModalUser(null)}
            >
              <Text style={styles.modalCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
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
  errorBanner: { marginHorizontal: 16, marginTop: 12, padding: 12, backgroundColor: '#FEE2E2', borderRadius: 8 },
  errorText: { color: '#B91C1C', fontSize: 14 },
  retryBtn: { marginTop: 8, alignSelf: 'flex-start' },
  retryBtnText: { color: '#17D27C', fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, color: '#718096', marginTop: 12 },
  userCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
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
  userEmail: { fontSize: 12, color: '#718096', marginTop: 2 },
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
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  viewProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#17D27C18',
    gap: 6,
  },
  viewProfileBtnText: { fontSize: 14, fontWeight: '600', color: '#17D27C' },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3B82F618',
    gap: 6,
  },
  chatBtnText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
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
});

export default CompanyUnlockedUsers;
