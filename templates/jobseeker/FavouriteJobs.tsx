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
import Header from '../Header';
import Sidebar from '../Sidebar';
import Navigation from '../Navigation';
import { buildApiUrl, buildCompanyLogoUrl } from '../../config/api';
import { handleNavigation, NavigationFunctions } from '../../utils/navigationHandler';
import { useTranslation } from 'react-i18next';

interface FavouriteJobsProps {
  onMenuPress: () => void;
  messageUnreadCount?: number;
  onNavigateToJobDetail?: (jobSlug: string) => void;
  onNavigateToJobAlerts?: () => void;
  onBack?: () => void; // Add back navigation prop
  onLogout?: () => void;
  // Navigation props for sidebar and bottom navigation
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

interface FavouriteJob {
  id: number;
  title: string;
  company_name: string;
  company_logo?: string;
  company_slug: string;
  city?: string;
  country?: string;
  state?: string;
  salary_from?: string;
  salary_to?: string;
  salary_currency?: string;
  hide_salary: number;
  job_type?: string;
  career_level?: string;
  functional_area?: string;
  created_at: string;
  slug: string;
  description?: string;
}

interface FavouriteJobsResponse {
  success: boolean;
  data: {
    token: string;
  };
  message: {
    jobs: FavouriteJob[];
    id_values: any[];
    total_favourites: number;
  };
}

const FavouriteJobs: React.FC<FavouriteJobsProps> = ({
  onMenuPress,
  messageUnreadCount = 0,
  onNavigateToJobDetail,
  onNavigateToJobAlerts,
  onBack,
  onLogout,
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
  const [favouriteJobs, setFavouriteJobs] = useState<FavouriteJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('favourites');

  // Fetch favourite jobs from API
  const fetchFavouriteJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        setError(t('please_sign_in_view_favourites'));
        setLoading(false);
        return;
      }

      const response = await fetch(buildApiUrl('/my-favourite-jobs'), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear it
          await AsyncStorage.removeItem('authToken');
          setError(t('authentication_failed'));
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setLoading(false);
        return;
      }

      const data: FavouriteJobsResponse = await response.json();

      // Extract jobs from the correct response structure
      let jobsArray: FavouriteJob[] = [];

      if (data.success && data.message?.jobs && Array.isArray(data.message.jobs)) {
        jobsArray = data.message.jobs;
      }

      if (jobsArray.length > 0) {
        setFavouriteJobs(jobsArray);
      } else {
        setFavouriteJobs([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch favourite jobs';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavouriteJobs();
  }, []);

  const removeFromFavourites = async (jobSlug: string) => {
    Alert.alert(
      t('remove_from_favourites_title'),
      t('remove_from_favourites_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              const authToken = await AsyncStorage.getItem('authToken');
              if (!authToken) {
                Alert.alert(t('error'), t('please_sign_in_remove'));
                return;
              }

              const response = await fetch(buildApiUrl(`/remove-from-favourite-job/${jobSlug}`), {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              });

              if (response.ok) {
                // Remove from local state
                setFavouriteJobs(prev => prev.filter(job => job.slug !== jobSlug));
              } else {
                Alert.alert(t('error'), t('failed_remove_favourite'));
              }
            } catch (error) {
              Alert.alert(t('error'), t('failed_remove_favourite'));
            }
          }
        }
      ]
    );
  };

  const formatSalary = (job: FavouriteJob): string => {
    if (job.hide_salary) {
      return t('salary_disclosed');
    }

    if (job.salary_from && job.salary_to && job.salary_currency) {
      return `${job.salary_currency}${job.salary_from} - ${job.salary_currency}${job.salary_to}`;
    }

    return t('salary_not_specified');
  };

  const formatLocation = (job: FavouriteJob): string => {
    const parts = [];
    if (job.city) parts.push(job.city);
    if (job.state) parts.push(job.state);
    if (job.country) parts.push(job.country);

    return parts.length > 0 ? parts.join(', ') : t('location_not_specified');
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t('date_not_available');

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return t('date_not_available');
    }
  };

  const CompanyLogo: React.FC<{ logoPath: string; companyName: string }> = ({ logoPath, companyName }) => {
    const [showPlaceholder, setShowPlaceholder] = useState(false);

    const logoUrl = buildCompanyLogoUrl(logoPath);

    const handleError = () => {
      setShowPlaceholder(true);
    };

    if (showPlaceholder || !logoPath) {
      return (
        <View style={styles.companyLogoPlaceholder}>
          <Text style={styles.companyLogoText}>
            {companyName ? companyName.charAt(0).toUpperCase() : 'C'}
          </Text>
        </View>
      );
    }

    return (
      <Image
        source={{ uri: logoUrl }}
        style={styles.companyLogo}
        onError={handleError}
        defaultSource={require('../../assets/company-placeholder.png')}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title={t('favourite_jobs')}
          onMenuPress={onMenuPress}
          onBack={onBack}
          showBack={!!onBack}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#17D27C" />
          <Text style={styles.loadingText}>{t('loading_favourites')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header
          title={t('favourite_jobs')}
          onMenuPress={onMenuPress}
          onBack={onBack}
          showBack={!!onBack}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={80} color="#FF6B6B" />
          <Text style={styles.errorTitle}>{t('something_went_wrong')}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchFavouriteJobs}>
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={t('favourite_jobs')}
        onMenuPress={() => setSidebarVisible(true)}
        onBack={onBack}
        showBack={!!onBack}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.actionButton, styles.searchButton]}>
              <MaterialIcons name="search" size={30} color="#fff" />
              <Text style={styles.searchButtonText}>{t('search_jobs')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.resumeButton]}>
              <MaterialIcons name="description" size={30} color="#fff" />
              <Text style={styles.resumeButtonText}>{t('update_resume')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.alertsButton]}
              onPress={onNavigateToJobAlerts}
            >
              <MaterialIcons name="notifications" size={30} color="#fff" />
              <Text style={styles.alertsButtonText}>{t('job_alerts')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Favourite Jobs List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('saved_jobs')}</Text>

          {favouriteJobs.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobHeader}>
                <View style={styles.jobInfo}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <View style={styles.companyRow}>
                    {job.company_logo ? (
                      <CompanyLogo logoPath={job.company_logo} companyName={job.company_name} />
                    ) : (
                      <View style={styles.companyLogoPlaceholder}>
                        <Text style={styles.companyLogoText}>
                          {job.company_name ? job.company_name.charAt(0).toUpperCase() : 'C'}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.companyName}>{job.company_name || t('company_name_not_available')}</Text>
                  </View>
                  <View style={styles.jobMeta}>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="location-on" size={16} color="#666" />
                      <Text style={styles.metaText}>{formatLocation(job)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="attach-money" size={16} color="#666" />
                      <Text style={styles.metaText}>{formatSalary(job)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="work" size={16} color="#666" />
                      <Text style={styles.metaText}>{job.job_type || t('not_specified')}</Text>
                    </View>
                    {job.career_level && (
                      <View style={styles.metaItem}>
                        <MaterialIcons name="trending-up" size={16} color="#666" />
                        <Text style={styles.metaText}>{job.career_level}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.favouriteButton}
                  onPress={() => removeFromFavourites(job.slug)}
                >
                  <MaterialIcons name="favorite" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              </View>

              <View style={styles.jobFooter}>
                <View style={styles.dateContainer}>
                  <MaterialIcons name="schedule" size={16} color="#999" />
                  <Text style={styles.dateText}>
                    {t('posted_on', { date: formatDate(job.created_at) })}
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFromFavourites(job.slug)}
                  >
                    <MaterialIcons name="delete" size={18} color="#fff" />
                    <Text style={styles.removeButtonText}>{t('remove')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => onNavigateToJobDetail?.(job.slug)}
                  >
                    <MaterialIcons name="visibility" size={18} color="#17D27C" />
                    <Text style={styles.viewButtonText}>{t('view_details')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* No Favourites State */}
        {favouriteJobs.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="favorite-border" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>{t('no_favourites_yet')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('start_saving_jobs')}
            </Text>
            <TouchableOpacity style={styles.searchJobsButton}>
              <MaterialIcons name="search" size={20} color="#fff" />
              <Text style={styles.searchJobsButtonText}>{t('search_jobs')}</Text>
            </TouchableOpacity>
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
              // Already on favourites
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
    backgroundColor: '#f8f9fa',
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
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#17D27C',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  jobInfo: {
    flex: 1,
    marginRight: 15,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  companyLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  companyLogoPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#17D27C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  companyLogoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  companyName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  jobMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  favouriteButton: {
    padding: 5,
  },
  jobFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  dateText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#17D27C',
  },
  viewButtonText: {
    color: '#17D27C',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  searchJobsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17D27C',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  searchJobsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    width: '30%',
    textAlign: 'center',
  },
  actionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  searchButton: {
    backgroundColor: '#17D27C',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  resumeButton: {
    backgroundColor: '#5D2DF9',
  },
  resumeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  alertsButton: {
    backgroundColor: '#333333',
  },
  alertsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default FavouriteJobs;
