import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { getUserId, getAuthToken } from '../../../utils/userHelper';
import apiService from '../../../services/apiService';
import { buildApiUrl } from '../../../config/api';

const CV_PICKER_MIME_TYPES: string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];

const CV_ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
]);

function mimeFromFilename(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  return map[ext] ?? 'application/octet-stream';
}

function isAllowedCvAsset(asset: DocumentPickerAsset): boolean {
  const ext = asset.name.split('.').pop()?.toLowerCase() ?? '';
  if (CV_ALLOWED_EXTENSIONS.has(ext)) return true;
  const mime = asset.mimeType?.toLowerCase();
  if (mime && CV_PICKER_MIME_TYPES.includes(mime)) return true;
  return false;
}

interface CVSectionProps {
  onBack: () => void;
  onCVDeleted?: () => void; // Callback to refresh CV completeness check
}

interface CV {
  id: number;
  title: string;
  file_name: string;
  is_default: boolean;
}

const CVSection: React.FC<CVSectionProps> = ({ onBack, onCVDeleted }) => {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCV, setEditingCV] = useState<CV | null>(null);
  const [cvTitle, setCvTitle] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPickerAsset | null>(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    fetchCVs();
  }, []);

  const fetchCVs = async () => {
    try {
      setLoading(true);
      const userId = await getUserId();
      const token = await getAuthToken();
      
      if (!userId || !token) {
        Alert.alert('Error', 'Please login to view your CVs');
        return;
      }

      const response = await apiService.post(`/show-front-profile-cvs/${userId}`, {}, token);
      
      if (response.success && response.data) {
        setCvs(response.data as CV[]);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch CVs');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch CVs. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteCV = async (cvId: number, title: string) => {
    Alert.alert(
      'Delete CV',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const token = await getAuthToken();
              if (!token) {
                Alert.alert('Error', 'Please login to delete CV');
                return;
              }

              // Try multiple possible delete endpoints since the API documentation doesn't list a CV delete endpoint
              let response;
              let deleteSuccessful = false;
              
              // Try different endpoint patterns
              const deleteAttempts = [
                // Pattern 1: DELETE method with cv_id in body (correct API pattern)
                () => apiService.delete('/delete-front-profile-cv', token, { cv_id: cvId }),
                // Pattern 2: POST with cv_id (fallback)
                () => apiService.post('/delete-front-profile-cv', { cv_id: cvId }, token),
                // Pattern 3: POST with id
                () => apiService.post('/delete-front-profile-cv', { id: cvId }, token),
                // Pattern 4: POST with user ID in endpoint
                async () => {
                  const userId = await getUserId();
                  return apiService.post(`/delete-front-profile-cv/${userId}`, { cv_id: cvId }, token);
                }
              ];

              for (const attempt of deleteAttempts) {
                try {
                  response = await attempt();
                  if (response.success) {
                    deleteSuccessful = true;
                    break;
                  }
                } catch (error) {
                  console.log('Delete attempt failed:', error);
                  continue;
                }
              }

              if (deleteSuccessful) {
                setCvs(prev => prev.filter(cv => cv.id !== cvId));
                Alert.alert('Success', 'CV deleted successfully');
                // Call the callback to refresh CV completeness check
                onCVDeleted?.();
              } else {
                // If all attempts failed, show a helpful message
                Alert.alert(
                  'Delete Not Available', 
                  'CV deletion is not currently available on the server. This feature may be under development. Please contact support if you need to delete your CV.',
                  [
                    { text: 'OK', style: 'default' }
                  ]
                );
              }
            } catch (error: any) {
              console.error('CV Delete Error:', error);
              Alert.alert(
                'Delete Not Available', 
                'CV deletion is not currently available. Please contact support or try again later.',
                [
                  { text: 'OK', style: 'default' }
                ]
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDownloadCV = (cv: CV) => {
    Alert.alert(
      'Download CV',
      `Download "${cv.title}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Download', 
          onPress: () => {
            // For now, show an alert that download functionality will be implemented
            // In the future, this could open the file in a browser or download it
            Alert.alert('Download CV', 'Download functionality will be implemented soon');
          }
        }
      ]
    );
  };

  const handleAddCV = () => {
    setEditingCV(null);
    setCvTitle('');
    setIsDefault(false);
    setSelectedFile(null);
    setFileName('');
    setShowModal(true);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: CV_PICKER_MIME_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!isAllowedCvAsset(asset)) {
        Alert.alert(
          'Unsupported file',
          'Please choose a PDF, Word document (.doc or .docx), or an image (e.g. JPG, PNG).'
        );
        return;
      }
      setSelectedFile(asset);
      setFileName(asset.name);
    } catch {
      Alert.alert('Error', 'Could not open the file picker. Please try again.');
    }
  };

  const handleClearPickedFile = () => {
    setSelectedFile(null);
    setFileName('');
  };

  const handleEditCV = (cv: CV) => {
    setEditingCV(cv);
    setCvTitle(cv.title);
    setIsDefault(cv.is_default);
    setSelectedFile(null);
    setFileName('');
    setShowModal(true);
  };

  const handleSaveCV = async () => {
    if (!cvTitle.trim()) {
      Alert.alert('Error', 'Please enter a CV title');
      return;
    }

    if (!editingCV && !selectedFile) {
      Alert.alert('Error', 'Please choose a file (PDF, Word, or image)');
      return;
    }

    if (!editingCV && selectedFile && !isAllowedCvAsset(selectedFile)) {
      Alert.alert('Error', 'Please choose a PDF, Word document, or image file');
      return;
    }

    try {
      setUploading(true);
      const userId = await getUserId();
      const token = await getAuthToken();
      
      if (!userId || !token) {
        Alert.alert('Error', 'Please login to save CV');
        return;
      }

      if (editingCV) {
        // Update existing CV (title and default status only)
        const response = await apiService.post(`/update-front-profile-cv/${editingCV.id}/${userId}`, {
          title: cvTitle,
          is_default: isDefault ? 1 : 0
        }, token);

        if (response.success) {
          setCvs(prev => prev.map(cv => 
            cv.id === editingCV.id 
              ? { ...cv, title: cvTitle, is_default: isDefault }
              : { ...cv, is_default: false } // Remove default from others if this is set as default
          ));
          Alert.alert('Success', 'CV updated successfully');
          setShowModal(false);
        } else {
          Alert.alert('Error', response.message || 'Failed to update CV');
        }
        return;
      }

      const file = selectedFile!;
      const formData = new FormData();
      formData.append('title', cvTitle);
      formData.append('is_default', isDefault ? '1' : '0');
      const mime = file.mimeType || mimeFromFilename(file.name);
      if (Platform.OS === 'web' && file.file instanceof File) {
        formData.append('cv_file', file.file);
      } else {
        formData.append('cv_file', {
          uri: file.uri,
          type: mime,
          name: file.name,
        } as any);
      }

      const response = await fetch(buildApiUrl(`/store-front-profile-cv/${userId}`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        await fetchCVs();
        onCVDeleted?.();
        Alert.alert('Success', 'CV uploaded successfully');
        setShowModal(false);
        setSelectedFile(null);
        setFileName('');
      } else {
        Alert.alert('Error', result.message || 'Failed to upload CV');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save CV');
    } finally {
      setUploading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCV(null);
    setCvTitle('');
    setIsDefault(false);
    setSelectedFile(null);
    setFileName('');
  };

  const handleUploadCV = () => {
    handleAddCV();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17D27C" />
        <Text style={styles.loadingText}>Loading CVs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {cvs.length === 0 ? (
          <View style={[styles.emptyState, { marginTop: 10 }]}>
            <MaterialIcons name="description" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No CVs Found</Text>
            <Text style={styles.emptySubtitle}>Upload your first CV to get started</Text>
            <TouchableOpacity style={styles.uploadFirstButton} onPress={handleUploadCV}>
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.uploadFirstButtonText}>Upload CV</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.sectionHeader, { marginTop: 10 }]}>
              <Text style={styles.sectionTitle}>Your CVs ({cvs.length})</Text>
              <TouchableOpacity onPress={handleUploadCV} style={styles.addButton}>
                <MaterialIcons name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add New</Text>
              </TouchableOpacity>
            </View>

            {cvs.map((cv) => (
              <View key={cv.id} style={styles.cvCard}>
                <View style={styles.cvHeader}>
                  <View style={styles.cvInfo}>
                    <Text style={styles.cvTitle}>{cv.title}</Text>
                  </View>
                  <View style={styles.cvActions}>
                    {cv.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                    <TouchableOpacity 
                      onPress={() => handleDownloadCV(cv)}
                      style={styles.actionButton}
                    >
                      <MaterialIcons name="download" size={20} color="#2196F3" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleEditCV(cv)}
                      style={styles.actionButton}
                    >
                      <MaterialIcons name="edit" size={20} color="#FF9800" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleDeleteCV(cv.id, cv.title)}
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

      {/* Add/Edit CV Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCV ? 'Edit CV' : 'Add CV'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CV Title</Text>
                <TextInput
                  style={styles.textInput}
                  value={cvTitle}
                  onChangeText={setCvTitle}
                  placeholder="CV title"
                  placeholderTextColor="#999"
                />
              </View>

              {editingCV && (
                <View style={styles.fileDisplayGroup}>
                  <Text style={styles.inputLabel}>Current File</Text>
                  <View style={styles.currentFileContainer}>
                    <MaterialIcons name="description" size={20} color="#666" />
                    <Text style={styles.currentFileName}>{editingCV.file_name}</Text>
                  </View>
                </View>
              )}

              {!editingCV && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CV file</Text>
                  <Text style={styles.fileHint}>
                    PDF, Word (.doc, .docx), or images (JPG, PNG, etc.)
                  </Text>
                  <TouchableOpacity style={styles.filePickerButton} onPress={handlePickFile} activeOpacity={0.7}>
                    <MaterialIcons name="upload-file" size={22} color="#17D27C" />
                    <Text style={styles.filePickerText}>
                      {fileName ? 'Change file' : 'Tap to choose a file'}
                    </Text>
                  </TouchableOpacity>
                  {fileName ? (
                    <View style={styles.pickedFileRow}>
                      <Text style={styles.fileNameText} numberOfLines={2}>
                        {fileName}
                      </Text>
                      <TouchableOpacity onPress={handleClearPickedFile} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialIcons name="close" size={20} color="#666" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              )}

              <View style={styles.radioGroup}>
                <Text style={styles.radioLabel}>Is default?</Text>
                <View style={styles.radioOptions}>
                  <TouchableOpacity 
                    style={styles.radioOption}
                    onPress={() => setIsDefault(true)}
                  >
                    <MaterialIcons 
                      name={isDefault ? "radio-button-checked" : "radio-button-unchecked"} 
                      size={20} 
                      color={isDefault ? "#17D27C" : "#666"} 
                    />
                    <Text style={styles.radioText}>Yes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.radioOption}
                    onPress={() => setIsDefault(false)}
                  >
                    <MaterialIcons 
                      name={!isDefault ? "radio-button-checked" : "radio-button-unchecked"} 
                      size={20} 
                      color={!isDefault ? "#17D27C" : "#666"} 
                    />
                    <Text style={styles.radioText}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, uploading && styles.disabledButton]} 
                onPress={handleSaveCV}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingCV ? 'Update' : 'Add'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  uploadFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17D27C',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  uploadFirstButtonText: {
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
    backgroundColor: '#17D27C',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  cvCard: {
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
  cvHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cvInfo: {
    flex: 1,
  },
  cvTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cvFileName: {
    fontSize: 14,
    color: '#666',
  },
  cvActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  defaultBadge: {
    backgroundColor: '#17D27C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  defaultText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  checkboxGroup: {
    marginBottom: 10,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#17D27C',
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  // File upload styles
  fileDisplayGroup: {
    marginBottom: 20,
  },
  currentFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  currentFileName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  filePickerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  fileHint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 10,
  },
  pickedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingVertical: 4,
    paddingRight: 4,
  },
  fileNameText: {
    fontSize: 13,
    color: '#17D27C',
    flex: 1,
    marginRight: 8,
  },
  // Radio button styles
  radioGroup: {
    marginBottom: 20,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  radioOptions: {
    flexDirection: 'row',
    gap: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
});

export default CVSection;
