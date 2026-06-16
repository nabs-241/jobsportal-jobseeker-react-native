import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getUserId, getAuthToken } from '../../../utils/userHelper';
import apiService from '../../../services/apiService';
import { buildApiUrl } from '../../../config/api';

interface SummarySectionProps {
  onBack: () => void;
}

const SummarySection: React.FC<SummarySectionProps> = ({ onBack }) => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const userId = await getUserId();
      const token = await getAuthToken();
      
      if (!userId || !token) {
        Alert.alert('Error', 'Please login to view your summary');
        return;
      }

      // Fetch user summary from profile_summaries table
      const response = await apiService.post(`/show-front-profile-summary/${userId}`, {}, token);
      
      if (response.success && response.data) {
        setSummary((response.data as any).summary || '');
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch summary');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!summary.trim()) {
      Alert.alert('Error', 'Please enter a professional summary');
      return;
    }

    try {
      setSaving(true);
      const userId = await getUserId();
      const token = await getAuthToken();
      
      if (!userId || !token) {
        Alert.alert('Error', 'Please login to save summary');
        return;
      }

      const response = await apiService.post(`/update-front-profile-summary/${userId}`, { summary }, token);
      
      if (response.success) {
        Alert.alert('Success', 'Summary updated successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to save summary');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save summary. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#17D27C" />
        <Text style={styles.loadingText}>Loading summary...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { marginTop: 10 }]}>
          <Text style={styles.sectionTitle}>Professional Summary</Text>
          <Text style={styles.sectionSubtitle}>
            Write a compelling summary that highlights your key skills, experience, and career objectives.
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textArea}
              value={summary}
              onChangeText={setSummary}
              placeholder="Write your professional summary here...&#10;&#10;Example:&#10;Experienced software developer with 5+ years in web development, specializing in React, Node.js, and cloud technologies. Proven track record of delivering high-quality applications and leading development teams. Passionate about creating innovative solutions and mentoring junior developers."
              multiline
              numberOfLines={15}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {summary.length} characters
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            onPress={handleSaveSummary}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Summary</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Tips for a great summary:</Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <MaterialIcons name="check-circle" size={16} color="#17D27C" />
                <Text style={styles.tipText}>Keep it concise (2-3 paragraphs)</Text>
              </View>
              <View style={styles.tipItem}>
                <MaterialIcons name="check-circle" size={16} color="#17D27C" />
                <Text style={styles.tipText}>Highlight your key achievements</Text>
              </View>
              <View style={styles.tipItem}>
                <MaterialIcons name="check-circle" size={16} color="#17D27C" />
                <Text style={styles.tipText}>Include relevant skills and technologies</Text>
              </View>
              <View style={styles.tipItem}>
                <MaterialIcons name="check-circle" size={16} color="#17D27C" />
                <Text style={styles.tipText}>Mention your career objectives</Text>
              </View>
              <View style={styles.tipItem}>
                <MaterialIcons name="check-circle" size={16} color="#17D27C" />
                <Text style={styles.tipText}>Use action words and quantifiable results</Text>
              </View>
            </View>
          </View>

          
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom:40,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 30,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    minHeight: 200,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
  },
  tipsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#17D27C',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#17D27C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SummarySection;
