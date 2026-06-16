import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Header from '../Header';
import chatService, { ChatConversation, ChatJob } from '../../services/chatService';
import Sidebar from '../Sidebar';
import CompanySidebar from '../company/CompanySidebar';

export type ChatListFilter = 'all' | 'unlocked' | 'byjobs' | 'unread';

interface ChatConversationListProps {
  userType: 'seeker' | 'company';
  onBack: () => void;
  onSelectConversation: (conversation: ChatConversation) => void;
  onMenuItemPress?: (menuItem: string) => void;
  onLogout?: () => void;
  menuCompanyName?: string;
  menuCompanyLogo?: string;
  /** Called when conversations are loaded; totalUnread can be used for badge. */
  onConversationsLoaded?: (conversations: ChatConversation[], totalUnread: number) => void;
}

const formatTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const ChatConversationList: React.FC<ChatConversationListProps> = ({
  userType,
  onBack,
  onSelectConversation,
  onMenuItemPress,
  onLogout,
  menuCompanyName,
  menuCompanyLogo,
  onConversationsLoaded,
}) => {
  const { t } = useTranslation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ChatListFilter>('all');
  const [jobs, setJobs] = useState<ChatJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('');

  const loadConversations = useCallback(async () => {
    if (filter === 'byjobs' && selectedJobId != null) {
      const res = await chatService.getConversations('byjobs', selectedJobId);
      if (res.success && res.data) {
        setConversations(res.data);
        setError(null);
        const totalUnread = res.data.reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0);
        onConversationsLoaded?.(res.data, totalUnread);
      } else {
        setConversations([]);
        setError(res.message ?? t('something_went_wrong'));
        onConversationsLoaded?.([], 0);
      }
      return;
    }
    if (filter === 'byjobs') {
      setConversations([]);
      onConversationsLoaded?.([], 0);
      return;
    }
    const res = await chatService.getConversations(filter === 'all' ? undefined : filter);
    if (res.success && res.data) {
      setConversations(res.data);
      setError(null);
      const totalUnread = res.data.reduce((sum, c) => sum + (Number(c.unread_count) || 0), 0);
      onConversationsLoaded?.(res.data, totalUnread);
    } else {
      setConversations([]);
      const msg = res.message || t('something_went_wrong');
      setError(msg);
      onConversationsLoaded?.([], 0);
      if (false) console.warn('[ChatConversationList] getConversations failed', { message: msg });
    }
  }, [t, filter, selectedJobId, onConversationsLoaded]);

  const loadJobs = useCallback(async () => {
    const res = await chatService.getJobs(searchQuery.trim() || undefined);
    if (res.success && res.data) {
      setJobs(res.data);
      setError(null);
    } else {
      setJobs([]);
      setError(res.message ?? t('something_went_wrong'));
    }
  }, [t, searchQuery]);

  useEffect(() => {
    if (filter !== 'byjobs') {
      setSelectedJobId(null);
      setSelectedJobTitle('');
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    if (filter === 'byjobs' && selectedJobId == null) {
      loadJobs().finally(() => setLoading(false));
    } else {
      loadConversations().finally(() => setLoading(false));
    }
  }, [loadConversations, loadJobs, filter, selectedJobId]);

  // Mark user as online when viewing chat list
  useEffect(() => {
    chatService.updateActivity().catch(() => {});
    const interval = setInterval(() => chatService.updateActivity().catch(() => {}), 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((c) => {
      const name = (c.other_participant?.name ?? c.company?.name ?? c.user?.name ?? '').toLowerCase();
      return name.includes(q);
    });
  }, [conversations, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (filter === 'byjobs' && selectedJobId == null) await loadJobs();
    else await loadConversations();
    setRefreshing(false);
  };

  const handleBackToJobs = () => {
    setSelectedJobId(null);
    setSelectedJobTitle('');
  };

  const getAvatarUrl = (conv: ChatConversation) => {
    const logo = conv.other_participant?.logo;
    if (!logo) return null;
    if (logo.startsWith('http')) return logo;
    return logo;
  };

  const getDisplayName = (conv: ChatConversation) => {
    return conv.other_participant?.name ?? conv.company?.name ?? conv.user?.name ?? t('user');
  };

  const getLastMessagePreview = (conv: ChatConversation) => {
    const msg = conv.last_message;
    if (!msg) return t('no_messages_msg');
    if (msg.message_type === 'image') return '📷 Image';
    if (msg.message_type === 'file') return '📎 File';
    return msg.message || t('no_messages_msg');
  };

  const filterTabs: { key: ChatListFilter; label: string }[] = [
    { key: 'all', label: t('filter_all') },
    { key: 'unlocked', label: t('filter_unlocked') },
    { key: 'byjobs', label: t('by_jobs') },
    { key: 'unread', label: t('filter_unread') },
  ];

  return (
    <View style={styles.container}>
      <Header
        title={t('chats')}
        onBack={onBack}
        showBack
        onMenuPress={() => setSidebarVisible(true)}
      />
      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={22} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={filter === 'byjobs' && selectedJobId == null ? t('search_jobs') : t('search_contact')}
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      {filter === 'byjobs' && selectedJobId != null && (
        <TouchableOpacity style={styles.backToJobsBar} onPress={handleBackToJobs}>
          <MaterialIcons name="arrow-back" size={20} color="#2E5CD0" />
          <Text style={styles.backToJobsText}>{t('back_to_jobs')}</Text>
        </TouchableOpacity>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterChip, filter === tab.key && styles.filterChipActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.filterChipText, filter === tab.key && styles.filterChipTextActive]}>
              {tab.label}
            </Text>
            {tab.key === 'byjobs' && <MaterialIcons name="keyboard-arrow-down" size={18} color={filter === tab.key ? '#fff' : '#64748B'} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
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
          ) : filter === 'byjobs' && selectedJobId == null ? (
            jobs.length === 0 ? (
              <View style={styles.empty}>
                <MaterialIcons name="work-outline" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>{userType === 'seeker' ? t('no_messages') : t('no_messages')}</Text>
                <Text style={styles.emptySubtitle}>{userType === 'seeker' ? t('no_messages_msg') : t('no_messages_msg')}</Text>
              </View>
            ) : (
              jobs.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.convCard}
                  onPress={() => { setSelectedJobId(job.id); setSelectedJobTitle(job.title); }}
                  activeOpacity={0.8}
                >
                  <View style={styles.jobIconWrap}>
                    <MaterialIcons name="work" size={28} color="#2E5CD0" />
                  </View>
                  <View style={styles.convInfo}>
                    <Text style={styles.convName} numberOfLines={1}>{job.title}</Text>
                    <Text style={styles.convPreview}>
                      {userType === 'seeker' ? t('applied_date', { date: job.created_at }) : job.created_at}
                    </Text>
                  </View>
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{job.chat_count ?? 0}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#999" />
                </TouchableOpacity>
              ))
            )
          ) : filteredConversations.length === 0 ? (
            <View style={styles.empty}>
              <MaterialIcons name="chat-bubble-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>{t('no_messages')}</Text>
              <Text style={styles.emptySubtitle}>{t('no_messages_msg')}</Text>
            </View>
          ) : (
            filteredConversations.map((conv) => {
              const avatar = getAvatarUrl(conv);
              const name = getDisplayName(conv);
              return (
                <TouchableOpacity
                  key={conv.id}
                  style={styles.convCard}
                  onPress={() => onSelectConversation(conv)}
                  activeOpacity={0.8}
                >
                  {avatar ? (
                    <View style={styles.avatarWrap}>
                      <Image source={{ uri: avatar }} style={styles.avatar} />
                      {(conv.other_participant?.status === 'online') && <View style={styles.onlineDot} />}
                    </View>
                  ) : (
                    <View style={styles.avatarWrap}>
                      <View style={styles.avatarPlaceholder}>
                        <MaterialIcons name="person" size={28} color="#718096" />
                      </View>
                      {(conv.other_participant?.status === 'online') && <View style={styles.onlineDot} />}
                    </View>
                  )}
                  <View style={styles.convInfo}>
                    <View style={styles.convHeader}>
                      <Text style={styles.convName} numberOfLines={1}>{name}</Text>
                      <Text style={styles.convTime}>{formatTime(conv.last_message_at)}</Text>
                    </View>
                    <Text style={styles.convPreview} numberOfLines={1}>
                      {getLastMessagePreview(conv)}
                    </Text>
                  </View>
                  {conv.unread_count > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>
                        {conv.unread_count > 99 ? '99+' : conv.unread_count}
                      </Text>
                    </View>
                  )}
                  <MaterialIcons name="chevron-right" size={22} color="#999" />
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {userType === 'company' ? (
        <CompanySidebar
          isVisible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          onMenuItemPress={(key) => onMenuItemPress?.(key)}
          onLogout={onLogout ?? (() => {})}
          companyName={menuCompanyName}
          companyLogo={menuCompanyLogo}
        />
      ) : (
        <Sidebar
          isVisible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          userType="seeker"
          onMenuItemPress={(key) => onMenuItemPress?.(key)}
          onLogout={onLogout ?? (() => {})}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#1E293B' },
  backToJobsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
  },
  backToJobsText: { fontSize: 15, color: '#2E5CD0', fontWeight: '600', marginLeft: 8 },
  jobIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterScroll: { maxHeight: 44, marginBottom: 8 },
  filterRow: { paddingHorizontal: 16, paddingRight: 24 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#2E5CD0' },
  filterChipText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  errorBanner: { padding: 16, backgroundColor: '#FEE2E2', borderRadius: 12, marginBottom: 16 },
  errorText: { color: '#B91C1C', fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#475569', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
  avatarWrap: { position: 'relative' },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  convInfo: { flex: 1, marginLeft: 12 },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  convName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  convTime: { fontSize: 12, color: '#94A3B8' },
  convPreview: { fontSize: 14, color: '#64748B' },
  unreadBadge: {
    backgroundColor: '#2E5CD0',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});

export default ChatConversationList;
