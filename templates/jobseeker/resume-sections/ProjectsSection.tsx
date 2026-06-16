import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerAsset } from 'expo-image-picker';
import { getUserId, getAuthToken } from '../../../utils/userHelper';
import apiService from '../../../services/apiService';
import { buildAssetUrl, buildApiUrl } from '../../../config/api';

function appendProjectFormFields(
  fd: FormData,
  data: {
    name: string;
    description: string;
    url: string;
    date_start: string;
    date_end: string;
    is_on_going: boolean;
  }
) {
  fd.append('name', data.name.trim());
  fd.append('description', data.description.trim());
  fd.append('url', data.url.trim());
  fd.append('date_start', data.date_start || '');
  fd.append('date_end', data.is_on_going ? '' : data.date_end || '');
  fd.append('is_on_going', data.is_on_going ? '1' : '0');
}

function parseJsonSuccess(res: Response, body: Record<string, unknown>): boolean {
  const payloadSuccess = typeof body.success === 'boolean' ? body.success : undefined;
  return payloadSuccess !== undefined ? payloadSuccess && res.ok : res.ok;
}

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

type ProjectDateLayer = null | 'dateStart' | 'dateEnd';

interface ProjectsSectionProps {
  onBack: () => void;
}

interface Project {
  id: number;
  name: string;
  description: string;
  url: string;
  image: string;
  date_start: string;
  date_end: string;
  is_on_going: boolean;
  date_start_formatted: string;
  date_end_formatted: string;
}

