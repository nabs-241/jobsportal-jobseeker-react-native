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
  Linking,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import Sidebar from '../Sidebar';
import CompanySidebar from '../company/CompanySidebar';
import Navigation from '../Navigation';
import { buildApiUrl, buildCompanyLogoUrl } from '../../config/api';
import { handleNavigation, NavigationFunctions } from '../../utils/navigationHandler';

const { width } = Dimensions.get('window');

interface CompanyDetailProps {
  onBack?: () => void;
  companySlug: string;
  messageUnreadCount?: number;
  // Navigation props for sidebar
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
  onLogout?: () => void;
  /** When logged in as company, show company sidebar/nav */
  loggedInUserType?: 'seeker' | 'company';
  onCompanyMenuPress?: (key: string) => void;
  companyName?: string;
  companyLogo?: string;
}

interface CompanyDetailData {
  id: number;
  name: string;
  email: string;
  ceo: string;
  industry_id: number;
  ownership_type_id: number;
  description: string;
  location: string;
  no_of_offices: number;
  website: string;
  no_of_employees: string;
  established_in: string;
  fax: string;
  phone: string;
  logo: string;
  country_id: number;
  state_id: number;
  city_id: number;
  slug: string;
  is_active: number;
  is_featured: number;
  verified: number;
  facebook: string;
  twitter: string;
  linkedin: string;
  google_plus: string;
  pinterest: string;
  map: string;
}

interface CompanyDetailResponse {
  success: boolean;
  data: {
    token: string;
  };
  message: {
    id_values: {
      industry_id: string;
      ownership_type_id: string;
      country_id: string;
      state_id: string;
      city_id: string;
    };
    company: CompanyDetailData;
    seo: {
      seo_title: string;
      seo_description: string;
      seo_keywords: string;
      seo_other: string;
    };
  };
}

interface CompanyJob {
  id: number;
  title: string;
  slug: string;
  company_id: number;
  company_name: string;
  company_logo?: string;
  location: string;
  city_name: string;
  state_name: string;
  country_name: string;
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
  requirements: string;
  benefits: string;
  functional_area: string;
  num_of_positions: string;
  gender: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
  is_active: number;
  hide_salary: number;
  job_skills: Array<{
    id: number;
    job_id: number;
    job_skill_id: number;
    job_skill: {
      id: number;
      job_skill: string;
    };
  }>;
}

