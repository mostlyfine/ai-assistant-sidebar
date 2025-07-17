// Multilingual support system
class I18n {
  constructor() {
    this.currentLang = this.detectLanguage();
    this.messages = {
      ja: {
        // App title and basic UI
        appTitle: 'AI Assistant',
        setupTitle: 'AI APIを設定してください',
        
        // Tab names
        tabVertexAI: 'Vertex AI',
        tabOpenAICompatible: 'OpenAI Compatible',
        tabChatGPT: 'ChatGPT',
        tabAWSBedrock: 'AWS Bedrock',
        tabGeneral: '全体設定',
        
        // Vertex AI settings
        vertexAISettings: 'Vertex AI 設定',
        authMethod: '認証方式',
        serviceAccountJSON: 'Service Account JSON',
        apiKey: 'API Key',
        serviceAccountFile: 'Service Account JSON ファイル',
        selectJSONFile: '📁 JSONファイルを選択',
        serviceAccountInfo: 'Service Account 情報',
        projectId: 'Project ID',
        email: 'Email',
        keyId: 'Key ID',
        location: 'Location (リージョン)',
        model: 'モデル',
        
        // OpenAI Compatible settings
        openaiCompatibleSettings: 'OpenAI Compatible 設定',
        preset: 'プリセット',
        endpoint: 'エンドポイント',
        apiVersion: 'API バージョン',
        deploymentName: 'デプロイメント名',
        customModel: 'カスタムモデル',
        
        // ChatGPT settings
        chatGPTSettings: 'ChatGPT API 設定',
        organizationId: 'Organization ID (オプション)',
        
        // AWS Bedrock settings
        awsBedrockSettings: 'AWS Bedrock 設定',
        awsAccessKeyId: 'AWS Access Key ID',
        awsSecretAccessKey: 'AWS Secret Access Key',
        awsSessionToken: 'AWS Session Token (オプション)',
        awsRegion: 'AWS Region',
        
        // General settings
        generalSettings: '全体設定',
        defaultProvider: 'デフォルト AI プロバイダー',
        customInstructions: 'カスタムインストラクション',
        customInstructionsText: 'システムプロンプト',
        customInstructionsHelp: 'すべてのAI APIに適用される共通のシステムプロンプトです。空欄の場合はデフォルトの動作になります。',
        uiSettings: 'UI設定',
        language: '言語',
        fontSize: 'フォントサイズ',
        useShiftEnter: 'Shift+Enterで送信',
        useShiftEnterHelp: 'オフの場合、Enterキーで送信されます',
        enableContextKeep: 'コンテキスト維持',
        enableContextKeepHelp: '有効にすると、過去の会話履歴をAIに送信して文脈を維持します。無効にすると、各メッセージが独立して処理されます。',
        
        // Buttons
        cancel: 'キャンセル',
        saveSettings: '設定を保存',
        settings: '⚙️',
        clearLogs: '🗑️',
        
        // Chat screen
        welcomeMessage: 'AI Assistant sidebarにようこそ！何かお手伝いできることはありますか？',
        includePageContent: '📄 ページ内容を含める',
        includeSelectedText: '📝 選択テキストを含める',
        messageInputPlaceholder: 'メッセージを入力してください...',
        messageInputShiftEnter: 'メッセージを入力してください... (Shift+Enterで送信)',
        messageInputEnter: 'メッセージを入力してください... (Enterで送信)',
        
        // Placeholders
        placeholderGoogleCloudProjectId: 'Google Cloud Project ID',
        placeholderVertexApiKey: 'Vertex AI API Key',
        placeholderOpenAIEndpoint: 'https://api.openai.com/v1',
        placeholderAzureEndpoint: 'https://yourresource.openai.azure.com',
        placeholderOpenAIApiKey: 'API キー',
        placeholderDeploymentName: 'デプロイメント名',
        placeholderCustomModel: 'カスタムモデル名',
        placeholderOrganizationId: 'Organization ID（任意）',
        placeholderAWSAccessKeyId: 'AWS Access Key ID',
        placeholderAWSSecretAccessKey: 'AWS Secret Access Key',
        placeholderAWSSessionToken: 'AWS Session Token（任意）',
        placeholderCustomInstructions: 'あなたは親切で有用なAIアシスタントです。',
        
        // Error messages
        errorLoadingConfig: '設定の読み込みに失敗:',
        errorLoadingUISettings: 'UI設定の読み込みに失敗:',
        errorSavingConfig: '設定の保存に失敗:',
        errorSavingUISettings: 'UI設定の保存に失敗:',
        errorInvalidServiceAccount: '無効なService Account JSONファイルです',
        errorServiceAccountFile: 'Service Account JSONファイルの読み込みに失敗しました:\\n',
        errorSaveSettings: '設定の保存に失敗しました。',
        errorNoAPIConfig: 'AI APIが設定されていません。設定を確認してください。',
        errorAICall: 'AI呼び出しエラー:',
        errorInvalidProvider: '無効なAIプロバイダーです',
        errorVertexAPI: 'Vertex AI API エラー',
        errorVertexAPIInvalidResponse: 'Vertex AI APIからの応答が無効です',
        errorAuthError: '認証エラー:',
        errorPageContent: 'ページ内容取得エラー:',
        errorContentScript: 'Content script応答が無効',
        errorValidatingVertexAI: 'Vertex AI設定の検証エラー',
        errorValidatingOpenAI: 'OpenAI Compatible設定の検証エラー',
        errorValidatingChatGPT: 'ChatGPT設定の検証エラー',
        errorValidatingAWS: 'AWS Bedrock設定の検証エラー',
        
        // Success messages
        saveSettingsSuccess: '設定を保存しました。\\n使用するAI APIを設定してください。',
        
        // Loading
        loadingGenerating: 'が応答を生成中',
        loadingDots: '...',
        
        // Others
        serviceAccountConfigured: 'Service Account設定済み',
        referenceInfo: '--- 参考情報 ---',
        pageTitle: 'ページタイトル:',
        mainHeadings: '主要な見出し:',
        pageContent: 'ページ内容:',
        contentTruncated: '...(内容が長いため一部のみ表示)',
        selectedText: '選択されたテキスト:',
        noSelectedText: '※選択されたテキストが見つかりませんでした',
        pageContentFailed: '※ページ内容の取得に失敗しました（このページでは利用できない可能性があります）',
        
        // Export settings
        exportSettings: 'エクスポート設定',
        exportChatHistory: 'チャット履歴のエクスポート',
        exportAllHistory: '📄 全履歴をエクスポート',
        exportCurrentHistory: '📋 現在のAI履歴をエクスポート',
        exportHelpText: '履歴はMarkdown形式でダウンロードされます',
        exportSuccess: '履歴をエクスポートしました',
        exportError: 'エクスポートに失敗しました',
        noHistoryToExport: 'エクスポートする履歴がありません',
        
        // Confirmation dialogs
        confirmIncompleteSettings: '設定が完了していません。このまま戻りますか？\\n（設定が完了するまでAIチャットは利用できません）',
        confirmClearLogs: 'チャット履歴を削除しますか？',
        confirmClearAllLogs: '全てのAIプロバイダーのチャット履歴を削除しますか？\\n\\nこの操作は取り消せません。',
        confirmClearCurrentLogs: '現在のAIプロバイダーのチャット履歴を削除しますか？\\n\\nこの操作は取り消せません。',
        logsCleared: 'チャット履歴を削除しました',
        clearLogsOptions: 'どの履歴を削除しますか？',
        clearAllLogs: '全ての履歴を削除',
        clearCurrentLogs: '現在のAIの履歴のみ削除'
      },
      
      en: {
        // App title & basic UI
        appTitle: 'AI Assistant',
        setupTitle: 'Please configure AI API',
        
        // Tab names
        tabVertexAI: 'Vertex AI',
        tabOpenAICompatible: 'OpenAI Compatible',
        tabChatGPT: 'ChatGPT',
        tabAWSBedrock: 'AWS Bedrock',
        tabGeneral: 'General Settings',
        
        // Vertex AI settings
        vertexAISettings: 'Vertex AI Settings',
        authMethod: 'Authentication Method',
        serviceAccountJSON: 'Service Account JSON',
        apiKey: 'API Key',
        serviceAccountFile: 'Service Account JSON File',
        selectJSONFile: '📁 Select JSON File',
        serviceAccountInfo: 'Service Account Information',
        projectId: 'Project ID',
        email: 'Email',
        keyId: 'Key ID',
        location: 'Location (Region)',
        model: 'Model',
        
        // OpenAI Compatible settings
        openaiCompatibleSettings: 'OpenAI Compatible Settings',
        preset: 'Preset',
        endpoint: 'Endpoint',
        apiVersion: 'API Version',
        deploymentName: 'Deployment Name',
        customModel: 'Custom Model',
        
        // ChatGPT settings
        chatGPTSettings: 'ChatGPT API Settings',
        organizationId: 'Organization ID (Optional)',
        
        // AWS Bedrock settings
        awsBedrockSettings: 'AWS Bedrock Settings',
        awsAccessKeyId: 'AWS Access Key ID',
        awsSecretAccessKey: 'AWS Secret Access Key',
        awsSessionToken: 'AWS Session Token (Optional)',
        awsRegion: 'AWS Region',
        
        // General settings
        generalSettings: 'General Settings',
        defaultProvider: 'Default AI Provider',
        customInstructions: 'Custom Instructions',
        customInstructionsText: 'System Prompt',
        customInstructionsHelp: 'Common system prompt applied to all AI APIs. Default behavior if left empty.',
        uiSettings: 'UI Settings',
        language: 'Language',
        fontSize: 'Font Size',
        useShiftEnter: 'Send with Shift+Enter',
        useShiftEnterHelp: 'When off, Enter key will send messages',
        enableContextKeep: 'Keep Context',
        enableContextKeepHelp: 'When enabled, sends conversation history to AI to maintain context. When disabled, each message is processed independently.',
        
        // Buttons
        cancel: 'Cancel',
        saveSettings: 'Save Settings',
        settings: '⚙️',
        clearLogs: '🗑️',
        
        // Chat screen
        welcomeMessage: 'Welcome to AI Assistant sidebar! How can I help you today?',
        includePageContent: '📄 Include page content',
        includeSelectedText: '📝 Include selected text',
        messageInputPlaceholder: 'Type your message...',
        messageInputShiftEnter: 'Type your message... (Shift+Enter to send)',
        messageInputEnter: 'Type your message... (Enter to send)',
        
        // Placeholders
        placeholderGoogleCloudProjectId: 'Google Cloud Project ID',
        placeholderVertexApiKey: 'Vertex AI API Key',
        placeholderOpenAIEndpoint: 'https://api.openai.com/v1',
        placeholderAzureEndpoint: 'https://yourresource.openai.azure.com',
        placeholderOpenAIApiKey: 'API Key',
        placeholderDeploymentName: 'Deployment Name',
        placeholderCustomModel: 'Custom Model Name',
        placeholderOrganizationId: 'Organization ID (Optional)',
        placeholderAWSAccessKeyId: 'AWS Access Key ID',
        placeholderAWSSecretAccessKey: 'AWS Secret Access Key',
        placeholderAWSSessionToken: 'AWS Session Token (Optional)',
        placeholderCustomInstructions: 'You are a helpful and useful AI assistant.',
        
        // Error messages
        errorLoadingConfig: 'Failed to load config:',
        errorLoadingUISettings: 'Failed to load UI settings:',
        errorSavingConfig: 'Failed to save config:',
        errorSavingUISettings: 'Failed to save UI settings:',
        errorInvalidServiceAccount: 'Invalid Service Account JSON file',
        errorServiceAccountFile: 'Failed to load Service Account JSON file:\\n',
        errorSaveSettings: 'Failed to save settings.',
        errorNoAPIConfig: 'AI API is not configured. Please check your settings.',
        errorAICall: 'AI call error:',
        errorInvalidProvider: 'Invalid AI provider',
        errorVertexAPI: 'Vertex AI API Error',
        errorVertexAPIInvalidResponse: 'Invalid response from Vertex AI API',
        errorAuthError: 'Authentication error:',
        errorPageContent: 'Page content retrieval error:',
        errorContentScript: 'Invalid content script response',
        errorValidatingVertexAI: 'Vertex AI configuration validation error',
        errorValidatingOpenAI: 'OpenAI Compatible configuration validation error',
        errorValidatingChatGPT: 'ChatGPT configuration validation error',
        errorValidatingAWS: 'AWS Bedrock configuration validation error',
        
        // Success messages
        saveSettingsSuccess: 'Settings saved.\\nPlease configure the AI API to use.',
        
        // Loading
        loadingGenerating: 'is generating response',
        loadingDots: '...',
        
        // Others
        serviceAccountConfigured: 'Service Account Configured',
        referenceInfo: '--- Reference Information ---',
        pageTitle: 'Page Title:',
        mainHeadings: 'Main Headings:',
        pageContent: 'Page Content:',
        contentTruncated: '...(Content truncated due to length)',
        selectedText: 'Selected Text:',
        noSelectedText: '※No selected text found',
        pageContentFailed: '※Failed to retrieve page content (may not be available on this page)',
        
        // Export settings
        exportSettings: 'Export Settings',
        exportChatHistory: 'Export Chat History',
        exportAllHistory: '📄 Export All History',
        exportCurrentHistory: '📋 Export Current AI History',
        exportHelpText: 'History will be downloaded in Markdown format',
        exportSuccess: 'History exported successfully',
        exportError: 'Export failed',
        noHistoryToExport: 'No history to export',
        
        // Confirmation dialogs
        confirmIncompleteSettings: 'Settings are incomplete. Do you want to go back anyway?\\n(AI chat will not be available until settings are completed)',
        confirmClearLogs: 'Clear chat history?',
        confirmClearAllLogs: 'Clear all AI providers chat history?\\n\\nThis action cannot be undone.',
        confirmClearCurrentLogs: 'Clear current AI provider chat history?\\n\\nThis action cannot be undone.',
        logsCleared: 'Chat history cleared',
        clearLogsOptions: 'Which history do you want to clear?',
        clearAllLogs: 'Clear all history',
        clearCurrentLogs: 'Clear current AI history only'
      }
    };
  }
  
  detectLanguage() {
    // Get browser language settings
    const browserLang = navigator.language || navigator.userLanguage || 'en';
    
    // Default to 'ja' for Japanese, 'en' for others
    if (browserLang.startsWith('ja')) {
      return 'ja';
    }
    return 'en';
  }
  
  t(key) {
    return this.messages[this.currentLang][key] || this.messages['en'][key] || key;
  }
  
  setLanguage(lang) {
    if (this.messages[lang]) {
      this.currentLang = lang;
    }
  }
  
  getCurrentLanguage() {
    return this.currentLang;
  }
}

// Global instance
const i18n = new I18n();