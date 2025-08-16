class AIAssistant {
  constructor() {
    this.configs = {
      'vertex-ai': null,
      'openai-compatible': null,
      'aws-bedrock': null
    };
    this.uiSettings = {
      fontSize: '12',
      useShiftEnter: true,
      inputHeight: 80,
      defaultProvider: 'vertex-ai',
      openaiCompatiblePreset: 'openai',
      includePageContent: false,
      language: i18n.getCurrentLanguage(),
      customInstructions: '',
      enableContextKeep: true
    };
    this.setupScreen = document.getElementById('setupScreen');
    this.chatScreen = document.getElementById('chatScreen');
    
    this.activeProvider = null;
    this.aiInstances = {};
    
    // Manage chat history for each AI provider
    this.chatHistories = {
      'vertex-ai': [],
      'openai-compatible': [],
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
          await this.migrateChatGPTSettings();
          return;
        }
      }
      
      // 従来の平文ストレージからの移行処理
      const result = await chrome.storage.local.get(['aiConfigs']);
      if (result.aiConfigs) {
        this.configs = { ...this.configs, ...result.aiConfigs };
        
        // ChatGPT設定の移行
        await this.migrateChatGPTSettings();
        
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
      
      // フォールバック: 平文保存
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
      
      // 現在の設定をセキュアストレージに保存
      await window.securityManager.setSecure('aiConfigs', this.configs);
      
      // 古い平文データを削除
      await chrome.storage.local.remove(['aiConfigs']);
      
    } catch (error) {
      console.error('セキュアストレージへの移行に失敗しました:', error);
      throw error;
    }
  }

  /**
   * ChatGPT設定をOpenAI Compatible設定に移行
   */
  async migrateChatGPTSettings() {
    try {
      // ChatGPT設定が存在し、OpenAI Compatible設定が存在しない場合のみ移行
      if (this.configs['chatgpt'] && !this.configs['openai-compatible']) {
        const chatgptConfig = this.configs['chatgpt'];
        
        // ChatGPT設定をOpenAI Compatible設定に変換
        const openaiCompatibleConfig = {
          preset: 'chatgpt',
          endpoint: 'https://api.openai.com/v1',
          apiKey: chatgptConfig.apiKey,
          model: chatgptConfig.model || 'gpt-4o',
          organization: chatgptConfig.organization || null,
          apiVersion: null,
          deployment: null
        };
        
        this.configs['openai-compatible'] = openaiCompatibleConfig;
        
        // デフォルトプロバイダーがchatgptの場合、openai-compatibleに変更
        if (this.uiSettings.defaultProvider === 'chatgpt') {
          this.uiSettings.defaultProvider = 'openai-compatible';
          await this.saveUISettings();
        }
        
        // 設定を保存
        await this.saveConfigs();
        
      }
      
      // ChatGPT設定を削除
      if (this.configs['chatgpt']) {
        delete this.configs['chatgpt'];
        await this.saveConfigs();
      }
    } catch (error) {
      console.error('ChatGPT設定の移行に失敗しました:', error);
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

  restoreChatHistory() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer || !this.activeProvider) {
      return;
    }

    // チャット画面をクリア
    messagesContainer.innerHTML = '';

    // アクティブプロバイダーの履歴を取得
    const history = this.chatHistories[this.activeProvider] || [];

    // 履歴からメッセージを復元
    history.forEach(messageData => {
      this.displayHistoryMessage(messageData);
    });

    // 最新メッセージまでスクロール
    this.scrollToBottom();
  }

  displayHistoryMessage(messageData) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    
    const timestamp = new Date(messageData.timestamp);
    const timeString = timestamp.toLocaleTimeString();

    if (messageData.type === 'user') {
      messageElement.classList.add('message', 'user-message');
      const messageContent = document.createElement('div');
      messageContent.classList.add('message-content');
      
      const messageText = document.createElement('div');
      messageText.classList.add('message-text');
      messageText.textContent = messageData.content;
      
      const messageTime = document.createElement('div');
      messageTime.classList.add('message-time');
      messageTime.textContent = timeString;
      
      messageContent.appendChild(messageText);
      messageContent.appendChild(messageTime);
      messageElement.appendChild(messageContent);
    } else if (messageData.type === 'ai') {
      messageElement.classList.add('message', 'ai-message');
      const messageContent = document.createElement('div');
      messageContent.classList.add('message-content');
      
      const messageText = document.createElement('div');
      messageText.classList.add('message-text');
      
      // Markdownを処理してHTMLに変換
      if (window.marked) {
        messageText.innerHTML = DOMPurify.sanitize(window.marked.parse(messageData.content));
      } else {
        messageText.textContent = messageData.content;
      }
      
      const messageTime = document.createElement('div');
      messageTime.classList.add('message-time');
      
      // プロバイダー情報を表示
      const providerData = {
        'vertex-ai': { name: 'Vertex AI', icon: 'icons/vertex.png' },
        'openai-compatible': { name: 'OpenAI Compatible', icon: 'icons/openai.png' },
        'aws-bedrock': { name: 'AWS Bedrock', icon: 'icons/bedrock.png' }
      };
      
      const provider = providerData[messageData.provider];
      if (provider) {
        const providerImg = document.createElement('img');
        providerImg.src = provider.icon;
        providerImg.alt = provider.name;
        providerImg.classList.add('provider-icon');
        messageTime.appendChild(providerImg);
        messageTime.appendChild(document.createTextNode(`${provider.name} • ${timeString}`));
      } else {
        messageTime.textContent = timeString;
      }
      
      messageContent.appendChild(messageText);
      messageContent.appendChild(messageTime);
      messageElement.appendChild(messageContent);
    }

    messagesContainer.appendChild(messageElement);
  }

  scrollToBottom() {
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  switchActiveProvider(newProvider) {
    // プロバイダーが変更された場合のみ処理
    if (this.activeProvider !== newProvider) {
      this.activeProvider = newProvider;
      this.updateChatTitle();
      
      // チャット画面が表示されている場合、履歴を再表示
      if (!this.chatScreen.classList.contains('hidden')) {
        this.restoreChatHistory();
      }
    }
  }

  buildConversationContext(provider) {
    // コンテキスト維持が無効の場合は空の配列を返す
    if (!this.uiSettings.enableContextKeep) {
      return [];
    }
    
    const history = this.chatHistories[provider] || [];
    const messages = [];

    // 履歴からメッセージを構築
    history.forEach(messageData => {
      if (messageData.type === 'user') {
        messages.push({
          role: 'user',
          content: messageData.content
        });
      } else if (messageData.type === 'ai') {
        messages.push({
          role: 'assistant',
          content: messageData.content
        });
      }
    });

    return messages;
  }

  calculateTokens(text) {
    // 簡易的なトークン数計算（1トークン ≈ 4文字として概算）
    // より正確な計算には専用ライブラリが必要
    return Math.ceil(text.length / 4);
  }

  trimContextByTokens(messages, maxTokens = 4000) {
    // カスタムインストラクション分のトークンを予約
    const reservedTokens = 500;
    const availableTokens = maxTokens - reservedTokens;
    
    let totalTokens = 0;
    const trimmedMessages = [];

    // 最新のメッセージから逆順で追加
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = this.calculateTokens(message.content);
      
      if (totalTokens + messageTokens <= availableTokens) {
        trimmedMessages.unshift(message);
        totalTokens += messageTokens;
      } else {
        break;
      }
    }

    return trimmedMessages;
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
        // For buttons with icons, preserve the icon and update text
        if (element.tagName === 'BUTTON' && element.querySelector('img')) {
          const img = element.querySelector('img');
          const imgClone = img.cloneNode(true);
          element.textContent = text;
          element.insertBefore(imgClone, element.firstChild);
        } else {
          element.textContent = text;
        }
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

    // Set title for elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      const text = i18n.t(key);
      if (text) {
        element.title = text;
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
    
    // Get preset configuration to check if endpoint is fixed
    const presetConfig = new OpenAICompatibleAPI({ preset }).getPresetConfig();
    const hasFixedEndpoint = presetConfig.fixedEndpoint;
    
    // Show/hide endpoint input based on preset
    const endpointGroup = document.getElementById('openaiEndpoint').parentElement;
    endpointGroup.style.display = hasFixedEndpoint ? 'none' : 'block';
    
    // Set endpoint only if current value is empty
    const endpointInput = document.getElementById('openaiEndpoint');
    if (!endpointInput.value) {
      endpointInput.value = defaults.endpoint;
    }
    
    // Set appropriate placeholder based on preset
    if (preset === 'azure') {
      endpointInput.placeholder = i18n.t('placeholderAzureEndpoint');
    } else {
      endpointInput.placeholder = i18n.t('placeholderOpenAIEndpoint');
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
    
    // Show/hide organization input for ChatGPT
    const organizationInput = document.getElementById('organizationInput');
    organizationInput.style.display = preset === 'chatgpt' ? 'block' : 'none';
    
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
      if (button) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Get tab name from the clicked element or its parent
          let tabName = e.target.dataset.tab;
          if (!tabName && e.target.parentElement) {
            tabName = e.target.parentElement.dataset.tab;
          }
          if (!tabName && e.target.closest('.tab-button')) {
            tabName = e.target.closest('.tab-button').dataset.tab;
          }
          
          if (tabName) {
            this.switchTab(tabName);
          }
        });
      }
    });

    // Vertex AI authentication method switching
    document.querySelectorAll('input[name="vertexAuthMethod"]').forEach(radio => {
      if (radio) {
        radio.addEventListener('change', (e) => {
          this.switchVertexAuthMethod(e.target.value);
        });
      }
    });

    // Vertex AI settings
    const selectFileButton = document.getElementById('selectFileButton');
    if (selectFileButton) {
      selectFileButton.addEventListener('click', () => {
        const serviceAccountFile = document.getElementById('serviceAccountFile');
        if (serviceAccountFile) {
          serviceAccountFile.click();
        }
      });
    }

    const serviceAccountFile = document.getElementById('serviceAccountFile');
    if (serviceAccountFile) {
      serviceAccountFile.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
          await this.handleServiceAccountFile(file);
        }
      });
    }

    // Settings save button
    const saveConfig = document.getElementById('saveConfig');
    if (saveConfig) {
      saveConfig.addEventListener('click', async () => {
        await this.saveAllConfigs();
      });
    }

    // Cancel button
    const cancelConfig = document.getElementById('cancelConfig');
    if (cancelConfig) {
      cancelConfig.addEventListener('click', () => {
        this.cancelSettings();
      });
    }

    // Settings button
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
      settingsButton.addEventListener('click', () => {
        this.showSetupScreen();
      });
    }

    // Message sending
    const sendButton = document.getElementById('sendButton');
    if (sendButton) {
      sendButton.addEventListener('click', () => this.sendMessage());
    }
    
    // Save checkbox states
    const includePageContent = document.getElementById('includePageContent');
    if (includePageContent) {
      includePageContent.addEventListener('change', () => {
        this.saveCheckboxStates();
      });
    }

    
    // Language selection
    const language = document.getElementById('language');
    if (language) {
      language.addEventListener('change', (e) => {
        this.changeLanguage(e.target.value);
      });
    }
    
    // OpenAI Compatible preset selection
    const openaiPreset = document.getElementById('openaiPreset');
    if (openaiPreset) {
      openaiPreset.addEventListener('change', (e) => {
        this.updateOpenAICompatibleUI(e.target.value);
      });
    }
    
    // Default provider selection
    const defaultProvider = document.getElementById('defaultProvider');
    if (defaultProvider) {
      defaultProvider.addEventListener('change', (e) => {
        this.toggleOpenAICompatiblePresetUI();
        this.switchActiveProvider(e.target.value);
      });
    }
    
    // Export buttons
    const exportAllHistory = document.getElementById('exportAllHistory');
    if (exportAllHistory) {
      exportAllHistory.addEventListener('click', () => {
        this.exportAllHistory();
      });
    }
    
    const exportCurrentHistory = document.getElementById('exportCurrentHistory');
    if (exportCurrentHistory) {
      exportCurrentHistory.addEventListener('click', () => {
        this.exportCurrentHistory();
      });
    }
    
    // Clear logs button
    const clearLogsButton = document.getElementById('clearLogsButton');
    if (clearLogsButton) {
      clearLogsButton.addEventListener('click', () => {
        this.showClearLogsDialog();
      });
    }
    
    // Keyboard events are set dynamically
    this.setupKeyboardEvents();
  }

  switchTab(tabName) {
    if (!tabName) {
      return;
    }
    
    // Update tab button states
    const tabButtons = document.querySelectorAll('.tab-button');
    if (tabButtons.length === 0) {
      return;
    }
    
    tabButtons.forEach(btn => {
      if (btn && btn.classList) {
        btn.classList.remove('active');
      }
    });
    
    const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabButton && tabButton.classList) {
      tabButton.classList.add('active');
    }
    
    // Switch tab content display
    const tabContents = document.querySelectorAll('.tab-content');
    if (tabContents.length === 0) {
      return;
    }
    
    tabContents.forEach(content => {
      if (content && content.classList) {
        content.classList.remove('active');
      }
    });
    
    const tabContent = document.getElementById(`${tabName}-tab`);
    if (tabContent && tabContent.classList) {
      tabContent.classList.add('active');
    }
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
    const organizationId = document.getElementById('organizationId').value;

    // OpenAI Compatible settings validation (only if any field is filled)
    let openaiConfigValid = false;
    const hasOpenaiConfig = openaiEndpoint || openaiApiKey || azureDeployment || customModel;
    
    if (hasOpenaiConfig) {
      if (openaiPreset === 'azure') {
        // Azure validation: endpoint, API key, and deployment name required
        openaiConfigValid = openaiEndpoint && openaiApiKey && azureDeployment;
        if (!openaiConfigValid) {
          if (!openaiEndpoint) {
            alert('Azure OpenAI: エンドポイントURL（例：https://yourresource.openai.azure.com）を入力してください。');
            return;
          }
          if (!openaiApiKey) {
            alert('Azure OpenAI: APIキーを入力してください。');
            return;
          }
          if (!azureDeployment) {
            alert('Azure OpenAI: デプロイメント名を入力してください。');
            return;
          }
        }
      } else {
        // Other provider validation: endpoint and API key required
        openaiConfigValid = openaiEndpoint && openaiApiKey;
        if (!openaiConfigValid) {
          if (!openaiEndpoint) {
            alert('OpenAI Compatible: エンドポイントURLを入力してください。');
            return;
          }
          if (!openaiApiKey) {
            alert('OpenAI Compatible: APIキーを入力してください。');
            return;
          }
        }
      }
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
        deployment: azureDeployment,
        organization: organizationId || null
      };
      
      // Validate OpenAI Compatible config
      try {
        this.validateConfig('openai-compatible', openaiConfig);
        this.configs['openai-compatible'] = openaiConfig;
      } catch (error) {
        alert(i18n.t('errorValidatingOpenAI') + ': ' + error.message);
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
      openaiCompatiblePreset: document.getElementById('openaiCompatiblePreset').value,
      inputHeight: this.uiSettings.inputHeight,
      includePageContent: document.getElementById('includePageContent').checked,
      language: document.getElementById('language').value,
      customInstructions: document.getElementById('customInstructionsText').value,
      enableContextKeep: document.getElementById('enableContextKeep').checked
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
      case 'aws-bedrock':
        return config && config.accessKeyId && config.secretAccessKey && config.region;
      default:
        return false;
    }
  }

  updateChatTitle() {
    const titleData = {
      'vertex-ai': { name: 'Vertex AI', icon: 'icons/vertex.png' },
      'openai-compatible': { name: 'OpenAI Compatible', icon: 'icons/openai.png' },
      'aws-bedrock': { name: 'AWS Bedrock', icon: 'icons/bedrock.png' }
    };
    const data = titleData[this.activeProvider];
    const chatTitle = document.getElementById('chatTitle');
    if (data) {
      chatTitle.innerHTML = `<img src="${data.icon}" alt="${data.name}" class="chat-title-icon"> ${data.name}`;
    } else {
      chatTitle.textContent = 'AI Assistant';
    }
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
      // Initialize first tab to ensure proper display
      this.initializeDefaultTab();
    }
  }

  initializeDefaultTab() {
    // Ensure at least one tab is active when showing setup screen
    const activeTab = document.querySelector('.tab-button.active');
    if (!activeTab) {
      const firstTab = document.querySelector('.tab-button');
      if (firstTab && firstTab.dataset.tab) {
        this.switchTab(firstTab.dataset.tab);
      }
    }
    
    // Ensure corresponding tab content is visible
    const activeContent = document.querySelector('.tab-content.active');
    if (!activeContent) {
      const activeTabButton = document.querySelector('.tab-button.active');
      if (activeTabButton && activeTabButton.dataset.tab) {
        this.switchTab(activeTabButton.dataset.tab);
      }
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
      document.getElementById('organizationId').value = config.organization || '';
      
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


    // Restore AWS Bedrock settings
    if (this.configs['aws-bedrock']) {
      const config = this.configs['aws-bedrock'];
      document.getElementById('awsAccessKeyId').value = config.accessKeyId || '';
      document.getElementById('awsSecretAccessKey').value = config.secretAccessKey || '';
      document.getElementById('awsSessionToken').value = config.sessionToken || '';
      document.getElementById('awsRegion').value = config.region || 'us-east-1';
      document.getElementById('awsBedrockModel').value = config.model || 'us.anthropic.claude-sonnet-4-20250514-v1:0';
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
    document.getElementById('openaiCompatiblePreset').value = this.uiSettings.openaiCompatiblePreset || 'openai';
    document.getElementById('language').value = this.uiSettings.language;
    document.getElementById('customInstructionsText').value = this.uiSettings.customInstructions || '';
    document.getElementById('enableContextKeep').checked = this.uiSettings.enableContextKeep;
    
    // Show/hide OpenAI Compatible preset selection
    this.toggleOpenAICompatiblePresetUI();
    
    // Restore checkbox states
    document.getElementById('includePageContent').checked = this.uiSettings.includePageContent;
  }

  showSetupScreen() {
    if (this.setupScreen) {
      this.setupScreen.classList.remove('hidden');
    }
    if (this.chatScreen) {
      this.chatScreen.classList.add('hidden');
    }
  }

  showChatScreen() {
    if (this.setupScreen) {
      this.setupScreen.classList.add('hidden');
    }
    if (this.chatScreen) {
      this.chatScreen.classList.remove('hidden');
      this.restoreChatHistory();
    }
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

  toggleOpenAICompatiblePresetUI() {
    const defaultProvider = document.getElementById('defaultProvider').value;
    const presetGroup = document.getElementById('openaiCompatiblePresetGroup');
    
    if (presetGroup) {
      presetGroup.style.display = defaultProvider === 'openai-compatible' ? 'block' : 'none';
    }
  }

  setupKeyboardEvents() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) {
      return;
    }
    
    // Remove existing event listeners before adding
    messageInput.removeEventListener('keydown', this.keydownHandler);
    messageInput.removeEventListener('compositionstart', this.compositionStartHandler);
    messageInput.removeEventListener('compositionend', this.compositionEndHandler);
    
    // Track IME composition state
    this.isComposing = false;
    
    this.compositionStartHandler = () => {
      this.isComposing = true;
    };
    
    this.compositionEndHandler = () => {
      this.isComposing = false;
    };
    
    this.keydownHandler = (event) => {
      // Don't send message if IME is composing
      if (this.isComposing) {
        return;
      }
      
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

    // Add content if page content is enabled
    const includePageContent = document.getElementById('includePageContent').checked;
    
    let fullMessage = message;
    
    if (includePageContent) {
      const pageContent = await this.getPageContent();
      if (pageContent === 'PERMISSION_ERROR') {
        return; // Stop processing if permission error occurred
      }
      if (pageContent) {
        fullMessage += '\n\n--- Reference Information ---\n';
        fullMessage += `\nPage title: ${pageContent.title}\n`;
        fullMessage += `URL: ${pageContent.url}\n`;
        
        if (pageContent.metadata.headings && pageContent.metadata.headings.length > 0) {
          fullMessage += `\nMain headings:\n`;
          pageContent.metadata.headings.forEach(h => {
            fullMessage += `${h.level.toUpperCase()}: ${h.text}\n`;
          });
        }
        
        // Smart selection: if there's selected text, use it; otherwise use page content
        if (pageContent.hasSelection && pageContent.selectedText) {
          fullMessage += `\n選択テキスト:\n"${pageContent.selectedText}"\n`;
        } else {
          fullMessage += `\nページ内容:\n${pageContent.text.substring(0, 8000)}`;
          if (pageContent.text.length > 8000) {
            fullMessage += `\n...(Content truncated due to length)`;
          }
        }
      } else {
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
    
    // 会話履歴を取得（コンテキスト維持設定を考慮）
    const conversationHistory = this.buildConversationContext('vertex-ai');
    const trimmedHistory = this.trimContextByTokens(conversationHistory);

    // Vertex AIの場合、会話履歴を文字列として結合
    let contextString = '';
    if (this.uiSettings.enableContextKeep && trimmedHistory.length > 0) {
      contextString = trimmedHistory.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n\n') + '\n\n';
    }

    // カスタムインストラクションと履歴、新しいメッセージを結合
    let finalMessage = '';
    if (customInstructions) {
      finalMessage += `${customInstructions}\n\n`;
    }
    if (contextString) {
      finalMessage += `Previous conversation:\n${contextString}`;
    }
    finalMessage += `User: ${message}`;
    
    return await this.aiInstances['vertex-ai'].generateContent(finalMessage, config.model);
  }

  async callOpenAICompatible(message, config, customInstructions) {
    if (!this.aiInstances['openai-compatible']) {
      // デフォルトプロバイダーでOpenAI Compatibleを使用する場合、プリセット設定を適用
      const activeConfig = this.getActiveOpenAICompatibleConfig(config);
      this.aiInstances['openai-compatible'] = new OpenAICompatibleAPI(activeConfig);
    }
    
    // 会話履歴を取得してOpenAI形式のメッセージ配列を作成
    const conversationHistory = this.buildConversationContext('openai-compatible');
    const trimmedHistory = this.trimContextByTokens(conversationHistory);
    
    // 新しいメッセージを追加
    const messages = [...trimmedHistory, { role: 'user', content: message }];
    
    return await this.aiInstances['openai-compatible'].sendMessageWithHistory(messages, customInstructions);
  }

  getActiveOpenAICompatibleConfig(config) {
    // デフォルトプロバイダーでOpenAI Compatibleを使用する場合、プリセット設定を適用
    if (this.activeProvider === this.uiSettings.defaultProvider && this.uiSettings.defaultProvider === 'openai-compatible') {
      const selectedPreset = this.uiSettings.openaiCompatiblePreset || 'openai';
      const presetDefaults = OpenAICompatibleAPI.getPresetDefaults(selectedPreset);
      
      // プリセット設定を適用してconfigをマージ
      // ただし、Azure OpenAI等でエンドポイントが必要な場合は、保存された設定を優先
      return {
        ...config,
        preset: selectedPreset,
        endpoint: config.endpoint || presetDefaults.endpoint,
        model: config.model || presetDefaults.model
      };
    }
    
    // 通常のOpenAI Compatible設定タブから使用する場合は、元の設定をそのまま使用
    return config;
  }

  async callAWSBedrock(message, config, customInstructions) {
    if (!this.aiInstances['aws-bedrock']) {
      this.aiInstances['aws-bedrock'] = new AWSBedrockAPI(config);
    }
    
    // 会話履歴を取得してClaude形式のメッセージ配列を作成
    const conversationHistory = this.buildConversationContext('aws-bedrock');
    const trimmedHistory = this.trimContextByTokens(conversationHistory);
    
    // 新しいメッセージを追加
    const messages = [...trimmedHistory, { role: 'user', content: message }];
    
    const options = { messages };
    if (customInstructions) {
      options.systemPrompt = customInstructions;
    }
    
    return await this.aiInstances['aws-bedrock'].callAPIWithHistory(messages, options);
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

  // Markdown parsing method using marked library directly
  parseMarkdown(text) {
    if (!text || typeof text !== 'string') return '';
    
    // markedライブラリを使用してMarkdownをHTMLに変換
    if (typeof marked !== 'undefined' && (marked.parse || marked.marked)) {
      try {
        // markedの設定
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
        
        // レンダラーをカスタマイズ
        let renderer = null;
        if (marked.Renderer) {
          renderer = new marked.Renderer();
          
          // リンクを新しいタブで開く
          renderer.link = function(href, title, text) {
            const titleAttr = title ? ` title="${title}"` : '';
            return `<a href="${href}" target="_blank"${titleAttr}>${text}</a>`;
          };
          
          // チェックボックスをdisabledにする
          renderer.checkbox = function(checked) {
            return `<input type="checkbox" disabled${checked ? ' checked' : ''}> `;
          };
          
          // コードブロックの言語クラスを追加
          renderer.code = function(code, lang) {
            const language = lang || '';
            
            // 型チェックとデータ変換
            let codeContent = '';
            if (typeof code === 'string') {
              codeContent = code;
            } else if (code != null && typeof code === 'object') {
              // オブジェクトの場合、textプロパティがあれば優先的に使用
              if (code.text && typeof code.text === 'string') {
                codeContent = code.text;
              } else if (code.raw && typeof code.raw === 'string') {
                // rawプロパティがあれば次に使用（マークダウン記法を除去）
                codeContent = code.raw.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
              } else {
                // その他の場合はJSONとして整形
                codeContent = JSON.stringify(code, null, 2);
              }
            } else if (code != null) {
              // その他の型の場合は文字列に変換
              codeContent = String(code);
            } else {
              // null/undefinedの場合は空文字列
              codeContent = '';
            }
            
            // HTMLエスケープ処理（XSS対策）
            codeContent = codeContent
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#x27;');
            
            return `<pre><code class="language-${language}">${codeContent}</code></pre>`;
          };
        }
        
        // markedを実行 (parse または marked 関数を使用)
        const parseFunction = marked.parse || marked.marked || marked;
        const options = renderer ? { renderer: renderer } : {};
        const result = parseFunction(text, options);
        
        // DOMPurifyを使用してHTMLをサニタイズ
        if (typeof DOMPurify !== 'undefined') {
          return DOMPurify.sanitize(result, {
            ALLOWED_TAGS: [
              'p', 'br', 'strong', 'em', 'u', 'code', 'pre', 'span',
              'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
              'ul', 'ol', 'li', 'dl', 'dt', 'dd',
              'a', 'blockquote', 'hr',
              'table', 'thead', 'tbody', 'tr', 'th', 'td',
              'input', 'del', 'ins'
            ],
            ALLOWED_ATTR: [
              'href', 'target', 'class', 'type', 'checked', 'disabled',
              'title', 'alt', 'rel'
            ],
            ALLOW_DATA_ATTR: false,
            FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
            FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
            ADD_ATTR: ['target'],
            ADD_TAGS: []
          });
        } else {
          // DOMPurifyが利用できない場合は、markedの結果をそのまま使用
          return result;
        }
      } catch (error) {
        // エラーの場合はフォールバック処理
        return this.fallbackParseMarkdown(text);
      }
    } else {
      // markedが利用できない場合はフォールバック処理
      return this.fallbackParseMarkdown(text);
    }
  }

  // フォールバック: 基本的なHTMLエスケープのみ
  fallbackParseMarkdown(text) {
    if (!text || typeof text !== 'string') return '';
    
    // HTMLエスケープ
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    
    // 改行を<br>に変換
    return escaped.replace(/\n/g, '<br>');
  }

  addAIMessage(message) {
    const timestamp = new Date();
    const timeString = timestamp.toLocaleTimeString();
    
    // Get AI provider data
    const providerData = {
      'vertex-ai': { name: 'Vertex AI', icon: 'icons/vertex.png' },
      'openai-compatible': { name: 'OpenAI Compatible', icon: 'icons/openai.png' },
      'aws-bedrock': { name: 'AWS Bedrock', icon: 'icons/bedrock.png' }
    };
    const provider = providerData[this.activeProvider];
    const providerName = provider ? provider.name : 'AI';
    const providerIcon = provider ? provider.icon : '';
    
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
    
    const formattedContent = this.parseMarkdown(message);
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.innerHTML = formattedContent;
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    
    if (providerIcon) {
      const providerImg = document.createElement('img');
      providerImg.src = providerIcon;
      providerImg.alt = providerName;
      providerImg.className = 'message-provider-icon';
      messageTime.appendChild(providerImg);
    }
    
    messageTime.appendChild(document.createTextNode(`${providerName} • ${timeString}`));
    
    messageContent.appendChild(messageText);
    messageContent.appendChild(messageTime);
    messageElement.appendChild(messageContent);
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
    
    const providerData = {
      'vertex-ai': { name: 'Vertex AI', icon: 'icons/vertex.png' },
      'openai-compatible': { name: 'OpenAI Compatible', icon: 'icons/openai.png' },
      'aws-bedrock': { name: 'AWS Bedrock', icon: 'icons/bedrock.png' }
    };
    const provider = providerData[this.activeProvider];
    const providerName = provider ? provider.name : 'AI';
    const providerIcon = provider ? provider.icon : '';
    
    messageElement.innerHTML = `
      <div class="message-content">
        <div class="message-text loading-content">
          <div class="loading-spinner"></div>
          <span>${providerIcon ? `<img src="${providerIcon}" alt="${providerName}" class="message-provider-icon">` : ''}${providerName}${i18n.t('loadingGenerating')}<span class="loading-dots">${i18n.t('loadingDots')}</span></span>
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
      if (sendIcon) sendIcon.classList.add('hidden');
      if (loadingIcon) loadingIcon.classList.remove('hidden');
      if (sendButton) sendButton.disabled = true;
    } else {
      if (sendIcon) sendIcon.classList.remove('hidden');
      if (loadingIcon) loadingIcon.classList.add('hidden');
      if (sendButton) sendButton.disabled = false;
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
      
      // Show user-friendly error message for permission issues
      if (error.message && error.message.includes('Cannot access contents of url')) {
        this.showPermissionError(error.message);
        return 'PERMISSION_ERROR';
      } else if (error.message && error.message.includes('Extension manifest must request permission')) {
        this.showPermissionError(error.message);
        return 'PERMISSION_ERROR';
      }
      
      return null;
    }
  }

  showPermissionError(errorMessage) {
    // Extract URL from error message
    const urlMatch = errorMessage.match(/Cannot access contents of url "(.*?)"/);
    const url = urlMatch ? urlMatch[1] : 'このサイト';
    
    // Use browser native dialog
    const title = i18n.t('permissionErrorTitle') || 'サイトアクセス権限が必要です';
    const message = i18n.t('permissionErrorMessage') || `${url} の内容を読み取るには、Chrome拡張機能の設定でサイトアクセス権限を許可してください。`;
    
    alert(`${title}\n\n${message}`);
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
document.addEventListener('DOMContentLoaded', function() {
  const app = new AIAssistant();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIAssistant;
}