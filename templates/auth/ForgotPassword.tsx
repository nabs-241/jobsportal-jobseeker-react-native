import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import LanguageDropdown from '../LanguageDropdown';
import { buildApiUrl, API_CONFIG } from '../../config/api';

interface ForgotPasswordProps {
  userType?: 'candidate' | 'company';
  onBack: () => void;
  onSuccess: (email: string) => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ userType = 'candidate', onBack, onSuccess }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const forgotEndpoint = userType === 'company'
    ? API_CONFIG.ENDPOINTS.COMPANY.FORGOT_PASSWORD
    : '/forgot-password';

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert(t('error'), t('enter_email_address_error'));
      return;
    }

    if (!email.includes('@')) {
      Alert.alert(t('error'), t('enter_valid_email_error'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(buildApiUrl(forgotEndpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      let responseData: { success?: boolean; message?: string; error?: string } = {};
        try {
          responseData = await response.json();
        } catch (_e) {
          Alert.alert(t('error'), t('network_error_retry'));
          return;
        }

      if (response.ok && responseData.success) {
        Alert.alert(
          t('success'),
          t('verification_code_sent_msg'),
          [
            {
              text: t('ok'),
              onPress: () => onSuccess(email.trim()),
            },
          ]
        );
      } else {
        const msg = responseData.message || t('failed_send_code');
        const detail = responseData.error ? `\n\n${responseData.error}` : '';
        Alert.alert(t('error'), msg + detail);
      }
    } catch (error) {
      Alert.alert(t('error'), t('network_error_retry'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#F5F6FD', '#E4F4EC']}
      style={styles.container}
    >
      <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <MaterialIcons name="arrow-back" size={24} color="#555" />
            </TouchableOpacity>
            <LanguageDropdown />
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="lock-reset" size={64} color="#17D27C" />
            </View>

            <View style={styles.accountBadge}>
              <MaterialIcons
                name={userType === 'company' ? 'business' : 'person'}
                size={16}
                color="#fff"
                style={styles.accountBadgeIcon}
              />
              <Text style={styles.accountBadgeText}>
                {userType === 'company' ? t('reset_password_account_badge_company') : t('reset_password_account_badge_candidate')}
              </Text>
            </View>

            <Text style={styles.title}>{t('forgot_password')}</Text>
            <Text style={styles.subtitle}>
              {t('forgot_password_subtitle')}
            </Text>

            {/* Email Field */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('email_address_label')}</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('enter_email_placeholder')}
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text style={styles.submitButtonText}>
                  {isLoading ? t('sending') : t('send_verification_code')}
                </Text>
              </TouchableOpacity>

              {/* Back to Login */}
              <TouchableOpacity style={styles.backToLoginButton} onPress={onBack}>
                <MaterialIcons name="arrow-back" size={16} color="#17D27C" />
                <Text style={styles.backToLoginText}>{t('back_to_login')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#17D27C',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  accountBadgeIcon: {
    marginRight: 6,
  },
  accountBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#17D27C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#17D27C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  backToLoginText: {
    color: '#17D27C',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default ForgotPassword;
