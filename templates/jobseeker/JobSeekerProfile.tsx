import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getViewPublicProfile } from '../../services/jobSeekerService';
import { buildUserImageUrl, buildAssetUrl, buildApiUrl } from '../../config/api';
import CompanyBottomNav, { CompanyTabId } from '../company/CompanyBottomNav';
import Header from '../Header';
import CompanySidebar from '../company/CompanySidebar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 160;
const AVATAR_SIZE = 88;
const AVATAR_OVERLAP = 44;

type MasterData = { id: number; name: string };

function getAgeFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  try {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

function formatMemberDate(createdAt: string | null | undefined): string {
  if (!createdAt) return '';
  try {
    const d = new Date(createdAt);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(createdAt);
  }
}

/** When profile is opened from company's job applicants list (has job/application context). */
export interface JobSeekerApplicationContext {
  jobId: number;
  applicationId: number;
  companyId: number;
  isShortlisted?: boolean;
  isHired?: boolean;
  /** Current application status for the status dropdown. */
  applicationStatus?: 'applied' | 'shortlisted' | 'hired' | 'rejected';
}

interface JobSeekerProfileProps {
  seekerId: number;
  onBack: () => void;
  onStartChat?: (user: Record<string, any>) => void;
  /** 'direct' = from CV search/job seekers list; 'application' = from job applicants. */
  source?: 'direct' | 'application';
  /** When source === 'application', pass job/application context for Shortlist/Hire actions. */
  applicationContext?: JobSeekerApplicationContext;
  /** Called when company taps "Unlock Profile". Return true (or resolve to true) to refetch profile. */
  onUnlockProfile?: (userId: number) => void | Promise<boolean | void>;
  onShortlist?: (applicationId: number, userId: number, jobId: number, companyId: number) => void;
  onRemoveShortlist?: (applicationId: number, userId: number, jobId: number, companyId: number) => void;
  onHire?: (applicationId: number, userId: number, jobId: number, companyId: number) => void;
  onRemoveFromHired?: (applicationId: number, userId: number, jobId: number, companyId: number) => void;
  onReject?: (applicationId: number) => void;
  /** Unified status change (Applied, Shortlisted, Hired, Rejected). When provided, shows status dropdown. */
  onApplicationStatusChange?: (newStatus: 'applied' | 'shortlisted' | 'hired' | 'rejected') => void | Promise<boolean | void>;
  /** Company bottom nav (Home, Post Job, Packages, Chat, Profile). When provided, shows CompanyBottomNav. */
  onCompanyNavPress?: (tab: CompanyTabId) => void;
  /** Unread count for Chat tab badge. */
  chatUnreadCount?: number;
  /** Company sidebar menu. When provided, shows Header with menu and CompanySidebar. */
  onCompanyMenuPress?: (key: string) => void;
  onLogout?: () => void;
  menuCompanyName?: string;
  menuCompanyLogo?: string;
}

const JobSeekerProfile: React.FC<JobSeekerProfileProps> = ({
  seekerId,
  onBack,
  onStartChat,
  source = 'direct',
  applicationContext,
  onUnlockProfile,
  onShortlist,
  onRemoveShortlist,
  onHire,
  onRemoveFromHired,
  onReject,
  onApplicationStatusChange,
  onCompanyNavPress,
  chatUnreadCount = 0,
  onCompanyMenuPress,
  onLogout,
  menuCompanyName,
  menuCompanyLogo,
}) => {
  const { t } = useTranslation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Record<string, any> | null>(null);
  const [profileCv, setProfileCv] = useState<Record<string, any> | null>(null);
  const [summary, setSummary] = useState<{ summary?: string } | null>(null);
  const [skills, setSkills] = useState<{ id?: number; skill?: string }[]>([]);
  const [languages, setLanguages] = useState<{ id?: number; language?: string; language_level?: number }[]>([]);
  const [experience, setExperience] = useState<Array<Record<string, any>>>([]);
  const [education, setEducation] = useState<Array<Record<string, any>>>([]);
  const [portfolio, setPortfolio] = useState<Array<Record<string, any>>>([]);
  const [genders, setGenders] = useState<MasterData[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<MasterData[]>([]);
  const [countries, setCountries] = useState<MasterData[]>([]);
  const [nationalities, setNationalities] = useState<MasterData[]>([]);
  const [jobExperiences, setJobExperiences] = useState<MasterData[]>([]);
  const [careerLevels, setCareerLevels] = useState<MasterData[]>([]);
  const [industries, setIndustries] = useState<MasterData[]>([]);
  const [functionalAreas, setFunctionalAreas] = useState<MasterData[]>([]);
  const [states, setStates] = useState<MasterData[]>([]);
  const [cities, setCities] = useState<MasterData[]>([]);
  const [error, setError] = useState<string | null>(null);
  /** From API: company can see contact/CV only if profile unlocked or from job application. */
  const [canViewContact, setCanViewContact] = useState(true);
  const [canDownloadCv, setCanDownloadCv] = useState(true);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const refetchProfile = async () => {
    const res = await getViewPublicProfile(seekerId);
    if (res.data?.user && typeof res.data.user === 'object') {
      setUser(res.data.user);
      setProfileCv(res.data.profileCv ?? null);
      setSummary(res.data.summary ?? null);
      setSkills(Array.isArray(res.data.skills) ? res.data.skills : []);
      setLanguages(Array.isArray(res.data.languages) ? res.data.languages : []);
      setExperience(Array.isArray(res.data.experience) ? res.data.experience : []);
      setEducation(Array.isArray(res.data.education) ? res.data.education : []);
      setPortfolio(Array.isArray(res.data.portfolio) ? res.data.portfolio : []);
      setCanViewContact(res.data.can_view_contact !== false);
      setCanDownloadCv(res.data.can_download_cv !== false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getViewPublicProfile(seekerId);
        if (cancelled) return;
        if (res.data?.user && typeof res.data.user === 'object') {
          setUser(res.data.user);
          setProfileCv(res.data.profileCv ?? null);
          setSummary(res.data.summary ?? null);
          setSkills(Array.isArray(res.data.skills) ? res.data.skills : []);
          setLanguages(Array.isArray(res.data.languages) ? res.data.languages : []);
          setExperience(Array.isArray(res.data.experience) ? res.data.experience : []);
          setEducation(Array.isArray(res.data.education) ? res.data.education : []);
          setPortfolio(Array.isArray(res.data.portfolio) ? res.data.portfolio : []);
          setCanViewContact(res.data.can_view_contact !== false);
          setCanDownloadCv(res.data.can_download_cv !== false);
        } else {
          setError(res.error || t('something_went_wrong'));
        }
      } catch (e) {
        if (!cancelled) setError(t('something_went_wrong'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [seekerId, t]);

  const findNameById = (list: MasterData[], id: number | string | null | undefined): string | undefined => {
    const n = typeof id === 'string' ? parseInt(id, 10) : id ?? 0;
    if (!n) return undefined;
    return list.find(item => item.id === n)?.name;
  };

  // Load master data (genders, marital statuses, job experiences, etc.) once we know user ids
  useEffect(() => {
    const loadMasterData = async () => {
      if (!user) return;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const fetchWithTimeout = async (endpoint: string) => {
          try {
            const res = await fetch(buildApiUrl(endpoint), {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              signal: controller.signal,
            });
            return res.ok ? res : null;
          } catch {
            return null;
          }
        };

        const [
          gendersRes,
          maritalStatusesRes,
          countriesRes,
          jobExperiencesRes,
          careerLevelsRes,
          industriesRes,
          functionalAreasRes,
        ] = await Promise.all([
          fetchWithTimeout('/master-data/genders'),
          fetchWithTimeout('/master-data/marital-statuses'),
          fetchWithTimeout('/master-data/countries'),
          fetchWithTimeout('/master-data/job-experiences'),
          fetchWithTimeout('/master-data/career-levels'),
          fetchWithTimeout('/master-data/industries'),
          fetchWithTimeout('/master-data/functional-areas'),
        ]);

        clearTimeout(timeoutId);

        if (gendersRes) {
          const gendersData = await gendersRes.json();
          const all = gendersData.data || gendersData || [];
          const english = all.filter((item: any) => {
            const text = item.gender || item.name || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            return (text === '' || /^[a-zA-Z\s\-\.]+$/.test(text)) && isEnglish && isActive;
          });
          setGenders(
            english.map((item: any) => ({
              id: item.id,
              name: item.gender || item.name || t('unknown'),
            })),
          );
        }

        if (maritalStatusesRes) {
          const data = await maritalStatusesRes.json();
          const all = data.data || data || [];
          const english = all.filter((item: any) => {
            const text = item.marital_status || item.name || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            return (text === '' || /^[a-zA-Z\s\-\.]+$/.test(text)) && isEnglish && isActive;
          });
          setMaritalStatuses(
            english.map((item: any) => ({
              id: item.id,
              name: item.marital_status || item.name || t('unknown'),
            })),
          );
        }

        if (countriesRes) {
          const data = await countriesRes.json();
          const all = data.data || data || [];
          const englishCountries = all.filter((item: any) => {
            const text = item.country || item.name || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            return (text === '' || /^[a-zA-Z\s\-\.]+$/.test(text)) && isEnglish && isActive;
          });
          setCountries(
            englishCountries.map((item: any) => ({
              id: item.id,
              name: item.country || item.name || t('unknown'),
            })),
          );

          // Nationalities from countries table
          const nationalitiesData = all.filter((item: any) => {
            const nationalityText = item.nationality || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            const hasNationality = nationalityText && nationalityText.trim() !== '';
            return hasNationality && isEnglish && isActive && /^[a-zA-Z\s\-\.]+$/.test(nationalityText);
          });
          let finalNationalities: MasterData[];
          if (nationalitiesData.length > 0) {
            finalNationalities = nationalitiesData.map((item: any) => ({
              id: item.id,
              name: item.nationality || t('unknown'),
            }));
          } else {
            finalNationalities = englishCountries.map((item: any) => ({
              id: item.id + 100000,
              name: item.nationality || item.country || item.name || t('unknown'),
            }));
          }
          setNationalities(finalNationalities);
        }

        if (jobExperiencesRes) {
          const data = await jobExperiencesRes.json();
          const all = data.data || data || [];
          const english = all.filter((item: any) => {
            const text = item.job_experience || item.name || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            const regexMatch = /^[a-zA-Z0-9\s\-\.]+$/.test(text);
            return (text === '' || regexMatch) && isEnglish && isActive;
          });
          setJobExperiences(
            english.map((item: any) => ({
              id: item.id,
              name: item.job_experience || item.name || t('unknown'),
            })),
          );
        }

        if (careerLevelsRes) {
          const data = await careerLevelsRes.json();
          const all = data.data || data || [];
          const english = all.filter((item: any) => {
            const text = item.career_level || item.name || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            return (text === '' || /^[a-zA-Z\s\-\.]+$/.test(text)) && isEnglish && isActive;
          });
          setCareerLevels(
            english.map((item: any) => ({
              id: item.id,
              name: item.career_level || item.name || t('unknown'),
            })),
          );
        }

        if (industriesRes) {
          const data = await industriesRes.json();
          const all = data.data || data || [];
          const english = all.filter((item: any) => {
            const text = item.industry || item.name || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            return (text === '' || /^[a-zA-Z\s\-\.]+$/.test(text)) && isEnglish && isActive;
          });
          setIndustries(
            english.map((item: any) => ({
              id: item.id,
              name: item.industry || item.name || t('unknown'),
            })),
          );
        }

        if (functionalAreasRes) {
          const data = await functionalAreasRes.json();
          const all = data.data || data || [];
          const english = all.filter((item: any) => {
            const text = item.functional_area || item.name || '';
            const isEnglish = item.lang === 'en' || item.lang === '' || !item.lang;
            const isActive = item.is_active === 1 || item.is_active === undefined;
            return (text === '' || /^[a-zA-Z\s\-\.]+$/.test(text)) && isEnglish && isActive;
          });
          setFunctionalAreas(
            english.map((item: any) => ({
              id: item.id,
              name: item.functional_area || item.name || t('unknown'),
            })),
          );
        }

        // Fetch states and cities for user's location, to map IDs to names
        if (user.country_id) {
          try {
            const resStates = await fetch(buildApiUrl(`/master-data/states/${user.country_id}`), {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
            });
            if (resStates.ok) {
              const dataStates = await resStates.json();
              const allStates = dataStates.data || dataStates || [];
              const mappedStates = allStates.map((item: any) => ({
                id: item.id,
                name: item.state || item.name || t('unknown'),
              }));
              setStates(mappedStates);
            }
          } catch {}
        }

        if (user.state_id) {
          try {
            const resCities = await fetch(buildApiUrl(`/master-data/cities/${user.state_id}`), {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
            });
            if (resCities.ok) {
              const dataCities = await resCities.json();
              const allCities = dataCities.data || dataCities || [];
              const mappedCities = allCities.map((item: any) => ({
                id: item.id,
                name: item.city || item.name || t('unknown'),
              }));
              setCities(mappedCities);
            }
          } catch {}
        }
      } catch {
        // ignore master data errors; profile will still show ids or placeholders
      }
    };

    loadMasterData();
  }, [user, t]);

  const getName = () => {
    if (!user) return '';
    const n = user.name || [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    return n || user.email || `#${user.id}`;
  };

  const getLocation = () => {
    if (!user) return '';

    // Prefer explicit location from enriched experience data if available
    if (experience.length > 0) {
      const exp = experience[0];
      const expLoc = [exp.city, exp.state, exp.country].filter(Boolean).join(', ');
      if (expLoc) return expLoc;
    }

    const cityName =
      findNameById(cities, user.city_id) ||
      (typeof user.city === 'string' && isNaN(parseInt(user.city, 10)) ? user.city : '');
    const stateName =
      findNameById(states, user.state_id) ||
      (typeof user.state === 'string' && isNaN(parseInt(user.state, 10)) ? user.state : '');
    const countryName =
      findNameById(countries, user.country_id) ||
      (typeof user.country === 'string' && isNaN(parseInt(user.country, 10)) ? user.country : '');

    return [cityName, stateName, countryName].filter(Boolean).join(', ');
  };

  const getAvatarUri = () => {
    if (!user?.image) return null;
    const path = (user.image || '').replace(/^.*\/user_images\/?/, '');
    return buildUserImageUrl(path || user.image);
  };

  const getCoverUri = () => {
    if (!user?.cover_image) return null;
    const path = (user.cover_image || '').replace(/^.*\/user_images\/?/, '');
    return buildUserImageUrl(path || user.cover_image);
  };

  const openEmail = () => user?.email && Linking.openURL(`mailto:${user.email}`);
  const openPhone = () => {
    const num = user?.mobile_num || user?.phone;
    if (num) Linking.openURL(`tel:${num}`);
  };
  const openVideo = () => user?.video_link && Linking.openURL(user.video_link);
  const openResume = () => {
    const file = profileCv?.cv_file;
    if (file) Linking.openURL(buildAssetUrl(`/user_images/cvs/${file}`));
  };
  const handleStartChat = () => {
    if (onStartChat && user) onStartChat(user);
    else if (user?.email) Linking.openURL(`mailto:${user.email}`);
  };

  const renderHeader = () =>
    onCompanyMenuPress ? (
      <Header
        title={t('profile_overview')}
        onBack={onBack}
        showBack
        onMenuPress={() => setSidebarVisible(true)}
      />
    ) : (
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile_overview')}</Text>
      </View>
    );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2E5CD0" />
        </View>
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={48} color="#94A3B8" />
          <Text style={styles.errorText}>{error || t('something_went_wrong')}</Text>
        </View>
      </View>
    );
  }

  const coverUri = getCoverUri();
  const functionalArea = user.functional_area || user.job_title || null;
  const age = getAgeFromDob(user.date_of_birth);
  const memberSince = formatMemberDate(user.created_at);

  // Consider complete if contact details exist (CV optional — backend may have cv_file null)
  const isProfileComplete = !!(user?.email && user?.phone);
  const isFromApplication = source === 'application' && applicationContext;
  const appCtx = applicationContext;

  const renderActionButtons = () => {
    const buttons: React.ReactNode[] = [];
    const isLocked = !canViewContact || !canDownloadCv;

    if (canDownloadCv && profileCv?.cv_file) {
      buttons.push(
        <TouchableOpacity key="download" style={styles.btnOutline} onPress={openResume} activeOpacity={0.8}>
          <MaterialIcons name="download" size={20} color="#2E5CD0" />
          <Text style={styles.btnOutlineText}>{t('download_cv')}</Text>
        </TouchableOpacity>
      );
    }

    if (isLocked) {
      if (!isProfileComplete) {
        buttons.push(
          <View key="incomplete" style={styles.actionRowFull}>
            <Text style={styles.profileIncompleteText}>{t('candidate_profile_incomplete')}</Text>
          </View>
        );
      } else if (onUnlockProfile) {
        buttons.push(
          <TouchableOpacity
            key="unlock"
            style={styles.btnOutline}
            onPress={async () => {
              setUnlocking(true);
              try {
                const result = await onUnlockProfile(seekerId);
                if (result === true) await refetchProfile();
              } finally {
                setUnlocking(false);
              }
            }}
            disabled={unlocking}
            activeOpacity={0.8}
          >
            {unlocking ? (
              <ActivityIndicator size="small" color="#2E5CD0" />
            ) : (
              <MaterialIcons name="lock" size={20} color="#2E5CD0" />
            )}
            <Text style={styles.btnOutlineText}>{unlocking ? t('unlocking') : t('profile_locked')}</Text>
          </TouchableOpacity>
        );
        buttons.push(
          <View key="unlockHint" style={styles.actionRowFull}>
            <Text style={styles.unlockHintText}>{t('unlock_profile_to_view_contact')}</Text>
          </View>
        );
      }
    }

    if (isFromApplication && appCtx && onApplicationStatusChange) {
      const status = appCtx.applicationStatus ?? 'applied';
      const getStatusLabel = (s: string) => {
        if (s === 'shortlisted') return t('status_shortlisted');
        if (s === 'rejected') return t('status_rejected');
        if (s === 'hired') return t('status_hired');
        return t('status_applied');
      };
      const getStatusColor = (s: string) => {
        if (s === 'hired') return '#17D27C';
        if (s === 'shortlisted') return '#F59E0B';
        if (s === 'rejected') return '#EF4444';
        return '#64748B';
      };
      buttons.push(
        <TouchableOpacity
          key="status"
          style={[styles.btnOutline, { borderColor: getStatusColor(status) + '80', backgroundColor: getStatusColor(status) + '12' }]}
          onPress={() => setShowStatusModal(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="flag" size={20} color={getStatusColor(status)} />
          <Text style={[styles.btnOutlineText, { color: getStatusColor(status) }]}>{getStatusLabel(status)}</Text>
          <MaterialIcons name="arrow-drop-down" size={20} color={getStatusColor(status)} />
        </TouchableOpacity>
      );
    } else if (isFromApplication && appCtx) {
      buttons.push(
        <TouchableOpacity
          key="more"
          style={styles.btnOutline}
          onPress={() => setShowActionsModal(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="more-horiz" size={20} color="#2E5CD0" />
          <Text style={styles.btnOutlineText}>{t('more_actions')}</Text>
        </TouchableOpacity>
      );
    }

    if (canViewContact) {
      buttons.push(
        <TouchableOpacity key="chat" style={styles.btnPrimary} onPress={handleStartChat} activeOpacity={0.8}>
          <MaterialIcons name="chat-bubble-outline" size={20} color="#fff" />
          <Text style={styles.btnPrimaryText}>{t('start_chat')}</Text>
        </TouchableOpacity>
      );
    }

    return buttons;
  };

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, onCompanyNavPress ? { paddingBottom: 100 } : null]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover photo (below header) */}
        <View style={styles.coverWrap}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImg} />
          ) : (
            <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={StyleSheet.absoluteFill} />
          )}
          <View style={styles.coverOverlay} />
        </View>

        {/* Profile block: avatar + name + meta + action buttons */}
        <View style={styles.profileBlock}>
          <View style={styles.avatarWrap}>
            {getAvatarUri() ? (
              <Image source={{ uri: getAvatarUri()! }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="person" size={40} color="#94A3B8" />
              </View>
            )}
          </View>
          <Text style={styles.name}>{getName()}</Text>
          {functionalArea ? (
            <Text style={styles.functionalArea}>({functionalArea})</Text>
          ) : null}
          {user.is_immediate_available === 1 && (
            <View style={styles.readyBadge}>
              <View style={styles.readyDot} />
              <Text style={styles.readyText}>{t('ready_for_hire')}</Text>
            </View>
          )}
          {getLocation() ? (
            <View style={styles.metaRow}>
              <MaterialIcons name="place" size={18} color="#64748B" />
              <Text style={styles.metaText}>{getLocation()}</Text>
            </View>
          ) : null}
          {memberSince ? (
            <View style={styles.metaRow}>
              <MaterialIcons name="history" size={18} color="#64748B" />
              <Text style={styles.metaText}>{t('member_since')}, {memberSince}</Text>
            </View>
          ) : null}
          <View style={styles.actionRow}>
            {renderActionButtons()}
          </View>
        </View>

        {/* 2. Contact Information — only show when profile is unlocked */}
        {canViewContact && (
          <View style={styles.card}>
            <Text style={styles.cardTitleBlue}>{t('contact_information')}</Text>
            <TouchableOpacity style={styles.contactRow} onPress={openPhone} disabled={!user.phone}>
              <MaterialIcons name="phone" size={22} color="#2E5CD0" style={styles.contactIcon} />
              <Text style={styles.contactValue}>{user.phone || '—'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactRow} onPress={openPhone} disabled={!user.mobile_num}>
              <MaterialIcons name="smartphone" size={22} color="#2E5CD0" style={styles.contactIcon} />
              <Text style={styles.contactValue}>{user.mobile_num || '—'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactRow} onPress={openEmail} disabled={!user.email}>
              <MaterialIcons name="email" size={22} color="#2E5CD0" style={styles.contactIcon} />
              <Text style={styles.contactValue}>{user.email || '—'}</Text>
            </TouchableOpacity>
            <View style={styles.contactRow}>
              <MaterialIcons name="location-on" size={22} color="#2E5CD0" style={styles.contactIcon} />
              <Text style={styles.contactValue}>{user.street_address || getLocation() || '—'}</Text>
            </View>
          </View>
        )}

        {/* 3. Candidate Details - 2-column grid */}
        <View style={styles.card}>
          <Text style={styles.cardTitleBlue}>{t('candidate_details')}</Text>
          <View style={styles.detailGrid}>
            <DetailCell icon="verified-user" label={t('verified')} value={user.verified ? t('yes') : t('no')} />
            <DetailCell icon="work" label={t('ready_for_hire')} value={user.is_immediate_available === 1 ? t('yes') : t('no')} />
            <DetailCell icon="cake" label={t('age')} value={age != null ? t('age_years', { count: age }) : null} />
            <DetailCell
              icon="person"
              label={t('gender')}
              value={user.gender || findNameById(genders, user.gender_id) || null}
            />
            <DetailCell
              icon="people"
              label={t('marital_status')}
              value={user.marital_status || findNameById(maritalStatuses, user.marital_status_id) || null}
            />
            <DetailCell
              icon="schedule"
              label={t('experience')}
              value={user.job_experience || findNameById(jobExperiences, user.job_experience_id) || null}
            />
            <DetailCell
              icon="trending-up"
              label={t('career_level')}
              value={user.career_level || findNameById(careerLevels, user.career_level_id) || null}
            />
            <DetailCell icon="place" label={t('location')} value={getLocation() || null} />
            <DetailCell
              icon="attach-money"
              label={t('current_salary')}
              value={user.current_salary != null ? String(user.current_salary) : null}
            />
            <DetailCell
              icon="payments"
              label={t('expected_salary')}
              value={user.expected_salary != null ? String(user.expected_salary) : null}
            />
            <DetailCell
              icon="work"
              label={t('functional_area')}
              value={user.functional_area || findNameById(functionalAreas, user.functional_area_id) || null}
            />
            
          </View>
        </View>

        {/* 4. About me: summary + experience, education, skills, languages, portfolio */}
        <View style={styles.card}>
         
          {(() => {
            const summaryText = summary?.summary ?? user?.profile_summary?.[0]?.summary;
            return summaryText ? (
              <>
                <Text style={styles.sectionLabel}>{t('about_me')}</Text>
                <Text style={styles.summaryText}>{summaryText}</Text>
              </>
            ) : null;
          })()}
          {experience.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('work_experience')}</Text>
              {experience.map((exp, idx) => (
                <View key={`${exp.id ?? 'exp'}-${idx}`} style={styles.blockItem}>
                  <Text style={styles.blockTitle}>{[exp.title, exp.company].filter(Boolean).join(' · ') || '—'}</Text>
                  {(exp.country || exp.city) && (
                    <Text style={styles.blockMeta}>{[exp.city, exp.state, exp.country].filter(Boolean).join(', ')}</Text>
                  )}
                  {(exp.date_start || exp.date_end || exp.is_currently_working) && (
                    <Text style={styles.blockMeta}>
                      {exp.date_start ? new Date(exp.date_start).getFullYear() : ''}
                      {exp.is_currently_working ? ` – ${t('present')}` : exp.date_end ? ` – ${new Date(exp.date_end).getFullYear()}` : ''}
                    </Text>
                  )}
                  {exp.description ? <Text style={styles.blockDesc}>{exp.description}</Text> : null}
                </View>
              ))}
            </>
          )}
          {education.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('education')}</Text>
              {education.map((edu, idx) => (
                <View key={`${edu.id ?? 'edu'}-${idx}`} style={styles.blockItem}>
                  <Text style={styles.blockTitle}>{[edu.degree_title, edu.degree_level, edu.degree_type].filter(Boolean).join(' · ') || '—'}</Text>
                  <Text style={styles.blockMeta}>{[edu.institution, edu.city, edu.state, edu.country].filter(Boolean).join(', ')}</Text>
                  {(edu.date_completion || edu.degree_result) && (
                    <Text style={styles.blockMeta}>{[edu.date_completion, edu.degree_result].filter(Boolean).join(' · ')}</Text>
                  )}
                </View>
              ))}
            </>
          )}
          {skills.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('skills')}</Text>
              <View style={styles.chipWrap}>
                {skills.map((s, idx) => (
                  <View key={`${s.id ?? 'skill'}-${idx}`} style={styles.chip}>
                    <Text style={styles.chipText}>{s.skill || '—'}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          {languages.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('languages')}</Text>
              <View style={styles.chipWrap}>
                {languages.map((l, idx) => (
                  <View key={`${l.id ?? 'lang'}-${idx}`} style={styles.chip}>
                    <Text style={styles.chipText}>{l.language || '—'}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          {portfolio.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('portfolio')}</Text>
              {portfolio.map((p, idx) => {
                const imageUri = p.image ? buildAssetUrl(`/project_images/${p.image}`) : null;
                return (
                  <View key={`${p.id ?? 'portfolio'}-${idx}`} style={styles.portfolioItem}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.portfolioImage} />
                    ) : null}
                    <View style={styles.portfolioContent}>
                      <Text style={styles.blockTitle}>{p.name || '—'}</Text>
                      {p.description ? <Text style={styles.blockDesc}>{p.description}</Text> : null}
                      {p.url ? (
                        <TouchableOpacity onPress={() => p.url && Linking.openURL(p.url.startsWith('http') ? p.url : `https://${p.url}`)}>
                          <Text style={styles.linkText}>{p.url}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>

        {user.video_link && (
          <TouchableOpacity style={styles.cardAction} onPress={openVideo} activeOpacity={0.8}>
            <MaterialIcons name="play-circle-filled" size={28} color="#2E5CD0" />
            <Text style={styles.cardActionText}>{t('video_intro')}</Text>
            <MaterialIcons name="chevron-right" size={24} color="#94A3B8" />
          </TouchableOpacity>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Company bottom navigation (when in company flow) */}
      {onCompanyNavPress && (
        <CompanyBottomNav
          onTabPress={(tab) => {
            if (tab === 'home') onBack();
            else onCompanyNavPress?.(tab);
          }}
          chatUnreadCount={chatUnreadCount}
        />
      )}

      {/* Company sidebar (when in company flow) */}
      {onCompanyMenuPress && (
        <CompanySidebar
          isVisible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          onMenuItemPress={(key) => {
            setSidebarVisible(false);
            onCompanyMenuPress(key);
          }}
          onLogout={onLogout ?? (() => {})}
          companyName={menuCompanyName}
          companyLogo={menuCompanyLogo}
        />
      )}

      {/* More actions dropdown (when viewing from job application) */}
      {isFromApplication && appCtx && (
        <Modal visible={showActionsModal} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowActionsModal(false)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>{t('more_actions')}</Text>
              {appCtx.isHired ? (
                onRemoveFromHired && (
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => {
                      onRemoveFromHired(appCtx.applicationId, seekerId, appCtx.jobId, appCtx.companyId);
                      setShowActionsModal(false);
                    }}
                  >
                    <MaterialIcons name="person-remove" size={20} color="#1E293B" />
                    <Text style={styles.modalOptionText}>{t('remove_from_hired_list')}</Text>
                  </TouchableOpacity>
                )
              ) : (
                <>
                  {appCtx.isShortlisted ? (
                    onRemoveShortlist && (
                      <TouchableOpacity
                        style={styles.modalOption}
                        onPress={() => {
                          onRemoveShortlist(appCtx.applicationId, seekerId, appCtx.jobId, appCtx.companyId);
                          setShowActionsModal(false);
                        }}
                      >
                        <MaterialIcons name="bookmark" size={20} color="#1E293B" />
                        <Text style={styles.modalOptionText}>{t('shortlisted')}</Text>
                      </TouchableOpacity>
                    )
                  ) : (
                    onShortlist && (
                      <TouchableOpacity
                        style={styles.modalOption}
                        onPress={() => {
                          onShortlist(appCtx.applicationId, seekerId, appCtx.jobId, appCtx.companyId);
                          setShowActionsModal(false);
                        }}
                      >
                        <MaterialIcons name="bookmark-border" size={20} color="#1E293B" />
                        <Text style={styles.modalOptionText}>{t('shortlist')}</Text>
                      </TouchableOpacity>
                    )
                  )}
                  {onHire && (
                    <TouchableOpacity
                      style={styles.modalOption}
                      onPress={() => {
                        onHire(appCtx.applicationId, seekerId, appCtx.jobId, appCtx.companyId);
                        setShowActionsModal(false);
                      }}
                    >
                      <MaterialIcons name="work" size={20} color="#1E293B" />
                      <Text style={styles.modalOptionText}>{t('hire_this_candidate')}</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
              {onReject && !appCtx.isHired && (
                <TouchableOpacity
                  style={[styles.modalOption, styles.modalOptionDanger]}
                  onPress={() => {
                    onReject(appCtx.applicationId);
                    setShowActionsModal(false);
                  }}
                >
                  <MaterialIcons name="close" size={20} color="#B91C1C" />
                  <Text style={styles.modalOptionTextDanger}>{t('reject')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowActionsModal(false)}>
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Status dropdown (when from applied candidates with onApplicationStatusChange) */}
      {isFromApplication && appCtx && onApplicationStatusChange && (
        <Modal visible={showStatusModal} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowStatusModal(false)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>{t('set_status')}</Text>
              {(['applied', 'shortlisted', 'hired', 'rejected'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.modalOption}
                  onPress={async () => {
                    setShowStatusModal(false);
                    await onApplicationStatusChange(s);
                  }}
                >
                  <Text style={styles.modalOptionText}>
                    {s === 'applied' ? t('status_applied') : s === 'shortlisted' ? t('status_shortlisted') : s === 'hired' ? t('status_hired') : t('status_rejected')}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowStatusModal(false)}>
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

function DetailCell({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  const displayValue = value == null || value === '' ? '—' : value;
  return (
    <View style={detailCellStyles.cell}>
      <MaterialIcons name={icon as any} size={22} color="#2E5CD0" style={detailCellStyles.icon} />
      <Text style={detailCellStyles.label}>{label.toUpperCase()}</Text>
      <Text style={detailCellStyles.value}>{displayValue}</Text>
    </View>
  );
}

const detailCellStyles = StyleSheet.create({
  cell: { flex: 1, minWidth: '45%', marginBottom: 16 },
  icon: { marginBottom: 4 },
  label: { fontSize: 11, color: '#64748B', marginBottom: 2, fontWeight: '600' },
  value: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#64748B', fontSize: 15, textAlign: 'center', marginTop: 12 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  coverWrap: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
    backgroundColor: '#3B82F6',
  },
  coverImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  profileBlock: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -AVATAR_OVERLAP,
    borderRadius: 16,
    paddingTop: AVATAR_OVERLAP + 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarWrap: {
    position: 'absolute',
    top: -AVATAR_OVERLAP,
    left: (SCREEN_WIDTH - 32) / 2 - AVATAR_SIZE / 2,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  functionalArea: { fontSize: 14, color: '#64748B', marginTop: 4 },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    gap: 6,
  },
  readyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#17D27C' },
  readyText: { fontSize: 14, fontWeight: '600', color: '#166534' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  metaText: { fontSize: 14, color: '#475569' },
  actionRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2E5CD0',
    gap: 8,
  },
  btnOutlineText: { fontSize: 15, fontWeight: '600', color: '#2E5CD0' },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: '#2E5CD0',
    gap: 8,
  },
  btnPrimaryText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitleBlue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E5CD0',
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  contactIcon: { marginRight: 12 },
  contactValue: { fontSize: 15, color: '#1E293B', flex: 1 },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  aboutRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  aboutIcon: { marginRight: 10 },
  aboutLabel: { fontSize: 12, color: '#64748B', marginRight: 8, width: 100 },
  aboutValue: { fontSize: 15, fontWeight: '600', color: '#1E293B', flex: 1 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#2E5CD0', marginTop: 16, marginBottom: 8 },
  summaryText: { fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 4 },
  blockItem: { marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  blockTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  blockMeta: { fontSize: 13, color: '#64748B', marginTop: 2 },
  blockDesc: { fontSize: 14, color: '#475569', marginTop: 6, lineHeight: 20 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { backgroundColor: '#E0E7FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  chipText: { fontSize: 14, color: '#3730A3', fontWeight: '600' },
  linkText: { fontSize: 14, color: '#2E5CD0', marginTop: 4, textDecorationLine: 'underline' },
  portfolioItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  portfolioImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12, backgroundColor: '#E2E8F0' },
  portfolioContent: { flex: 1 },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardActionText: { fontSize: 16, fontWeight: '600', color: '#1E293B', flex: 1 },
  actionRowFull: { width: '100%', marginBottom: 4 },
  profileIncompleteText: { fontSize: 13, color: '#B91C1C', textAlign: 'center' },
  unlockHintText: { fontSize: 12, color: '#64748B', marginTop: 8, textAlign: 'center' },
  contactValueMuted: { fontSize: 15, color: '#94A3B8', flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalOptionText: { fontSize: 16, color: '#334155', flex: 1 },
  modalOptionDanger: { borderBottomColor: '#FEE2E2' },
  modalOptionTextDanger: { fontSize: 16, color: '#B91C1C', flex: 1 },
  modalCancel: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 16, color: '#64748B' },
});

export default JobSeekerProfile;
