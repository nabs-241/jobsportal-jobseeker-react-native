import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../Header';
import Sidebar from '../Sidebar';
import Navigation from '../Navigation';
import { buildApiUrl, buildAdminAssetUrl, buildAssetUrl } from '../../config/api';
import { handleNavigation, NavigationFunctions } from '../../utils/navigationHandler';
import { useTranslation } from 'react-i18next';

interface Job {
  id: number;
  title: string;
  company_id: number;
  salary_min?: number;
  salary_max?: number;
  created_at: string;
  job_type?: string;
  career_level?: string;
  job_shift?: string;
  degree_level?: string;
  job_experience?: string;
}

interface JobListProps {
  onBack: () => void;
  onMenuPress: () => void;
  onJobPress: (job: Job) => void;
  // Category filtering
  categoryId?: number;
  categoryName?: string;
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
  messageUnreadCount?: number;
}

const JobList: React.FC<JobListProps> = ({
  onBack,
  onMenuPress,
  onJobPress,
  categoryId,
  categoryName,
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
  messageUnreadCount = 0,
}) => {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [featuredJobs, setFeaturedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [jobMappings, setJobMappings] = useState<any>(null);
  const [featuredJobMappings, setFeaturedJobMappings] = useState<any>(null);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('search');

  // Filter states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    jobType: '',
    careerLevel: '',
    jobShift: '',
    degreeLevel: '',
    jobExperience: '',
    industry: '',
    country: '',
    state: '',
    city: '',
    salaryMin: '',
    salaryMax: '',
  });
  const [filterOptions, setFilterOptions] = useState<{
    jobTypes: { id: number; name: string; count: number }[];
    careerLevels: { id: number; name: string; count: number }[];
    jobShifts: { id: number; name: string; count: number }[];
    degreeLevels: { id: number; name: string; count: number }[];
    jobExperiences: { id: number; name: string; count: number }[];
    industries: { id: number; name: string; count: number }[];
    countries: { id: number; name: string; count: number }[];
    states: { id: number; name: string; count: number }[];
    cities: { id: number; name: string; count: number }[];
  }>({
    jobTypes: [],
    careerLevels: [],
    jobShifts: [],
    degreeLevels: [],
    jobExperiences: [],
    industries: [],
    countries: [],
    states: [],
    cities: []
  });

  // Fetch filter options from job statistics API (with job counts)
  const fetchFilterOptions = async () => {
    try {
      // First, we need to fetch the jobs to analyze which filters have jobs
      // This approach gets the actual job data and counts filters from it
      const jobsResponse = await fetch(buildApiUrl('/jobs?limit=1000'));

      if (jobsResponse.ok) {
        const responseText = await jobsResponse.text();
        const jsonStartIndex = responseText.indexOf('{');

        if (jsonStartIndex !== -1) {
          const jsonText = responseText.substring(jsonStartIndex);
          const data = JSON.parse(jsonText);

          if (data.success && data.message) {
            const jobs = data.message.jobs?.data || [];
            const allData = data.message;

            // Count occurrences of each filter in actual jobs
            const filterCounts: any = {
              jobTypes: new Map(),
              careerLevels: new Map(),
              jobShifts: new Map(),
              degreeLevels: new Map(),
              jobExperiences: new Map(),
              industries: new Map(),
              countries: new Map(),
              states: new Map(),
              cities: new Map()
            };

            // Count from actual jobs
            jobs.forEach((job: any, index: number) => {
              const idValues = allData.id_values?.[index] || {};

              // Count job types
              if (job.job_type_id) {
                filterCounts.jobTypes.set(job.job_type_id,
                  (filterCounts.jobTypes.get(job.job_type_id) || 0) + 1);
              }

              // Count career levels
              if (job.career_level_id) {
                filterCounts.careerLevels.set(job.career_level_id,
                  (filterCounts.careerLevels.get(job.career_level_id) || 0) + 1);
              }

              // Count job shifts
              if (job.job_shift_id) {
                filterCounts.jobShifts.set(job.job_shift_id,
                  (filterCounts.jobShifts.get(job.job_shift_id) || 0) + 1);
              }

              // Count degree levels
              if (job.degree_level_id) {
                filterCounts.degreeLevels.set(job.degree_level_id,
                  (filterCounts.degreeLevels.get(job.degree_level_id) || 0) + 1);
              }

              // Count job experiences
              if (job.job_experience_id) {
                filterCounts.jobExperiences.set(job.job_experience_id,
                  (filterCounts.jobExperiences.get(job.job_experience_id) || 0) + 1);
              }

              // Count industries
              if (job.industry_id) {
                filterCounts.industries.set(job.industry_id,
                  (filterCounts.industries.get(job.industry_id) || 0) + 1);
              }

              // Count countries
              if (job.country_id) {
                filterCounts.countries.set(job.country_id,
                  (filterCounts.countries.get(job.country_id) || 0) + 1);
              }
            });

            // Now fetch master data to get names
            const [
              jobTypesResponse,
              careerLevelsResponse,
              jobShiftsResponse,
              degreeLevelsResponse,
              jobExperiencesResponse,
              industriesResponse,
              countriesResponse
            ] = await Promise.all([
              fetch(buildApiUrl('/master-data/job-types')),
              fetch(buildApiUrl('/master-data/career-levels')),
              fetch(buildApiUrl('/master-data/job-shifts')),
              fetch(buildApiUrl('/master-data/degree-levels')),
              fetch(buildApiUrl('/master-data/job-experiences')),
              fetch(buildApiUrl('/master-data/industries')),
              fetch(buildApiUrl('/master-data/countries'))
            ]);

            const jobTypes = jobTypesResponse.ok ? await jobTypesResponse.json() : { data: [] };
            const careerLevels = careerLevelsResponse.ok ? await careerLevelsResponse.json() : { data: [] };
            const jobShifts = jobShiftsResponse.ok ? await jobShiftsResponse.json() : { data: [] };
            const degreeLevels = degreeLevelsResponse.ok ? await degreeLevelsResponse.json() : { data: [] };
            const jobExperiences = jobExperiencesResponse.ok ? await jobExperiencesResponse.json() : { data: [] };
            const industries = industriesResponse.ok ? await industriesResponse.json() : { data: [] };
            const countries = countriesResponse.ok ? await countriesResponse.json() : { data: [] };

            // Build filter options with counts, only including items that have jobs
            const options = {
              jobTypes: (jobTypes.data || [])
                .map((item: any) => ({
                  id: item.job_type_id || item.id,
                  name: item.job_type || item.name,
                  count: filterCounts.jobTypes.get(item.job_type_id || item.id) || 0
                }))
                .filter((item: any) => item.count > 0),

              careerLevels: (careerLevels.data || [])
                .map((item: any) => ({
                  id: item.career_level_id || item.id,
                  name: item.career_level || item.name,
                  count: filterCounts.careerLevels.get(item.career_level_id || item.id) || 0
                }))
                .filter((item: any) => item.count > 0),

              jobShifts: (jobShifts.data || [])
                .map((item: any) => ({
                  id: item.job_shift_id || item.id,
                  name: item.job_shift || item.name,
                  count: filterCounts.jobShifts.get(item.job_shift_id || item.id) || 0
                }))
                .filter((item: any) => item.count > 0),

              degreeLevels: (degreeLevels.data || [])
                .map((item: any) => ({
                  id: item.degree_level_id || item.id,
                  name: item.degree_level || item.name,
                  count: filterCounts.degreeLevels.get(item.degree_level_id || item.id) || 0
                }))
                .filter((item: any) => item.count > 0),

              jobExperiences: (jobExperiences.data || [])
                .map((item: any) => ({
                  id: item.job_experience_id || item.id,
                  name: item.job_experience || item.name,
                  count: filterCounts.jobExperiences.get(item.job_experience_id || item.id) || 0
                }))
                .filter((item: any) => item.count > 0),

              industries: (industries.data || [])
                .map((item: any) => ({
                  id: item.id,
                  name: item.industry || item.name,
                  count: filterCounts.industries.get(item.id) || 0
                }))
                .filter((item: any) => item.count > 0),

              countries: (countries.data || [])
                .map((item: any) => ({
                  id: item.country_id || item.id,
                  name: item.country || item.name,
                  count: filterCounts.countries.get(item.country_id || item.id) || 0
                }))
                .filter((item: any) => item.count > 0),

              states: [],
              cities: []
            };

            setFilterOptions(options);
            return;
          }
        }
      }

      // If we reach here, set empty options
      setFilterOptions({
        jobTypes: [],
        careerLevels: [],
        jobShifts: [],
        degreeLevels: [],
        jobExperiences: [],
        industries: [],
        countries: [],
        states: [],
        cities: []
      });
    } catch (error) {
      console.error('Error fetching filter options:', error);
      setFilterOptions({
        jobTypes: [],
        careerLevels: [],
        jobShifts: [],
        degreeLevels: [],
        jobExperiences: [],
        industries: [],
        countries: [],
        states: [],
        cities: []
      });
    }
  };

  // Fetch states when country is selected (with job counts)
  const fetchStates = async (countryId: number) => {
    try {
      // Fetch jobs for this country (use array notation for Laravel)
      const jobsResponse = await fetch(buildApiUrl(`/jobs?country_id[]=${countryId}&limit=1000`));
      if (jobsResponse.ok) {
        const responseText = await jobsResponse.text();
        const jsonStartIndex = responseText.indexOf('{');

        if (jsonStartIndex !== -1) {
          const jsonText = responseText.substring(jsonStartIndex);
          const data = JSON.parse(jsonText);

          if (data.success && data.message) {
            const jobs = data.message.jobs?.data || [];

            // Count states from actual jobs
            const stateCounts = new Map();
            jobs.forEach((job: any) => {
              if (job.state_id) {
                stateCounts.set(job.state_id, (stateCounts.get(job.state_id) || 0) + 1);
              }
            });

            // Fetch state names
            const statesResponse = await fetch(buildApiUrl(`/master-data/states/${countryId}`));
            if (statesResponse.ok) {
              const statesData = await statesResponse.json();
              const states = (statesData.data || [])
                .map((item: any) => ({
                  id: item.state_id || item.id,
                  name: item.state || item.name,
                  count: stateCounts.get(item.state_id || item.id) || 0
                }))
                .filter((item: any) => item.count > 0);

              setFilterOptions(prev => ({ ...prev, states, cities: [] }));
              setFilters(prev => ({ ...prev, state: '', city: '' }));
              return;
            }
          }
        }
      }

      // If we reach here, set empty states
      setFilterOptions(prev => ({ ...prev, states: [], cities: [] }));
      setFilters(prev => ({ ...prev, state: '', city: '' }));
    } catch (error) {
      console.error('Error fetching states:', error);
      setFilterOptions(prev => ({ ...prev, states: [], cities: [] }));
    }
  };

  // Fetch cities when state is selected (with job counts)
  const fetchCities = async (stateId: number) => {
    try {
      // Fetch jobs for this state (use array notation for Laravel)
      const jobsResponse = await fetch(buildApiUrl(`/jobs?state_id[]=${stateId}&limit=1000`));
      if (jobsResponse.ok) {
        const responseText = await jobsResponse.text();
        const jsonStartIndex = responseText.indexOf('{');

        if (jsonStartIndex !== -1) {
          const jsonText = responseText.substring(jsonStartIndex);
          const data = JSON.parse(jsonText);

          if (data.success && data.message) {
            const jobs = data.message.jobs?.data || [];

            // Count cities from actual jobs
            const cityCounts = new Map();
            jobs.forEach((job: any) => {
              if (job.city_id) {
                cityCounts.set(job.city_id, (cityCounts.get(job.city_id) || 0) + 1);
              }
            });

            // Fetch city names
            const citiesResponse = await fetch(buildApiUrl(`/master-data/cities/${stateId}`));
            if (citiesResponse.ok) {
              const citiesData = await citiesResponse.json();
              const cities = (citiesData.data || [])
                .map((item: any) => ({
                  id: item.city_id || item.id,
                  name: item.city || item.name,
                  count: cityCounts.get(item.city_id || item.id) || 0
                }))
                .filter((item: any) => item.count > 0);

              setFilterOptions(prev => ({ ...prev, cities }));
              setFilters(prev => ({ ...prev, city: '' }));
              return;
            }
          }
        }
      }

      // If we reach here, set empty cities
      setFilterOptions(prev => ({ ...prev, cities: [] }));
      setFilters(prev => ({ ...prev, city: '' }));
    } catch (error) {
      console.error('Error fetching cities:', error);
      setFilterOptions(prev => ({ ...prev, cities: [] }));
    }
  };


  // Fetch jobs from API with filters
  const fetchJobs = async (searchQuery: string = '', appliedFilters: any = null) => {
    try {
      setLoading(true);

      const currentFilters = appliedFilters || filters;

      // Check if we have any filters applied
      const hasFilters = Object.values(currentFilters).some(value =>
        value !== '' && value !== null && value !== undefined && value !== false
      );

      // Use the regular jobs endpoint with filter parameters
      const apiUrl = buildApiUrl('/jobs');
      const queryParams = new URLSearchParams({
        limit: '100',
        order_by: 'id'
      });

      // Add search query if provided
      if (searchQuery && searchQuery.trim() !== '') {
        queryParams.append('search', searchQuery.trim());
      }

      // Add filter parameters if any filters are applied
      // Note: Laravel expects array parameters with [] notation
      if (currentFilters.jobType && currentFilters.jobType !== '') {
        queryParams.append('job_type_id[]', currentFilters.jobType.toString());
      }
      if (currentFilters.jobShift && currentFilters.jobShift !== '') {
        queryParams.append('job_shift_id[]', currentFilters.jobShift.toString());
      }
      if (currentFilters.careerLevel && currentFilters.careerLevel !== '') {
        queryParams.append('career_level_id[]', currentFilters.careerLevel.toString());
      }
      if (currentFilters.degreeLevel && currentFilters.degreeLevel !== '') {
        queryParams.append('degree_level_id[]', currentFilters.degreeLevel.toString());
      }
      if (currentFilters.jobExperience && currentFilters.jobExperience !== '') {
        queryParams.append('job_experience_id[]', currentFilters.jobExperience.toString());
      }
      if (currentFilters.industry && currentFilters.industry !== '') {
        queryParams.append('industry_id[]', currentFilters.industry.toString());
      }
      if (currentFilters.country && currentFilters.country !== '') {
        queryParams.append('country_id[]', currentFilters.country.toString());
      }
      if (currentFilters.state && currentFilters.state !== '') {
        queryParams.append('state_id[]', currentFilters.state.toString());
      }
      if (currentFilters.city && currentFilters.city !== '') {
        queryParams.append('city_id[]', currentFilters.city.toString());
      }
      if (currentFilters.salaryMin && currentFilters.salaryMin !== '') {
        queryParams.append('salary_from', currentFilters.salaryMin.toString());
      }
      if (currentFilters.salaryMax && currentFilters.salaryMax !== '') {
        queryParams.append('salary_to', currentFilters.salaryMax.toString());
      }

      const response = await fetch(`${apiUrl}?${queryParams}`);

      if (!response.ok) {
        setJobs([]);
        setJobMappings(null);
        return;
      }

      // Handle mixed HTML+JSON response
      const responseText = await response.text();
      const jsonStartIndex = responseText.indexOf('{');
      if (jsonStartIndex === -1) {
        setJobs([]);
        setJobMappings(null);
        return;
      }

      const jsonText = responseText.substring(jsonStartIndex);
      const data = JSON.parse(jsonText);

      // Handle different response structures
      if (data.success) {
        if (data.message && data.message.jobs && data.message.jobs.data) {
          // Regular jobs endpoint response
          setJobs(data.message.jobs.data || []);
          setJobMappings(data.message);
        } else if (data.data && Array.isArray(data.data)) {
          // Alternative response structure
          setJobs(data.data || []);
          setJobMappings({ id_values: {} });
        } else if (data.jobs && Array.isArray(data.jobs)) {
          // Alternative response structure
          setJobs(data.jobs || []);
          setJobMappings({ id_values: {} });
        } else {
          setJobs([]);
          setJobMappings(null);
        }
      } else {
        setJobs([]);
        setJobMappings(null);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
      setJobMappings(null);
    } finally {
      setLoading(false);
    }
  };


  // Apply filters
  const applyFilters = () => {
    fetchJobs(searchQuery, filters);
    setShowFilterModal(false);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {
      jobType: '',
      careerLevel: '',
      jobShift: '',
      degreeLevel: '',
      jobExperience: '',
      industry: '',
      country: '',
      state: '',
      city: '',
      salaryMin: '',
      salaryMax: '',
    };
    setFilters(clearedFilters);
    fetchJobs(searchQuery, clearedFilters);
    setShowFilterModal(false);
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '' && value !== null && value !== undefined) {
        count++;
      }
    });
    return count;
  };

  // Fetch featured jobs from API
  const fetchFeaturedJobs = async () => {
    try {
      const apiUrl = buildApiUrl('/jobs');
      const queryParams = new URLSearchParams({
        is_featured: '1',
        limit: '5',
        order_by: 'id'
      });

      const response = await fetch(`${apiUrl}?${queryParams}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle mixed HTML+JSON response
      const responseText = await response.text();
      const jsonStartIndex = responseText.indexOf('{');
      if (jsonStartIndex !== -1) {
        const jsonText = responseText.substring(jsonStartIndex);
        const data = JSON.parse(jsonText);

        if (data.success && data.message && data.message.jobs && data.message.jobs.data) {
          setFeaturedJobs(data.message.jobs.data || []);
          // Store the mappings for featured jobs to access company info
          setFeaturedJobMappings(data.message);
        }
      }
    } catch (error) {
      // Handle error silently
    }
  };

  // Fetch jobs by category
  const fetchJobsByCategory = async (categoryId: number) => {
    try {
      setLoading(true);

      // Use the jobs endpoint with functional_area_id filter (use array notation for Laravel)
      const apiUrl = buildApiUrl('/jobs');
      const queryParams = new URLSearchParams({
        limit: '100',
        order_by: 'id'
      });
      queryParams.append('functional_area_id[]', categoryId.toString());

      const response = await fetch(`${apiUrl}?${queryParams}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle mixed HTML+JSON response
      const responseText = await response.text();
      const jsonStartIndex = responseText.indexOf('{');
      if (jsonStartIndex === -1) {
        throw new Error('No JSON content found in response');
      }

      const jsonText = responseText.substring(jsonStartIndex);
      const data = JSON.parse(jsonText);

      if (data.success && data.message && data.message.jobs && data.message.jobs.data) {
        setJobs(data.message.jobs.data || []);
        setJobMappings(data.message);
      } else {
        Alert.alert('Error', 'Failed to fetch jobs for this category');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch jobs for this category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle search input - only update the query, don't search automatically
  const handleSearch = (text: string) => {
    setSearchQuery(text);

    // Clear any existing timeout since we're not auto-searching anymore
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
    // Fetch all jobs when clearing search
    fetchJobs('');
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

  // Helper function to get job type text
  const getJobTypeText = (job: Job): string => {
    if (job.job_type) {
      return job.job_type;
    }

    if (jobMappings && jobMappings.id_values) {
      const jobIndex = jobMappings.jobs?.data?.findIndex((j: any) => j.id === job.id);
      if (jobIndex >= 0 && jobMappings.id_values[jobIndex]) {
        const idValue = jobMappings.id_values[jobIndex];
        if (idValue.job_type) {
          return idValue.job_type;
        }
      }
    }

    return 'Full Time';
  };

  // Helper function to get job shift text
  const getJobShiftText = (job: Job): string => {
    if (job.job_shift) {
      return job.job_shift;
    }

    if (jobMappings && jobMappings.id_values) {
      const jobIndex = jobMappings.jobs?.data?.findIndex((j: any) => j.id === job.id);
      if (jobIndex >= 0 && jobMappings.id_values[jobIndex]) {
        const idValue = jobMappings.id_values[jobIndex];
        if (idValue.job_shift) {
          return idValue.job_shift;
        }
      }
    }

    return 'Day';
  };

  // Helper function to get career level text
  const getCareerLevelText = (job: Job): string => {
    if (job.career_level) {
      return job.career_level;
    }

    if (jobMappings && jobMappings.id_values) {
      const jobIndex = jobMappings.jobs?.data?.findIndex((j: any) => j.id === job.id);
      if (jobIndex >= 0 && jobMappings.id_values[jobIndex]) {
        const idValue = jobMappings.id_values[jobIndex];
        if (idValue.career_level) {
          return idValue.career_level;
        }
      }
    }

    return 'Entry Level';
  };

  // Helper function to get degree level text
  const getDegreeLevelText = (job: Job): string => {
    if (job.degree_level) {
      return job.degree_level;
    }

    if (jobMappings && jobMappings.id_values) {
      const jobIndex = jobMappings.jobs?.data?.findIndex((j: any) => j.id === job.id);
      if (jobIndex >= 0 && jobMappings.id_values[jobIndex]) {
        const idValue = jobMappings.id_values[jobIndex];
        if (idValue.degree_level) {
          return idValue.degree_level;
        }
      }
    }

    return 'Bachelors';
  };

  // Helper function to get job experience text
  const getJobExperienceText = (job: Job): string => {
    if (job.job_experience) {
      return job.job_experience;
    }

    if (jobMappings && jobMappings.id_values) {
      const jobIndex = jobMappings.jobs?.data?.findIndex((j: any) => j.id === job.id);
      if (jobIndex >= 0 && jobMappings.id_values[jobIndex]) {
        const idValue = jobMappings.id_values[jobIndex];
        if (idValue.job_experience) {
          return idValue.job_experience;
        }
      }
    }

    return '1-3 years';
  };

  // Helper function to get company name from id_values
  const getCompanyName = (job: Job): string => {
    // For category jobs, use the company_name directly from the job object
    if (categoryId && (job as any).company_name) {
      return (job as any).company_name;
    }

    if (!jobMappings || !jobMappings.id_values) {
      return `Company ID: ${job.company_id}`;
    }

    const jobIndex = jobMappings.jobs?.data?.findIndex((j: any) => j.id === job.id);

    if (jobIndex >= 0 && jobMappings.id_values[jobIndex]) {
      const idValue = jobMappings.id_values[jobIndex];
      return idValue.company_name || `Company ID: ${job.company_id}`;
    }

    return `Company ID: ${job.company_id}`;
  };

  // Helper function to get location from id_values
  const getLocation = (job: Job): string => {
    // For category jobs, use the location data directly from the job object
    if (categoryId) {
      const city = (job as any).city || '';
      const state = (job as any).state || '';
      const country = (job as any).country || '';

      const locationParts = [city, state, country].filter(Boolean);
      return locationParts.length > 0 ? locationParts.join(', ') : t('location_not_specified');
    }

    if (!jobMappings || !jobMappings.id_values) {
      return t('location_not_specified');
    }

    const jobIndex = jobMappings.jobs?.data?.findIndex((j: any) => j.id === job.id);

    if (jobIndex >= 0 && jobMappings.id_values[jobIndex]) {
      const idValue = jobMappings.id_values[jobIndex];
      const city = idValue.city || '';
      const state = idValue.state || '';
      const country = idValue.country || '';

      const locationParts = [city, state, country].filter(Boolean);
      return locationParts.length > 0 ? locationParts.join(', ') : t('location_not_specified');
    }

    return t('location_not_specified');
  };

  // Helper function to get company logo from id_values
  // Get company name for featured jobs
  const getFeaturedJobCompanyName = (job: any): string => {
    // First try direct fields from job object
    if (job.company?.name || job.company_name || job.company?.company_name) {
      return job.company?.name || job.company_name || job.company?.company_name;
    }

    // If no direct fields, try to get from featured job mappings
    if (featuredJobMappings && featuredJobMappings.id_values) {
      const jobIndex = featuredJobMappings.jobs?.data?.findIndex((j: any) => j.id === job.id);

      if (jobIndex >= 0 && featuredJobMappings.id_values[jobIndex]) {
        const idValue = featuredJobMappings.id_values[jobIndex];
        return idValue.company_name || `Company ID: ${job.company_id}`;
      }
    }

    // Fallback: try to get from regular job mappings if available
    if (jobMappings && jobMappings.id_values) {
      const jobIndex = jobMappings.jobs?.data?.findIndex((j: any) => j.id === job.id);

      if (jobIndex >= 0 && jobMappings.id_values[jobIndex]) {
        const idValue = jobMappings.id_values[jobIndex];
        return idValue.company_name || `Company ID: ${job.company_id}`;
      }
    }

    return `Company ID: ${job.company_id}`;
  };

  // Get date for featured jobs
  const getFeaturedJobDate = (job: any): string => {
    // Try multiple possible date fields
    const dateField = job.posted_date || job.created_at || job.date || job.job_date;

    if (dateField) {
      try {
        return new Date(dateField).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        });
      } catch (error) {
        return t('recent');
      }
    }

    return t('recent');
  };

  // Get company logo for featured jobs
  const getFeaturedJobCompanyLogo = (job: any): any => {
    const noImageUrl = buildAdminAssetUrl('no-image.png');

    // First try direct fields from job object
    let logoUrl = job.company?.logo || job.company_logo || job.logo || job.company?.company_logo;

    // If no direct fields, try to get from featured job mappings
    if (!logoUrl && featuredJobMappings && featuredJobMappings.id_values) {
      const jobIndex = featuredJobMappings.jobs?.data?.findIndex((j: any) => j.id === job.id);

      if (jobIndex >= 0 && featuredJobMappings.id_values[jobIndex]) {
        const idValue = featuredJobMappings.id_values[jobIndex];
        logoUrl = idValue.company_logo;
      }
    }

    // Fallback: try to get from regular job mappings if available
    if (!logoUrl && jobMappings && jobMappings.id_values) {
      const jobIndex = jobMappings.jobs?.data?.findIndex((j: any) => j.id === job.id);

      if (jobIndex >= 0 && jobMappings.id_values[jobIndex]) {
        const idValue = jobMappings.id_values[jobIndex];
        logoUrl = idValue.company_logo;
      }
    }

    if (logoUrl && logoUrl !== '' && logoUrl !== 'null') {
      // If it's already a full URL with proper domain, check if it needs correction
      if (logoUrl.startsWith('http')) {
        // Fix the URL by removing /storage/ from the path
        if (logoUrl.includes('/storage/company_logos/')) {
          const correctedUrl = logoUrl.replace('/storage/company_logos/', '/company_logos/');
          return { uri: correctedUrl };
        }
        return { uri: logoUrl };
      }

      // If it's a localhost URL, convert it to the proper domain
      if (logoUrl.includes('localhost')) {
        // Extract the path from localhost URL and convert to proper domain
        const pathMatch = logoUrl.match(/\/images\/(.+)$/);
        if (pathMatch) {
          // Remove /images/ and keep only the company_logos path
          const assetPath = `/${pathMatch[1]}`;
          const convertedUrl = buildAssetUrl(assetPath);
          return { uri: convertedUrl };
        }
      }

      // If it's a relative path, construct the full URL
      if (logoUrl.startsWith('/') || logoUrl.startsWith('images/')) {
        const constructedUrl = buildAssetUrl(logoUrl);
        return { uri: constructedUrl };
      }

      // Try to construct URL with base path
      const fallbackUrl = buildAssetUrl(logoUrl);
      return { uri: fallbackUrl };
    }

    return { uri: noImageUrl };
  };

  const getCompanyLogo = (job: Job): any => {
    const noImageUrl = buildAdminAssetUrl('no-image.png');

    // For category jobs, use the company_logo directly from the job object
    if (categoryId && (job as any).company_logo) {
      const companyLogo = (job as any).company_logo;
      if (companyLogo && companyLogo !== '' && companyLogo !== 'null') {
        try {
          // Check if it's a valid URL
          new URL(companyLogo);
          // Check if it's not a placeholder image
          if (companyLogo.includes('no-image') || companyLogo.includes('placeholder')) {
            return { uri: noImageUrl };
          }
          return { uri: companyLogo };
        } catch (error) {
          // If URL parsing fails, try to build a proper asset URL
          if (companyLogo.startsWith('/')) {
            return { uri: buildAssetUrl(companyLogo) };
          }
          return { uri: noImageUrl };
        }
      }
    }

    // For regular jobs, use the jobMappings
    if (!jobMappings || !jobMappings.id_values) {
      return { uri: noImageUrl };
    }

    const jobIndex = jobMappings.jobs?.data?.findIndex((j: any) => j.id === job.id);

    if (jobIndex >= 0 && jobMappings.id_values[jobIndex]) {
      const idValue = jobMappings.id_values[jobIndex];

      if (idValue.company_logo && idValue.company_logo !== '' && idValue.company_logo !== 'null') {
        try {
          // Check if it's a valid URL
          new URL(idValue.company_logo);
          // Check if it's not a placeholder image
          if (idValue.company_logo.includes('no-image') || idValue.company_logo.includes('placeholder')) {
            return { uri: noImageUrl };
          }
          return { uri: idValue.company_logo };
        } catch (error) {
          // If URL parsing fails, try to build a proper asset URL
          if (idValue.company_logo.startsWith('/')) {
            return { uri: buildAssetUrl(idValue.company_logo) };
          }
          return { uri: noImageUrl };
        }
      } else {
        return { uri: noImageUrl };
      }
    } else {
      return { uri: noImageUrl };
    }
  };

  // Filter jobs based on search and exclude featured jobs
  const featuredJobIds = new Set(featuredJobs.map(job => job.id));

  // Check if filters are active
  const hasActiveFilters = getActiveFilterCount() > 0;

  // For category jobs, show all jobs in the main list (no featured section)
  // For regular jobs, exclude featured jobs to avoid duplication UNLESS we're searching or filtering
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase());

    if (categoryId) {
      // For category jobs, show all jobs in the main list
      return matchesSearch;
    } else if (searchQuery.trim() || hasActiveFilters) {
      // When searching or filtering, show all matching jobs (including featured ones)
      return matchesSearch;
    } else {
      // For regular jobs without search/filters, exclude featured jobs to avoid duplication
      return matchesSearch && !featuredJobIds.has(job.id);
    }
  });


  useEffect(() => {
    if (categoryId) {
      fetchJobsByCategory(categoryId);
    } else {
      fetchJobs();
    }
    fetchFeaturedJobs();
    fetchFilterOptions();
  }, [categoryId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  if (loading) {
    return (
      <LinearGradient
        colors={['#F5F6FD', '#E4F4EC']}
        style={styles.container}
      >
        <Header
          title={t('jobs')}
          subtitle={categoryName ? t('jobs_in_category', { category: categoryName }) : t('find_next_opportunity')}
          onMenuPress={() => setSidebarVisible(true)}
          onBack={onBack}
          showBack={!!onBack}
        />

        <View style={styles.loadingContainer}>
          <MaterialIcons name="hourglass-empty" size={48} color="#666" />
          <Text style={styles.loadingText}>{t('loading_jobs')}</Text>
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
        title={t('jobs')}
        onMenuPress={() => setSidebarVisible(true)}
        onBack={onBack}
        showBack={!!onBack}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
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
            onPress={() => {
              // Clear any existing timeout
              if (searchTimeout) {
                clearTimeout(searchTimeout);
                setSearchTimeout(null);
              }
              // Trigger search with current query
              fetchJobs(searchQuery.trim());
            }}
          >
            <MaterialIcons name="search" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <MaterialIcons name="filter-list" size={24} color="#666" />
            {getActiveFilterCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.mainScrollView} showsVerticalScrollIndicator={false}>
        {/* Featured Jobs Section - Only show on regular job list, not on category pages, when searching, or when filters are active */}
        {!categoryId && featuredJobs.length > 0 && !searchQuery.trim() && getActiveFilterCount() === 0 && (
          <View style={styles.featuredJobsSection}>
            <Text style={styles.featuredJobsTitle}>{t('featured_jobs_title')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredJobsScrollContainer}
              style={styles.featuredJobsScrollView}
            >
              {featuredJobs.map((job, index) => (
                <TouchableOpacity
                  key={job.id || index}
                  style={styles.featuredJobCard}
                  onPress={() => onNavigateToJobDetail?.(job.slug)}
                >
                  <View style={styles.featuredJobCardHeader}>
                    <View style={styles.featuredJobTypeContainer}>
                      <MaterialIcons name="work" size={16} color="#10B981" />
                      <Text style={styles.featuredJobType}>{job.job_type || 'Full Time/Permanent'}</Text>
                    </View>
                    <View style={styles.featuredBadge}>
                      <MaterialIcons name="star" size={16} color="#FFD700" />
                    </View>
                  </View>

                  <Text style={styles.featuredJobTitle} numberOfLines={2}>
                    {job.title || 'Job Title'}
                  </Text>

                  <Text style={styles.featuredJobSalary}>
                    {t('salary')}: {job.salary_currency || 'USD'}{job.salary_from || '0'} - {job.salary_currency || 'USD'}{job.salary_to || '0'}
                  </Text>

                  <View style={styles.featuredJobLocation}>
                    <MaterialIcons name="location-on" size={16} color="#6B7280" />
                    <Text style={styles.featuredLocationText}>
                      {job.location?.city || job.city || 'Remote'}
                    </Text>
                  </View>

                  <View style={styles.featuredJobCardFooter}>
                    <View style={styles.featuredJobCompanyInfo}>
                      <View style={styles.featuredJobCompanyLogoContainer}>
                        {failedImages.has(job.id) ? (
                          <View style={styles.featuredJobCompanyLogoPlaceholder}>
                            <MaterialIcons name="business" size={16} color="#999" />
                          </View>
                        ) : (
                          <Image
                            source={getFeaturedJobCompanyLogo(job)}
                            style={styles.featuredJobCompanyLogo}
                            onError={() => {
                              setFailedImages(prev => new Set(prev).add(job.id));
                            }}
                            resizeMode="cover"
                          />
                        )}
                      </View>
                      <View style={styles.featuredJobCompanyDetails}>
                        <Text style={styles.featuredJobCompanyName} numberOfLines={1}>
                          {getFeaturedJobCompanyName(job)}
                        </Text>
                        <Text style={styles.featuredJobDate}>
                          {getFeaturedJobDate(job)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.jobCountSection}>
          <Text style={styles.jobCountText}>
            {categoryName ? t('jobs_found_in', { count: filteredJobs.length, category: categoryName }) : t('jobs_found', { count: filteredJobs.length })}
          </Text>
        </View>

        <View style={styles.jobsContainer}>
          {filteredJobs.length === 0 ? (
            <View style={styles.noJobsContainer}>
              <MaterialIcons name="work-off" size={64} color="#999" />
              <Text style={styles.noJobsText}>
                {searchQuery ? t('no_jobs_search') : t('no_jobs_available')}
              </Text>
            </View>
          ) : (
            filteredJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => onJobPress(job)}
                activeOpacity={0.7}
              >
                <View style={styles.jobHeader}>
                  <View style={styles.jobTypeBadge}>
                    <MaterialIcons name="work" size={16} color="#4CAF50" />
                    <Text style={styles.jobTypeText}>{getJobTypeText(job)}</Text>
                  </View>
                </View>

                <Text style={styles.jobTitle} numberOfLines={2}>
                  {job.title}
                </Text>

                <View style={styles.companyInfo}>
                  <View style={styles.companyLogoContainer}>
                    {failedImages.has(job.id) ? (
                      <View style={styles.companyLogoPlaceholder}>
                        <MaterialIcons name="business" size={20} color="#999" />
                      </View>
                    ) : (
                      <Image
                        source={getCompanyLogo(job)}
                        style={styles.companyLogo}
                        onError={() => {
                          setFailedImages(prev => new Set(prev).add(job.id));
                        }}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                  <Text style={styles.companyName}>{getCompanyName(job)}</Text>
                </View>

                <View style={styles.jobLocation}>
                  <MaterialIcons name="location-on" size={16} color="#9C27B0" />
                  <Text style={styles.locationText}>
                    {getLocation(job)}
                  </Text>
                </View>

                <View style={styles.jobDetails}>
                  <View style={styles.jobDetailItem}>
                    <MaterialIcons name="trending-up" size={16} color="#666" />
                    <Text style={styles.jobDetailText}>{getCareerLevelText(job)}</Text>
                  </View>
                  <View style={styles.jobDetailItem}>
                    <MaterialIcons name="access-time" size={16} color="#666" />
                    <Text style={styles.jobDetailText}>{getJobShiftText(job)}</Text>
                  </View>
                  <View style={styles.jobDetailItem}>
                    <MaterialIcons name="school" size={16} color="#666" />
                    <Text style={styles.jobDetailText}>{getDegreeLevelText(job)}</Text>
                  </View>
                </View>

                <View style={styles.jobFooter}>
                  <Text style={styles.postedDate}>{t('posted')}: {formatPostedDate(job.created_at)}</Text>
                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={() => onJobPress(job)}
                  >
                    <Text style={styles.applyButtonText}>{t('apply_now')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
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
            navigationFunctions,
            onLogout: onBack
          });

          if (!success) {
            // Navigation failed
          }
        }}
        onLogout={onBack}
      />

      {/* Bottom Navigation */}
      <Navigation
        activeTab={activeTab}
        messageUnreadCount={messageUnreadCount}
        onTabPress={(tab) => {
          setActiveTab(tab);
          switch (tab) {
            case 'home':
              onBack();
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
            case 'profile':
              onNavigateToProfile?.();
              break;
          }
        }}
        userType="seeker"
      />

      {/* Filter Modal */}
      {showFilterModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>{t('filter_jobs')}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFilterModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
              {/* 1. Jobs By Experience */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('jobs_by_experience')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                  {filterOptions.jobExperiences.map((exp: any) => (
                    <TouchableOpacity
                      key={exp.id}
                      style={[
                        styles.filterChip,
                        filters.jobExperience === exp.id && styles.filterChipActive
                      ]}
                      onPress={() => setFilters(prev => ({ ...prev, jobExperience: prev.jobExperience === exp.id ? '' : exp.id }))}
                    >
                      <Text style={[
                        styles.filterChipText,
                        filters.jobExperience === exp.id && styles.filterChipTextActive
                      ]}>
                        {exp.name} {exp.count > 0 && `(${exp.count})`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 2. Job Type */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('job_type')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                  {filterOptions.jobTypes.map((type: any) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.filterChip,
                        filters.jobType === type.id && styles.filterChipActive
                      ]}
                      onPress={() => setFilters(prev => ({ ...prev, jobType: prev.jobType === type.id ? '' : type.id }))}
                    >
                      <Text style={[
                        styles.filterChipText,
                        filters.jobType === type.id && styles.filterChipTextActive
                      ]}>
                        {type.name} {type.count > 0 && `(${type.count})`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 3. Job Shift */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('job_shift')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                  {filterOptions.jobShifts.map((shift: any) => (
                    <TouchableOpacity
                      key={shift.id}
                      style={[
                        styles.filterChip,
                        filters.jobShift === shift.id && styles.filterChipActive
                      ]}
                      onPress={() => setFilters(prev => ({ ...prev, jobShift: prev.jobShift === shift.id ? '' : shift.id }))}
                    >
                      <Text style={[
                        styles.filterChipText,
                        filters.jobShift === shift.id && styles.filterChipTextActive
                      ]}>
                        {shift.name} {shift.count > 0 && `(${shift.count})`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 4. Career Level */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('career_level')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                  {filterOptions.careerLevels.map((level: any) => (
                    <TouchableOpacity
                      key={level.id}
                      style={[
                        styles.filterChip,
                        filters.careerLevel === level.id && styles.filterChipActive
                      ]}
                      onPress={() => setFilters(prev => ({ ...prev, careerLevel: prev.careerLevel === level.id ? '' : level.id }))}
                    >
                      <Text style={[
                        styles.filterChipText,
                        filters.careerLevel === level.id && styles.filterChipTextActive
                      ]}>
                        {level.name} {level.count > 0 && `(${level.count})`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 5. Degree Level */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('degree_level')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                  {filterOptions.degreeLevels.map((degree: any) => (
                    <TouchableOpacity
                      key={degree.id}
                      style={[
                        styles.filterChip,
                        filters.degreeLevel === degree.id && styles.filterChipActive
                      ]}
                      onPress={() => setFilters(prev => ({ ...prev, degreeLevel: prev.degreeLevel === degree.id ? '' : degree.id }))}
                    >
                      <Text style={[
                        styles.filterChipText,
                        filters.degreeLevel === degree.id && styles.filterChipTextActive
                      ]}>
                        {degree.name} {degree.count > 0 && `(${degree.count})`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 6. Jobs By Industry */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('jobs_by_industry')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                  {filterOptions.industries.map((industry: any) => (
                    <TouchableOpacity
                      key={industry.id}
                      style={[
                        styles.filterChip,
                        filters.industry === industry.id && styles.filterChipActive
                      ]}
                      onPress={() => setFilters(prev => ({ ...prev, industry: prev.industry === industry.id ? '' : industry.id }))}
                    >
                      <Text style={[
                        styles.filterChipText,
                        filters.industry === industry.id && styles.filterChipTextActive
                      ]}>
                        {industry.name} {industry.count > 0 && `(${industry.count})`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 7. Jobs By Country */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('jobs_by_country')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                  {filterOptions.countries.map((country: any) => (
                    <TouchableOpacity
                      key={country.id}
                      style={[
                        styles.filterChip,
                        filters.country === country.id && styles.filterChipActive
                      ]}
                      onPress={() => {
                        const newCountry = filters.country === country.id ? '' : country.id;
                        setFilters(prev => ({ ...prev, country: newCountry }));
                        if (newCountry) {
                          fetchStates(newCountry as number);
                        } else {
                          setFilterOptions(prev => ({ ...prev, states: [], cities: [] }));
                          setFilters(prev => ({ ...prev, state: '', city: '' }));
                        }
                      }}
                    >
                      <Text style={[
                        styles.filterChipText,
                        filters.country === country.id && styles.filterChipTextActive
                      ]}>
                        {country.name} {country.count > 0 && `(${country.count})`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 8. Jobs By State */}
              {filterOptions.states.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>{t('jobs_by_state')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                    {filterOptions.states.map((state: any) => (
                      <TouchableOpacity
                        key={state.id}
                        style={[
                          styles.filterChip,
                          filters.state === state.id && styles.filterChipActive
                        ]}
                        onPress={() => {
                          const newState = filters.state === state.id ? '' : state.id;
                          setFilters(prev => ({ ...prev, state: newState }));
                          if (newState) {
                            fetchCities(newState as number);
                          } else {
                            setFilterOptions(prev => ({ ...prev, cities: [] }));
                            setFilters(prev => ({ ...prev, city: '' }));
                          }
                        }}
                      >
                        <Text style={[
                          styles.filterChipText,
                          filters.state === state.id && styles.filterChipTextActive
                        ]}>
                          {state.name} {state.count > 0 && `(${state.count})`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* 9. Jobs By City */}
              {filterOptions.cities.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>{t('jobs_by_city')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                    {filterOptions.cities.map((city: any) => (
                      <TouchableOpacity
                        key={city.id}
                        style={[
                          styles.filterChip,
                          filters.city === city.id && styles.filterChipActive
                        ]}
                        onPress={() => setFilters(prev => ({ ...prev, city: prev.city === city.id ? '' : city.id }))}
                      >
                        <Text style={[
                          styles.filterChipText,
                          filters.city === city.id && styles.filterChipTextActive
                        ]}>
                          {city.name} {city.count > 0 && `(${city.count})`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* 10. Salary Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>{t('salary_range')}</Text>
                <View style={styles.salaryInputs}>
                  <TextInput
                    style={styles.salaryInput}
                    placeholder={t('salary_from')}
                    placeholderTextColor="#999"
                    value={filters.salaryMin}
                    onChangeText={(text) => setFilters(prev => ({ ...prev, salaryMin: text }))}
                    keyboardType="numeric"
                  />
                  <Text style={styles.salarySeparator}>{t('to')}</Text>
                  <TextInput
                    style={styles.salaryInput}
                    placeholder={t('salary_to')}
                    placeholderTextColor="#999"
                    value={filters.salaryMax}
                    onChangeText={(text) => setFilters(prev => ({ ...prev, salaryMax: text }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearFiltersText}>{t('clear_all')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={applyFilters}
              >
                <MaterialIcons name="search" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.applyFiltersText}>{t('search_jobs')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 10,
  },
  toggleButtonActive: {
    backgroundColor: '#17D27C',
    borderColor: '#17D27C',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchSection: {
    marginBottom: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  searchButton: {
    backgroundColor: '#17D27C',
    padding: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  filterButton: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  jobCountSection: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  jobCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  jobsSection: {
    gap: 15,
    marginBottom: 20,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  jobTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  jobTypeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 6,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    lineHeight: 24,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  companyLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  companyLogo: {
    width: '100%',
    height: '100%',
  },
  companyLogoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  companyName: {
    fontSize: 16,
    color: '#17D27C',
    fontWeight: '600',
  },
  jobLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  jobDetails: {
    marginBottom: 20,
  },
  jobDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#eee',
    paddingTop: 15,
  },
  postedDate: {
    fontSize: 14,
    color: '#999',
  },
  applyButton: {
    backgroundColor: '#5D2DF9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 10,
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
  mockDataButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  mockDataButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchIcon: {
    marginRight: 10,
  },
  noJobsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noJobsText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  mainScrollView: {
    flex: 1,
  },
  jobsContainer: {
    paddingHorizontal: 20,
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
  // Featured Jobs Styles
  featuredJobsSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  featuredJobsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
  },
  featuredJobsScrollView: {
    paddingBottom: 10,
    paddingLeft: 5,
  },
  featuredJobsScrollContainer: {
    paddingHorizontal: 0,
  },
  featuredJobCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#ffb6b6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredJobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredJobTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredJobType: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
  },
  featuredBadge: {
    backgroundColor: '#ff0707',
    borderRadius: 12,
    padding: 4,
  },
  featuredJobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 20,
  },
  featuredJobSalary: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  featuredJobLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredLocationText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  featuredJobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredJobDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  featuredJobCompany: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  featuredJobCompanyLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredJobCompanyLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  featuredJobCompanyLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredJobCompanyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  featuredJobCompanyDetails: {
    marginLeft: 8,
    flex: 1,
  },
  featuredJobCompanyName: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  // Filter Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  filterModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '80%',
    paddingBottom: 100,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  filterContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#17D27C',
    borderColor: '#17D27C',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  salaryInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  salaryInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
  },
  salarySeparator: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#17D27C',
    borderColor: '#17D27C',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  filterModalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  clearFiltersButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  clearFiltersText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  applyFiltersButton: {
    flex: 1,
    backgroundColor: '#17D27C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  applyFiltersText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  // Filter Button Badge
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default JobList; 