interface CompanyJobsResponse {
  success: boolean;
  data: {
    success: boolean;
  };
  message: {
    jobs: CompanyJob[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
}

// Safe alert function to prevent ReadableNativeMap casting errors
const safeAlert = (title: string, message: any) => {
  const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
  Alert.alert(title, messageStr);
};

const CompanyDetail: React.FC<CompanyDetailProps> = ({
  onBack,
  companySlug,
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
  onLogout,
  loggedInUserType = 'seeker',
  onCompanyMenuPress,
  companyName,
  companyLogo,
}) => {
  const [companyData, setCompanyData] = useState<CompanyDetailData | null>(null);
  const [idValues, setIdValues] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs'>('overview');
  const isCompany = loggedInUserType === 'company';
  
  // Jobs state
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsPage, setJobsPage] = useState(1);
  const [hasMoreJobs, setHasMoreJobs] = useState(true);

  const fetchCompanyDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(buildApiUrl(`/company/${companySlug}`));
      const data: CompanyDetailResponse = await response.json();

      console.log('Company Detail API Response:', data);

      if (data && data.success && data.message && data.message.company) {
        setCompanyData(data.message.company);
        setIdValues(data.message.id_values);
      } else {
        safeAlert('Error', data?.message || 'Failed to fetch company details');
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
      safeAlert('Error', 'Failed to fetch company details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyJobs = async (page: number = 1, append: boolean = false) => {
    try {
      setJobsLoading(true);
      setJobsError(null);

      const response = await fetch(buildApiUrl(`/company-jobs?company_slug=${companySlug}&page=${page}`));
      const data: CompanyJobsResponse = await response.json();

      console.log('Company Jobs API Response:', data);

      if (data && data.success && data.message && data.message.jobs) {
        if (append) {
          setJobs(prevJobs => [...prevJobs, ...data.message.jobs]);
        } else {
          setJobs(data.message.jobs);
        }
        
        setJobsPage(data.message.pagination.current_page);
        setHasMoreJobs(data.message.pagination.current_page < data.message.pagination.last_page);
      } else {
        setJobsError('No jobs found for this company');
      }
    } catch (error) {
      console.error('Error fetching company jobs:', error);
      setJobsError('Failed to fetch company jobs. Please try again.');
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    if (companySlug) {
      fetchCompanyDetail();
    }
  }, [companySlug]);

  useEffect(() => {
    if (activeTab === 'jobs' && companyData && jobs.length === 0) {
      fetchCompanyJobs(1, false);
    }
  }, [activeTab, companyData]);

  const handleWebsitePress = () => {
    if (companyData?.website) {
      Linking.openURL(companyData.website);
    }
  };


  const renderOverview = () => {
    if (!companyData) return null;

    return (
      <View style={styles.overviewContainer}>
        {/* Company Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Company</Text>
          <Text style={styles.description}>
            {companyData.description}
          </Text>
        </View>

        {/* Company Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="business" size={20} color="#17D27C" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Industry</Text>
              <Text style={styles.infoValue}>{idValues?.industry_id || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="account-balance" size={20} color="#17D27C" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Ownership Type</Text>
              <Text style={styles.infoValue}>{idValues?.ownership_type_id || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="people" size={20} color="#17D27C" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Company Size</Text>
              <Text style={styles.infoValue}>{companyData.no_of_employees || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={20} color="#17D27C" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>
                {companyData.location}, {idValues?.state_id}, {idValues?.country_id}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="calendar-today" size={20} color="#17D27C" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Established</Text>
              <Text style={styles.infoValue}>{companyData.established_in || 'Not specified'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="business" size={20} color="#17D27C" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Number of Offices</Text>
              <Text style={styles.infoValue}>{companyData.no_of_offices || 'Not specified'}</Text>
            </View>
          </View>
        </View>

         {/* Contact Information */}
         <View style={styles.section}>
           <Text style={styles.sectionTitle}>Contact Information</Text>
           
           {companyData.phone && (
             <View style={styles.infoRow}>
               <MaterialIcons name="phone" size={20} color="#17D27C" />
               <View style={styles.infoContent}>
                 <Text style={styles.infoLabel}>Phone</Text>
                 <Text style={styles.infoValue}>{companyData.phone}</Text>
               </View>
             </View>
           )}

           {companyData.email && (
             <View style={styles.infoRow}>
               <MaterialIcons name="email" size={20} color="#17D27C" />
               <View style={styles.infoContent}>
                 <Text style={styles.infoLabel}>Email</Text>
                 <Text style={styles.infoValue}>{companyData.email}</Text>
               </View>
             </View>
           )}

           {companyData.website && (
             <TouchableOpacity style={styles.infoRow} onPress={handleWebsitePress}>
               <MaterialIcons name="language" size={20} color="#17D27C" />
               <View style={styles.infoContent}>
                 <Text style={styles.infoLabel}>Website</Text>
                 <Text style={[styles.infoValue, styles.linkText]}>{companyData.website}</Text>
               </View>
             </TouchableOpacity>
           )}
         </View>

      </View>
    );
  };

  const renderJobCard = (job: CompanyJob) => (
    <TouchableOpacity 
      key={job.id} 
      style={styles.jobCard}
      onPress={() => onNavigateToJobDetail?.(job.slug)}
    >
      <View style={styles.jobHeader}>
        <View style={styles.jobTypeContainer}>
          <MaterialIcons name="work" size={16} color="#17D27C" />
          <Text style={styles.jobType}>{job.job_type}</Text>
        </View>
      </View>
      
      <Text style={styles.jobTitle} numberOfLines={2}>
        {job.title}
      </Text>
      
      {!job.hide_salary && job.salary_from && job.salary_to && (
        <View style={styles.salaryContainer}>
          <Text style={styles.salaryText}>
            {job.salary_currency}{job.salary_from} - {job.salary_currency}{job.salary_to}/{job.salary_period}
          </Text>
        </View>
      )}
      
      <View style={styles.jobLocation}>
        <MaterialIcons name="location-on" size={16} color="#666" />
        <Text style={styles.locationText}>
          {job.city_name}, {job.state_name}
        </Text>
      </View>
      
      <View style={styles.jobFooter}>
        <Text style={styles.jobDate}>
          {new Date(job.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </Text>
        <View style={styles.jobCompanyInfo}>
          <Text style={styles.jobCompanyName}>{job.company_name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderJobs = () => {
    if (jobsLoading && jobs.length === 0) {
      return (
        <View style={styles.jobsContainer}>
          <Text style={styles.sectionTitle}>Jobs at {companyData?.name}</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#17D27C" />
            <Text style={styles.loadingText}>Loading jobs...</Text>
          </View>
        </View>
      );
    }

    if (jobsError) {
      return (
        <View style={styles.jobsContainer}>
          <Text style={styles.sectionTitle}>Jobs at {companyData?.name}</Text>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error" size={48} color="#999" />
            <Text style={styles.errorText}>{jobsError}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => fetchCompanyJobs(1, false)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (jobs.length === 0) {
      return (
        <View style={styles.jobsContainer}>
          <Text style={styles.sectionTitle}>Jobs at {companyData?.name}</Text>
          <View style={styles.noJobsContainer}>
            <MaterialIcons name="work" size={64} color="#999" />
            <Text style={styles.noJobsText}>No jobs available at the moment</Text>
            <TouchableOpacity 
              style={styles.browseJobsButton}
              onPress={() => onNavigateToJobSearch?.()}
            >
              <Text style={styles.browseJobsButtonText}>Browse All Jobs</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.jobsContainer}>
        <Text style={styles.sectionTitle}>Jobs at {companyData?.name} ({jobs.length})</Text>
        <View style={styles.jobsList}>
          {jobs.map(renderJobCard)}
        </View>
        
        {hasMoreJobs && (
          <TouchableOpacity 
            style={styles.loadMoreButton}
            onPress={() => fetchCompanyJobs(jobsPage + 1, true)}
            disabled={jobsLoading}
          >
            {jobsLoading ? (
              <ActivityIndicator size="small" color="#17D27C" />
            ) : (
              <Text style={styles.loadMoreButtonText}>Load More Jobs</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#F5F6FD', '#E4F4EC']}
        style={styles.container}
      >
        <Header 
          title="Company Details" 
          onMenuPress={() => setSidebarVisible(true)}
          onBack={onBack}
          showBack={!!onBack}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#17D27C" />
          <Text style={styles.loadingText}>Loading company details...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error || !companyData) {
    return (
      <LinearGradient
        colors={['#F5F6FD', '#E4F4EC']}
        style={styles.container}
      >
        <Header 
          title="Company Details" 
          onMenuPress={() => setSidebarVisible(true)}
          onBack={onBack}
          showBack={!!onBack}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={64} color="#999" />
          <Text style={styles.errorText}>Failed to load company details</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCompanyDetail}>
            <Text style={styles.retryButtonText}>Retry</Text>
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
      <Header 
        title="Company Details" 
        onMenuPress={() => setSidebarVisible(true)}
        onBack={onBack}
        showBack={!!onBack}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Company Header */}
        <View style={styles.companyHeader}>
          <View style={styles.companyLogoContainer}>
            <Image
              source={{ uri: buildCompanyLogoUrl(companyData.logo) }}
              style={styles.companyLogo}
              onError={() => {}}
            />
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyData.name}</Text>
            <Text style={styles.companyLocation}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              {companyData.location}
            </Text>
            <View style={styles.companyBadges}>
              {companyData.verified && (
                <View style={styles.badge}>
                  <MaterialIcons name="verified" size={16} color="#17D27C" />
                  <Text style={styles.badgeText}>Verified</Text>
                </View>
              )}
              {companyData.is_featured && (
                <View style={styles.badge}>
                  <MaterialIcons name="star" size={16} color="#FFD700" />
                  <Text style={styles.badgeText}>Featured</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              Overview
            </Text>
          </TouchableOpacity>
           <TouchableOpacity
             style={[styles.tab, activeTab === 'jobs' && styles.activeTab]}
             onPress={() => setActiveTab('jobs')}
           >
             <Text style={[styles.tabText, activeTab === 'jobs' && styles.activeTabText]}>
               Jobs ({jobs.length})
             </Text>
           </TouchableOpacity>
        </View>

         {/* Tab Content */}
         {activeTab === 'overview' ? renderOverview() : renderJobs()}
       </ScrollView>

       {/* Bottom Navigation */}
       <Navigation
         activeTab={isCompany ? 'dashboard' : 'companies'}
         userType={isCompany ? 'company' : 'seeker'}
         messageUnreadCount={messageUnreadCount}
         onTabPress={(tab) => {
           if (isCompany && onCompanyMenuPress) {
             const keyMap: Record<string, string> = {
               dashboard: 'company-dashboard',
               'post-job': 'company-post-job',
               applications: 'company-manage-jobs',
               profile: 'company-edit-account',
             };
             onCompanyMenuPress(keyMap[tab] ?? tab);
             return;
           }
           switch (tab) {
             case 'home':
               onBack?.();
               break;
             case 'search':
               onNavigateToJobSearch?.();
               break;
             case 'companies':
               onNavigateToCompanies?.();
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
              onNavigateToJobSearch: () => onNavigateToJobSearch?.(),
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
              onLogout: onLogout
            });

            if (!success) {
              console.warn(`Navigation failed for action: ${action}`);
            }
          }}
          onLogout={onLogout || (() => {})}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 100, // Add space for bottom navigation
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#17D27C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  companyHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  companyLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
  },
  companyLogo: {
    width: '100%',
    height: '100%',
  },
  companyInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  companyLocation: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#17D27C',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#fff',
  },
  overviewContainer: {
    gap: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  linkText: {
    color: '#17D27C',
    textDecorationLine: 'underline',
  },
  jobsContainer: {
  },
  noJobsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noJobsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 20,
  },
  browseJobsButton: {
    backgroundColor: '#17D27C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseJobsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  jobsList: {
    gap: 12,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  jobType: {
    fontSize: 12,
    color: '#17D27C',
    fontWeight: '600',
    marginLeft: 4,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  salaryContainer: {
    marginBottom: 8,
  },
  salaryText: {
    fontSize: 14,
    color: '#17D27C',
    fontWeight: '600',
  },
  jobLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  jobCompanyInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  jobCompanyName: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadMoreButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  loadMoreButtonText: {
    color: '#17D27C',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CompanyDetail;
