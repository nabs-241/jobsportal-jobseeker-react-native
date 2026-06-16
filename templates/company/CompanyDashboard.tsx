import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import LanguageDropdown from '../LanguageDropdown';
import companyService, {
  CompanyHomeData,
  CompanyProfile,
  PostedJob,
  SuggestedCandidate,
} from '../../services/companyService';
import { buildCompanyLogoUrl, buildUserImageUrl } from '../../config/api';
import CompanySidebar from './CompanySidebar';
import CompanyBottomNav, { CompanyTabId } from './CompanyBottomNav';

interface CompanyDashboardProps {
  onLogout: () => void;
  onEditProfile?: () => void;
  onViewJobPackages?: () => void;
  onViewCvPackages?: () => void;
  onCandidatePress?: (candidateId: number | string, slug?: string) => void;
  onJobPress?: (job: PostedJob) => void;
  onCompanyMenuPress?: (menuItem: string) => void;
  onOpenCompanyPublicProfile?: (slug: string) => void;
  onPostJob?: () => void;
  onNavigateToMessages?: () => void;
  chatUnreadCount?: number;
}

const DEBUG_COMPANY_DASHBOARD = true; // set false to disable debug logs

const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  onLogout,
  onEditProfile,
  onViewJobPackages,
  onViewCvPackages,
  onCandidatePress,
  onJobPress,
  onCompanyMenuPress,
  onOpenCompanyPublicProfile,
  onPostJob,
  onNavigateToMessages,
  chatUnreadCount = 0,
}) => {
  const { t } = useTranslation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<CompanyTabId>('home');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [homeData, setHomeData] = useState<CompanyHomeData | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [postedJobs, setPostedJobs] = useState<PostedJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      if (DEBUG_COMPANY_DASHBOARD) {
        if (false) console.log('[CompanyDashboard] loadData: fetching company-home, profile, posted-jobs...');
      }
      const [homeRes, profileRes, jobsRes] = await Promise.all([
        companyService.getCompanyHome(),
        companyService.getCompanyProfile(),
        companyService.getPostedJobs(),
      ]);

      // --- DEBUG: company-home response ---
      const rawHome = homeRes as any;
      if (DEBUG_COMPANY_DASHBOARD) {
        if (false) console.log('[CompanyDashboard] company-home response:', {
          success: rawHome?.success,
          statusCode: rawHome?.statusCode,
          hasData: !!rawHome?.data,
          dataKeys: rawHome?.data && typeof rawHome.data === 'object' ? Object.keys(rawHome.data) : [],
          hasMessage: !!rawHome?.message,
          messageType: typeof rawHome?.message,
          messageKeys: rawHome?.message && typeof rawHome.message === 'object' ? Object.keys(rawHome.message) : [],
          fullResponse: JSON.stringify(rawHome).slice(0, 600),
        });
      }

      // Laravel BaseController sends: { success, data: result, message: payload } for sendResponse($result, $data)
      // CompanyController::index uses sendResponse(['success'=>true], $data) so payload is in .message
      const home =
        (rawHome?.message && typeof rawHome.message === 'object' && (rawHome.message.stats || rawHome.message.company))
          ? rawHome.message
          : rawHome?.data ?? rawHome;
      if (DEBUG_COMPANY_DASHBOARD) {
        if (false) console.log('[CompanyDashboard] parsed home:', {
          usedMessage: !!(rawHome?.message && typeof rawHome.message === 'object' && (rawHome.message.stats || rawHome.message.company)),
          homeKeys: home && typeof home === 'object' ? Object.keys(home) : [],
          willSetHomeData: !!(home && (home.stats || home.suggested_candidates || home.company)),
        });
      }
      if (home && (home.stats || home.suggested_candidates || home.company)) {
        setHomeData(home as CompanyHomeData);
      }

      // API sendResponse($result, $message) puts payload in .message
      const profPayload = (profileRes as any)?.message ?? (profileRes as any)?.data ?? profileRes;
      if (DEBUG_COMPANY_DASHBOARD) {
        if (false) console.log('[CompanyDashboard] profile response:', {
          success: (profileRes as any)?.success,
          statusCode: (profileRes as any)?.statusCode,
          profPayloadKeys: profPayload && typeof profPayload === 'object' ? Object.keys(profPayload) : [],
        });
      }
      const prof = (profPayload && typeof profPayload === 'object' && (profPayload.company ?? profPayload.name ?? profPayload.id))
        ? (profPayload.company ?? profPayload)
        : null;
      if (prof && (prof.name || prof.id)) {
        setProfile(prof as CompanyProfile);
      }

      const jobsPayload = (jobsRes as any)?.data ?? jobsRes;
      const jobsList = Array.isArray(jobsPayload)
        ? jobsPayload
        : jobsPayload?.jobs ?? jobsPayload?.data ?? [];
      if (DEBUG_COMPANY_DASHBOARD) {
        if (false) console.log('[CompanyDashboard] posted-jobs:', {
          success: (jobsRes as any)?.success,
          statusCode: (jobsRes as any)?.statusCode,
          jobsCount: Array.isArray(jobsList) ? jobsList.length : 'not-array',
          jobsPayloadKeys: jobsPayload && typeof jobsPayload === 'object' && !Array.isArray(jobsPayload) ? Object.keys(jobsPayload) : [],
        });
        if (false) console.log('[CompanyDashboard] loadData done.');
      }
      setPostedJobs(Array.isArray(jobsList) ? jobsList : []);
    } catch (e) {
      if (DEBUG_COMPANY_DASHBOARD) {
        console.warn('[CompanyDashboard] loadData error:', e);
      }
      setError(t('something_went_wrong'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const stats = homeData?.stats ?? { open_jobs: 0, followers: 0, messages: 0 };
  const suggestedCandidates = homeData?.suggested_candidates ?? [];
  const jobPackage = homeData?.job_package;
  const cvPackage = homeData?.cv_package;
  const hasJobPackage = jobPackage && (jobPackage.is_active || jobPackage.remaining_jobs !== undefined);
  const hasCvPackage = cvPackage && (cvPackage.is_active || cvPackage.remaining_cvs !== undefined);
  const jobPackageEndDate = jobPackage?.package_end_date ?? jobPackage?.end_date;
  const cvPackageEndDate = cvPackage?.package_end_date ?? cvPackage?.end_date;

  const formatPackagePrice = (pkg: { price?: number | string; currency?: string; currency_code?: string } | null | undefined) => {
    if (pkg == null || (pkg.price !== 0 && !pkg.price)) return null;
    const currency = (pkg.currency ?? pkg.currency_code ?? '').toString().toUpperCase() || 'USD';
    const amount = typeof pkg.price === 'number' ? pkg.price : Number(pkg.price) || pkg.price;
    return { currency, amount };
  };

  // One full card + half of next visible so user sees they can scroll
  const screenWidth = Dimensions.get('window').width;
  const sectionPadding = 20;
  const contentWidth = screenWidth - sectionPadding * 2;
  const candidateCardWidth = contentWidth / 1.5; // ~half of 2nd card peeks

  const handleSidebarItemPress = (menuItem: string) => {
    setSidebarVisible(false);
    if (menuItem === 'company-dashboard') return;
    if (menuItem === 'company-public-profile') {
      const slug = profile?.slug ?? (homeData?.company as { slug?: string } | undefined)?.slug;
      if (slug) onOpenCompanyPublicProfile?.(slug);
      else onCompanyMenuPress?.(menuItem);
      return;
    }
    onCompanyMenuPress?.(menuItem);
  };

  if (loading) {
    return (
      <View style={styles.fullContainer}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>{t('dashboard')}</Text>
          <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuButton}>
            <MaterialIcons name="menu" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#17D27C" />
          <Text style={styles.loadingText}>{t('loading')}...</Text>
        </View>
      </View>
    );
  }

  const renderTabContent = () => {
    if (activeBottomTab !== 'home') {
      return (
        <View style={styles.placeholderContainer}>
          <MaterialIcons name="construction" size={48} color="#ccc" />
          <Text style={styles.placeholderText}>{t('coming_soon')}</Text>
        </View>
      );
    }

    return (
      <>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#17D27C']} />
        }
      >
        {/* Company info block: Logo left, Name + Industry + Edit Profile right */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {(profile?.logo || homeData?.company?.logo) ? (
              <Image
                source={{
                  uri: (profile?.logo || homeData?.company?.logo)!.startsWith('http')
                    ? (profile?.logo || homeData?.company?.logo)!
                    : buildCompanyLogoUrl((profile?.logo || homeData?.company?.logo)!.replace(/^.*\/company_logos\/?/, '')),
                }}
                style={styles.companyLogo}
              />
            ) : (
              <View style={styles.companyLogoPlaceholder}>
                <MaterialIcons name="business" size={36} color="#666" />
              </View>
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.companyName} numberOfLines={1}>
                {profile?.name ?? homeData?.company?.name ?? t('company')}
              </Text>
              <Text style={styles.industry} numberOfLines={1}>
                {profile?.industry ?? homeData?.company?.industry ?? '—'}
              </Text>
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={onEditProfile}
                activeOpacity={0.8}
              >
                <MaterialIcons name="edit" size={16} color="#2E5CD0" />
                <Text style={styles.editProfileButtonText}>{t('edit_profile')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {/* 3 Stats cards */}
        <View style={styles.statsRow}>
          <LinearGradient
            colors={['#6B46C1', '#2D3748']}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="schedule" size={28} color="#fff" style={styles.statIcon} />
            <Text style={styles.statValue}>{stats.open_jobs ?? 0}</Text>
            <Text style={styles.statLabel}>{t('company_open_jobs').toUpperCase()}</Text>
          </LinearGradient>
          <LinearGradient
            colors={['#ED8936', '#C53030']}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="people" size={28} color="#fff" style={styles.statIcon} />
            <Text style={styles.statValue}>{stats.followers ?? 0}</Text>
            <Text style={styles.statLabel}>{t('company_followers').toUpperCase()}</Text>
          </LinearGradient>
          <LinearGradient
            colors={['#3182CE', '#00B5D8']}
            style={styles.statCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="mail-outline" size={28} color="#fff" style={styles.statIcon} />
            <Text style={styles.statValue}>{stats.messages ?? 0}</Text>
            <Text style={styles.statLabel}>{t('company_messages').toUpperCase()}</Text>
          </LinearGradient>
        </View>

        {/* Package Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('company_package_summary')}</Text>
          <View style={styles.packageCard}>
            {hasJobPackage || hasCvPackage ? (
              <>
                <View style={styles.packageBlocks}>
                  {hasJobPackage && (
                    <View style={styles.packageBlock}>
                      <View style={styles.packageBlockHeader}>
                        <View style={styles.packageIconWrap}>
                          <MaterialIcons name="work" size={22} color="#17D27C" />
                        </View>
                        <Text style={styles.packageBlockLabel}>{t('job_package')}</Text>
                      </View>
                      <Text style={styles.packageBlockTitle} numberOfLines={1}>{jobPackage?.title ?? '—'}</Text>
                      {(() => {
                        const priceInfo = formatPackagePrice(jobPackage);
                        return priceInfo ? (
                          <LinearGradient
                            colors={['#7C3AED', '#17D27C']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.packagePriceBlock}
                          >
                            <Text style={styles.packagePriceText}>{priceInfo.currency} {priceInfo.amount}</Text>
                          </LinearGradient>
                        ) : null;
                      })()}
                      <View style={styles.packageBlockMeta}>
                        <Text style={styles.packageBlockRemaining}>{jobPackage?.remaining_jobs ?? 0}</Text>
                        <Text style={styles.packageBlockRemainingLabel}>{t('remaining')}</Text>
                      </View>
                      {jobPackageEndDate ? (
                        <View style={styles.packageBlockExpiry}>
                          <MaterialIcons name="event" size={14} color="#718096" />
                          <Text style={styles.packageBlockExpiryText}>{t('expires_on')} {jobPackageEndDate}</Text>
                        </View>
                      ) : null}
                      <TouchableOpacity style={styles.packageBlockButton} onPress={onViewJobPackages}>
                        <MaterialIcons name="work-outline" size={18} color="#fff" />
                        <Text style={styles.packageBlockButtonText}>{t('company_view_job_packages')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {hasCvPackage && (
                    <View style={styles.packageBlock}>
                      <View style={styles.packageBlockHeader}>
                        <View style={[styles.packageIconWrap, styles.packageIconWrapSecondary]}>
                          <MaterialIcons name="search" size={22} color="#2E5CD0" />
                        </View>
                        <Text style={styles.packageBlockLabel}>{t('cv_search_package')}</Text>
                      </View>
                      <Text style={styles.packageBlockTitle} numberOfLines={1}>{cvPackage?.title ?? '—'}</Text>
                      {(() => {
                        const priceInfo = formatPackagePrice(cvPackage);
                        return priceInfo ? (
                          <LinearGradient
                            colors={['#7C3AED', '#17D27C']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.packagePriceBlock}
                          >
                            <Text style={styles.packagePriceText}>{priceInfo.currency} {priceInfo.amount}</Text>
                          </LinearGradient>
                        ) : null;
                      })()}
                      <View style={styles.packageBlockMeta}>
                        <Text style={styles.packageBlockRemainingBlue}>{cvPackage?.remaining_cvs ?? 0}</Text>
                        <Text style={styles.packageBlockRemainingLabel}>{t('remaining')}</Text>
                      </View>
                      {cvPackageEndDate ? (
                        <View style={styles.packageBlockExpiry}>
                          <MaterialIcons name="event" size={14} color="#718096" />
                          <Text style={styles.packageBlockExpiryText}>{t('expires_on')} {cvPackageEndDate}</Text>
                        </View>
                      ) : null}
                      <TouchableOpacity style={styles.packageBlockButtonSecondary} onPress={onViewCvPackages}>
                        <MaterialIcons name="search" size={18} color="#2E5CD0" />
                        <Text style={styles.packageBlockButtonTextSecondary}>{t('company_view_cv_packages')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={styles.packageEmptyState}>
                  <View style={styles.packageEmptyIconWrap}>
                    <MaterialIcons name="inventory-2" size={40} color="#A0AEC0" />
                  </View>
                  <Text style={styles.noPackageText}>{t('company_no_package_active')}</Text>
                  <Text style={styles.noPackageSubtext}>{t('company_view_job_packages')} / {t('company_view_cv_packages')}</Text>
                </View>
                <View style={styles.packageButtons}>
                  <TouchableOpacity style={styles.packageButton} onPress={onViewJobPackages}>
                    <MaterialIcons name="work-outline" size={18} color="#fff" />
                    <Text style={styles.packageButtonText}>{t('company_view_job_packages')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.packageButtonSecondary} onPress={onViewCvPackages}>
                    <MaterialIcons name="search" size={18} color="#2E5CD0" />
                    <Text style={styles.packageButtonTextSecondary}>{t('company_view_cv_packages')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Suggested Candidates - horizontal slide, larger cards with more info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('company_suggested_candidates')}</Text>
          {suggestedCandidates.length === 0 ? (
            <Text style={styles.emptyText}>{t('company_no_suggested_candidates')}</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={styles.candidatesScrollContent}
              style={styles.candidatesScroll}
            >
              {suggestedCandidates.slice(0, 15).map((c: SuggestedCandidate) => {
                const avatarUri = c.image ?? c.profile_image;
                const imageUrl = avatarUri
                  ? (avatarUri.startsWith('http') ? avatarUri : buildUserImageUrl(avatarUri.replace(/^.*\/user_images\/?/, '')))
                  : null;
                const profession = c.functional_area ?? c.job_title ?? c.headline ?? '';
                const experience = c.career_level ?? '';
                const location = [c.city, c.country].filter(Boolean).join(', ');
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.candidateCard, { width: candidateCardWidth }]}
                    onPress={() => onCandidatePress?.(c.id, c.slug)}
                    activeOpacity={0.8}
                  >
                    {c.is_featured ? (
                      <View style={styles.candidateFeaturedBadge}>
                        <MaterialIcons name="star" size={12} color="#fff" />
                        <Text style={styles.candidateFeaturedText}>{t('featured').toUpperCase()}</Text>
                      </View>
                    ) : null}
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.candidateAvatar} />
                    ) : (
                      <View style={styles.candidateAvatarPlaceholder}>
                        <MaterialIcons name="person" size={36} color="#666" />
                        <Text style={styles.candidateNoPhoto}>{t('no_photo')}</Text>
                      </View>
                    )}
                    <Text style={styles.candidateName} numberOfLines={1}>{c.name ?? c.email ?? `#${c.id}`}</Text>
                    {profession ? (
                      <Text style={styles.candidateProfession} numberOfLines={1}>{profession}</Text>
                    ) : null}
                    {experience ? (
                      <View style={styles.candidateMetaRow}>
                        <MaterialIcons name="trending-up" size={14} color="#2E5CD0" />
                        <Text style={styles.candidateMetaText} numberOfLines={1}>{experience}</Text>
                      </View>
                    ) : null}
                    {location ? (
                      <View style={styles.candidateMetaRow}>
                        <MaterialIcons name="place" size={14} color="#2E5CD0" />
                        <Text style={styles.candidateMetaText} numberOfLines={1}>{location}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
              <View style={styles.candidateCardSpacer} />
            </ScrollView>
          )}
        </View>

        {/* Recent Active Jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('company_recent_active_jobs')}</Text>
          {!Array.isArray(postedJobs) || postedJobs.length === 0 ? (
            <Text style={styles.emptyText}>{t('company_no_posted_jobs')}</Text>
          ) : (
            <View style={styles.jobsList}>
              {(postedJobs || []).slice(0, 5).map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobRow}
                  onPress={() => onJobPress?.(job)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="work-outline" size={22} color="#2E5CD0" />
                  <View style={styles.jobInfo}>
                    <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                    {(job.city || job.country) && (
                      <Text style={styles.jobMeta} numberOfLines={1}>{[job.city, job.country].filter(Boolean).join(', ')}</Text>
                    )}
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color="#999" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
      </>
    );
  };

  return (
    <View style={styles.fullContainer}>
      {/* Top bar: Dashboard title + hamburger (like candidate side) */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>{t('dashboard')}</Text>
        <View style={styles.topBarRight}>
          <LanguageDropdown />
          <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuButton}>
            <MaterialIcons name="menu" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content area */}
      <LinearGradient colors={['#F5F6FD', '#E4F4EC']} style={styles.contentWrapper}>
        {renderTabContent()}
      </LinearGradient>

      {/* Bottom navigation: Home | Post a Job | Packages | Profile */}
      <CompanyBottomNav
        activeTab={activeBottomTab}
        onTabPress={(tab) => {
          if (tab === 'home') setActiveBottomTab('home');
          else if (tab === 'profile') onEditProfile?.();
          else if (tab === 'packages') onViewJobPackages?.();
          else if (tab === 'post-job') onPostJob?.();
          else if (tab === 'chat') onNavigateToMessages?.();
        }}
        chatUnreadCount={chatUnreadCount}
      />

      {/* Sidebar overlay */}
      <CompanySidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onMenuItemPress={handleSidebarItemPress}
        onLogout={onLogout}
        companyName={profile?.name ?? homeData?.company?.name}
        companyLogo={profile?.logo ?? homeData?.company?.logo}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  contentWrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FD',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#888',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  companyLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  companyLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: 14,
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 2,
  },
  industry: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editProfileButtonText: {
    fontSize: 14,
    color: '#2E5CD0',
    fontWeight: '600',
  },
  errorText: {
    color: '#C53030',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 90,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  statIcon: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 12,
  },
  packageCard: {
  },
  packageBlocks: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
  },
  packageBlock: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  packageBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  packageIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(23, 210, 124, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageIconWrapSecondary: {
    backgroundColor: 'rgba(46, 92, 208, 0.12)',
  },
  packageBlockLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  packageBlockTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 8,
  },
  packageBlockPrice: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 8,
  },
  packagePriceBlock: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  packagePriceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  packageBlockMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  packageBlockRemaining: {
    fontSize: 22,
    fontWeight: '800',
    color: '#17D27C',
  },
  packageBlockRemainingBlue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2E5CD0',
  },
  packageBlockRemainingLabel: {
    fontSize: 13,
    color: '#718096',
  },
  packageBlockExpiry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  packageBlockExpiryText: {
    fontSize: 11,
    color: '#718096',
  },
  packageBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#17D27C',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  packageBlockButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  packageBlockButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
    borderWidth: 2,
    borderColor: '#2E5CD0',
  },
  packageBlockButtonTextSecondary: {
    color: '#2E5CD0',
    fontSize: 14,
    fontWeight: '600',
  },
  packageEmptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  packageEmptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  noPackageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
  },
  noPackageSubtext: {
    fontSize: 13,
    color: '#718096',
    marginTop: 6,
    textAlign: 'center',
  },
  packageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  packageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#17D27C',
    paddingVertical: 14,
    borderRadius: 12,
  },
  packageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  packageButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2E5CD0',
  },
  packageButtonTextSecondary: {
    color: '#2E5CD0',
    fontSize: 14,
    fontWeight: '600',
  },
  candidatesScroll: {
    marginHorizontal: -20,
  },
  candidatesScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  candidateCard: {
    minHeight: 260,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    textAlign: 'center',
  },
  candidateFeaturedBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#2E5CD0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  candidateFeaturedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  candidateAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: 12,
    marginTop: 4,
  },
  candidateAvatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  candidateNoPhoto: {
    fontSize: 10,
    color: '#718096',
    marginTop: 2,
  },
  candidateName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
  },
  candidateProfession: {
    fontSize: 14,
    color: '#718096',
    marginTop: 6,
    textAlign: 'center',
  },
  candidateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
    maxWidth: '100%',
    alignSelf: 'center',
  },
  candidateMetaText: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
  },
  candidateCardSpacer: {
    width: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#718096',
    fontStyle: 'italic',
  },
  jobsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  jobInfo: {
    flex: 1,
    marginLeft: 12,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  jobMeta: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
});

export default CompanyDashboard;
