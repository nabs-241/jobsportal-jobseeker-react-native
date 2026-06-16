import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { buildApiUrl, API_CONFIG } from '../../config/api';
import { useTranslation } from 'react-i18next';
import LanguageDropdown from '../LanguageDropdown';

interface ResetPasswordCodeProps {
  email: string;
  userType?: 'candidate' | 'company';
  onBack: () => void;
  onSuccess: (email: string, code: string) => void;
}

const ResetPasswordCode: React.FC<ResetPasswordCodeProps> = ({ email, userType = 'candidate', onBack, onSuccess }) => {
  const { t } = useTranslation();
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const checkIconAnim = useRef(new Animated.Value(0)).current;

  const verifyEndpoint = userType === 'company'
    ? API_CONFIG.ENDPOINTS.COMPANY.VERIFY_RESET_CODE
    : '/verify-reset-code';
  const resendEndpoint = userType === 'company'
    ? API_CONFIG.ENDPOINTS.COMPANY.FORGOT_PASSWORD
    : '/forgot-password';

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const codeToVerify = code || verificationCode.join('');

    if (codeToVerify.length !== 6) {
      setError(t('enter_complete_code'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(buildApiUrl(verifyEndpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          reset_code: codeToVerify,
        }),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        // Animate success
        Animated.sequence([
          Animated.timing(checkIconAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();

        // Navigate to reset password screen after a short delay
        setTimeout(() => {
          onSuccess(email, codeToVerify);
        }, 1000);
      } else {
        setError(responseData.message || t('invalid_verification_code'));
        // Clear the code inputs
        setVerificationCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      setError(t('network_error_retry'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(buildApiUrl(resendEndpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        setResendTimer(60);
        setCanResend(false);
        Alert.alert(t('success'), t('new_code_sent'));
      } else {
        setError(responseData.message || t('failed_resend_code'));
      }
    } catch (error) {
      setError(t('network_error_retry'));
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
              <Animated.View style={[styles.checkIconContainer, { opacity: checkIconAnim }]}>
                <MaterialIcons name="check-circle" size={64} color="#17D27C" />
              </Animated.View>
              {!showSuccess && (
                <MaterialIcons name="security" size={64} color="#17D27C" />
              )}
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

            <Text style={styles.title}>{t('enter_verification_code')}</Text>
            <Text style={styles.subtitle}>
              {t('verification_code_sent_to')}{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>

            {/* Verification Code Input */}
            <View style={styles.codeContainer}>
              {verificationCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { if (ref) inputRefs.current[index] = ref; }}
                  style={[
                    styles.codeInput,
                    digit ? styles.codeInputFilled : null,
                    error ? styles.codeInputError : null,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleCodeChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  editable={!isLoading}
                  selectTextOnFocus
                />
              ))}
            </View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
              onPress={() => handleVerify()}
              disabled={isLoading || verificationCode.some(digit => !digit)}
            >
              <Text style={styles.verifyButtonText}>
                {isLoading ? t('verifying') : t('verify_code')}
              </Text>
            </TouchableOpacity>

            {/* Resend Code */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>{t('didnt_receive_code')} </Text>
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={!canResend || isLoading}
                style={styles.resendButton}
              >
                <Text style={[styles.resendButtonText, !canResend && styles.resendButtonDisabled]}>
                  {resendTimer > 0 ? `${t('resend_in')} ${resendTimer}s` : t('resend_code')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Back to Login */}
            <TouchableOpacity style={styles.backToLoginButton} onPress={onBack}>
              <MaterialIcons name="arrow-back" size={16} color="#17D27C" />
              <Text style={styles.backToLoginText}>{t('back_to_login')}</Text>
            </TouchableOpacity>
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
    position: 'relative',
  },
  checkIconContainer: {
    position: 'absolute',
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
  emailText: {
    fontWeight: '600',
    color: '#17D27C',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: '#17D27C',
    backgroundColor: '#F0FDF4',
  },
  codeInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  verifyButton: {
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
  verifyButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendButton: {
    marginLeft: 4,
  },
  resendButtonText: {
    fontSize: 14,
    color: '#17D27C',
    fontWeight: '600',
  },
  resendButtonDisabled: {
    color: '#9CA3AF',
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

export default ResetPasswordCode;