const ProjectsSection: React.FC<ProjectsSectionProps> = ({ onBack }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectDateLayer, setProjectDateLayer] = useState<ProjectDateLayer>(null);
  const [tempProjectDate, setTempProjectDate] = useState(new Date());
  const [pickedImage, setPickedImage] = useState<ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: '',
    date_start: '',
    date_end: '',
    is_on_going: false,
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const userId = await getUserId();
      const token = await getAuthToken();
      
      if (!userId || !token) {
        Alert.alert('Error', 'Please login to view your projects');
        return;
      }

      const response = await apiService.post(`/show-front-profile-projects/${userId}`, {}, token);
      
      if (response.success && response.data) {
        setProjects(response.data as Project[]);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch projects');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      Alert.alert('Error', 'Failed to fetch projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      url: '',
      date_start: '',
      date_end: '',
      is_on_going: false,
    });
    setProjectDateLayer(null);
    setPickedImage(null);
    setShowAddForm(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      url: project.url || '',
      date_start: project.date_start || '',
      date_end: project.date_end || '',
      is_on_going: project.is_on_going || false,
    });
    setProjectDateLayer(null);
    setPickedImage(null);
    setShowAddForm(true);
  };

  const pickProjectImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow access to your photos to upload a project image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('File too large', 'Please choose an image under 5MB.');
        return;
      }
      setPickedImage(asset);
    } catch {
      Alert.alert('Error', 'Could not open the image library.');
    }
  };

  const handleSaveProject = async () => {
    try {
      const userId = await getUserId();
      const token = await getAuthToken();
      
      if (!userId || !token) {
        Alert.alert('Error', 'Please login to save project');
        return;
      }

      if (!formData.name.trim()) {
        Alert.alert('Error', 'Please enter a project name');
        return;
      }

      if (!formData.description.trim()) {
        Alert.alert('Error', 'Please enter a project description');
        return;
      }

      setSaving(true);

      if (pickedImage) {
        const fd = new FormData();
        appendProjectFormFields(fd, formData);
        const mime = pickedImage.mimeType || 'image/jpeg';
        const fileName = pickedImage.fileName || 'project.jpg';
        if (Platform.OS === 'web' && pickedImage.file instanceof File) {
          fd.append('image', pickedImage.file);
        } else {
          fd.append('image', {
            uri: pickedImage.uri,
            type: mime,
            name: fileName,
          } as any);
        }

        const path = editingProject
          ? `/update-front-profile-project/${editingProject.id}/${userId}`
          : `/store-front-profile-project/${userId}`;
        const method = editingProject ? 'PUT' : 'POST';
        const res = await fetch(buildApiUrl(path), {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: fd,
        });

        let body: Record<string, unknown> = {};
        try {
          body = (await res.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }

        if (parseJsonSuccess(res, body)) {
          Alert.alert('Success', editingProject ? 'Project updated successfully' : 'Project added successfully');
          setPickedImage(null);
          setShowAddForm(false);
          fetchProjects();
        } else {
          const msg =
            (typeof body.message === 'string' && body.message) ||
            ('errors' in body && typeof body.errors === 'object'
              ? JSON.stringify(body.errors)
              : null);
          Alert.alert('Error', msg || 'Failed to save project');
        }
        return;
      }

      let response;
      if (editingProject) {
        response = await apiService.put(`/update-front-profile-project/${editingProject.id}/${userId}`, formData, token);
      } else {
        response = await apiService.post(`/store-front-profile-project/${userId}`, formData, token);
      }
      
      if (response.success) {
        Alert.alert('Success', editingProject ? 'Project updated successfully' : 'Project added successfully');
        setShowAddForm(false);
        fetchProjects();
      } else {
        Alert.alert('Error', response.message || 'Failed to save project');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      Alert.alert('Error', 'Failed to save project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = (projectId: number, title: string) => {
    Alert.alert(
      'Delete Project',
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

              const response = await apiService.post('/delete-front-profile-project', { project_id: projectId }, token);

              if (response.success) {
                setProjects(prev => prev.filter(project => project.id !== projectId));
                Alert.alert('Success', 'Project deleted successfully');
              } else {
                Alert.alert('Error', response.message || 'Failed to delete project');
              }
            } catch (error) {
              console.error('Error deleting project:', error);
              Alert.alert('Error', 'Failed to delete project');
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
        <Text style={styles.loadingText}>Loading projects...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {projects.length === 0 ? (
          <View style={[styles.emptyState, { marginTop: 10 }]}>
            <MaterialIcons name="work" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Projects Found</Text>
            <Text style={styles.emptySubtitle}>Add your first project to showcase your work</Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={handleAddProject}>
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addFirstButtonText}>Add Project</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.sectionHeader, { marginTop: 10 }]}>
              <Text style={styles.sectionTitle}>Your Projects ({projects.length})</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddProject}
              >
                <MaterialIcons name="add" size={20} color="#17D27C" />
                <Text style={styles.addButtonText}>Add Project</Text>
              </TouchableOpacity>
            </View>

            {projects.map((project) => (
              <View key={project.id} style={styles.projectCard}>
                {project.image && (
                  <View style={styles.projectImageContainer}>
                    <Image 
                      source={{ uri: buildAssetUrl(`/project_images/thumb/${project.image}`) }}
                      style={styles.projectImage}
                      resizeMode="cover"
                    />
                  </View>
                )}
                
                <View style={styles.projectHeader}>
                  <View style={styles.projectInfo}>
                    <Text style={styles.projectTitle}>{project.name}</Text>
                    <Text style={styles.projectDuration}>
                      {project.date_start_formatted} - {project.is_on_going ? 'Currently ongoing' : project.date_end_formatted}
                    </Text>
                  </View>
                  <View style={styles.projectActions}>
                    <TouchableOpacity 
                      onPress={() => handleEditProject(project)}
                      style={styles.actionButton}
                    >
                      <MaterialIcons name="edit" size={20} color="#17D27C" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeleteProject(project.id, project.name)}
                      style={styles.actionButton}
                    >
                      <MaterialIcons name="delete" size={20} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <Text style={styles.projectDescription}>{project.description}</Text>
                
               
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
          setProjectDateLayer(null);
          setPickedImage(null);
          setShowAddForm(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.modalContent}>
              {projectDateLayer === 'dateStart' || projectDateLayer === 'dateEnd' ? (
                Platform.OS === 'ios' ? (
                  <>
                    <View style={styles.modalHeader}>
                      <TouchableOpacity onPress={() => setProjectDateLayer(null)} hitSlop={12}>
                        <MaterialIcons name="arrow-back" size={24} color="#666" />
                      </TouchableOpacity>
                      <Text style={[styles.modalTitle, styles.dateLayerTitle]} numberOfLines={1}>
                        {projectDateLayer === 'dateStart' ? 'Start date' : 'End date'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          const ymd = formatYmd(tempProjectDate);
                          if (projectDateLayer === 'dateStart') {
                            setFormData((prev) => ({ ...prev, date_start: ymd }));
                          } else {
                            setFormData((prev) => ({ ...prev, date_end: ymd }));
                          }
                          setProjectDateLayer(null);
                        }}
                        hitSlop={12}
                      >
                        <Text style={styles.dateDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempProjectDate}
                      mode="date"
                      display="spinner"
                      onChange={(_, d) => {
                        if (d) setTempProjectDate(d);
                      }}
                      minimumDate={
                        projectDateLayer === 'dateEnd' ? parseYmd(formData.date_start) : undefined
                      }
                      maximumDate={new Date()}
                    />
                  </>
                ) : null
              ) : (
                <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingProject ? 'Edit Project' : 'Add New Project'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setProjectDateLayer(null);
                    setPickedImage(null);
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
                <Text style={styles.inputLabel}>Project Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
                  placeholder="Enter project name"
                />
              </View>

              {(editingProject?.image || pickedImage) && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {pickedImage ? 'New image preview' : 'Current image'}
                  </Text>
                  <View style={styles.imagePreviewWrap}>
                    <Image
                      source={{
                        uri:
                          pickedImage?.uri ??
                          (editingProject?.image
                            ? buildAssetUrl(`/project_images/thumb/${editingProject.image}`)
                            : ''),
                      }}
                      style={styles.currentImage}
                      resizeMode="cover"
                    />
                  </View>
                  {pickedImage && (
                    <TouchableOpacity style={styles.removeImageBtn} onPress={() => setPickedImage(null)}>
                      <Text style={styles.removeImageBtnText}>Remove selected image</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Project image</Text>
                <Text style={styles.imageHint}>Optional • JPG / PNG • max ~5MB</Text>
                <TouchableOpacity style={styles.imageUploadButton} onPress={pickProjectImage} disabled={saving}>
                  <MaterialIcons name="cloud-upload" size={24} color="#17D27C" />
                  <Text style={styles.imageUploadText}>
                    {pickedImage ? 'Change image' : 'Choose from gallery'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.description}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, description: value }))}
                  placeholder="Describe your project..."
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Project URL</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.url}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, url: value }))}
                  placeholder="https://github.com/username/project"
                />
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateInput}>
                  <Text style={styles.inputLabel}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.dateFieldButton}
                    onPress={() => {
                      setTempProjectDate(parseYmd(formData.date_start));
                      setProjectDateLayer('dateStart');
                    }}
                  >
                    <Text
                      style={[
                        styles.dateFieldText,
                        !formData.date_start && styles.placeholderText,
                      ]}
                    >
                      {formData.date_start || 'YYYY-MM-DD'}
                    </Text>
                    <MaterialIcons name="event" size={22} color="#666" />
                  </TouchableOpacity>
                </View>
                <View style={styles.dateInput}>
                  <Text style={styles.inputLabel}>End Date</Text>
                  <TouchableOpacity
                    style={[styles.dateFieldButton, formData.is_on_going && styles.dateFieldDisabled]}
                    disabled={formData.is_on_going}
                    onPress={() => {
                      if (formData.is_on_going) return;
                      setTempProjectDate(parseYmd(formData.date_end || formData.date_start));
                      setProjectDateLayer('dateEnd');
                    }}
                  >
                    <Text
                      style={[
                        styles.dateFieldText,
                        !formData.date_end && styles.placeholderText,
                      ]}
                    >
                      {formData.date_end || 'YYYY-MM-DD'}
                    </Text>
                    <MaterialIcons name="event" size={22} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => setFormData(prev => ({ ...prev, is_on_going: !prev.is_on_going }))}
              >
                <MaterialIcons 
                  name={formData.is_on_going ? "check-box" : "check-box-outline-blank"} 
                  size={24} 
                  color={formData.is_on_going ? "#17D27C" : "#666"} 
                />
                <Text style={styles.checkboxText}>Currently ongoing</Text>
              </TouchableOpacity>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setProjectDateLayer(null);
                    setPickedImage(null);
                    setShowAddForm(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSaveProject}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingProject ? 'Update' : 'Add'} Project
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
                </>
              )}
            </View>
          </KeyboardAvoidingView>

          {projectDateLayer === 'dateStart' && Platform.OS === 'android' && (
            <DateTimePicker
              value={parseYmd(formData.date_start)}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setProjectDateLayer(null);
                if (event.type === 'set' && date) {
                  setFormData((prev) => ({ ...prev, date_start: formatYmd(date) }));
                }
              }}
              maximumDate={new Date()}
            />
          )}
          {projectDateLayer === 'dateEnd' && Platform.OS === 'android' && !formData.is_on_going && (
            <DateTimePicker
              value={parseYmd(formData.date_end || formData.date_start)}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setProjectDateLayer(null);
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
  projectCard: {
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
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  projectInfo: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  projectDuration: {
    fontSize: 14,
    color: '#666',
  },
  projectActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  projectDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  technologiesContainer: {
    marginBottom: 12,
  },
  technologiesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  technologiesText: {
    fontSize: 14,
    color: '#666',
  },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  urlText: {
    fontSize: 14,
    color: '#17D27C',
    marginLeft: 4,
    textDecorationLine: 'underline',
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
  dateLayerTitle: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  dateDoneText: {
    color: '#17D27C',
    fontWeight: '600',
    fontSize: 16,
  },
  dateFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dateFieldDisabled: {
    opacity: 0.45,
  },
  dateFieldText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
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
    height: 100,
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
    marginTop: 15,
    marginBottom:40,
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
  projectImageContainer: {
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
  },
  projectImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  currentImageContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePreviewWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  imageHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  removeImageBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  removeImageBtnText: {
    color: '#FF6B6B',
    fontSize: 14,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  currentImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#17D27C',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  imageUploadText: {
    fontSize: 14,
    color: '#17D27C',
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default ProjectsSection;
