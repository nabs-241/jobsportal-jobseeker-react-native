import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getUserId, getAuthToken } from '../../../utils/userHelper';
import apiService from '../../../services/apiService';

function parseYmd(dateStr: string): Date {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type ExperienceLayer =
  | null
  | 'country'
  | 'state'
  | 'city'
  | 'dateStart'
  | 'dateEnd';

const EXPERIENCE_LAYER_TITLES: Record<Exclude<ExperienceLayer, null>, string> = {
  country: 'Select Country',
  state: 'Select State',
  city: 'Select City',
  dateStart: 'Start date',
  dateEnd: 'End date',
};

interface ExperienceSectionProps {
  onBack: () => void;
}

interface Experience {
  id: number;
  title: string;
  company: string;
  description: string;
  date_start: string;
  date_end: string;
  is_currently_working: boolean;
  country_id: number;
  state_id: number;
  city_id: number;
  city_name: string;
  state_name: string;
  country_name: string;
  location: string;
  date_start_formatted: string;
  date_end_formatted: string;
}


const ExperienceSection: React.FC<ExperienceSectionProps> = ({ onBack }) => {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [countries, setCountries] = useState<{id: number, name: string}[]>([]);
  const [states, setStates] = useState<{id: number, name: string}[]>([]);
  const [cities, setCities] = useState<{id: number, name: string}[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  /** Single overlay inside the form modal (location + date pickers). */
  const [experienceLayer, setExperienceLayer] = useState<ExperienceLayer>(null);
  const [tempDate, setTempDate] = useState(new Date());

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    description: '',
    date_start: '',
    date_end: '',
    is_currently_working: false,
    country_id: 0,
    state_id: 0,
    city_id: 0,
  });

  useEffect(() => {
    fetchExperiences();
    fetchLocationOptions();
  }, []);

  const fetchExperiences = async () => {
    try {
      setLoading(true);
      const userId = await getUserId();
      const token = await getAuthToken();
      
      if (!userId || !token) {
        Alert.alert('Error', 'Please login to view your experience');
        return;
      }

      const response = await apiService.post(`/show-front-profile-experience/${userId}`, {}, token);
      
      if (response.success && response.data) {
        setExperiences(response.data as Experience[]);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch experience');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch experience. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationOptions = async () => {
    try {
      setLoadingOptions(true);
      const response = await apiService.get('/master-data/countries');
      
      if (response.success && response.data) {
        setCountries(response.data as {id: number, name: string}[]);
      }
    } catch (error) {
      // Error fetching location options
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchStates = async (countryId: number) => {
    try {
      const response = await apiService.get(`/master-data/states?country_id=${countryId}`);
      if (response.success && response.data) {
        setStates(response.data as {id: number, name: string}[]);
      }
    } catch (error) {
      // Error fetching states
    }
  };

  const fetchCities = async (stateId: number) => {
    try {
      const response = await apiService.get(`/master-data/cities?state_id=${stateId}`);
      if (response.success && response.data) {
        setCities(response.data as {id: number, name: string}[]);
      }
    } catch (error) {
      // Error fetching cities
    }
  };

  const handleAddExperience = () => {
    setEditingExperience(null);
    setFormData({
      title: '',
      company: '',
      description: '',
      date_start: '',
      date_end: '',
      is_currently_working: false,
      country_id: 0,
      state_id: 0,
      city_id: 0,
    });
    setExperienceLayer(null);
    setShowAddForm(true);
  };

  const handleEditExperience = (experience: Experience) => {
    setEditingExperience(experience);
    setFormData({
      title: experience.title || '',
      company: experience.company || '',
      description: experience.description || '',
      date_start: experience.date_start || '',
      date_end: experience.date_end || '',
      is_currently_working: experience.is_currently_working || false,
      country_id: experience.country_id || 0,
      state_id: experience.state_id || 0,
      city_id: experience.city_id || 0,
    });
    
    // Load states and cities for existing experience
    if (experience.country_id) {
      fetchStates(experience.country_id);
    }
    if (experience.state_id) {
      fetchCities(experience.state_id);
    }
    
    setExperienceLayer(null);
    setShowAddForm(true);
  };

  const handleSaveExperience = async () => {
    try {
      const userId = await getUserId();
      const token = await getAuthToken();
      
      if (!userId || !token) {
        Alert.alert('Error', 'Please login to save experience');
        return;
      }

      if (!formData.title.trim()) {
        Alert.alert('Error', 'Please enter a job title');
        return;
      }

      if (!formData.company.trim()) {
        Alert.alert('Error', 'Please enter a company name');
        return;
      }

      if (!formData.date_start.trim()) {
        Alert.alert('Error', 'Please enter a start date');
        return;
      }

      if (!formData.is_currently_working && !formData.date_end.trim()) {
        Alert.alert('Error', 'Please enter an end date or mark as currently working');
        return;
      }

      let response;
      if (editingExperience) {
        response = await apiService.put(`/update-front-profile-experience/${editingExperience.id}/${userId}`, formData, token);
      } else {
        response = await apiService.post(`/store-front-profile-experience/${userId}`, formData, token);
      }
      
      if (response.success) {
        Alert.alert('Success', editingExperience ? 'Experience updated successfully' : 'Experience added successfully');
        setShowAddForm(false);
        fetchExperiences();
      } else {
        Alert.alert('Error', response.message || 'Failed to save experience');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save experience. Please try again.');
    }
  };

  const handleDeleteExperience = (experienceId: number, title: string) => {
    Alert.alert(
      'Delete Experience',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getAuthToken();
              if (!token) return;

              const response = await apiService.post('/delete-front-profile-experience', { experience_id: experienceId }, token);

              if (response.success) {
                setExperiences(prev => prev.filter(exp => exp.id !== experienceId));
                Alert.alert('Success', 'Experience deleted successfully');
              } else {
                Alert.alert('Error', response.message || 'Failed to delete experience');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete experience');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17D27C" />
        <Text style={styles.loadingText}>Loading experience...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {experiences.length === 0 ? (
          <View style={[styles.emptyState, { marginTop: 10 }]}>
            <MaterialIcons name="work" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Experience Found</Text>
            <Text style={styles.emptySubtitle}>Add your work experience to build your profile</Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={handleAddExperience}>
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addFirstButtonText}>Add Experience</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.sectionHeader, { marginTop: 10 }]}>
              <Text style={styles.sectionTitle}>Your Experience ({experiences.length})</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddExperience}
              >
                <MaterialIcons name="add" size={20} color="#17D27C" />
                <Text style={styles.addButtonText}>Add Experience</Text>
              </TouchableOpacity>
            </View>

            {experiences.map((experience) => (
              <View key={experience.id} style={styles.experienceCard}>
                <View style={styles.experienceHeader}>
                  <View style={styles.experienceInfo}>
                    <Text style={styles.experienceTitle}>{experience.title}</Text>
                    <Text style={styles.experienceCompany}>{experience.company}</Text>
                    <Text style={styles.experienceDuration}>
                      {experience.date_start_formatted} - {experience.is_currently_working ? 'Currently working' : experience.date_end_formatted}
                    </Text>
                    {experience.location && (
                      <Text style={styles.experienceLocation}>{experience.location}</Text>
                    )}
                  </View>
                  <View style={styles.experienceActions}>
                    <TouchableOpacity 
                      onPress={() => handleEditExperience(experience)}
                      style={styles.actionButton}
                    >
                      <MaterialIcons name="edit" size={20} color="#17D27C" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeleteExperience(experience.id, experience.title)}
                      style={styles.actionButton}
                    >
                      <MaterialIcons name="delete" size={20} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {experience.description && (
                  <Text style={styles.experienceDescription}>{experience.description}</Text>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add/Edit Form Modal */}
      <Modal
        visible={showAddForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setExperienceLayer(null);
          setShowAddForm(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.modalContent}>
              {experienceLayer === 'country' || experienceLayer === 'state' || experienceLayer === 'city' ? (
                <>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setExperienceLayer(null)} hitSlop={12}>
                      <MaterialIcons name="arrow-back" size={24} color="#666" />
                    </TouchableOpacity>
                    <Text style={[styles.modalTitle, styles.layerHeaderTitle]} numberOfLines={1}>
                      {experienceLayer ? EXPERIENCE_LAYER_TITLES[experienceLayer] : ''}
                    </Text>
                    <View style={styles.headerSpacer} />
                  </View>
                  <ScrollView
                    style={[styles.formContent, styles.layerScroll]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {experienceLayer === 'country' &&
                      countries.map((country) => (
                        <TouchableOpacity
                          key={country.id}
                          style={[
                            styles.pickerOption,
                            formData.country_id === country.id && styles.pickerOptionSelected,
                          ]}
                          onPress={() => {
                            setFormData((prev) => ({
                              ...prev,
                              country_id: country.id,
                              state_id: 0,
                              city_id: 0,
                            }));
                            setStates([]);
                            setCities([]);
                            fetchStates(country.id);
                            setExperienceLayer(null);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerOptionText,
                              formData.country_id === country.id && styles.pickerOptionTextSelected,
                            ]}
                          >
                            {country.name}
                          </Text>
                          {formData.country_id === country.id && (
                            <MaterialIcons name="check" size={20} color="#17D27C" />
                          )}
                        </TouchableOpacity>
                      ))}
                    {experienceLayer === 'state' &&
                      states.map((state) => (
                        <TouchableOpacity
                          key={state.id}
                          style={[
                            styles.pickerOption,
                            formData.state_id === state.id && styles.pickerOptionSelected,
                          ]}
                          onPress={() => {
                            setFormData((prev) => ({ ...prev, state_id: state.id, city_id: 0 }));
                            setCities([]);
                            fetchCities(state.id);
                            setExperienceLayer(null);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerOptionText,
                              formData.state_id === state.id && styles.pickerOptionTextSelected,
                            ]}
                          >
                            {state.name}
                          </Text>
                          {formData.state_id === state.id && (
                            <MaterialIcons name="check" size={20} color="#17D27C" />
                          )}
                        </TouchableOpacity>
                      ))}
                    {experienceLayer === 'city' &&
                      cities.map((city) => (
                        <TouchableOpacity
                          key={city.id}
                          style={[
                            styles.pickerOption,
                            formData.city_id === city.id && styles.pickerOptionSelected,
                          ]}
                          onPress={() => {
                            setFormData((prev) => ({ ...prev, city_id: city.id }));
                            setExperienceLayer(null);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerOptionText,
                              formData.city_id === city.id && styles.pickerOptionTextSelected,
                            ]}
                          >
                            {city.name}
                          </Text>
                          {formData.city_id === city.id && (
                            <MaterialIcons name="check" size={20} color="#17D27C" />
                          )}
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </>
              ) : experienceLayer === 'dateStart' || experienceLayer === 'dateEnd' ? (
                Platform.OS === 'ios' ? (
                  <>
                    <View style={styles.modalHeader}>
                      <TouchableOpacity onPress={() => setExperienceLayer(null)} hitSlop={12}>
                        <MaterialIcons name="arrow-back" size={24} color="#666" />
                      </TouchableOpacity>
                      <Text style={[styles.modalTitle, styles.layerHeaderTitle]} numberOfLines={1}>
                        {experienceLayer ? EXPERIENCE_LAYER_TITLES[experienceLayer] : ''}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          const ymd = formatYmd(tempDate);
                          if (experienceLayer === 'dateStart') {
                            setFormData((prev) => ({ ...prev, date_start: ymd }));
                          } else {
                            setFormData((prev) => ({ ...prev, date_end: ymd }));
                          }
                          setExperienceLayer(null);
                        }}
                        hitSlop={12}
                      >
                        <Text style={styles.dateDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display="spinner"
                      onChange={(_, d) => {
                        if (d) setTempDate(d);
                      }}
                      minimumDate={
                        experienceLayer === 'dateEnd' ? parseYmd(formData.date_start) : undefined
                      }
                      maximumDate={new Date()}
                    />
                  </>
                ) : null
              ) : (
                <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingExperience ? 'Edit Experience' : 'Add New Experience'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setExperienceLayer(null);
                    setShowAddForm(false);
                  }}
                >
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.formContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Experience Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.title}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, title: value }))}
                  placeholder="e.g., Senior Software Developer"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Company *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.company}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, company: value }))}
                  placeholder="Company name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Country *</Text>
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => {
                      if (loadingOptions) return;
                      setExperienceLayer('country');
                    }}
                    disabled={loadingOptions}
                  >
                    <Text style={[
                      styles.dropdownText,
                      formData.country_id === 0 && styles.dropdownPlaceholder
                    ]}>
                      {loadingOptions 
                        ? 'Loading countries...' 
                        : formData.country_id === 0 
                          ? 'Select Country' 
                          : countries.find(c => c.id === formData.country_id)?.name || 'Select Country'
                      }
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>State</Text>
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => {
                      if (formData.country_id === 0) {
                        Alert.alert('Select country', 'Please select a country first.');
                        return;
                      }
                      setExperienceLayer('state');
                    }}
                    disabled={formData.country_id === 0}
                  >
                    <Text style={[
                      styles.dropdownText,
                      formData.state_id === 0 && styles.dropdownPlaceholder
                    ]}>
                      {formData.country_id === 0 
                        ? 'Select Country first' 
                        : formData.state_id === 0 
                          ? 'Select State' 
                          : states.find(s => s.id === formData.state_id)?.name || 'Select State'
                      }
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>City</Text>
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => {
                      if (formData.state_id === 0) {
                        Alert.alert('Select state', 'Please select a state first.');
                        return;
                      }
                      setExperienceLayer('city');
                    }}
                    disabled={formData.state_id === 0}
                  >
                    <Text style={[
                      styles.dropdownText,
                      formData.city_id === 0 && styles.dropdownPlaceholder
                    ]}>
                      {formData.state_id === 0 
                        ? 'Select State first' 
                        : formData.city_id === 0 
                          ? 'Select City' 
                          : cities.find(c => c.id === formData.city_id)?.name || 'Select City'
                      }
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Experience Start Date *</Text>
                <TouchableOpacity
                  style={styles.dateFieldButton}
                  onPress={() => {
                    setTempDate(parseYmd(formData.date_start));
                    setExperienceLayer('dateStart');
                  }}
                >
                  <Text
                    style={[
                      styles.dateFieldText,
                      !formData.date_start && styles.dropdownPlaceholder,
                    ]}
                  >
                    {formData.date_start || 'YYYY-MM-DD'}
                  </Text>
                  <MaterialIcons name="event" size={22} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Currently Working?</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity 
                    style={styles.radioOption}
                    onPress={() => setFormData(prev => ({ ...prev, is_currently_working: true }))}
                  >
                    <MaterialIcons 
                      name={formData.is_currently_working ? "radio-button-checked" : "radio-button-unchecked"} 
                      size={20} 
                      color={formData.is_currently_working ? "#17D27C" : "#666"} 
                    />
                    <Text style={styles.radioText}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.radioOption}
                    onPress={() => setFormData(prev => ({ ...prev, is_currently_working: false }))}
                  >
                    <MaterialIcons 
                      name={!formData.is_currently_working ? "radio-button-checked" : "radio-button-unchecked"} 
                      size={20} 
                      color={!formData.is_currently_working ? "#17D27C" : "#666"} 
                    />
                    <Text style={styles.radioText}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {!formData.is_currently_working && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Experience End Date</Text>
                  <TouchableOpacity
                    style={styles.dateFieldButton}
                    onPress={() => {
                      setTempDate(parseYmd(formData.date_end || formData.date_start));
                      setExperienceLayer('dateEnd');
                    }}
                  >
                    <Text
                      style={[
                        styles.dateFieldText,
                        !formData.date_end && styles.dropdownPlaceholder,
                      ]}
                    >
                      {formData.date_end || 'YYYY-MM-DD'}
                    </Text>
                    <MaterialIcons name="event" size={22} color="#666" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Experience Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.description}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
                  placeholder="Describe your responsibilities and achievements..."
                  multiline
                  numberOfLines={4}
                />
              </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setExperienceLayer(null);
                    setShowAddForm(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleSaveExperience}
                >
                  <Text style={styles.saveButtonText}>
                    {editingExperience ? 'Update' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
                </>
              )}
            </View>
          </KeyboardAvoidingView>

          {experienceLayer === 'dateStart' && Platform.OS === 'android' && (
            <DateTimePicker
              value={parseYmd(formData.date_start)}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setExperienceLayer(null);
                if (event.type === 'set' && date) {
                  setFormData((prev) => ({ ...prev, date_start: formatYmd(date) }));
                }
              }}
              maximumDate={new Date()}
            />
          )}
          {experienceLayer === 'dateEnd' && Platform.OS === 'android' && !formData.is_currently_working && (
            <DateTimePicker
              value={parseYmd(formData.date_end || formData.date_start)}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setExperienceLayer(null);
                if (event.type === 'set' && date) {
                  setFormData((prev) => ({ ...prev, date_end: formatYmd(date) }));
                }
              }}
              minimumDate={parseYmd(formData.date_start)}
              maximumDate={new Date()}
            />
          )}
        </View>
      </Modal>
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
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17D27C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#17D27C',
  },
  addButtonText: {
    fontSize: 14,
    color: '#17D27C',
    fontWeight: '500',
    marginLeft: 4,
  },
  experienceCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  experienceInfo: {
    flex: 1,
  },
  experienceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  experienceCompany: {
    fontSize: 14,
    color: '#17D27C',
    marginBottom: 4,
  },
  experienceDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  experienceLocation: {
    fontSize: 14,
    color: '#666',
  },
  experienceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  experienceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  layerHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 28,
  },
  layerScroll: {
    maxHeight: 440,
  },
  dateFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dateFieldText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dateDoneText: {
    color: '#17D27C',
    fontWeight: '600',
    fontSize: 16,
  },
  formContent: {
    padding: 20,
    marginBottom:20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
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
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  checkboxText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    borderRadius: 8,
    backgroundColor: '#17D27C',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  dropdownContainer: {
    marginBottom: 0,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  radioGroup: {
    flexDirection: 'row',
    marginTop: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  radioText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pickerModalBody: {
    maxHeight: 400,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionSelected: {
    backgroundColor: '#f8f9fa',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  pickerOptionTextSelected: {
    color: '#17D27C',
    fontWeight: '500',
  },
});

export default ExperienceSection;
