import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Header from './Header';
import Sidebar from './Sidebar';
import Navigation from './Navigation';
import { handleNavigation, NavigationFunctions } from '../utils/navigationHandler';

interface ExamplePageProps {
  onBack?: () => void;
  // All navigation functions - you only need to add the ones you want to use
  onNavigateToJobDetail?: (jobSlug: string) => void;
  onNavigateToJobAlerts?: () => void;
  onNavigateToMyFollowings?: () => void;
  onNavigateToEditProfile?: () => void;
  onNavigateToBuildResume?: () => void;
  onNavigateToMyApplications?: () => void;
  onNavigateToFavouriteJobs?: () => void;
  onNavigateToCompanies?: () => void;
  onNavigateToJobSearch?: () => void;
  onNavigateToProfile?: () => void;
}

const ExamplePage: React.FC<ExamplePageProps> = ({ 
  onBack,
  onNavigateToJobDetail,
  onNavigateToJobAlerts,
  onNavigateToMyFollowings,
  onNavigateToEditProfile,
  onNavigateToBuildResume,
  onNavigateToMyApplications,
  onNavigateToFavouriteJobs,
  onNavigateToCompanies,
  onNavigateToJobSearch,
  onNavigateToProfile
}) => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  // Centralized navigation handler - automatically maps menu actions to functions
  const handleMenuItemPress = (action: string) => {
    setSidebarVisible(false);
    
    // Use the centralized navigation handler
    const navigationFunctions: NavigationFunctions = {
      onNavigateToJobDetail,
      onNavigateToJobAlerts,
      onNavigateToMyFollowings,
      onNavigateToEditProfile,
      onNavigateToBuildResume,
      onNavigateToMyApplications,
      onNavigateToFavouriteJobs,
      onNavigateToJobSearch,
      onNavigateToProfile
    };

    const success = handleNavigation({
      action,
      userType: 'seeker',
      navigationFunctions,
      onLogout: onBack
    });

    if (!success) {
      console.warn(`Navigation failed for action: ${action}`);
    }
  };

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    
    // Handle bottom navigation
    switch (tab) {
      case 'home':
        onBack?.();
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
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Example Page" 
        onMenuPress={() => setSidebarVisible(true)}
        onBack={onBack}
        showBack={!!onBack}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>Centralized Navigation Example</Text>
        <Text style={styles.description}>
          This page demonstrates how to use the centralized navigation system.
          {'\n\n'}
          • Menu items are automatically generated from the navigation config
          {'\n'}
          • Adding new menu items only requires updating the config file
          {'\n'}
          • No need to manually update each page's navigation handlers
          {'\n\n'}
          Try opening the sidebar to see the dynamically generated menu!
        </Text>
      </View>

      {/* Sidebar with centralized navigation */}
      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        userType="seeker"
        onMenuItemPress={handleMenuItemPress}
        onLogout={onBack || (() => {})}
      />

      {/* Bottom Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabPress={handleTabPress}
        userType="seeker"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default ExamplePage;
