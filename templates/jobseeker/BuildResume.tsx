import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import Sidebar from '../Sidebar';
import Navigation from '../Navigation';
import { handleNavigation, NavigationFunctions } from '../../utils/navigationHandler';

// Import section components
import CVSection from './resume-sections/CVSection';
import ProjectsSection from './resume-sections/ProjectsSection';
import ExperienceSection from './resume-sections/ExperienceSection';
import EducationSection from './resume-sections/EducationSection';
import SkillsSection from './resume-sections/SkillsSection';
import LanguagesSection from './resume-sections/LanguagesSection';
import SummarySection from './resume-sections/SummarySection';

interface BuildResumeProps {
  onMenuPress: () => void;
  onBack?: () => void; // Add back navigation prop
  onLogout?: () => void;
  messageUnreadCount?: number;
  onCVDeleted?: () => void; // Callback to refresh CV completeness check
  // Navigation props for sidebar and bottom navigation
  onNavigateToJobDetail?: (jobSlug: string) => void;
  onNavigateToJobAlerts?: () => void;
  onNavigateToMyFollowings?: () => void;
  onNavigateToEditProfile?: () => void;
  onNavigateToBuildResume?: () => void;
  onNavigateToMyApplications?: () => void;
  onNavigateToFavouriteJobs?: () => void;
  onNavigateToCompanies?: () => void;
  onNavigateToPackages?: () => void;
  onNavigateToPaymentHistory?: () => void;
  onNavigateToJobSearch?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToMessages?: () => void;
}

type ResumeSection = 'overview' | 'cv' | 'projects' | 'experience' | 'education' | 'skills' | 'languages' | 'summary';

const BuildResume: React.FC<BuildResumeProps> = ({ 
  onMenuPress, 
  onBack,
  onLogout,
  messageUnreadCount = 0,
  onCVDeleted,
  onNavigateToJobDetail,
  onNavigateToJobAlerts,
  onNavigateToMyFollowings,
  onNavigateToEditProfile,
  onNavigateToBuildResume,
  onNavigateToMyApplications,
  onNavigateToFavouriteJobs,
  onNavigateToCompanies,
  onNavigateToPackages,
  onNavigateToPaymentHistory,
  onNavigateToJobSearch,
  onNavigateToProfile,
  onNavigateToMessages
}) => {
  const [currentSection, setCurrentSection] = useState<ResumeSection>('overview');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('resume');

  const resumeSections = [
    {
      id: 'cv',
      title: 'Attached CV',
      description: 'Upload and manage your CV files',
      icon: 'description',
      color: '#17D27C'
    },
    {
      id: 'projects',
      title: 'Projects',
      description: 'Showcase your work and achievements',
      icon: 'work',
      color: '#FF6B6B'
    },
    {
      id: 'experience',
      title: 'Experience',
      description: 'Add your work experience',
      icon: 'business',
      color: '#4ECDC4'
    },
    {
      id: 'education',
      title: 'Education',
      description: 'Add your educational background',
      icon: 'school',
      color: '#45B7D1'
    },
    {
      id: 'skills',
      title: 'Skills',
      description: 'List your technical and soft skills',
      icon: 'star',
      color: '#96CEB4'
    },
    {
      id: 'languages',
      title: 'Languages',
      description: 'Add languages you speak',
      icon: 'language',
      color: '#FFEAA7'
    },
    {
      id: 'summary',
      title: 'Summary',
      description: 'Write your professional summary',
      icon: 'person',
      color: '#DDA0DD'
    }
  ];

  const handleSectionPress = (sectionId: ResumeSection) => {
    setCurrentSection(sectionId);
  };

  const handleBackToOverview = () => {
    setCurrentSection('overview');
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'cv':
        return <CVSection onBack={handleBackToOverview} onCVDeleted={onCVDeleted} />;
      case 'projects':
        return <ProjectsSection onBack={handleBackToOverview} />;
      case 'experience':
        return <ExperienceSection onBack={handleBackToOverview} />;
      case 'education':
        return <EducationSection onBack={handleBackToOverview} />;
      case 'skills':
        return <SkillsSection onBack={handleBackToOverview} />;
      case 'languages':
        return <LanguagesSection onBack={handleBackToOverview} />;
      case 'summary':
        return <SummarySection onBack={handleBackToOverview} />;
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.overviewContainer}>
        <Text style={styles.overviewSubtitle}>
          Complete each section to create a comprehensive professional resume
        </Text>
        
        <View style={styles.sectionsGrid}>
          {resumeSections.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={[styles.sectionCard, { borderLeftColor: section.color }]}
              onPress={() => handleSectionPress(section.id as ResumeSection)}
            >
              <View style={styles.sectionIconContainer}>
                <MaterialIcons 
                  name={section.icon as any} 
                  size={24} 
                  color={section.color} 
                />
              </View>
              <View style={styles.sectionContent}>
                <Text style={styles.sectionCardTitle}>{section.title}</Text>
                <Text style={styles.sectionCardDescription}>{section.description}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {currentSection === 'overview' ? (
        <Header 
          title="Build Resume" 
          onMenuPress={() => setSidebarVisible(true)}
          onBack={onBack}
          showBack={!!onBack}
        />
      ) : (
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={handleBackToOverview} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.sectionHeaderTitle}>
            {resumeSections.find(s => s.id === currentSection)?.title}
          </Text>
          
        </View>
      )}
      
      {renderCurrentSection()}

      {/* Sidebar */}
      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        userType="seeker"
        onMenuItemPress={(action) => {
          setSidebarVisible(false);
          
          const navigationFunctions: NavigationFunctions = {
            onNavigateToJobDetail,
            onNavigateToJobAlerts,
            onNavigateToMyFollowings,
            onNavigateToEditProfile,
            onNavigateToBuildResume,
            onNavigateToMyApplications,
            onNavigateToFavouriteJobs,
            onNavigateToJobSearch,
            onNavigateToProfile,
            onNavigateToMessages,
            onNavigateToCompanies,
            onNavigateToPackages,
            onNavigateToPaymentHistory
          };

          const success = handleNavigation({
            action,
            userType: 'seeker',
            navigationFunctions,
            onLogout: onLogout || onBack
          });

          if (!success) {
            if (false) console.warn(`Navigation failed for action: ${action}`);
          }
        }}
        onLogout={onLogout || onBack || (() => {})}
      />

      {/* Bottom Navigation */}
      <Navigation
        activeTab={activeTab}
        messageUnreadCount={messageUnreadCount}
        onTabPress={(tab) => {
          setActiveTab(tab);
          // Handle navigation based on tab
          switch (tab) {
            case 'home':
              onBack?.(); // Go back to dashboard
              break;
            case 'search':
              onNavigateToJobSearch?.();
              break;
            case 'companies':
              onNavigateToCompanies?.();
              break;
            case 'favourites':
              onNavigateToFavouriteJobs?.();
              break;
            case 'profile':
              onNavigateToProfile?.();
              break;
          }
        }}
        userType="seeker"
      />
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
    padding: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop:40,
  },
  backButton: {
    padding: 8,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft:'auto',
  },
  headerActionButton: {
    padding: 8,
  },
  overviewContainer: {
    flex: 1,
    paddingBottom:50,
  },
  overviewTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  overviewSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  sectionsGrid: {
    gap: 15,
  },
  sectionCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  sectionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  sectionContent: {
    flex: 1,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionCardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});

export default BuildResume;
