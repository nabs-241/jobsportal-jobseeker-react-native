import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import CompanySidebar from './CompanySidebar';
import CompanyBottomNav, { CompanyTabId, COMPANY_BOTTOM_NAV_CONTENT_INSET } from './CompanyBottomNav';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import companyService, {
  CompanyProfile,
  CompanyProfileFormData,
} from '../../services/companyService';
import { buildApiUrl, buildCompanyLogoUrl } from '../../config/api';

interface MasterItem {
  id: number;
  name: string;
}

interface CompanyEditProfileProps {
  onBack: () => void;
  onSuccess?: () => void;
  onCompanyMenuPress?: (key: string) => void;
  onLogout?: () => void;
  /** Fallback for sidebar when profile is still loading */
  companyName?: string;
  companyLogo?: string;
  onCompanyNavPress?: (tab: CompanyTabId) => void;
  chatUnreadCount?: number;
  bottomNavActiveTab?: CompanyTabId;
}

// Simple picker modal
const PickerModal: React.FC<{
  visible: boolean;
  title: string;
  items: MasterItem[];
  selectedId: number;
  onSelect: (id: number) => void;
  onClose: () => void;
}> = ({ visible, title, items, selectedId, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="slide">
    <TouchableOpacity style={pickerStyles.overlay} activeOpacity={1} onPress={onClose}>
      <View style={pickerStyles.content}>
        <Text style={pickerStyles.title}>{title}</Text>
        <ScrollView style={pickerStyles.list}>
          <TouchableOpacity style={pickerStyles.option} onPress={() => { onSelect(0); onClose(); }}>
            <Text style={pickerStyles.optionText}>—</Text>
          </TouchableOpacity>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[pickerStyles.option, selectedId === item.id && pickerStyles.optionSelected]}
              onPress={() => { onSelect(item.id); onClose(); }}
            >
              <Text style={[pickerStyles.optionText, selectedId === item.id && pickerStyles.optionTextSelected]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%' },
  title: { fontSize: 17, fontWeight: '600', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  list: { maxHeight: 400 },
  option: { padding: 14, paddingLeft: 20 },
  optionSelected: { backgroundColor: '#E8F5E9' },
  optionText: { fontSize: 16, color: '#333' },
  optionTextSelected: { color: '#17D27C', fontWeight: '600' },
});

// Match Laravel MiscHelper::getNumOffices() and getNumEmployees() exactly
const NUM_OFFICES_OPTIONS: MasterItem[] = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: String(i + 1),
}));
const NUM_EMPLOYEES_OPTIONS: MasterItem[] = [
  { id: 1, name: '1-10' }, { id: 2, name: '11-50' }, { id: 3, name: '51-100' }, { id: 4, name: '101-200' },
  { id: 5, name: '201-300' }, { id: 6, name: '301-600' }, { id: 7, name: '601-1000' }, { id: 8, name: '1001-1500' },
  { id: 9, name: '1501-2000' }, { id: 10, name: '2001-2500' }, { id: 11, name: '2501-3000' }, { id: 12, name: '3001-3500' },
  { id: 13, name: '3501-4000' }, { id: 14, name: '4001-4500' }, { id: 15, name: '4501-5000' }, { id: 16, name: '5000+' },
];
const ESTABLISHED_YEARS = (() => {
  const y = new Date().getFullYear();
  const arr: MasterItem[] = [];
  for (let i = y; i >= y - 100; i--) arr.push({ id: i, name: String(i) });
  return arr;
})();

