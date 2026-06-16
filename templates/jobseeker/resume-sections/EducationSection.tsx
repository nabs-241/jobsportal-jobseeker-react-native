import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getUserId, getAuthToken } from '../../../utils/userHelper';
import apiService from '../../../services/apiService';
import { buildApiUrl } from '../../../config/api';

interface EducationSectionProps {
  onBack: () => void;
}

interface Education {
  id: number;
  degree_level_id: number;
  degree_type_id: number;
  degree_title: string;
  institution: string;
  country_id: number;
  state_id: number;
  city_id: number;
  date_completion: string;
  degree_result: string;
  result_type_id: number;
  major_subjects: string;
  degree_level_name: string;
  degree_type_name: string;
  country_name: string;
  state_name: string;
  city_name: string;
  result_type_name: string;
}

interface Option {
  id: number;
  name: string;
}

type EducationPickerKey =
  | 'degreeLevel'
  | 'degreeType'
  | 'majorSubjects'
  | 'country'
  | 'state'
  | 'city'
  | 'resultType';

const EDUCATION_PICKER_TITLES: Record<EducationPickerKey, string> = {
  degreeLevel: 'Select Degree Level',
  degreeType: 'Select Degree Type',
  majorSubjects: 'Select Major Subjects',
  country: 'Select Country',
  state: 'Select State',
  city: 'Select City',
  resultType: 'Select Result Type',
};

