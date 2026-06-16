import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getJobSeekersList, JobSeekerListItem } from '../../services/jobSeekerService';
import { buildUserImageUrl } from '../../config/api';
import CompanyBottomNav, { CompanyTabId } from '../company/CompanyBottomNav';
import Header from '../Header';
import CompanySidebar from '../company/CompanySidebar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;

interface JobSeekersListingProps {
  onBack: () => void;
  onViewProfile: (seekerId: number) => void;
  /** Company bottom nav. When provided, shows CompanyBottomNav. */
  onCompanyNavPress?: (tab: CompanyTabId) => void;
  chatUnreadCount?: number;
  /** Company sidebar menu. When provided, shows Header with menu and CompanySidebar. */
  onCompanyMenuPress?: (key: string) => void;
  onLogout?: () => void;
  menuCompanyName?: string;
  menuCompanyLogo?: string;
}

const JobSeekersListing: React.FC<JobSeekersListingProps> = ({
  onBack,
  onViewProfile,
  onCompanyNavPress,
  chatUnreadCount = 0,
  onCompanyMenuPress,
  onLogout,
  menuCompanyName,
  menuCompanyLogo,
}) => {
  const { t } = useTranslation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seekers, setSeekers] = useState<JobSeekerListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadPage = useCallback(async (p: number, append: boolean) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const res = await getJobSeekersList({ page: p, per_page: 15, search });
      const data = res.data;
      if (!res.success && res.error) {
        setError(res.error);
        if (!append) setSeekers([]);
      } else if (data) {
        const list = Array.isArray(data.job_seekers) ? data.job_seekers : [];
        setSeekers(append ? (prev) => [...prev, ...list] : list);
        const pag = data.pagination;
        setHasMore(!!(pag && pag.current_page < pag.last_page));
      } else {
        if (!append) setSeekers([]);
      }
    } catch (e) {
      setError(t('something_went_wrong'));
      if (!append) setSeekers([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [search, t]);

  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadPage(1, false);
  };

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    const next = page + 1;
    setPage(next);
    loadPage(next, true);
  };

  const getAvatarUri = (item: JobSeekerListItem) => {
    if (!item.image) return null;
    const path = item.image.replace(/^.*\/user_images\/?/, '');
    return buildUserImageUrl(path || item.image);
  };

  const getOccupation = (item: JobSeekerListItem) =>
    item.job_title || item.functional_area || null;
  const getExperience = (item: JobSeekerListItem) =>
    item.career_level || item.job_experience || null;
  const getLocation = (item: JobSeekerListItem) =>
    [item.city, item.state, item.country].filter(Boolean).join(', ') || null;

  const headerContent = onCompanyMenuPress ? (
    <Header
      title={t('job_seekers_list')}
      onBack={onBack}
      showBack
      onMenuPress={() => setSidebarVisible(true)}
    />
  ) : (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <MaterialIcons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('job_seekers_list')}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {headerContent}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2E5CD0" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, onCompanyNavPress ? { paddingBottom: 100 } : null]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E5CD0']} />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const padding = 80;
            if (
              layoutMeasurement.height + contentOffset.y >= contentSize.height - padding &&
              hasMore &&
              !loadingMore
            ) {
              loadMore();
            }
          }}
          scrollEventThrottle={200}
        >
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => loadPage(1, false)} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>{t('retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : seekers.length === 0 ? (
            <View style={styles.empty}>
              <MaterialIcons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>{t('no_job_seekers_found')}</Text>
            </View>
          ) : (
            seekers.map((item) => (
              <View key={item.id} style={styles.card}>
                {item.is_featured ? (
                  <View style={styles.featuredBadge}>
                    <MaterialIcons name="star" size={12} color="#fff" />
                    <Text style={styles.featuredText}>{t('featured').toUpperCase()}</Text>
                  </View>
                ) : null}
                {getAvatarUri(item) ? (
                  <Image source={{ uri: getAvatarUri(item)! }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <MaterialIcons name="person" size={40} color="#718096" />
                  </View>
                )}
                <Text style={styles.name} numberOfLines={1}>
                  {item.name || `#${item.id}`}
                </Text>
                {getOccupation(item) ? (
                  <Text style={styles.occupation} numberOfLines={1}>
                    {getOccupation(item)}
                  </Text>
                ) : null}
                {getExperience(item) ? (
                  <View style={styles.metaRow}>
                    <MaterialIcons name="trending-up" size={16} color="#2E5CD0" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {getExperience(item)}
                    </Text>
                  </View>
                ) : null}
                {getLocation(item) ? (
                  <View style={styles.metaRow}>
                    <MaterialIcons name="place" size={16} color="#2E5CD0" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {getLocation(item)}
                    </Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.viewProfileBtn}
                  onPress={() => onViewProfile(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewProfileBtnText}>{t('view_profile').toUpperCase()}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
          {loadingMore ? (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color="#2E5CD0" />
            </View>
          ) : null}
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

      {onCompanyMenuPress && (
        <CompanySidebar
          isVisible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          onMenuItemPress={(key) => {
            setSidebarVisible(false);
            onCompanyMenuPress(key);
          }}
          onLogout={onLogout ?? (() => {})}
          companyName={menuCompanyName}
          companyLogo={menuCompanyLogo}
        />
      )}
    </View>
  );
};

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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: CARD_PADDING, paddingBottom: 24 },
  errorBanner: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  errorText: { color: '#B91C1C', fontSize: 14 },
  retryBtn: { marginTop: 8 },
  retryBtnText: { color: '#2E5CD0', fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, color: '#718096', marginTop: 12 },
  card: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    position: 'relative',
  },
  featuredBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#2E5CD0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    textAlign: 'center',
  },
  occupation: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#4A5568',
    maxWidth: CARD_WIDTH - 80,
  },
  viewProfileBtn: {
    marginTop: 15,
    backgroundColor: '#17d27c',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: 'center',
    alignItems: 'center',
  },
  viewProfileBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loader: { paddingVertical: 16, alignItems: 'center' },
});

export default JobSeekersListing;
