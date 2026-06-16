import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Navigation from '../Navigation';
import Sidebar from '../Sidebar';
import CompanySidebar from '../company/CompanySidebar';
import CompanyBottomNav, { CompanyTabId, COMPANY_BOTTOM_NAV_CONTENT_INSET } from '../company/CompanyBottomNav';
import { buildApiUrl, buildAssetUrl } from '../../config/api';
import { handleNavigation, NavigationFunctions } from '../../utils/navigationHandler';
import { packageService } from '../../services';
import { useTranslation } from 'react-i18next';

interface JobDetailProps {
  onBack: () => void;
  onMenuPress: () => void;
  onApply: () => void;
  jobSlug: string;
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
  onNavigateToEmailToFriend?: (jobSlug: string, jobTitle: string, companyName?: string) => void;
  onNavigateToReportAbuse?: (jobSlug: string, jobTitle: string, companyName?: string) => void;
  onNavigateToApplyJob?: (jobSlug: string, jobTitle: string, companyName?: string) => void;
  onNavigateToCompanyDetail?: (companySlug: string) => void;
  messageUnreadCount?: number;
  /** When logged in as company, show company sidebar/nav and use these handlers */
  loggedInUserType?: 'seeker' | 'company';
  onCompanyMenuPress?: (key: string) => void;
  onLogout?: () => void;
  companyName?: string;
  companyLogo?: string;
  /** Company dashboard-style bottom tabs (Home, Post job, Packages, Chat, Profile) */
  onCompanyNavPress?: (tab: CompanyTabId) => void;
}

interface JobDetailData {
  id: number;
  title: string;
  company_name: string;
  company_logo?: string; // Changed from logo to company_logo
  country_name: string;
  state_name: string;
  city_name: string;
  location: string; // Company location from jobs.location
  salary_from: string;
  salary_to: string;
  salary_currency: string;
  salary_period: string;
  job_type: string;
  career_level: string;
  job_shift: string;
  degree_level: string;
  job_experience: string;
  description: string;
  benefits: string;
  functional_area: string;
  num_of_positions: string;
  gender: string;
  expiry_date: string;
  created_at: string;
  job_skills: Array<{
    id: number;
    job_id: number;
    job_skill_id: number;
  }>;
  company_slug?: string;
  company?: { slug?: string; id?: number; name?: string };
}

type TabType = 'job-detail' | 'description' | 'company';

