import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../Header';
import CompanySidebar from './CompanySidebar';
import CompanyBottomNav, { CompanyTabId, COMPANY_BOTTOM_NAV_CONTENT_INSET } from './CompanyBottomNav';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import companyService from '../../services/companyService';

interface MasterItem {
  id: number | string;
  name: string;
}

interface CompanyPostJobProps {
  jobId?: number;
  onBack: () => void;
  onSuccess?: () => void;
  onCompanyMenuPress?: (key: string) => void;
  onLogout?: () => void;
  onCompanyNavPress?: (tab: CompanyTabId) => void;
  chatUnreadCount?: number;
  bottomNavActiveTab?: CompanyTabId;
  menuCompanyName?: string;
  menuCompanyLogo?: string;
}

// Convert Laravel pluck object or array to { id, name }[]
function toOptions(
  raw: Record<string, string> | string[] | null | undefined
): MasterItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item, idx) =>
      typeof item === 'string' ? { id: item, name: item } : { id: idx, name: String(item) }
    );
  }
  return Object.entries(raw).map(([id, name]) => ({
    id: Number(id) || id,
    name: String(name),
  }));
}

/** Laravel may return id=>name objects, or arrays of { id, name, functional_area, job_skill, ... } */
function masterItemsFromUnknown(raw: any): MasterItem[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item: any, idx: number) => {
        if (item == null) return null;
        if (typeof item === 'string') return { id: item, name: item };
        if (typeof item === 'object') {
          const id =
            item.id ??
            item.state_id ??
            item.city_id ??
            item.job_skill_id ??
            item.functional_area_id ??
            idx;
          const name =
            item.name ??
            item.job_skill ??
            item.functional_area ??
            item.title ??
            item.state_name ??
            item.city_name;
          if (name != null && String(name).trim() !== '')
            return { id: Number(id) || id, name: String(name) };
        }
        return null;
      })
      .filter(Boolean) as MasterItem[];
  }
  if (typeof raw === 'object') return toOptions(raw);
  return [];
}

