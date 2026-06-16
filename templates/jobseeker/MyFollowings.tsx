import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import Header from '../Header';
import Sidebar from '../Sidebar';
import Navigation from '../Navigation';
import { buildApiUrl, buildCompanyLogoUrl } from '../../config/api';
import { handleNavigation, NavigationFunctions } from '../../utils/navigationHandler';

interface MyFollowingsProps {
  onMenuPress: () => void;
  messageUnreadCount?: number;
  onBack?: () => void; // Add back navigation prop
  onLogout?: () => void;
  // Navigation props for sidebar and bottom navigation
  onNavigateToJobDetail?: (jobSlug: string) => void;
  onNavigateToJobAlerts?: () => void;
  onNavigateToMyFollowings?: () => void;
  onNavigateToEditProfile?: () => void;
  onNavigateToBuildResume?: () => void;
  onNavigateToMyApplications?: () => void;
  onNavigateToFavouriteJobs?: () => void;
  onNavigateToCompanies?: () => void;
  onNavigateToPackages?: () => void;
  onNavigateToPaymentHistory?: () => void;
  onNavigateToJobSearch?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToMessages?: () => void;
}

interface Company {
  id: number;
  name: string;
  slug: string;
  logo?: string;
  industry?: string;
  location?: string;
  open_jobs_count: number;
}

interface MyFollowingsResponse {
  data: {
    user: any;
    companies: Company[];
  };
  message?: string;
}

