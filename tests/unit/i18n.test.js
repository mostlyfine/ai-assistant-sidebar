// Tests for Internationalization (i18n) functionality
describe('Internationalization (i18n) Tests', () => {
  let mockChrome;
  
  beforeEach(() => {
    // Mock Chrome storage
    mockChrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
    global.chrome = mockChrome;
    
    // Mock navigator
    global.navigator = {
      language: 'en-US',
      languages: ['en-US', 'en']
    };
    
    jest.clearAllMocks();
  });

  describe('Language Detection', () => {
    test('should detect browser language', () => {
      const detectLanguage = () => {
        const browserLang = navigator.language || navigator.languages[0];
        return browserLang && browserLang.startsWith('ja') ? 'ja' : 'en';
      };

      // Test Japanese language
      Object.defineProperty(global.navigator, 'language', {
        writable: true,
        value: 'ja-JP'
      });
      expect(detectLanguage()).toBe('ja');

      // Test English language
      Object.defineProperty(global.navigator, 'language', {
        writable: true,
        value: 'en-US'
      });
      expect(detectLanguage()).toBe('en');

      // Test French language (defaults to English)
      Object.defineProperty(global.navigator, 'language', {
        writable: true,
        value: 'fr-FR'
      });
      expect(detectLanguage()).toBe('en'); // Default to English
    });

    test('should handle missing navigator.language', () => {
      const detectLanguage = () => {
        const browserLang = navigator.language || navigator.languages[0] || 'en';
        return browserLang.startsWith('ja') ? 'ja' : 'en';
      };

      // Test with undefined language but Japanese in languages array
      Object.defineProperty(global.navigator, 'language', {
        writable: true,
        value: undefined
      });
      Object.defineProperty(global.navigator, 'languages', {
        writable: true,
        value: ['ja-JP']
      });
      expect(detectLanguage()).toBe('ja');

      // Test with undefined language and empty languages array
      Object.defineProperty(global.navigator, 'language', {
        writable: true,
        value: undefined
      });
      Object.defineProperty(global.navigator, 'languages', {
        writable: true,
        value: []
      });
      expect(detectLanguage()).toBe('en');
    });
  });

  describe('Translation Key Lookup', () => {
    test('should return translation for valid key', () => {
      const translations = {
        'ja': {
          'appTitle': 'AI アシスタント',
          'setupTitle': 'AI APIを設定してください',
          'saveSettings': '設定を保存',
          'cancel': 'キャンセル'
        },
        'en': {
          'appTitle': 'AI Assistant',
          'setupTitle': 'Please configure AI API',
          'saveSettings': 'Save Settings',
          'cancel': 'Cancel'
        }
      };

      const t = (key, lang = 'en') => {
        return translations[lang] && translations[lang][key] 
          ? translations[lang][key] 
          : key;
      };

      expect(t('appTitle', 'ja')).toBe('AI アシスタント');
      expect(t('appTitle', 'en')).toBe('AI Assistant');
      expect(t('setupTitle', 'ja')).toBe('AI APIを設定してください');
      expect(t('setupTitle', 'en')).toBe('Please configure AI API');
    });

    test('should return key if translation not found', () => {
      const translations = {
        'en': {
          'appTitle': 'AI Assistant'
        }
      };

      const t = (key, lang = 'en') => {
        return translations[lang] && translations[lang][key] 
          ? translations[lang][key] 
          : key;
      };

      expect(t('nonExistentKey', 'en')).toBe('nonExistentKey');
      expect(t('appTitle', 'nonExistentLang')).toBe('appTitle');
    });

    test('should handle nested translation keys', () => {
      const translations = {
        'en': {
          'errors': {
            'network': 'Network error occurred',
            'auth': 'Authentication failed'
          },
          'success': {
            'saved': 'Settings saved successfully'
          }
        }
      };

      const t = (key, lang = 'en') => {
        const keys = key.split('.');
        let value = translations[lang];
        
        for (const k of keys) {
          if (value && typeof value === 'object') {
            value = value[k];
          } else {
            return key;
          }
        }
        
        return value || key;
      };

      expect(t('errors.network', 'en')).toBe('Network error occurred');
      expect(t('errors.auth', 'en')).toBe('Authentication failed');
      expect(t('success.saved', 'en')).toBe('Settings saved successfully');
      expect(t('errors.nonExistent', 'en')).toBe('errors.nonExistent');
    });
  });

  describe('Language Switching', () => {
    test('should switch language and persist to storage', async () => {
      let currentLang = 'en';
      
      const setLanguage = async (lang) => {
        currentLang = lang;
        await chrome.storage.local.set({ language: lang });
      };

      const getCurrentLanguage = () => currentLang;

      mockChrome.storage.local.set.mockResolvedValue(true);

      await setLanguage('ja');
      
      expect(getCurrentLanguage()).toBe('ja');
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ language: 'ja' });
    });

    test('should load language from storage', async () => {
      const loadLanguage = async () => {
        const result = await chrome.storage.local.get(['language']);
        return result.language || 'en';
      };

      mockChrome.storage.local.get.mockResolvedValue({ language: 'ja' });

      const lang = await loadLanguage();
      
      expect(lang).toBe('ja');
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['language']);
    });

    test('should handle storage errors gracefully', async () => {
      const loadLanguage = async () => {
        try {
          const result = await chrome.storage.local.get(['language']);
          return result.language || 'en';
        } catch (error) {
          return 'en'; // Default language on error
        }
      };

      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      const lang = await loadLanguage();
      
      expect(lang).toBe('en');
    });
  });

  describe('DOM Text Replacement', () => {
    test('should replace text content using data-i18n attributes', () => {
      const translations = {
        'ja': {
          'appTitle': 'AI アシスタント',
          'setupTitle': 'AI APIを設定してください'
        }
      };

      const mockElements = [
        { 
          getAttribute: jest.fn(() => 'appTitle'),
          textContent: 'AI Assistant'
        },
        { 
          getAttribute: jest.fn(() => 'setupTitle'),
          textContent: 'Please configure AI API'
        }
      ];

      const mockDocument = {
        querySelectorAll: jest.fn(() => mockElements)
      };

      const updatePageTexts = (lang) => {
        const elements = mockDocument.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
          const key = element.getAttribute('data-i18n');
          if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
          }
        });
      };

      updatePageTexts('ja');

      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('[data-i18n]');
      expect(mockElements[0].textContent).toBe('AI アシスタント');
      expect(mockElements[1].textContent).toBe('AI APIを設定してください');
    });

    test('should replace placeholder text using data-i18n-placeholder attributes', () => {
      const translations = {
        'ja': {
          'placeholderEmail': 'メールアドレスを入力',
          'placeholderPassword': 'パスワードを入力'
        }
      };

      const mockElements = [
        { 
          getAttribute: jest.fn(() => 'placeholderEmail'),
          setAttribute: jest.fn(),
          placeholder: 'Enter email'
        },
        { 
          getAttribute: jest.fn(() => 'placeholderPassword'),
          setAttribute: jest.fn(),
          placeholder: 'Enter password'
        }
      ];

      const mockDocument = {
        querySelectorAll: jest.fn(() => mockElements)
      };

      const updatePlaceholders = (lang) => {
        const elements = mockDocument.querySelectorAll('[data-i18n-placeholder]');
        elements.forEach(element => {
          const key = element.getAttribute('data-i18n-placeholder');
          if (translations[lang] && translations[lang][key]) {
            element.setAttribute('placeholder', translations[lang][key]);
          }
        });
      };

      updatePlaceholders('ja');

      expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('[data-i18n-placeholder]');
      expect(mockElements[0].setAttribute).toHaveBeenCalledWith('placeholder', 'メールアドレスを入力');
      expect(mockElements[1].setAttribute).toHaveBeenCalledWith('placeholder', 'パスワードを入力');
    });

    test('should handle missing elements gracefully', () => {
      const mockDocument = {
        querySelectorAll: jest.fn(() => [])
      };

      const updatePageTexts = (lang) => {
        const elements = mockDocument.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
          // Should not throw error
          const key = element.getAttribute('data-i18n');
        });
      };

      expect(() => updatePageTexts('ja')).not.toThrow();
    });
  });

  describe('Translation Completeness', () => {
    test('should validate translation completeness', () => {
      const translations = {
        'en': {
          'appTitle': 'AI Assistant',
          'setupTitle': 'Please configure AI API',
          'saveSettings': 'Save Settings'
        },
        'ja': {
          'appTitle': 'AI アシスタント',
          'setupTitle': 'AI APIを設定してください'
          // Missing 'saveSettings'
        }
      };

      const validateTranslations = (baseLang, targetLang) => {
        const baseKeys = Object.keys(translations[baseLang]);
        const targetKeys = Object.keys(translations[targetLang]);
        
        const missingKeys = baseKeys.filter(key => !targetKeys.includes(key));
        const extraKeys = targetKeys.filter(key => !baseKeys.includes(key));
        
        return {
          isComplete: missingKeys.length === 0,
          missingKeys,
          extraKeys
        };
      };

      const validation = validateTranslations('en', 'ja');
      
      expect(validation.isComplete).toBe(false);
      expect(validation.missingKeys).toContain('saveSettings');
      expect(validation.extraKeys).toEqual([]);
    });

    test('should handle nested translation validation', () => {
      const translations = {
        'en': {
          'errors': {
            'network': 'Network error',
            'auth': 'Authentication failed'
          },
          'success': {
            'saved': 'Saved successfully'
          }
        },
        'ja': {
          'errors': {
            'network': 'ネットワークエラー'
            // Missing 'auth'
          },
          'success': {
            'saved': '正常に保存されました'
          }
        }
      };

      const validateNestedTranslations = (baseLang, targetLang) => {
        const findMissingKeys = (baseObj, targetObj, prefix = '') => {
          const missing = [];
          
          for (const key in baseObj) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof baseObj[key] === 'object') {
              if (!targetObj[key] || typeof targetObj[key] !== 'object') {
                missing.push(fullKey);
              } else {
                missing.push(...findMissingKeys(baseObj[key], targetObj[key], fullKey));
              }
            } else {
              if (!targetObj[key]) {
                missing.push(fullKey);
              }
            }
          }
          
          return missing;
        };

        const missingKeys = findMissingKeys(translations[baseLang], translations[targetLang]);
        return {
          isComplete: missingKeys.length === 0,
          missingKeys
        };
      };

      const validation = validateNestedTranslations('en', 'ja');
      
      expect(validation.isComplete).toBe(false);
      expect(validation.missingKeys).toContain('errors.auth');
    });
  });

  describe('Format String Handling', () => {
    test('should handle parameterized translations', () => {
      const translations = {
        'en': {
          'welcomeMessage': 'Welcome, {name}!',
          'itemCount': 'You have {count} items'
        },
        'ja': {
          'welcomeMessage': 'ようこそ、{name}さん！',
          'itemCount': '{count}個のアイテムがあります'
        }
      };

      const t = (key, lang = 'en', params = {}) => {
        let text = translations[lang] && translations[lang][key] 
          ? translations[lang][key] 
          : key;

        // Replace parameters
        for (const [paramKey, paramValue] of Object.entries(params)) {
          text = text.replace(`{${paramKey}}`, paramValue);
        }

        return text;
      };

      expect(t('welcomeMessage', 'en', { name: 'John' })).toBe('Welcome, John!');
      expect(t('welcomeMessage', 'ja', { name: 'John' })).toBe('ようこそ、Johnさん！');
      expect(t('itemCount', 'en', { count: 5 })).toBe('You have 5 items');
      expect(t('itemCount', 'ja', { count: 5 })).toBe('5個のアイテムがあります');
    });

    test('should handle missing parameters gracefully', () => {
      const translations = {
        'en': {
          'welcomeMessage': 'Welcome, {name}!'
        }
      };

      const t = (key, lang = 'en', params = {}) => {
        let text = translations[lang] && translations[lang][key] 
          ? translations[lang][key] 
          : key;

        // Replace parameters
        for (const [paramKey, paramValue] of Object.entries(params)) {
          text = text.replace(`{${paramKey}}`, paramValue);
        }

        return text;
      };

      // Missing name parameter
      expect(t('welcomeMessage', 'en', {})).toBe('Welcome, {name}!');
      
      // Extra parameters should be ignored
      expect(t('welcomeMessage', 'en', { name: 'John', extra: 'ignored' })).toBe('Welcome, John!');
    });
  });

  describe('Pluralization', () => {
    test('should handle simple pluralization', () => {
      const translations = {
        'en': {
          'itemCount': {
            'zero': 'No items',
            'one': '1 item',
            'other': '{count} items'
          }
        },
        'ja': {
          'itemCount': {
            'zero': 'アイテムなし',
            'one': '1個のアイテム',
            'other': '{count}個のアイテム'
          }
        }
      };

      const t = (key, lang = 'en', count = 0) => {
        const translation = translations[lang] && translations[lang][key];
        
        if (!translation || typeof translation !== 'object') {
          return key;
        }

        let pluralKey;
        if (count === 0) {
          pluralKey = 'zero';
        } else if (count === 1) {
          pluralKey = 'one';
        } else {
          pluralKey = 'other';
        }

        const text = translation[pluralKey] || translation['other'] || key;
        return text.replace('{count}', count.toString());
      };

      expect(t('itemCount', 'en', 0)).toBe('No items');
      expect(t('itemCount', 'en', 1)).toBe('1 item');
      expect(t('itemCount', 'en', 5)).toBe('5 items');
      expect(t('itemCount', 'ja', 0)).toBe('アイテムなし');
      expect(t('itemCount', 'ja', 1)).toBe('1個のアイテム');
      expect(t('itemCount', 'ja', 5)).toBe('5個のアイテム');
    });
  });
});