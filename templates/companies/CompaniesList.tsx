import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import Sidebar from '../Sidebar';
import Navigation from '../Navigation';
import { buildApiUrl, buildAssetUrl } from '../../config/api';
import { handleNavigation, NavigationFunctions } from '../../utils/navigationHandler';

interface Company {
  id: number;
  name: string;
  logo: string | null;
  location: string;
  no_of_employees: string;
  established_in: string;
  slug: string;
  is_active: number;
  is_featured: number;
  verified: number;
}

interface CompanyWithJobs extends Company {
  current_jobs: number;
  company_logo: string;
}

interface CompaniesListProps {
  onBack?: () => void;
  messageUnreadCount?: number;
  onNavigateToJobSearch?: (companyId?: number, companyName?: string) => void;
  onNavigateToCompanyDetail?: (companySlug: string) => void;
  // Navigation props for sidebar
  onNavigateToJobDetail?: (jobSlug: string) => void;
  onNavigateToJobAlerts?: () => void;
  onNavigateToMyFollowings?: () => void;
  onNavigateToEditProfile?: () => void;
  onNavigateToBuildResume?: () => void;
  onNavigateToMyApplications?: () => void;
  onNavigateToFavouriteJobs?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToCompanies?: () => void;
  onNavigateToPackages?: () => void;
  onNavigateToPaymentHistory?: () => void;
  onLogout?: () => void;
  userData?: {
    name?: string;
    email?: string;
    profile_image?: string;
    cover_image?: string;
  } | null;
}

// Safe alert function to prevent ReadableNativeMap casting errors
const safeAlert = (title: string, message: any) => {
  const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
  Alert.alert(title, messageStr);
};

