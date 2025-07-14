class AIAssistant {
  constructor() {
    this.configs = {
      'vertex-ai': null,
      'openai-compatible': null,
      'chatgpt': null,
      'aws-bedrock': null
    };
    this.uiSettings = {
      fontSize: '12',
      useShiftEnter: true,
      inputHeight: 80,
      defaultProvider: 'vertex-ai',
      includePageContent: false,
      includeSelectedText: false,
      language: i18n.getCurrentLanguage(),
      customInstructions: ''
    };
    this.setupScreen = document.getElementById('setupScreen');
    this.chatScreen = document.getElementById('chatScreen');
    this.activeProvider = null;
    this.aiInstances = {};
    
    // Manage chat history for each AI provider
    this.chatHistories = {
      'vertex-ai': [],
      'openai-compatible': [],
      'chatgpt': [],
      'aws-bedrock': []
    };
    
    this.init();
  }

  async init() {
    // セキュリティマネージャーを初期化
    if (window.securityManager) {
      await window.securityManager.initialize();
    }
    
    await this.loadConfigs();
    await this.loadUISettings();
    await this.loadChatHistories();
    this.initializeI18n();
    this.setupEventListeners();
    this.setupResizeHandler();
    this.showAppropriateScreen();
    this.applyUISettings();
  }

  async loadConfigs() {
    try {
      // セキュアストレージから暗号化された設定を読み込み
      if (window.securityManager) {
        const secureConfigs = await window.securityManager.getSecure('aiConfigs');
        if (secureConfigs) {
          this.configs = { ...this.configs, ...secureConfigs };
          return;
        }
      }
      
      // 従来の平文ストレージからの移行処理
      const result = await chrome.storage.local.get(['aiConfigs']);
      if (result.aiConfigs) {
        this.configs = { ...this.configs, ...result.aiConfigs };
        
        // セキュアストレージに移行
        if (window.securityManager) {
          await this.migrateToSecureStorage();
        }
      }
    } catch (error) {
      console.error(i18n.t('errorLoadingConfig'), error);
    }
  }

  async loadUISettings() {
    try {
      const result = await chrome.storage.local.get(['uiSettings']);
      if (result.uiSettings) {
        this.uiSettings = { ...this.uiSettings, ...result.uiSettings };
      }
    } catch (error) {
      console.error(i18n.t('errorLoadingUISettings'), error);
    }
  }

  async saveConfigs() {
    try {
      // セキュアストレージに暗号化して保存
      if (window.securityManager) {
        await window.securityManager.setSecure('aiConfigs', this.configs);
        
        // 古い平文データを削除
        await chrome.storage.local.remove(['aiConfigs']);
        return true;
      }
      
      // フォールバック: 平文保存（セキュリティ警告）
      console.warn('セキュリティマネージャーが利用できません。平文で保存します。');
      await chrome.storage.local.set({ aiConfigs: this.configs });
      return true;
    } catch (error) {
      console.error(i18n.t('errorSavingConfig'), error);
      return false;
    }
  }

  async saveUISettings() {
    try {
      await chrome.storage.local.set({ uiSettings: this.uiSettings });
      return true;
    } catch (error) {
      console.error(i18n.t('errorSavingUISettings'), error);
      return false;
    }
  }

  /**
   * 平文ストレージからセキュアストレージへの移行処理
   */
  async migrateToSecureStorage() {
    try {
      console.log('平文ストレージからセキュアストレージに移行中...');
      
      // 現在の設定をセキュアストレージに保存
      await window.securityManager.setSecure('aiConfigs', this.configs);
      
      // 古い平文データを削除
      await chrome.storage.local.remove(['aiConfigs']);
      
      console.log('セキュアストレージへの移行が完了しました');
    } catch (error) {
      console.error('セキュアストレージへの移行に失敗しました:', error);
      throw error;
    }
  }

  /**
   * 設定値の検証
   */
  validateConfig(provider, config) {
    if (!window.securityManager) {
      return true; // セキュリティマネージャーがない場合はスキップ
    }

    try {
      switch (provider) {
        case 'vertex-ai':
          if (config.serviceAccount) {
            window.securityManager.validateInput('serviceAccount', config.serviceAccount);
          }
          break;
        
        case 'openai-compatible':
        case 'chatgpt':
          if (config.apiKey) {
            window.securityManager.validateInput('apiKey', config.apiKey);
          }
          break;
        
        case 'aws-bedrock':
          if (config.accessKeyId && config.secretAccessKey) {
            window.securityManager.validateInput('awsCredentials', {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey
            });
          }
          break;
      }
      
      return true;
    } catch (error) {
      console.error(`設定値の検証エラー (${provider}):`, error);
      throw error;
    }
  }

  async loadChatHistories() {
    try {
      const result = await chrome.storage.local.get(['chatHistories']);
      if (result.chatHistories) {
        this.chatHistories = { ...this.chatHistories, ...result.chatHistories };
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }

  async saveChatHistories() {
    try {
      await chrome.storage.local.set({ chatHistories: this.chatHistories });
      return true;
    } catch (error) {
      console.error('Failed to save chat history:', error);
      return false;
    }
  }

  initializeI18n() {
    // Apply saved language settings to i18n if available
    if (this.uiSettings.language) {
      i18n.setLanguage(this.uiSettings.language);
    }
    
    // Set text for elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const text = i18n.t(key);
      if (text) {
        element.textContent = text;
      }
    });

    // Set placeholder for elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const text = i18n.t(key);
      if (text) {
        element.placeholder = text;
      }
    });

    // Set HTML lang attribute to current language
    document.documentElement.lang = i18n.getCurrentLanguage();
  }

  changeLanguage(lang) {
    // Change language
    i18n.setLanguage(lang);
    
    // Update UI settings
    this.uiSettings.language = lang;
    this.saveUISettings();
    
    // Reinitialize internationalization
    this.initializeI18n();
    
    // Update placeholder text
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
      const placeholder = this.uiSettings.useShiftEnter 
        ? i18n.t('messageInputShiftEnter')
        : i18n.t('messageInputEnter');
      messageInput.placeholder = placeholder;
    }
  }

  updateOpenAICompatibleUI(preset) {
    const defaults = OpenAICompatibleAPI.getPresetDefaults(preset);
    const models = OpenAICompatibleAPI.getPresetModels(preset);
    
    // Set endpoint only if current value is empty
    const endpointInput = document.getElementById('openaiEndpoint');
    if (!endpointInput.value) {
      endpointInput.value = defaults.endpoint;
    }
    
    // Update model options
    const modelSelect = document.getElementById('openaiModel');
    modelSelect.innerHTML = '';
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      modelSelect.appendChild(option);
    });
    
    // Set default model only if current value is empty
    if (defaults.model && !modelSelect.value) {
      modelSelect.value = defaults.model;
    }
    
    // Show/hide Azure-specific settings
    const azureSettings = document.getElementById('azureSettings');
    azureSettings.style.display = preset === 'azure' ? 'block' : 'none';
    
    // Show/hide custom model input
    const customModelInput = document.getElementById('customModelInput');
    customModelInput.style.display = (preset === 'custom' || preset === 'ollama') ? 'block' : 'none';
    
    // Set default values for Azure only if current value is empty
    if (preset === 'azure' && defaults.apiVersion) {
      const azureApiVersionInput = document.getElementById('azureApiVersion');
      if (!azureApiVersionInput.value) {
        azureApiVersionInput.value = defaults.apiVersion;
      }
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Vertex AI authentication method switching
    document.querySelectorAll('input[name="vertexAuthMethod"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.switchVertexAuthMethod(e.target.value);
      });
    });

    // Vertex AI settings
    document.getElementById('selectFileButton').addEventListener('click', () => {
      document.getElementById('serviceAccountFile').click();
    });

    document.getElementById('serviceAccountFile').addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (file) {
        await this.handleServiceAccountFile(file);
      }
    });

    // Settings save button
    document.getElementById('saveConfig').addEventListener('click', async () => {
      await this.saveAllConfigs();
    });

    // Cancel button
    document.getElementById('cancelConfig').addEventListener('click', () => {
      this.cancelSettings();
    });

    // Settings button
    document.getElementById('settingsButton').addEventListener('click', () => {
      this.showSetupScreen();
    });

    // Message sending
    const sendButton = document.getElementById('sendButton');
    sendButton.addEventListener('click', () => this.sendMessage());
    
    // Save checkbox states
    document.getElementById('includePageContent').addEventListener('change', () => {
      this.saveCheckboxStates();
    });

    document.getElementById('includeSelectedText').addEventListener('change', () => {
      this.saveCheckboxStates();
    });
    
    // Language selection
    document.getElementById('language').addEventListener('change', (e) => {
      this.changeLanguage(e.target.value);
    });
    
    // OpenAI Compatible preset selection
    document.getElementById('openaiPreset').addEventListener('change', (e) => {
      this.updateOpenAICompatibleUI(e.target.value);
    });
    
    // Export buttons
    document.getElementById('exportAllHistory').addEventListener('click', () => {
      this.exportAllHistory();
    });
    
    document.getElementById('exportCurrentHistory').addEventListener('click', () => {
      this.exportCurrentHistory();
    });
    
    // Clear logs button
    document.getElementById('clearLogsButton').addEventListener('click', () => {
      this.showClearLogsDialog();
    });
    
    // Keyboard events are set dynamically
    this.setupKeyboardEvents();
  }

  switchTab(tabName) {
    // Update tab button states
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Switch tab content display
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  switchVertexAuthMethod(method) {
    const serviceAccountSection = document.getElementById('serviceAccountSection');
    const apiKeySection = document.getElementById('apiKeySection');
    
    if (method === 'service-account') {
      serviceAccountSection.style.display = 'block';
      apiKeySection.style.display = 'none';
    } else {
      serviceAccountSection.style.display = 'none';
      apiKeySection.style.display = 'block';
    }
    
    // Show common settings
    document.getElementById('locationGroup').style.display = 'block';
    document.getElementById('vertexModelGroup').style.display = 'block';
  }

  async handleServiceAccountFile(file) {
    try {
      const text = await file.text();
      const serviceAccount = JSON.parse(text);
      
      // Validate required fields
      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error('Invalid Service Account JSON file');
      }

      this.configs['vertex-ai'] = {
        serviceAccount: serviceAccount,
        location: document.getElementById('location').value || 'us-central1',
        model: document.getElementById('vertexModel').value || 'gemini-2.5-pro'
      };

      this.displayServiceAccountInfo(serviceAccount);
      document.getElementById('selectedFileName').textContent = file.name;
      document.getElementById('locationGroup').style.display = 'block';
      document.getElementById('vertexModelGroup').style.display = 'block';
      
    } catch (error) {
      console.error(i18n.t('errorServiceAccountFile'), error);
      alert(i18n.t('errorServiceAccountFile') + error.message);
    }
  }

  displayServiceAccountInfo(serviceAccount) {
    document.getElementById('projectId').textContent = serviceAccount.project_id;
    document.getElementById('serviceAccountEmail').textContent = serviceAccount.client_email;
    document.getElementById('serviceAccountKeyId').textContent = serviceAccount.private_key_id;
    document.getElementById('serviceAccountInfo').style.display = 'block';
  }

  async saveAllConfigs() {
    // Vertex AI settings
    const authMethod = document.querySelector('input[name="vertexAuthMethod"]:checked').value;
    
    if (authMethod === 'service-account' && this.configs['vertex-ai'] && this.configs['vertex-ai'].serviceAccount) {
      const vertexConfig = {
        ...this.configs['vertex-ai'],
        authMethod: 'service-account',
        location: document.getElementById('location').value,
        model: document.getElementById('vertexModel').value
      };
      
      // Validate Vertex AI config
      try {
        this.validateConfig('vertex-ai', vertexConfig);
        this.configs['vertex-ai'] = vertexConfig;
      } catch (error) {
        alert(i18n.t('errorValidatingVertexAI') + ': ' + error.message);
        return;
      }
    } else if (authMethod === 'api-key') {
      const projectId = document.getElementById('vertexProjectId').value;
      const apiKey = document.getElementById('vertexApiKey').value;
      
      if (projectId && apiKey) {
        const vertexConfig = {
          authMethod: 'api-key',
          projectId: projectId,
          apiKey: apiKey,
          location: document.getElementById('location').value,
          model: document.getElementById('vertexModel').value
        };
        
        // Validate Vertex AI config
        try {
          this.validateConfig('vertex-ai', vertexConfig);
          this.configs['vertex-ai'] = vertexConfig;
        } catch (error) {
          alert(i18n.t('errorValidatingVertexAI') + ': ' + error.message);
          return;
        }
      }
    }

    // OpenAI Compatible settings
    const openaiPreset = document.getElementById('openaiPreset').value;
    const openaiEndpoint = document.getElementById('openaiEndpoint').value;
    const openaiApiKey = document.getElementById('openaiApiKey').value;
    const openaiModel = document.getElementById('openaiModel').value;
    const customModel = document.getElementById('customModel').value;
    const azureApiVersion = document.getElementById('azureApiVersion').value;
    const azureDeployment = document.getElementById('azureDeployment').value;

    // OpenAI Compatible settings validation
    let openaiConfigValid = false;
    if (openaiPreset === 'azure') {
      // Azure validation: endpoint, API key, and deployment name required
      openaiConfigValid = openaiEndpoint && openaiApiKey && azureDeployment;
    } else {
      // Other provider validation: endpoint and API key required
      openaiConfigValid = openaiEndpoint && openaiApiKey;
    }

    if (openaiConfigValid) {
      let model;
      if (openaiPreset === 'azure') {
        model = azureDeployment;
      } else if (openaiPreset === 'custom' && customModel) {
        model = customModel;
      } else if (openaiPreset === 'ollama' && customModel) {
        model = customModel;
      } else {
        model = openaiModel;
      }
      
      const openaiConfig = {
        preset: openaiPreset,
        endpoint: openaiEndpoint,
        apiKey: openaiApiKey,
        model: model,
        apiVersion: azureApiVersion,
        deployment: azureDeployment
      };
      
      // Validate OpenAI Compatible config
      try {
        this.validateConfig('openai-compatible', openaiConfig);
        this.configs['openai-compatible'] = openaiConfig;
        console.log('OpenAI Compatible config saved:', this.configs['openai-compatible']);
      } catch (error) {
        alert(i18n.t('errorValidatingOpenAI') + ': ' + error.message);
        return;
      }
    } else {
      console.log('OpenAI Compatible config validation failed:', {
        preset: openaiPreset,
        endpoint: openaiEndpoint,
        apiKey: openaiApiKey ? '[REDACTED]' : null,
        deployment: azureDeployment,
        validationResult: openaiConfigValid
      });
    }

    // ChatGPT settings
    const chatgptApiKey = document.getElementById('chatgptApiKey').value;
    const chatgptModel = document.getElementById('chatgptModel').value;
    const chatgptOrganization = document.getElementById('chatgptOrganization').value;

    if (chatgptApiKey) {
      const chatgptConfig = {
        apiKey: chatgptApiKey,
        model: chatgptModel,
        organization: chatgptOrganization || null
      };
      
      // Validate ChatGPT config
      try {
        this.validateConfig('chatgpt', chatgptConfig);
        this.configs['chatgpt'] = chatgptConfig;
      } catch (error) {
        alert(i18n.t('errorValidatingChatGPT') + ': ' + error.message);
        return;
      }
    }

    // AWS Bedrock settings
    const awsAccessKeyId = document.getElementById('awsAccessKeyId').value;
    const awsSecretAccessKey = document.getElementById('awsSecretAccessKey').value;
    const awsSessionToken = document.getElementById('awsSessionToken').value;
    const awsRegion = document.getElementById('awsRegion').value;
    const awsBedrockModel = document.getElementById('awsBedrockModel').value;

    if (awsAccessKeyId && awsSecretAccessKey && awsRegion) {
      const awsConfig = {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
        sessionToken: awsSessionToken || null,
        region: awsRegion,
        model: awsBedrockModel
      };
      
      // Validate AWS Bedrock config
      try {
        this.validateConfig('aws-bedrock', awsConfig);
        this.configs['aws-bedrock'] = awsConfig;
      } catch (error) {
        alert(i18n.t('errorValidatingAWS') + ': ' + error.message);
        return;
      }
    }

    // UI settings
    this.uiSettings = {
      fontSize: document.getElementById('fontSize').value,
      useShiftEnter: document.getElementById('useShiftEnter').checked,
      defaultProvider: document.getElementById('defaultProvider').value,
      inputHeight: this.uiSettings.inputHeight,
      includePageContent: document.getElementById('includePageContent').checked,
      includeSelectedText: document.getElementById('includeSelectedText').checked,
      language: document.getElementById('language').value,
      customInstructions: document.getElementById('customInstructionsText').value
    };

    // Execute save
    const configSaved = await this.saveConfigs();
    const uiSaved = await this.saveUISettings();

    if (configSaved && uiSaved) {
      this.activeProvider = this.uiSettings.defaultProvider;
      this.updateChatTitle();
      this.applyUISettings();
      
      // Check if there are valid settings
      if (this.hasValidConfig()) {
        this.showChatScreen();
      } else {
        alert(i18n.t('saveSettingsSuccess'));
      }
    } else {
      alert(i18n.t('errorSaveSettings'));
    }
  }

  hasValidConfig() {
    const provider = this.uiSettings.defaultProvider;
    const config = this.configs[provider];
    
    switch (provider) {
      case 'vertex-ai':
        if (!config) return false;
        if (config.authMethod === 'api-key') {
          return config.projectId && config.apiKey;
        } else {
          return config.serviceAccount;
        }
      case 'openai-compatible':
        if (!config || !config.endpoint || !config.apiKey) return false;
        if (config.preset === 'azure') {
          return config.deployment && config.apiVersion;
        }
        return config.model;
      case 'chatgpt':
        return config && config.apiKey;
      case 'aws-bedrock':
        return config && config.accessKeyId && config.secretAccessKey && config.region;
      default:
        return false;
    }
  }

  updateChatTitle() {
    const titles = {
      'vertex-ai': '🔷 Vertex AI',
      'openai-compatible': '🔵 OpenAI Compatible',
      'chatgpt': '🟢 ChatGPT',
      'aws-bedrock': '🟠 AWS Bedrock'
    };
    document.getElementById('chatTitle').textContent = titles[this.activeProvider] || 'AI Assistant';
  }

  showAppropriateScreen() {
    if (this.hasValidConfig()) {
      this.activeProvider = this.uiSettings.defaultProvider;
      this.updateChatTitle();
      this.showChatScreen();
      this.restoreSettings();
    } else {
      this.showSetupScreen();
      this.restoreSettings();
    }
  }

  restoreSettings() {
    // Restore Vertex AI settings
    if (this.configs['vertex-ai']) {
      const config = this.configs['vertex-ai'];
      document.getElementById('location').value = config.location || 'us-central1';
      document.getElementById('vertexModel').value = config.model || 'gemini-2.5-pro';
      
      // Restore based on authentication method
      if (config.authMethod === 'api-key') {
        document.querySelector('input[name="vertexAuthMethod"][value="api-key"]').checked = true;
        document.getElementById('vertexProjectId').value = config.projectId || '';
        document.getElementById('vertexApiKey').value = config.apiKey || '';
        this.switchVertexAuthMethod('api-key');
      } else {
        document.querySelector('input[name="vertexAuthMethod"][value="service-account"]').checked = true;
        if (config.serviceAccount) {
          this.displayServiceAccountInfo(config.serviceAccount);
          document.getElementById('selectedFileName').textContent = 'Service Account Configured';
        }
        this.switchVertexAuthMethod('service-account');
      }
      
      document.getElementById('locationGroup').style.display = 'block';
      document.getElementById('vertexModelGroup').style.display = 'block';
    }

    // OpenAI Compatible settings restoration
    if (this.configs['openai-compatible']) {
      const config = this.configs['openai-compatible'];
      document.getElementById('openaiPreset').value = config.preset || 'openai';
      
      // UI update on preset change (before setting values)
      this.updateOpenAICompatibleUI(config.preset || 'openai');
      
      // Restore saved values after UI update
      document.getElementById('openaiEndpoint').value = config.endpoint || '';
      document.getElementById('openaiApiKey').value = config.apiKey || '';
      document.getElementById('azureApiVersion').value = config.apiVersion || '2024-02-15-preview';
      document.getElementById('azureDeployment').value = config.deployment || '';
      
      // Model settings restoration (executed after UI update)
      if (config.preset === 'azure') {
        // For Azure, deployment name is the model name
        document.getElementById('azureDeployment').value = config.deployment || config.model || '';
      } else if (config.preset === 'custom' || config.preset === 'ollama') {
        // For custom models
        document.getElementById('customModel').value = config.model || '';
      } else {
        // Normal model selection
        document.getElementById('openaiModel').value = config.model || '';
      }
    }

    // Restore ChatGPT settings
    if (this.configs['chatgpt']) {
      const config = this.configs['chatgpt'];
      document.getElementById('chatgptApiKey').value = config.apiKey || '';
      document.getElementById('chatgptModel').value = config.model || 'gpt-4o';
      document.getElementById('chatgptOrganization').value = config.organization || '';
    }

    // Restore AWS Bedrock settings
    if (this.configs['aws-bedrock']) {
      const config = this.configs['aws-bedrock'];
      document.getElementById('awsAccessKeyId').value = config.accessKeyId || '';
      document.getElementById('awsSecretAccessKey').value = config.secretAccessKey || '';
      document.getElementById('awsSessionToken').value = config.sessionToken || '';
      document.getElementById('awsRegion').value = config.region || 'us-east-1';
      document.getElementById('awsBedrockModel').value = config.model || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
    }

    // UI settings restoration
    // Font size restoration with pt value compatibility
    const fontSizeElement = document.getElementById('fontSize');
    if (fontSizeElement) {
      const currentFontSize = this.uiSettings.fontSize;
      // Convert old px values to pt values for backward compatibility
      if (currentFontSize === '12px') {
        fontSizeElement.value = '9';
      } else if (currentFontSize === '14px') {
        fontSizeElement.value = '10.5';
      } else if (currentFontSize === '16px') {
        fontSizeElement.value = '12';
      } else if (currentFontSize === '18px') {
        fontSizeElement.value = '13.5';
      } else if (currentFontSize === '20px') {
        fontSizeElement.value = '15';
      } else if (currentFontSize === '22px') {
        fontSizeElement.value = '16.5';
      } else if (currentFontSize === '24px') {
        fontSizeElement.value = '18';
      } else {
        // New pt value system or default value
        fontSizeElement.value = currentFontSize;
      }
    }
    
    document.getElementById('useShiftEnter').checked = this.uiSettings.useShiftEnter;
    document.getElementById('defaultProvider').value = this.uiSettings.defaultProvider;
    document.getElementById('language').value = this.uiSettings.language;
    document.getElementById('customInstructionsText').value = this.uiSettings.customInstructions || '';
    
    // Restore checkbox states
    document.getElementById('includePageContent').checked = this.uiSettings.includePageContent;
    document.getElementById('includeSelectedText').checked = this.uiSettings.includeSelectedText;
  }

  showSetupScreen() {
    this.setupScreen.classList.remove('hidden');
    this.chatScreen.classList.add('hidden');
  }

  showChatScreen() {
    this.setupScreen.classList.add('hidden');
    this.chatScreen.classList.remove('hidden');
  }

  cancelSettings() {
    // Reset settings form to original state
    this.restoreSettings();
    
    // Check if there are valid settings
    if (this.hasValidConfig()) {
      // Return to chat screen if settings are configured
      this.showChatScreen();
    } else {
      // Show confirmation dialog if no settings
      const confirmed = confirm(i18n.t('confirmIncompleteSettings'));
      if (confirmed) {
        this.showChatScreen();
      }
    }
  }

  setupKeyboardEvents() {
    const messageInput = document.getElementById('messageInput');
    
    // Remove existing event listener before adding
    messageInput.removeEventListener('keydown', this.keydownHandler);
    this.keydownHandler = (event) => {
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
    
    // Update placeholder text
    const placeholder = this.uiSettings.useShiftEnter 
      ? i18n.t('messageInputShiftEnter')
      : i18n.t('messageInputEnter');
    messageInput.placeholder = placeholder;
  }

  applyUISettings() {
    // Apply font size directly in pt
    const fontSizePt = parseInt(this.uiSettings.fontSize) || 12;
    const fontSize = `${fontSizePt}pt`;
    document.body.style.fontSize = fontSize;
    
    // Apply font size to message input
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
      messageInput.style.fontSize = fontSize;
    }
    
    // Restore input area height
    const inputContainer = document.querySelector('.input-container');
    if (inputContainer) {
      inputContainer.style.height = `${this.uiSettings.inputHeight}px`;
    }
    
    // Reconfigure keyboard events
    this.setupKeyboardEvents();
  }

  async sendMessage() {
    const messageInput = document.getElementById('messageInput');
    let message = messageInput.value.trim();
    
    if (!message) return;
    
    if (!this.hasValidConfig()) {
      alert(i18n.t('errorNoAPIConfig'));
      return;
    }

    // Add content if page content or text selection is enabled
    const includePageContent = document.getElementById('includePageContent').checked;
    const includeSelectedText = document.getElementById('includeSelectedText').checked;
    
    let fullMessage = message;
    
    if (includePageContent || includeSelectedText) {
      const pageContent = await this.getPageContent();
      if (pageContent) {
        fullMessage += '\n\n--- Reference Information ---\n';
        
        if (includePageContent) {
          fullMessage += `\nPage title: ${pageContent.title}\n`;
          fullMessage += `URL: ${pageContent.url}\n`;
          
          if (pageContent.metadata.headings && pageContent.metadata.headings.length > 0) {
            fullMessage += `\nMain headings:\n`;
            pageContent.metadata.headings.forEach(h => {
              fullMessage += `${h.level.toUpperCase()}: ${h.text}\n`;
            });
          }
          
          fullMessage += `\nページ内容:\n${pageContent.text.substring(0, 8000)}`;
          if (pageContent.text.length > 8000) {
            fullMessage += `\n...(Content truncated due to length)`;
          }
        }
        
        if (includeSelectedText && pageContent.selectedText) {
          fullMessage += `\n\nSelected text:\n"${pageContent.selectedText}"\n`;
        } else if (includeSelectedText) {
          fullMessage += `\n\n※No selected text found`;
        }
      } else if (includePageContent || includeSelectedText) {
        fullMessage += '\n\n※Failed to retrieve page content (may not be available on this page)';
      }
    }

    // UI update (show original message only)
    this.addUserMessage(message);
    messageInput.value = '';
    this.setLoading(true);

    // Display loading message
    const loadingMessageId = this.addLoadingMessage();

    try {
      // Send complete message to AI
      const response = await this.callAI(fullMessage);
      this.removeLoadingMessage(loadingMessageId);
      this.addAIMessage(response);
    } catch (error) {
      console.error(i18n.t('errorAICall'), error);
      this.removeLoadingMessage(loadingMessageId);
      this.addErrorMessage(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  async callAI(message) {
    const provider = this.activeProvider;
    const config = this.configs[provider];
    const customInstructions = this.getCustomInstructions();

    switch (provider) {
      case 'vertex-ai':
        return await this.callVertexAI(message, config, customInstructions);
      case 'openai-compatible':
        return await this.callOpenAICompatible(message, config, customInstructions);
      case 'chatgpt':
        return await this.callChatGPT(message, config, customInstructions);
      case 'aws-bedrock':
        return await this.callAWSBedrock(message, config, customInstructions);
      default:
        throw new Error(i18n.t('errorInvalidProvider'));
    }
  }

  getCustomInstructions() {
    const customInstructions = this.uiSettings.customInstructions;
    return customInstructions && customInstructions.trim() ? customInstructions.trim() : null;
  }

  async callVertexAI(message, config, customInstructions) {
    if (!this.aiInstances['vertex-ai']) {
      if (config.authMethod === 'api-key') {
        this.aiInstances['vertex-ai'] = new GeminiAPI(null, config.location, config.projectId, config.apiKey);
      } else {
        this.aiInstances['vertex-ai'] = new GeminiAPI(config.serviceAccount, config.location);
      }
    }
    
    // For Vertex AI, prepend custom instructions to message
    let finalMessage = message;
    if (customInstructions) {
      finalMessage = `${customInstructions}\n\n${message}`;
    }
    
    return await this.aiInstances['vertex-ai'].generateContent(finalMessage, config.model);
  }

  async callOpenAICompatible(message, config, customInstructions) {
    if (!this.aiInstances['openai-compatible']) {
      this.aiInstances['openai-compatible'] = new OpenAICompatibleAPI(config);
    }
    return await this.aiInstances['openai-compatible'].sendMessage(message, customInstructions);
  }

  async callChatGPT(message, config, customInstructions) {
    if (!this.aiInstances['chatgpt']) {
      this.aiInstances['chatgpt'] = new ChatGPTAPI(
        config.apiKey,
        config.model,
        config.organization
      );
    }
    return await this.aiInstances['chatgpt'].sendMessage(message, customInstructions);
  }

  async callAWSBedrock(message, config, customInstructions) {
    if (!this.aiInstances['aws-bedrock']) {
      this.aiInstances['aws-bedrock'] = new AWSBedrockAPI(config);
    }
    
    const options = {};
    if (customInstructions) {
      options.systemPrompt = customInstructions;
    }
    
    return await this.aiInstances['aws-bedrock'].callAPI(message, options);
  }

  addUserMessage(message) {
    const timestamp = new Date();
    const timeString = timestamp.toLocaleTimeString();
    
    // Save to chat history
    if (this.activeProvider) {
      const messageData = {
        type: 'user',
        content: message,
        timestamp: timestamp.toISOString(),
        provider: this.activeProvider
      };
      this.chatHistories[this.activeProvider].push(messageData);
      this.saveChatHistories();
    }
    
    // Display in UI
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message user-message';
    messageElement.innerHTML = `
      <div class="message-content">
        <div class="message-text">${this.escapeHtml(message)}</div>
        <div class="message-time">${timeString}</div>
      </div>
    `;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  addAIMessage(message) {
    const timestamp = new Date();
    const timeString = timestamp.toLocaleTimeString();
    
    // Get AI provider name
    const providerNames = {
      'vertex-ai': '🔷 Vertex AI',
      'openai-compatible': '🔵 OpenAI Compatible',
      'chatgpt': '🟢 ChatGPT',
      'aws-bedrock': '🟠 AWS Bedrock'
    };
    const providerName = providerNames[this.activeProvider] || 'AI';
    
    // Save to chat history
    if (this.activeProvider) {
      const messageData = {
        type: 'ai',
        content: message,
        timestamp: timestamp.toISOString(),
        provider: this.activeProvider,
        providerName: providerName
      };
      this.chatHistories[this.activeProvider].push(messageData);
      this.saveChatHistories();
    }
    
    // Display in UI
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message ai-message';
    
    const formattedContent = MarkdownParser.parse(message);
    
    messageElement.innerHTML = `
      <div class="message-content">
        <div class="message-text">${formattedContent}</div>
        <div class="message-time">${providerName} • ${timeString}</div>
      </div>
    `;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  addErrorMessage(error) {
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message error-message';
    messageElement.innerHTML = `
      <div class="message-content">
        <div class="message-text">❌ Error: ${this.escapeHtml(error)}</div>
        <div class="message-time">${new Date().toLocaleTimeString()}</div>
      </div>
    `;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  addLoadingMessage() {
    const messagesContainer = document.getElementById('messages');
    const messageElement = document.createElement('div');
    const messageId = 'loading-' + Date.now();
    messageElement.id = messageId;
    messageElement.className = 'message ai-message loading-message';
    
    const providerNames = {
      'vertex-ai': '🔷 Vertex AI',
      'openai-compatible': '🔵 OpenAI Compatible',
      'chatgpt': '🟢 ChatGPT',
      'aws-bedrock': '🟠 AWS Bedrock'
    };
    const providerName = providerNames[this.activeProvider] || 'AI';
    
    messageElement.innerHTML = `
      <div class="message-content">
        <div class="message-text loading-content">
          <div class="loading-spinner"></div>
          <span>${providerName}${i18n.t('loadingGenerating')}<span class="loading-dots">${i18n.t('loadingDots')}</span></span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return messageId;
  }

  removeLoadingMessage(messageId) {
    const loadingElement = document.getElementById(messageId);
    if (loadingElement) {
      loadingElement.remove();
    }
  }

  setLoading(isLoading) {
    const sendIcon = document.getElementById('sendIcon');
    const loadingIcon = document.getElementById('loadingIcon');
    const sendButton = document.getElementById('sendButton');
    
    if (isLoading) {
      sendIcon.classList.add('hidden');
      loadingIcon.classList.remove('hidden');
      sendButton.disabled = true;
    } else {
      sendIcon.classList.remove('hidden');
      loadingIcon.classList.add('hidden');
      sendButton.disabled = false;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Export all chat history as Markdown
  exportAllHistory() {
    try {
      let markdownContent = '# AI Assistant Chat History\n\n';
      markdownContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
      
      const providerNames = {
        'vertex-ai': 'Vertex AI',
        'openai-compatible': 'OpenAI Compatible',
        'chatgpt': 'ChatGPT',
        'aws-bedrock': 'AWS Bedrock'
      };
      
      let hasHistory = false;
      
      // Export each provider's history
      Object.keys(this.chatHistories).forEach(provider => {
        const history = this.chatHistories[provider];
        if (history && history.length > 0) {
          hasHistory = true;
          markdownContent += `## ${providerNames[provider]}\n\n`;
          
          history.forEach(message => {
            const timestamp = new Date(message.timestamp).toLocaleString();
            if (message.type === 'user') {
              markdownContent += `**User** (${timestamp}):\n${message.content}\n\n`;
            } else if (message.type === 'ai') {
              markdownContent += `**${message.providerName || providerNames[provider]}** (${timestamp}):\n${message.content}\n\n`;
            }
          });
          
          markdownContent += '---\n\n';
        }
      });
      
      if (!hasHistory) {
        alert(i18n.t('noHistoryToExport'));
        return;
      }
      
      this.downloadMarkdown(markdownContent, 'ai-assistant-all-history.md');
      // Show success message briefly
      this.showTemporaryMessage(i18n.t('exportSuccess'));
      
    } catch (error) {
      console.error('Export error:', error);
      alert(i18n.t('exportError'));
    }
  }

  // Export current AI provider's history as Markdown
  exportCurrentHistory() {
    try {
      if (!this.activeProvider) {
        alert(i18n.t('noHistoryToExport'));
        return;
      }
      
      const history = this.chatHistories[this.activeProvider];
      if (!history || history.length === 0) {
        alert(i18n.t('noHistoryToExport'));
        return;
      }
      
      const providerNames = {
        'vertex-ai': 'Vertex AI',
        'openai-compatible': 'OpenAI Compatible',
        'chatgpt': 'ChatGPT',
        'aws-bedrock': 'AWS Bedrock'
      };
      
      const providerName = providerNames[this.activeProvider];
      let markdownContent = `# ${providerName} Chat History\n\n`;
      markdownContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
      
      history.forEach(message => {
        const timestamp = new Date(message.timestamp).toLocaleString();
        if (message.type === 'user') {
          markdownContent += `**User** (${timestamp}):\n${message.content}\n\n`;
        } else if (message.type === 'ai') {
          markdownContent += `**${message.providerName || providerName}** (${timestamp}):\n${message.content}\n\n`;
        }
      });
      
      const filename = `ai-assistant-${this.activeProvider}-history.md`;
      this.downloadMarkdown(markdownContent, filename);
      // Show success message briefly
      this.showTemporaryMessage(i18n.t('exportSuccess'));
      
    } catch (error) {
      console.error('Export error:', error);
      alert(i18n.t('exportError'));
    }
  }

  // Download content as Markdown file
  downloadMarkdown(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Show temporary success message
  showTemporaryMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'temporary-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 10px 20px;
      border-radius: 5px;
      z-index: 1000;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }

  // Show clear logs dialog
  showClearLogsDialog() {
    const options = [
      {
        text: i18n.t('clearCurrentLogs'),
        action: () => this.clearCurrentLogs()
      },
      {
        text: i18n.t('clearAllLogs'),
        action: () => this.clearAllLogs()
      }
    ];
    
    this.showCustomDialog(i18n.t('clearLogsOptions'), options);
  }

  // Show custom dialog with options
  showCustomDialog(message, options) {
    // Create dialog overlay
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    // Create dialog content
    const dialog = document.createElement('div');
    dialog.className = 'dialog-content';
    dialog.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      min-width: 300px;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    // Message
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
      margin-bottom: 20px;
      font-size: 14px;
      color: #333;
      line-height: 1.4;
    `;
    dialog.appendChild(messageDiv);
    
    // Buttons container
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    `;
    
    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = i18n.t('cancel');
    cancelButton.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #ccc;
      background: #f8f9fa;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    cancelButton.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });
    buttonsDiv.appendChild(cancelButton);
    
    // Action buttons
    options.forEach(option => {
      const button = document.createElement('button');
      button.textContent = option.text;
      button.style.cssText = `
        padding: 8px 16px;
        border: none;
        background: #dc3545;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      `;
      button.addEventListener('click', () => {
        document.body.removeChild(overlay);
        option.action();
      });
      buttonsDiv.appendChild(button);
    });
    
    dialog.appendChild(buttonsDiv);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }

  // Clear current AI provider's logs
  clearCurrentLogs() {
    if (!this.activeProvider) {
      return;
    }
    
    const confirmed = confirm(i18n.t('confirmClearCurrentLogs'));
    if (confirmed) {
      this.chatHistories[this.activeProvider] = [];
      this.saveChatHistories();
      this.clearChatDisplay();
      this.showTemporaryMessage(i18n.t('logsCleared'));
    }
  }

  // Clear all AI providers' logs
  clearAllLogs() {
    const confirmed = confirm(i18n.t('confirmClearAllLogs'));
    if (confirmed) {
      Object.keys(this.chatHistories).forEach(provider => {
        this.chatHistories[provider] = [];
      });
      this.saveChatHistories();
      this.clearChatDisplay();
      this.showTemporaryMessage(i18n.t('logsCleared'));
    }
  }

  // Clear chat display
  clearChatDisplay() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = `
      <div class="welcome-message">
        <p data-i18n="welcomeMessage">${i18n.t('welcomeMessage')}</p>
      </div>
    `;
  }

  async saveCheckboxStates() {
    this.uiSettings.includePageContent = document.getElementById('includePageContent').checked;
    this.uiSettings.includeSelectedText = document.getElementById('includeSelectedText').checked;
    await this.saveUISettings();
  }

  async getPageContent() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        return null;
      }

      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
        if (response && response.success) {
          return response.content;
        }
        throw new Error('Invalid content script response');
      } catch (messageError) {
        // Inject Content Script and retry
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['scripts/content.js']
        });
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 300));
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
        
        if (response && response.success) {
          return response.content;
        }
        return null;
      }
    } catch (error) {
      console.error(i18n.t('errorPageContent'), error);
      return null;
    }
  }


  setupResizeHandler() {
    const resizeHandle = document.getElementById('resizeHandle');
    const inputContainer = document.querySelector('.input-container');
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startY = e.clientY;
      startHeight = parseInt(window.getComputedStyle(inputContainer).height);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      e.preventDefault();
    });

    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const deltaY = startY - e.clientY;
      let newHeight = startHeight + deltaY;
      
      const minHeight = 60;
      const maxHeight = window.innerHeight * 0.5;
      newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      
      inputContainer.style.height = `${newHeight}px`;
      this.uiSettings.inputHeight = newHeight;
    };

    const handleMouseUp = () => {
      isResizing = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      this.saveUISettings();
    };
  }
}

