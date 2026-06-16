import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getAuthToken } from '../../services/authStorage';
import { buildApiUrl } from '../../config/api';
import Header from '../Header';

interface ReportAbuseProps {
  jobSlug: string;
  jobTitle?: string;
  companyName?: string;
  onBack: () => void;
  onNavigateToThanks: () => void;
}

interface ReportAbuseForm {
  your_name: string;
  your_email: string;
  job_url: string;
  'g-recaptcha-response': string;
}


export default function ReportAbuse({ jobSlug, jobTitle, companyName, onBack, onNavigateToThanks }: ReportAbuseProps) {
  const [formData, setFormData] = useState<ReportAbuseForm>({
    your_name: '',
    your_email: '',
    job_url: '',
    'g-recaptcha-response': '', // Empty string for mobile app
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<ReportAbuseForm>>({});

  // Pre-fill job URL with job details
  useEffect(() => {
    if (jobSlug) {
      const jobUrl = `${buildApiUrl('').replace('/api', '')}/job/${jobSlug}`;
      setFormData(prev => ({ ...prev, job_url: jobUrl }));
    }
  }, [jobSlug]);

  const validateForm = (): boolean => {
    const newErrors: Partial<ReportAbuseForm> = {};

    if (!formData.your_name.trim()) {
      newErrors.your_name = 'Your name is required';
    }

    if (!formData.your_email.trim()) {
      newErrors.your_email = 'Your email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.your_email)) {
      newErrors.your_email = 'Please enter a valid email address';
    }

    if (!formData.job_url.trim()) {
      newErrors.job_url = 'Job URL is required';
    } else if (!/^https?:\/\/.+/.test(formData.job_url)) {
      newErrors.job_url = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    try {
      setIsLoading(true);
      
      const authToken = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const apiUrl = buildApiUrl(`/report-abuse/${jobSlug}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        Alert.alert('Error', `Server returned invalid response: ${responseText}`);
        return;
      }

      if (response.ok && data.success) {
        // Navigate directly to thanks screen without showing alert
        onNavigateToThanks();
      } else {
        Alert.alert('Error', data.message || `Failed to submit report. Status: ${response.status}`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to submit report: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ReportAbuseForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Header
          title="Report Abuse"
          subtitle={jobTitle}
          onBack={onBack}
          onMenuPress={() => {}}
          showBack={true}
          showMenu={false}
        />

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <View style={styles.infoCard}>
              <MaterialIcons name="info" size={24} color="#17D27C" />
              <Text style={styles.infoText}>
                Help us maintain a safe and professional job board by reporting inappropriate content.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Name *</Text>
              <TextInput
                style={[styles.input, errors.your_name && styles.inputError]}
                value={formData.your_name}
                onChangeText={(value) => handleInputChange('your_name', value)}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
              />
              {errors.your_name && (
                <Text style={styles.errorText}>{errors.your_name}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Email *</Text>
              <TextInput
                style={[styles.input, errors.your_email && styles.inputError]}
                value={formData.your_email}
                onChangeText={(value) => handleInputChange('your_email', value)}
                placeholder="Enter your email address"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.your_email && (
                <Text style={styles.errorText}>{errors.your_email}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Job URL *</Text>
              <TextInput
                style={[styles.input, errors.job_url && styles.inputError]}
                value={formData.job_url}
                onChangeText={(value) => handleInputChange('job_url', value)}
                placeholder="https://example.com/job/..."
                placeholderTextColor="#999"
                keyboardType="url"
                autoCapitalize="none"
              />
              {errors.job_url && (
                <Text style={styles.errorText}>{errors.job_url}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Your report will be reviewed by our moderation team. We take all reports seriously and will investigate accordingly. The job URL will help us identify the specific job posting you're reporting.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 5,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#17D27C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#17D27C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
