import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import LanguageDropdown from './LanguageDropdown';

interface IntroProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const Intro: React.FC<IntroProps> = ({ onGetStarted, onLogin }) => {
  const { t } = useTranslation();
  return (
    <LinearGradient
      colors={['#e8f4ff', '#fff']}
      style={styles.container}
    >
      <View style={styles.topRight}>
        <LanguageDropdown />
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image
            source={require('../assets/jobportal-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t('welcome_title')}</Text>
          <Text style={styles.subtitle}>{t('welcome_subtitle')}</Text>
        </View>

        <View style={styles.imageContainer}>
          <Image
            source={require('../assets/intro-1.png')}
            style={styles.introImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={onGetStarted}>
            <Text style={styles.primaryButtonText}>{t('get_started')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onLogin}>
            <Text style={styles.secondaryButtonText}>{t('login')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topRight: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 300,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  imageContainer: {
    marginBottom: 10,
    alignItems: 'center',
  },
  introImage: {
    width: 300,
    height: 250,
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  primaryButton: {
    backgroundColor: '#5e2dfa',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#17d27c',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',

  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default Intro; 