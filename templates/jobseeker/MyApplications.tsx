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
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../Header';
import Sidebar from '../Sidebar';
import Navigation from '../Navigation';
import { buildApiUrl } from '../../config/api';
import { getSeekerApplications, JobApplication as ServiceJobApplication } from '../../services/jobsService';
import { getAuthToken, clearAuthData, storeAuthData } from '../../services/authStorage';
import { handleNavigation, NavigationFunctions } from '../../utils/navigationHandler';
import { useTranslation } from 'react-i18next';

// Extended interface for local use that includes both API and additional display properties
interface JobApplication extends Omit<ServiceJobApplication, 'status'> {
  // Additional properties for display
  company_name?: string;
  company_logo?: string;
  location?: string;
  salary_min?: number;
  salary_max?: string;
  job_type?: string;
  job_slug?: string; // Add job slug for navigation
  // Override status to match backend values
  status: 'applied' | 'shortlist' | 'hired' | 'rejected' | 'pending' | 'reviewed' | 'accepted';
}

interface MyApplicationsProps {
  onMenuPress: () => void;
  onRefreshAuth?: () => Promise<boolean>;
  messageUnreadCount?: number;
  onNavigateToJobDetail?: (jobSlug: string) => void; // Changed to accept job slug string
  onBack?: () => void; // Add back navigation prop
  onLogout?: () => void;
  // Navigation props for sidebar and bottom navigation
  onNavigateToJobAlerts?: () => void;
  onNavigateToMyFollowings?: () => void;
  onNavigateToEditProfile?: () => void;
  onNavigateToBuildResume?: () => void;
  onNavigateToMyApplications?: () => void;
  onNavigateToFavouriteJobs?: () => void;
  onNavigateToJobSearch?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToCompanies?: () => void;
  onNavigateToPackages?: () => void;
  onNavigateToPaymentHistory?: () => void;
}

