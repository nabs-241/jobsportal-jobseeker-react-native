import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getUserId, getAuthToken } from '../../../utils/userHelper';
import apiService from '../../../services/apiService';
import { buildApiUrl } from '../../../config/api';

interface SkillsSectionProps {
  onBack: () => void;
}

interface Skill {
  id: number;
  job_skill_id: number;
  job_experience_id: number;
  skill_name: string;
  experience_level: string;
}

interface SkillOption {
  id: number;
  name: string;
}

interface ExperienceOption {
  id: number;
  name: string;
}

const SkillsSection: React.FC<SkillsSectionProps> = ({ onBack }) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillOptions, setSkillOptions] = useState<SkillOption[]>([]);
  const [experienceOptions, setExperienceOptions] = useState<ExperienceOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [showExperiencePicker, setShowExperiencePicker] = useState(false);

  const [formData, setFormData] = useState({
    job_skill_id: 0,
    job_experience_id: 0,
  });

  useEffect(() => {
    fetchSkills();
    fetchSkillOptions();
  }, []);

  // Debug: Log current options when they change

  const fetchSkillOptions = async () => {
    try {
      setLoadingOptions(true);
      
      // Fetch skills and experience options from API
      const [skillsResponse, experienceResponse] = await Promise.all([
        apiService.get('/master-data/job-skills'),
        apiService.get('/master-data/job-experiences')
      ]);


      // Set skills from API
      if (skillsResponse.success && skillsResponse.data && Array.isArray(skillsResponse.data)) {
        setSkillOptions(skillsResponse.data as SkillOption[]);
      } else {
        Alert.alert('Error', 'Failed to load skills. Please try again.');
      }

      // Set experience levels from API
      if (experienceResponse.success && experienceResponse.data && Array.isArray(experienceResponse.data)) {
        setExperienceOptions(experienceResponse.data as ExperienceOption[]);
      } else {
        Alert.alert('Error', 'Failed to load experience levels. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load options. Please check your connection and try again.');
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const userId = await getUserId();
      const token = await getAuthToken();
      
      if (!userId || !token) {
        Alert.alert('Error', 'Please login to view your skills');
        return;
      }

      const response = await apiService.post(`/show-front-profile-skills/${userId}`, {}, token);
      
      if (response.success && response.data) {
        setSkills(response.data as Skill[]);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch skills');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch skills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    setEditingSkill(null);
    setFormData({
      job_skill_id: 0,
      job_experience_id: 0,
    });
    setShowAddForm(true);
  };

  const handleEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setFormData({
      job_skill_id: skill.job_skill_id,
      job_experience_id: skill.job_experience_id,
    });
    setShowAddForm(true);
  };

  const handleSaveSkill = async () => {
    if (!formData.job_skill_id || formData.job_skill_id === 0) {
      Alert.alert('Error', 'Please select a skill');
      return;
    }

    if (!formData.job_experience_id || formData.job_experience_id === 0) {
      Alert.alert('Error', 'Please select experience level');
      return;
    }

    try {
      const userId = await getUserId();
      const token = await getAuthToken();
      
      if (!userId || !token) {
        Alert.alert('Error', 'Please login to save skill');
        return;
      }

      let response;
      if (editingSkill) {
        response = await apiService.put(`/update-front-profile-skill/${editingSkill.id}/${userId}`, formData, token);
      } else {
        response = await apiService.post(`/store-front-profile-skill/${userId}`, formData, token);
      }
      
      if (response.success) {
        Alert.alert('Success', editingSkill ? 'Skill updated successfully' : 'Skill added successfully');
        setShowAddForm(false);
        fetchSkills();
      } else {
        Alert.alert('Error', response.message || 'Failed to save skill');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save skill. Please try again.');
    }
  };

  
  const handleDeleteSkill = (skillId: number, skillName: string) => {
    Alert.alert(
      'Delete Skill',
      `Are you sure you want to delete "${skillName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getAuthToken();
              if (!token) return;

              const response = await apiService.post('/delete-front-profile-skill', { skill_id: skillId }, token);

              if (response.success) {
                setSkills(prev => prev.filter(skill => skill.id !== skillId));
                Alert.alert('Success', 'Skill deleted successfully');
              } else {
                Alert.alert('Error', response.message || 'Failed to delete skill');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete skill');
            }
          }
        }
      ]
    );
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return '#FF6B6B';
      case 'Intermediate': return '#FFA726';
      case 'Advanced': return '#42A5F5';
      case 'Expert': return '#17D27C';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17D27C" />
        <Text style={styles.loadingText}>Loading skills...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {skills.length === 0 ? (
          <View style={[styles.emptyState, { marginTop: 10 }]}>
            <MaterialIcons name="star" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Skills Found</Text>
            <Text style={styles.emptySubtitle}>Add your skills to showcase your expertise</Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={handleAddSkill}>
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addFirstButtonText}>Add Skill</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.sectionHeader, { marginTop: 10 }]}>
              <Text style={styles.sectionTitle}>Your Skills ({skills.length})</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddSkill}
              >
                <MaterialIcons name="add" size={20} color="#17D27C" />
                <Text style={styles.addButtonText}>Add Skill</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.skillsGrid}>
              {skills.map((skill) => (
                <View key={skill.id} style={styles.skillCard}>
                  <View style={styles.skillHeader}>
                    <Text style={styles.skillName}>{skill.skill_name}</Text>
                    <View style={styles.skillActions}>
                      <TouchableOpacity 
                        onPress={() => handleEditSkill(skill)}
                        style={styles.actionButton}
                      >
                        <MaterialIcons name="edit" size={20} color="#17D27C" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleDeleteSkill(skill.id, skill.skill_name)}
                        style={styles.actionButton}
                      >
                        <MaterialIcons name="delete" size={20} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.skillLevelContainer}>
                    <View style={[styles.skillLevelBadge, { backgroundColor: getSkillLevelColor(skill.experience_level) }]}>
                      <Text style={styles.skillLevelText}>{skill.experience_level}</Text>
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
                {editingSkill ? 'Edit Skill' : 'Add New Skill'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddForm(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Skill *</Text>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity 
            style={styles.dropdownButton}
            onPress={() => setShowSkillPicker(true)}
            disabled={loadingOptions}
          >
            <Text style={[
              styles.dropdownText,
              formData.job_skill_id === 0 && styles.dropdownPlaceholder
            ]}>
              {loadingOptions 
                ? 'Loading skills...' 
                : formData.job_skill_id === 0 
                  ? 'Select a skill' 
                  : skillOptions.find(s => s.id === formData.job_skill_id)?.name || 'Select a skill'
              }
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Experience Level *</Text>
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity 
                    style={styles.dropdownButton}
                    onPress={() => setShowExperiencePicker(true)}
                    disabled={loadingOptions}
                  >
                    <Text style={[
                      styles.dropdownText,
                      formData.job_experience_id === 0 && styles.dropdownPlaceholder
                    ]}>
                      {loadingOptions 
                        ? 'Loading experience levels...' 
                        : formData.job_experience_id === 0 
                          ? 'Select experience level' 
                          : experienceOptions.find(e => e.id === formData.job_experience_id)?.name || 'Select experience level'
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
                onPress={handleSaveSkill}
              >
                <Text style={styles.saveButtonText}>
                  {editingSkill ? 'Update' : 'Add'} Skill
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Skill Picker Modal */}
      {showSkillPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Skill</Text>
              <TouchableOpacity onPress={() => setShowSkillPicker(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalBody}>
              {skillOptions.map((skill) => (
                <TouchableOpacity
                  key={skill.id}
                  style={[
                    styles.pickerOption,
                    formData.job_skill_id === skill.id && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, job_skill_id: skill.id }));
                    setShowSkillPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    formData.job_skill_id === skill.id && styles.pickerOptionTextSelected
                  ]}>
                    {skill.name}
                  </Text>
                  {formData.job_skill_id === skill.id && (
                    <MaterialIcons name="check" size={20} color="#17D27C" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Experience Picker Modal */}
      {showExperiencePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Experience Level</Text>
              <TouchableOpacity onPress={() => setShowExperiencePicker(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalBody}>
              {experienceOptions.map((exp) => (
                <TouchableOpacity
                  key={exp.id}
                  style={[
                    styles.pickerOption,
                    formData.job_experience_id === exp.id && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, job_experience_id: exp.id }));
                    setShowExperiencePicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    formData.job_experience_id === exp.id && styles.pickerOptionTextSelected
                  ]}>
                    {exp.name}
                  </Text>
                  {formData.job_experience_id === exp.id && (
                    <MaterialIcons name="check" size={20} color="#17D27C" />
                  )}
                </TouchableOpacity>
              ))}
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
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#17D27C',
  },
  addButtonText: {
    color: '#17D27C',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  skillsGrid: {
    flexDirection: 'column',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  skillCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  skillName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  skillActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
    marginLeft: 4,
  },
  skillLevelContainer: {
    alignItems: 'flex-start',
  },
  skillLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillLevelText: {
    color: '#fff',
    fontSize: 14,
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
    marginBottom: 10,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
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

export default SkillsSection;
