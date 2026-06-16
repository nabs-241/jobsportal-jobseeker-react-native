import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuPress: () => void;
  showMenu?: boolean;
  onBack?: () => void; // Add back navigation prop
  showBack?: boolean; // Add show back button prop
}

import LanguageDropdown from './LanguageDropdown';

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onMenuPress,
  showMenu = true,
  onBack,
  showBack = false
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>

        {showBack && onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        <View style={styles.rightActions}>
          <LanguageDropdown />
          {showMenu && (
            <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
              <MaterialIcons name="menu" size={24} color="#333" />
            </TouchableOpacity>
          )}
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 40,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  menuButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuIcon: {
    fontSize: 22,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  backIcon: {
    fontSize: 24,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
});

export default Header; 