import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../Header';
import Sidebar from '../Sidebar';
import Navigation from '../Navigation';
import { buildApiUrl } from '../../config/api';
import { handleNavigation, NavigationFunctions } from '../../utils/navigationHandler';
import { useTranslation } from 'react-i18next';

interface JobAlertsProps {
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
  onNavigateToJobSearch?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToCompanies?: () => void;
  onNavigateToPackages?: () => void;
  onNavigateToPaymentHistory?: () => void;
}

interface JobAlert {
  id: number;
  name: string | null;
  email: string;
  user_id: number | null;
  search_title: string;
  country_id: string | null;
  state_id: number | null;
  city_id: number | null;
  functional_area_id: number | null;
  created_at: string;
  updated_at: string;
}

interface JobAlertsResponse {
  success: boolean;
  data: JobAlert[];
  message: string;
}

const JobAlerts: React.FC<JobAlertsProps> = ({
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
  onNavigateToJobSearch,
  onNavigateToProfile,
  onNavigateToMessages,
  onNavigateToCompanies,
  onNavigateToPackages,
  onNavigateToPaymentHistory
}) => {
  const { t } = useTranslation();
  const [jobAlerts, setJobAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');

  // Fetch user profile to get email
  const fetchUserProfile = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');

      if (!authToken) return;

      const response = await fetch(buildApiUrl('/my-profile'), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.data && data.data.email) {
          setUserEmail(data.data.email);
        }
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const fetchJobAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        setError(t('sign_in_view_alerts'));
        setLoading(false);
        return;
      }

      const response = await fetch(buildApiUrl('/my-alerts'), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await AsyncStorage.removeItem('authToken');
          setError('Authentication failed. Please sign in again.');
        } else if (response.status === 500) {
          try {
            const errorText = await response.text();
            if (errorText.includes('Alert') || errorText.includes('alert')) {
              setError(t('alerts_feature_unavailable'));
            } else {
              setError(t('server_error_msg'));
            }
          } catch (parseError) {
            setError(t('server_error_msg'));
          }
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setLoading(false);
        return;
      }

      const data: JobAlertsResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setJobAlerts(data.data);
      } else {
        setJobAlerts([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('failed_to_load_job_alerts') || 'Failed to fetch job alerts';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobAlerts();
    fetchUserProfile(); // Fetch user profile when component mounts
  }, []);

  const deleteAlert = async (alertId: number) => {
    Alert.alert(
      t('delete_alert_title'),
      t('delete_alert_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const authToken = await AsyncStorage.getItem('authToken');
              if (!authToken) {
                Alert.alert(t('error'), t('please_sign_in_delete_alert'));
                return;
              }

              const response = await fetch(buildApiUrl(`/delete-alert/${alertId}`), {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              });

              if (response.ok) {
                setJobAlerts(prev => prev.filter(alert => alert.id !== alertId));
                Alert.alert(t('success'), t('alert_deleted_success'));
              } else {
                Alert.alert(t('error'), t('failed_delete_alert'));
              }
            } catch (error) {
              Alert.alert(t('error'), t('failed_delete_alert'));
            }
          }
        }
      ]
    );
  };

  const createAlert = async () => {
    if (!newAlertTitle.trim()) {
      Alert.alert(t('error'), t('enter_alert_title'));
      return;
    }

    try {
      setCreating(true);
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert(t('error'), t('please_sign_in_create_alert') || t('authentication_failed'));
        return;
      }

      const response = await fetch(buildApiUrl('/create-alert'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          search_title: newAlertTitle.trim(),
          email: userEmail, // Use the fetched user email
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          await fetchJobAlerts();
          setNewAlertTitle('');
          setShowCreateModal(false);
          Alert.alert(t('success'), t('alert_created_success'));
        } else {
          Alert.alert(t('error'), result.message || t('failed_create_alert'));
        }
      } else {
        const errorText = await response.text();
        Alert.alert(t('error'), t('failed_create_alert'));
      }
    } catch (error) {
      Alert.alert(t('error'), t('failed_create_alert'));
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date not available';

      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) return t('today');
      if (diffDays === 2) return t('yesterday');
      if (diffDays <= 7) return t('days_ago', { count: diffDays - 1 });

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return t('date_not_available');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title={t('job_alerts')}
          onMenuPress={onMenuPress}
          onBack={onBack}
          showBack={!!onBack}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>{t('loading_job_alerts')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header
          title={t('job_alerts')}
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
          <TouchableOpacity style={styles.retryButton} onPress={fetchJobAlerts}>
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
        title={t('job_alerts')}
        onMenuPress={() => setSidebarVisible(true)}
        onBack={onBack}
        showBack={!!onBack}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <MaterialIcons name="notifications-active" size={28} color="#6366f1" />
              <Text style={styles.pageTitle}>{t('job_alerts')}</Text>
            </View>
            <Text style={styles.pageSubtitle}>
              {t('job_alerts_subtitle')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.createButtonText}>{t('create_new_alert')}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{jobAlerts.length}</Text>
            <Text style={styles.statLabel}>{t('active_alerts')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{jobAlerts.filter(alert =>
              new Date(alert.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length}</Text>
            <Text style={styles.statLabel}>{t('this_week')}</Text>
          </View>
        </View>

        {/* Alerts List */}
        {jobAlerts.length > 0 ? (
          <View style={styles.alertsContainer}>
            <Text style={styles.sectionTitle}>{t('your_job_alerts')}</Text>

            {jobAlerts.map((alert, index) => (
              <View key={alert.id} style={[styles.alertCard, index === jobAlerts.length - 1 && styles.lastCard]}>
                <View style={styles.alertContent}>
                  <View style={styles.alertIconContainer}>
                    <MaterialIcons name="work" size={24} color="#17D27C" />
                  </View>

                  <View style={styles.alertDetails}>
                    <Text style={styles.alertTitle}>{alert.search_title || t('no_title')}</Text>
                    <Text style={styles.alertDate}>{formatDate(alert.created_at)}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteAlert(alert.id)}
                  >
                    <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="notifications-off" size={80} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>{t('no_alerts_yet')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('create_first_alert_msg')}
            </Text>
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={() => setShowCreateModal(true)}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.createFirstButtonText}>{t('create_first_alert')}</Text>
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
              onNavigateToFavouriteJobs?.();
              break;
            case 'profile':
              onNavigateToProfile?.();
              break;
          }
        }}
        userType="seeker"
      />

      {/* Create Alert Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('create_job_alert')}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCreateModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('alert_title_label')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('alert_title_placeholder')}
                value={newAlertTitle}
                onChangeText={setNewAlertTitle}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('email')}</Text>
              <TextInput
                style={[styles.textInput, styles.disabledInput]}
                value={userEmail || 'Loading...'}
                editable={false}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, !newAlertTitle.trim() && styles.disabledAddButton]}
                onPress={createAlert}
                disabled={creating || !newAlertTitle.trim()}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="add" size={18} color="#fff" />
                    <Text style={styles.addButtonText}>{t('create_alert')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerContent: {
    flex: 1,
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
    marginLeft: 40,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17D27C',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#17D27C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 20,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#1E44C0',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#8493a7',
    marginHorizontal: 16,
  },

  // Alerts Container
  alertsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  lastCard: {
    marginBottom: 0,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  alertDetails: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  alertDate: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
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
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f9fafb',
    borderColor: '#d1d5db',
    color: '#6b7280',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  disabledAddButton: {
    backgroundColor: '#d1d5db',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default JobAlerts;
