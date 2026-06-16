import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Image, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getCompanyNavigationItems } from '../../config/navigation';
import { buildCompanyLogoUrl } from '../../config/api';
import companyService from '../../services/companyService';

const SIDEBAR_LOGOUT_BOTTOM_PADDING =
  Platform.OS === 'ios' ? 118 : Platform.select({ android: 132, default: 120 });

/** Shared across mounts so screens that omit name/logo still show header after first load */
let sidebarCompanyCache: { name?: string; logo?: string } = {};

function extractCompanyFromProfileApi(res: {
  success?: boolean;
  data?: unknown;
  message?: unknown;
}): { name?: string; logo?: string } {
  if (!res?.success) return {};
  const raw = (res as any).data ?? (res as any).message;
  if (!raw || typeof raw !== 'object') return {};
  const c = (raw as any).company ?? raw;
  if (!c || typeof c !== 'object') return {};
  const name =
    typeof (c as any).name === 'string'
      ? (c as any).name
      : (c as any).name != null
        ? String((c as any).name)
        : undefined;
  const logoRaw = (c as any).logo;
  const logo =
    logoRaw != null && String(logoRaw).trim() !== '' ? String(logoRaw) : undefined;
  return { name: name?.trim() || undefined, logo };
}

interface CompanySidebarProps {
  isVisible: boolean;
  onClose: () => void;
  onMenuItemPress: (menuItem: string) => void;
  onLogout: () => void;
  companyName?: string;
  companyLogo?: string;
}

const CompanySidebar: React.FC<CompanySidebarProps> = ({
  isVisible,
  onClose,
  onMenuItemPress,
  onLogout,
  companyName,
  companyLogo,
}) => {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const menuItems = getCompanyNavigationItems().filter((item) => item.key !== 'company-public-profile');
  const [fetched, setFetched] = useState<{ name?: string; logo?: string }>(() => ({ ...sidebarCompanyCache }));

  useEffect(() => {
    if (!isVisible) return;

    const propName = companyName?.trim();
    const propLogo = companyLogo?.trim();
    if (propName && propLogo) {
      sidebarCompanyCache = { name: propName, logo: propLogo };
      setFetched(sidebarCompanyCache);
      return;
    }

    if (propName) sidebarCompanyCache = { ...sidebarCompanyCache, name: propName };
    if (propLogo) sidebarCompanyCache = { ...sidebarCompanyCache, logo: propLogo };
    if (propName || propLogo) setFetched({ ...sidebarCompanyCache });

    const needFetch = !propName || !propLogo;
    if (!needFetch) return;

    let cancelled = false;
    companyService.getCompanyProfile().then((res) => {
      if (cancelled) return;
      const next = extractCompanyFromProfileApi(res);
      sidebarCompanyCache = {
        name: next.name || sidebarCompanyCache.name || propName,
        logo: next.logo || sidebarCompanyCache.logo || propLogo,
      };
      setFetched({ ...sidebarCompanyCache });
    });
    return () => {
      cancelled = true;
    };
  }, [isVisible, companyName, companyLogo]);

  const displayName = useMemo(() => {
    const n = companyName?.trim() || fetched.name?.trim();
    return n || t('company');
  }, [companyName, fetched.name, t]);

  const displayLogo = useMemo(() => {
    const l = companyLogo?.trim() || fetched.logo?.trim();
    return l || undefined;
  }, [companyLogo, fetched.logo]);

  useEffect(() => {
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

  const handlePress = (key: string) => {
    onMenuItemPress(key);
  };

  if (!isVisible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.closeButtonContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          {displayLogo ? (
            <Image
              source={{ uri: buildCompanyLogoUrl(displayLogo) }}
              style={styles.logo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <MaterialIcons name="business" size={40} color="#17D27C" />
            </View>
          )}
          <Text style={styles.headerTitle} numberOfLines={2}>
            {displayName}
          </Text>
          <Text style={styles.headerSubtitle}>{t('welcome_back')}</Text>
          <TouchableOpacity
            style={styles.publicProfileLink}
            onPress={() => {
              onClose();
              onMenuItemPress('company-public-profile');
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="open-in-new" size={18} color="#2E5CD0" />
            <Text style={styles.publicProfileLinkText}>{t('company-public-profile')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.menuScroll} contentContainerStyle={styles.menuScrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>{t('main_menu')}</Text>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.menuItem}
              onPress={() => handlePress(item.key)}
              activeOpacity={0.7}
            >
              <MaterialIcons name={item.icon as any} size={22} color="#666" />
              <Text style={styles.menuItemText}>{t(item.key) || item.label}</Text>
              <MaterialIcons name="chevron-right" size={22} color="#ccc" />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.8}>
            <MaterialIcons name="logout" size={22} color="#fff" />
            <Text style={styles.logoutButtonText}>{t('logout')}</Text>
          </TouchableOpacity>
        </ScrollView>
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
    zIndex: 99999,
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
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  closeButtonContainer: {
    alignItems: 'flex-end',
    paddingTop: 48,
    paddingRight: 20,
    paddingBottom: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 10,
  },
  logoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  publicProfileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    gap: 8,
  },
  publicProfileLinkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2E5CD0',
  },
  menuScroll: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: -20,
  },
  menuScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  logoutFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 14,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d10707',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 60,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default CompanySidebar;