const MyFollowings: React.FC<MyFollowingsProps> = ({
  onMenuPress,
  messageUnreadCount = 0,
  onBack,
  onLogout,
  onNavigateToJobDetail,
  onNavigateToJobAlerts,
  onNavigateToMyFollowings,
  onNavigateToEditProfile,
  onNavigateToBuildResume,
  onNavigateToMyApplications,
  onNavigateToFavouriteJobs,
  onNavigateToCompanies,
  onNavigateToPackages,
  onNavigateToPaymentHistory,
  onNavigateToJobSearch,
  onNavigateToProfile,
  onNavigateToMessages
}) => {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('followings');

  const fetchMyFollowings = async () => {
    try {
      setLoading(true);
      setError(null);

      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        setError(t('sign_in_view_followings'));
        setLoading(false);
        return;
      }

      const response = await fetch(buildApiUrl('/my-followings'), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await AsyncStorage.removeItem('authToken');
          setError(t('authentication_failed'));
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setLoading(false);
        return;
      }

      const data: MyFollowingsResponse = await response.json();

      if (data.data && data.data.companies) {
        setCompanies(data.data.companies);
      } else {
        setCompanies([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('failed_fetch_followings');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyFollowings();
  }, []);

  const unfollowCompany = async (companySlug: string) => {
    Alert.alert(
      t('unfollow_company'),
      t('unfollow_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('unfollow'),
          style: 'destructive',
          onPress: async () => {
            try {
              const authToken = await AsyncStorage.getItem('authToken');
              if (!authToken) {
                Alert.alert(t('error'), t('please_sign_in_unfollow'));
                return;
              }

              const response = await fetch(buildApiUrl(`/remove-from-favourite-company/${companySlug}`), {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              });

              if (response.ok) {
                // Remove from local state
                setCompanies(prev => prev.filter(company => company.slug !== companySlug));
                Alert.alert(t('success'), t('unfollow_success'));
              } else {
                Alert.alert(t('error'), t('failed_unfollow'));
              }
            } catch (error) {
              Alert.alert(t('error'), t('failed_unfollow'));
            }
          }
        }
      ]
    );
  };

  const getCompanyLogoUrl = (logoPath: string | null | undefined): string => {
    if (!logoPath) return '';
    return buildCompanyLogoUrl(logoPath);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title={t('my_followings')}
          onMenuPress={onMenuPress}
          onBack={onBack}
          showBack={!!onBack}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>{t('loading_followed_companies')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header
          title={t('my_followings')}
          onMenuPress={onMenuPress}
          onBack={onBack}
          showBack={!!onBack}
        />
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <MaterialIcons name="error-outline" size={60} color="#ef4444" />
          </View>
          <Text style={styles.errorTitle}>{t('something_went_wrong')}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMyFollowings}>
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>{t('try_again')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={t('my_followings')}
        onMenuPress={() => setSidebarVisible(true)}
        onBack={onBack}
        showBack={!!onBack}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <MaterialIcons name="business" size={28} color="#6366f1" />
              <Text style={styles.pageTitle}>{t('my_followings')}</Text>
            </View>
            <Text style={styles.pageSubtitle}>
              {t('followings_subtitle')}
            </Text>
          </View>
        </View>

        {/* Companies List */}
        {companies.length > 0 ? (
          <View style={styles.companiesContainer}>
            {companies.map((company, index) => (
              <View key={company.id} style={[styles.companyCard, index === companies.length - 1 && styles.lastCard]}>
                <View style={styles.companyHeader}>
                  <View style={styles.logoContainer}>
                    {company.logo ? (
                      <Image
                        source={{ uri: getCompanyLogoUrl(company.logo) }}
                        style={styles.companyLogo}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.noLogoContainer}>
                        <MaterialIcons name="business" size={32} color="#9ca3af" />
                        <Text style={styles.noLogoText}>{t('no_photo')}</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.unfollowButton}
                    onPress={() => unfollowCompany(company.slug)}
                  >
                    <MaterialIcons name="close" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.companyInfo}>
                  <Text style={styles.companyName} numberOfLines={2}>{company.name}</Text>
                  <Text style={styles.companyIndustry}>{company.industry || t('industry_not_specified')}</Text>

                  <View style={styles.locationContainer}>
                    <MaterialIcons name="location-on" size={16} color="#64748b" />
                    <Text style={styles.locationText}>{company.location || t('location_not_specified')}</Text>
                  </View>

                  <View style={styles.jobsContainer}>
                    <MaterialIcons name="work" size={16} color="#64748b" />
                    <Text style={styles.jobsText}>
                      {company.open_jobs_count === 1
                        ? t('open_jobs_count', { count: company.open_jobs_count })
                        : t('open_jobs_count_plural', { count: company.open_jobs_count })
                      }
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="business" size={80} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>{t('no_followings_yet')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('start_following_msg')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sidebar */}
      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        userType="seeker"
        onMenuItemPress={(action) => {
          setSidebarVisible(false);

          const navigationFunctions: NavigationFunctions = {
            onNavigateToJobDetail,
            onNavigateToJobAlerts,
            onNavigateToMyFollowings,
            onNavigateToEditProfile,
            onNavigateToBuildResume,
            onNavigateToMyApplications,
            onNavigateToFavouriteJobs,
            onNavigateToJobSearch,
            onNavigateToProfile,
            onNavigateToMessages,
            onNavigateToCompanies,
            onNavigateToPackages,
            onNavigateToPaymentHistory
          };

          const success = handleNavigation({
            action,
            userType: 'seeker',
            navigationFunctions,
            onLogout: onLogout || onBack
          });

          if (!success) {
            console.warn(`Navigation failed for action: ${action}`);
          }
        }}
        onLogout={onLogout || onBack || (() => { })}
      />

      {/* Bottom Navigation */}
      <Navigation
        activeTab={activeTab}
        messageUnreadCount={messageUnreadCount}
        onTabPress={(tab) => {
          setActiveTab(tab);
          // Handle navigation based on tab
          switch (tab) {
            case 'home':
              onBack?.(); // Go back to dashboard
              break;
            case 'search':
              onNavigateToJobSearch?.();
              break;
            case 'companies':
              onNavigateToCompanies?.();
              break;
            case 'favourites':
              onNavigateToFavouriteJobs?.();
              break;
            case 'profile':
              onNavigateToProfile?.();
              break;
          }
        }}
        userType="seeker"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header Section
  headerSection: {
    marginBottom: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginLeft: 12,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 22,
    textAlign: 'center',
  },

  // Companies Container
  companiesContainer: {
    marginBottom: 24,
  },
  companyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lastCard: {
    marginBottom: 0,
  },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  companyLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  noLogoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  noLogoText: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
    marginTop: 2,
  },
  unfollowButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    lineHeight: 22,
  },
  companyIndustry: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 6,
    fontWeight: '500',
  },
  jobsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  jobsText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 6,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
});

export default MyFollowings;