const CompanyEditProfile: React.FC<CompanyEditProfileProps> = ({
  onBack,
  onSuccess,
  onCompanyMenuPress,
  onLogout,
  companyName: companyNameProp,
  companyLogo: companyLogoProp,
  onCompanyNavPress,
  chatUnreadCount = 0,
  bottomNavActiveTab,
}) => {
  const { t } = useTranslation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [password, setPassword] = useState('');
  const [tempLogoUri, setTempLogoUri] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [countries, setCountries] = useState<MasterItem[]>([]);
  const [states, setStates] = useState<MasterItem[]>([]);
  const [cities, setCities] = useState<MasterItem[]>([]);
  const [industries, setIndustries] = useState<MasterItem[]>([]);
  const [ownershipTypes, setOwnershipTypes] = useState<MasterItem[]>([]);

  const [pickerKey, setPickerKey] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);

  const update = (key: keyof CompanyProfile, value: any) => {
    setProfile((p) => (p ? { ...p, [key]: value } : null));
  };

  const getLogoUri = () => {
    if (tempLogoUri) return tempLogoUri;
    if (profile?.logo) {
      const p = profile.logo;
      return p.startsWith('http') ? p : buildCompanyLogoUrl(p.replace(/^.*\/company_logos\/?/, ''));
    }
    return undefined;
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await companyService.getCompanyProfileFormData();
      // Laravel sendResponse($success, $arr) puts payload in .message, not .data
      const raw = (res as any)?.message ?? (res as any)?.data ?? res;
      const data: CompanyProfileFormData = raw?.company ? raw : { company: raw };
      const company = data.company ?? raw;
      if (company && company.id) {
        setProfile(company as CompanyProfile);
        // Laravel pluck() returns object {id: name}; convert to [{id, name}]
        const objToItems = (obj: any, nameKey?: string): MasterItem[] => {
          if (!obj || typeof obj !== 'object') return [];
          if (Array.isArray(obj)) {
            return obj.map((x: any) => ({
              id: x.id ?? x,
              name: x.country ?? x.industry ?? x.ownership_type ?? x.name ?? String(x),
            }));
          }
          return Object.entries(obj)
            .filter(([k]) => k !== '' && k !== null && k !== undefined)
            .map(([k, v]) => ({ id: parseInt(k, 10) || (k as any), name: String(v) }));
        };
        const mapCountries = (arr: any) => objToItems(arr);
        const mapIndustries = (arr: any) => objToItems(arr);
        const mapOwnership = (arr: any) => objToItems(arr);
        const c = mapCountries(data.countries).filter((x) => x.id);
        const ind = mapIndustries(data.industries).filter((x) => x.id);
        const own = mapOwnership(data.ownershipTypes).filter((x) => x.id);
        setCountries(c.length ? c : await fetchMasterCountries());
        setIndustries(ind.length ? ind : await fetchMasterIndustries());
        setOwnershipTypes(own);

        if ((company as any).country_id) {
          await fetchStates((company as any).country_id);
        }
        if ((company as any).state_id) {
          await fetchCities((company as any).state_id);
        }
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterCountries = async (): Promise<MasterItem[]> => {
    try {
      const res = await fetch(buildApiUrl('/master-data/countries'), { headers: { Accept: 'application/json' } });
      if (!res.ok) return [];
      const json = await res.json();
      const arr = (json.data ?? json) || [];
      return (Array.isArray(arr) ? arr : []).map((x: any) => ({ id: x.id ?? x, name: x.country ?? x.name ?? String(x) }));
    } catch { return []; }
  };

  const fetchMasterIndustries = async (): Promise<MasterItem[]> => {
    try {
      const res = await fetch(buildApiUrl('/master-data/industries'), { headers: { Accept: 'application/json' } });
      if (!res.ok) return [];
      const json = await res.json();
      const arr = (json.data ?? json) || [];
      return (Array.isArray(arr) ? arr : []).map((x: any) => ({ id: x.id ?? x, name: x.industry ?? x.name ?? String(x) }));
    } catch { return []; }
  };

  const fetchStates = async (countryId: number) => {
    try {
      const res = await fetch(buildApiUrl(`/master-data/states/${countryId}`), {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const arr = (json.data ?? json) || [];
        setStates(
          (Array.isArray(arr) ? arr : []).map((x: any) => ({
            id: x.id ?? x,
            name: x.state ?? x.name ?? String(x),
          }))
        );
      } else setStates([]);
    } catch {
      setStates([]);
    }
  };

  const fetchCities = async (stateId: number) => {
    try {
      const res = await fetch(buildApiUrl(`/master-data/cities/${stateId}`), {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const arr = (json.data ?? json) || [];
        setCities(
          (Array.isArray(arr) ? arr : []).map((x: any) => ({
            id: x.id ?? x,
            name: x.city ?? x.name ?? String(x),
          }))
        );
      } else setCities([]);
    } catch {
      setCities([]);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleCountryChange = async (id: number) => {
    update('country_id', id || undefined);
    setStates([]);
    setCities([]);
    if (id) await fetchStates(id);
  };

  const handleStateChange = async (id: number) => {
    update('state_id', id || undefined);
    setCities([]);
    if (id) await fetchCities(id);
  };

  const handleLogoPick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permission_required'), t('need_photo_permission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setTempLogoUri(result.assets[0].uri);
    }
  };

  const buildFormData = (): FormData => {
    const fd = new FormData();
    if (profile) {
      const fields = [
        'name', 'email', 'industry_id', 'ownership_type_id', 'description',
        'no_of_offices', 'no_of_employees', 'established_in', 'website', 'phone',
        'facebook', 'twitter', 'linkedin', 'pinterest',
        'country_id', 'state_id', 'city_id', 'map',
        'contact_name', 'contact_email', 'ceo', 'registration_number',
      ];
      fields.forEach((key) => {
        const v = (profile as any)[key];
        if (v !== undefined && v !== null && v !== '') fd.append(key, String(v));
      });
    }
    if (password) fd.append('password', password);
    if (tempLogoUri) {
      fd.append('logo', {
        uri: tempLogoUri,
        type: 'image/jpeg',
        name: 'logo.jpg',
      } as any);
    }
    return fd;
  };

  const handleSave = async () => {
    if (!profile?.name?.trim()) {
      Alert.alert(t('error'), t('company_name_required'));
      return;
    }
    try {
      setSaving(true);
      const fd = buildFormData();
      const res = await companyService.updateCompanyProfile(fd);
      if (res.success) {
        setTempLogoUri(null);
        Alert.alert(t('success'), t('profile_updated_successfully'), [
          { text: 'OK', onPress: () => { onSuccess?.(); onBack(); } },
        ]);
      } else {
        Alert.alert(t('error'), (res as any).message || (res as any).error || t('something_went_wrong'));
      }
    } catch (e) {
      Alert.alert(t('error'), t('something_went_wrong'));
    } finally {
      setSaving(false);
    }
  };

  const openPicker = (key: string) => {
    setPickerKey(key);
    setPickerVisible(true);
  };

  const getPickerItems = () => {
    switch (pickerKey) {
      case 'industry_id': return industries;
      case 'ownership_type_id': return ownershipTypes;
      case 'country_id': return countries;
      case 'state_id': return states;
      case 'city_id': return cities;
      case 'no_of_offices': return NUM_OFFICES_OPTIONS;
      case 'no_of_employees': return NUM_EMPLOYEES_OPTIONS;
      case 'established_in': return ESTABLISHED_YEARS;
      default: return [];
    }
  };

  const getPickerValue = (): number => {
    const v = profile ? (profile as any)[pickerKey] : null;
    if (pickerKey === 'no_of_offices' || pickerKey === 'no_of_employees') {
      const items = getPickerItems() as MasterItem[];
      const found = items.find((i) => String(i.name) === String(v));
      return found?.id ?? 0;
    }
    if (pickerKey === 'established_in') return parseInt(String(v), 10) || 0;
    return typeof v === 'number' ? v : parseInt(String(v), 10) || 0;
  };

  const handlePickerSelect = (id: number) => {
    if (pickerKey === 'country_id') handleCountryChange(id);
    else if (pickerKey === 'state_id') handleStateChange(id);
    else if (profile) {
      const items = getPickerItems();
      const item = items.find((i) => i.id === id);
      if (pickerKey === 'no_of_offices' || pickerKey === 'no_of_employees') {
        update(pickerKey as keyof CompanyProfile, item?.name ?? '');
      } else if (pickerKey === 'established_in') {
        update(pickerKey as keyof CompanyProfile, id ? String(id) : '');
      } else {
        update(pickerKey as keyof CompanyProfile, id || undefined);
      }
    }
    setPickerVisible(false);
  };

  const pickerLabel: Record<string, string> = {
    industry_id: t('industry'),
    ownership_type_id: t('ownership'),
    country_id: t('country'),
    state_id: t('state'),
    city_id: t('city'),
    no_of_offices: t('no_of_offices'),
    no_of_employees: t('no_of_employees'),
    established_in: t('established_in'),
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title={t('company_edit_account')}
          onBack={onBack}
          showBack
          onMenuPress={() => setSidebarVisible(true)}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#17D27C" />
        </View>
        <CompanySidebar
          isVisible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          onMenuItemPress={(key) => {
            setSidebarVisible(false);
            onCompanyMenuPress?.(key);
          }}
          onLogout={onLogout ?? (() => {})}
          companyName={profile?.name ?? companyNameProp}
          companyLogo={profile?.logo ?? companyLogoProp}
        />
        {onCompanyNavPress && (
          <CompanyBottomNav
            activeTab={bottomNavActiveTab}
            onTabPress={onCompanyNavPress}
            chatUnreadCount={chatUnreadCount}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={t('company_edit_account')}
        onBack={onBack}
        showBack
        onMenuPress={() => setSidebarVisible(true)}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={onCompanyNavPress ? { paddingBottom: COMPANY_BOTTOM_NAV_CONTENT_INSET } : undefined}
      >
        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account_information')}</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('email')} *</Text>
            <TextInput
              style={styles.input}
              value={profile?.email ?? ''}
              onChangeText={(v) => update('email', v)}
              placeholder={t('company_email')}
              keyboardType="email-address"
              editable={false}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('password')}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t('password_optional')}
              secureTextEntry
            />
          </View>
        </View>

        {/* Company Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('company_information')}</Text>
          <View style={styles.logoRow}>
            <View style={styles.logoWrap}>
              {getLogoUri() ? (
                <Image source={{ uri: getLogoUri() }} style={styles.logo} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <MaterialIcons name="business" size={48} color="#999" />
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.logoBtn} onPress={handleLogoPick} disabled={uploadingLogo}>
              {uploadingLogo ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.logoBtnText}>{t('select_company_logo')}</Text>}
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('company_name')} *</Text>
            <TextInput
              style={styles.input}
              value={profile?.name ?? ''}
              onChangeText={(v) => update('name', v)}
              placeholder={t('company_name')}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('industry')} *</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('industry_id')}>
              <Text style={[styles.pickerText, !profile?.industry_id && styles.placeholder]}>
                {industries.find((i) => i.id === profile?.industry_id)?.name ?? t('select_industry')}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('ownership')} *</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('ownership_type_id')}>
              <Text style={[styles.pickerText, !profile?.ownership_type_id && styles.placeholder]}>
                {ownershipTypes.find((i) => i.id === profile?.ownership_type_id)?.name ?? t('select_ownership_type')}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('description')} *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profile?.description ?? ''}
              onChangeText={(v) => update('description', v)}
              placeholder={t('company_details')}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Size & Contact */}
        <View style={styles.section}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('no_of_offices')}</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('no_of_offices')}>
              <Text style={[styles.pickerText, !profile?.no_of_offices && styles.placeholder]}>
                {NUM_OFFICES_OPTIONS.find((i) => String(i.name) === String(profile?.no_of_offices))?.name ?? t('select_num_offices')}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('no_of_employees')}</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('no_of_employees')}>
              <Text style={[styles.pickerText, !profile?.no_of_employees && styles.placeholder]}>
                {NUM_EMPLOYEES_OPTIONS.find((i) => String(i.name) === String(profile?.no_of_employees))?.name ?? t('select_num_employees')}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('established_in')}</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('established_in')}>
              <Text style={[styles.pickerText, !profile?.established_in && styles.placeholder]}>
                {profile?.established_in ?? t('select_established_in')}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('website')}</Text>
            <TextInput
              style={styles.input}
              value={profile?.website ?? ''}
              onChangeText={(v) => update('website', v)}
              placeholder={t('website')}
              keyboardType="url"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('phone')}</Text>
            <TextInput
              style={styles.input}
              value={profile?.phone ?? ''}
              onChangeText={(v) => update('phone', v)}
              placeholder={t('phone')}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Social */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('social_links')}</Text>
          {['facebook', 'twitter', 'linkedin', 'pinterest'].map((key) => (
            <View key={key} style={styles.inputGroup}>
              <Text style={styles.label}>{t(key)}</Text>
              <TextInput
                style={styles.input}
                value={(profile as any)?.[key] ?? ''}
                onChangeText={(v) => update(key as keyof CompanyProfile, v)}
                placeholder={t(key)}
                keyboardType="url"
              />
            </View>
          ))}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('location')}</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('country')} *</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('country_id')}>
              <Text style={[styles.pickerText, !profile?.country_id && styles.placeholder]}>
                {countries.find((i) => i.id === profile?.country_id)?.name ?? t('select_country')}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('state')} *</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('state_id')} disabled={!profile?.country_id}>
              <Text style={[styles.pickerText, !profile?.state_id && styles.placeholder]}>
                {states.find((i) => i.id === profile?.state_id)?.name ?? t('select_state')}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('city')} *</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('city_id')} disabled={!profile?.state_id}>
              <Text style={[styles.pickerText, !profile?.city_id && styles.placeholder]}>
                {cities.find((i) => i.id === Number(profile?.city_id))?.name ?? t('select_city')}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('company_address')}</Text>
            <TextInput
              style={styles.input}
              value={profile?.map ?? ''}
              onChangeText={(v) => update('map', v)}
              placeholder={t('company_address')}
            />
          </View>
        </View>

        {/* HR */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('hr_person_information')}</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('name')} *</Text>
            <TextInput
              style={styles.input}
              value={profile?.contact_name ?? ''}
              onChangeText={(v) => update('contact_name', v)}
              placeholder={t('e_g_john_doe')}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('email')} *</Text>
            <TextInput
              style={styles.input}
              value={profile?.contact_email ?? ''}
              onChangeText={(v) => update('contact_email', v)}
              placeholder={t('contact_email')}
              keyboardType="email-address"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('designation')}</Text>
            <TextInput
              style={styles.input}
              value={profile?.ceo ?? ''}
              onChangeText={(v) => update('ceo', v)}
              placeholder={t('e_g_ceo')}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('company_registration_number')}</Text>
            <TextInput
              style={styles.input}
              value={profile?.registration_number ?? ''}
              onChangeText={(v) => update('registration_number', v)}
              placeholder={t('registration_number')}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>{t('update_profile_and_save')}</Text>}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      <PickerModal
        visible={pickerVisible}
        title={pickerLabel[pickerKey] ?? ''}
        items={getPickerItems()}
        selectedId={getPickerValue()}
        onSelect={handlePickerSelect}
        onClose={() => setPickerVisible(false)}
      />

      <CompanySidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onMenuItemPress={(key) => {
          setSidebarVisible(false);
          onCompanyMenuPress?.(key);
        }}
        onLogout={onLogout ?? (() => {})}
        companyName={profile?.name ?? companyNameProp}
        companyLogo={profile?.logo ?? companyLogoProp}
      />
      {onCompanyNavPress && (
        <CompanyBottomNav
          activeTab={bottomNavActiveTab}
          onTabPress={onCompanyNavPress}
          chatUnreadCount={chatUnreadCount}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  section: { backgroundColor: '#fff', marginTop: 12, padding: 16, borderRadius: 12, marginHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2D3748', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 6 },
  input: { backgroundColor: '#F7FAFC', borderRadius: 10, padding: 14, fontSize: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F7FAFC', borderRadius: 10, padding: 14 },
  pickerText: { fontSize: 16, color: '#333' },
  placeholder: { color: '#999' },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  logoWrap: { width: 90, height: 90, borderRadius: 12, overflow: 'hidden', marginRight: 16 },
  logo: { width: '100%', height: '100%' },
  logoPlaceholder: { width: '100%', height: '100%', backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  logoBtn: { backgroundColor: '#17D27C', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignSelf: 'flex-start' },
  logoBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  saveBtn: { backgroundColor: '#17D27C', marginHorizontal: 16, marginTop: 24, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default CompanyEditProfile;
