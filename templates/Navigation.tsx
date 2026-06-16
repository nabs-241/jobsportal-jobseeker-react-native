import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface NavigationProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
  userType: 'seeker' | 'company' | null;
  /** Message/Chat unread count for badge (seeker and company). */
  messageUnreadCount?: number;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabPress, userType, messageUnreadCount = 0 }) => {
  const { t } = useTranslation();

  if (!userType) return null;

  const getJobSeekerTabs = () => [
    { id: 'home', label: t('home'), icon: 'home' },
    { id: 'search', label: t('search_jobs'), icon: 'search' },
    { id: 'messages', label: t('chats'), icon: 'chat-bubble-outline' },
    { id: 'companies', label: t('companies'), icon: 'business' },
    { id: 'profile', label: t('profile'), icon: 'person' },
  ];

  const getCompanyTabs = () => [
    { id: 'dashboard', label: t('dashboard'), icon: 'dashboard' },
    { id: 'post-job', label: t('post_job'), icon: 'add-business' },
    { id: 'applications', label: t('applications'), icon: 'people' },
    { id: 'profile', label: t('profile'), icon: 'business' },
  ];

  const tabs = userType === 'seeker' ? getJobSeekerTabs() : getCompanyTabs();

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const showBadge = (tab.id === 'messages') && messageUnreadCount > 0;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => onTabPress(tab.id)}
          >
            <View style={styles.iconWrap}>
              <MaterialIcons
                name={tab.icon as any}
                size={24}
                color={activeTab === tab.id ? '#17D27C' : '#666'}
              />
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 40,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  activeTab: {
    // Active tab styling is handled by icon and text colors
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#17D27C',
    fontWeight: '600',
  },
});

export default Navigation; 