const PickerModal: React.FC<{
  visible: boolean;
  title: string;
  items: MasterItem[];
  selectedId: number | string | null;
  onSelect: (id: number | string) => void;
  onClose: () => void;
  searchPlaceholder: string;
  noResultsText: string;
  clearOptionLabel: string;
}> = ({
  visible,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
  searchPlaceholder,
  noResultsText,
  clearOptionLabel,
}) => {
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);
  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => i.name.toLowerCase().includes(s));
  }, [items, query]);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pickerStyles.overlayInner}>
        <TouchableOpacity style={pickerStyles.overlayDismiss} activeOpacity={1} onPress={onClose} />
        <View style={pickerStyles.content}>
          <Text style={pickerStyles.title}>{title}</Text>
          <TextInput
            style={pickerStyles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor="#94A3B8"
            autoCorrect={false}
            autoCapitalize="none"
          />
          <ScrollView style={pickerStyles.list} keyboardShouldPersistTaps="handled">
            <TouchableOpacity
              style={pickerStyles.option}
              onPress={() => {
                onSelect('');
                onClose();
              }}
            >
              <Text style={pickerStyles.optionText}>{clearOptionLabel}</Text>
            </TouchableOpacity>
            {filtered.length === 0 ? (
              <Text style={pickerStyles.noResults}>{noResultsText}</Text>
            ) : (
              filtered.map((item) => (
                <TouchableOpacity
                  key={String(item.id)}
                  style={[
                    pickerStyles.option,
                    (selectedId === item.id || String(selectedId) === String(item.id)) &&
                      pickerStyles.optionSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      pickerStyles.optionText,
                      (selectedId === item.id || String(selectedId) === String(item.id)) &&
                        pickerStyles.optionTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const MultiSelectModal: React.FC<{
  visible: boolean;
  title: string;
  items: MasterItem[];
  selectedIds: (number | string)[];
  onToggle: (id: number | string) => void;
  onClose: () => void;
  searchPlaceholder: string;
  noResultsText: string;
  doneLabel: string;
}> = ({
  visible,
  title,
  items,
  selectedIds,
  onToggle,
  onClose,
  searchPlaceholder,
  noResultsText,
  doneLabel,
}) => {
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);
  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => i.name.toLowerCase().includes(s));
  }, [items, query]);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={pickerStyles.overlayInner}>
        <TouchableOpacity style={pickerStyles.overlayDismiss} activeOpacity={1} onPress={onClose} />
        <View style={pickerStyles.content}>
          <Text style={pickerStyles.title}>{title}</Text>
          <TextInput
            style={pickerStyles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor="#94A3B8"
            autoCorrect={false}
            autoCapitalize="none"
          />
          <ScrollView style={pickerStyles.list} keyboardShouldPersistTaps="handled">
            {filtered.length === 0 ? (
              <Text style={pickerStyles.noResults}>{noResultsText}</Text>
            ) : (
              filtered.map((item) => {
                const selected = selectedIds.some(
                  (sid) => sid === item.id || String(sid) === String(item.id)
                );
                return (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={[pickerStyles.option, selected && pickerStyles.optionSelected]}
                    onPress={() => onToggle(item.id)}
                  >
                    <MaterialIcons
                      name={selected ? 'check-box' : 'check-box-outline-blank'}
                      size={22}
                      color={selected ? '#17D27C' : '#94A3B8'}
                    />
                    <Text style={[pickerStyles.optionText, selected && pickerStyles.optionTextSelected]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
          <TouchableOpacity style={pickerStyles.doneBtn} onPress={onClose}>
            <Text style={pickerStyles.doneBtnText}>{doneLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const defaultExpiry = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d;
};

/** i18n keys for post-job picker modals (see en.json post_job_modal_title_*) */
const POST_JOB_PICKER_TITLE_KEYS: Record<string, string> = {
  country_id: 'post_job_modal_title_country',
  state_id: 'post_job_modal_title_state',
  city_id: 'post_job_modal_title_city',
  job_type_id: 'post_job_modal_title_job_type',
  job_shift_id: 'post_job_modal_title_job_shift',
  gender_id: 'post_job_modal_title_gender',
  job_experience_id: 'post_job_modal_title_job_experience',
  degree_level_id: 'post_job_modal_title_degree_level',
  career_level_id: 'post_job_modal_title_career_level',
  functional_area_id: 'post_job_modal_title_functional_area',
  salary_period_id: 'post_job_modal_title_salary_period',
  salary_currency: 'post_job_modal_title_salary_currency',
  num_of_positions: 'post_job_modal_title_num_positions',
};

const CompanyPostJob: React.FC<CompanyPostJobProps> = ({
  jobId,
  onBack,
  onSuccess,
  onCompanyMenuPress,
  onLogout,
  onCompanyNavPress,
  chatUnreadCount = 0,
  bottomNavActiveTab,
  menuCompanyName,
  menuCompanyLogo,
}) => {
  const isEditMode = jobId != null;
  const [sidebarVisible, setSidebarVisible] = React.useState(false);
  const { t } = useTranslation();
  const skipClearLocationRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type QuestionItem = { id?: number; title: string };
  const [formData, setFormData] = useState<Record<string, any>>({
    title: '',
    description: '',
    benefits: '',
    skills: [] as (number | string)[],
    country_id: '',
    state_id: '',
    city_id: '',
    salary_from: '',
    salary_to: '',
    salary_currency: '',
    salary_period_id: '',
    hide_salary: 0,
    career_level_id: '',
    functional_area_id: '',
    job_type_id: '',
    job_shift_id: '',
    num_of_positions: '',
    gender_id: '',
    expiry_date: defaultExpiry(),
    degree_level_id: '',
    job_experience_id: '',
    is_freelance: 0,
    questions: [] as QuestionItem[],
  });

  const [options, setOptions] = useState<Record<string, MasterItem[]>>({
    countries: [],
    states: [],
    cities: [],
    jobTypes: [],
    jobShifts: [],
    genders: [],
    jobExperiences: [],
    jobSkills: [],
    degreeLevels: [],
    careerLevels: [],
    functionalAreas: [],
    salaryPeriods: [],
    currencies: [],
  });

  const [pickerKey, setPickerKey] = useState<string>('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [skillsModalVisible, setSkillsModalVisible] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

  const updateField = useCallback((key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setOptionsFromData = useCallback(
    (data: Record<string, any>, functionalAreasOverride?: MasterItem[]) => {
      const fromPostJob = masterItemsFromUnknown(data.functionalAreas ?? data.functional_areas);
      const functionalAreas =
        functionalAreasOverride && functionalAreasOverride.length > 0
          ? functionalAreasOverride
          : fromPostJob;
      setOptions((prev) => ({
        ...prev,
        countries: masterItemsFromUnknown(data.countries),
        jobTypes: masterItemsFromUnknown(data.jobTypes ?? data.job_types),
        jobShifts: masterItemsFromUnknown(data.jobShifts ?? data.job_shifts),
        genders: masterItemsFromUnknown(data.genders),
        jobExperiences: masterItemsFromUnknown(data.jobExperiences ?? data.job_experiences),
        jobSkills: masterItemsFromUnknown(data.jobSkills ?? data.job_skills),
        degreeLevels: masterItemsFromUnknown(data.degreeLevels ?? data.degree_levels),
        careerLevels: masterItemsFromUnknown(data.careerLevels ?? data.career_levels),
        functionalAreas,
        salaryPeriods: masterItemsFromUnknown(data.salaryPeriods ?? data.salary_periods),
        currencies: (() => {
          const c = data.currencies;
          if (c == null) return [];
          if (Array.isArray(c) && c.length > 0 && typeof c[0] === 'string')
            return (c as string[]).map((x) => ({ id: x, name: x }));
          return masterItemsFromUnknown(c);
        })(),
      }));
    },
    []
  );

  const loadFormData = useCallback(async () => {
    try {
      setError(null);
      const [res, faRes] = await Promise.all([
        isEditMode && jobId
          ? companyService.getEditJobFormData(jobId)
          : companyService.getPostJobFormData(),
        companyService.getMasterFunctionalAreas(),
      ]);
      const data = (res as any)?.data ?? (res as any)?.message ?? res;
      if (!data || typeof data !== 'object') {
        setError(t('something_went_wrong'));
        return;
      }
      if ((res as any)?.data?.error || (data as any)?.error) {
        const msg = (res as any)?.message ?? (data as any)?.message ?? t('something_went_wrong');
        setError(typeof msg === 'string' ? msg : t('something_went_wrong'));
        return;
      }
      const faList =
        faRes.success && Array.isArray(faRes.data) && faRes.data.length > 0
          ? (faRes.data as MasterItem[])
          : undefined;
      setOptionsFromData(data, faList);

      if (isEditMode && data.job) {
        const job = data.job as Record<string, any>;
        const skillIds = Array.isArray(data.jobSkillIds) ? data.jobSkillIds : [];
        const expDate = job.expiry_date ? new Date(job.expiry_date) : defaultExpiry();
        const countryId = job.country_id ?? '';
        const stateId = job.state_id ?? '';
        const jobQuestions = Array.isArray(data.job_questions)
          ? (data.job_questions as any[]).map((q: any) => ({
              id: q.id != null ? Number(q.id) : undefined,
              title: String(q.question_title ?? q.title ?? '').trim(),
            }))
          : [];
        setFormData((prev) => ({
          ...prev,
          title: job.title ?? prev.title,
          description: job.description ?? prev.description,
          benefits: job.benefits ?? prev.benefits,
          skills: skillIds,
          country_id: countryId,
          state_id: stateId,
          city_id: job.city_id ?? '',
          salary_from: job.salary_from ?? '',
          salary_to: job.salary_to ?? '',
          salary_currency: job.salary_currency ?? '',
          salary_period_id: job.salary_period_id ?? '',
          hide_salary: job.hide_salary ? 1 : 0,
          career_level_id: job.career_level_id ?? '',
          functional_area_id: job.functional_area_id ?? '',
          job_type_id: job.job_type_id ?? '',
          job_shift_id: job.job_shift_id ?? '',
          num_of_positions: job.num_of_positions ?? '',
          gender_id: job.gender_id ?? '',
          expiry_date: expDate,
          degree_level_id: job.degree_level_id ?? '',
          job_experience_id: job.job_experience_id ?? '',
          is_freelance: job.is_freelance ? 1 : 0,
          questions: jobQuestions.length > 0 ? jobQuestions : prev.questions,
        }));
        skipClearLocationRef.current = true;
        if (countryId) {
          companyService.getStatesByCountry(countryId).then((r) => {
            const list = (r as any)?.data ?? [];
            setOptions((prev) => ({
              ...prev,
              states: Array.isArray(list) ? masterItemsFromUnknown(list) : [],
            }));
          });
        }
        if (stateId) {
          companyService.getCitiesByState(stateId).then((r) => {
            const list = (r as any)?.data ?? [];
            setOptions((prev) => ({
              ...prev,
              cities: Array.isArray(list) ? masterItemsFromUnknown(list) : [],
            }));
          });
        }
      }
    } catch (e) {
      setError(t('something_went_wrong'));
    } finally {
      setLoading(false);
    }
  }, [t, isEditMode, jobId, setOptionsFromData]);

  const loadStates = useCallback(async (countryId: number | string, clearDependents = true) => {
    if (!countryId) {
      setOptions((prev) => ({ ...prev, states: [], cities: [] }));
      return;
    }
    try {
      const res = await companyService.getStatesByCountry(countryId);
      const list = (res as any)?.data ?? [];
      setOptions((prev) => ({
        ...prev,
        states: Array.isArray(list) ? masterItemsFromUnknown(list) : [],
        cities: clearDependents ? [] : prev.cities,
      }));
      if (clearDependents) {
        updateField('state_id', '');
        updateField('city_id', '');
      }
    } catch {
      setOptions((prev) => ({ ...prev, states: [], cities: [] }));
    }
  }, [updateField]);

  const loadCities = useCallback(async (stateId: number | string, clearDependents = true) => {
    if (!stateId) {
      setOptions((prev) => ({ ...prev, cities: [] }));
      return;
    }
    try {
      const res = await companyService.getCitiesByState(stateId);
      const list = (res as any)?.data ?? [];
      setOptions((prev) => ({
        ...prev,
        cities: Array.isArray(list) ? masterItemsFromUnknown(list) : [],
      }));
      if (clearDependents) updateField('city_id', '');
    } catch {
      setOptions((prev) => ({ ...prev, cities: [] }));
    }
  }, [updateField]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  useEffect(() => {
    if (formData.country_id) {
      const skipClear = isEditMode && skipClearLocationRef.current;
      loadStates(formData.country_id, !skipClear);
    }
  }, [formData.country_id, isEditMode, loadStates]);

  useEffect(() => {
    if (formData.state_id) {
      const skipClear = isEditMode && skipClearLocationRef.current;
      if (skipClear) skipClearLocationRef.current = false;
      loadCities(formData.state_id, !skipClear);
    }
  }, [formData.state_id, isEditMode, loadCities]);

  const openPicker = (key: string) => {
    setPickerKey(key);
    setPickerVisible(true);
  };

  const getItemsForKey = (key: string): MasterItem[] => {
    if (key === 'country_id') return options.countries;
    if (key === 'state_id') return options.states;
    if (key === 'city_id') return options.cities;
    if (key === 'job_type_id') return options.jobTypes;
    if (key === 'job_shift_id') return options.jobShifts;
    if (key === 'gender_id') return options.genders;
    if (key === 'job_experience_id') return options.jobExperiences;
    if (key === 'degree_level_id') return options.degreeLevels;
    if (key === 'career_level_id') return options.careerLevels;
    if (key === 'functional_area_id') return options.functionalAreas;
    if (key === 'salary_period_id') return options.salaryPeriods;
    if (key === 'salary_currency') return options.currencies;
    if (key === 'num_of_positions') {
      return Array.from({ length: 20 }, (_, i) => ({ id: i + 1, name: String(i + 1) }));
    }
    return [];
  };

  const getPickerLabel = (key: string): string => {
    const val = formData[key];
    if (val === '' || val == null) return '';
    const items = getItemsForKey(key);
    const item = items.find((i) => i.id === val || String(i.id) === String(val));
    return item?.name ?? String(val);
  };

  const handlePickerSelect = (id: number | string) => {
    updateField(pickerKey, id === null || id === '' ? '' : id);
    if (pickerKey === 'country_id') {
      updateField('state_id', '');
      updateField('city_id', '');
      if (id) loadStates(id);
    }
    if (pickerKey === 'state_id') {
      updateField('city_id', '');
      if (id) loadCities(id);
    }
    setPickerVisible(false);
  };

  const toggleSkill = (id: number | string) => {
    setFormData((prev) => {
      const arr = (prev.skills as (number | string)[]) || [];
      const has = arr.includes(id);
      const next = has ? arr.filter((s) => s !== id) : [...arr, id];
      return { ...prev, skills: next };
    });
  };

  const questionsList: QuestionItem[] = Array.isArray(formData.questions) ? formData.questions : [];
  const addQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      questions: [...(prev.questions || []), { title: '' }],
    }));
  };
  const removeQuestion = (index: number) => {
    setFormData((prev) => {
      const q = [...(prev.questions || [])];
      q.splice(index, 1);
      return { ...prev, questions: q };
    });
  };
  const updateQuestionTitle = (index: number, title: string) => {
    setFormData((prev) => {
      const q = [...(prev.questions || [])];
      const item = q[index];
      if (item) q[index] = { ...item, title };
      return { ...prev, questions: q };
    });
  };

  const handleSubmit = async () => {
    const {
      title,
      description,
      country_id,
      state_id,
      city_id,
      functional_area_id,
      job_type_id,
      expiry_date,
      job_experience_id,
      skills,
    } = formData;
    if (!title?.trim()) {
      Alert.alert(t('error'), t('job_title_required') || 'Job title is required');
      return;
    }
    if (!description?.trim()) {
      Alert.alert(t('error'), t('job_description_required') || 'Job description is required');
      return;
    }
    if (!(Array.isArray(skills) && skills.length > 0)) {
      Alert.alert(t('error'), t('skills_required') || 'Please select at least one skill');
      return;
    }
    if (!country_id || !state_id || !city_id) {
      Alert.alert(t('error'), t('location_required') || 'Please select country, state and city');
      return;
    }
    if (!functional_area_id || !job_type_id) {
      Alert.alert(t('error'), t('functional_area_and_job_type_required') || 'Please select functional area and job type');
      return;
    }
    if (!job_experience_id) {
      Alert.alert(t('error'), t('job_experience_required') || 'Please select job experience');
      return;
    }
    const expDate = formData.expiry_date instanceof Date
      ? formData.expiry_date
      : formData.expiry_date
        ? new Date(formData.expiry_date)
        : defaultExpiry();
    if (!expDate || isNaN(expDate.getTime())) {
      Alert.alert(t('error'), t('expiry_date_required') || 'Please select job expiry date');
      return;
    }

    const payload: Record<string, any> = {
      title: title.trim(),
      description: (formData.description || '').trim(),
      benefits: (formData.benefits || '').trim(),
      skills: Array.isArray(skills) ? skills : [],
      country_id: Number(country_id),
      state_id: Number(state_id),
      city_id: Number(city_id),
      functional_area_id: Number(functional_area_id),
      job_type_id: Number(job_type_id),
      job_experience_id: Number(job_experience_id),
      expiry_date: expDate.toISOString().split('T')[0],
      hide_salary: formData.hide_salary ? 1 : 0,
      is_freelance: formData.is_freelance ? 1 : 0,
    };
    if (formData.benefits) payload.benefits = formData.benefits;
    if (formData.salary_from !== '' && formData.salary_from != null)
      payload.salary_from = Number(formData.salary_from);
    if (formData.salary_to !== '' && formData.salary_to != null)
      payload.salary_to = Number(formData.salary_to);
    if (formData.salary_currency) payload.salary_currency = formData.salary_currency;
    if (formData.salary_period_id) payload.salary_period_id = Number(formData.salary_period_id);
    if (formData.career_level_id) payload.career_level_id = Number(formData.career_level_id);
    if (formData.job_shift_id) payload.job_shift_id = Number(formData.job_shift_id);
    if (formData.num_of_positions) payload.num_of_positions = Number(formData.num_of_positions);
    if (formData.gender_id) payload.gender_id = Number(formData.gender_id);
    if (formData.degree_level_id) payload.degree_level_id = Number(formData.degree_level_id);

    const questionsList = Array.isArray(formData.questions) ? formData.questions : [];
    const questionsPayload = questionsList
      .map((q: { id?: number; title: string }) => ({ ...q, title: (q?.title ?? '').trim() }))
      .filter((q: { title: string }) => q.title !== '');
    payload.questions = questionsPayload.map((q: { id?: number; title: string }) =>
      q.id != null ? { id: q.id, title: q.title } : { title: q.title }
    );

    setSaving(true);
    try {
      const res = isEditMode && jobId
        ? await companyService.updateJob(jobId, payload)
        : await companyService.submitJob(payload);
      if ((res as any)?.success) {
        const successMsg = isEditMode
          ? (t('job_updated_successfully') || (res as any)?.message || 'Job has been updated!')
          : (res as any)?.message || t('job_submitted_successfully') || 'Job has been added!';
        Alert.alert(t('success') || 'Success', successMsg, [
          { text: 'OK', onPress: () => { onSuccess?.(); onBack(); } },
        ]);
      } else {
        const msg = (res as any)?.error ?? (res as any)?.message ?? t('something_went_wrong');
        Alert.alert(t('error'), typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } catch (e) {
      Alert.alert(t('error'), t('something_went_wrong'));
    } finally {
      setSaving(false);
    }
  };

  const expiryDate = formData.expiry_date instanceof Date
    ? formData.expiry_date
    : formData.expiry_date
      ? new Date(formData.expiry_date)
      : defaultExpiry();

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title={isEditMode ? (t('edit_job') || 'Edit Job') : t('company_post_job')}
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
          companyName={menuCompanyName}
          companyLogo={menuCompanyLogo}
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
        title={isEditMode ? (t('edit_job') || 'Edit Job') : t('company_post_job')}
        onBack={onBack}
        showBack
        onMenuPress={() => setSidebarVisible(true)}
      />

      {error ? (
        <View style={styles.noPackageWrap}>
          <View style={styles.noPackageCard}>
            <View style={styles.noPackageIconCircle}>
              <MaterialIcons name={isEditMode ? 'error-outline' : 'work-outline'} size={56} color="#2E5CD0" />
            </View>
            {isEditMode ? (
              <>
                <Text style={styles.noPackageTitle}>{t('unable_to_load_job') || 'Unable to load job'}</Text>
                <Text style={styles.noPackageMessage}>{error}</Text>
                <TouchableOpacity style={styles.noPackagePrimaryBtn} onPress={() => { setLoading(true); loadFormData(); }}>
                  <Text style={styles.noPackagePrimaryBtnText}>{t('retry') || 'Retry'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.noPackageTitle}>{t('subscribe_job_package_first_title') || 'Job package required'}</Text>
                <Text style={styles.noPackageMessage}>
                  {t('subscribe_job_package_first') || 'Please subscribe to a job package first.'}
                </Text>
                <TouchableOpacity
                  style={styles.noPackagePrimaryBtn}
                  onPress={() => {
                    setSidebarVisible(false);
                    onCompanyMenuPress?.('company-job-packages');
                  }}
                >
                  <MaterialIcons name="shopping-cart" size={22} color="#fff" />
                  <Text style={styles.noPackagePrimaryBtnText}>
                    {t('view_job_packages') || 'View job packages'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.noPackageSecondaryBtn} onPress={() => { setLoading(true); loadFormData(); }}>
                  <Text style={styles.noPackageSecondaryText}>{t('retry') || 'Retry'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ) : (
      <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          onCompanyNavPress ? { paddingBottom: 32 + COMPANY_BOTTOM_NAV_CONTENT_INSET } : undefined,
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadFormData} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('job_details') || 'Job Details'}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('job_title') || 'Job title'} *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(v) => updateField('title', v)}
              placeholder={t('job_title') || 'Job title'}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('description') || 'Description'} *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(v) => updateField('description', v)}
              placeholder={t('job_description') || 'Job description'}
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('benefits') || 'Benefits'}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.benefits}
              onChangeText={(v) => updateField('benefits', v)}
              placeholder={t('job_benefits') || 'Job Benefits'}
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('skills') || 'Skills'} *</Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => setSkillsModalVisible(true)}
            >
              <Text style={[styles.pickerBtnText, !formData.skills?.length && styles.placeholder]}>
                {formData.skills?.length
                  ? `${(formData.skills as any[]).length} ${t('selected') || 'selected'}`
                  : t('select_skills') || 'Select Required Skills'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('country')} *</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('country_id')}>
              <Text style={[styles.pickerBtnText, !getPickerLabel('country_id') && styles.placeholder]}>
                {getPickerLabel('country_id') || t('select_country') || 'Select Country'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('state')} *</Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => openPicker('state_id')}
              disabled={!formData.country_id}
            >
              <Text style={[styles.pickerBtnText, !getPickerLabel('state_id') && styles.placeholder]}>
                {getPickerLabel('state_id') || t('select_state') || 'Select State'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('city')} *</Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => openPicker('city_id')}
              disabled={!formData.state_id}
            >
              <Text style={[styles.pickerBtnText, !getPickerLabel('city_id') && styles.placeholder]}>
                {getPickerLabel('city_id') || t('select_city') || 'Select City'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('salary_from') || 'Salary from'}</Text>
            <TextInput
              style={styles.input}
              value={String(formData.salary_from ?? '')}
              onChangeText={(v) => updateField('salary_from', v)}
              placeholder={t('salary_from') || 'Salary from'}
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('salary_to') || 'Salary to'}</Text>
            <TextInput
              style={styles.input}
              value={String(formData.salary_to ?? '')}
              onChangeText={(v) => updateField('salary_to', v)}
              placeholder={t('salary_to') || 'Salary to'}
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('salary_currency') || 'Salary Currency'}</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('salary_currency')}>
              <Text style={[styles.pickerBtnText, !getPickerLabel('salary_currency') && styles.placeholder]}>
                {getPickerLabel('salary_currency') || t('select_salary_currency') || 'Select Currency'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('salary_period') || 'Salary Period'}</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('salary_period_id')}>
              <Text style={[styles.pickerBtnText, !getPickerLabel('salary_period_id') && styles.placeholder]}>
                {getPickerLabel('salary_period_id') || t('select_salary_period') || 'Select Period'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('hide_salary') || 'Hide Salary?'}</Text>
            <View style={styles.radioRow}>
              <TouchableOpacity
                style={[styles.radioBtn, formData.hide_salary === 1 && styles.radioBtnActive]}
                onPress={() => updateField('hide_salary', 1)}
              >
                <Text style={[styles.radioText, formData.hide_salary === 1 && styles.radioTextActive]}>{t('yes') || 'Yes'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioBtn, formData.hide_salary === 0 && styles.radioBtnActive]}
                onPress={() => updateField('hide_salary', 0)}
              >
                <Text style={[styles.radioText, formData.hide_salary === 0 && styles.radioTextActive]}>{t('no') || 'No'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('career_level') || 'Career level'}</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('career_level_id')}>
              <Text style={[styles.pickerBtnText, !getPickerLabel('career_level_id') && styles.placeholder]}>
                {getPickerLabel('career_level_id') || t('select_career_level') || 'Select Career level'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('functional_area') || 'Functional Area'} *</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('functional_area_id')}>
              <Text style={[styles.pickerBtnText, !getPickerLabel('functional_area_id') && styles.placeholder]}>
                {getPickerLabel('functional_area_id') || t('select_functional_area') || 'Select Functional Area'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('job_type') || 'Job Type'} *</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('job_type_id')}>
              <Text style={[styles.pickerBtnText, !getPickerLabel('job_type_id') && styles.placeholder]}>
                {getPickerLabel('job_type_id') || t('select_job_type') || 'Select Job Type'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('job_shift') || 'Job Shift'}</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('job_shift_id')}>
              <Text style={[styles.pickerBtnText, !getPickerLabel('job_shift_id') && styles.placeholder]}>
                {getPickerLabel('job_shift_id') || t('select_job_shift') || 'Select Job Shift'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('num_of_positions') || 'Number of Positions'}</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('num_of_positions')}>
              <Text style={[styles.pickerBtnText, !getPickerLabel('num_of_positions') && styles.placeholder]}>
                {getPickerLabel('num_of_positions') || t('select_num_positions') || 'Select number of Positions'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('gender') || 'Gender'}</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('gender_id')}>
              <Text style={[styles.pickerBtnText, !getPickerLabel('gender_id') && styles.placeholder]}>
                {getPickerLabel('gender_id') || t('no_preference') || 'No preference'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('expiry_date') || 'Job expiry date'} *</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowExpiryPicker(true)}>
              <Text style={styles.pickerBtnText}>{expiryDate.toLocaleDateString()}</Text>
              <MaterialIcons name="calendar-today" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('degree_level') || 'Required Degree Level'}</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('degree_level_id')}>
              <Text style={[styles.pickerBtnText, !getPickerLabel('degree_level_id') && styles.placeholder]}>
                {getPickerLabel('degree_level_id') || t('select_degree_level') || 'Select Degree Level'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('job_experience') || 'Required job experience'} *</Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('job_experience_id')}>
              <Text style={[styles.pickerBtnText, !getPickerLabel('job_experience_id') && styles.placeholder]}>
                {getPickerLabel('job_experience_id') || t('select_job_experience') || 'Select job experience'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('is_freelance') || 'Is Freelance?'}</Text>
            <View style={styles.radioRow}>
              <TouchableOpacity
                style={[styles.radioBtn, formData.is_freelance === 1 && styles.radioBtnActive]}
                onPress={() => updateField('is_freelance', 1)}
              >
                <Text style={[styles.radioText, formData.is_freelance === 1 && styles.radioTextActive]}>{t('yes') || 'Yes'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioBtn, formData.is_freelance === 0 && styles.radioBtnActive]}
                onPress={() => updateField('is_freelance', 0)}
              >
                <Text style={[styles.radioText, formData.is_freelance === 0 && styles.radioTextActive]}>{t('no') || 'No'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t('additional_questions_for_jobseekers') || 'Additional Questions for Jobseekers'}{' '}
              <Text style={styles.optionalLabel}>({t('optional') || 'Optional'})</Text>
            </Text>
            <Text style={styles.helperText}>
              {t('additional_questions_help') || 'Add custom questions that jobseekers will answer when applying for this job.'}
            </Text>
            {questionsList.map((q, index) => (
              <View key={index} style={styles.questionRow}>
                <TextInput
                  style={[styles.input, styles.questionInput]}
                  value={q.title}
                  onChangeText={(text) => updateQuestionTitle(index, text)}
                  placeholder={t('enter_question_title') || 'Enter Question Title'}
                  placeholderTextColor="#94A3B8"
                />
                <TouchableOpacity
                  style={styles.removeQuestionBtn}
                  onPress={() => removeQuestion(index)}
                  accessibilityLabel={t('remove') || 'Remove'}
                >
                  <MaterialIcons name="delete-outline" size={22} color="#B91C1C" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addQuestionBtn} onPress={addQuestion}>
              <MaterialIcons name="add-circle-outline" size={22} color="#17D27C" />
              <Text style={styles.addQuestionBtnText}>{t('add_questions') || 'ADD QUESTIONS'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{isEditMode ? (t('update_job') || 'Update Job') : (t('submit_job') || 'Submit Job')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PickerModal
        visible={pickerVisible}
        title={
          pickerKey
            ? t(POST_JOB_PICKER_TITLE_KEYS[pickerKey] || pickerKey)
            : ''
        }
        items={getItemsForKey(pickerKey)}
        selectedId={formData[pickerKey] ?? null}
        onSelect={handlePickerSelect}
        onClose={() => setPickerVisible(false)}
        searchPlaceholder={t('search') || 'Search'}
        noResultsText={t('no_matching_results') || 'No matching results'}
        clearOptionLabel={t('post_job_modal_clear_selection') || '— Clear selection'}
      />

      <MultiSelectModal
        visible={skillsModalVisible}
        title={t('post_job_modal_title_skills') || t('skills')}
        items={options.jobSkills}
        selectedIds={formData.skills || []}
        onToggle={toggleSkill}
        onClose={() => setSkillsModalVisible(false)}
        searchPlaceholder={t('search') || 'Search'}
        noResultsText={t('no_matching_results') || 'No matching results'}
        doneLabel={t('done') || 'Done'}
      />

      {showExpiryPicker && (
        <Modal visible transparent animationType="slide">
          <View style={pickerStyles.overlayInner}>
            <TouchableOpacity
              style={pickerStyles.overlayDismiss}
              activeOpacity={1}
              onPress={() => setShowExpiryPicker(false)}
            />
            <View style={pickerStyles.content}>
              <Text style={pickerStyles.title}>
                {t('post_job_modal_title_expiry_date') || t('expiry_date')}
              </Text>
              <DateTimePicker
                value={expiryDate}
                mode="date"
                minimumDate={new Date()}
                onChange={(_, date) => {
                  if (date) updateField('expiry_date', date);
                  setShowExpiryPicker(false);
                }}
              />
              <TouchableOpacity style={pickerStyles.doneBtn} onPress={() => setShowExpiryPicker(false)}>
                <Text style={pickerStyles.doneBtnText}>{t('done') || 'Done'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      </>
      )}

      <CompanySidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onMenuItemPress={(key) => {
          setSidebarVisible(false);
          onCompanyMenuPress?.(key);
        }}
        onLogout={onLogout ?? (() => {})}
        companyName={menuCompanyName}
        companyLogo={menuCompanyLogo}
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

const pickerStyles = StyleSheet.create({
  overlayInner: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  overlayDismiss: { flex: 1, minHeight: 80 },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '72%',
  },
  title: { fontSize: 17, fontWeight: '600', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchInput: {
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  noResults: {
    padding: 24,
    textAlign: 'center',
    fontSize: 15,
    color: '#94A3B8',
  },
  list: { maxHeight: 340 },
  option: { padding: 14, paddingLeft: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionSelected: { backgroundColor: '#E8F5E9' },
  optionText: { fontSize: 16, color: '#333', flex: 1 },
  optionTextSelected: { color: '#17D27C', fontWeight: '600' },
  doneBtn: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee' },
  doneBtnText: { fontSize: 16, fontWeight: '600', color: '#17D27C' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noPackageWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  noPackageCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E8EDF3',
  },
  noPackageIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noPackageTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', textAlign: 'center', marginBottom: 10 },
  noPackageMessage: { fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  noPackagePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2E5CD0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  noPackagePrimaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  noPackageSecondaryBtn: { marginTop: 16, paddingVertical: 10 },
  noPackageSecondaryText: { color: '#2E5CD0', fontSize: 15, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  errorText: { color: '#B91C1C', fontSize: 14 },
  retryText: { color: '#2E5CD0', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2D3748', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerBtnText: { fontSize: 16, color: '#1E293B' },
  placeholder: { color: '#94A3B8' },
  radioRow: { flexDirection: 'row', gap: 16 },
  radioBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  radioBtnActive: { borderColor: '#17D27C', backgroundColor: '#E8F5E9' },
  radioText: { fontSize: 15, color: '#64748B' },
  radioTextActive: { color: '#17D27C', fontWeight: '600' },
  optionalLabel: { fontWeight: '400', color: '#94A3B8', fontSize: 14 },
  helperText: { fontSize: 13, color: '#64748B', marginBottom: 12, lineHeight: 20 },
  questionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  questionInput: { flex: 1, marginBottom: 0 },
  removeQuestionBtn: { padding: 10, justifyContent: 'center', alignItems: 'center' },
  addQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#17D27C',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addQuestionBtnText: { fontSize: 15, fontWeight: '600', color: '#17D27C' },
  submitBtn: {
    backgroundColor: '#17D27C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default CompanyPostJob;
