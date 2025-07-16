// AWS Bedrock API integration class
class AWSBedrockAPI {
  constructor(config) {
    this.config = config;
    this.region = config.region || 'us-east-1';
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.model = config.model || 'anthropic.claude-3-5-sonnet-20240620-v1:0';
    this.sessionToken = config.sessionToken; // Optional (when using STS token)
  }

  // Generate AWS Signature Version 4
  async createSignature(method, url, headers, body, datetime) {
    const canonicalRequest = await this.createCanonicalRequest(method, url, headers, body);
    const stringToSign = await this.createStringToSign(datetime, canonicalRequest);
    const signature = await this.calculateSignature(stringToSign, datetime);
    return signature;
  }

  async createCanonicalRequest(method, url, headers, body) {
    const urlObj = new URL(url);
    // AWS requires proper URL encoding for path
    const canonicalUri = encodeURI(urlObj.pathname).replace(/:/g, '%3A');
    const canonicalQueryString = urlObj.search.substring(1);

    // Normalize headers
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map(key => `${key.toLowerCase()}:${headers[key].trim()}`)
      .join('\n') + '\n';

    const signedHeaders = Object.keys(headers)
      .sort()
      .map(key => key.toLowerCase())
      .join(';');

    const bodyHash = await this.sha256(body);

    return `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${bodyHash}`;
  }

