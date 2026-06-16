import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export type CompanyTabId = 'home' | 'post-job' | 'packages' | 'chat' | 'profile';

/** Use as ScrollView contentContainerStyle paddingBottom when this bar is shown */
export const COMPANY_BOTTOM_NAV_CONTENT_INSET = 100;

interface CompanyBottomNavProps {
  /** Current active tab; pass undefined for none (e.g. on detail screens). */
  activeTab?: CompanyTabId;
  onTabPress: (tab: CompanyTabId) => void;
  /** Total unread message count for Chat tab badge. */
  chatUnreadCount?: number;
}

const CompanyBottomNav: React.FC<CompanyBottomNavProps> = ({ activeTab, onTabPress, chatUnreadCount = 0 }) => {
  const { t } = useTranslation();

  const tabs: { id: CompanyTabId; label: string; icon: string }[] = [
    { id: 'home', label: t('home'), icon: 'home' },
    { id: 'post-job', label: t('company_post_job'), icon: 'add-circle-outline' },
    { id: 'packages', label: t('packages'), icon: 'card-giftcard' },
    { id: 'chat', label: t('chat'), icon: 'chat-bubble-outline' },
    { id: 'profile', label: t('profile'), icon: 'person' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === 'chat' && chatUnreadCount > 0;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => onTabPress(tab.id)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                <MaterialIcons
                  name={tab.icon as any}
                  size={24}
                  color={isActive ? '#17D27C' : '#888'}
                />
                {showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingBottom: 40,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
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
  tabLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#17D27C',
    fontWeight: '600',
  },
});

export default CompanyBottomNav;
