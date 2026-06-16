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
import { getAuthToken } from '../../services/authStorage';
import { buildApiUrl } from '../../config/api';
import Header from '../Header';

interface EmailToFriendProps {
  jobSlug: string;
  jobTitle?: string;
  companyName?: string;
  onBack: () => void;
  onNavigateToThanks: () => void;
}

interface EmailToFriendForm {
  friend_name: string;
  friend_email: string;
  your_name: string;
  your_email: string;
  message: string;
}



export default function EmailToFriend({ jobSlug, jobTitle, companyName, onBack, onNavigateToThanks }: EmailToFriendProps) {
  const [formData, setFormData] = useState<EmailToFriendForm>({
    friend_name: '',
    friend_email: '',
    your_name: '',
    your_email: '',
    message: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<EmailToFriendForm>>({});

  // Pre-fill message with job details
  useEffect(() => {
    if (jobTitle && companyName) {
      const defaultMessage = `Hi,\n\nI found this job opportunity that might interest you:\n\nJob: ${jobTitle}\nCompany: ${companyName}\n\nCheck it out!`;
      setFormData(prev => ({
        ...prev,
        message: defaultMessage
      }));
    }
  }, [jobTitle, companyName]);

  const validateForm = (): boolean => {
    const newErrors: Partial<EmailToFriendForm> = {};

    if (!formData.friend_name.trim()) {
      newErrors.friend_name = 'Friend\'s name is required';
    }

    if (!formData.friend_email.trim()) {
      newErrors.friend_email = 'Friend\'s email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.friend_email)) {
      newErrors.friend_email = 'Please enter a valid email address';
    }

    if (!formData.your_name.trim()) {
      newErrors.your_name = 'Your name is required';
    }

    if (!formData.your_email.trim()) {
      newErrors.your_email = 'Your email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.your_email)) {
      newErrors.your_email = 'Please enter a valid email address';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const token = await getAuthToken();
      
      const response = await fetch(buildApiUrl(`/email-to-friend/${jobSlug}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          'Success!',
          'Email sent successfully to your friend.',
          [
            {
              text: 'OK',
              onPress: () => {
                onNavigateToThanks();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Error',
          data.message || 'Failed to send email. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Network error. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormField = (field: keyof EmailToFriendForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header
        title="Email to Friend"
        onBack={onBack}
        onMenuPress={() => {}}
        showBack={true}
        showMenu={false}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Share this job with a friend</Text>
          
          {jobTitle && (
            <View style={styles.jobInfo}>
              <Text style={styles.jobInfoTitle}>Job: {jobTitle}</Text>
              {companyName && (
                <Text style={styles.jobInfoCompany}>Company: {companyName}</Text>
              )}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Friend's Name *</Text>
            <TextInput
              style={[styles.input, errors.friend_name && styles.inputError]}
              value={formData.friend_name}
              onChangeText={(value) => updateFormField('friend_name', value)}
              placeholder="Enter your friend's name"
              placeholderTextColor="#999"
            />
            {errors.friend_name && (
              <Text style={styles.errorText}>{errors.friend_name}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Friend's Email *</Text>
            <TextInput
              style={[styles.input, errors.friend_email && styles.inputError]}
              value={formData.friend_email}
              onChangeText={(value) => updateFormField('friend_email', value)}
              placeholder="Enter your friend's email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.friend_email && (
              <Text style={styles.errorText}>{errors.friend_email}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name *</Text>
            <TextInput
              style={[styles.input, errors.your_name && styles.inputError]}
              value={formData.your_name}
              onChangeText={(value) => updateFormField('your_name', value)}
              placeholder="Enter your name"
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
              onChangeText={(value) => updateFormField('your_email', value)}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.your_email && (
              <Text style={styles.errorText}>{errors.your_email}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.textArea, errors.message && styles.inputError]}
              value={formData.message}
              onChangeText={(value) => updateFormField('message', value)}
              placeholder="Write a message to your friend"
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            {errors.message && (
              <Text style={styles.errorText}>{errors.message}</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Send Email</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  jobInfo: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  jobInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  jobInfoCompany: {
    fontSize: 14,
    color: '#666',
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
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#333',
    height: 120,
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#667eea',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