  async createStringToSign(datetime, canonicalRequest) {
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${datetime.substring(0, 8)}/${this.region}/bedrock/aws4_request`;
    const canonicalRequestHash = await this.sha256(canonicalRequest);

    return `${algorithm}\n${datetime}\n${credentialScope}\n${canonicalRequestHash}`;
  }

  async calculateSignature(stringToSign, datetime) {
    const dateKey = await this.hmacSha256(`AWS4${this.secretAccessKey}`, datetime.substring(0, 8));
    const dateRegionKey = await this.hmacSha256(dateKey, this.region);
    const dateRegionServiceKey = await this.hmacSha256(dateRegionKey, 'bedrock');
    const signingKey = await this.hmacSha256(dateRegionServiceKey, 'aws4_request');

    const signatureBytes = await this.hmacSha256(signingKey, stringToSign);

    // Convert Uint8Array to hex string
    return Array.from(signatureBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  sha256(data) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
      .then(hash => Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(''));
  }

  async hmacSha256(key, data) {
    const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key) : key;
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
    return new Uint8Array(signature);
  }

  // Generate ISO 8601 format date/time
  getISODateTime() {
    return new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
  }

  // Call Bedrock API
  async callAPI(prompt, options = {}) {
    try {
      const datetime = this.getISODateTime();
      const url = `https://bedrock-runtime.${this.region}.amazonaws.com/model/${this.model}/invoke`;

      // Create messages
      const messages = [];

      // Add system prompt if available
      if (options.systemPrompt && options.systemPrompt.trim()) {
        messages.push({
          role: "system",
          content: options.systemPrompt.trim()
        });
      }

      messages.push({
        role: "user",
        content: prompt
      });

      // Create request body
      const body = JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.7,
        messages: messages
      });

      // Create headers
      const headers = {
        'Content-Type': 'application/json',
        'Host': `bedrock-runtime.${this.region}.amazonaws.com`,
        'X-Amz-Date': datetime,
        'X-Amz-Target': 'com.amazon.bedrock.runtime.InvokeModel'
      };

      // Add session token if available
      if (this.sessionToken) {
        headers['X-Amz-Security-Token'] = this.sessionToken;
      }

      // Generate signature
      const signature = await this.createSignature('POST', url, headers, body, datetime);

      // Add Authorization header
      const credential = `${this.accessKeyId}/${datetime.substring(0, 8)}/${this.region}/bedrock/aws4_request`;
      const signedHeaders = Object.keys(headers).sort().map(key => key.toLowerCase()).join(';');
      headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

      // Send API request
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bedrock API Error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const result = await response.json();

      // Process Anthropic Claude response format
      if (result.content && result.content.length > 0) {
        return result.content[0].text;
      }

      throw new Error('Invalid response format from Bedrock API');

    } catch (error) {
      console.error('Bedrock API call error:', error);
      throw error;
    }
  }

  // Validate configuration
  validateConfig() {
    const requiredFields = ['accessKeyId', 'secretAccessKey', 'region'];
    const missingFields = requiredFields.filter(field => !this.config[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required Bedrock configuration: ${missingFields.join(', ')}`);
    }

    return true;
  }

  // List of available models (ON_DEMAND v1 models only)
  static getAvailableModels() {
    return [
      // Anthropic Claude models (ON_DEMAND supported)
      {
        id: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        name: 'Claude 3.5 Sonnet v1',
        provider: 'Anthropic'
      },
      {
        id: 'anthropic.claude-3-haiku-20240307-v1:0',
        name: 'Claude 3 Haiku',
        provider: 'Anthropic'
      },
      {
        id: 'anthropic.claude-3-sonnet-20240229-v1:0',
        name: 'Claude 3 Sonnet',
        provider: 'Anthropic'
      },
      {
        id: 'anthropic.claude-3-opus-20240229-v1:0',
        name: 'Claude 3 Opus',
        provider: 'Anthropic'
      },
      // Amazon models (ON_DEMAND supported)
      {
        id: 'amazon.nova-lite-v1:0',
        name: 'Nova Lite',
        provider: 'Amazon'
      },
      {
        id: 'amazon.nova-pro-v1:0',
        name: 'Nova Pro',
        provider: 'Amazon'
      },
      {
        id: 'amazon.nova-micro-v1:0',
        name: 'Nova Micro',
        provider: 'Amazon'
      },
      {
        id: 'amazon.titan-text-premier-v1:0',
        name: 'Titan Text Premier',
        provider: 'Amazon'
      },
      {
        id: 'amazon.titan-text-express-v1',
        name: 'Titan Text Express',
        provider: 'Amazon'
      },
      {
        id: 'amazon.titan-text-lite-v1',
        name: 'Titan Text Lite',
        provider: 'Amazon'
      },
      // Meta Llama models
      {
        id: 'meta.llama3-3-70b-instruct-v1:0',
        name: 'Llama 3.3 70B Instruct',
        provider: 'Meta'
      },
      {
        id: 'meta.llama3-1-405b-instruct-v1:0',
        name: 'Llama 3.1 405B Instruct',
        provider: 'Meta'
      },
      {
        id: 'meta.llama3-1-70b-instruct-v1:0',
        name: 'Llama 3.1 70B Instruct',
        provider: 'Meta'
      },
      {
        id: 'meta.llama3-1-8b-instruct-v1:0',
        name: 'Llama 3.1 8B Instruct',
        provider: 'Meta'
      },
      {
        id: 'meta.llama3-2-90b-instruct-v1:0',
        name: 'Llama 3.2 90B Instruct',
        provider: 'Meta'
      },
      {
        id: 'meta.llama3-2-11b-instruct-v1:0',
        name: 'Llama 3.2 11B Instruct',
        provider: 'Meta'
      },
      {
        id: 'meta.llama3-2-3b-instruct-v1:0',
        name: 'Llama 3.2 3B Instruct',
        provider: 'Meta'
      },
      {
        id: 'meta.llama3-2-1b-instruct-v1:0',
        name: 'Llama 3.2 1B Instruct',
        provider: 'Meta'
      },
      // DeepSeek models
      {
        id: 'deepseek.deepseek-r1-distill-llama-70b-v1:0',
        name: 'DeepSeek R1 Distill 70B',
        provider: 'DeepSeek'
      },
      {
        id: 'deepseek.deepseek-r1-distill-qwen-32b-v1:0',
        name: 'DeepSeek R1 Distill 32B',
        provider: 'DeepSeek'
      },
      {
        id: 'deepseek.deepseek-r1-distill-qwen-14b-v1:0',
        name: 'DeepSeek R1 Distill 14B',
        provider: 'DeepSeek'
      },
      {
        id: 'deepseek.deepseek-r1-distill-qwen-7b-v1:0',
        name: 'DeepSeek R1 Distill 7B',
        provider: 'DeepSeek'
      },
      {
        id: 'deepseek.deepseek-r1-distill-qwen-1-5b-v1:0',
        name: 'DeepSeek R1 Distill 1.5B',
        provider: 'DeepSeek'
      }
    ];
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AWSBedrockAPI;
}
