import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getUserId, getAuthToken } from '../../../utils/userHelper';
import apiService from '../../../services/apiService';
import { buildApiUrl } from '../../../config/api';

interface LanguagesSectionProps {
  onBack: () => void;
}

interface Language {
  id: number;
  language_id: number;
  language_level_id: number;
  language_name: string;
  language_level_name: string;
}

interface LanguageOption {
  id: number;
  name: string;
}

interface LanguageLevelOption {
  id: number;
  name: string;
}

const LanguagesSection: React.FC<LanguagesSectionProps> = ({ onBack }) => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);

  const [formData, setFormData] = useState({
    language_id: 0,
    language_level_id: 0,
  });

  const [languageOptions, setLanguageOptions] = useState<LanguageOption[]>([]);
  const [languageLevelOptions, setLanguageLevelOptions] = useState<LanguageLevelOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showLanguageLevelPicker, setShowLanguageLevelPicker] = useState(false);

  useEffect(() => {
    fetchLanguages();
    fetchLanguageOptions();
  }, []);


  const fetchLanguageOptions = async () => {
    try {
      setLoadingOptions(true);
      
      // Fetch languages and language levels from API
      const [languagesResponse, languageLevelsResponse] = await Promise.all([
        apiService.get('/master-data/languages'),
        apiService.get('/master-data/language-levels')
      ]);


      // Set languages from API
      if (languagesResponse.success && languagesResponse.data && Array.isArray(languagesResponse.data)) {
        setLanguageOptions(languagesResponse.data as LanguageOption[]);
      } else {
        Alert.alert('Error', 'Failed to load languages. Please try again.');
      }

      if (languageLevelsResponse.success && languageLevelsResponse.data && Array.isArray(languageLevelsResponse.data)) {
        setLanguageLevelOptions(languageLevelsResponse.data as LanguageLevelOption[]);
      } else {
        Alert.alert('Error', 'Failed to load language levels. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load options. Please check your connection and try again.');
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchLanguages = async () => {
    try {
      setLoading(true);
      const userId = await getUserId();
      const token = await getAuthToken();
      
      if (!userId || !token) {
        Alert.alert('Error', 'Please login to view your languages');
        return;
      }

      const response = await apiService.post(`/show-front-profile-languages/${userId}`, {}, token);
      
      if (response.success && response.data) {
        setLanguages(response.data as Language[]);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch languages');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch languages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLanguage = () => {
    setEditingLanguage(null);
    setFormData({
      language_id: 0,
      language_level_id: 0,
    });
    setShowAddForm(true);
  };

  const handleEditLanguage = (language: Language) => {
    setEditingLanguage(language);
    setFormData({
      language_id: language.language_id || 0,
      language_level_id: language.language_level_id || 0,
    });
    setShowAddForm(true);
  };

  const handleSaveLanguage = async () => {
    if (formData.language_id === 0) {
      Alert.alert('Error', 'Please select a language');
      return;
    }
    
    if (formData.language_level_id === 0) {
      Alert.alert('Error', 'Please select a language level');
      return;
    }

    try {
      const userId = await getUserId();
      const token = await getAuthToken();
      
      if (!userId || !token) {
        Alert.alert('Error', 'Please login to save language');
        return;
      }

      let response;
      if (editingLanguage) {
        response = await apiService.put(`/update-front-profile-language/${editingLanguage.id}/${userId}`, formData, token);
      } else {
        response = await apiService.post(`/store-front-profile-language/${userId}`, formData, token);
      }
      
      if (response.success) {
        Alert.alert('Success', editingLanguage ? 'Language updated successfully' : 'Language added successfully');
        setShowAddForm(false);
        fetchLanguages();
      } else {
        Alert.alert('Error', response.message || 'Failed to save language');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save language. Please try again.');
    }
  };

  const handleDeleteLanguage = (languageId: number, languageName: string) => {
    Alert.alert(
      'Delete Language',
      `Are you sure you want to delete "${languageName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getAuthToken();
              if (!token) return;

              const response = await apiService.post('/delete-front-profile-language', { language_id: languageId }, token);

              if (response.success) {
                setLanguages(prev => prev.filter(lang => lang.id !== languageId));
                Alert.alert('Success', 'Language deleted successfully');
              } else {
                Alert.alert('Error', response.message || 'Failed to delete language');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete language');
            }
          }
        }
      ]
    );
  };

  const getLanguageLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return '#FF6B6B';
      case 'Intermediate': return '#FFA726';
      case 'Expert': return '#42A5F5';
      case 'Native': return '#17D27C';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17D27C" />
        <Text style={styles.loadingText}>Loading languages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {languages.length === 0 ? (
          <View style={[styles.emptyState, { marginTop: 10 }]}>
            <MaterialIcons name="language" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Languages Found</Text>
            <Text style={styles.emptySubtitle}>Add languages you speak to enhance your profile</Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={handleAddLanguage}>
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addFirstButtonText}>Add Language</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.sectionHeader, { marginTop: 10 }]}>
              <Text style={styles.sectionTitle}>Your Languages ({languages.length})</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddLanguage}
              >
                <MaterialIcons name="add" size={20} color="#17D27C" />
                <Text style={styles.addButtonText}>Add Language</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.languagesGrid}>
              {languages.map((language) => (
                <View key={language.id} style={styles.languageCard}>
                  <View style={styles.languageHeader}>
                    <Text style={styles.languageName}>
                      {language.language_name || language.language_id || 'Unknown Language'}
                    </Text>
                    <View style={styles.languageActions}>
                      <TouchableOpacity 
                        onPress={() => handleEditLanguage(language)}
                        style={styles.actionButton}
                      >
                        <MaterialIcons name="edit" size={16} color="#17D27C" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleDeleteLanguage(language.id, language.language_name || 'Unknown Language')}
                        style={styles.actionButton}
                      >
                        <MaterialIcons name="delete" size={16} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.languageLevelContainer}>
                    <View style={[styles.languageLevelBadge, { backgroundColor: getLanguageLevelColor(language.language_level_name || 'Unknown') }]}>
                      <Text style={styles.languageLevelText}>
                        {language.language_level_name || language.language_level_id || 'Unknown Level'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingLanguage ? 'Edit Language' : 'Add New Language'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddForm(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Language *</Text>
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => {
                      setShowLanguagePicker(true);
                    }}
                    disabled={loadingOptions}
                  >
                    <Text style={[
                      styles.dropdownText,
                      formData.language_id === 0 && styles.dropdownPlaceholder
                    ]}>
                      {loadingOptions 
                        ? 'Loading languages...' 
                        : formData.language_id === 0 
                          ? 'Select Language' 
                          : languageOptions.find(l => l.id === formData.language_id)?.name || 'Select Language'
                      }
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Language Level *</Text>
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => {
                      setShowLanguageLevelPicker(true);
                    }}
                    disabled={loadingOptions}
                  >
                    <Text style={[
                      styles.dropdownText,
                      formData.language_level_id === 0 && styles.dropdownPlaceholder
                    ]}>
                      {loadingOptions 
                        ? 'Loading language levels...' 
                        : formData.language_level_id === 0 
                          ? 'Select Language Level' 
                          : languageLevelOptions.find(l => l.id === formData.language_level_id)?.name || 'Select Language Level'
                      }
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAddForm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveLanguage}
              >
                <Text style={styles.saveButtonText}>
                  {editingLanguage ? 'Update' : 'Add'} Language
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Language Picker Modal */}
      {showLanguagePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Language ({languageOptions.length} available)</Text>
              <TouchableOpacity onPress={() => setShowLanguagePicker(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalBody}>
              {languageOptions.length > 0 ? (
                languageOptions.map((language) => (
                  <TouchableOpacity
                    key={language.id}
                    style={[
                      styles.pickerOption,
                      formData.language_id === language.id && styles.pickerOptionSelected
                    ]}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, language_id: language.id }));
                      setShowLanguagePicker(false);
                    }}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.language_id === language.id && styles.pickerOptionTextSelected
                    ]}>
                      {language.name}
                    </Text>
                    {formData.language_id === language.id && (
                      <MaterialIcons name="check" size={20} color="#17D27C" />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.pickerOption}>
                  <Text style={styles.pickerOptionText}>No languages available (Count: {languageOptions.length})</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Language Level Picker Modal */}
      {showLanguageLevelPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Language Level ({languageLevelOptions.length} available)</Text>
              <TouchableOpacity onPress={() => setShowLanguageLevelPicker(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalBody}>
              {languageLevelOptions.length > 0 ? (
                languageLevelOptions.map((level) => (
                  <TouchableOpacity
                    key={level.id}
                    style={[
                      styles.pickerOption,
                      formData.language_level_id === level.id && styles.pickerOptionSelected
                    ]}
                    onPress={() => {
                      setFormData(prev => ({ ...prev, language_level_id: level.id }));
                      setShowLanguageLevelPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.language_level_id === level.id && styles.pickerOptionTextSelected
                    ]}>
                      {level.name}
                    </Text>
                    {formData.language_level_id === level.id && (
                      <MaterialIcons name="check" size={20} color="#17D27C" />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.pickerOption}>
                  <Text style={styles.pickerOptionText}>No language levels available (Count: {languageLevelOptions.length})</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}
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
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#17D27C',
  },
  addButtonText: {
    color: '#17D27C',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  languagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  languageCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  languageActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
    marginLeft: 4,
  },
  languageLevelContainer: {
    alignItems: 'flex-start',
  },
  languageLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  languageLevelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '60%',
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
  dropdownContainer: {
    marginBottom: 5,
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
    maxHeight: 300,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionSelected: {
    backgroundColor: '#f0f9ff',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  pickerOptionTextSelected: {
    color: '#17D27C',
    fontWeight: '600',
  },
});

export default LanguagesSection;
