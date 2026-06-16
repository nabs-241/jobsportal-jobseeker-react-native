import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Header from '../Header';
import { useTranslation } from 'react-i18next';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  posted: string;
}

interface HomeProps {
  onJobPress: (jobId: string) => void;
  onMenuPress: () => void;
}

const Home: React.FC<HomeProps> = ({ onJobPress, onMenuPress }) => {
  const { t } = useTranslation();
  // TODO: Replace with actual API call
  const [jobs, setJobs] = useState<Job[]>([]);

  const renderJobCard = (job: Job) => (
    <TouchableOpacity
      key={job.id}
      style={styles.jobCard}
      onPress={() => onJobPress(job.id)}
    >
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle}>{job.title}</Text>
        <Text style={styles.jobType}>{job.type}</Text>
      </View>

      <Text style={styles.companyName}>{job.company}</Text>

      <View style={styles.jobDetails}>
        <Text style={styles.location}>📍 {job.location}</Text>
        <Text style={styles.salary}>💰 {job.salary}</Text>
      </View>

      <Text style={styles.postedDate}>{t('posted')} {job.posted}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header
        title={t('find_dream_job')}
        subtitle={t('discover_opportunities')}
        onMenuPress={onMenuPress}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('section_recommended_jobs')}</Text>
          {jobs.map(renderJobCard)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('recent_searches')}</Text>
          <View style={styles.searchTags}>
            <TouchableOpacity style={styles.searchTag}>
              <Text style={styles.searchTagText}>React Native</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchTag}>
              <Text style={styles.searchTagText}>UI/UX Design</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchTag}>
              <Text style={styles.searchTagText}>Backend</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  jobType: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  companyName: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 12,
  },
  jobDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  location: {
    fontSize: 14,
    color: '#666666',
  },
  salary: {
    fontSize: 14,
    color: '#28A745',
    fontWeight: '500',
  },
  postedDate: {
    fontSize: 12,
    color: '#999999',
  },
  searchTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  searchTag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  searchTagText: {
    fontSize: 14,
    color: '#666666',
  },
});

export default Home; 