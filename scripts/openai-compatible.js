// OpenAI Compatible API integration class
class OpenAICompatibleAPI {
  constructor(config) {
    this.config = config;
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.preset = config.preset || 'custom';
    
    // Preset settings
    this.presets = {
      'openai': {
        name: 'OpenAI',
        endpoint: 'https://api.openai.com/v1',
        authHeader: 'Authorization',
        authPrefix: 'Bearer ',
        pathTemplate: '/chat/completions',
        models: [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4',
          'gpt-4-turbo',
          'gpt-3.5-turbo'
        ],
        fixedEndpoint: true
      },
      'azure': {
        name: 'Azure OpenAI',
        endpoint: '',
        authHeader: 'api-key',
        authPrefix: '',
        pathTemplate: '/openai/deployments/{deployment}/chat/completions?api-version={apiVersion}',
        models: [
          'gpt-4o',
          'gpt-4o-2024-11-20',
          'gpt-4o-2024-08-06',
          'gpt-4o-2024-05-13',
          'gpt-4o-mini',
          'gpt-4o-mini-2024-07-18',
          'gpt-4',
          'gpt-4-turbo-2024-04-09',
          'gpt-4-0613',
          'gpt-4-0314',
          'gpt-4-32k',
          'gpt-4-32k-0613',
          'gpt-4-32k-0314',
          'gpt-35-turbo',
          'gpt-35-turbo-0125',
          'gpt-35-turbo-1106',
          'gpt-35-turbo-instruct',
          'gpt-35-turbo-instruct-0914'
        ],
        requiresDeployment: true,
        requiresApiVersion: true,
        defaultApiVersion: '2024-02-15-preview',
        fixedEndpoint: false
      },
      'anthropic': {
        name: 'Anthropic Claude',
        endpoint: 'https://api.anthropic.com/v1',
        authHeader: 'x-api-key',
        authPrefix: '',
        pathTemplate: '/messages',
        models: [
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ],
        messageFormat: 'anthropic',
        fixedEndpoint: true
      },
      'groq': {
        name: 'Groq',
        endpoint: 'https://api.groq.com/openai/v1',
        authHeader: 'Authorization',
        authPrefix: 'Bearer ',
        pathTemplate: '/chat/completions',
        models: [
          'llama-3.1-70b-versatile',
          'llama-3.1-8b-instant',
          'mixtral-8x7b-32768',
          'gemma-7b-it'
        ],
        fixedEndpoint: true
      },
      'deepseek': {
        name: 'DeepSeek',
        endpoint: 'https://api.deepseek.com/v1',
        authHeader: 'Authorization',
        authPrefix: 'Bearer ',
        pathTemplate: '/chat/completions',
        models: [
          'deepseek-chat',
          'deepseek-coder'
        ],
        fixedEndpoint: true
      },
      'ollama': {
        name: 'Ollama',
        endpoint: 'http://localhost:11434/v1',
        authHeader: 'Authorization',
        authPrefix: 'Bearer ',
        pathTemplate: '/chat/completions',
        models: [],
        requiresCustomModels: true,
        fixedEndpoint: true
      },
      'chatgpt': {
        name: 'ChatGPT',
        endpoint: 'https://api.openai.com/v1',
        authHeader: 'Authorization',
        authPrefix: 'Bearer ',
        pathTemplate: '/chat/completions',
        models: [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4',
          'gpt-4-turbo',
          'gpt-3.5-turbo'
        ],
        supportsOrganization: true,
        fixedEndpoint: true
      },
      'custom': {
        name: 'Custom OpenAI Compatible',
        endpoint: '',
        authHeader: 'Authorization',
        authPrefix: 'Bearer ',
        pathTemplate: '/chat/completions',
        models: []
      }
    };
  }

  getPresetConfig() {
    return this.presets[this.preset] || this.presets['custom'];
  }

