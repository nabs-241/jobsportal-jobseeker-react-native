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
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { buildApiUrl } from '../../config/api';
import { useTranslation } from 'react-i18next';
import LanguageDropdown from '../LanguageDropdown';

interface EmailVerificationProps {
  email: string;
  onVerificationSuccess: (userData: any) => void;
  onBack: () => void;
  onResendCode: () => void;
}

const EmailVerification: React.FC<EmailVerificationProps> = ({
  email,
  onVerificationSuccess,
  onBack,
  onResendCode
}) => {
  const { t } = useTranslation();
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<TextInput[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');

    if (code.length !== 6) {
      Alert.alert(t('error'), t('enter_complete_code'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(buildApiUrl('/verify-email-code'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          verification_code: code,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(t('success'), t('email_verified'), [
          {
            text: t('ok'),
            onPress: () => onVerificationSuccess(data.user)
          }
        ]);
      } else {
        Alert.alert(t('error'), data.message || t('verification_failed'));
      }
    } catch (error) {
      Alert.alert(t('error'), t('network_error_try_again'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    try {
      const response = await fetch(buildApiUrl('/resend-verification-code'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCountdown(60); // 60 seconds cooldown
        Alert.alert(t('success'), t('new_code_sent'));
        onResendCode();
      } else {
        Alert.alert(t('error'), data.message || t('failed_resend_code'));
      }
    } catch (error) {
      Alert.alert(t('error'), t('network_error_try_again'));
    } finally {
      setIsResending(false);
    }
  };

  const isCodeComplete = verificationCode.every(digit => digit !== '');

  return (
    <LinearGradient
      colors={['#F5F6FD', '#E4F4EC']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <MaterialIcons name="arrow-back" size={24} color="#5E2DFA" />
            </TouchableOpacity>
            <LanguageDropdown />
          </View>

          <View style={styles.formContainer}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="email" size={60} color="#17D27C" />
            </View>

            <Text style={styles.title}>{t('verify_email_title')}</Text>
            <Text style={styles.subtitle}>
              {t('verification_code_sent_to')}
            </Text>
            <Text style={styles.emailText}>{email}</Text>

            <View style={styles.codeContainer}>
              {verificationCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    if (ref) inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.codeInput,
                    digit ? styles.codeInputFilled : null
                  ]}
                  value={digit}
                  onChangeText={(value) => handleCodeChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.verifyButton,
                (!isCodeComplete || isLoading) && styles.disabledButton
              ]}
              onPress={handleVerifyCode}
              disabled={!isCodeComplete || isLoading}
            >
              <Text style={styles.verifyButtonText}>
                {isLoading ? t('verifying_caps') : t('verify_email_caps')}
              </Text>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>{t('didnt_receive_code')}</Text>
              <TouchableOpacity
                style={[
                  styles.resendButton,
                  (countdown > 0 || isResending) && styles.disabledButton
                ]}
                onPress={handleResendCode}
                disabled={countdown > 0 || isResending}
              >
                <Text style={styles.resendButtonText}>
                  {isResending
                    ? t('sending')
                    : countdown > 0
                      ? `${t('resend_in_caps')} ${countdown}s`
                      : t('resend_code_caps')
                  }
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.helpContainer}>
              <Text style={styles.helpText}>
                {t('check_spam_folder')}
              </Text>
            </View>
          </View>
        </Animated.View>
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
  content: {
    flex: 1,
    paddingHorizontal: 30,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  emailText: {
    fontSize: 16,
    color: '#17D27C',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 40,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    width: '100%',
    maxWidth: 300,
  },
  codeInput: {
    width: 45,
    height: 55,
    backgroundColor: '#fff',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5E2DFA',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  codeInputFilled: {
    borderColor: '#17D27C',
    backgroundColor: '#fff',
  },
  verifyButton: {
    backgroundColor: '#17D27C',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 30,
    minWidth: 200,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  resendButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#17D27C',
  },
  resendButtonText: {
    color: '#17D27C',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default EmailVerification;
