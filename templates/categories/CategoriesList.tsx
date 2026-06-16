import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import Sidebar from '../Sidebar';
import { buildApiUrl, buildAssetUrl } from '../../config/api';

interface Category {
  functional_area_id: number;
  functional_area: string;
  logo: string | null;
  jobs_count: number;
}

interface CategoriesListProps {
  onBack?: () => void;
  onNavigateToJobSearch?: (categoryId?: number, categoryName?: string) => void;
}

const CategoriesList: React.FC<CategoriesListProps> = ({
  onBack,
  onNavigateToJobSearch,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl('/jobs/categories'));
      const data = await response.json();

      if (data && data.success) {
        setCategories(data.data || []);
      } else {
        Alert.alert('Error', data?.message || 'Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to fetch categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCategories();
    setRefreshing(false);
  };

  const handleCategoryPress = (category: Category) => {
    onNavigateToJobSearch?.(category.functional_area_id, category.functional_area);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <LinearGradient
        colors={['#F5F6FD', '#E4F4EC']}
        style={styles.container}
      >
        <Header 
          title="Job Categories" 
          onMenuPress={() => setSidebarVisible(true)}
          onBack={onBack}
          showBack={!!onBack}
        />
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#F5F6FD', '#E4F4EC']}
      style={styles.container}
    >
      <Header 
        title="Job Categories" 
        onMenuPress={() => setSidebarVisible(true)}
        onBack={onBack}
        showBack={!!onBack}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <Text style={styles.headerTitle}>Browse Jobs by Categories</Text>
            <Text style={styles.headerSubtitle}>
              Explore jobs in different fields
            </Text>
          </View>

          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.functional_area_id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.7}
              >
                <View style={styles.categoryIconContainer}>
                  {category.logo ? (
                    <Image
                      source={{ uri: buildAssetUrl(`/uploads/functional_area/${category.logo}`) }}
                      style={styles.categoryIcon}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.categoryIconPlaceholder}>
                      <MaterialIcons name="work" size={24} color="#999" />
                    </View>
                  )}
                </View>
                
                <Text style={styles.categoryName} numberOfLines={2}>
                  {category.functional_area}
                </Text>
                
                <View style={styles.jobCountContainer}>
                  <Text style={styles.jobCountText}>
                    {category.jobs_count} {category.jobs_count === 1 ? 'Job' : 'Jobs'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {categories.length === 0 && (
            <View style={styles.noCategoriesContainer}>
              <MaterialIcons name="category" size={64} color="#999" />
              <Text style={styles.noCategoriesText}>
                No categories available at the moment.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        userType="seeker"
        onMenuItemPress={() => {}}
        onLogout={() => {}}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom:50,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,    
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Medium',
  },
  headerSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Inter-Regular',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  categoryIcon: {
    width: 40,
    height: 40,
  },
  categoryIconPlaceholder: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
    fontFamily: 'Inter-SemiBold',
  },
  jobCountContainer: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  jobCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    fontFamily: 'Inter-SemiBold',
  },
  noCategoriesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noCategoriesText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
});

export default CategoriesList;
