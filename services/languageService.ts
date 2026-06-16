import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';
import i18n from '../i18n';
import apiService from './apiService';

const TRANSLATIONS_CACHE_KEY = 'cached_translations_';
const LANGUAGES_LIST_CACHE_KEY = 'cached_languages_list';

export interface Language {
    id: number;
    name: string;
    native: string;
    iso_code: string;
    is_rtl: number;
    is_default: number;
}

export const languageService = {
    /**
     * Fetch active languages from the server
     */
    async fetchLanguages(): Promise<Language[]> {
        try {
            const response = await apiService.get<Language[]>(API_CONFIG.ENDPOINTS.LANGUAGES.LIST);
            if (response.success && response.data) {
                const languages = response.data;
                await AsyncStorage.setItem(LANGUAGES_LIST_CACHE_KEY, JSON.stringify(languages));
                return languages;
            }
        } catch (error) {
            console.error('Error fetching languages:', error);
            const cached = await AsyncStorage.getItem(LANGUAGES_LIST_CACHE_KEY);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        return [];
    },

    /**
     * Fetch translations for a specific language from the server
     */
    async fetchTranslations(lang: string) {
        try {
            const response = await apiService.get<any>(`${API_CONFIG.ENDPOINTS.LANGUAGES.TRANSLATIONS}/${lang}`);
            if (response.success && response.data) {
                const translations = response.data;

                // Cache translations
                await AsyncStorage.setItem(`${TRANSLATIONS_CACHE_KEY}${lang}`, JSON.stringify(translations));

                // Add to i18n
                // true for deep merge, true for override
                i18n.addResourceBundle(lang, 'translation', translations, true, true);

                return translations;
            }
        } catch (error) {
            console.error(`Error fetching translations for ${lang}:`, error);

            // Try to load from cache
            const cached = await AsyncStorage.getItem(`${TRANSLATIONS_CACHE_KEY}${lang}`);
            if (cached) {
                const translations = JSON.parse(cached);
                i18n.addResourceBundle(lang, 'translation', translations, true, true);
                return translations;
            }
        }
        return null;
    }
};
