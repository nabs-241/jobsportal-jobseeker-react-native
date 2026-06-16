import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { authService, API_ERROR_MESSAGES } from '../../services';
import { buildApiUrl } from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LoginProps {
  onLogin: (userData: any) => void;
  onRegister: () => void;
  onBack: () => void;
  onForgotPassword: (userType: 'candidate' | 'company') => void;
}

import i18n from '../../i18n';
import { useTranslation } from 'react-i18next';
import LanguageDropdown from '../LanguageDropdown';

type AuthTab = 'candidate' | 'company';

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, onBack, onForgotPassword }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AuthTab>('candidate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string>('');


  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('error'), t('please_fill_all_fields'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userType = activeTab === 'company' ? 'company' : 'seeker';
      const response = await fetch(buildApiUrl('/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Language': i18n.language || 'en',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          user_type: userType,
        }),
      });

      // ... rest of the fetch logic
      const contentType = response.headers.get('content-type');
      let responseData;
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        setError(t('invalid_response_format'));
        return;
      }

      if (response.ok && responseData.success && responseData.token) {
        await AsyncStorage.setItem('authToken', responseData.token);
        const user = responseData.user || { id: responseData.user?.id, name: responseData.name, email: email.trim(), user_type: userType };
        if (user) {
          await AsyncStorage.setItem('userData', JSON.stringify({ ...user, user_type: userType }));
        }
        const userDataWithToken = { ...user, token: responseData.token, user_type: userType };
        onLogin(userDataWithToken);
      } else {
        setError(responseData.message || responseData.error || t('login_failed'));
      }
    } catch (error) {
      setError(t('network_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const getFormTitle = () => {
    return t('sign_in_to_account');
  };

  const getFormSubtitle = () => {
    return activeTab === 'company' ? t('login_as_company') : t('login_as_candidate');
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

            {/* Login Form */}
            <View style={styles.form}>
              {/* Email Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {t('email')}
                </Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('enter_your_email')}
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('password')}</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('enter_your_password')}
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
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

              {/* Remember Me & Forgot Password */}
              <View style={styles.formOptions}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <MaterialIcons name="check" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>{t('remember_me')}</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => onForgotPassword(activeTab)}>
                  <Text style={styles.forgotPassword}>{t('forgot_password')}</Text>
                </TouchableOpacity>
              </View>

              {error ? (
                <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>
                  {error}
                </Text>
              ) : null}


              {/* Sign In Button */}
              <TouchableOpacity
                style={[styles.signInButton, isLoading && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text style={styles.signInButtonText}>
                  {isLoading ? t('signing_in') : t('sign_in')}
                </Text>
              </TouchableOpacity>

              {/* Sign Up Section */}
              <View style={styles.signUpSection}>
                <Text style={styles.signUpText}>
                  {t('dont_have_account')}
                </Text>
                <TouchableOpacity style={styles.signUpButton} onPress={onRegister}>
                  <Text style={styles.signUpButtonText}>{t('sign_up')}</Text>
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
    marginBottom: 30,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    gap: 20,
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
  formOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#444',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  signInButton: {
    backgroundColor: '#2E5CD0',
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
  signInButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  testButton: {
    backgroundColor: '#4CAF50', // A different color for the test button
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signUpSection: {
    alignItems: 'center',
    marginTop: 20,
    gap: 15,
  },
  signUpText: {
    fontSize: 16,
    color: '#444',
  },
  signUpButton: {
    backgroundColor: '#17D27C',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Login; 