  buildURL() {
    const presetConfig = this.getPresetConfig();
    let path = presetConfig.pathTemplate;
    
    // Path replacement for Azure
    if (this.preset === 'azure') {
      const deployment = this.config.deployment || this.model;
      const apiVersion = this.config.apiVersion || presetConfig.defaultApiVersion;
      
      // Azure requires endpoint URL
      if (!this.endpoint || this.endpoint.trim() === '') {
        throw new Error('Azure OpenAI requires an endpoint URL (e.g., https://yourresource.openai.azure.com)');
      }
      
      // Azure requires deployment name
      if (!deployment) {
        throw new Error('Azure OpenAI requires a deployment name');
      }
      
      path = path.replace('{deployment}', deployment);
      path = path.replace('{apiVersion}', apiVersion);
    }
    
    return `${this.endpoint}${path}`;
  }

  buildHeaders() {
    const presetConfig = this.getPresetConfig();
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey) {
      headers[presetConfig.authHeader] = presetConfig.authPrefix + this.apiKey;
    }
    
    // Additional headers for Anthropic
    if (this.preset === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01';
    }
    
    // Organization header for ChatGPT
    if (this.preset === 'chatgpt' && this.config.organization) {
      headers['OpenAI-Organization'] = this.config.organization;
    }
    
    // Azure OpenAI specific validation
    if (this.preset === 'azure') {
      if (!this.apiKey || this.apiKey.trim() === '') {
        throw new Error('Azure OpenAI requires an API key');
      }
    }
    
