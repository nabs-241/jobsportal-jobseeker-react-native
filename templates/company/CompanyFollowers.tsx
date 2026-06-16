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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import CompanySidebar from './CompanySidebar';
import CompanyBottomNav, { CompanyTabId } from './CompanyBottomNav';
import { useTranslation } from 'react-i18next';
import companyService from '../../services/companyService';
import { buildUserImageUrl } from '../../config/api';

interface CompanyFollowersProps {
  onBack: () => void;
  onUserPress?: (user: any) => void;
  onCompanyNavPress?: (tab: CompanyTabId) => void;
  onCompanyMenuPress?: (key: string) => void;
  onLogout?: () => void;
  chatUnreadCount?: number;
  menuCompanyName?: string;
  menuCompanyLogo?: string;
}

const CompanyFollowers: React.FC<CompanyFollowersProps> = ({
  onBack,
  onUserPress,
  onCompanyNavPress,
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
  const [users, setUsers] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const res = await companyService.getCompanyFollowers();
      const data = (res as any)?.message ?? (res as any)?.data ?? res;
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (e) {
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getName = (u: any) => u.name ?? u.first_name ?? u.email ?? t('user');

  return (
    <View style={styles.container}>
      <Header
        title={t('company_followers')}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={['#17D27C']} />}
        >
          {users.length === 0 ? (
            <View style={styles.empty}>
              <MaterialIcons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>{t('no_followers')}</Text>
            </View>
          ) : (
            users.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={styles.userCard}
                onPress={() => onUserPress?.(user)}
                activeOpacity={0.8}
              >
                {user.image ? (
                  <Image source={{ uri: buildUserImageUrl(user.image) }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <MaterialIcons name="person" size={28} color="#718096" />
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{getName(user)}</Text>
                  {user.email && <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>}
                </View>
                <MaterialIcons name="chevron-right" size={22} color="#999" />
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {onCompanyNavPress && (
        <CompanyBottomNav
          onTabPress={(tab) => {
            if (tab === 'home') onBack();
            else onCompanyNavPress(tab);
          }}
          chatUnreadCount={chatUnreadCount}
        />
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
  scrollContentWithNav: { paddingBottom: 100 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, color: '#718096', marginTop: 12 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: '600', color: '#2D3748' },
  userEmail: { fontSize: 13, color: '#718096', marginTop: 2 },
});

export default CompanyFollowers;
