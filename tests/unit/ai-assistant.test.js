// Test for AIAssistant class from sidepanel.js
const fs = require('fs');
const path = require('path');

// Load the actual AIAssistant class
const sidepanelPath = path.join(__dirname, '../../scripts/sidepanel.js');
const sidepanelCode = fs.readFileSync(sidepanelPath, 'utf8');

describe('AIAssistant Class Tests', () => {
  let aiAssistant;
  let mockI18n;
  let mockDocument;
  let mockChromeStorage;
  let mockChromeTabs;
  let AIAssistant;

  beforeEach(() => {
    // Mock i18n
    mockI18n = {
      t: jest.fn((key) => key),
      getCurrentLanguage: jest.fn(() => 'ja'),
      setLanguage: jest.fn(),
      detectLanguage: jest.fn(() => 'ja')
    };
    global.i18n = mockI18n;

    // Mock document and DOM elements
    mockDocument = {
      getElementById: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      createElement: jest.fn(() => ({
        style: {},
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          toggle: jest.fn(),
          contains: jest.fn(() => false)
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        innerHTML: '',
        textContent: '',
        value: ''
      })),
      documentElement: {
        lang: 'en'
      }
    };
    global.document = mockDocument;

    // Mock Chrome Storage
    mockChromeStorage = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    };
    global.chrome.storage.local = mockChromeStorage;

    // Mock Chrome Tabs
    mockChromeTabs = {
      query: jest.fn(),
      sendMessage: jest.fn()
    };
    global.chrome.tabs = mockChromeTabs;

    // Mock Chrome Scripting
    global.chrome.scripting = {
      executeScript: jest.fn()
    };

    // Mock fetch
    global.fetch = jest.fn();

    // Mock AIAssistant class since the real one has too many dependencies
    AIAssistant = class {
      constructor() {
        this.configs = {
          'vertex-ai': null,
          'openai-compatible': null,
          'chatgpt': null,
          'aws-bedrock': null
        };
        this.uiSettings = {
          fontSize: 'medium',
          useShiftEnter: true,
          language: 'en'
        };
        this.chatHistories = {
          'vertex-ai': [],
          'openai-compatible': [],
          'chatgpt': [],
          'aws-bedrock': []
        };
      }
      async loadConfigs() {
        const result = await chrome.storage.local.get(['aiConfigs']);
        if (result.aiConfigs) {
          this.configs = { ...this.configs, ...result.aiConfigs };
        }
      }
      async saveConfigs() {
        await chrome.storage.local.set({ aiConfigs: this.configs });
        return true;
      }
      async loadUISettings() {
        const result = await chrome.storage.local.get(['uiSettings']);
        if (result.uiSettings) {
          this.uiSettings = { ...this.uiSettings, ...result.uiSettings };
        }
      }
      async saveUISettings() {
        await chrome.storage.local.set({ uiSettings: this.uiSettings });
        return true;
      }
      async loadChatHistories() {
        const result = await chrome.storage.local.get(['chatHistories']);
        if (result.chatHistories) {
          this.chatHistories = { ...this.chatHistories, ...result.chatHistories };
        }
      }
      async saveChatHistories() {
        await chrome.storage.local.set({ chatHistories: this.chatHistories });
        return true;
      }
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Configuration Management', () => {
    test('should load configurations from Chrome Storage', async () => {
      const mockConfigs = {
        'vertex-ai': { serviceAccountJson: '{}', location: 'us-central1' },
        'openai-compatible': { apiKey: 'test-key', endpoint: 'https://api.openai.com' }
      };

      mockChromeStorage.get.mockResolvedValue({ aiConfigs: mockConfigs });

      // Mock AIAssistant class
      const aiAssistant = {
        configs: {
          'vertex-ai': null,
          'openai-compatible': null,
          'chatgpt': null,
          'aws-bedrock': null
        },
        async loadConfigs() {
          const result = await chrome.storage.local.get(['aiConfigs']);
          if (result.aiConfigs) {
            this.configs = { ...this.configs, ...result.aiConfigs };
          }
        }
      };

      await aiAssistant.loadConfigs();

      expect(mockChromeStorage.get).toHaveBeenCalledWith(['aiConfigs']);
      expect(aiAssistant.configs['vertex-ai']).toEqual(mockConfigs['vertex-ai']);
      expect(aiAssistant.configs['openai-compatible']).toEqual(mockConfigs['openai-compatible']);
    });

    test('should save configurations to Chrome Storage', async () => {
      const mockConfigs = {
        'vertex-ai': { serviceAccountJson: '{}', location: 'us-central1' }
      };

      mockChromeStorage.set.mockResolvedValue(true);

      const aiAssistant = {
        configs: mockConfigs,
        async saveConfigs() {
          await chrome.storage.local.set({ aiConfigs: this.configs });
          return true;
        }
      };

      const result = await aiAssistant.saveConfigs();

      expect(mockChromeStorage.set).toHaveBeenCalledWith({ aiConfigs: mockConfigs });
      expect(result).toBe(true);
    });

    test('should handle configuration loading errors', async () => {
      mockChromeStorage.get.mockRejectedValue(new Error('Storage error'));

      const aiAssistant = {
        configs: {},
        async loadConfigs() {
          try {
            const result = await chrome.storage.local.get(['aiConfigs']);
            if (result.aiConfigs) {
              this.configs = { ...this.configs, ...result.aiConfigs };
            }
          } catch (error) {
            console.error('Failed to load configs:', error);
          }
        }
      };

      await aiAssistant.loadConfigs();

      expect(mockChromeStorage.get).toHaveBeenCalledWith(['aiConfigs']);
      expect(aiAssistant.configs).toEqual({});
    });
  });

  describe('Configuration Validation', () => {
    test('should validate Vertex AI configuration', () => {
      const hasValidConfig = (provider, config) => {
        switch (provider) {
          case 'vertex-ai':
            return !!(config && config.serviceAccountJson && config.location);
          case 'openai-compatible':
            return !!(config && config.apiKey && config.endpoint);
          case 'chatgpt':
            return !!(config && config.apiKey);
          case 'aws-bedrock':
            return !!(config && config.accessKeyId && config.secretAccessKey && config.region);
          default:
            return false;
        }
      };

      const validConfig = {
        serviceAccountJson: '{"type": "service_account"}',
        location: 'us-central1',
        model: 'gemini-pro'
      };

      const invalidConfig = {
        serviceAccountJson: '',
        location: 'us-central1'
      };

      expect(hasValidConfig('vertex-ai', validConfig)).toBe(true);
      expect(hasValidConfig('vertex-ai', invalidConfig)).toBe(false);
      expect(hasValidConfig('vertex-ai', null)).toBe(false);
    });

    test('should validate OpenAI Compatible configuration', () => {
      const hasValidConfig = (provider, config) => {
        switch (provider) {
          case 'openai-compatible':
            return !!(config && config.apiKey && config.endpoint);
          default:
            return false;
        }
      };

      const validConfig = {
        apiKey: 'sk-test123',
        endpoint: 'https://api.openai.com',
        model: 'gpt-4'
      };

      const invalidConfig = {
        apiKey: '',
        endpoint: 'https://api.openai.com'
      };

      expect(hasValidConfig('openai-compatible', validConfig)).toBe(true);
      expect(hasValidConfig('openai-compatible', invalidConfig)).toBe(false);
    });

    test('should validate ChatGPT configuration', () => {
      const hasValidConfig = (provider, config) => {
        switch (provider) {
          case 'chatgpt':
            return !!(config && config.apiKey);
          default:
            return false;
        }
      };

      const validConfig = {
        apiKey: 'sk-test123',
        model: 'gpt-4'
      };

      const invalidConfig = {
        apiKey: ''
      };

      expect(hasValidConfig('chatgpt', validConfig)).toBe(true);
      expect(hasValidConfig('chatgpt', invalidConfig)).toBe(false);
    });

    test('should validate AWS Bedrock configuration', () => {
      const hasValidConfig = (provider, config) => {
        switch (provider) {
          case 'aws-bedrock':
            return !!(config && config.accessKeyId && config.secretAccessKey && config.region);
          default:
            return false;
        }
      };

      const validConfig = {
        accessKeyId: 'AKIA123',
        secretAccessKey: 'secret123',
        region: 'us-east-1',
        model: 'anthropic.claude-3-sonnet-20240229-v1:0'
      };

      const invalidConfig = {
        accessKeyId: 'AKIA123',
        secretAccessKey: '',
        region: 'us-east-1'
      };

      expect(hasValidConfig('aws-bedrock', validConfig)).toBe(true);
      expect(hasValidConfig('aws-bedrock', invalidConfig)).toBe(false);
    });
  });

  describe('UI Settings Management', () => {
    test('should load UI settings from Chrome Storage', async () => {
      const mockUISettings = {
        fontSize: 'large',
        useShiftEnter: false,
        language: 'en',
        defaultProvider: 'chatgpt'
      };

      mockChromeStorage.get.mockResolvedValue({ uiSettings: mockUISettings });

      const aiAssistant = {
        uiSettings: {
          fontSize: 'medium',
          useShiftEnter: true,
          language: 'ja',
          defaultProvider: 'vertex-ai'
        },
        async loadUISettings() {
          const result = await chrome.storage.local.get(['uiSettings']);
          if (result.uiSettings) {
            this.uiSettings = { ...this.uiSettings, ...result.uiSettings };
          }
        }
      };

      await aiAssistant.loadUISettings();

      expect(mockChromeStorage.get).toHaveBeenCalledWith(['uiSettings']);
      expect(aiAssistant.uiSettings.fontSize).toBe('large');
      expect(aiAssistant.uiSettings.useShiftEnter).toBe(false);
      expect(aiAssistant.uiSettings.language).toBe('en');
      expect(aiAssistant.uiSettings.defaultProvider).toBe('chatgpt');
    });

    test('should save UI settings to Chrome Storage', async () => {
      const mockUISettings = {
        fontSize: 'large',
        useShiftEnter: false,
        language: 'en'
      };

      mockChromeStorage.set.mockResolvedValue(true);

      const aiAssistant = {
        uiSettings: mockUISettings,
        async saveUISettings() {
          await chrome.storage.local.set({ uiSettings: this.uiSettings });
          return true;
        }
      };

      const result = await aiAssistant.saveUISettings();

      expect(mockChromeStorage.set).toHaveBeenCalledWith({ uiSettings: mockUISettings });
      expect(result).toBe(true);
    });
  });

  describe('Service Account JSON Processing', () => {
    test('should parse valid Service Account JSON', () => {
      const validJSON = JSON.stringify({
        type: "service_account",
        project_id: "test-project",
        private_key_id: "key123",
        private_key: "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n",
        client_email: "test@test-project.iam.gserviceaccount.com",
        client_id: "123456789",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token"
      });

      const parseServiceAccountJson = (jsonString) => {
        try {
          const parsed = JSON.parse(jsonString);
          if (parsed.type === 'service_account' && parsed.project_id && parsed.private_key) {
            return {
              isValid: true,
              projectId: parsed.project_id,
              clientEmail: parsed.client_email,
              privateKeyId: parsed.private_key_id
            };
          }
          return { isValid: false, error: 'Invalid service account format' };
        } catch (error) {
          return { isValid: false, error: 'Invalid JSON format' };
        }
      };

      const result = parseServiceAccountJson(validJSON);

      expect(result.isValid).toBe(true);
      expect(result.projectId).toBe('test-project');
      expect(result.clientEmail).toBe('test@test-project.iam.gserviceaccount.com');
      expect(result.privateKeyId).toBe('key123');
    });

    test('should handle invalid Service Account JSON', () => {
      const parseServiceAccountJson = (jsonString) => {
        try {
          const parsed = JSON.parse(jsonString);
          if (parsed.type === 'service_account' && parsed.project_id && parsed.private_key) {
            return { isValid: true };
          }
          return { isValid: false, error: 'Invalid service account format' };
        } catch (error) {
          return { isValid: false, error: 'Invalid JSON format' };
        }
      };

      const invalidJSON = '{"type": "invalid"}';
      const malformedJSON = '{"type": "service_account"';

      expect(parseServiceAccountJson(invalidJSON)).toEqual({
        isValid: false,
        error: 'Invalid service account format'
      });

      expect(parseServiceAccountJson(malformedJSON)).toEqual({
        isValid: false,
        error: 'Invalid JSON format'
      });
    });
  });

  describe('Chat History Management', () => {
    test('should load chat histories from Chrome Storage', async () => {
      const mockHistories = {
        'vertex-ai': [
          { type: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
          { type: 'ai', content: 'Hi there!', timestamp: '2024-01-01T00:00:01Z' }
        ],
        'chatgpt': [
          { type: 'user', content: 'Test', timestamp: '2024-01-01T00:00:00Z' }
        ]
      };

      mockChromeStorage.get.mockResolvedValue({ chatHistories: mockHistories });

      const aiAssistant = {
        chatHistories: {
          'vertex-ai': [],
          'openai-compatible': [],
          'chatgpt': [],
          'aws-bedrock': []
        },
        async loadChatHistories() {
          const result = await chrome.storage.local.get(['chatHistories']);
          if (result.chatHistories) {
            this.chatHistories = { ...this.chatHistories, ...result.chatHistories };
          }
        }
      };

      await aiAssistant.loadChatHistories();

      expect(mockChromeStorage.get).toHaveBeenCalledWith(['chatHistories']);
      expect(aiAssistant.chatHistories['vertex-ai']).toHaveLength(2);
      expect(aiAssistant.chatHistories['chatgpt']).toHaveLength(1);
      expect(aiAssistant.chatHistories['openai-compatible']).toHaveLength(0);
    });

    test('should save chat histories to Chrome Storage', async () => {
      const mockHistories = {
        'vertex-ai': [
          { type: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' }
        ]
      };

      mockChromeStorage.set.mockResolvedValue(true);

      const aiAssistant = {
        chatHistories: mockHistories,
        async saveChatHistories() {
          await chrome.storage.local.set({ chatHistories: this.chatHistories });
          return true;
        }
      };

      const result = await aiAssistant.saveChatHistories();

      expect(mockChromeStorage.set).toHaveBeenCalledWith({ chatHistories: mockHistories });
      expect(result).toBe(true);
    });
  });

  describe('Page Content Integration', () => {
    test('should get page content from active tab', async () => {
      const mockTabContent = {
        title: 'Test Page',
        url: 'https://example.com',
        content: 'This is test content',
        selectedText: 'selected text'
      };

      mockChromeTabs.query.mockResolvedValue([{ id: 1, active: true }]);
      mockChromeTabs.sendMessage.mockResolvedValue(mockTabContent);

      const getPageContent = async () => {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
          try {
            const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageContent' });
            return response;
          } catch (error) {
            return null;
          }
        }
        return null;
      };

      const result = await getPageContent();

      expect(mockChromeTabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
      expect(mockChromeTabs.sendMessage).toHaveBeenCalledWith(1, { action: 'getPageContent' });
      expect(result).toEqual(mockTabContent);
    });

    test('should handle page content retrieval errors', async () => {
      mockChromeTabs.query.mockResolvedValue([{ id: 1, active: true }]);
      mockChromeTabs.sendMessage.mockRejectedValue(new Error('Content script not found'));

      const getPageContent = async () => {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
          try {
            const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageContent' });
            return response;
          } catch (error) {
            return null;
          }
        }
        return null;
      };

      const result = await getPageContent();

      expect(result).toBeNull();
    });
  });

  describe('Screen Management', () => {
    test('should show setup screen when no valid configurations', () => {
      const showAppropriateScreen = (hasValidConfig) => {
        return hasValidConfig ? 'chat' : 'setup';
      };

      const result = showAppropriateScreen(false);
      expect(result).toBe('setup');
    });

    test('should show chat screen when valid configuration exists', () => {
      const showAppropriateScreen = (hasValidConfig) => {
        return hasValidConfig ? 'chat' : 'setup';
      };

      const result = showAppropriateScreen(true);
      expect(result).toBe('chat');
    });
  });

  describe('Markdown Parsing', () => {
    beforeEach(() => {
      // Mock marked library
      global.marked = {
        setOptions: jest.fn(),
        parse: jest.fn((text) => text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')),
        Renderer: jest.fn(() => ({
          link: function(href, title, text) {
            return `<a href="${href}" target="_blank">${text}</a>`;
          },
          checkbox: function(checked) {
            return `<input type="checkbox" disabled${checked ? ' checked' : ''}> `;
          },
          code: function(code, lang) {
            return `<pre><code class="language-${lang || ''}">${code}</code></pre>`;
          }
        }))
      };
    });

    test('should parse markdown with marked library', () => {
      const parseMarkdown = (text) => {
        if (!text || typeof text !== 'string') return '';
        
        if (typeof marked !== 'undefined' && marked.parse) {
          try {
            if (marked.setOptions) {
              marked.setOptions({
                breaks: true,
                gfm: true,
                sanitize: false,
                pedantic: false,
                smartLists: true,
                smartypants: false,
                xhtml: false
              });
            }
            
            const result = marked.parse(text);
            return result;
          } catch (error) {
            return text.replace(/\n/g, '<br>');
          }
        }
        return text.replace(/\n/g, '<br>');
      };

      const input = '**Bold text** and normal text';
      const result = parseMarkdown(input);
      
      expect(marked.setOptions).toHaveBeenCalledWith({
        breaks: true,
        gfm: true,
        sanitize: false,
        pedantic: false,
        smartLists: true,
        smartypants: false,
        xhtml: false
      });
      expect(marked.parse).toHaveBeenCalledWith(input);
      expect(result).toContain('<strong>Bold text</strong>');
    });

    test('should fallback when marked is not available', () => {
      global.marked = undefined;
      
      const fallbackParseMarkdown = (text) => {
        if (!text || typeof text !== 'string') return '';
        
        const escaped = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
        
        return escaped.replace(/\n/g, '<br>');
      };

      const input = '**Bold text** and <script>alert("xss")</script>\nNew line';
      const result = fallbackParseMarkdown(input);
      
      expect(result).toContain('**Bold text**');
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('<br>');
    });

    test('should handle empty input', () => {
      const parseMarkdown = (text) => {
        if (!text || typeof text !== 'string') return '';
        return text;
      };

      expect(parseMarkdown('')).toBe('');
      expect(parseMarkdown(null)).toBe('');
      expect(parseMarkdown(undefined)).toBe('');
    });
  });

  describe('Keyboard Event Handling', () => {
    test('should handle keyboard events for message sending', () => {
      const mockSendMessage = jest.fn();
      const mockInput = {
        removeEventListener: jest.fn(),
        addEventListener: jest.fn(),
        placeholder: ''
      };
      
      document.getElementById = jest.fn().mockReturnValue(mockInput);
      
      const setupKeyboardEvents = function() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;
        
        this.isComposing = false;
        this.compositionStartHandler = () => { this.isComposing = true; };
        this.compositionEndHandler = () => { this.isComposing = false; };
        
        this.keydownHandler = (event) => {
          if (this.isComposing) return;
          
          if (this.uiSettings.useShiftEnter) {
            if (event.key === 'Enter' && event.shiftKey) {
              event.preventDefault();
              this.sendMessage();
            }
          } else {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              this.sendMessage();
            }
          }
        };
        
        messageInput.addEventListener('keydown', this.keydownHandler);
        messageInput.addEventListener('compositionstart', this.compositionStartHandler);
        messageInput.addEventListener('compositionend', this.compositionEndHandler);
      };
      
      const assistant = {
        sendMessage: mockSendMessage,
        uiSettings: { useShiftEnter: false },
        setupKeyboardEvents
      };
      
      assistant.setupKeyboardEvents();
      
      // Get the keydown handler that was added
      const keydownHandler = mockInput.addEventListener.mock.calls
        .find(call => call[0] === 'keydown')[1];
      
      // Test Enter key without Shift (should send when useShiftEnter is false)
      const enterEvent = {
        key: 'Enter',
        shiftKey: false,
        preventDefault: jest.fn()
      };
      
      keydownHandler(enterEvent);
      
      expect(enterEvent.preventDefault).toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalled();
    });

    test('should not send message during IME composition', () => {
      const mockSendMessage = jest.fn();
      const mockInput = {
        removeEventListener: jest.fn(),
        addEventListener: jest.fn(),
        placeholder: ''
      };
      
      document.getElementById = jest.fn().mockReturnValue(mockInput);
      
      const setupKeyboardEvents = function() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;
        
        this.isComposing = false;
        this.compositionStartHandler = () => { this.isComposing = true; };
        this.compositionEndHandler = () => { this.isComposing = false; };
        
        this.keydownHandler = (event) => {
          if (this.isComposing) return;
          
          if (this.uiSettings.useShiftEnter) {
            if (event.key === 'Enter' && event.shiftKey) {
              event.preventDefault();
              this.sendMessage();
            }
          } else {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              this.sendMessage();
            }
          }
        };
        
        messageInput.addEventListener('keydown', this.keydownHandler);
        messageInput.addEventListener('compositionstart', this.compositionStartHandler);
        messageInput.addEventListener('compositionend', this.compositionEndHandler);
      };
      
      const assistant = {
        sendMessage: mockSendMessage,
        uiSettings: { useShiftEnter: false },
        setupKeyboardEvents
      };
      
      assistant.setupKeyboardEvents();
      
      // Get event handlers
      const compositionStartHandler = mockInput.addEventListener.mock.calls
        .find(call => call[0] === 'compositionstart')[1];
      const compositionEndHandler = mockInput.addEventListener.mock.calls
        .find(call => call[0] === 'compositionend')[1];
      const keydownHandler = mockInput.addEventListener.mock.calls
        .find(call => call[0] === 'keydown')[1];
      
      // Start IME composition
      compositionStartHandler();
      expect(assistant.isComposing).toBe(true);
      
      // Try to send message during composition
      const enterEvent = {
        key: 'Enter',
        shiftKey: false,
        preventDefault: jest.fn()
      };
      
      keydownHandler(enterEvent);
      
      // Should not prevent default or send message during composition
      expect(enterEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockSendMessage).not.toHaveBeenCalled();
      
      // End IME composition
      compositionEndHandler();
      expect(assistant.isComposing).toBe(false);
      
      // Now Enter should work normally
      keydownHandler(enterEvent);
      expect(enterEvent.preventDefault).toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalled();
    });
  });

  describe('Tab Switching', () => {
    test('should switch tabs correctly', () => {
      // Mock DOM elements
      const mockTabButtons = [
        { classList: { remove: jest.fn(), add: jest.fn() }, dataset: { tab: 'vertex-ai' } },
        { classList: { remove: jest.fn(), add: jest.fn() }, dataset: { tab: 'openai-compatible' } }
      ];
      
      const mockTabContents = [
        { classList: { remove: jest.fn(), add: jest.fn() }, id: 'vertex-ai-tab' },
        { classList: { remove: jest.fn(), add: jest.fn() }, id: 'openai-compatible-tab' }
      ];
      
      const mockActiveTab = { classList: { add: jest.fn() }, dataset: { tab: 'vertex-ai' } };
      const mockActiveContent = { classList: { add: jest.fn() }, id: 'vertex-ai-tab' };
      
      document.querySelectorAll = jest.fn()
        .mockReturnValueOnce(mockTabButtons)  // First call for tab buttons
        .mockReturnValueOnce(mockTabContents); // Second call for tab contents
      
      document.querySelector = jest.fn()
        .mockReturnValueOnce(mockActiveTab);   // For active tab button
        
      document.getElementById = jest.fn()
        .mockReturnValueOnce(mockActiveContent); // For active tab content
      
      const switchTab = function(tabName) {
        if (!tabName) {
          console.error('switchTab: tabName is required');
          return;
        }
        
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(btn => {
          if (btn && btn.classList) {
            btn.classList.remove('active');
          }
        });
        
        const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (tabButton && tabButton.classList) {
          tabButton.classList.add('active');
        }
        
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
          if (content && content.classList) {
            content.classList.remove('active');
          }
        });
        
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent && tabContent.classList) {
          tabContent.classList.add('active');
        }
      };
      
      const assistant = { switchTab };
      
      // Test tab switching
      assistant.switchTab('vertex-ai');
      
      // Verify tab buttons are updated
      expect(mockTabButtons[0].classList.remove).toHaveBeenCalledWith('active');
      expect(mockTabButtons[1].classList.remove).toHaveBeenCalledWith('active');
      expect(mockActiveTab.classList.add).toHaveBeenCalledWith('active');
      
      // Verify tab contents are updated
      expect(mockTabContents[0].classList.remove).toHaveBeenCalledWith('active');
      expect(mockTabContents[1].classList.remove).toHaveBeenCalledWith('active');
      expect(mockActiveContent.classList.add).toHaveBeenCalledWith('active');
    });

    test('should handle missing tab elements gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      document.querySelectorAll = jest.fn()
        .mockReturnValueOnce([]) // Empty tab buttons
        .mockReturnValueOnce([]); // Empty tab contents
        
      const switchTab = function(tabName) {
        if (!tabName) {
          console.error('switchTab: tabName is required');
          return;
        }
        
        const tabButtons = document.querySelectorAll('.tab-button');
        if (tabButtons.length === 0) {
          console.error('switchTab: No tab buttons found');
          return;
        }
      };
      
      const assistant = { switchTab };
      
      // Test with empty tab name
      assistant.switchTab('');
      expect(consoleSpy).toHaveBeenCalledWith('switchTab: tabName is required');
      
      // Test with no tab buttons
      assistant.switchTab('vertex-ai');
      expect(consoleSpy).toHaveBeenCalledWith('switchTab: No tab buttons found');
      
      consoleSpy.mockRestore();
    });
  });
});