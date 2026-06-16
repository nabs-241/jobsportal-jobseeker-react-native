import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../Header';
import Sidebar from '../Sidebar';
import Navigation from '../Navigation';
import LanguageDropdown from '../LanguageDropdown';
import { handleNavigation, NavigationFunctions } from '../../utils/navigationHandler';
import { buildAssetUrl, buildUserImageUrl, buildApiUrl } from '../../config/api';
import dashboardService, { DashboardData as ApiDashboardData, getMatchingJobs } from '../../services/dashboardService';
import {
  userService,
  notificationService,
  jobMatchNotificationService,
  applicationNotificationService,
  companyFollowNotificationService,
  profileCompletionNotificationService,
  resumeUpdateNotificationService,
  jobRecommendationNotificationService,
  securityAlertNotificationService,
  appUpdateNotificationService
} from '../../services';
import packageService, { type FeaturedPackageItem } from '../../services/packageService';
import cvCompletenessService, { CVCompletenessResult } from '../../services/cvCompletenessService';

interface DashboardProps {
  onMenuPress: () => void;
  onNavigateToJobDetail?: (jobSlug: string) => void;
  onNavigateToJobAlerts?: () => void;
  onNavigateToMyFollowings?: () => void;
  onLogout?: () => void;
  // Add new navigation props
  onNavigateToEditProfile?: () => void;
  onNavigateToBuildResume?: () => void;
  onNavigateToMyApplications?: () => void;
  onNavigateToFavouriteJobs?: () => void;
  onNavigateToJobSearch?: (categoryId?: number, categoryName?: string) => void;
  onNavigateToCategories?: () => void;
  onNavigateToCompanies?: () => void;
  onNavigateToCompanyDetail?: (companySlug: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToPackages?: () => void;
  onNavigateToPaymentHistory?: () => void;
  onNavigateToApplyJob?: (jobSlug: string, jobTitle: string, companyName?: string) => void;
  /** Unread message count for Messages tab badge. */
  messageUnreadCount?: number;
}

// Interface for API response data
interface DashboardData {
  user_profile: {
    name: string;
    email: string;
    profile_image?: string;
    cover_image?: string;
    location?: string;
    resume_complete: boolean;
  };
  user_stats: {
    profile_views: number;
    followings: number;
    cv_count: number;
    messages: number;
    applied_jobs_count: number;
    favourite_jobs_count: number;
  };
  matching_jobs: Array<{
    id: number;
    slug: string;
    title: string;
    company_name: string;
    company_logo?: string;
    city: string;
    country: string;
    formatted_salary: string;
    job_type: string;
    formatted_date: string;
    is_expired: boolean;
  }>;
  followings: Array<{
    id: number;
    name: string;
    slug: string;
    logo?: string;
    industry: string;
    location: string;
    open_jobs_count: number;
  }>;
  applied_jobs: Array<{
    id: number;
    title: string;
    slug: string;
    company_name: string;
    city: string;
    applied_date: string;
  }>;
  profile_completion: {
    fields: {
      profile_summary: boolean;
      profile_cvs: boolean;
      profile_experience: boolean;
      profile_education: boolean;
      profile_skills: boolean;
      profile_projects: boolean;
    };
    completed_count: number;
    total_count: number;
    percentage: number;
    is_complete: boolean;
  };
  user_info: {
    id: number;
    name: string;
    email: string;
    phone: string;
    location: string;
    avatar: string;
    cover_image: string;
    image?: string;
    cover_image_filename?: string;
  };
  test_message?: string;
  debug_steps?: string[];
}

/**
 * Check if resume is complete based on all CV sections
 * This matches the web version logic from home.blade.php
 */
const isResumeComplete = (profileCompletion: DashboardData['profile_completion']): boolean => {
  if (!profileCompletion) return false;

  // Check if all required sections are completed
  // Based on web version: projects, CVs, experience, education, skills
  const { fields } = profileCompletion;

  return (
    fields.profile_projects &&
    fields.profile_cvs &&
    fields.profile_experience &&
    fields.profile_education &&
    fields.profile_skills
  );
};

/**
 * Dashboard Component for Job Seekers
 * 
 * This component now includes full navigation functionality:
 * 
 * REQUIRED NAVIGATION PROPS:
 * - onNavigateToEditProfile: Navigate to Edit Profile screen
 * - onNavigateToBuildResume: Navigate to Build Resume screen
 * - onNavigateToMyApplications: Navigate to My Applications screen
 * - onNavigateToFavouriteJobs: Navigate to Favourite Jobs screen
 * - onNavigateToJobAlerts: Navigate to Job Alerts screen
 * - onNavigateToJobSearch: Navigate to Job Search screen
 * - onNavigateToProfile: Navigate to Profile screen
 * 
 * USAGE:
 * <Dashboard
 *   onNavigateToEditProfile={() => navigation.navigate('EditProfile')}
 *   onNavigateToBuildResume={() => navigation.navigate('BuildResume')}
 *   onNavigateToMyApplications={() => navigation.navigate('MyApplications')}
 *   onNavigateToFavouriteJobs={() => navigation.navigate('FavouriteJobs')}
 *   onNavigateToJobAlerts={() => navigation.navigate('JobAlerts')}
 *   onNavigateToJobSearch={() => navigation.navigate('JobSearch')}
 *   onNavigateToProfile={() => navigation.navigate('Profile')}
 *   onLogout={() => handleLogout()}
 * />
 */
import { useTranslation } from 'react-i18next';

const Dashboard: React.FC<DashboardProps> = ({
  onMenuPress,
  onNavigateToJobDetail,
  onNavigateToJobAlerts,
  onNavigateToMyFollowings,
  onLogout,
  onNavigateToEditProfile,
  onNavigateToBuildResume,
  onNavigateToMyApplications,
  onNavigateToFavouriteJobs,
  onNavigateToJobSearch,
  onNavigateToCategories,
  onNavigateToCompanies,
  onNavigateToCompanyDetail,
  onNavigateToProfile,
  onNavigateToMessages,
  onNavigateToPackages,
  onNavigateToPaymentHistory,
  onNavigateToApplyJob,
  messageUnreadCount = 0,
}) => {
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [matchingJobs, setMatchingJobs] = useState<any[]>([]);
  const [jobCategories, setJobCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [isUsingFallbackData, setIsUsingFallbackData] = useState(false);
  const [featuredCompanies, setFeaturedCompanies] = useState<any[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [cvCompleteness, setCvCompleteness] = useState<CVCompletenessResult | null>(null);
  const [featuredPackage, setFeaturedPackage] = useState<FeaturedPackageItem | null>(null);

  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Add this function to parse the JSON location
  const parseLocationFromJson = (locationString: string): string => {

    if (!locationString || typeof locationString !== 'string') {
      return t('location_not_set');
    }

    try {
      // Check if it's a JSON string
      if (locationString.trim().startsWith('{') || locationString.trim().startsWith('[')) {

        // Handle the specific format: multiple JSON objects separated by commas
        // Format: {"city": "Bainbridge Island"}, {"state": "Washington"}, {"country": "USA"}
        if (locationString.includes('}, {')) {
          // Wrap multiple JSON objects in an array
          const wrappedJson = '[' + locationString + ']';
          const locationData = JSON.parse(wrappedJson);

          // Extract city, state, country from the array
          const city = locationData.find((item: any) => item.city)?.city;
          const state = locationData.find((item: any) => item.state)?.state;
          const country = locationData.find((item: any) => item.country)?.country;


          const locationParts = [];
          if (city) locationParts.push(city);
          if (state) locationParts.push(state);
          if (country) locationParts.push(country);

          const result = locationParts.length > 0 ? locationParts.join(', ') : t('location_not_set');
          return result;
        } else {
          // Handle single JSON object or array
          const locationData = JSON.parse(locationString);

          // Handle different JSON structures
          if (Array.isArray(locationData)) {
            // Array format: [{"city": "Bainbridge Island"}, {"state": "Washington"}, {"country": "USA"}]
            const city = locationData.find(item => item.city)?.city;
            const state = locationData.find(item => item.state)?.state;
            const country = locationData.find(item => item.country)?.country;


            const locationParts = [];
            if (city) locationParts.push(city);
            if (state) locationParts.push(state);
            if (country) locationParts.push(country);

            const result = locationParts.length > 0 ? locationParts.join(', ') : t('location_not_set');
            return result;
          } else if (typeof locationData === 'object') {
            // Object format: {"city": "Bainbridge Island", "state": "Washington", "country": "USA"}
            const locationParts = [];
            if (locationData.city) locationParts.push(locationData.city);
            if (locationData.state) locationParts.push(locationData.state);
            if (locationData.country) locationParts.push(locationData.country);

            const result = locationParts.length > 0 ? locationParts.join(', ') : t('location_not_set');
            return result;
          }
        }
      }

      // If it's not JSON, return as is
      return locationString;
    } catch (error) {
      return t('location_not_set');
    }
  };

  // Update your constructLocation function:
  const constructLocation = (userData: any) => {

    if (!userData) {
      return t('location_not_set');
    }

    // Check if location is already a properly formatted string
    if (typeof userData.location === 'string' && userData.location.trim() !== '') {
      const parsed = parseLocationFromJson(userData.location);
      return parsed;
    }

    // Construct from individual fields as fallback

    const locationParts = [];
    if (userData.city) locationParts.push(userData.city);
    if (userData.state) locationParts.push(userData.state);
    if (userData.country) locationParts.push(userData.country);

    const result = locationParts.length > 0 ? locationParts.join(', ') : 'Location not set';
    return result;
  };

  // Handle sidebar navigation
  const handleSidebarNavigation = (action: string) => {
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
      onNavigateToPaymentHistory,
      onNavigateToApplyJob
    };

    const success = handleNavigation({
      action,
      userType: 'seeker',
      navigationFunctions,
      onLogout: onLogout
    });

    if (!success) {
      // Navigation failed
    }
  };

  // Handle tab navigation
  const handleTabNavigation = (tab: string) => {
    setActiveTab(tab);
    // Handle navigation based on tab
    switch (tab) {
      case 'home':
        // Already on dashboard
        break;
      case 'search':
        onNavigateToJobSearch?.();
        break;
      case 'messages':
        onNavigateToMessages?.();
        break;
      case 'companies':
        onNavigateToCompanies?.();
        break;
      case 'applications':
        onNavigateToMyApplications?.();
        break;
      case 'favourites':
        onNavigateToFavouriteJobs?.();
        break;
      case 'profile':
        onNavigateToProfile?.();
        break;
    }
  };

  // Helper function to format applied date
  // Helper function to format applied date
  const formatAppliedDate = (dateString: string | null | undefined): string => {
    if (!dateString) return t('date_not_available');

    try {
      // Handle the format "Jul 01, 2025" that the API returns
      if (typeof dateString === 'string' && dateString.includes(',')) {
        // Parse the format "Jul 01, 2025"
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          // If parsing fails, return the original string
          return dateString;
        }

        // Check if it's today
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();

        if (isToday) {
          return t('today');
        }

        // Check if it's yesterday
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isYesterday) {
          return t('yesterday');
        }

        // For other dates, show relative time or formatted date
        const diffTime = Math.abs(today.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) {
          if (diffDays === 1) return t('day_ago');
          return t('days_ago', { count: diffDays });
        } else {
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
          });
        }
      }

