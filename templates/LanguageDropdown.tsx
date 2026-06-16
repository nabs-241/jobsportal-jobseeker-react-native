import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { languageService, Language } from '../services/languageService';
import { useEffect } from 'react';

const LanguageDropdown: React.FC = () => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);

    useEffect(() => {
        const loadLanguages = async () => {
            const langs = await languageService.fetchLanguages();
            if (langs.length > 0) {
                setAvailableLanguages(langs);
            } else {
                // Fallback if API fails
                setAvailableLanguages([
                    { id: 1, name: 'English', native: 'English', iso_code: 'en', is_rtl: 0, is_default: 1 },
                    { id: 2, name: 'Arabic', native: 'العربية', iso_code: 'ar', is_rtl: 1, is_default: 0 }
                ]);
            }
        };
        loadLanguages();
    }, []);

    const getFlag = (code: string) => {
        const flagMap: { [key: string]: string } = {
            'en': '🇺🇸',
            'ar': '🇦🇪',
            'es': '🇪🇸',
            'fr': '🇫🇷',
            'tr': '🇹🇷',
            'ur': '🇵🇰',
            'hi': '🇮🇳',
            'zh': '🇨🇳',
            'de': '🇩🇪',
            'it': '🇮🇹',
            'ru': '🇷🇺',
            'gr': '🇬🇷',
            'te': '🇮🇳', // Telugu
            'la': '🇱🇦'  // Lao
        };
        return flagMap[code.toLowerCase()] || '🌐';
    };

    const currentLanguage = availableLanguages.find(l => l.iso_code === i18n.language) ||
        availableLanguages.find(l => l.iso_code === 'en') ||
        { iso_code: 'en', name: 'English', native: 'English' };

    const changeLanguage = async (lng: string) => {
        await i18n.changeLanguage(lng);
        await AsyncStorage.setItem('app_language', lng);

        // Fetch fresh translations from server
        await languageService.fetchTranslations(lng);

        setVisible(false);
    };

    return (
        <View>
            <TouchableOpacity
                style={styles.container}
                onPress={() => setVisible(true)}
                activeOpacity={0.7}
            >
                <Text style={styles.flag}>{getFlag(currentLanguage.iso_code)}</Text>
                <Text style={styles.code}>{currentLanguage.iso_code.toUpperCase()}</Text>
                <MaterialIcons name="arrow-drop-down" size={20} color="#333" />
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setVisible(false)}
                >
                    <View style={styles.dropdown}>
                        <Text style={styles.dropdownTitle}>{t('select_language')}</Text>
                        <FlatList
                            data={availableLanguages}
                            keyExtractor={(item) => item.iso_code}
                            contentContainerStyle={styles.scrollContent}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.option,
                                        i18n.language === item.iso_code && styles.activeOption
                                    ]}
                                    onPress={() => changeLanguage(item.iso_code)}
                                >
                                    <View style={styles.optionContent}>
                                        <Text style={styles.optionFlag}>{getFlag(item.iso_code)}</Text>
                                        <Text style={[
                                            styles.optionText,
                                            i18n.language === item.iso_code && styles.activeOptionText
                                        ]}>
                                            {item.native} ({item.name})
                                        </Text>
                                    </View>
                                    {i18n.language === item.iso_code && (
                                        <MaterialIcons name="check" size={20} color="#17D27C" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    flag: {
        fontSize: 16,
        marginRight: 6,
    },
    code: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
        marginRight: 2,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dropdown: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '85%',
        maxWidth: 350,
        maxHeight: '70%', // Limit height to enable scrolling
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    dropdownTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
        textAlign: 'center',
    },
    scrollContent: {
        paddingBottom: 8,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    activeOption: {
        backgroundColor: '#ECFDF5',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionFlag: {
        fontSize: 20,
        marginRight: 12,
    },
    optionText: {
        fontSize: 16,
        color: '#4B5563',
        fontWeight: '500',
    },
    activeOptionText: {
        color: '#065F46',
        fontWeight: '700',
    },
});

export default LanguageDropdown;