const CompaniesList: React.FC<CompaniesListProps> = ({
  onBack,
  messageUnreadCount = 0,
  onNavigateToJobSearch,
  onNavigateToCompanyDetail,
  onNavigateToJobDetail,
  onNavigateToJobAlerts,
  onNavigateToMyFollowings,
  onNavigateToEditProfile,
  onNavigateToBuildResume,
  onNavigateToMyApplications,
  onNavigateToFavouriteJobs,
  onNavigateToProfile,
  onNavigateToMessages,
  onNavigateToCompanies,
  onNavigateToPackages,
  onNavigateToPaymentHistory,
  onLogout,
  userData
}) => {
  const [companies, setCompanies] = useState<CompanyWithJobs[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const fetchCompanies = async (page: number = 1, isRefresh: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(buildApiUrl(`/companies?page=${page}`));
      const data = await response.json();

      if (false) console.log('Companies API Response:', data);

      if (data && data.success) {
        // Handle different possible response structures
        let companiesData = [];
        let companyIdValues = [];
        
        // Check the actual API response structure: data.message.companies.data
        if (data.message && data.message.companies && data.message.companies.data) {
          companiesData = data.message.companies.data;
          companyIdValues = data.message.company_id_values || [];
        } else if (data.data && data.data.companies && data.data.companies.data) {
          companiesData = data.data.companies.data;
          companyIdValues = data.data.company_id_values || [];
        } else if (Array.isArray(data.data)) {
          companiesData = data.data;
        } else if (data.data && data.data.companies && Array.isArray(data.data.companies)) {
          companiesData = data.data.companies;
        }
        
        // Ensure companiesData is an array
        if (!Array.isArray(companiesData)) {
          console.error('Companies data is not an array:', companiesData);
          safeAlert('Error', 'Invalid companies data format');
          return;
        }
        
        // Merge company data with job counts
        const companiesWithJobs = companiesData.map((company: Company) => {
          const companyInfo = companyIdValues.find((info: any) => 
            info && info.slug && company.slug && info.slug.includes(company.slug)
          );
          
          return {
            ...company,
            current_jobs: companyInfo?.current_jobs || 0,
            company_logo: companyInfo?.company_logo || company.logo || '',
          };
        });

        if (isRefresh || page === 1) {
          setCompanies(companiesWithJobs);
        } else {
          setCompanies(prev => [...prev, ...companiesWithJobs]);
        }

        // Check if there are more pages
        let pagination = null;
        if (data.message && data.message.companies && typeof data.message.companies === 'object') {
          pagination = data.message.companies;
        } else if (data.data && data.data.companies && typeof data.data.companies === 'object') {
          pagination = data.data.companies;
        } else if (data.data && data.data.pagination && typeof data.data.pagination === 'object') {
          pagination = data.data.pagination;
        }
        
        if (pagination && typeof pagination === 'object') {
          setHasMorePages(pagination.current_page < pagination.last_page);
          setCurrentPage(page);
        } else {
          // If no pagination info, assume no more pages
          setHasMorePages(false);
          setCurrentPage(page);
        }
      } else {
        safeAlert('Error', data?.message || 'Failed to fetch companies');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      safeAlert('Error', 'Failed to fetch companies. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMorePages(true);
    await fetchCompanies(1, true);
    setRefreshing(false);
  };

  const loadMoreCompanies = () => {
    if (!loadingMore && hasMorePages) {
      fetchCompanies(currentPage + 1, false);
    }
  };

  const handleCompanyPress = (company: CompanyWithJobs) => {
    onNavigateToCompanyDetail?.(company.slug);
  };

  const getCompanyLogo = (company: CompanyWithJobs) => {
    if (company.company_logo) {
      // Convert localhost URLs to production domain
      let logoUrl = company.company_logo;
      if (logoUrl.includes('localhost')) {
        logoUrl = logoUrl.replace('localhost', 'jobsportalapi.com');
      }
      return { uri: logoUrl };
    }
    return require('../../assets/company-placeholder.png');
  };

  const renderCompanyCard = ({ item }: { item: CompanyWithJobs }) => (
    <TouchableOpacity
      style={styles.companyCard}
      onPress={() => handleCompanyPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.companyLogoContainer}>
        {failedImages.has(item.id) ? (
          <View style={styles.companyLogoPlaceholder}>
            <MaterialIcons name="business" size={32} color="#999" />
          </View>
        ) : (
          <Image
            source={getCompanyLogo(item)}
            style={styles.companyLogo}
            onError={() => {
              setFailedImages(prev => new Set(prev).add(item.id));
            }}
            resizeMode="cover"
          />
        )}
      </View>
      
      <Text style={styles.companyName} numberOfLines={2}>
        {item.name}
      </Text>
      
      <Text style={styles.companyLocation} numberOfLines={1}>
        {item.location || 'Location not specified'}
      </Text>
      
     
      
      <View style={styles.jobsContainer}>
        <Text style={styles.jobsText}>
          {item.current_jobs} {item.current_jobs === 1 ? 'Job' : 'Jobs'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#4CAF50" />
        <Text style={styles.loadingFooterText}>Loading more companies...</Text>
      </View>
    );
  };

  useEffect(() => {
    fetchCompanies(1, true);
  }, []);

  if (loading) {
    return (
      <LinearGradient
        colors={['#F5F6FD', '#E4F4EC']}
        style={styles.container}
      >
        <Header 
          title="Companies" 
          onMenuPress={() => setSidebarVisible(true)}
          onBack={onBack}
          showBack={!!onBack}
        />
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading companies...</Text>
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
        title="Companies" 
        onMenuPress={() => setSidebarVisible(true)}
        onBack={onBack}
        showBack={!!onBack}
      />

      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Browse Jobs by Companies</Text>
          <Text style={styles.headerSubtitle}>
            Explore opportunities from top companies
          </Text>
        </View>

        <FlatList
          data={companies}
          renderItem={renderCompanyCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.companiesGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMoreCompanies}
          onEndReachedThreshold={0.1}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />

        {companies.length === 0 && !loading && (
          <View style={styles.noCompaniesContainer}>
            <MaterialIcons name="business" size={64} color="#999" />
            <Text style={styles.noCompaniesText}>
              No companies available at the moment.
            </Text>
          </View>
        )}
      </View>

      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        userType="seeker"
        userData={userData}
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

      <Navigation
        activeTab="companies"
        onTabPress={(tab) => {
          switch (tab) {
            case 'home':
              onNavigateToJobSearch?.();
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Medium',
  },
  headerSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
  },
  companiesGrid: {
    paddingBottom: 100, // Add space for bottom navigation
  },
  row: {
    justifyContent: 'space-between',
  },
  companyCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  companyLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  companyLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  companyLogoPlaceholder: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 22,
    fontFamily: 'Inter-SemiBold',
  },
  companyLocation: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
  },
  companyInfo: {
    width: '100%',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
    fontFamily: 'Inter-Regular',
  },
  jobsContainer: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  jobsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    fontFamily: 'Inter-SemiBold',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingFooterText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  noCompaniesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noCompaniesText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
});

export default CompaniesList;

