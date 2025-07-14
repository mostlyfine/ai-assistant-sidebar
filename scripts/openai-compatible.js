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
        ]
      },
      'azure': {
        name: 'Azure OpenAI',
        endpoint: '',
        authHeader: 'api-key',
        authPrefix: '',
        pathTemplate: '/openai/deployments/{deployment}/chat/completions?api-version={apiVersion}',
        models: [],
        requiresDeployment: true,
        requiresApiVersion: true,
        defaultApiVersion: '2024-02-15-preview'
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
        messageFormat: 'anthropic'
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
        ]
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
        ]
      },
      'ollama': {
        name: 'Ollama',
        endpoint: 'http://localhost:11434/v1',
        authHeader: 'Authorization',
        authPrefix: 'Bearer ',
        pathTemplate: '/chat/completions',
        models: [],
        requiresCustomModels: true
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
    
    // For Azure, use deployment name as model
    if (this.preset === 'azure') {
      requestBody.model = this.config.deployment || this.model;
    } else {
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
        throw new Error(`API エラー (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return this.parseResponse(data);

    } catch (error) {
      console.error('OpenAI Compatible API呼び出しエラー:', error);
      throw error;
    }
  }

  static getAvailablePresets() {
    return [
      { id: 'openai', name: 'OpenAI' },
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
      'azure': [], // Use deployment name
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
      'azure': {
        endpoint: '',
        model: '',
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