import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import Header from '../Header';
import Sidebar from '../Sidebar';
import Navigation from '../Navigation';
import { handleNavigation, NavigationFunctions } from '../../utils/navigationHandler';
import { buildApiUrl, getCommonHeaders, API_CONFIG } from '../../config/api';

interface EditProfileProps {
  onMenuPress: () => void;
  navigation?: any; // Add navigation prop
  onBack?: () => void; // Add back navigation prop
  onLogout?: () => void;
  messageUnreadCount?: number;
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

interface MasterData {
  id: number;
  name: string;
}

interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mobile_num: string;
  gender_id: number;
  marital_status_id: number;
  country_id: number;
  state_id: number;
  city_id: number;
  nationality_id: number;
  date_of_birth: string;
  street_address: string;
  video_link: string;
  job_experience_id: number;
  career_level_id: number;
  industry_id: number;
  functional_area_id: number;
  current_salary: string;
  expected_salary: string;
  salary_currency: string;
  image?: string;
  cover_image?: string;
}

// Custom Searchable Picker Component
interface SearchablePickerProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  data: MasterData[];
  placeholder: string;
  enabled?: boolean;
  hasError?: boolean;
}

const SearchablePicker: React.FC<SearchablePickerProps> = ({
  label,
  value,
  onValueChange,
  data,
  placeholder,
  enabled = true,
  hasError = false
}) => {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState<MasterData[]>(data);

  useEffect(() => {
    setFilteredData(data);
  }, [data]);

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.trim() === '') {
      setFilteredData(data);
    } else {
      const filtered = data.filter(item =>
        item.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredData(filtered);
    }
  };

  const handleSelect = (selectedValue: number) => {
    onValueChange(selectedValue);
    setModalVisible(false);
    setSearchText('');
  };

  const selectedItem = data.find(item => item.id === value);
  const displayText = selectedItem ? selectedItem.name : placeholder;

  // Render label with red asterisk if it contains *
  const renderLabel = () => {
    if (label.includes('*')) {
      const labelText = label.replace('*', '').trim();
      return (
        <Text style={styles.inputLabel}>
          {labelText} <Text style={styles.requiredAsterisk}>*</Text>
        </Text>
      );
    }
    return <Text style={styles.inputLabel}>{label}</Text>;
  };

  return (
    <View style={styles.inputGroup}>
      {renderLabel()}
      <TouchableOpacity
        style={[styles.pickerContainer, !enabled && styles.pickerDisabled, hasError && styles.pickerError]}
        onPress={() => enabled && setModalVisible(true)}
        disabled={!enabled}
      >
        <Text style={[styles.pickerText, !selectedItem && styles.placeholderText, hasError && styles.textInputError]}>
          {displayText}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder={t('search_placeholder')}
              value={searchText}
              onChangeText={handleSearch}
              autoFocus
            />

            <ScrollView style={styles.optionsList}>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleSelect(0)}
              >
                <Text style={styles.optionText}>{placeholder}</Text>
              </TouchableOpacity>

              {filteredData.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.optionItem, value === item.id && styles.selectedOption]}
                  onPress={() => handleSelect(item.id)}
                >
                  <Text style={[styles.optionText, value === item.id && styles.selectedOptionText]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const EditProfile: React.FC<EditProfileProps> = ({ onMenuPress, navigation, onBack, onLogout, messageUnreadCount = 0, onNavigateToJobDetail, onNavigateToJobAlerts, onNavigateToMyFollowings, onNavigateToEditProfile, onNavigateToBuildResume, onNavigateToMyApplications, onNavigateToFavouriteJobs, onNavigateToCompanies, onNavigateToPackages, onNavigateToPaymentHistory, onNavigateToJobSearch, onNavigateToProfile, onNavigateToMessages }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
  const [tempProfileImage, setTempProfileImage] = useState<string | null>(null);
  const [tempCoverImage, setTempCoverImage] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [profileData, setProfileData] = useState<UserProfile>({
    id: 0,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile_num: '',
    gender_id: 0,
    marital_status_id: 0,
    country_id: 0,
    state_id: 0,
    city_id: 0,
    nationality_id: 0,
    date_of_birth: '',
    street_address: '',
    video_link: '',
    job_experience_id: 0,
    career_level_id: 0,
    industry_id: 0,
    functional_area_id: 0,
    current_salary: '',
    expected_salary: '',
    salary_currency: '',
  });

  // Master data states
  const [genders, setGenders] = useState<MasterData[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<MasterData[]>([]);
  const [countries, setCountries] = useState<MasterData[]>([]);
  const [states, setStates] = useState<MasterData[]>([]);
  const [cities, setCities] = useState<MasterData[]>([]);
  const [nationalities, setNationalities] = useState<MasterData[]>([]);
  const [jobExperiences, setJobExperiences] = useState<MasterData[]>([]);
  const [careerLevels, setCareerLevels] = useState<MasterData[]>([]);
  const [industries, setIndustries] = useState<MasterData[]>([]);
  const [functionalAreas, setFunctionalAreas] = useState<MasterData[]>([]);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: boolean }>({});
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [checkmarkScale] = useState(new Animated.Value(0));
  const [checkmarkOpacity] = useState(new Animated.Value(0));
  const [checkmarkRotation] = useState(new Animated.Value(0));
  const [contentSlide] = useState(new Animated.Value(50));
  const [contentOpacity] = useState(new Animated.Value(0));

  // Helper for building profile image URL
  const getProfileImageUri = () => {
    if (tempProfileImage) return tempProfileImage; // always prefer temp preview
    if (profileData.image) {
      // Remove 'storage/' from the path if it exists, as the actual web path doesn't have it
      const imagePath = profileData.image.replace('storage/', '');
      return `${API_CONFIG.BASE_URL.replace('/api', '')}/user_images/${imagePath}`;
    }
    return undefined;
  };

  // Helper for cover image URL
  const getCoverImageUri = () => {
    if (tempCoverImage) return tempCoverImage;
    if (profileData.cover_image) {
      // Remove 'storage/' from the path if it exists, as the actual web path doesn't have it
      const imagePath = profileData.cover_image.replace('storage/', '');
      return `${API_CONFIG.BASE_URL.replace('/api', '')}/user_images/${imagePath}`;
    }
    return undefined;
  };



  // Function to clear temporary image previews
  const clearTempImages = () => {
    setTempProfileImage(null);
    setTempCoverImage(null);
  };

  // Test function to check if upload endpoint is accessible
  const testUploadEndpoint = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert('Error', 'Please sign in to test upload endpoint');
        return;
      }

      // Test with a simple GET request to see if endpoint exists
      const testResponse = await fetch(buildApiUrl('/upload/profile-image'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
        },
      });


      if (testResponse.status === 405) {
        // Method not allowed - endpoint exists but doesn't accept GET
      } else if (testResponse.status === 404) {
        Alert.alert('Error', 'Upload endpoint not found. Please check the API configuration.');
      } else {
      }
    } catch (error) {
      Alert.alert('Error', `Failed to test upload endpoint: ${error}`);
    }
  };

  // Function to upload profile image after profile update
  const uploadProfileImage = async (imageUri: string, token: string) => {
    try {
      const formData = new FormData();

      // Backend expects 'image' field name
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile_image.jpg',
      } as any);

      formData.append('name', profileData.first_name + ' ' + profileData.last_name);
      formData.append('type', 'profile'); // Add type to distinguish from cover image

      // Debug: Log FormData contents

      const response = await fetch(buildApiUrl('/upload/profile-image'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // Remove Content-Type header - let the browser set it automatically for FormData
        },
        body: formData,
      });

      // Debug: Log response details

      if (response.ok) {
        const data = await response.json();

        // Update the profile data with new image filename
        updateProfileData('image', data.data.filename);

        // Force update the profile in the database with the new image filename
        await forceUpdateProfileImage(data.data.filename, token);
      } else {
        // Better error handling to debug the 500 error
        const errorText = await response.text();

        // Try to parse as JSON for more details
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.errors) {
          }
        } catch (parseError) {
        }

        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      throw error; // Re-throw to handle in calling function
    }
  };

  // Function to upload cover image after profile update
  const uploadCoverImage = async (imageUri: string, token: string) => {
    try {
      const formData = new FormData();

      // Backend expects 'image' field name
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'cover_image.jpg',
      } as any);

      formData.append('name', profileData.first_name + ' ' + profileData.last_name);
      formData.append('type', 'cover'); // Add type to distinguish from profile image

      const response = await fetch(buildApiUrl('/upload/profile-image'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // Remove Content-Type header - let the browser set it automatically for FormData
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();

        // Update the profile data with new image filename
        updateProfileData('cover_image', data.data.filename);

        // Force update the profile in the database with the new cover image filename
        await forceUpdateProfileImage(data.data.filename, token, 'cover_image');
      } else {
        // Better error handling to debug the 500 error
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      throw error; // Re-throw to handle in calling function
    }
  };

  // Function to force update profile image in database
  const forceUpdateProfileImage = async (filename: string, token: string, field: 'image' | 'cover_image' = 'image') => {
    try {
      // Include all current profile data + the new image filename
      // Laravel requires ALL fields to be present, not just the image field
      const updateData: any = {
        ...profileData,  // Include all current profile data
        [field]: filename  // Update the specific image field
      };

      // Remove any undefined or null values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === null) {
          delete updateData[key];
        }
      });

      const response = await fetch(buildApiUrl('/my-profile'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorText = await response.text();
      }
    } catch (error) {
    }
  };

  // Handle image-first update flow
  const handleImageFirstUpdate = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) return;

      // Upload new profile image first
      if (tempProfileImage) {
        await uploadProfileImage(tempProfileImage, authToken);
      }

      // Upload new cover image first
      if (tempCoverImage) {
        await uploadCoverImage(tempCoverImage, authToken);
      }

      // Update profile with new image filenames
      await forceUpdateProfileImage('', authToken);

      // Clear temporary images
      clearTempImages();

      // Show success screen
      setShowSuccessScreen(true);
    } catch (error) {
      // Handle error silently
    }
  };

  useEffect(() => {
    fetchMasterData();
    fetchUserProfile();
    // Clear any temporary images when component mounts
    clearTempImages();
  }, []);

  // Function to map nationality ID to the correct nationality data
  const mapNationalityId = (nationalityId: number) => {
    if (nationalityId === 0) return 0;

    // First try to find in nationalities array
    const nationality = nationalities.find(n => n.id === nationalityId);
    if (nationality) {
      return nationalityId;
    }

    // If not found in nationalities, check if it's a country ID
    const country = countries.find(c => c.id === nationalityId);
    if (country) {
      // Find the corresponding nationality in nationalities array
      const mappedNationality = nationalities.find(n => n.name === country.name);
      if (mappedNationality) {
        return mappedNationality.id;
      }
    }

    return nationalityId;
  };

  // Update nationality ID when nationalities data changes
  useEffect(() => {
    if (nationalities.length > 0 && profileData.nationality_id > 0) {
      const mappedId = mapNationalityId(profileData.nationality_id);
      if (mappedId !== profileData.nationality_id) {
        updateProfileData('nationality_id', mappedId);
      }
    }
  }, [nationalities, profileData.nationality_id]);

  // Parse date of birth when profile data is loaded
  useEffect(() => {
    if (profileData.date_of_birth) {
      try {
        const dateObj = new Date(profileData.date_of_birth);
        if (!isNaN(dateObj.getTime())) {
          setSelectedDate(dateObj);
        }
      } catch (error) {
        // If date parsing fails, keep the default date
      }
    }
  }, [profileData.date_of_birth]);

  // Animate checkmark when success screen shows
  useEffect(() => {
    if (showSuccessScreen) {
      // Reset animation values
      checkmarkScale.setValue(0);
      checkmarkOpacity.setValue(0);
      checkmarkRotation.setValue(0);
      contentSlide.setValue(50);
      contentOpacity.setValue(0);

      // Start animation sequence
      Animated.parallel([
        Animated.timing(checkmarkScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(checkmarkOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(contentSlide, {
          toValue: 0,
          duration: 500,
          delay: 100, // Delay the slide animation
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 500,
          delay: 100, // Delay the fade animation
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Add a subtle bounce effect after the main animation
        Animated.sequence([
          Animated.timing(checkmarkScale, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(checkmarkScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        // Start continuous subtle pulse animation
        const pulseAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(checkmarkScale, {
              toValue: 1.05,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(checkmarkScale, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        );
        pulseAnimation.start();
      });
    }
  }, [showSuccessScreen, checkmarkScale, checkmarkOpacity, checkmarkRotation, contentSlide, contentOpacity]);

  const fetchMasterData = async () => {
    try {
      // Skip the /master-data/all endpoint and go directly to individual endpoints
      // since it doesn't exist on the live server yet
      await fetchMasterDataFallback();
    } catch (error) {
      // Fallback to individual endpoints
      await fetchMasterDataFallback();
    }
  };


  const fetchMasterDataFallback = async () => {
    try {
      // Fetch real data from API - no fallback data

      // Try to fetch real data with individual requests and better error handling
      const fetchWithTimeout = async (url: string, timeout = 5000) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          return null; // Return null for failed requests
        }
      };

      const [gendersRes, maritalStatusesRes, countriesRes, jobExperiencesRes, careerLevelsRes, industriesRes, functionalAreasRes] = await Promise.all([
        fetchWithTimeout(buildApiUrl('/master-data/genders')),
        fetchWithTimeout(buildApiUrl('/master-data/marital-statuses')),
        fetchWithTimeout(buildApiUrl('/master-data/countries')),
        fetchWithTimeout(buildApiUrl('/master-data/job-experiences')),
        fetchWithTimeout(buildApiUrl('/master-data/career-levels')),
        fetchWithTimeout(buildApiUrl('/master-data/industries')),
        fetchWithTimeout(buildApiUrl('/master-data/functional-areas'))
      ]);

      if (gendersRes && gendersRes.ok) {
        const gendersData = await gendersRes.json();
        if (gendersData.data && Array.isArray(gendersData.data)) {
          const englishGenders = gendersData.data.filter((item: any) => {
            const genderText = item.gender || item.name || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            return (genderText === '' || /^[a-zA-Z\s\-\.]+$/.test(genderText)) && isEnglish && isActive;
          });
          const mappedGenders = englishGenders.map((item: any) => ({
            id: item.id,
            name: item.gender || item.name || t('unknown')
          }));
          setGenders(mappedGenders);
        }
      }

      if (maritalStatusesRes && maritalStatusesRes.ok) {
        const maritalStatusesData = await maritalStatusesRes.json();
        if (maritalStatusesData.data && Array.isArray(maritalStatusesData.data)) {
          const englishMaritalStatuses = maritalStatusesData.data.filter((item: any) => {
            const statusText = item.marital_status || item.name || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            return (statusText === '' || /^[a-zA-Z\s\-\.]+$/.test(statusText)) && isEnglish && isActive;
          });
          const mappedMaritalStatuses = englishMaritalStatuses.map((item: any) => ({
            id: item.id,
            name: item.marital_status || item.name || t('unknown')
          }));
          setMaritalStatuses(mappedMaritalStatuses);
        }
      }

      if (countriesRes && countriesRes.ok) {
        const countriesData = await countriesRes.json();
        if (countriesData.data && Array.isArray(countriesData.data)) {
          const englishCountries = countriesData.data.filter((item: any) => {
            const countryText = item.country || item.name || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            return (countryText === '' || /^[a-zA-Z\s\-\.]+$/.test(countryText)) && isEnglish && isActive;
          });
          const mappedCountries = englishCountries.map((item: any) => ({
            id: item.id,
            name: item.country || item.name || t('unknown')
          }));
          setCountries(mappedCountries);

          // Extract nationalities from countries table
          const nationalitiesData = countriesData.data.filter((item: any) => {
            const nationalityText = item.nationality || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            const hasNationality = nationalityText && nationalityText.trim() !== '';
            return hasNationality && isEnglish && isActive && /^[a-zA-Z\s\-\.]+$/.test(nationalityText);
          });

          let finalNationalities: MasterData[];
          if (nationalitiesData.length > 0) {
            finalNationalities = nationalitiesData.map((item: any) => ({
              id: item.id,
              name: item.nationality || t('unknown')
            }));
          } else {
            // Use countries as nationalities with offset IDs
            finalNationalities = englishCountries.map((item: any) => ({
              id: item.id + 100000,
              name: item.nationality || item.country || item.name || t('unknown')
            }));
          }
          setNationalities(finalNationalities);
        }
      }

      if (jobExperiencesRes && jobExperiencesRes.ok) {
        const jobExpData = await jobExperiencesRes.json();
        if (jobExpData.data && Array.isArray(jobExpData.data)) {
          const englishJobExperiences = jobExpData.data.filter((item: any) => {
            const expText = item.job_experience || item.name || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            const regexMatch = /^[a-zA-Z0-9\s\-\.]+$/.test(expText);
            const passesFilter = (expText === '' || regexMatch) && isEnglish && isActive;
            return passesFilter;
          });

          const mappedJobExperiences = englishJobExperiences.map((item: any) => ({
            id: item.id,
            name: item.job_experience || item.name || t('unknown')
          }));

          setJobExperiences(mappedJobExperiences);
        }
      }

      if (careerLevelsRes && careerLevelsRes.ok) {
        const careerData = await careerLevelsRes.json();
        if (careerData.data && Array.isArray(careerData.data)) {
          const englishCareerLevels = careerData.data.filter((item: any) => {
            const levelText = item.career_level || item.name || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            return (levelText === '' || /^[a-zA-Z\s\-\.]+$/.test(levelText)) && isEnglish && isActive;
          });
          const mappedCareerLevels = englishCareerLevels.map((item: any) => ({
            id: item.id,
            name: item.career_level || item.name || t('unknown')
          }));
          setCareerLevels(mappedCareerLevels);
        }
      }

      if (industriesRes && industriesRes.ok) {
        const industriesData = await industriesRes.json();
        if (industriesData.data && Array.isArray(industriesData.data)) {
          const englishIndustries = industriesData.data.filter((item: any) => {
            const industryText = item.industry || item.name || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            return (industryText === '' || /^[a-zA-Z\s\-\.]+$/.test(industryText)) && isEnglish && isActive;
          });
          const mappedIndustries = englishIndustries.map((item: any) => ({
            id: item.id,
            name: item.industry || item.name || t('unknown')
          }));
          setIndustries(mappedIndustries);
        }
      }

      if (functionalAreasRes && functionalAreasRes.ok) {
        const functionalAreasData = await functionalAreasRes.json();
        if (functionalAreasData.data && Array.isArray(functionalAreasData.data)) {
          const englishFunctionalAreas = functionalAreasData.data.filter((item: any) => {
            const areaText = item.functional_area || item.name || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            return (areaText === '' || /^[a-zA-Z\s\-\.]+$/.test(areaText)) && isEnglish && isActive;
          });
          const mappedFunctionalAreas = englishFunctionalAreas.map((item: any) => ({
            id: item.id,
            name: item.functional_area || item.name || t('unknown')
          }));
          setFunctionalAreas(mappedFunctionalAreas);
        }
      }
    } catch (error) {
    }
  };

  const fetchUserProfile = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');

      if (!authToken) {
        return;
      }

      const response = await fetch(buildApiUrl('/my-profile'), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.data) {
          const userData = data.data;
          const mappedProfileData: UserProfile = {
            id: userData.id || 0,
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            mobile_num: userData.mobile_num || '',
            gender_id: parseInt(userData.gender_id) || 0,
            marital_status_id: parseInt(userData.marital_status_id) || 0,
            country_id: parseInt(userData.country_id) || 0,
            state_id: parseInt(userData.state_id) || 0,
            city_id: parseInt(userData.city_id) || 0,
            nationality_id: parseInt(userData.nationality_id) || 0,
            date_of_birth: userData.date_of_birth || '',
            street_address: userData.street_address || '',
            video_link: userData.video_link || '',
            job_experience_id: parseInt(userData.job_experience_id) || 0,
            career_level_id: parseInt(userData.career_level_id) || 0,
            industry_id: parseInt(userData.industry_id) || 0,
            functional_area_id: parseInt(userData.functional_area_id) || 0,
            current_salary: userData.current_salary || '',
            expected_salary: userData.expected_salary || '',
            salary_currency: userData.salary_currency || '',
            image: userData.image || '',
            cover_image: userData.cover_image || '',
          };

          setProfileData(mappedProfileData);

          if (mappedProfileData.country_id) {
            await fetchStates(mappedProfileData.country_id);
          }
          if (mappedProfileData.state_id) {
            await fetchCities(mappedProfileData.state_id);
          }
        }
      } else {
        const errorText = await response.text();
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchStates = async (countryId: number) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(buildApiUrl(`/master-data/states/${countryId}`), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const statesData = await response.json();
        const allStates = statesData.data || statesData || [];
        // Filter to show only English entries
        const englishStates = allStates.filter((item: any) => {
          const stateText = item.state || item.name || '';
          const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
          const isActive = item.is_active === 1 || item.is_active === undefined;
          return (stateText === '' || /^[a-zA-Z\s\-\.]+$/.test(stateText)) && isEnglish && isActive;
        });
        const mappedStates = englishStates.map((item: any) => ({
          id: item.id,
          name: item.state || item.name || t('unknown')
        }));
        setStates(mappedStates);
      } else {
        // Clear states if API fails
        setStates([]);
      }
    } catch (error) {
      // Clear states on error
      setStates([]);
    }
  };

  const fetchCities = async (stateId: number) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(buildApiUrl(`/master-data/cities/${stateId}`), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const citiesData = await response.json();
        const allCities = citiesData.data || citiesData || [];
        // Filter to show only English entries
        const englishCities = allCities.filter((item: any) => {
          const cityText = item.city || item.name || '';
          const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
          const isActive = item.is_active === 1 || item.is_active === undefined;
          return (cityText === '' || /^[a-zA-Z\s\-\.]+$/.test(cityText)) && isEnglish && isActive;
        });
        const mappedCities = englishCities.map((item: any) => ({
          id: item.id,
          name: item.city || item.name || t('unknown')
        }));
        setCities(mappedCities);
      } else {
        // Clear cities if API fails
        setCities([]);
      }
    } catch (error) {
      // Clear cities on error
      setCities([]);
    }
  };

  const updateProfileData = (field: keyof UserProfile, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field when user updates it
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleProfilePhotoUpload = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile photo
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];

        // Check file size (backend limit is 2MB)
        if (selectedImage.fileSize && selectedImage.fileSize > 2 * 1024 * 1024) {
          Alert.alert(t('file_too_large'), t('image_size_limit'));
          return;
        }

        // Show loading state
        setUploadingProfileImage(true);

        // Immediately show the selected image preview
        const tempImageUri = selectedImage.uri;
        setTempProfileImage(tempImageUri);

        try {
          // Get auth token
          const authToken = await AsyncStorage.getItem('authToken');
          if (!authToken) {
            Alert.alert(t('error'), t('sign_in_update_profile'));
            setUploadingProfileImage(false);
            return;
          }

          // Try base64 approach instead of FormData
          // Read the image as base64
          const response = await fetch(selectedImage.uri);
          const blob = await response.blob();
          const reader = new FileReader();

          const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const base64 = await base64Promise;


          // Upload profile image using base64
          const uploadResponse = await fetch(buildApiUrl('/upload/profile-image'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64.toString(),
              name: 'Profile Photo'
            }),
          });


          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            if (uploadData.data && uploadData.data.filename) {
              // Store only the filename in the database (backend expects this)
              updateProfileData('image', uploadData.data.filename);
              Alert.alert(t('success'), t('profile_photo_uploaded'));
            } else {
              Alert.alert(t('error'), t('failed_get_image_data'));
            }
          } else {
            // Better error handling to debug the 500 error
            const errorText = await uploadResponse.text();

            // Handle different error statuses
            if (uploadResponse.status === 422) {
              // Validation error
              try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.errors && errorJson.errors.image) {
                  Alert.alert('Validation Error', `Image validation failed: ${errorJson.errors.image.join(', ')}`);
                } else if (errorJson.message) {
                  Alert.alert('Validation Error', errorJson.message);
                } else {
                  Alert.alert('Validation Error', 'Image validation failed. Please check file size (max 2MB) and format (JPEG, PNG, JPG, GIF).');
                }
              } catch (parseError) {
                Alert.alert('Validation Error', 'Image validation failed. Please check file size (max 2MB) and format (JPEG, PNG, JPG, GIF).');
              }
            } else if (uploadResponse.status === 500) {
              // Server error
              try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.message) {
                  Alert.alert('Server Error', `Upload failed: ${errorJson.message}`);
                } else {
                  Alert.alert('Server Error', 'Upload failed due to server error. Please try again later.');
                }
              } catch (parseError) {
                Alert.alert('Server Error', `Upload failed: ${errorText}`);
              }
            } else {
              // Other errors
              Alert.alert('Upload Failed', `Failed to upload profile photo: ${uploadResponse.status}\n\nError details: ${errorText}`);
            }
          }
        } catch (uploadError) {
          // Clear temporary image preview on error
          setTempProfileImage(null);
          Alert.alert(t('error'), t('failed_upload_profile_photo'));
        } finally {
          setUploadingProfileImage(false);
        }
      } else {
        // User cancelled the image picker, clear any temporary image
        setTempProfileImage(null);
      }
    } catch (error) {
      Alert.alert(t('error'), t('failed_select_image'));
    }
  };

  const handleCoverPhotoUpload = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Cover photo aspect ratio
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];

        // Check file size (backend limit is 2MB)
        if (selectedImage.fileSize && selectedImage.fileSize > 2 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Image file size must be less than 2MB. Please select a smaller image.');
          return;
        }

        // Show loading state
        setUploadingCoverImage(true);

        // Immediately show the selected image preview
        const tempImageUri = selectedImage.uri;
        setTempCoverImage(tempImageUri);

        try {
          // Get auth token
          const authToken = await AsyncStorage.getItem('authToken');
          if (!authToken) {
            Alert.alert(t('error'), t('sign_in_update_profile'));
            setUploadingCoverImage(false);
            return;
          }

          // Use the same profile image upload endpoint for cover images
          // The backend will handle the different field name
          const formData = new FormData();

          // For React Native, we need to use a different approach
          // The file object structure is different from web FormData
          formData.append('image', {
            uri: selectedImage.uri,
            type: 'image/jpeg', // Laravel expects standard MIME types
            name: 'cover.jpg'
          } as any);

          formData.append('name', 'Cover Photo'); // Backend expects this field
          formData.append('type', 'cover'); // Add type to distinguish from profile image

          // Debug: Log FormData contents

          // Upload cover image using the profile image upload endpoint
          const uploadResponse = await fetch(buildApiUrl('/upload/profile-image'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Accept': 'application/json',
              // Remove Content-Type header - let the browser set it automatically for FormData
            },
            body: formData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            if (uploadData.data && uploadData.data.filename) {
              // Store only the filename in the database (backend expects this)
              updateProfileData('cover_image', uploadData.data.filename);
              Alert.alert(t('success'), t('cover_photo_uploaded'));
            } else {
              Alert.alert(t('error'), t('failed_get_cover_data'));
            }
          } else {
            // Better error handling to debug the 500 error
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
          }
        } catch (uploadError) {
          // Clear temporary image preview on error
          setTempCoverImage(null);
          Alert.alert(t('error'), t('failed_upload_cover_photo'));
        } finally {
          setUploadingCoverImage(false);
        }
      } else {
        // User cancelled the image picker, clear any temporary image
        setTempCoverImage(null);
      }
    } catch (error) {
      Alert.alert(t('error'), t('failed_select_cover'));
    }
  };

  const handleCountryChange = (countryId: number) => {
    updateProfileData('country_id', countryId);
    updateProfileData('state_id', 0);
    updateProfileData('city_id', 0);
    setStates([]);
    setCities([]);
    if (countryId > 0) {
      fetchStates(countryId);
    }
  };

  const handleStateChange = (stateId: number) => {
    updateProfileData('state_id', stateId);
    updateProfileData('city_id', 0);
    setCities([]);
    if (stateId > 0) {
      fetchCities(stateId);
    }
  };

  const handleSubmit = async () => {
    try {
      // Track validation errors for UI highlighting
      const validationErrors: { [key: string]: boolean } = {};

      // Basic validation
      if (!profileData.first_name.trim()) {
        validationErrors.first_name = true;
        Alert.alert(t('validation_error'), t('first_name_required'));
        return;
      }
      if (!profileData.last_name.trim()) {
        validationErrors.last_name = true;
        Alert.alert(t('validation_error'), t('last_name_required'));
        return;
      }
      if (!profileData.phone.trim()) {
        validationErrors.phone = true;
        Alert.alert(t('validation_error'), t('phone_required'));
        return;
      }
      if (!profileData.street_address.trim()) {
        validationErrors.street_address = true;
        Alert.alert(t('validation_error'), t('street_address_required'));
        return;
      }
      if (!profileData.date_of_birth.trim()) {
        validationErrors.date_of_birth = true;
        Alert.alert(t('validation_error'), t('dob_required'));
        return;
      }
      if (profileData.gender_id === 0) {
        validationErrors.gender_id = true;
        Alert.alert(t('validation_error'), t('gender_required'));
        return;
      }
      if (profileData.marital_status_id === 0) {
        validationErrors.marital_status_id = true;
        Alert.alert(t('validation_error'), t('marital_status_required'));
        return;
      }
      if (profileData.country_id === 0) {
        validationErrors.country_id = true;
        Alert.alert(t('validation_error'), t('country_required'));
        return;
      }
      if (profileData.state_id === 0) {
        validationErrors.state_id = true;
        Alert.alert(t('validation_error'), t('state_required'));
        return;
      }
      if (profileData.city_id === 0) {
        validationErrors.city_id = true;
        Alert.alert(t('validation_error'), t('city_required'));
        return;
      }
      if (profileData.nationality_id === 0) {
        validationErrors.nationality_id = true;
        Alert.alert(t('validation_error'), t('nationality_required'));
        return;
      }
      if (profileData.job_experience_id === 0) {
        validationErrors.job_experience_id = true;
        Alert.alert(t('validation_error'), t('job_experience_required'));
        return;
      }
      if (profileData.career_level_id === 0) {
        validationErrors.career_level_id = true;
        Alert.alert(t('validation_error'), t('career_level_required'));
        return;
      }
      if (profileData.industry_id === 0) {
        validationErrors.industry_id = true;
        Alert.alert(t('validation_error'), t('industry_required'));
        return;
      }
      if (profileData.functional_area_id === 0) {
        validationErrors.functional_area_id = true;
        Alert.alert(t('validation_error'), t('functional_area_required'));
        return;
      }
      if (!profileData.current_salary.trim()) {
        validationErrors.current_salary = true;
        Alert.alert(t('validation_error'), t('current_salary_required'));
        return;
      }
      if (!profileData.expected_salary.trim()) {
        validationErrors.expected_salary = true;
        Alert.alert(t('validation_error'), t('expected_salary_required'));
        return;
      }

      setSaving(true);
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert(t('error'), t('sign_in_update_profile'));
        return;
      }

      // Prepare data for submission - exclude image fields since they're handled separately
      const submitData: any = { ...profileData };

      // Always remove image fields from profile update since they're handled by separate upload endpoints
      delete submitData.image;
      delete submitData.cover_image;

      // Also remove any fields that might be causing validation issues
      if (submitData.salary_currency === '') {
        delete submitData.salary_currency;
      }

      // Remove any undefined or null values
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === undefined || submitData[key] === null) {
          delete submitData[key];
        }
      });

      const response = await fetch(buildApiUrl('/my-profile'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        // Now handle image uploads if we have new images
        if (tempProfileImage) {
          await uploadProfileImage(tempProfileImage, authToken);
        }

        if (tempCoverImage) {
          await uploadCoverImage(tempCoverImage, authToken);
        }

        // Clear temporary images when profile is successfully updated
        clearTempImages();
        setShowSuccessScreen(true);
      } else {
        const errorData = await response.text();

        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.errors) {
            // Show specific validation errors
            const errorMessages = Object.entries(errorJson.errors)
              .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
              .join('\n');
            Alert.alert(t('validation_error'), `${t('fix_errors')}\n\n${errorMessages}`);
          } else if (errorJson.message) {
            Alert.alert(t('error'), errorJson.message);
          } else {
            Alert.alert(t('error'), `Failed to update profile. Status: ${response.status}`);
          }
        } catch (parseError) {
          // If error response is not JSON, show the raw text
          Alert.alert('Error', `Failed to update profile. Status: ${response.status}\n\n${errorData}`);
        }
      }
    } catch (error) {
      Alert.alert(t('error'), t('failed_update_profile'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title={t('edit_profile')} subtitle={t('update_personal_info')} onMenuPress={onMenuPress} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>{t('loading_profile_data')}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Header
        title={t('edit_profile')}
        subtitle={t('update_personal_info')}
        onMenuPress={() => setSidebarVisible(true)}
        onBack={onBack}
        showBack={!!onBack}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <View style={styles.profileImageContainer}>
            {getProfileImageUri() ? (
              <Image
                source={{ uri: getProfileImageUri() }}
                style={styles.profileImage}
                defaultSource={require('../../assets/company-placeholder.png')}
                onError={() => {
                  // Clear temporary image if server image fails to load
                  setTimeout(() => setTempProfileImage(null), 1000);
                }}
                onLoad={() => {
                  // Clear temporary image once server image loads successfully
                  setTempProfileImage(null);
                }}
              />
            ) : (
              <Image
                source={require('../../assets/company-placeholder.png')}
                style={styles.profileImage}
              />
            )}
          </View>

          <TouchableOpacity
            style={styles.changePhotoButton}
            onPress={handleProfilePhotoUpload}
            disabled={uploadingProfileImage}
          >
            {uploadingProfileImage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.changePhotoButtonText}>{t('change_photo')}</Text>
            )}
          </TouchableOpacity>
          {uploadingProfileImage && (
            <Text style={styles.uploadStatusText}>{t('uploading_profile_photo')}</Text>
          )}

        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('personal_information')}</Text>

          {/* Cover Photo Section */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('cover_photo')}</Text>
            <View style={styles.coverPhotoContainer}>
              {getCoverImageUri() ? (
                <Image
                  source={{ uri: getCoverImageUri() }}
                  style={styles.coverImage}
                  defaultSource={require('../../assets/company-placeholder.png')}
                  onError={() => {
                    // Clear temporary image if server image fails to load
                    setTimeout(() => setTempCoverImage(null), 1000);
                  }}
                  onLoad={() => {
                    // Clear temporary image once server image loads successfully
                    setTempCoverImage(null);
                  }}
                />
              ) : (
                <View style={styles.coverPhotoPlaceholder}>
                  <MaterialIcons name="photo-library" size={40} color="#ccc" />
                  <Text style={styles.coverPhotoPlaceholderText}>{t('no_cover_photo')}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.changeCoverPhotoButton}
                onPress={handleCoverPhotoUpload}
                disabled={uploadingCoverImage}
              >
                {uploadingCoverImage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.changeCoverPhotoButtonText}>{t('change_cover_photo')}</Text>
                )}
              </TouchableOpacity>
            </View>

            {uploadingCoverImage && (
              <Text style={styles.uploadStatusText}>{t('uploading_cover_photo')}</Text>
            )}
          </View>


          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('first_name')} <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={[styles.textInput, validationErrors.first_name && styles.textInputError]}
              value={profileData.first_name || ''}
              onChangeText={(value) => updateProfileData('first_name', value)}
              placeholder={t('enter_first_name')}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('last_name')} <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={[styles.textInput, validationErrors.last_name && styles.textInputError]}
              value={profileData.last_name || ''}
              onChangeText={(value) => updateProfileData('last_name', value)}
              placeholder={t('enter_last_name')}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('email')} <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={styles.textInput}
              value={profileData.email || ''}
              onChangeText={(value) => updateProfileData('email', value)}
              placeholder={t('enter_email')}
              keyboardType="email-address"
              editable={false}
            />
            <Text style={styles.helpText}>{t('email_cannot_change')}</Text>
          </View>

          <SearchablePicker
            label={t('gender') + " *"}
            value={profileData.gender_id || 0}
            onValueChange={(value: number) => updateProfileData('gender_id', value)}
            data={genders}
            placeholder={t('select_gender')}
            hasError={validationErrors.gender_id}
          />

          <SearchablePicker
            label={t('marital_status') + " *"}
            value={profileData.marital_status_id || 0}
            onValueChange={(value: number) => updateProfileData('marital_status_id', value)}
            data={maritalStatuses}
            placeholder={t('select_marital_status')}
            hasError={validationErrors.marital_status_id}
          />

          <SearchablePicker
            label={t('country') + " *"}
            value={profileData.country_id || 0}
            onValueChange={handleCountryChange}
            data={countries}
            placeholder={t('select_country')}
            hasError={validationErrors.country_id}
          />

          <SearchablePicker
            label={t('state') + " *"}
            value={profileData.state_id || 0}
            onValueChange={handleStateChange}
            data={states}
            placeholder={t('select_state')}
            enabled={profileData.country_id > 0}
            hasError={validationErrors.state_id}
          />

          <SearchablePicker
            label={t('city') + " *"}
            value={profileData.city_id || 0}
            onValueChange={(value: number) => updateProfileData('city_id', value)}
            data={cities}
            placeholder={t('select_city')}
            enabled={profileData.state_id > 0}
            hasError={validationErrors.city_id}
          />

          <SearchablePicker
            label={t('nationality') + " *"}
            value={profileData.nationality_id || 0}
            onValueChange={(value: number) => updateProfileData('nationality_id', value)}
            data={nationalities}
            placeholder={t('select_nationality')}
            hasError={validationErrors.nationality_id}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('date_of_birth')} <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TouchableOpacity
              style={[styles.pickerContainer, validationErrors.date_of_birth && styles.pickerError]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.pickerText, !profileData.date_of_birth && styles.placeholderText, validationErrors.date_of_birth && styles.textInputError]}>
                {profileData.date_of_birth || t('select_date_of_birth')}
              </Text>
              <MaterialIcons name="event" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Date Picker Modal */}
          {showDatePicker && (
            Platform.OS === 'ios' ? (
              <Modal
                animationType="slide"
                transparent={true}
                visible={showDatePicker}
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.datePickerModalContent}>
                    <View style={styles.datePickerHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.datePickerCancelText}>{t('cancel')}</Text>
                      </TouchableOpacity>
                      <Text style={styles.datePickerTitle}>{t('select_date_of_birth')}</Text>
                      <TouchableOpacity onPress={() => {
                        const formattedDate = selectedDate.toISOString().split('T')[0];
                        updateProfileData('date_of_birth', formattedDate);
                        setShowDatePicker(false);
                      }}>
                        <Text style={styles.datePickerDoneText}>{t('done')}</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      onChange={(event, date) => {
                        if (date) {
                          setSelectedDate(date);
                        }
                      }}
                      maximumDate={new Date()}
                      minimumDate={new Date(1940, 0, 1)}
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (event.type === 'set' && date) {
                    setSelectedDate(date);
                    const formattedDate = date.toISOString().split('T')[0];
                    updateProfileData('date_of_birth', formattedDate);
                  }
                }}
                maximumDate={new Date()}
                minimumDate={new Date(1940, 0, 1)}
              />
            )
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('phone')} <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={[styles.textInput, validationErrors.phone && styles.textInputError]}
              value={profileData.phone || ''}
              onChangeText={(value) => updateProfileData('phone', value)}
              placeholder={t('enter_phone')}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('mobile')}</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.mobile_num || ''}
              onChangeText={(value) => updateProfileData('mobile_num', value)}
              placeholder={t('enter_mobile')}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('street_address')} <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={[styles.textInput, validationErrors.street_address && styles.textInputError]}
              value={profileData.street_address || ''}
              onChangeText={(value) => updateProfileData('street_address', value)}
              placeholder={t('enter_street_address')}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Video Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('add_video_profile')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('video_link')}</Text>
            <TextInput
              style={styles.textInput}
              value={profileData.video_link || ''}
              onChangeText={(value) => updateProfileData('video_link', value)}
              placeholder="https://www.youtube.com/embed/VIDEO_ID"
            />
            <Text style={styles.helpText}>{t('video_link_help')}</Text>
          </View>
        </View>

        {/* Career Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('career_information')}</Text>

          <View style={styles.inputGroup}>
            <SearchablePicker
              label={t('job_experience') + " *"}
              value={profileData.job_experience_id || 0}
              onValueChange={(value: number) => updateProfileData('job_experience_id', value)}
              data={jobExperiences}
              placeholder={t('select_job_experience')}
              hasError={validationErrors.job_experience_id}
            />
          </View>

          <View style={styles.inputGroup}>
            <SearchablePicker
              label={t('career_level') + " *"}
              value={profileData.career_level_id || 0}
              onValueChange={(value: number) => updateProfileData('career_level_id', value)}
              data={careerLevels}
              placeholder={t('select_career_level')}
              hasError={validationErrors.career_level_id}
            />
          </View>

          <View style={styles.inputGroup}>
            <SearchablePicker
              label={t('industry')}
              value={profileData.industry_id || 0}
              onValueChange={(value: number) => updateProfileData('industry_id', value)}
              data={industries}
              placeholder={t('select_industry')}
              hasError={validationErrors.industry_id}
            />
          </View>

          <View style={styles.inputGroup}>
            <SearchablePicker
              label={t('functional_area') + " *"}
              value={profileData.functional_area_id || 0}
              onValueChange={(value: number) => updateProfileData('functional_area_id', value)}
              data={functionalAreas}
              placeholder={t('select_functional_area')}
              hasError={validationErrors.functional_area_id}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('salary_currency')}</Text>
            <TextInput
              style={[styles.textInput, styles.disabledInput]}
              value={profileData.salary_currency || 'USD'}
              onChangeText={(value) => updateProfileData('salary_currency', value)}
              placeholder="USD, EUR, etc."
              editable={false}
            />
            <Text style={styles.helpText}>{t('default_currency')}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('current_salary')} *</Text>
            <TextInput
              style={[styles.textInput, validationErrors.current_salary && styles.textInputError]}
              value={profileData.current_salary || ''}
              onChangeText={(value) => updateProfileData('current_salary', value)}
              placeholder={t('enter_current_salary')}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('expected_salary')} *</Text>
            <TextInput
              style={[styles.textInput, validationErrors.expected_salary && styles.textInputError]}
              value={profileData.expected_salary || ''}
              onChangeText={(value) => updateProfileData('expected_salary', value)}
              placeholder={t('enter_expected_salary')}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Update Profile Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.updateButton, saving && styles.updateButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color="#fff" />
                <Text style={styles.updateButtonText}>{t('update_profile_button')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>


      </ScrollView>

      {/* Success Screen */}
      {showSuccessScreen && (
        <Animated.View
          style={[
            styles.successScreen,
            {
              opacity: contentOpacity,
              transform: [
                { translateY: contentSlide },
              ],
            },
          ]}
        >
          <View style={styles.successContent}>
            {/* Animated Checkmark Icon */}
            <View style={styles.checkmarkContainer}>
              <Animated.View
                style={[
                  styles.checkmarkCircle,
                  {
                    transform: [
                      { scale: checkmarkScale },
                      {
                        rotate: checkmarkRotation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '5deg']
                        })
                      }
                    ],
                    opacity: checkmarkOpacity,
                  }
                ]}
              >
                <Text style={styles.checkmarkIcon}>✓</Text>
              </Animated.View>
            </View>

            {/* Success Text */}
            <Text style={styles.successTitle}>{t('profile_updated')}</Text>
            <Text style={styles.successSubtitle}>{t('profile_updated_success')}</Text>
            <Text style={styles.successMessage}>{t('profile_updated_message')}</Text>

            {/* Action Buttons */}
            <View style={styles.successButtons}>
              <TouchableOpacity
                style={styles.backHomeButton}
                onPress={() => {
                  setShowSuccessScreen(false);
                  // Navigate back to dashboard
                  if (onBack) {
                    onBack();
                  } else if (navigation && navigation.navigate) {
                    navigation.navigate('Dashboard');
                  }
                }}
              >
                <Text style={styles.backHomeButtonText}>{t('back_to_dashboard')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.searchJobsButton}
                onPress={() => {
                  setShowSuccessScreen(false);
                  // Navigate to job search
                  if (navigation && navigation.navigate) {
                    navigation.navigate('JobList');
                  }
                }}
              >
                <Text style={styles.searchJobsButtonText}>{t('search_jobs')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

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
            onLogout: onLogout || onBack
          });

          if (!success) {
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
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  profileImageContainer: {
    alignItems: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#17D27C',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17D27C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  changePhotoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  uploadStatusText: {
    marginTop: 10,
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 30,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 0,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 20,
  },
  requiredAsterisk: {
    color: '#ff0000',
    fontWeight: 'bold',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 0,
    marginBottom: 50,
    alignItems: 'center',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  updateButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  coverPhotoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  coverImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  coverPhotoPlaceholderText: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
  },
  changeCoverPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17D27C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  changeCoverPhotoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '90%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  searchInput: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    fontSize: 16,
    color: '#333',
  },
  optionsList: {
    maxHeight: 200,
  },
  optionItem: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOption: {
    backgroundColor: '#f0f0f0',
  },
  selectedOptionText: {
    fontWeight: '600',
    color: '#6366f1',
  },
  pickerDisabled: {
    opacity: 0.7,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  textInputError: {
    borderColor: '#ff6b6b',
    borderWidth: 2,
  },
  pickerError: {
    borderColor: '#ff6b6b',
    borderWidth: 2,
  },
  datePickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  datePickerCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  datePickerDoneText: {
    fontSize: 16,
    color: '#17D27C',
    fontWeight: '600',
  },
  successScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '85%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
  },
  checkmarkContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#17D27C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#17D27C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  checkmarkCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkmarkIcon: {
    fontSize: 55,
    color: '#17D27C',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#17D27C',
    marginBottom: 15,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 35,
    lineHeight: 22,
  },
  successButtons: {
    width: '100%',
    gap: 15,
  },
  backHomeButton: {
    backgroundColor: '#5D2DF9',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#5D2DF9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backHomeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchJobsButton: {
    backgroundColor: '#17D27C',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#17D27C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  searchJobsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default EditProfile;