      // Fallback: return the original string if it's not in expected format
      return dateString;
    } catch (error) {
      return dateString || t('date_error');
    }
  };

  // Fetch dashboard data from API
  const fetchMatchingJobs = async () => {
    try {
      const response = await getMatchingJobs();

      if (response.success && response.data) {
        setMatchingJobs(response.data);
      } else {
        setMatchingJobs([]);
      }
    } catch (error) {
      setMatchingJobs([]);
    }
  };

  const fetchJobCategories = async () => {
    try {
      const response = await fetch(buildApiUrl('/jobs/categories'), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setJobCategories(data.data);
      }
    } catch (error) {
      // Error fetching job categories
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await dashboardService.getDashboardData();

      if (response.success && response.data) {




        // Use the updated constructLocation function with JSON parsing
        // (The function is already defined above)


        // Parse location properly
        const parsedLocation = constructLocation(response.data.user_info) || constructLocation(response.data.user_profile) || t('location_not_set');

        // Transform API data to match our interface
        const transformedData: DashboardData = {
          user_profile: {
            name: response.data.user_profile?.name || response.data.user_info?.name || t('user'),
            email: response.data.user_profile?.email || response.data.user_info?.email || '',
            profile_image: response.data.user_profile?.profile_image || (response.data.user_info as any)?.image,
            cover_image: response.data.user_profile?.cover_image || (response.data.user_info as any)?.cover_image_filename,
            location: parsedLocation,
            resume_complete: response.data.profile_completion?.is_complete || false,
          },
          user_stats: response.data.user_stats || {
            profile_views: 0,
            followings: 0,
            cv_count: 0,
            messages: 0,
            applied_jobs_count: 0,
            favourite_jobs_count: 0,
          },
          matching_jobs: response.data.matching_jobs || [],
          followings: response.data.followings || [],
          applied_jobs: response.data.applied_jobs || [],
          profile_completion: response.data.profile_completion || {
            fields: {
              profile_summary: false,
              profile_cvs: false,
              profile_experience: false,
              profile_education: false,
              profile_skills: false,
              profile_projects: false,
            },
            completed_count: 0,
            total_count: 6,
            percentage: 0,
            is_complete: false,
          },
          user_info: {
            id: response.data.user_info?.id || 0,
            name: response.data.user_info?.name || t('user'),
            email: response.data.user_info?.email || '',
            phone: response.data.user_info?.phone || '',
            location: response.data.user_info?.location || '',
            avatar: response.data.user_info?.avatar || '',
            cover_image: response.data.user_info?.cover_image || '',
            image: (response.data.user_info as any)?.image,
            cover_image_filename: (response.data.user_info as any)?.cover_image_filename,
          },
        };




        setDashboardData(transformedData);
        setIsUsingFallbackData(false);

        // Store user data globally for other components
        userService.setUserData(transformedData.user_profile);

        // Check CV completeness
        await checkCVCompleteness();

        // Fetch matching jobs separately
        await fetchMatchingJobs();
      } else {

        // If it's a server error (HTML response), show a more user-friendly message
        if (response.error && response.error.includes('non-JSON response')) {
          // Show fallback data instead of error for server issues
          const fallbackData: DashboardData = {
            user_profile: {
              name: t('user'),
              email: '',
              location: t('location_not_set'),
              resume_complete: false,
            },
            user_stats: {
              profile_views: 0,
              followings: 0,
              cv_count: 0,
              messages: 0,
              applied_jobs_count: 0,
              favourite_jobs_count: 0,
            },
            matching_jobs: [],
            followings: [],
            applied_jobs: [],
            profile_completion: {
              fields: {
                profile_summary: false,
                profile_cvs: false,
                profile_experience: false,
                profile_education: false,
                profile_skills: false,
                profile_projects: false,
              },
              completed_count: 0,
              total_count: 6,
              percentage: 0,
              is_complete: false,
            },
            user_info: {
              id: 0,
              name: t('user'),
              email: '',
              phone: '',
              location: '',
              avatar: '',
              cover_image: '',
            },
          };
          setDashboardData(fallbackData);
          setIsUsingFallbackData(true);
        } else {
          setError(response.error || t('failed_load_dashboard'));
        }
      }
    } catch (err: any) {

      // Handle JSON parse errors specifically
      if (err.message && err.message.includes('JSON')) {
        setError(t('server_invalid_data'));
      } else {
        setError(err.message || t('failed_load_dashboard'));
      }
    } finally {
      setLoading(false);
    }
  };

  const checkCVCompleteness = async () => {
    try {
      const response = await cvCompletenessService.checkCVCompleteness();
      if (response.success && response.data) {
        setCvCompleteness(response.data);
      }
    } catch (error) {
      // If CV completeness check fails, don't show error to user
      // Just leave cvCompleteness as null
    }
  };

  // Function to refresh CV completeness check (can be called from outside)
  const refreshCVCompleteness = () => {
    checkCVCompleteness();
  };



  const fetchFeaturedCompanies = async () => {
    setCompaniesLoading(true);
    try {
      const response = await fetch(buildApiUrl('/companies/featured'), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.data) {
          setFeaturedCompanies(data.data.data);
        }
      }
    } catch (err) {
      // Handle error silently
    } finally {
      setCompaniesLoading(false);
    }
  };

  // Search functionality
  const handleSearch = (text: string) => {
    setSearchQuery(text);

    // Clear any existing timeout since we're not auto-searching anymore
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
  };

  const performSearch = () => {
    if (searchQuery.trim()) {
      // Navigate to job search with the search query
      onNavigateToJobSearch?.();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Cleanup notification services on unmount
  useEffect(() => {
    return () => {
      // Stop all notification monitoring
      jobMatchNotificationService.stopJobMatchMonitoring();
      applicationNotificationService.stopApplicationMonitoring();
      companyFollowNotificationService.stopCompanyJobMonitoring();
      profileCompletionNotificationService.stopProfileCompletionMonitoring();
      resumeUpdateNotificationService.stopResumeUpdateMonitoring();
      jobRecommendationNotificationService.stopJobRecommendationMonitoring();
      securityAlertNotificationService.stopSecurityMonitoring();
      appUpdateNotificationService.stopAppUpdateMonitoring();

      if (false) console.log('🔔 All notification services stopped');
    };
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchJobCategories();
    fetchFeaturedCompanies();

    // Initialize notification services
    initializeNotificationServices();
  }, []);

  useEffect(() => {
    const loadFeaturedPackage = async () => {
      const res = await packageService.getPackages();
      if (res.success && res.data?.featured_package) {
        setFeaturedPackage(res.data.featured_package);
      } else {
        setFeaturedPackage(null);
      }
    };
    loadFeaturedPackage();
  }, []);

  // Initialize notification services
  const initializeNotificationServices = async () => {
    try {
      // Initialize main notification service
      await notificationService.initialize();

      // Start core job-related monitoring
      jobMatchNotificationService.startJobMatchMonitoring();
      applicationNotificationService.startApplicationMonitoring();
      companyFollowNotificationService.startCompanyJobMonitoring();

      // Start profile and resume monitoring
      profileCompletionNotificationService.startProfileCompletionMonitoring();
      resumeUpdateNotificationService.startResumeUpdateMonitoring();

      // Start recommendation and system monitoring
      jobRecommendationNotificationService.startJobRecommendationMonitoring();
      securityAlertNotificationService.startSecurityMonitoring();
      appUpdateNotificationService.startAppUpdateMonitoring();

      if (false) console.log('🔔 All notification services initialized');
    } catch (error) {
      console.error('❌ Error initializing notification services:', error);
    }
  };

  // Refresh CV completeness check when dashboard becomes active
  useEffect(() => {
    // Refresh CV completeness check when component mounts or updates
    checkCVCompleteness();
  }, [dashboardData]); // Refresh when dashboard data changes

  const readinessSections = useMemo(() => {
    const completionFields = dashboardData?.profile_completion?.fields;
    if (!completionFields) return [];

    const hasCareerInfo = Boolean(
      dashboardData?.user_info?.phone &&
      (dashboardData?.user_info?.location || dashboardData?.user_profile?.location) &&
      (dashboardData?.user_info?.name || dashboardData?.user_profile?.name)
    );
    const hasSummary = Boolean(completionFields.profile_summary);
    const hasSummaryFromChecks = cvCompleteness ? !cvCompleteness.missingSections.includes('summary') : false;
    const hasCvs = cvCompleteness ? !cvCompleteness.missingSections.includes('cvs') : Boolean(completionFields.profile_cvs);
    const hasExperience = cvCompleteness ? !cvCompleteness.missingSections.includes('experience') : Boolean(completionFields.profile_experience);
    const hasEducation = cvCompleteness ? !cvCompleteness.missingSections.includes('education') : Boolean(completionFields.profile_education);
    const hasSkills = cvCompleteness ? !cvCompleteness.missingSections.includes('skills') : Boolean(completionFields.profile_skills);
    const hasProjects = cvCompleteness ? !cvCompleteness.missingSections.includes('projects') : Boolean(completionFields.profile_projects);
    const hasLanguages = cvCompleteness ? !cvCompleteness.missingSections.includes('languages') : false;

    return [
      { key: 'career', label: 'Career information', done: hasCareerInfo },
      { key: 'summary', label: 'Summary', done: hasSummary || hasSummaryFromChecks },
      { key: 'cvs', label: 'Resume / CV', done: hasCvs },
      { key: 'experience', label: 'Work history', done: hasExperience },
      { key: 'education', label: 'Education', done: hasEducation },
      { key: 'skills', label: 'Skills', done: hasSkills },
      { key: 'projects', label: 'Projects', done: hasProjects },
      { key: 'languages', label: 'Languages', done: hasLanguages },
    ];
  }, [dashboardData, cvCompleteness]);

  const readinessDoneCount = readinessSections.filter(section => section.done).length;
  const readinessTotalCount = readinessSections.length;
  const buildProfilePercentage = readinessDoneCount * 10; // 8 sections x 10%
  const editProfileDone = Boolean(
    dashboardData?.user_info?.phone &&
    (dashboardData?.user_info?.location || dashboardData?.user_profile?.location) &&
    (dashboardData?.user_info?.name || dashboardData?.user_profile?.name) &&
    dashboardData?.user_profile?.email
  );
  const editProfilePercentage = editProfileDone ? 20 : 0;
  const readinessPercentage = Math.min(100, buildProfilePercentage + editProfilePercentage);
  const readinessMissing = readinessSections.filter(section => !section.done);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title={t('dashboard')}
          subtitle={t('job_search_overview')}
          onMenuPress={onMenuPress}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('loading_dashboard')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header
          title={t('dashboard')}
          subtitle={t('job_search_overview')}
          onMenuPress={onMenuPress}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('something_went_wrong')}</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
            <Text style={styles.retryButtonText}>{t('try_again')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuButton}>
          <MaterialIcons name="menu" size={24} color="#333" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t('dashboard')}</Text>

        <View style={styles.headerRight}>
          <LanguageDropdown />
          <View style={styles.topprofileimage}>
            {(() => {
              const profileImageUrl = dashboardData?.user_profile?.profile_image;
              const finalProfileUrl = profileImageUrl ? buildUserImageUrl(profileImageUrl) : null;
              return profileImageUrl ? (
                <Image
                  source={{ uri: finalProfileUrl! }}
                  style={styles.profilethumb}
                  resizeMode="cover"
                  onError={() => { }}
                  onLoad={() => { }}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <MaterialIcons name="person" size={40} color="#6B7280" />
                </View>
              );
            })()}
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={async () => {
              await fetchDashboardData();
              const res = await packageService.getPackages();
              if (res.success && res.data?.featured_package) setFeaturedPackage(res.data.featured_package);
              else setFeaturedPackage(null);
            }}
            colors={['#17D27C']}
            tintColor="#17D27C"
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('enter_skill_or_job_title')}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearSearch}
              >
                <MaterialIcons name="clear" size={20} color="#666" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.searchButton}
              onPress={performSearch}
            >
              <MaterialIcons name="search" size={24} color="#17D27C" />
            </TouchableOpacity>
          </View>
        </View>

        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.coverImageContainer}>
            {(() => {
              const coverImageUrl = dashboardData?.user_profile?.cover_image;
              const finalCoverUrl = coverImageUrl ? buildUserImageUrl(coverImageUrl) : null;


              return coverImageUrl ? (
                <Image
                  source={{ uri: finalCoverUrl! }}
                  style={styles.coverImage}
                  resizeMode="cover"
                  onError={() => { }}
                  onLoad={() => { }}
                />
              ) : (
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.coverImage}
                />
              );
            })()}
            <View style={styles.profileImageContainer}>
              {(() => {
                const profileImageUrl = dashboardData?.user_profile?.profile_image;
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
                    <MaterialIcons name="person" size={40} color="#6B7280" />
                  </View>
                );
              })()}
            </View>
            <TouchableOpacity style={styles.editButton} onPress={onNavigateToEditProfile}>
              <MaterialIcons name="edit" size={16} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.userName}>
              {t('hello')} {dashboardData?.user_profile?.name || t('user')}
            </Text>
            <Text style={styles.userLocation}>
              {dashboardData?.user_profile?.location || t('location_not_set')}
            </Text>
          </View>
        </View>

        {/* Fallback Data Notification */}
        {isUsingFallbackData && (
          <View style={[styles.alertBanner, styles.fallbackBanner]}>
            <MaterialIcons name="info" size={20} color="#3B82F6" />
            <Text style={[styles.alertText, styles.fallbackText]}>
              {t('offline_data_message')}
            </Text>
          </View>
        )}

        {/* Profile Readiness */}
        {readinessTotalCount > 0 && (
          <View style={styles.readinessCard}>
            <View style={styles.readinessHeader}>
              <View>
                <Text style={styles.readinessTitle}>Improve your profile</Text>
                <Text style={styles.readinessSubtitle}>
                  Build Profile: {readinessDoneCount}/{readinessTotalCount} complete ({buildProfilePercentage}%)
                </Text>
                <Text style={styles.readinessSubtitle}>
                  Edit Profile: {editProfileDone ? 'Complete' : 'Incomplete'} ({editProfilePercentage}%)
                </Text>
              </View>
              <Text style={styles.readinessPercent}>{readinessPercentage}%</Text>
            </View>

            <View style={styles.readinessProgressTrack}>
              <View
                style={[
                  styles.readinessProgressFill,
                  readinessPercentage === 100 ? styles.readinessProgressFillSuccess : styles.readinessProgressFillWarn,
                  { width: `${readinessPercentage}%` },
                ]}
              />
            </View>

            {readinessMissing.length > 0 ? (
              <View style={styles.readinessMissingWrap}>
                {readinessMissing.map(section => (
                  <View key={section.key} style={styles.readinessChip}>
                    <MaterialIcons name="error-outline" size={14} color="#B45309" />
                    <Text style={styles.readinessChipText}>{section.label}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.readinessDoneText}>{t('done')}! Your profile is complete.</Text>
            )}

            {readinessMissing.length > 0 && (
              <TouchableOpacity style={styles.readinessActionBtn} onPress={() => onNavigateToBuildResume?.()}>
                <Text style={styles.readinessActionText}>Update on Build Resume</Text>
              </TouchableOpacity>
            )}
          </View>
        )}


        {/* User Stats Section */}
        {dashboardData?.user_stats && (
          <View style={styles.statsSection}>
            <View style={styles.statsGrid}>
              <View style={styles.statCardOuter}>
                <LinearGradient
                  colors={['#5B8DEF', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statCardGradient}
                >
                  <View style={styles.statCardRow}>
                    <View style={styles.statCardTextCol}>
                      <Text style={styles.statLabelOnGradient} numberOfLines={2}>
                        {t('profile_views')}
                      </Text>
                      <Text style={styles.statNumberOnGradient}>
                        {dashboardData.user_stats.profile_views || 0}
                      </Text>
                    </View>
                    <MaterialIcons name="visibility" size={28} color="rgba(255,255,255,0.95)" />
                  </View>
                </LinearGradient>
              </View>
              <View style={styles.statCardOuter}>
                <LinearGradient
                  colors={['#F59E0B', '#EA580C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statCardGradient}
                >
                  <View style={styles.statCardRow}>
                    <View style={styles.statCardTextCol}>
                      <Text style={styles.statLabelOnGradient} numberOfLines={2}>
                        {t('followings')}
                      </Text>
                      <Text style={styles.statNumberOnGradient}>
                        {dashboardData.user_stats.followings || 0}
                      </Text>
                    </View>
                    <MaterialIcons name="person-add" size={28} color="rgba(255,255,255,0.95)" />
                  </View>
                </LinearGradient>
              </View>
              <View style={styles.statCardOuter}>
                <LinearGradient
                  colors={['#34D399', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statCardGradient}
                >
                  <View style={styles.statCardRow}>
                    <View style={styles.statCardTextCol}>
                      <Text style={styles.statLabelOnGradient} numberOfLines={2}>
                        {t('my_cv')}
                      </Text>
                      <Text style={styles.statNumberOnGradient}>
                        {dashboardData.user_stats.cv_count || 0}
                      </Text>
                    </View>
                    <MaterialIcons name="description" size={28} color="rgba(255,255,255,0.95)" />
                  </View>
                </LinearGradient>
              </View>
              <View style={styles.statCardOuter}>
                <LinearGradient
                  colors={['#64748B', '#1E293B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statCardGradient}
                >
                  <View style={styles.statCardRow}>
                    <View style={styles.statCardTextCol}>
                      <Text style={styles.statLabelOnGradient} numberOfLines={2}>
                        {t('messages')}
                      </Text>
                      <Text style={styles.statNumberOnGradient}>
                        {dashboardData.user_stats.messages || 0}
                      </Text>
                    </View>
                    <MaterialIcons name="mail" size={28} color="rgba(255,255,255,0.95)" />
                  </View>
                </LinearGradient>
              </View>
            </View>
          </View>
        )}

        {/* Featured Profile Package Widget */}
        {featuredPackage && featuredPackage.is_purchased && featuredPackage.expires_at ? (
          <TouchableOpacity
            style={styles.featuredWidgetActive}
            onPress={onNavigateToPackages}
            activeOpacity={0.9}
          >
            <View style={styles.featuredWidgetActiveInner}>
              <MaterialIcons name="star" size={36} color="#689F38" />
              <View style={styles.featuredWidgetActiveTextWrap}>
                <Text style={styles.featuredWidgetActiveTitle}>{t('featured_package_active_message')}</Text>
                {(() => {
                  const endDate = new Date(featuredPackage.expires_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                  const days = featuredPackage.package_num_days || 0;
                  let startDate = '';
                  if (days > 0) {
                    const d = new Date(featuredPackage.expires_at);
                    d.setDate(d.getDate() - days);
                    startDate = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                  }
                  return (
                    <Text style={styles.featuredWidgetActiveDates}>
                      {startDate ? `${startDate} – ${endDate}` : endDate}
                    </Text>
                  );
                })()}
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#64748B" />
            </View>
          </TouchableOpacity>
        ) : featuredPackage && !featuredPackage.is_purchased ? (
          <TouchableOpacity
            style={styles.featuredWidgetPromo}
            onPress={onNavigateToPackages}
            activeOpacity={0.9}
          >
            <View style={styles.featuredWidgetPromoHeader}>
              <MaterialIcons name="bolt" size={22} color="#fff" />
              <Text style={styles.featuredWidgetPromoTitle}>{t('featured_profile')}</Text>
            </View>
            <View style={styles.featuredWidgetPromoPriceRow}>
              <Text style={styles.featuredWidgetPromoPrice}>
                {featuredPackage.currency === 'EUR' ? '€' : featuredPackage.currency === 'USD' ? '$' : featuredPackage.currency}
                {featuredPackage.package_price}
              </Text>
              <Text style={styles.featuredWidgetPromoFor}>{t('for')} {featuredPackage.package_num_days} {t('days')}</Text>
            </View>
            <View style={styles.featuredWidgetPromoButton}>
              <Text style={styles.featuredWidgetPromoButtonText}>{t('view_details')}</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Recommended Jobs Section */}

        <View style={styles.jobsSection}>
          <Text style={styles.sectionTitle}>{t('recommended_jobs')}</Text>

          {matchingJobs && Array.isArray(matchingJobs) && matchingJobs.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.jobsScrollContainer}
              style={styles.jobsScrollView}
            >
              {matchingJobs.map((job, index) => (
                <TouchableOpacity
                  key={job.id || index}
                  style={styles.jobCard}
                  onPress={() => onNavigateToJobDetail?.(job.slug)}
                >
                  <View style={styles.jobCardHeader}>
                    <View style={styles.jobTypeContainer}>
                      <MaterialIcons name="work" size={16} color="#10B981" />
                      <Text style={styles.jobType}>{job.job_type || 'Full Time/Permanent'}</Text>
                    </View>
                  </View>

                  <Text style={styles.jobTitle} numberOfLines={2}>
                    {job.title || t('job_title_fallback')}
                  </Text>

                  <Text style={styles.jobSalary}>
                    {t('salary')}: {job.formatted_salary || t('not_specified')}
                  </Text>

                  <View style={styles.jobLocation}>
                    <MaterialIcons name="location-on" size={16} color="#6B7280" />
                    <Text style={styles.locationText}>
                      {job.formatted_location || job.city || job.country || t('remote')}
                    </Text>
                  </View>

                  <View style={styles.jobCardFooter}>
                    <Text style={styles.jobDate}>
                      {job.formatted_date || t('recent')}
                    </Text>
                    <Text style={styles.jobCompany}>
                      {job.company_name || t('company_name_fallback')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noJobsContainer}>
              <MaterialIcons name="work-off" size={48} color="#9CA3AF" />
              <Text style={styles.noJobsTitle}>{t('no_matching_jobs')}</Text>
              <Text style={styles.noJobsSubtitle}>
                {t('complete_profile_recommendations')}
              </Text>
              <TouchableOpacity
                style={styles.completeProfileButton}
                onPress={() => onNavigateToEditProfile?.()}
              >
                <Text style={styles.completeProfileButtonText}>{t('complete_profile')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions Section */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>{t('quick_actions')}</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.quickActionPurple]}
              onPress={() => onNavigateToJobSearch?.()}
            >
              <MaterialIcons name="search" size={24} color="#fff" />
              <Text style={styles.quickActionText}>{t('search_jobs')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.quickActionGreen]}
              onPress={() => onNavigateToBuildResume?.()}
            >
              <MaterialIcons name="description" size={24} color="#fff" />
              <Text style={styles.quickActionText}>{t('update_resume')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.quickActionGray]}
              onPress={() => onNavigateToJobAlerts?.()}
            >
              <MaterialIcons name="notifications" size={24} color="#fff" />
              <Text style={styles.quickActionText}>{t('job_alerts')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Jobs By Categories Section */}
        {jobCategories && jobCategories.length > 0 && (
          <View style={styles.categoriesSection}>
            <View style={styles.categoriesHeader}>
              <Text style={styles.sectionTitle}>{t('jobs_by_categories')}</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => onNavigateToCategories?.()}
              >
                <Text style={styles.viewAllText}>{t('view_all')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.categoriesGrid}>
              {jobCategories.slice(0, 6).map((category, index) => (
                <TouchableOpacity
                  key={category.functional_area_id || index}
                  style={styles.categoryCard}
                  onPress={() => onNavigateToJobSearch?.(category.functional_area_id, category.functional_area)}
                >
                  <View style={styles.categoryIconContainer}>
                    {category.logo ? (
                      <Image
                        source={{ uri: buildAssetUrl(`/uploads/functional_area/${category.logo}`) }}
                        style={styles.categoryIcon}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.categoryIconPlaceholder}>
                        <MaterialIcons name="work" size={24} color="#999" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.categoryName} numberOfLines={2}>
                    {category.functional_area}
                  </Text>
                  <View style={styles.categoryJobCount}>
                    <MaterialIcons name="work" size={12} color="#007AFF" />
                    <Text style={styles.categoryJobCountText}>
                      ({category.jobs_count}) {t('jobs')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Featured Companies Section */}
        <View style={styles.companiesSection}>
          <View style={styles.companiesHeader}>
            <Text style={styles.sectionTitle}>{t('featured_companies')}</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => onNavigateToCompanies?.()}
            >
              <Text style={styles.viewAllText}>{t('view_all')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>
            {t('explore_opportunities')}
          </Text>

          {companiesLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t('loading_companies')}</Text>
            </View>
          ) : featuredCompanies.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.companiesScrollView}
              contentContainerStyle={styles.companiesScrollContent}
            >
              {featuredCompanies.map((company, index) => {
                return (
                  <TouchableOpacity
                    key={company.id || index}
                    style={styles.featuredCompanyCard}
                    onPress={() => onNavigateToCompanyDetail?.(company.slug)}
                  >
                    <View style={styles.featuredCompanyLogoContainer}>
                      {company.logo && !failedImages.has(company.id) ? (
                        <Image
                          source={{
                            uri: company.logo.replace('/storage/company_logos/', '/company_logos/'),
                            cache: 'force-cache'
                          }}
                          style={styles.featuredCompanyLogo}
                          resizeMode="cover"
                          onError={(error) => {
                            setFailedImages(prev => new Set(prev).add(company.id));
                          }}
                          onLoad={() => {
                          }}
                        />
                      ) : (
                        <View style={styles.featuredCompanyLogoPlaceholder}>
                          <MaterialIcons name="business" size={24} color="#6B7280" />
                        </View>
                      )}
                    </View>

                    <View style={styles.featuredCompanyInfo}>
                      <Text style={styles.featuredCompanyName} numberOfLines={2}>
                        {company.name || t('company_name_fallback')}
                      </Text>
                      {company.industry && (
                        <Text style={styles.featuredCompanyIndustry} numberOfLines={1}>
                          {company.industry}
                        </Text>
                      )}
                      <View style={styles.featuredCompanyStats}>
                        <MaterialIcons name="work" size={14} color="#4CAF50" />
                        <Text style={styles.featuredCompanyJobsCount}>
                          {company.active_jobs_count || 0} {t('jobs')}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.noCompaniesContainer}>
              <MaterialIcons name="business" size={48} color="#9CA3AF" />
              <Text style={styles.noCompaniesText}>{t('no_featured_companies')}</Text>
            </View>
          )}
        </View>

        {/* Following Companies Section */}
        {dashboardData?.followings && Array.isArray(dashboardData.followings) && dashboardData.followings.length > 0 && (
          <View style={styles.companiesSection}>
            <Text style={styles.sectionTitle}>{t('my_following_companies')}</Text>
            <View style={styles.companiesContainer}>
              {dashboardData.followings.slice(0, 2).map((company, index) => (
                <TouchableOpacity
                  key={company.id || index}
                  style={styles.companyCard}
                  onPress={() => onNavigateToMyFollowings?.()}
                >
                  <View style={styles.companyLogoContainer}>
                    {company.logo ? (
                      <Image
                        source={{ uri: buildAssetUrl(company.logo) }}
                        style={styles.companyLogo}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.companyLogoPlaceholder}>
                        <MaterialIcons name="business" size={20} color="#6B7280" />
                      </View>
                    )}
                  </View>

                  <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>
                      {company.name || t('company_name_fallback')}
                    </Text>
                    <Text style={styles.companyIndustry}>
                      {company.industry || t('industry_not_specified')}
                    </Text>

                    <View style={styles.companyLocation}>
                      <MaterialIcons name="location-on" size={14} color="#6B7280" />
                      <Text style={styles.companyLocationText}>
                        {company.location || t('location_not_set')}
                      </Text>
                    </View>

                    <View style={styles.companyJobs}>
                      <MaterialIcons name="work" size={14} color="#10B981" />
                      <Text style={styles.companyJobsText}>
                        {company.open_jobs_count || 0} {t('open_jobs')}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Sidebar */}
      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        userType="seeker"
        userData={dashboardData?.user_profile}
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
            onNavigateToPaymentHistory,
            onNavigateToApplyJob
          };

          const success = handleNavigation({
            action,
            userType: 'seeker',
            navigationFunctions,
            onLogout: onLogout
          });

          if (!success) {
            // Navigation failed
          }
        }}
        onLogout={onLogout || (() => { })}
      />

      {/* Bottom Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabPress={handleTabNavigation}
        userType="seeker"
        messageUnreadCount={messageUnreadCount}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 'auto'
  },
  menuButton: {
    marginRight: 15,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topprofileimage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginLeft: 15,
  },
  profilethumb: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  // Search Section
  searchSection: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 40,
    paddingHorizontal: 16,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  clearButton: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  searchButton: {
    color: '#333',
    marginLeft: 12,
  },

  // Profile Section
  profileSection: {
    marginBottom: 20,
  },
  coverImageContainer: {
    position: 'relative',
    height: 150,
    borderRadius: 16,
    marginBottom: 20,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  profileImageContainer: {
    position: 'absolute',
    bottom: -50,
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    position: 'absolute',
    bottom: -45,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileInfo: {
    marginTop: 40,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 16,
    color: '#6B7280',
  },

  // Alert Banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    marginLeft: 12,
    fontWeight: '500',
  },
  fallbackBanner: {
    backgroundColor: '#EFF6FF',
    borderLeftColor: '#3B82F6',
  },
  fallbackText: {
    color: '#1E40AF',
  },
  readinessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  readinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  readinessTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  readinessSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 3,
  },
  readinessPercent: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  readinessProgressTrack: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 12,
  },
  readinessProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  readinessProgressFillWarn: {
    backgroundColor: '#F59E0B',
  },
  readinessProgressFillSuccess: {
    backgroundColor: '#22C55E',
  },
  readinessMissingWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  readinessChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  readinessChipText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  readinessDoneText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
    marginBottom: 10,
  },
  readinessActionBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#1D4ED8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  readinessActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Stats Section
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCardOuter: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statCardGradient: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    minHeight: 108,
    justifyContent: 'center',
  },
  statCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCardTextCol: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  statLabelOnGradient: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  statNumberOnGradient: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },

  // Featured Package Widget - active state
  featuredWidgetActive: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  featuredWidgetActiveInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredWidgetActiveTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  featuredWidgetActiveTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 2,
  },
  featuredWidgetActiveDates: {
    fontSize: 13,
    color: '#047857',
  },

  // Featured Package Widget - promo (no active package)
  featuredWidgetPromo: {
    backgroundColor: '#1E3A5F',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    overflow: 'hidden',
  },
  featuredWidgetPromoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  featuredWidgetPromoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  featuredWidgetPromoPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
    gap: 6,
  },
  featuredWidgetPromoPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FCD34D',
  },
  featuredWidgetPromoFor: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.95,
  },
  featuredWidgetPromoButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  featuredWidgetPromoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E3A5F',
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: 40,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#17D27C',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionPurple: {
    backgroundColor: '#8B5CF6',
  },
  quickActionGreen: {
    backgroundColor: '#10B981',
  },
  quickActionGray: {
    backgroundColor: '#6B7280',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },

  // Jobs Section
  jobsSection: {
    marginBottom: 24,
  },
  jobsScrollView: {
    paddingBottom: 10,
    paddingLeft: 5,
  },
  jobsScrollContainer: {
    paddingHorizontal: 0,
  },
  jobsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  jobCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobCardHeader: {
    marginBottom: 12,
  },
  jobTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobType: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 20,
  },
  jobSalary: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  jobLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  jobCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  jobDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  jobCompany: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 'auto',
  },
  companyLogoContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  companyLogo: {
    width: '100%',
    height: '100%',
  },
  companyLogoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Companies Section
  companiesSection: {
    marginBottom: 35,
  },
  companiesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  companyCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  companyInfo: {
    marginTop: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  companyIndustry: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  companyLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  companyLocationText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  companyJobs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyJobsText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
  },

  // Common Styles
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },

  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },

  // No Jobs State
  noJobsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginTop: 12,
  },
  noJobsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noJobsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  completeProfileButton: {
    backgroundColor: '#17D27C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completeProfileButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#17D27C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Jobs By Categories Section
  categoriesSection: {
    marginBottom: 50,
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
  },
  categoryIconPlaceholder: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 16,
  },
  categoryJobCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryJobCountText: {
    fontSize: 11,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  companiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },

  // Featured Companies Section
  companiesScrollView: {
    marginTop: 16,
    paddingBottom: 10,
  },
  companiesScrollContent: {
    paddingRight: 20,
  },
  featuredCompanyCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredCompanyLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  featuredCompanyLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  featuredCompanyLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredCompanyInfo: {
    flex: 1,
  },
  featuredCompanyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  featuredCompanyIndustry: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  featuredCompanyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredCompanyJobsCount: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  noCompaniesContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noCompaniesText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default Dashboard;