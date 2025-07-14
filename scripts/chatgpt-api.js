class ChatGPTAPI {
  constructor(apiKey, model = 'gpt-4o', organization = null) {
    this.apiKey = apiKey;
    this.model = model;
    this.organization = organization;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  async sendMessage(message, systemPrompt = null) {
    if (!this.apiKey) {
      throw new Error('ChatGPT API キーが設定されていません');
    }

    const url = `${this.baseUrl}/chat/completions`;
    
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
      model: this.model,
      messages: messages,
      max_tokens: 4000,
      temperature: 0.7,
      stream: false
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`ChatGPT API エラー (${response.status}): ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('ChatGPT APIからの応答が無効です');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('ChatGPT API呼び出しエラー:', error);
      throw error;
    }
  }

  static async testConnection(apiKey, model = 'gpt-4o', organization = null) {
    const chatgpt = new ChatGPTAPI(apiKey, model, organization);
    try {
      await chatgpt.sendMessage('Hello');
      return true;
    } catch (error) {
      console.error('ChatGPT接続テストエラー:', error);
      return false;
    }
  }

  static getAvailableModels() {
    return [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ];
  }
}