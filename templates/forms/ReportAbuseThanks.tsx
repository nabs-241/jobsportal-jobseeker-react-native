import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

interface ReportAbuseThanksProps {
  onBack: () => void;
}

export default function ReportAbuseThanks({ onBack }: ReportAbuseThanksProps) {
  return (
    <LinearGradient colors={['#F5F6FD', '#E4F4EC']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBackButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Thank You</Text>
          <Text style={styles.headerSubtitle}>Report Submitted</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.successCard}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <MaterialIcons name="check-circle" size={60} color="#17D27C" />
            </View>
          </View>
          
          <Text style={styles.title}>Report Submitted Successfully</Text>
          
          <View style={styles.messageContainer}>
            <Text style={styles.message}>
              Thank you for helping us maintain a safe and professional job board. 
              Your report has been received and will be reviewed by our moderation team.
            </Text>
            
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <MaterialIcons name="security" size={20} color="#17D27C" />
                <Text style={styles.featureText}>Your report is confidential</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="schedule" size={20} color="#17D27C" />
                <Text style={styles.featureText}>Reviewed within 24 hours</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="support" size={20} color="#17D27C" />
                <Text style={styles.featureText}>Action taken if needed</Text>
              </View>
            </View>
          </View>
        </View>
        
        <TouchableOpacity style={styles.continueButton} onPress={onBack}>
          <MaterialIcons name="arrow-forward" size={20} color="#fff" />
          <Text style={styles.continueButtonText}>Continue Browsing Jobs</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

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
  headerBackButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    marginBottom: 30,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconBackground: {
    backgroundColor: '#F0FDF4',
    borderRadius: 50,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  messageContainer: {
    width: '100%',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  featureList: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 12,
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#17D27C',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#17D27C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