// Vertex AI dedicated class (Service Account + API Key authentication support)
class GeminiAPI {
  constructor(serviceAccount, location, projectId = null, apiKey = null) {
    this.serviceAccount = serviceAccount;
    this.location = location;
    this.projectId = projectId;
    this.apiKey = apiKey;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.authMethod = apiKey ? 'api-key' : 'service-account';
    if (this.authMethod === 'service-account') {
      this.cryptoUtils = new CryptoUtils();
    }
  }

  async generateContent(prompt, model = 'gemini-2.5-pro') {
    const projectId = this.projectId || this.serviceAccount?.project_id;
    
    if (this.authMethod === 'service-account') {
      await this.ensureValidToken();
    }
    
    const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${this.location}/publishers/google/models/${model}:generateContent`;
    
    const requestBody = {
      contents: [{
        role: "user",
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192
      }
    };

    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.authMethod === 'api-key') {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    } else {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vertex AI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Invalid response from Vertex AI API');
    }

    return data.candidates[0].content.parts[0].text;
  }

  async ensureValidToken() {
    if (this.authMethod === 'api-key') {
      return; // Not needed for API Key authentication
    }
    
    const now = Date.now();
    const bufferTime = 60 * 1000; // 1 minute buffer
    
    if (!this.accessToken || !this.tokenExpiry || now >= (this.tokenExpiry - bufferTime)) {
      await this.refreshAccessToken();
    }
  }

  async refreshAccessToken() {
    const jwt = await this.cryptoUtils.createJWT(this.serviceAccount);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Authentication error: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
  }
}

// Application start
const app = new AIAssistant();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIAssistant;
}