const EducationSection: React.FC<EducationSectionProps> = ({ onBack }) => {
  const [educations, setEducations] = useState<Education[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);

  // Options for dropdowns
  const [degreeLevels, setDegreeLevels] = useState<Option[]>([]);
  const [degreeTypes, setDegreeTypes] = useState<Option[]>([]);
  const [majorSubjects, setMajorSubjects] = useState<Option[]>([]);
  const [countries, setCountries] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [resultTypes, setResultTypes] = useState<Option[]>([]);

  /** Inline list inside the same modal (avoids nested Modal issues on Android). */
  const [educationPicker, setEducationPicker] = useState<EducationPickerKey | null>(null);

  const [formData, setFormData] = useState({
    degree_level_id: 0,
    degree_type_id: 0,
    degree_title: '',
    institution: '',
    country_id: 0,
    state_id: 0,
    city_id: 0,
    date_completion: '',
    degree_result: '',
    result_type_id: 0,
    major_subjects: [] as number[],
  });

  useEffect(() => {
    fetchEducations();
    fetchOptions();
  }, []);


  const fetchOptions = async () => {
    try {
      const [degreeLevelsRes, degreeTypesRes, majorSubjectsRes, resultTypesRes, countriesRes] = await Promise.all([
        apiService.get('/master-data/degree-levels'),
        apiService.get('/master-data/degree-types'),
        apiService.get('/master-data/major-subjects'),
        apiService.get('/master-data/result-types'),
        apiService.get('/master-data/countries')
      ]);

      if (degreeLevelsRes.success) setDegreeLevels(degreeLevelsRes.data as Option[]);
      if (degreeTypesRes.success) setDegreeTypes(degreeTypesRes.data as Option[]);
      if (majorSubjectsRes.success) setMajorSubjects(majorSubjectsRes.data as Option[]);
      if (resultTypesRes.success) setResultTypes(resultTypesRes.data as Option[]);
      if (countriesRes.success) setCountries(countriesRes.data as Option[]);
    } catch (error) {
      // Error fetching options
    }
  };

  const fetchStates = async (countryId: number) => {
    try {
      const response = await apiService.get(`/master-data/states?country_id=${countryId}`);
      if (response.success && response.data) {
        setStates(response.data as Option[]);
      }
    } catch (error) {
      // Error fetching states
    }
  };

  const fetchCities = async (stateId: number) => {
    try {
      const response = await apiService.get(`/master-data/cities?state_id=${stateId}`);
      if (response.success && response.data) {
        setCities(response.data as Option[]);
      }
    } catch (error) {
      // Error fetching cities
    }
  };

  const fetchEducations = async () => {
    try {
      setLoading(true);
      const userId = await getUserId();
      const token = await getAuthToken();
      
      if (!userId || !token) {
        Alert.alert('Error', 'Please login to view your education');
        return;
      }

      const response = await apiService.post(`/show-front-profile-education/${userId}`, {}, token);
      
      if (response.success && response.data) {
        setEducations(response.data as Education[]);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch education');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch education. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEducation = () => {
    setEditingEducation(null);
    setFormData({
      degree_level_id: 0,
      degree_type_id: 0,
      degree_title: '',
      institution: '',
      country_id: 0,
      state_id: 0,
      city_id: 0,
      date_completion: '',
      degree_result: '',
      result_type_id: 0,
      major_subjects: [],
    });
    setEducationPicker(null);
    setShowAddForm(true);
  };

  const handleEditEducation = async (education: Education) => {
    setEditingEducation(education);
    setFormData({
      degree_level_id: education.degree_level_id || 0,
      degree_type_id: education.degree_type_id || 0,
      degree_title: education.degree_title || '',
      institution: education.institution || '',
      country_id: education.country_id || 0,
      state_id: education.state_id || 0,
      city_id: education.city_id || 0,
      date_completion: education.date_completion || '',
      degree_result: education.degree_result || '',
      result_type_id: education.result_type_id || 0,
      major_subjects: education.major_subjects ? education.major_subjects.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : []
    });
    
    // Load states and cities for existing education
    if (education.country_id) {
      await fetchStates(education.country_id);
    }
    if (education.state_id) {
      await fetchCities(education.state_id);
    }
    
    setTimeout(() => {
      setEducationPicker(null);
      setShowAddForm(true);
    }, 100);
  };

  const handleSaveEducation = async () => {
    try {
      const userId = await getUserId();
      const token = await getAuthToken();
      
      if (!userId || !token) {
        Alert.alert('Error', 'Please login to save education');
        return;
      }

      let response;
      if (editingEducation) {
        response = await apiService.put(`/update-front-profile-education/${editingEducation.id}/${userId}`, formData, token);
      } else {
        response = await apiService.post(`/store-front-profile-education/${userId}`, formData, token);
      }
      
      if (response.success) {
        Alert.alert('Success', editingEducation ? 'Education updated successfully' : 'Education added successfully');
        setShowAddForm(false);
        fetchEducations();
      } else {
        Alert.alert('Error', response.message || 'Failed to save education');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save education. Please try again.');
    }
  };

  const handleDeleteEducation = (educationId: number, degreeTitle: string) => {
    Alert.alert(
      'Delete Education',
      `Are you sure you want to delete "${degreeTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getAuthToken();
              if (!token) return;

              const response = await apiService.post('/delete-front-profile-education', { education_id: educationId }, token);

              if (response.success) {
                setEducations(prev => prev.filter(edu => edu.id !== educationId));
                Alert.alert('Success', 'Education deleted successfully');
              } else {
                Alert.alert('Error', response.message || 'Failed to delete education');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete education');
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
        <Text style={styles.loadingText}>Loading education...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {educations.length === 0 ? (
          <View style={[styles.emptyState, { marginTop: 10 }]}>
            <MaterialIcons name="school" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Education Found</Text>
            <Text style={styles.emptySubtitle}>Add your educational background to complete your profile</Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={handleAddEducation}>
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addFirstButtonText}>Add Education</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.sectionHeader, { marginTop: 10 }]}>
              <Text style={styles.sectionTitle}>Your Education ({educations.length})</Text>
              <TouchableOpacity style={styles.addButton} onPress={handleAddEducation}>
                <MaterialIcons name="add" size={20} color="#17D27C" />
                <Text style={styles.addButtonText}>Add Education</Text>
              </TouchableOpacity>
            </View>

            {educations.map((education) => (
              <View key={education.id} style={styles.educationCard}>
                <View style={styles.educationHeader}>
                  <View style={styles.educationInfo}>
                    <Text style={styles.educationTitle}>{education.degree_title}</Text>
                    <Text style={styles.educationInstitute}>{education.institution}</Text>
                    <Text style={styles.educationLevel}>
                      {education.degree_level_name} - {education.degree_type_name}
                    </Text>
                    <Text style={styles.educationDuration}>
                      {education.date_completion} - {education.city_name}, {education.country_name}
                    </Text>
                    {education.degree_result && (
                      <Text style={styles.educationGPA}>
                        {education.degree_result} ({education.result_type_name})
                      </Text>
                    )}
                    {education.major_subjects && (
                      <Text style={styles.educationSubjects}>
                        <MaterialIcons name="book" size={16} color="#666" /> {education.major_subjects}
                      </Text>
                    )}
                  </View>
                  <View style={styles.educationActions}>
                    <TouchableOpacity 
                      onPress={() => handleEditEducation(education)}
                      style={styles.actionButton}
                    >
                      <MaterialIcons name="edit" size={20} color="#17D27C" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeleteEducation(education.id, education.degree_title)}
                      style={styles.actionButton}
                    >
                      <MaterialIcons name="delete" size={20} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                </View>
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
          setEducationPicker(null);
          setShowAddForm(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.modalContent}>
              {educationPicker ? (
                <>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setEducationPicker(null)} hitSlop={12}>
                      <MaterialIcons name="arrow-back" size={24} color="#666" />
                    </TouchableOpacity>
                    <Text style={[styles.modalTitle, styles.pickerHeaderTitle]} numberOfLines={1}>
                      {EDUCATION_PICKER_TITLES[educationPicker]}
                    </Text>
                    {educationPicker === 'majorSubjects' ? (
                      <TouchableOpacity onPress={() => setEducationPicker(null)} hitSlop={12}>
                        <Text style={styles.pickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.headerSpacer} />
                    )}
                  </View>
                  <ScrollView
                    style={[styles.formContent, styles.pickerInlineScroll]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {educationPicker === 'degreeLevel' &&
                      degreeLevels.map((level) => (
                        <TouchableOpacity
                          key={level.id}
                          style={styles.pickerOption}
                          onPress={() => {
                            setFormData((prev) => ({ ...prev, degree_level_id: level.id }));
                            setEducationPicker(null);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{level.name}</Text>
                        </TouchableOpacity>
                      ))}
                    {educationPicker === 'degreeType' &&
                      degreeTypes.map((type) => (
                        <TouchableOpacity
                          key={type.id}
                          style={styles.pickerOption}
                          onPress={() => {
                            setFormData((prev) => ({ ...prev, degree_type_id: type.id }));
                            setEducationPicker(null);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{type.name}</Text>
                        </TouchableOpacity>
                      ))}
                    {educationPicker === 'majorSubjects' &&
                      majorSubjects.map((subject) => (
                        <TouchableOpacity
                          key={subject.id}
                          style={[
                            styles.pickerOption,
                            formData.major_subjects.includes(subject.id) && styles.pickerOptionSelected,
                          ]}
                          onPress={() => {
                            const isSelected = formData.major_subjects.includes(subject.id);
                            setFormData((prev) => ({
                              ...prev,
                              major_subjects: isSelected
                                ? prev.major_subjects.filter((id) => id !== subject.id)
                                : [...prev.major_subjects, subject.id],
                            }));
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerOptionText,
                              formData.major_subjects.includes(subject.id) && styles.pickerOptionTextSelected,
                            ]}
                          >
                            {subject.name}
                          </Text>
                          {formData.major_subjects.includes(subject.id) && (
                            <MaterialIcons name="check" size={20} color="#17D27C" />
                          )}
                        </TouchableOpacity>
                      ))}
                    {educationPicker === 'country' &&
                      countries.map((country) => (
                        <TouchableOpacity
                          key={country.id}
                          style={styles.pickerOption}
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
                            setEducationPicker(null);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{country.name}</Text>
                        </TouchableOpacity>
                      ))}
                    {educationPicker === 'state' &&
                      states.map((state) => (
                        <TouchableOpacity
                          key={state.id}
                          style={styles.pickerOption}
                          onPress={() => {
                            setFormData((prev) => ({ ...prev, state_id: state.id, city_id: 0 }));
                            setCities([]);
                            fetchCities(state.id);
                            setEducationPicker(null);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{state.name}</Text>
                        </TouchableOpacity>
                      ))}
                    {educationPicker === 'city' &&
                      cities.map((city) => (
                        <TouchableOpacity
                          key={city.id}
                          style={styles.pickerOption}
                          onPress={() => {
                            setFormData((prev) => ({ ...prev, city_id: city.id }));
                            setEducationPicker(null);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{city.name}</Text>
                        </TouchableOpacity>
                      ))}
                    {educationPicker === 'resultType' &&
                      resultTypes.map((type) => (
                        <TouchableOpacity
                          key={type.id}
                          style={styles.pickerOption}
                          onPress={() => {
                            setFormData((prev) => ({ ...prev, result_type_id: type.id }));
                            setEducationPicker(null);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{type.name}</Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </>
              ) : (
                <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingEducation ? 'Edit Education' : 'Add New Education'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setEducationPicker(null);
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
              {/* Degree Level */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Degree Level *</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setEducationPicker('degreeLevel')}
                >
                  <Text style={styles.dropdownText}>
                    {formData.degree_level_id ? 
                      degreeLevels.find(dl => dl.id === formData.degree_level_id)?.name || 'Select Degree Level' :
                      'Select Degree Level'
                    }
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Degree Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Degree Type *</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setEducationPicker('degreeType')}
                >
                  <Text style={styles.dropdownText}>
                    {formData.degree_type_id ? 
                      degreeTypes.find(dt => dt.id === formData.degree_type_id)?.name || 'Select Degree Type' :
                      'Select Degree Type'
                    }
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Degree Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Degree Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.degree_title}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, degree_title: value }))}
                  placeholder="e.g., Bachelor of Computer Science"
                />
              </View>

              {/* Major Subjects */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Major Subjects</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setEducationPicker('majorSubjects')}
                >
                  <Text style={styles.dropdownText}>
                    {formData.major_subjects.length > 0 ? 
                      `${formData.major_subjects.length} subjects selected` :
                      'Select Major Subjects'
                    }
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Country */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Country *</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setEducationPicker('country')}
                >
                  <Text style={styles.dropdownText}>
                    {formData.country_id ? 
                      countries.find(c => c.id === formData.country_id)?.name || 'Select Country' :
                      'Select Country'
                    }
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* State */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>State *</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => {
                    if (!formData.country_id) {
                      Alert.alert('Select country', 'Please select a country first.');
                      return;
                    }
                    setEducationPicker('state');
                  }}
                >
                  <Text style={styles.dropdownText}>
                    {formData.state_id ? 
                      states.find(s => s.id === formData.state_id)?.name || 'Select State' :
                      'Select State'
                    }
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* City */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>City *</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => {
                    if (!formData.state_id) {
                      Alert.alert('Select state', 'Please select a state first.');
                      return;
                    }
                    setEducationPicker('city');
                  }}
                >
                  <Text style={styles.dropdownText}>
                    {formData.city_id ? 
                      cities.find(c => c.id === formData.city_id)?.name || 'Select City' :
                      'Select City'
                    }
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Institution */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Institution *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.institution}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, institution: value }))}
                  placeholder="University or College name"
                />
              </View>

              {/* Date Completion */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date Completion *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.date_completion}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, date_completion: value }))}
                  placeholder="e.g., 2020"
                />
              </View>

              {/* Degree Result */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Degree Result</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.degree_result}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, degree_result: value }))}
                  placeholder="e.g., 3.8/4.0"
                />
              </View>

              {/* Result Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Result Type</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setEducationPicker('resultType')}
                >
                  <Text style={styles.dropdownText}>
                    {formData.result_type_id ? 
                      resultTypes.find(rt => rt.id === formData.result_type_id)?.name || 'Select Result Type' :
                      'Select Result Type'
                    }
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setEducationPicker(null);
                    setShowAddForm(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleSaveEducation}
                >
                  <Text style={styles.saveButtonText}>
                    {editingEducation ? 'Update' : 'Add'} Education
                  </Text>
                </TouchableOpacity>
              </View>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
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
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 14,
    color: '#17D27C',
    marginLeft: 4,
    fontWeight: '500',
  },
  educationCard: {
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
  educationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  educationInfo: {
    flex: 1,
  },
  educationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  educationInstitute: {
    fontSize: 14,
    color: '#17D27C',
    marginBottom: 4,
  },
  educationLevel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  educationDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  educationGPA: {
    fontSize: 14,
    color: '#666',
  },
  educationSubjects: {
    fontSize: 14,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  educationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  educationDescription: {
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
  pickerHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  pickerDoneText: {
    color: '#17D27C',
    fontWeight: '600',
    fontSize: 16,
  },
  headerSpacer: {
    width: 28,
  },
  pickerInlineScroll: {
    maxHeight: 440,
  },
  formContent: {
    padding: 20,
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
    height: 80,
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
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionSelected: {
    backgroundColor: '#f0f8ff',
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

export default EducationSection;