const MyApplications: React.FC<MyApplicationsProps> = ({
  onMenuPress,
  onRefreshAuth,
  messageUnreadCount = 0,
  onNavigateToJobDetail,
  onBack,
  onLogout,
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
}) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('applications');

  // Ensure applications is always an array
  useEffect(() => {
    if (!applications || !Array.isArray(applications)) {
      setApplications([]);
    }
  }, [applications]);

  // Fetch job applications from API
  const fetchApplications = async () => {
    try {
      setLoading(true);
      setAuthStatus('loading');

      // Get the real authentication token from AsyncStorage
      const authToken = await getAuthToken();

      if (!authToken) {
        setAuthStatus('unauthenticated');
        setApplications([]);
        return;
      }

      setAuthStatus('authenticated');

      // Try the service layer first
      const response = await getSeekerApplications(authToken);

      // Check if service response contains valid applications data
      if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Additional validation: ensure each item has required fields
        const validApplications = response.data.filter(app =>
          app && typeof app === 'object' &&
          app.id && app.job_title && app.status
        );

        if (validApplications.length > 0) {
          setApplications(validApplications as JobApplication[]);
        } else {
          await fetchApplicationsDirect(authToken);
        }
      } else {
        // If the service call fails or returns invalid data, try direct API call as fallback
        await fetchApplicationsDirect(authToken);
      }
    } catch (error) {
      // Try direct API call as fallback
      const authToken = await getAuthToken();
      if (authToken) {
        await fetchApplicationsDirect(authToken);
      } else {
        setAuthStatus('unauthenticated');
        setApplications([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Direct API call as fallback
  const fetchApplicationsDirect = async (authToken: string) => {
    try {
      // Try to get real job applications from the correct endpoint
      const apiUrl = buildApiUrl('/my-job-applications');

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuthData();
          setAuthStatus('unauthenticated');
          setApplications([]);

          // Notify parent component to refresh auth state
          if (onRefreshAuth) {
            await onRefreshAuth();
          }
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();

      // Check if response contains HTML (likely an error page or login form)
      if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html') || responseText.includes('Login')) {
        // Clear the token if we're getting HTML responses
        clearAuthData();
        setAuthStatus('unauthenticated');
        setApplications([]);

        // Notify parent component to refresh auth state
        if (onRefreshAuth) {
          await onRefreshAuth();
        }
        return;
      }

      const jsonStartIndex = responseText.indexOf('{');
      if (jsonStartIndex === -1) {
        setApplications([]);
        return;
      }

      const jsonText = responseText.substring(jsonStartIndex);

      try {
        const data = JSON.parse(jsonText);

        // Initialize applications as empty array by default
        let applicationsData: JobApplication[] = [];

        if (data.success && data.message && data.message.jobs) {
          // The real data is in data.message.jobs
          const jobsData = data.message.jobs || [];

          // Convert jobs to applications format
          applicationsData = jobsData.map((job: any) => ({
            id: job.id,
            job_id: job.id,
            job_slug: job.slug, // Add job slug for navigation
            job_title: job.title,
            seeker_id: 0, // Not provided by this endpoint
            seeker_name: '', // Not provided by this endpoint
            seeker_email: '', // Not provided by this endpoint
            status: job.application_status || 'pending', // Use real status from backend
            applied_at: job.applied_at || job.created_at || new Date().toISOString(), // Use real application date first
            // Additional display properties
            company_name: job.company_name,
            location: `${job.city_name || ''} ${job.state_name || ''} ${job.country_name || ''}`.trim(),
            salary_min: job.salary_from ? parseInt(job.salary_from) : undefined,
            salary_max: job.salary_to,
            job_type: job.job_type,
          }));
        } else if (data.success && data.message && data.message.applications) {
          applicationsData = data.message.applications.data || [];
        } else if (data.success && data.data) {
          applicationsData = data.data || [];
        } else if (data.applications) {
          applicationsData = data.applications || [];
        }

        // Ensure applicationsData is always an array
        if (!Array.isArray(applicationsData)) {
          applicationsData = [];
        }

        setApplications(applicationsData);

      } catch (parseError) {
        setApplications([]);
      }
    } catch (error) {
      setApplications([]);
    }
  };

  // Function to handle login (you can call this from your login screen)
  const handleLogin = async (token: string) => {
    try {
      await storeAuthData({ token });
      // Refresh applications after login
      await fetchApplications();
    } catch (error) {
      console.error('Error storing auth token:', error);
    }
  };

  // Function to handle logout
  const handleLogout = async () => {
    try {
      clearAuthData();
      setAuthStatus('unauthenticated');
      setApplications([]);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied':
        return 'schedule';
      case 'shortlist':
        return 'event';
      case 'hired':
        return 'check-circle';
      case 'rejected':
        return 'cancel';
      case 'pending':
        return 'schedule';
      case 'reviewed':
        return 'check-circle';
      case 'accepted':
        return 'check-circle';
      default:
        return 'info';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied':
        return '#3f51b5'; // Dark blue text
      case 'shortlist':
        return '#f57c00'; // Dark orange text
      case 'hired':
        return '#388e3c'; // Dark green text
      case 'rejected':
        return '#d32f2f'; // Dark red text
      case 'pending':
        return '#FFA500'; // Keep existing
      case 'reviewed':
        return '#4ECDC4'; // Keep existing
      case 'accepted':
        return '#4CAF50'; // Keep existing
      default:
        return '#666'; // Default gray
    }
  };

  const getStatusBackground = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied':
        return '#d7dff1'; // Blue background (as requested)
      case 'shortlist':
        return '#f7edd9'; // Orange background (as requested)
      case 'hired':
        return '#d0efd0'; // Green background (as requested)
      case 'rejected':
        return '#f1d7dc'; // Red background (as requested)
      case 'pending':
        return '#FFF3E0'; // Keep existing
      case 'reviewed':
        return '#E0F2F1'; // Keep existing
      case 'accepted':
        return '#E8F5E8'; // Keep existing
      default:
        return '#F5F5F5'; // Default gray
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied':
        return t('status_pending'); // Assuming 'applied' maps to 'pending' or keep as is if there is specific key
      case 'shortlist':
        return t('status_shortlisted');
      case 'hired':
        return t('status_hired');
      case 'rejected':
        return t('status_rejected');
      case 'pending':
        return t('status_under_review');
      case 'reviewed':
        return t('status_reviewed');
      case 'accepted':
        return t('status_accepted');
      default:
        return status; // Show the actual status if not recognized
    }
  };
  // Format posted date
  const formatPostedDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return t('day_ago');
    if (diffDays < 7) return t('days_ago', { count: diffDays });
    if (diffDays < 30) return t('weeks_ago', { count: Math.ceil(diffDays / 7) });
    if (diffDays < 365) return t('months_ago', { count: Math.ceil(diffDays / 30) });
    return t('years_ago', { count: Math.ceil(diffDays / 365) });
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  if (loading) {
    return (
      <LinearGradient
        colors={['#F5F6FD', '#E4F4EC']}
        style={styles.container}
      >
        <Header
          title={t('my_applications')}
          subtitle={t('track_applications')}
          onMenuPress={() => setSidebarVisible(true)}
          onBack={onBack}
          showBack={!!onBack}
        />

        <View style={styles.loadingContainer}>
          <MaterialIcons name="hourglass-empty" size={48} color="#666" />
          <Text style={styles.loadingText}>{t('loading_jobs')}</Text>
        </View>

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
              case 'applications':
                // Already on applications
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
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#F5F6FD', '#E4F4EC']}
      style={styles.container}
    >
      <Header
        title={t('my_applications')}
        subtitle={t('track_applications')}
        onMenuPress={() => setSidebarVisible(true)}
        onBack={onBack}
        showBack={!!onBack}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Authentication Status Notice */}
        {authStatus === 'unauthenticated' && (
          <View style={styles.authNotice}>
            <MaterialIcons name="lock" size={20} color="#FF9800" />
            <Text style={styles.authNoticeText}>
              {t('sign_in_view_applications')}
            </Text>
            <TouchableOpacity style={styles.loginButton} onPress={() => {
              // You can navigate to login screen here
              Alert.alert(t('login_required'), t('sign_in_view_applications'));
            }}>
              <Text style={styles.loginButtonText}>{t('sign_in')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Summary - Only show when authenticated and have applications */}
        {authStatus === 'authenticated' && applications && Array.isArray(applications) && applications.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{applications.length}</Text>
              <Text style={styles.statLabel}>{t('total_applications')}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {applications.filter(app => app.status === 'rejected').length}
              </Text>
              <Text style={styles.statLabel}>{t('status_rejected')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {applications.filter(app => app.status === 'shortlist').length}
              </Text>
              <Text style={styles.statLabel}>{t('status_shortlisted')}</Text>
            </View>
          </View>
        )}

        {/* Applications List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {authStatus === 'authenticated' ? t('my_applications') : t('job_applications')}
          </Text>

          {!applications || applications.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="work-off" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>
                {authStatus === 'authenticated' ? t('no_applications') : t('login_required')}
              </Text>
              <Text style={styles.emptySubtitle}>
                {authStatus === 'authenticated'
                  ? t('no_applications_msg')
                  : t('sign_in_view_applications')
                }
              </Text>
              {authStatus === 'authenticated' ? (
                <TouchableOpacity style={styles.searchJobsButton}>
                  <MaterialIcons name="search" size={20} color="#fff" />
                  <Text style={styles.searchJobsButtonText}>{t('browse_jobs')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.searchJobsButton} onPress={() => {
                  Alert.alert(t('login_required'), t('sign_in_view_applications'));
                }}>
                  <MaterialIcons name="login" size={20} color="#fff" />
                  <Text style={styles.searchJobsButtonText}>{t('sign_in')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            // Safety check: ensure applications is an array before mapping
            Array.isArray(applications) ? (
              applications.map((application) => (
                <View key={application.id} style={styles.applicationCard}>
                  <View style={styles.applicationHeader}>
                    <View style={styles.jobInfo}>
                      <Text style={styles.jobTitle}>{application.job_title}</Text>
                      <Text style={styles.companyName}>{application.company_name || t('company_name_not_available')}</Text>
                      <View style={styles.jobMeta}>
                        <View style={styles.metaItem}>
                          <MaterialIcons name="location-on" size={16} color="#666" />
                          <Text style={styles.metaText}>{application.location || t('location_not_specified')}</Text>
                        </View>
                        {(application.salary_min || application.salary_max) && (
                          <View style={styles.metaItem}>
                            <MaterialIcons name="attach-money" size={16} color="#666" />
                            <Text style={styles.metaText}>
                              {application.salary_min && application.salary_max
                                ? `$${application.salary_min} - $${application.salary_max}`
                                : application.salary_min
                                  ? `$${application.salary_min}+`
                                  : application.salary_max
                                    ? `${t('salary')} ${t('to')} $${application.salary_max}`
                                    : t('salary_not_specified')
                              }
                            </Text>
                          </View>
                        )}
                        {application.job_type && (
                          <View style={styles.metaItem}>
                            <MaterialIcons name="work" size={16} color="#666" />
                            <Text style={styles.metaText}>{application.job_type}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.statusContainer}>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusBackground(application.status) }
                      ]}>
                        <MaterialIcons
                          name={getStatusIcon(application.status) as any}
                          size={16}
                          color={getStatusColor(application.status)}
                        />
                        <Text style={[styles.statusText, { color: getStatusColor(application.status) }]}>
                          {getStatusText(application.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.applicationFooter}>
                    <View style={styles.dateContainer}>
                      <MaterialIcons name="schedule" size={16} color="#999" />
                      <Text style={styles.dateText}>
                        {t('applied_date', { date: formatPostedDate(application.applied_at) })}
                      </Text>
                    </View>

                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          // Navigate to the existing JobDetail screen

                          if (onNavigateToJobDetail) {
                            // Use job_slug if available, otherwise fall back to job_id or id
                            const jobSlug = application.job_slug;
                            const jobId = application.job_id || application.id;

                            if (jobSlug) {
                              onNavigateToJobDetail(jobSlug);
                            } else if (jobId) {
                              onNavigateToJobDetail(jobId.toString());
                            } else {
                              Alert.alert(t('error'), t('job_not_found_msg'));
                            }
                          } else {
                            Alert.alert(t('error'), 'Navigation not available');
                          }
                        }}
                      >
                        <MaterialIcons name="link" size={18} color="#fff" />
                        <Text style={styles.actionButtonText}>{t('job_details_action')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="error" size={80} color="#FF6B6B" />
                <Text style={styles.emptyTitle}>{t('data_error')}</Text>
                <Text style={styles.emptySubtitle}>
                  {t('loading_applications_error')}
                </Text>
                <TouchableOpacity style={styles.searchJobsButton} onPress={fetchApplications}>
                  <MaterialIcons name="refresh" size={20} color="#fff" />
                  <Text style={styles.searchJobsButtonText}>{t('refresh')}</Text>
                </TouchableOpacity>
              </View>
            )
          )}
        </View>


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
            case 'applications':
              // Already on applications
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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
  applicationCard: {
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
  applicationHeader: {
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
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 5,
  },
  applicationFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#5D2DF9',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  authNotice: {
    flexDirection: 'column', // Changed to column for better layout
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 20, // Increased padding
    paddingHorizontal: 20, // Increased padding
    borderRadius: 12, // Increased border radius
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#FF9800',
  },
  authNoticeText: {
    fontSize: 16, // Increased font size
    color: '#FF9800',
    marginBottom: 15, // Added margin
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MyApplications;
