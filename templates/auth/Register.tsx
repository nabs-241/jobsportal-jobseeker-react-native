import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { authService, API_ERROR_MESSAGES } from '../../services';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import LanguageDropdown from '../LanguageDropdown';

type AuthTab = 'candidate' | 'company';

interface RegisterProps {
  onRegister: (userData: any) => void;
  onLogin: () => void;
  onBack: () => void;
  onEmailVerification: (email: string) => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onLogin, onBack, onEmailVerification }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AuthTab>('candidate');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    if (!acceptTerms) return false;
    if (activeTab === 'company') {
      return formData.name.trim() &&
        formData.email.trim() &&
        formData.password.trim() &&
        formData.password_confirmation.trim() &&
        formData.password === formData.password_confirmation;
    }
    return formData.first_name.trim() &&
      formData.last_name.trim() &&
      formData.email.trim() &&
      formData.password.trim() &&
      formData.password_confirmation.trim() &&
      formData.password === formData.password_confirmation;
  };

  const handleRegister = async () => {
    if (!isFormValid()) {
      Alert.alert(t('error'), t('please_fill_all_fields_register'));
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'company') {
        const response = await authService.companyRegister({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          password_confirmation: formData.password_confirmation.trim(),
          terms_of_use: acceptTerms,
        });
        const data: any = response?.data ?? response;
        if (response?.success && (data?.token || (response as any)?.token)) {
          const token = data?.token ?? (response as any)?.token;
          const name = data?.name ?? (response as any)?.name ?? formData.name.trim();
          onRegister({
            token,
            name,
            email: formData.email.trim(),
            user_type: 'company',
          });
        } else {
          const msg = (response as any)?.message ?? (response as any)?.error ?? data?.message ?? t('registration_failed');
          setError(msg);
          Alert.alert(t('registration_failed'), msg);
        }
      } else {
        const userData = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          password_confirmation: formData.password_confirmation.trim(),
        };
        const response = await authService.register(userData);
        if (response && response.success) {
          onEmailVerification(formData.email);
        } else {
          const msg = response?.message ?? (response as any)?.error ?? t('registration_failed');
          setError(msg);
          Alert.alert(t('registration_failed'), msg);
        }
      }
    } catch (err) {
      Alert.alert(t('error'), t('network_error_retry'));
    } finally {
      setIsLoading(false);
    }
  };

  const getFormTitle = () => {
    return activeTab === 'company' ? t('register_company') : t('register_candidate');
  };

  const getFormSubtitle = () => {
    return t('enter_account_details');
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
              <MaterialIcons name="arrow-back" size={24} color="#5E2DFA" />
            </TouchableOpacity>
            <LanguageDropdown />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{getFormTitle()}</Text>

            {/* For Candidate / For Company tabs */}
            <View style={styles.userTypeContainer}>
              <TouchableOpacity
                style={[styles.userTypeButton, activeTab === 'candidate' && styles.userTypeButtonActive]}
                onPress={() => setActiveTab('candidate')}
              >
                <Text style={[styles.userTypeButtonText, activeTab === 'candidate' && styles.userTypeButtonTextActive]}>
                  {t('for_candidate')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.userTypeButton, activeTab === 'company' && styles.userTypeButtonActive]}
                onPress={() => setActiveTab('company')}
              >
                <Text style={[styles.userTypeButtonText, activeTab === 'company' && styles.userTypeButtonTextActive]}>
                  {t('for_company')}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>{getFormSubtitle()}</Text>

            {/* Registration Form */}
            <View style={styles.form}>
              {activeTab === 'company' ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('company_name')} *</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="business" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('enter_company_name')}
                      placeholderTextColor="#999"
                      value={formData.name}
                      onChangeText={(value) => updateFormData('name', value)}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              ) : (
                <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('first_name')} *</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('first_name')}
                    placeholderTextColor="#999"
                    value={formData.first_name}
                    onChangeText={(value) => updateFormData('first_name', value)}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('last_name')} *</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('last_name')}
                    placeholderTextColor="#999"
                    value={formData.last_name}
                    onChangeText={(value) => updateFormData('last_name', value)}
                    autoCapitalize="words"
                  />
                </View>
              </View>
              </>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('email')} *</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('email')}
                    placeholderTextColor="#999"
                    value={formData.email}
                    onChangeText={(value) => updateFormData('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('password')} *</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('password')}
                    placeholderTextColor="#999"
                    value={formData.password}
                    onChangeText={(value) => updateFormData('password', value)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <MaterialIcons
                      name={showPassword ? "visibility" : "visibility-off"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('password_confirmation')} *</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('password_confirmation')}
                    placeholderTextColor="#999"
                    value={formData.password_confirmation}
                    onChangeText={(value) => updateFormData('password_confirmation', value)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <MaterialIcons
                      name={showConfirmPassword ? "visibility" : "visibility-off"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Terms of Use Checkbox */}
              <View style={styles.termsContainer}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setAcceptTerms(!acceptTerms)}
                >
                  <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                    {acceptTerms && <MaterialIcons name="check" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>{t('accept_terms')}</Text>
                </TouchableOpacity>
              </View>

              {/* Register Button */}
              <TouchableOpacity
                style={[styles.registerButton, (!isFormValid() || isLoading) && styles.disabledButton]}
                onPress={handleRegister}
                disabled={!isFormValid() || isLoading}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? t('creating_account') : t('register_button')}
                </Text>
              </TouchableOpacity>

              {/* Sign In Section */}
              <View style={styles.signInSection}>
                <Text style={styles.signInText}>{t('have_account')}</Text>
                <TouchableOpacity style={styles.signInButton} onPress={onLogin}>
                  <Text style={styles.signInButtonText}>{t('sign_in_button')}</Text>
                </TouchableOpacity>
              </View>
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
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 30,
  },
  userTypeContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 5,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTypeButtonActive: {
    backgroundColor: '#17D27C',
  },
  userTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
  },
  userTypeButtonTextActive: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    gap: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 5,
  },
  termsContainer: {
    marginTop: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#777',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#17D27C',
    borderColor: '#17D27C',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  registerButton: {
    backgroundColor: '#17D27C',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 10,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  signInSection: {
    alignItems: 'center',
    marginTop: 30,
    gap: 15,
  },
  signInText: {
    fontSize: 16,
    color: '#333',
  },
  signInButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#17D27C',
  },
  signInButtonText: {
    color: '#17D27C',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Register; 