const JobDetail: React.FC<JobDetailProps> = ({
  onBack,
  onMenuPress,
  onApply,
  jobSlug,
  messageUnreadCount,
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
  onNavigateToPaymentHistory,
  onNavigateToEmailToFriend,
  onNavigateToReportAbuse,
  onNavigateToApplyJob,
  onNavigateToCompanyDetail,
  loggedInUserType = 'seeker',
  onCompanyMenuPress,
  onLogout,
  companyName,
  companyLogo,
  onCompanyNavPress,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('job-detail');
  const [jobData, setJobData] = useState<JobDetailData | null>(null);
  const [companyIdentifierFallback, setCompanyIdentifierFallback] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [navigationActiveTab, setNavigationActiveTab] = useState('search');
  const [userType, setUserType] = useState<'seeker' | null>('seeker');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const isCompany = loggedInUserType === 'company';

  // New state variables for apply button logic
  const [isJobExpired, setIsJobExpired] = useState(false);
  const [hasAlreadyApplied, setHasAlreadyApplied] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // State for save job functionality
  const [isJobSaved, setIsJobSaved] = useState(false);
  const [isSavingJob, setIsSavingJob] = useState(false);

  // Fetch job details from API
  const fetchJobDetails = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Use the correct API endpoint for job details
      const apiUrl = buildApiUrl(`/job/${jobSlug}`);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.message && data.message.job) {
        const message = data.message as Record<string, any>;
        const job = message.job as Record<string, any>;
        const companyObj = (message.company ?? message.employer ?? {}) as Record<string, any>;
        const fallbackIdentifier =
          (companyObj.slug && String(companyObj.slug).trim()) ||
          (companyObj.id != null ? String(companyObj.id).trim() : '') ||
          (message.company_slug && String(message.company_slug).trim()) ||
          (message.employer_slug && String(message.employer_slug).trim()) ||
          (message.company_id != null ? String(message.company_id).trim() : '') ||
          (message.employer_id != null ? String(message.employer_id).trim() : '') ||
          (job.company_id != null ? String(job.company_id).trim() : '') ||
          (job.employer_id != null ? String(job.employer_id).trim() : '') ||
          '';

        setCompanyIdentifierFallback(fallbackIdentifier);
        setJobData(data.message.job);
      } else {
        throw new Error('Invalid response structure from API');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('failed_to_load_job');
      setErrorMsg(errorMessage);
      Alert.alert(t('error'), errorMessage);
    } finally {
      setLoading(false);
    }
  }, [jobSlug]);

  useEffect(() => {
    if (jobSlug) {
      void fetchJobDetails();
    }
  }, [jobSlug, fetchJobDetails]);

  // Format posted date
  const formatPostedDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
    } catch {
      return t('recent');
    }
  };

  // Format salary display
  const formatSalary = (): string => {
    if (!jobData) return t('salary_not_specified');

    // currency code from jobs.salary_currency
    const currency = jobData.salary_currency || '$';

    // map period values from DB → nice display
    const periodMap: Record<string, string> = {
      monthly: t('per_month'),
      yearly: t('per_year'),
      weekly: t('per_week'),
      daily: t('per_day'),
      hourly: t('per_hour'),
    };

    const period =
      jobData.salary_period && periodMap[jobData.salary_period.toLowerCase()]
        ? ` ${periodMap[jobData.salary_period.toLowerCase()]}`
        : '';

    // full salary range
    if (jobData.salary_from && jobData.salary_to) {
      return `${currency}${Number(jobData.salary_from).toLocaleString()} - ${currency}${Number(
        jobData.salary_to,
      ).toLocaleString()}${period}`;
    }

    // only "from" provided
    if (jobData.salary_from) {
      return `${currency}${Number(jobData.salary_from).toLocaleString()}${period}`;
    }

    return t('salary_not_specified');
  };


  // Function to strip HTML tags from text
  const stripHtmlTags = (html: string | null | undefined): string => {
    if (!html || typeof html !== 'string') {
      return '';
    }
    return html.replace(/<[^>]*>/g, '');
  };

  // Function to get skill name from skill ID
  const getSkillName = (skillId: number): string => {
    const skillNames: { [key: number]: string } = {
      1: 'Adobe Illustrator',
      2: 'Adobe Photoshop',
      6: 'CSS',
      8: 'HTML'
    };
    return skillNames[skillId] || `Skill ${skillId}`;
  };

  // Helper function to get company logo
  const getCompanyLogo = (): any => {
    if (!jobData || !jobData.company_logo || jobData.company_logo === '' || jobData.company_logo === 'null') {
      return require('../../assets/company-placeholder.png');
    }

    try {
      // Check if it's a valid URL
      new URL(jobData.company_logo);
      // Check if it's not a placeholder image
      if (jobData.company_logo.includes('no-image') || jobData.company_logo.includes('placeholder')) {
        return require('../../assets/company-placeholder.png');
      }
      return { uri: jobData.company_logo };
    } catch (error) {
      // If URL parsing fails, try to build a proper asset URL
      if (jobData.company_logo.startsWith('/')) {
        return { uri: buildAssetUrl(jobData.company_logo) };
      }
      return require('../../assets/company-placeholder.png');
    }
  };

  // Function to get authentication token
  const getAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (error) {
      return null;
    }
  };

  // Function to check if job is saved
  const checkJobSavedStatus = async () => {
    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        setIsJobSaved(false);
        return;
      }

      const url = buildApiUrl(`/check-favourite-status/${jobSlug}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const isFavourite = data.success && data.is_favourite;
        setIsJobSaved(isFavourite);
      } else {
        setIsJobSaved(false);
      }
    } catch (error) {
      setIsJobSaved(false);
    }
  };

  // Function to save/unsave job
  const toggleSaveJob = async () => {
    try {
      const authToken = await getAuthToken();

      if (!authToken) {
        Alert.alert(t('login_required'), t('sign_in_to_save_msg'));
        return;
      }

      setIsSavingJob(true);

      const endpoint = isJobSaved
        ? `/remove-from-favourite-job/${jobSlug}`
        : `/add-to-favourite-job/${jobSlug}`;

      const fullUrl = buildApiUrl(endpoint);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          setIsJobSaved(!isJobSaved);
          Alert.alert(
            'Success',
            isJobSaved ? t('job_removed_from_saved') : t('job_saved_successfully')
          );
        } else {
          Alert.alert(t('error'), data.message || t('failed_to_update_job_status'));
        }
      } else {
        const errorText = await response.text();
        Alert.alert(t('error'), `${t('failed_to_update_job_status')} (${response.status})`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(t('error'), `${t('failed_to_update_job_status')}: ${errorMessage}`);
    } finally {
      setIsSavingJob(false);
    }
  };

  // Function to check apply button conditions
  const checkApplyButtonConditions = useCallback(async () => {
    if (!jobData) return;

    try {
      // Check if job is expired
      if (jobData.expiry_date) {
        const expiryDate = new Date(jobData.expiry_date);
        const now = new Date();
        setIsJobExpired(expiryDate < now);
      }

      // Check if user is authenticated
      const authToken = await getAuthToken();
      setIsAuthenticated(!!authToken);

      if (authToken) {
        // Check if already applied to this job
        try {
          const applicationsResponse = await fetch(buildApiUrl('/my-job-applications'), {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (applicationsResponse.ok) {
            const applicationsData = await applicationsResponse.json();
            if (applicationsData.success && applicationsData.message && applicationsData.message.jobs) {
              const hasApplied = applicationsData.message.jobs.some((job: any) =>
                job.id === jobData.id || job.slug === jobSlug
              );
              setHasAlreadyApplied(hasApplied);
            }
          }
        } catch (error) {
          // Handle error silently
        }

        // For now, assume profile is complete (you can implement profile completeness check later)
        setIsProfileComplete(true);
      }
    } catch (error) {
      // Handle error silently
    }
  }, [jobData, jobSlug]);

  // Check conditions when job data changes
  useEffect(() => {
    if (jobData) {
      // Job data loaded successfully
      checkApplyButtonConditions();
      checkJobSavedStatus();
    }
  }, [jobData, checkApplyButtonConditions]);

  // Render tab content based on active tab
  const renderTabContent = () => {
    if (!jobData) {
      return null;
    }

    switch (activeTab) {
      case 'job-detail':
        return (
          <View style={styles.tabContent}>
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>{t('job_information')}</Text>
              {[
                {
                  icon: 'location-on',
                  label: t('job_location'),
                  value: [jobData.city_name, jobData.state_name, jobData.country_name].filter(Boolean).join(', ') || t('not_specified'),
                },
                { icon: 'work', label: t('job_type'), value: jobData.job_type || t('not_specified') },
                { icon: 'trending-up', label: t('career_level'), value: jobData.career_level || t('not_specified') },
                { icon: 'schedule', label: t('job_shift'), value: jobData.job_shift || t('not_specified') },
                { icon: 'school', label: t('degree_level'), value: jobData.degree_level || t('not_specified') },
                { icon: 'male', label: t('gender'), value: jobData.gender || t('not_specified') },
                { icon: 'group', label: t('positions'), value: jobData.num_of_positions || t('not_specified') },
                { icon: 'access-time', label: t('experience'), value: jobData.job_experience || t('not_specified') },
              ].map((item) => (
                <View key={item.label} style={styles.detailRow}>
                  <MaterialIcons name={item.icon as any} size={20} color="#666" />
                  <Text style={styles.detailLabel}>{item.label}:</Text>
                  <Text style={styles.detailValue}>{item.value}</Text>
                </View>
              ))}

              {jobData.expiry_date && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="event" size={20} color="#666" />
                  <Text style={styles.detailLabel}>{t('deadline')}:</Text>
                  <Text style={styles.detailValue}>{formatPostedDate(jobData.expiry_date || '')}</Text>
                </View>
              )}
            </View>
          </View>
        );

      case 'description':
        return (
          <View style={styles.tabContent}>
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>{t('job_description')}</Text>
              <Text style={styles.descriptionText}>{stripHtmlTags(jobData.description)}</Text>
            </View>

            {jobData.benefits && (
              <View style={styles.benefitsSection}>
                <Text style={styles.sectionTitle}>{t('benefits_perks')}</Text>
                <Text style={styles.descriptionText}>{stripHtmlTags(jobData.benefits)}</Text>
              </View>
            )}

            {jobData.job_skills?.length > 0 && (
              <View style={styles.skillsSection}>
                <Text style={styles.sectionTitle}>{t('required_skills')}</Text>
                <View style={styles.skillsContainer}>
                  {jobData.job_skills.map((skill) => (
                    <View key={skill.id} style={styles.skillTag}>
                      <Text style={styles.skillText}>{getSkillName(skill.job_skill_id)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        );

      case 'company':
        return (
          <View style={styles.tabContent}>
            <View style={styles.companySection}>
              <Text style={styles.sectionTitle}>{t('company_information')}</Text>
              <View style={styles.companyCard}>
                <View style={styles.companyLogoContainer}>
                  <Image
                    source={getCompanyLogo()}
                    style={styles.companyLogo}
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.companyInfo}>
                  <Text style={styles.companyName}>{jobData.company_name || t('company_name_not_available')}</Text>
                  <Text style={styles.companyLocation}>
                    {jobData.location || t('location_not_specified')}
                  </Text>
                </View>
              </View>

              {/* Current Openings */}
              <View style={styles.openingsSection}>
                <View style={styles.openingItem}>
                  <MaterialIcons name="work" size={20} color="#17D27C" />
                  <Text style={styles.openingText}>
                    {t('position_openings', { count: Number(jobData.num_of_positions || 0) })}
                  </Text>
                </View>
              </View>

              {/* View Profile Button */}
              <TouchableOpacity
                style={styles.viewProfileButton}
                activeOpacity={0.85}
                onPress={() => {
                  const j = jobData as JobDetailData & {
                    employer_slug?: string;
                    company_id?: number | string;
                    employer_id?: number | string;
                    user_id?: number | string;
                  };
                  const companyIdentifier =
                    j.company_slug?.trim() ||
                    j.company?.slug?.trim() ||
                    (j.employer_slug && String(j.employer_slug).trim()) ||
                    (j.company?.id != null ? String(j.company.id).trim() : '') ||
                    (j.company_id != null ? String(j.company_id).trim() : '') ||
                    (j.employer_id != null ? String(j.employer_id).trim() : '') ||
                    (j.user_id != null ? String(j.user_id).trim() : '') ||
                    companyIdentifierFallback ||
                    '';

                  if (__DEV__) {
                    console.log('[JobDetail] company profile navigation debug', {
                      resolvedIdentifier: companyIdentifier,
                      company_slug: j.company_slug,
                      company_nested_slug: j.company?.slug,
                      employer_slug: j.employer_slug,
                      company_nested_id: j.company?.id,
                      company_id: j.company_id,
                      employer_id: j.employer_id,
                      user_id: j.user_id,
                      fallback_from_response_message: companyIdentifierFallback,
                    });
                  }

                  if (companyIdentifier && onNavigateToCompanyDetail) {
                    onNavigateToCompanyDetail(companyIdentifier);
                    return;
                  }
                  Alert.alert(t('error'), t('company_profile_link_unavailable'));
                }}
              >
                <MaterialIcons name="visibility" size={20} color="white" />
                <Text style={styles.viewProfileButtonText}>{t('view_company_profile')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#F5F6FD', '#E4F4EC']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('job_overview')}</Text>
          <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuButton}>
            <MaterialIcons name="menu" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#17D27C" />
          <Text style={styles.loadingText}>{t('loading_job_details')}</Text>
        </View>
      </LinearGradient>
    );
  }

  if (errorMsg || !jobData) {
    return (
      <LinearGradient colors={['#F5F6FD', '#E4F4EC']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('job_overview')}</Text>
          <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuButton}>
            <MaterialIcons name="menu" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>{errorMsg || t('failed_to_load_job')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void fetchJobDetails()}>
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#F5F6FD', '#E4F4EC']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('job_overview')}</Text>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuButton}>
          <MaterialIcons name="menu" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          isCompany && onCompanyNavPress ? { paddingBottom: COMPANY_BOTTOM_NAV_CONTENT_INSET + 16 } : undefined
        }
      >
        {/* Job Overview Card */}
        <View style={styles.jobOverviewCard}>
          {/* Logo Section */}
          <View style={styles.companyLogoSection}>
            <Image
              source={getCompanyLogo()}
              style={styles.companyLogo}
              resizeMode="cover"
            />
          </View>

          {/* Job Info Section */}
          <View style={styles.jobInfoSection}>
            <Text style={styles.jobTitle}>{jobData.title || 'Job Title Not Available'}</Text>
            <Text style={styles.companyNameText}>{jobData.company_name || 'Company Name Not Available'}</Text>
            <View style={styles.locationSection}>
              <MaterialIcons name="location-on" size={16} color="#fff" />
              <Text style={styles.locationText}>{jobData.city_name || 'Location Not Available'}</Text>
            </View>
            <Text style={styles.salaryText}>
              <Text style={styles.salaryBold}>{formatSalary()}</Text>
            </Text>
            <Text style={styles.postedText}>
              {t('posted')}: {formatPostedDate(jobData.created_at || '')}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'job-detail' && styles.activeTab]}
            onPress={() => setActiveTab('job-detail')}
          >
            <MaterialIcons
              name="work"
              size={20}
              color={activeTab === 'job-detail' ? '#17D27C' : '#666'}
            />
            <Text style={[styles.tabText, activeTab === 'job-detail' && styles.activeTabText]}>
              {t('job_detail_tab')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'description' && styles.activeTab]}
            onPress={() => setActiveTab('description')}
          >
            <MaterialIcons
              name="description"
              size={20}
              color={activeTab === 'description' ? '#17D27C' : '#666'}
            />
            <Text style={[styles.tabText, activeTab === 'description' && styles.activeTabText]}>
              {t('description_tab')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'company' && styles.activeTab]}
            onPress={() => setActiveTab('company')}
          >
            <MaterialIcons
              name="business"
              size={20}
              color={activeTab === 'company' ? '#17D27C' : '#666'}
            />
            <Text style={[styles.tabText, activeTab === 'company' && styles.activeTabText]}>
              {t('company_tab')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {renderTabContent()}


        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.resumeButton]}
            onPress={() => {
              if (jobData) {
                // Navigate to email to friend screen
                // We'll use the navigation handler from props
                if (onNavigateToEmailToFriend) {
                  onNavigateToEmailToFriend(jobSlug, jobData.title, jobData.company_name);
                }
              }
            }}
          >
            <MaterialIcons name="mail" size={30} color="#fff" />
            <Text style={styles.resumeButtonText}>{t('email_to_friend')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.resumeButton,
              isJobSaved && styles.savedButton
            ]}
            onPress={toggleSaveJob}
            disabled={isSavingJob}
          >
            {isSavingJob ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons
                name={isJobSaved ? "bookmark" : "bookmark-border"}
                size={30}
                color="#fff"
              />
            )}
            <Text style={styles.resumeButtonText}>
              {isJobSaved ? t('remove_from_saved') : t('save_job')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.alertsButton]}
            onPress={() => {
              if (jobData && onNavigateToReportAbuse) {
                onNavigateToReportAbuse(jobSlug, jobData.title, jobData.company_name);
              }
            }}
          >
            <MaterialIcons name="warning" size={30} color="#fff" />
            <Text style={styles.alertsButtonText}>{t('report_abuse')}</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacer for Apply Button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Fixed Apply Now Button — job seekers only */}
      {!isCompany && (
      <View style={styles.fixedApplyButtonContainer}>
        {isJobExpired ? (
          <View style={[styles.applyButton, styles.disabledButton]}>
            <MaterialIcons name="schedule" size={20} color="#999" />
            <Text style={[styles.applyButtonText, styles.disabledButtonText]}>{t('job_expired')}</Text>
          </View>
        ) : hasAlreadyApplied ? (
          <View style={[styles.applyButton, styles.appliedButton]}>
            <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
            <Text style={[styles.applyButtonText, styles.appliedButtonText]}>{t('already_applied')}</Text>
          </View>
        ) : !isAuthenticated ? (
          <TouchableOpacity style={styles.applyButton} onPress={() => {
            Alert.alert(t('login_required'), t('sign_in_to_apply_msg'));
          }}>
            <MaterialIcons name="login" size={20} color="white" />
            <Text style={styles.applyButtonText}>{t('sign_in_to_apply')}</Text>
          </TouchableOpacity>
        ) : !isProfileComplete ? (
          <TouchableOpacity style={styles.applyButton} onPress={() => {
            Alert.alert(t('profile_incomplete'), t('complete_profile_msg'));
          }}>
            <MaterialIcons name="person" size={20} color="white" />
            <Text style={styles.applyButtonText}>{t('complete_profile_to_apply')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.applyButton}
            onPress={async () => {
              if (!jobData) {
                onApply?.();
                return;
              }
              if (!onNavigateToApplyJob) {
                onApply?.();
                return;
              }
              try {
                const res = await packageService.getPackages();
                const jobApplyEnabled = res.success && res.data?.packages_job_apply_enabled === true;
                if (!jobApplyEnabled) {
                  onNavigateToApplyJob(jobSlug, jobData.title, jobData.company_name);
                  return;
                }
                const status = res.data?.my_status;
                const hasPackage = !!(status?.current_job_package_id);
                const expiresAt = status?.job_package_expires_at;
                const notExpired = expiresAt ? new Date(expiresAt) > new Date() : false;
                if (hasPackage && notExpired) {
                  onNavigateToApplyJob(jobSlug, jobData.title, jobData.company_name);
                  return;
                }
                Alert.alert(
                  t('buy_package_to_apply_title'),
                  t('buy_package_to_apply_message'),
                  [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('view_packages'), onPress: () => onNavigateToPackages?.() },
                  ]
                );
              } catch {
                onNavigateToApplyJob(jobSlug, jobData.title, jobData.company_name);
              }
            }}
          >
            <Text style={styles.applyButtonText}>{t('apply_now')}</Text>
            <MaterialIcons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>
      )}

      {/* Bottom: company uses same bar as dashboard; seekers use job-seeker tabs */}
      {isCompany && onCompanyNavPress ? (
        <CompanyBottomNav
          onTabPress={onCompanyNavPress}
          chatUnreadCount={messageUnreadCount}
        />
      ) : isCompany ? (
        <Navigation
          activeTab={navigationActiveTab}
          userType="company"
          messageUnreadCount={messageUnreadCount}
          onTabPress={(tab) => {
            setNavigationActiveTab(tab);
            if (onCompanyMenuPress) {
              const keyMap: Record<string, string> = {
                dashboard: 'company-dashboard',
                'post-job': 'company-post-job',
                applications: 'company-manage-jobs',
                profile: 'company-edit-account',
              };
              onCompanyMenuPress(keyMap[tab] ?? tab);
            }
          }}
        />
      ) : (
        <Navigation
          activeTab={navigationActiveTab}
          userType="seeker"
          messageUnreadCount={messageUnreadCount}
          onTabPress={(tab) => {
            setNavigationActiveTab(tab);
            switch (tab) {
              case 'home':
                onBack();
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
              case 'messages':
                onNavigateToMessages?.();
                break;
            }
          }}
        />
      )}

      {/* Sidebar: company when logged in as company, else seeker */}
      {isCompany && onCompanyMenuPress && onLogout ? (
        <CompanySidebar
          isVisible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          onMenuItemPress={(key) => {
            setSidebarVisible(false);
            onCompanyMenuPress(key);
          }}
          onLogout={onLogout}
          companyName={companyName}
          companyLogo={companyLogo}
        />
      ) : (
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
              onLogout: onBack
            });

            if (!success) {
              // Navigation failed
            }
          }}
          onLogout={onBack}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  menuButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  jobOverviewCard: {
    backgroundColor: '#2121F3',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  companyLogoSection: {
    alignItems: 'center',
    marginRight: 20,
  },
  companyLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2121F3',
  },
  companyNameText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  jobInfoSection: {
    flex: 1,
    flexDirection: 'column',
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    lineHeight: 26,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 6,
  },
  salaryText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  salaryBold: {
    fontWeight: 'bold',
  },
  postedText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#5E2DFA',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DFDFDF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailsList: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    width: 24,
    marginRight: 12,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
    marginLeft: 8,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    flex: 2,
    textAlign: 'right',
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  benefitsList: {
    gap: 12,
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  benefitText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DFDFDF',
  },
  skillText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  companyCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  companyLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DFDFDF',
  },
  companyLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  companyLocation: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  companyDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  companyDetails: {
    gap: 12,
  },
  companyDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  applyButtonContainer: {
    paddingBottom: 30,
  },
  applyButton: {
    backgroundColor: '#17D27C',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
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
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#17D27C',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  descriptionSection: {
    marginBottom: 20,
  },
  requirementsSection: {
    marginBottom: 20,
  },
  skillsSection: {
    marginBottom: 20,
  },
  companySection: {
    marginBottom: 20,
  },
  companyInfo: {
    flex: 1,
    marginLeft: 15,
  },
  location: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  salary: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  postedDate: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  benefitsSection: {
    marginBottom: 20,
  },
  openingsSection: {
    marginBottom: 20,
  },
  openingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  openingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  viewProfileButton: {
    backgroundColor: '#17D27C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  viewProfileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  bottomSpacer: {
    height: 70, // Increased spacing for Apply button above bottom menu
  },
  fixedApplyButtonContainer: {
    position: 'absolute',
    bottom: 100, // Position above bottom menu (menu height + padding)
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  companyInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
    opacity: 0.7,
  },
  disabledButtonText: {
    color: '#999',
  },
  appliedButton: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  appliedButtonText: {
    color: '#4CAF50',
  },

  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
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
    backgroundColor: '#e01010',
  },
  alertsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  savedButton: {
    backgroundColor: '#4CAF50',
  },
});

export default JobDetail;