    return headers;
  }

  buildRequestBody(message, systemPrompt = null) {
    const presetConfig = this.getPresetConfig();
    
    // Message format for Anthropic
    if (presetConfig.messageFormat === 'anthropic') {
      const messages = [];
      
      // Include system prompt in message if available
      let userMessage = message;
      if (systemPrompt && systemPrompt.trim()) {
        userMessage = `${systemPrompt.trim()}\n\n${message}`;
      }
      
      messages.push({
        role: "user",
        content: userMessage
      });
      
      return {
        model: this.model,
        max_tokens: 4000,
        temperature: 0.7,
        messages: messages
      };
    }
    
    // OpenAI Compatible format
    const messages = [];
    
    // Add system prompt if available
    if (systemPrompt && systemPrompt.trim()) {
      messages.push({
        role: "system",
        content: systemPrompt.trim()
      });
    }
    
    messages.push({
      role: "user",
      content: message
    });
    
    const requestBody = {
      messages: messages,
      max_tokens: 4000,
      temperature: 0.7,
      stream: false
    };
    
    // For Azure, don't include model in request body (specified in URL)
    if (this.preset !== 'azure') {
      requestBody.model = this.model;
    }
    
    return requestBody;
  }

  parseResponse(data) {
    const presetConfig = this.getPresetConfig();
    
    // Response format for Anthropic
    if (presetConfig.messageFormat === 'anthropic') {
      if (data.content && data.content.length > 0) {
        return data.content[0].text;
      }
    }
    
    // OpenAI Compatible format
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }
    
    throw new Error('API応答の形式が無効です');
  }

  async sendMessage(message, systemPrompt = null) {
    try {
      const url = this.buildURL();
      const headers = this.buildHeaders();
      const body = this.buildRequestBody(message, systemPrompt);


      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          url: url,
          preset: this.preset,
          errorText: errorText
        };
        console.error('OpenAI Compatible API Error Details:', errorDetails);
        throw new Error(`API エラー (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return this.parseResponse(data);

    } catch (error) {
      console.error('OpenAI Compatible API呼び出しエラー:', error);
      
      // Network error handling
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        if (this.preset === 'azure') {
          throw new Error(`Azure OpenAI接続エラー: ${this.endpoint}への接続に失敗しました。エンドポイントURL、APIキー、デプロイメント名を確認してください。`);
        } else {
          throw new Error(`ネットワークエラー: APIへの接続に失敗しました。エンドポイントURLと設定を確認してください。`);
        }
      }
      
      // Azure-specific error handling
      if (this.preset === 'azure') {
        if (error.message.includes('deployment')) {
          throw new Error('Azure OpenAI: デプロイメント名が設定されていません。');
        }
        if (error.message.includes('endpoint')) {
          throw new Error('Azure OpenAI: エンドポイントURLが設定されていません。');
        }
      }
      
      throw error;
    }
  }

  static getAvailablePresets() {
    return [
      { id: 'openai', name: 'OpenAI' },
      { id: 'chatgpt', name: 'ChatGPT' },
      { id: 'azure', name: 'Azure OpenAI' },
      { id: 'anthropic', name: 'Anthropic Claude' },
      { id: 'groq', name: 'Groq' },
      { id: 'deepseek', name: 'DeepSeek' },
      { id: 'ollama', name: 'Ollama' },
      { id: 'custom', name: 'Custom' }
    ];
  }

  static getPresetModels(presetId) {
    const presets = {
      'openai': [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4',
        'gpt-4-turbo',
        'gpt-3.5-turbo'
      ],
      'chatgpt': [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4',
        'gpt-4-turbo',
        'gpt-3.5-turbo'
      ],
      'azure': [
        'gpt-4o',
        'gpt-4o-2024-11-20',
        'gpt-4o-2024-08-06',
        'gpt-4o-2024-05-13',
        'gpt-4o-mini',
        'gpt-4o-mini-2024-07-18',
        'gpt-4',
        'gpt-4-turbo-2024-04-09',
        'gpt-4-0613',
        'gpt-4-0314',
        'gpt-4-32k',
        'gpt-4-32k-0613',
        'gpt-4-32k-0314',
        'gpt-35-turbo',
        'gpt-35-turbo-0125',
        'gpt-35-turbo-1106',
        'gpt-35-turbo-instruct',
        'gpt-35-turbo-instruct-0914'
      ],
      'anthropic': [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ],
      'groq': [
        'llama-3.1-70b-versatile',
        'llama-3.1-8b-instant',
        'mixtral-8x7b-32768',
        'gemma-7b-it'
      ],
      'deepseek': [
        'deepseek-chat',
        'deepseek-coder'
      ],
      'ollama': [], // Custom models
      'custom': []
    };
    
    return presets[presetId] || [];
  }

  static getPresetDefaults(presetId) {
    const defaults = {
      'openai': {
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-4o'
      },
      'chatgpt': {
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-4o'
      },
      'azure': {
        endpoint: '',
        model: 'gpt-4o',
        apiVersion: '2024-02-15-preview'
      },
      'anthropic': {
        endpoint: 'https://api.anthropic.com/v1',
        model: 'claude-3-5-sonnet-20241022'
      },
      'groq': {
        endpoint: 'https://api.groq.com/openai/v1',
        model: 'llama-3.1-70b-versatile'
      },
      'deepseek': {
        endpoint: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat'
      },
      'ollama': {
        endpoint: 'http://localhost:11434/v1',
        model: ''
      },
      'custom': {
        endpoint: '',
        model: ''
      }
    };
    
    return defaults[presetId] || defaults['custom'];
  }

  static async testConnection(config) {
    const api = new OpenAICompatibleAPI(config);
    try {
      await api.sendMessage('Hello');
      return true;
    } catch (error) {
      console.error('OpenAI Compatible接続テストエラー:', error);
      return false;
    }
  }
}

// AzureOpenAI class for backward compatibility
class AzureOpenAI {
  constructor(endpoint, apiKey, apiVersion, deploymentName) {
    this.api = new OpenAICompatibleAPI({
      preset: 'azure',
      endpoint: endpoint,
      apiKey: apiKey,
      model: deploymentName,
      apiVersion: apiVersion,
      deployment: deploymentName
    });
  }

  async sendMessage(message) {
    return await this.api.sendMessage(message);
  }

  static async testConnection(endpoint, apiKey, apiVersion, deploymentName) {
    const azure = new AzureOpenAI(endpoint, apiKey, apiVersion, deploymentName);
    try {
      await azure.sendMessage('Hello');
      return true;
    } catch (error) {
      console.error('Azure OpenAI接続テストエラー:', error);
      return false;
    }
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OpenAICompatibleAPI, AzureOpenAI };
}