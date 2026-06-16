import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../../config/api';
import { getUserId, getAuthToken } from '../../utils/userHelper';
import { useTranslation } from 'react-i18next';

interface ApplyJobProps {
  onBack: () => void;
  jobSlug: string;
  jobTitle: string;
  companyName?: string;
  onNavigateToDashboard?: () => void;
  onNavigateToJobSearch?: () => void;
}

interface CV {
  id: number;
  title: string;
  file_name: string;
  is_default: boolean;
}

interface JobQuestion {
  id: number;
  job_id: number;
  question_title: string;
  order: number;
  created_at: string;
  updated_at: string;
}

interface ApplyJobData {
  cv_id: number;
  current_salary: string;
  expected_salary: string;
  currency: string;
  question_answers: { [questionId: number]: string };
}

const ApplyJob: React.FC<ApplyJobProps> = ({
  onBack,
  jobSlug,
  jobTitle,
  companyName,
  onNavigateToDashboard,
  onNavigateToJobSearch
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cvs, setCvs] = useState<CV[]>([]);
  const [jobQuestions, setJobQuestions] = useState<JobQuestion[]>([]);
  const [showCVDropdown, setShowCVDropdown] = useState(false);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [applicationData, setApplicationData] = useState<any>(null);
  const [formData, setFormData] = useState<ApplyJobData>({
    cv_id: 0,
    current_salary: '',
    expected_salary: '',
    currency: 'USD',
    question_answers: {},
  });


  // Fetch job questions and user's CVs
  const fetchJobData = async () => {
    try {
      const token = await getAuthToken();
      const userId = await getUserId();

      setLoading(true);

      // Fetch job questions from apply endpoint
      const applyUrl = buildApiUrl(`/apply/${jobSlug}`);
      const applyResponse = await fetch(applyUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (applyResponse.ok) {
        const applyResponseText = await applyResponse.text();
        try {
          const applyData = JSON.parse(applyResponseText);
          if (applyData.success && applyData.data && applyData.data.job_questions) {
            setJobQuestions(applyData.data.job_questions);
          }
        } catch (parseError) {
          console.error('Error parsing apply job response:', parseError);
        }
      }

      // Fetch user's CVs
      const apiUrl = buildApiUrl(`/show-front-profile-cvs/${userId}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });


      if (response.ok) {
        const responseText = await response.text();

        try {
          const data = JSON.parse(responseText);

          if (data.success && data.data) {
            setCvs(data.data);
            // Set default CV if available
            const defaultCV = data.data.find((cv: CV) => cv.is_default);
            if (defaultCV) {
              setSelectedCV(defaultCV);
              setFormData(prev => ({ ...prev, cv_id: defaultCV.id }));
            }
          } else if (data.success && Array.isArray(data.data)) {
            // Handle case where data is directly an array
            setCvs(data.data);
            const defaultCV = data.data.find((cv: CV) => cv.is_default);
            if (defaultCV) {
              setSelectedCV(defaultCV);
              setFormData(prev => ({ ...prev, cv_id: defaultCV.id }));
            }
          } else {
            setCvs([]);
          }
        } catch (parseError) {

          // Check if it's an HTML error page
          if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
            Alert.alert(
              t('server_error'),
              t('server_html_error_msg'),
              [
                { text: 'OK', onPress: () => onBack() }
              ]
            );
          } else {
            Alert.alert(t('error'), t('failed_to_load_cvs'));
          }
        }
      } else {
        const errorText = await response.text();

        // Check if it's an authentication error
        if (response.status === 401 || response.status === 403) {
          Alert.alert(
            t('authentication_error'),
            t('session_expired_msg'),
            [
              { text: 'OK', onPress: () => onBack() }
            ]
          );
        } else if (response.status === 404) {
          Alert.alert(
            t('api_error'),
            t('cv_endpoint_not_found'),
            [
              { text: 'OK', onPress: () => onBack() }
            ]
          );
        } else {
          Alert.alert(t('error'), `${t('failed_to_load_cvs')}: ${response.status}`);
        }
      }
    } catch (error) {
      Alert.alert(t('error'), t('failed_to_load_cvs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
  }, []);

  const handleInputChange = (field: keyof ApplyJobData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQuestionAnswer = (questionId: number, answer: string) => {
    setFormData(prev => ({
      ...prev,
      question_answers: {
        ...prev.question_answers,
        [questionId]: answer,
      },
    }));
  };

  const handleCVSelect = (cv: CV) => {
    setSelectedCV(cv);
    setFormData(prev => ({ ...prev, cv_id: cv.id }));
    setShowCVDropdown(false);
  };

  const validateForm = (): boolean => {
    if (!selectedCV || !formData.cv_id || formData.cv_id === 0) {
      Alert.alert(t('validation_error'), t('please_select_cv'));
      return false;
    }
    if (!formData.current_salary || !formData.current_salary.trim()) {
      Alert.alert(t('validation_error'), t('please_enter_current_salary'));
      return false;
    }
    if (!formData.expected_salary || !formData.expected_salary.trim()) {
      Alert.alert(t('validation_error'), t('please_enter_expected_salary'));
      return false;
    }
    if (!formData.currency || !formData.currency.trim()) {
      Alert.alert(t('validation_error'), t('please_enter_currency'));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert(t('error'), t('please_login_to_apply'));
        onBack();
        return;
      }

      setSubmitting(true);

      const apiUrl = buildApiUrl(`/apply/${jobSlug}`);
      const requestBody: any = {
        cv_id: formData.cv_id,
        current_salary: formData.current_salary,
        expected_salary: formData.expected_salary,
        currency: formData.currency,
      };

      // Add question answers if any questions exist (filter out empty answers)
      const nonEmptyAnswers: { [questionId: number]: string } = {};
      Object.keys(formData.question_answers).forEach((questionId) => {
        const answer = formData.question_answers[Number(questionId)];
        if (answer && answer.trim()) {
          nonEmptyAnswers[Number(questionId)] = answer.trim();
        }
      });

      if (Object.keys(nonEmptyAnswers).length > 0) {
        requestBody.question_answers = nonEmptyAnswers;
      }

      // Log request for debugging
      console.log('📤 Submitting job application:', {
        url: apiUrl,
        jobSlug,
        requestBody: {
          ...requestBody,
          question_answers: requestBody.question_answers ? Object.keys(requestBody.question_answers).length + ' answers' : 'none'
        }
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();

      // Check if it's an HTML error page
      if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
        Alert.alert(
          t('server_error'),
          t('server_html_error_msg'),
          [
            { text: 'OK', onPress: () => onBack() }
          ]
        );
        setSubmitting(false);
        return;
      }

      try {
        const data = JSON.parse(responseText);

        if (response.ok) {
          if (data.success) {
            setApplicationData(data.data);
            setShowSuccessScreen(true);
          } else {
            // Show detailed error message from server
            const errorMessage = data.message || t('failed_to_submit_application');
            const errorDetails = data.errors ? `\n\nValidation errors:\n${JSON.stringify(data.errors, null, 2)}` : '';
            Alert.alert(t('error'), errorMessage + errorDetails);
          }
        } else {
          // Handle error responses
          const errorMessage = data.message || `${t('failed_to_submit_application')} (${response.status})`;
          const errorDetails = data.errors ? `\n\nErrors:\n${JSON.stringify(data.errors, null, 2)}` : '';

          // Show more specific error messages based on status code
          let userMessage = errorMessage;
          if (response.status === 401) {
            userMessage = t('session_expired_msg');
          } else if (response.status === 404) {
            userMessage = t('job_not_found_msg');
          } else if (response.status === 400) {
            userMessage = data.message || t('invalid_request_msg');
          } else if (response.status === 422) {
            userMessage = t('validation_failed_msg') + errorDetails;
          } else if (response.status === 500) {
            userMessage = t('server_error_msg');
          }

          Alert.alert(t('error'), userMessage);
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        console.error('Response text:', responseText);
        Alert.alert(t('error'), t('failed_to_submit_application'));
      }
    } catch (error: any) {
      console.error('Error submitting application:', error);
      const errorMessage = error.message || 'Network error occurred';
      Alert.alert(t('error'), t('network_error_application'));
    } finally {
      setSubmitting(false);
    }
  };

  // Success Screen Component
  if (showSuccessScreen) {
    return (
      <LinearGradient colors={['#F5F6FD', '#E4F4EC']} style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successCard}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={80} color="#17D27C" />
            </View>

            <Text style={styles.successTitle}>{t('application_submitted_title')}</Text>
            <Text style={styles.successSubtitle}>
              {t('application_submitted_success')}
            </Text>

            {applicationData && (
              <View style={styles.applicationDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('job_title_label')}</Text>
                  <Text style={styles.detailValue}>{applicationData.job_title}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('application_id_label')}</Text>
                  <Text style={styles.detailValue}>#{applicationData.application_id}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('applied_at_label')}</Text>
                  <Text style={styles.detailValue}>
                    {new Date(applicationData.applied_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.successActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => {
                  if (onNavigateToDashboard) {
                    onNavigateToDashboard();
                  } else {
                    onBack();
                  }
                }}
              >
                <MaterialIcons name="dashboard" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>{t('go_to_dashboard')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => {
                  if (onNavigateToJobSearch) {
                    onNavigateToJobSearch();
                  } else {
                    onBack();
                  }
                }}
              >
                <MaterialIcons name="search" size={20} color="#17D27C" />
                <Text style={styles.secondaryButtonText}>{t('search_more_jobs')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (loading) {
    return (
      <LinearGradient colors={['#F5F6FD', '#E4F4EC']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('apply_for_job')}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#17D27C" />
          <Text style={styles.loadingText}>{t('loading_application_form')}</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#F5F6FD', '#E4F4EC']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('apply_for_job')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Job Information Card */}
        <View style={styles.jobInfoCard}>
          <Text style={styles.jobInfoTitle}>{t('you_are_about_to_apply')}</Text>
          <Text style={styles.jobTitle}>{jobTitle}</Text>
          {companyName && (
            <Text style={styles.companyName}>{t('at_company', { company: companyName })}</Text>
          )}
        </View>

        {/* Application Form */}
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{t('application_details')}</Text>
          </View>

          {/* CV Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('select_cv')}</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowCVDropdown(true)}
            >
              <Text style={[styles.dropdownText, !selectedCV && styles.placeholderText]}>
                {selectedCV ? selectedCV.title : t('select_cv')}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Salary Fields */}
          <View style={styles.salaryRow}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>{t('current_salary_monthly')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('current_salary_monthly')}
                placeholderTextColor="#999"
                value={formData.current_salary}
                onChangeText={(value) => handleInputChange('current_salary', value)}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>{t('expected_salary_monthly')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('expected_salary_monthly')}
                placeholderTextColor="#999"
                value={formData.expected_salary}
                onChangeText={(value) => handleInputChange('expected_salary', value)}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Currency */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('currency')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder="USD"
              placeholderTextColor="#999"
              value={formData.currency}
              onChangeText={(value) => handleInputChange('currency', value)}
            />
          </View>

          {/* Job Questions */}
          {jobQuestions.length > 0 && (
            <View style={styles.questionsSection}>
              <Text style={styles.questionsTitle}>{t('additional_questions')}</Text>
              {jobQuestions.map((question) => (
                <View key={question.id} style={styles.questionItem}>
                  <Text style={styles.questionLabel}>{question.question_title}</Text>
                  <TextInput
                    style={[styles.textInput, styles.questionInput]}
                    placeholder={t('your_answer')}
                    placeholderTextColor="#999"
                    value={formData.question_answers[question.id] || ''}
                    onChangeText={(value) => handleQuestionAnswer(question.id, value)}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              ))}
            </View>
          )}

          {/* Apply Button */}
          <View style={styles.applyButtonContainer}>
            <TouchableOpacity
              style={[styles.applyButton, submitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.applyButtonText}>{t('apply_on_job')}</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>



      {/* CV Selection Modal */}
      <Modal
        visible={showCVDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCVDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('select_cv')}</Text>
              <TouchableOpacity onPress={() => setShowCVDropdown(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cvList}>
              {cvs.map((cv) => (
                <TouchableOpacity
                  key={cv.id}
                  style={[
                    styles.cvItem,
                    selectedCV?.id === cv.id && styles.selectedCVItem
                  ]}
                  onPress={() => handleCVSelect(cv)}
                >
                  <View style={styles.cvInfo}>
                    <Text style={styles.cvTitle}>{cv.title}</Text>
                    <Text style={styles.cvFileName}>{cv.file_name}</Text>
                    {cv.is_default && (
                      <Text style={styles.defaultLabel}>{t('default_label')}</Text>
                    )}
                  </View>
                  {selectedCV?.id === cv.id && (
                    <MaterialIcons name="check" size={24} color="#17D27C" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {cvs.length === 0 && (
              <View style={styles.noCVsContainer}>
                <MaterialIcons name="description" size={48} color="#999" />
                <Text style={styles.noCVsText}>{t('no_cvs_found')}</Text>
                <Text style={styles.noCVsSubtext}>
                  {t('please_upload_cv')}
                </Text>
                <TouchableOpacity
                  style={styles.uploadCVButton}
                  onPress={() => {
                    Alert.alert(
                      t('upload_cv'),
                      t('upload_cv_msg'),
                      [
                        { text: t('cancel'), style: 'cancel' },
                        {
                          text: t('go_to_profile'),
                          onPress: () => {
                            // You can add navigation to profile here if needed
                            onBack();
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.uploadCVButtonText}>{t('go_to_profile')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  jobInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  jobInfoTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 16,
    color: '#17D27C',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  halfWidth: {
    flex: 1,
    marginHorizontal: 5,
  },
  salaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  bottomSpacer: {
    height: 100,
  },
  applyButtonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  applyButton: {
    backgroundColor: '#17D27C',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    maxHeight: '70%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cvList: {
    maxHeight: 300,
  },
  cvItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedCVItem: {
    backgroundColor: '#F0FDF4',
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
    marginBottom: 4,
  },
  defaultLabel: {
    fontSize: 12,
    color: '#17D27C',
    fontWeight: '600',
  },
  noCVsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noCVsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noCVsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadCVButton: {
    backgroundColor: '#17D27C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  uploadCVButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Success Screen Styles
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    width: '100%',
    maxWidth: 400,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  applicationDetails: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#17D27C',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#17D27C',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#17D27C',
    fontSize: 16,
    fontWeight: '600',
  },
  questionsSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  questionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  questionItem: {
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  questionInput: {
    minHeight: 100,
    paddingTop: 14,
  },
});

export default ApplyJob;
