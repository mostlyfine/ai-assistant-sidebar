class AzureOpenAI {
  constructor(endpoint, apiKey, apiVersion, deploymentName) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.apiVersion = apiVersion;
    this.deploymentName = deploymentName;
  }

  async sendMessage(message) {
    if (!this.endpoint || !this.apiKey || !this.deploymentName) {
      throw new Error('Azure OpenAI設定が不完全です');
    }

    const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;
    
    const requestBody = {
      messages: [
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 4000,
      temperature: 0.7,
      stream: false
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure OpenAI API エラー (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('Azure OpenAI APIからの応答が無効です');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('Azure OpenAI API呼び出しエラー:', error);
      throw error;
    }
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