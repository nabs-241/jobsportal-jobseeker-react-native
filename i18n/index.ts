import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { languageService } from '../services/languageService';

// Import translations
import en from './locales/en.json';
import es from './locales/es.json';
import ar from './locales/ar.json';
import fr from './locales/fr.json';
import hi from './locales/hi.json';
import tr from './locales/tr.json';
import ur from './locales/ur.json';
import zh from './locales/zh.json';

const LANGUAGE_KEY = 'app_language';

const resources = {
    en: { translation: en },
    es: { translation: es },
    ar: { translation: ar },
    fr: { translation: fr },
    hi: { translation: hi },
    tr: { translation: tr },
    ur: { translation: ur },
    zh: { translation: zh },
};

const initI18n = async () => {
    let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

    if (!savedLanguage) {
        savedLanguage = 'en'; // Default language
    }

    // Initialize i18next first with local resources
    await i18n
        .use(initReactI18next)
        .init({
            resources,
            lng: savedLanguage,
            fallbackLng: 'en',
            interpolation: {
                escapeValue: false,
            },
            react: {
                useSuspense: false,
            },
        });

    // Then attempt to fetch even fresher translations from the server
    languageService.fetchTranslations(savedLanguage);
};

initI18n();

export default i18n;
