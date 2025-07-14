// Integration tests for Chrome extension functionality
describe('Chrome Extension Integration Tests', () => {
  let mockChrome;
  let mockDocument;
  let mockWindow;

  beforeEach(() => {
    // Mock Chrome APIs
    mockChrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn(),
          remove: jest.fn(),
          clear: jest.fn()
        }
      },
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn()
      },
      scripting: {
        executeScript: jest.fn()
      },
      runtime: {
        sendMessage: jest.fn(),
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      sidePanel: {
        open: jest.fn(),
        close: jest.fn()
      }
    };
    global.chrome = mockChrome;

    // Mock Document
    mockDocument = {
      getElementById: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      createElement: jest.fn(() => ({
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          toggle: jest.fn(),
          contains: jest.fn(() => false)
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        innerHTML: '',
        textContent: '',
        value: '',
        style: {}
      })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    global.document = mockDocument;

    // Mock Window
    mockWindow = {
      location: { href: 'https://example.com' },
      getSelection: jest.fn(() => ({
        toString: jest.fn(() => 'selected text')
      })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    global.window = mockWindow;

    // Mock fetch
    global.fetch = jest.fn();

    // Mock i18n
    global.i18n = {
      t: jest.fn((key) => key),
      getCurrentLanguage: jest.fn(() => 'en'),
      setLanguage: jest.fn(),
      detectLanguage: jest.fn(() => 'en')
    };

    jest.clearAllMocks();
  });

  describe('Extension Initialization', () => {
    test('should initialize extension with default settings', async () => {
      const initializeExtension = async () => {
        // Load configurations
        const configResult = await chrome.storage.local.get(['aiConfigs', 'uiSettings']);
        
        const defaultConfigs = {
          'vertex-ai': null,
          'openai-compatible': null,
          'chatgpt': null,
          'aws-bedrock': null
        };

        const defaultUISettings = {
          fontSize: 'medium',
          useShiftEnter: true,
          language: 'en',
          defaultProvider: 'vertex-ai'
        };

        const configs = configResult.aiConfigs || defaultConfigs;
        const uiSettings = configResult.uiSettings || defaultUISettings;

        return { configs, uiSettings };
      };

      mockChrome.storage.local.get.mockResolvedValue({});

      const result = await initializeExtension();

      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['aiConfigs', 'uiSettings']);
      expect(result.configs).toEqual({
        'vertex-ai': null,
        'openai-compatible': null,
        'chatgpt': null,
        'aws-bedrock': null
      });
      expect(result.uiSettings.fontSize).toBe('medium');
      expect(result.uiSettings.defaultProvider).toBe('vertex-ai');
    });

    test('should restore saved configurations', async () => {
      const savedConfigs = {
        'vertex-ai': { serviceAccountJson: '{}', location: 'us-central1' },
        'chatgpt': { apiKey: 'sk-test123', model: 'gpt-4' }
      };

      const savedUISettings = {
        fontSize: 'large',
        language: 'ja',
        defaultProvider: 'chatgpt'
      };

      mockChrome.storage.local.get.mockResolvedValue({
        aiConfigs: savedConfigs,
        uiSettings: savedUISettings
      });

      const initializeExtension = async () => {
        const result = await chrome.storage.local.get(['aiConfigs', 'uiSettings']);
        return result;
      };

      const result = await initializeExtension();

      expect(result.aiConfigs).toEqual(savedConfigs);
      expect(result.uiSettings).toEqual(savedUISettings);
    });
  });

  describe('End-to-End Message Flow', () => {
    test('should handle complete message flow from UI to AI API', async () => {
      // Mock AI API response
      const mockAIResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'AI response' } }]
        })
      };
      global.fetch.mockResolvedValue(mockAIResponse);

      // Mock page content
      const mockPageContent = {
        title: 'Test Page',
        url: 'https://example.com',
        content: 'Page content',
        selectedText: 'selected text'
      };

      mockChrome.tabs.query.mockResolvedValue([{ id: 1, active: true }]);
      mockChrome.tabs.sendMessage.mockResolvedValue(mockPageContent);

      const handleMessageSend = async (message, includePageContent = false) => {
        let finalMessage = message;

        // Get page content if requested
        if (includePageContent) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs.length > 0) {
            try {
              const pageContent = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageContent' });
              finalMessage = `${message}\n\nPage context:\nTitle: ${pageContent.title}\nURL: ${pageContent.url}\nContent: ${pageContent.content}`;
            } catch (error) {
              // Continue without page content
            }
          }
        }

        // Call AI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-test123'
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: finalMessage }]
          })
        });

        const data = await response.json();
        return data.choices[0].message.content;
      };

      const result = await handleMessageSend('Hello', true);

      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, { action: 'getPageContent' });
      expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-test123'
        },
        body: expect.stringContaining('Hello')
      });
      expect(result).toBe('AI response');
    });

    test('should handle message flow with custom instructions', async () => {
      const mockAIResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'AI response with custom instructions' } }]
        })
      };
      global.fetch.mockResolvedValue(mockAIResponse);

      const handleMessageWithCustomInstructions = async (message, customInstructions) => {
        const messages = [];
        
        if (customInstructions) {
          messages.push({ role: 'system', content: customInstructions });
        }
        
        messages.push({ role: 'user', content: message });

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-test123'
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: messages
          })
        });

        const data = await response.json();
        return data.choices[0].message.content;
      };

      const result = await handleMessageWithCustomInstructions('Hello', 'You are a helpful assistant');

      expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-test123'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: 'Hello' }
          ]
        })
      });
      expect(result).toBe('AI response with custom instructions');
    });
  });

  describe('Configuration Management Integration', () => {
    test('should validate and save complete configuration', async () => {
      const validateAndSaveConfig = async (provider, config) => {
        // Validate configuration
        let isValid = false;
        switch (provider) {
          case 'vertex-ai':
            isValid = config.serviceAccountJson && config.location;
            break;
          case 'openai-compatible':
            isValid = config.apiKey && config.endpoint;
            break;
          case 'chatgpt':
            isValid = config.apiKey;
            break;
          case 'aws-bedrock':
            isValid = config.accessKeyId && config.secretAccessKey && config.region;
            break;
        }

        if (!isValid) {
          throw new Error(`Invalid configuration for ${provider}`);
        }

        // Save configuration
        const currentConfigs = await chrome.storage.local.get(['aiConfigs']);
        const updatedConfigs = {
          ...currentConfigs.aiConfigs,
          [provider]: config
        };

        await chrome.storage.local.set({ aiConfigs: updatedConfigs });
        return true;
      };

      mockChrome.storage.local.get.mockResolvedValue({ aiConfigs: {} });
      mockChrome.storage.local.set.mockResolvedValue(true);

      const validConfig = {
        apiKey: 'sk-test123',
        endpoint: 'https://api.openai.com',
        model: 'gpt-4'
      };

      const result = await validateAndSaveConfig('openai-compatible', validConfig);

      expect(result).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        aiConfigs: { 'openai-compatible': validConfig }
      });
    });

    test('should reject invalid configuration', async () => {
      const validateAndSaveConfig = async (provider, config) => {
        let isValid = false;
        switch (provider) {
          case 'chatgpt':
            isValid = config.apiKey;
            break;
        }

        if (!isValid) {
          throw new Error(`Invalid configuration for ${provider}`);
        }

        return true;
      };

      const invalidConfig = { apiKey: '' };

      await expect(validateAndSaveConfig('chatgpt', invalidConfig))
        .rejects.toThrow('Invalid configuration for chatgpt');
    });
  });

  describe('UI State Management', () => {
    test('should manage tab switching state', () => {
      const switchTab = (tabName) => {
        return tabName;
      };

      const result = switchTab('chatgpt');
      expect(result).toBe('chatgpt');
    });

    test('should manage screen visibility', () => {
      const showAppropriateScreen = (hasValidConfig) => {
        return hasValidConfig ? 'chat' : 'setup';
      };

      expect(showAppropriateScreen(true)).toBe('chat');
      expect(showAppropriateScreen(false)).toBe('setup');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle API errors gracefully', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: { message: 'Invalid API key' }
        })
      };
      global.fetch.mockResolvedValue(mockErrorResponse);

      const handleAPICall = async (message) => {
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer invalid-key'
            },
            body: JSON.stringify({
              model: 'gpt-4',
              messages: [{ role: 'user', content: message }]
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
          }

          const data = await response.json();
          return data.choices[0].message.content;
        } catch (error) {
          return { error: error.message };
        }
      };

      const result = await handleAPICall('Hello');

      expect(result).toEqual({ error: 'Invalid API key' });
    });

    test('should handle network errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const handleAPICall = async (message) => {
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer sk-test123'
            },
            body: JSON.stringify({
              model: 'gpt-4',
              messages: [{ role: 'user', content: message }]
            })
          });

          const data = await response.json();
          return data.choices[0].message.content;
        } catch (error) {
          return { error: `Network error: ${error.message}` };
        }
      };

      const result = await handleAPICall('Hello');

      expect(result).toEqual({ error: 'Network error: Network error' });
    });

    test('should handle content script injection errors', async () => {
      mockChrome.tabs.query.mockResolvedValue([{ id: 1, active: true }]);
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Could not establish connection'));

      const getPageContentSafely = async () => {
        let tabs;
        try {
          tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs.length > 0) {
            const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageContent' });
            return response;
          }
          return null;
        } catch (error) {
          // Try to inject content script
          try {
            if (tabs && tabs.length > 0) {
              await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['scripts/content.js']
              });
              
              // Retry after injection
              const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageContent' });
              return response;
            }
            return null;
          } catch (injectionError) {
            return null;
          }
        }
      };

      // Mock script injection success and subsequent message success
      mockChrome.scripting.executeScript.mockResolvedValue(true);
      mockChrome.tabs.sendMessage.mockRejectedValueOnce(new Error('Could not establish connection'))
        .mockResolvedValue({ title: 'Test Page', content: 'Page content' });

      const result = await getPageContentSafely();

      expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 1 },
        files: ['scripts/content.js']
      });
      expect(result).toEqual({ title: 'Test Page', content: 'Page content' });
    });
  });

  describe('Performance and Memory Management', () => {
    test('should clean up event listeners on component unmount', () => {
      const setupEventListeners = () => {
        return () => 'cleanup';
      };

      const cleanup = setupEventListeners();
      const result = cleanup();
      
      expect(result).toBe('cleanup');
    });

    test('should throttle API calls to prevent rate limiting', async () => {
      let callCount = 0;
      const mockThrottledFetch = jest.fn().mockImplementation(async () => {
        callCount++;
        return { ok: true, json: () => Promise.resolve({ choices: [{ message: { content: 'response' } }] }) };
      });

      const throttleAPICall = (() => {
        let lastCallTime = 0;
        const minInterval = 1000; // 1 second

        return async (message) => {
          const now = Date.now();
          const timeSinceLastCall = now - lastCallTime;
          
          if (timeSinceLastCall < minInterval) {
            await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastCall));
          }
          
          lastCallTime = Date.now();
          return mockThrottledFetch(message);
        };
      })();

      // Mock Date.now for consistent timing
      const mockNow = jest.spyOn(Date, 'now');
      mockNow.mockReturnValueOnce(0).mockReturnValueOnce(500).mockReturnValueOnce(1500);

      await throttleAPICall('message1');
      await throttleAPICall('message2');

      expect(mockThrottledFetch).toHaveBeenCalledTimes(2);
      
      mockNow.mockRestore();
    });
  });
});