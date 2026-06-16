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
import { buildApiUrl, API_CONFIG } from '../../config/api';
import { useTranslation } from 'react-i18next';
import LanguageDropdown from '../LanguageDropdown';

interface ResetPasswordProps {
  email: string;
  resetCode: string;
  userType?: 'candidate' | 'company';
  onBack: () => void;
  onSuccess: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ email, resetCode, userType = 'candidate', onBack, onSuccess }) => {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return t('password_min_length');
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return t('password_lowercase');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return t('password_uppercase');
    }
    if (!/(?=.*\d)/.test(password)) {
      return t('password_number');
    }
    return null;
  };

  const handleSubmit = async () => {
    // Validation
    if (!newPassword.trim()) {
      Alert.alert(t('error'), t('enter_new_password'));
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert(t('error'), t('confirm_new_password'));
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      Alert.alert(t('error'), passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('error'), t('passwords_do_not_match'));
      return;
    }

    setIsLoading(true);

    const resetEndpoint = userType === 'company'
      ? API_CONFIG.ENDPOINTS.COMPANY.RESET_PASSWORD
      : '/reset-password';

    try {
      const response = await fetch(buildApiUrl(resetEndpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          reset_code: resetCode,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        Alert.alert(
          t('success'),
          t('password_reset_success'),
          [
            {
              text: t('ok'),
              onPress: onSuccess,
            },
          ]
        );
      } else {
        Alert.alert(t('error'), responseData.message || t('password_reset_failed'));
      }
    } catch (error) {
      Alert.alert(t('error'), t('network_error_retry'));
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: '', color: '#E5E7EB' };

    let score = 0;
    if (password.length >= 8) score++;
    if (/(?=.*[a-z])/.test(password)) score++;
    if (/(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[!@#$%^&*])/.test(password)) score++;

    if (score <= 2) return { strength: score, text: t('weak'), color: '#EF4444' };
    if (score <= 3) return { strength: score, text: t('medium'), color: '#F59E0B' };
    return { strength: score, text: t('strong'), color: '#17D27C' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

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

            <Text style={styles.title}>{t('set_new_password')}</Text>
            <Text style={styles.subtitle}>
              {t('create_strong_password')}
            </Text>

            {/* Password Form */}
            <View style={styles.form}>
              {/* New Password Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('new_password')}</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('enter_new_password_placeholder')}
                    placeholderTextColor="#999"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeButton}
                  >
                    <MaterialIcons
                      name={showNewPassword ? 'visibility-off' : 'visibility'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBar}>
                      <View
                        style={[
                          styles.strengthFill,
                          {
                            width: `${(passwordStrength.strength / 5) * 100}%`,
                            backgroundColor: passwordStrength.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                      {passwordStrength.text}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm Password Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('confirm_new_password_label')}</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('confirm_new_password_placeholder')}
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                  >
                    <MaterialIcons
                      name={showConfirmPassword ? 'visibility-off' : 'visibility'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                {/* Password Match Indicator */}
                {confirmPassword.length > 0 && (
                  <View style={styles.matchContainer}>
                    <MaterialIcons
                      name={newPassword === confirmPassword ? 'check-circle' : 'error'}
                      size={16}
                      color={newPassword === confirmPassword ? '#17D27C' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.matchText,
                        { color: newPassword === confirmPassword ? '#17D27C' : '#EF4444' },
                      ]}
                    >
                      {newPassword === confirmPassword ? t('passwords_match') : t('passwords_do_not_match')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Password Requirements */}
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>{t('password_requirements')}</Text>
                <View style={styles.requirementItem}>
                  <MaterialIcons
                    name={newPassword.length >= 8 ? 'check' : 'close'}
                    size={16}
                    color={newPassword.length >= 8 ? '#17D27C' : '#6B7280'}
                  />
                  <Text style={styles.requirementText}>{t('at_least_8_chars')}</Text>
                </View>
                <View style={styles.requirementItem}>
                  <MaterialIcons
                    name={/(?=.*[a-z])/.test(newPassword) ? 'check' : 'close'}
                    size={16}
                    color={/(?=.*[a-z])/.test(newPassword) ? '#17D27C' : '#6B7280'}
                  />
                  <Text style={styles.requirementText}>{t('one_lowercase')}</Text>
                </View>
                <View style={styles.requirementItem}>
                  <MaterialIcons
                    name={/(?=.*[A-Z])/.test(newPassword) ? 'check' : 'close'}
                    size={16}
                    color={/(?=.*[A-Z])/.test(newPassword) ? '#17D27C' : '#6B7280'}
                  />
                  <Text style={styles.requirementText}>{t('one_uppercase')}</Text>
                </View>
                <View style={styles.requirementItem}>
                  <MaterialIcons
                    name={/(?=.*\d)/.test(newPassword) ? 'check' : 'close'}
                    size={16}
                    color={/(?=.*\d)/.test(newPassword) ? '#17D27C' : '#6B7280'}
                  />
                  <Text style={styles.requirementText}>{t('one_number')}</Text>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              >
                <Text style={styles.submitButtonText}>
                  {isLoading ? t('resetting_password') : t('reset_password')}
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
  eyeButton: {
    padding: 4,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginRight: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  matchText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  requirementsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
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

export default ResetPassword;
