import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Image, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getNavigationItems, NavigationItem } from '../config/navigation';
import { buildUserImageUrl } from '../config/api';
import { userService } from '../services';

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
  userType: 'seeker' | null;
  onMenuItemPress: (menuItem: string) => void;
  onLogout: () => void;
  userData?: {
    name?: string;
    email?: string;
    profile_image?: string;
    cover_image?: string;
  } | null;
}

import { useTranslation } from 'react-i18next';

/** Space above device bottom so Logout clears the app bottom tab bar (renders on top of drawer). */
const SIDEBAR_LOGOUT_BOTTOM_PADDING =
  Platform.OS === 'ios' ? 118 : Platform.select({ android: 132, default: 120 });

const Sidebar: React.FC<SidebarProps> = ({ isVisible, onClose, userType, onMenuItemPress, onLogout, userData }) => {
  const { t } = useTranslation();
  const slideAnim = React.useRef(new Animated.Value(-300)).current;

  // Get user data from props or global service
  const effectiveUserData = userData || userService.getUserData();

  React.useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  const handleMenuItemPress = (menuItem: string) => {
    onMenuItemPress(menuItem);
  };

  const renderJobSeekerMenu = () => {
    const navigationItems = getNavigationItems();

    return (
      <>
        <ScrollView
          style={styles.menuScroll}
          contentContainerStyle={styles.menuScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            {(() => {
              const profileImageUrl = effectiveUserData?.profile_image;
              const finalProfileUrl = profileImageUrl ? buildUserImageUrl(profileImageUrl) : null;

              return profileImageUrl ? (
                <Image
                  source={{ uri: finalProfileUrl! }}
                  style={styles.profileImage}
                  resizeMode="cover"
                  onError={() => { }}
                  onLoad={() => { }}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <MaterialIcons name="person" size={40} color="#17D27C" />
                </View>
              );
            })()}
            <Text style={styles.headerTitle}>{effectiveUserData?.name || t('seeker')}</Text>
            <Text style={styles.headerSubtitle}>{t('welcome_back')}</Text>
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{t('main_menu')}</Text>

            {navigationItems.map((item: NavigationItem) => (
              <TouchableOpacity
                key={item.key}
                style={styles.menuItem}
                onPress={() => handleMenuItemPress(item.key)}
              >
                <MaterialIcons name={item.icon as any} size={20} color="#999" />
                <Text style={styles.menuItemText}>{t(item.key)}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.logoutFooter, { paddingBottom: SIDEBAR_LOGOUT_BOTTOM_PADDING }]}>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <MaterialIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };


  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.closeButtonContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {renderJobSeekerMenu()}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 300,
    height: '100%',
    flexDirection: 'column',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 10000,
  },
  closeButtonContainer: {
    alignItems: 'flex-end',
    paddingTop: 30,
    paddingRight: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  menuScroll: {
    flex: 1,
    minHeight: 0,
  },
  menuScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  logoutFooter: {
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  menuSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    marginBottom: 8,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default Sidebar; 