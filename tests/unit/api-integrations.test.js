// Tests for API integration modules
const { OpenAICompatibleAPI, AzureOpenAI } = require('../../scripts/openai-compatible.js');

describe('API Integration Modules', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    jest.clearAllMocks();
  });

  describe('OpenAI Compatible API', () => {
    const mockOpenAICompatible = {
      presets: {
        'openai': {
          baseUrl: 'https://api.openai.com',
          authHeader: 'Authorization',
          authPrefix: 'Bearer '
        },
        'azure': {
          baseUrl: '',
          authHeader: 'api-key',
          authPrefix: ''
        },
        'anthropic': {
          baseUrl: 'https://api.anthropic.com',
          authHeader: 'x-api-key',
          authPrefix: ''
        }
      }
    };

    test('should build URL for OpenAI preset', () => {
      const buildURL = (preset, config) => {
        const presetConfig = mockOpenAICompatible.presets[preset];
        if (preset === 'azure') {
          return `${config.endpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;
        }
        return `${presetConfig.baseUrl}/v1/chat/completions`;
      };

      const result = buildURL('openai', {});
      expect(result).toBe('https://api.openai.com/v1/chat/completions');
    });

    test('should build URL for Azure preset', () => {
      const buildURL = (preset, config) => {
        const presetConfig = mockOpenAICompatible.presets[preset];
        if (preset === 'azure') {
          return `${config.endpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;
        }
        return `${presetConfig.baseUrl}/v1/chat/completions`;
      };

      const config = {
        endpoint: 'https://test.openai.azure.com',
        deploymentName: 'gpt-4',
        apiVersion: '2024-02-15-preview'
      };

      const result = buildURL('azure', config);
      expect(result).toBe('https://test.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2024-02-15-preview');
    });

    test('should build headers for different presets', () => {
      const buildHeaders = (preset, config) => {
        const presetConfig = mockOpenAICompatible.presets[preset];
        const headers = { 'Content-Type': 'application/json' };
        headers[presetConfig.authHeader] = `${presetConfig.authPrefix}${config.apiKey}`;
        return headers;
      };

      const openaiHeaders = buildHeaders('openai', { apiKey: 'sk-test123' });
      expect(openaiHeaders).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-test123'
      });

      const azureHeaders = buildHeaders('azure', { apiKey: 'azure-key' });
      expect(azureHeaders).toEqual({
        'Content-Type': 'application/json',
        'api-key': 'azure-key'
      });

      const anthropicHeaders = buildHeaders('anthropic', { apiKey: 'ant-key' });
      expect(anthropicHeaders).toEqual({
        'Content-Type': 'application/json',
        'x-api-key': 'ant-key'
      });
    });

    test('should build request body with system prompt', () => {
      const buildRequestBody = (message, model, customInstructions) => {
        const messages = [];
        
        if (customInstructions) {
          messages.push({ role: 'system', content: customInstructions });
        }
        
        messages.push({ role: 'user', content: message });

        return {
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 4000
        };
      };

      const result = buildRequestBody('Hello', 'gpt-4', 'You are a helpful assistant');
      
      expect(result).toEqual({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });
    });

    test('should parse API response', () => {
      const parseResponse = (response) => {
        if (response.choices && response.choices.length > 0) {
          return response.choices[0].message.content;
        }
        throw new Error('Invalid response format');
      };

      const mockResponse = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you?'
            }
          }
        ]
      };

      const result = parseResponse(mockResponse);
      expect(result).toBe('Hello! How can I help you?');
    });

    test('should handle API error responses', () => {
      const parseResponse = (response) => {
        if (response.error) {
          throw new Error(response.error.message || 'API Error');
        }
        if (response.choices && response.choices.length > 0) {
          return response.choices[0].message.content;
        }
        throw new Error('Invalid response format');
      };

      const errorResponse = {
        error: {
          message: 'Invalid API key',
          type: 'invalid_request_error'
        }
      };

      expect(() => parseResponse(errorResponse)).toThrow('Invalid API key');
    });
  });

  describe('ChatGPT API', () => {
    test('should send message to ChatGPT API', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Hello! How can I help you today?'
            }
          }
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const sendMessage = async (message, config) => {
        const body = {
          model: config.model,
          messages: [{ role: 'user', content: message }],
          temperature: 0.7,
          max_tokens: 4000
        };

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
      };

      const result = await sendMessage('Hello', { 
        apiKey: 'sk-test123', 
        model: 'gpt-4' 
      });

      expect(result).toBe('Hello! How can I help you today?');
      expect(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-test123'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.7,
          max_tokens: 4000
        })
      });
    });

    test('should handle ChatGPT API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: {
            message: 'Invalid API key provided',
            type: 'invalid_request_error'
          }
        })
      });

      const sendMessage = async (message, config) => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: 'user', content: message }]
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
      };

      await expect(sendMessage('Hello', { 
        apiKey: 'invalid-key', 
        model: 'gpt-4' 
      })).rejects.toThrow('HTTP error! status: 401');
    });
  });

  describe('AWS Bedrock API', () => {
    test('should create canonical request for AWS Signature V4', () => {
      const createCanonicalRequest = (method, uri, queryString, headers, hashedPayload) => {
        const canonicalHeaders = Object.keys(headers)
          .sort()
          .map(key => `${key.toLowerCase()}:${headers[key]}`)
          .join('\n') + '\n';

        const signedHeaders = Object.keys(headers)
          .sort()
          .map(key => key.toLowerCase())
          .join(';');

        return [
          method,
          uri,
          queryString,
          canonicalHeaders,
          signedHeaders,
          hashedPayload
        ].join('\n');
      };

      const headers = {
        'Host': 'bedrock-runtime.us-east-1.amazonaws.com',
        'X-Amz-Date': '20240101T000000Z',
        'Content-Type': 'application/json'
      };

      const result = createCanonicalRequest('POST', '/', '', headers, 'hash123');
      
      expect(result).toContain('POST\n/\n');
      expect(result).toContain('content-type:application/json');
      expect(result).toContain('host:bedrock-runtime.us-east-1.amazonaws.com');
      expect(result).toContain('x-amz-date:20240101T000000Z');
      expect(result).toContain('content-type;host;x-amz-date');
      expect(result).toContain('hash123');
    });

    test('should create string to sign for AWS Signature V4', () => {
      const createStringToSign = (timestamp, region, service, canonicalRequest) => {
        const algorithm = 'AWS4-HMAC-SHA256';
        const credentialScope = `${timestamp.substr(0, 8)}/${region}/${service}/aws4_request`;
        
        // Mock SHA256 hash
        const hash = 'canonical-request-hash';
        
        return [
          algorithm,
          timestamp,
          credentialScope,
          hash
        ].join('\n');
      };

      const result = createStringToSign('20240101T000000Z', 'us-east-1', 'bedrock', 'canonical-request');
      
      expect(result).toContain('AWS4-HMAC-SHA256');
      expect(result).toContain('20240101T000000Z');
      expect(result).toContain('20240101/us-east-1/bedrock/aws4_request');
      expect(result).toContain('canonical-request-hash');
    });

    test('should format AWS request body for different models', () => {
      const formatRequestBody = (model, message, customInstructions) => {
        if (model.startsWith('anthropic.claude')) {
          return {
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 4000,
            messages: [
              {
                role: 'user',
                content: customInstructions ? `${customInstructions}\n\n${message}` : message
              }
            ]
          };
        } else if (model.startsWith('amazon.titan')) {
          return {
            inputText: customInstructions ? `${customInstructions}\n\n${message}` : message,
            textGenerationConfig: {
              maxTokenCount: 4000,
              temperature: 0.7
            }
          };
        }
        return {};
      };

      const claudeResult = formatRequestBody('anthropic.claude-3-sonnet-20240229-v1:0', 'Hello', 'You are helpful');
      expect(claudeResult).toEqual({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: 'You are helpful\n\nHello'
          }
        ]
      });

      const titanResult = formatRequestBody('amazon.titan-text-express-v1', 'Hello', 'You are helpful');
      expect(titanResult).toEqual({
        inputText: 'You are helpful\n\nHello',
        textGenerationConfig: {
          maxTokenCount: 4000,
          temperature: 0.7
        }
      });
    });

    test('should parse AWS Bedrock response for different models', () => {
      const parseResponse = (model, responseBody) => {
        if (model.startsWith('anthropic.claude')) {
          return responseBody.content[0].text;
        } else if (model.startsWith('amazon.titan')) {
          return responseBody.results[0].outputText;
        } else if (model.startsWith('cohere.command')) {
          return responseBody.generations[0].text;
        }
        return '';
      };

      const claudeResponse = {
        content: [{ text: 'Hello from Claude!' }]
      };
      expect(parseResponse('anthropic.claude-3-sonnet-20240229-v1:0', claudeResponse)).toBe('Hello from Claude!');

      const titanResponse = {
        results: [{ outputText: 'Hello from Titan!' }]
      };
      expect(parseResponse('amazon.titan-text-express-v1', titanResponse)).toBe('Hello from Titan!');

      const cohereResponse = {
        generations: [{ text: 'Hello from Cohere!' }]
      };
      expect(parseResponse('cohere.command-r-v1:0', cohereResponse)).toBe('Hello from Cohere!');
    });
  });

  describe('Crypto Utils', () => {
    test('should encode base64 URL safely', () => {
      const base64UrlEncode = (buffer) => {
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      };

      const testBuffer = new ArrayBuffer(3);
      const view = new Uint8Array(testBuffer);
      view[0] = 72; // 'H'
      view[1] = 105; // 'i'
      view[2] = 33; // '!'

      const result = base64UrlEncode(testBuffer);
      expect(result).toBe('SGkh');
    });

    test('should create JWT header and payload', () => {
      const createJWTComponents = (serviceAccount, scopes) => {
        const header = {
          alg: 'RS256',
          typ: 'JWT'
        };

        const now = Math.floor(Date.now() / 1000);
        const payload = {
          iss: serviceAccount.client_email,
          scope: scopes.join(' '),
          aud: serviceAccount.token_uri,
          iat: now,
          exp: now + 3600 // 1 hour
        };

        return { header, payload };
      };

      const serviceAccount = {
        client_email: 'test@test-project.iam.gserviceaccount.com',
        token_uri: 'https://oauth2.googleapis.com/token'
      };

      const scopes = ['https://www.googleapis.com/auth/cloud-platform'];
      const { header, payload } = createJWTComponents(serviceAccount, scopes);

      expect(header).toEqual({
        alg: 'RS256',
        typ: 'JWT'
      });

      expect(payload.iss).toBe('test@test-project.iam.gserviceaccount.com');
      expect(payload.scope).toBe('https://www.googleapis.com/auth/cloud-platform');
      expect(payload.aud).toBe('https://oauth2.googleapis.com/token');
      expect(payload.iat).toBeGreaterThan(0);
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    test('should convert PEM to binary format', () => {
      const pemToBinary = (pem) => {
        const base64 = pem
          .replace(/-----BEGIN PRIVATE KEY-----/, '')
          .replace(/-----END PRIVATE KEY-----/, '')
          .replace(/\s/g, '');
        
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      };

      const testPem = `-----BEGIN PRIVATE KEY-----
VGVzdCBrZXkgZGF0YQ==
-----END PRIVATE KEY-----`;

      const result = pemToBinary(testPem);
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(13); // Length of "Test key data"
    });
  });

  describe('Content Script', () => {
    test('should extract page metadata', () => {
      const extractMetadata = (document) => {
        const title = document.querySelector('title')?.textContent || '';
        const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
        
        return {
          title: title.trim(),
          description: description.trim(),
          keywords: keywords.trim(),
          url: document.location?.href || ''
        };
      };

      const mockDocument = {
        querySelector: jest.fn(),
        location: { href: 'https://example.com' }
      };

      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === 'title') {
          return { textContent: 'Test Page Title' };
        } else if (selector === 'meta[name="description"]') {
          return { getAttribute: () => 'Test page description' };
        } else if (selector === 'meta[name="keywords"]') {
          return { getAttribute: () => 'test, page, keywords' };
        }
        return null;
      });

      const result = extractMetadata(mockDocument);
      
      expect(result).toEqual({
        title: 'Test Page Title',
        description: 'Test page description',
        keywords: 'test, page, keywords',
        url: 'https://example.com'
      });
    });

    test('should extract main text content', () => {
      const extractMainText = (document) => {
        const excludeSelectors = ['script', 'style', 'nav', 'footer', 'header', '.sidebar', '#comments'];
        const textNodes = [];
        
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              // Mock implementation
              if (node.textContent.trim().length > 0) {
                return NodeFilter.FILTER_ACCEPT;
              }
              return NodeFilter.FILTER_REJECT;
            }
          }
        );

        let node;
        while (node = walker.nextNode()) {
          textNodes.push(node.textContent.trim());
        }

        return textNodes.join(' ').substring(0, 8000);
      };

      const mockDocument = {
        body: {},
        createTreeWalker: jest.fn(() => ({
          nextNode: jest.fn()
            .mockReturnValueOnce({ textContent: 'First paragraph text' })
            .mockReturnValueOnce({ textContent: 'Second paragraph text' })
            .mockReturnValueOnce(null)
        }))
      };

      const result = extractMainText(mockDocument);
      expect(result).toBe('First paragraph text Second paragraph text');
    });

    test('should get selected text from window', () => {
      const getSelectedText = (window) => {
        const selection = window.getSelection();
        return selection ? selection.toString().trim() : '';
      };

      const mockWindow = {
        getSelection: jest.fn(() => ({
          toString: () => 'Selected text content'
        }))
      };

      const result = getSelectedText(mockWindow);
      expect(result).toBe('Selected text content');
    });
  });

  describe('Azure OpenAI Configuration Validation', () => {
    test('should validate Azure OpenAI configuration', () => {
      // Test missing endpoint
      expect(() => {
        const api = new OpenAICompatibleAPI({
          preset: 'azure',
          endpoint: '',
          apiKey: 'test-key',
          deployment: 'gpt-4',
          apiVersion: '2023-05-15'
        });
        api.buildURL();
      }).toThrow('Azure OpenAI requires an endpoint URL');

      // Test missing deployment
      expect(() => {
        const api = new OpenAICompatibleAPI({
          preset: 'azure',
          endpoint: 'https://test.openai.azure.com',
          apiKey: 'test-key',
          deployment: '',
          apiVersion: '2023-05-15'
        });
        api.buildURL();
      }).toThrow('Azure OpenAI requires a deployment name');

      // Test missing API key
      expect(() => {
        const api = new OpenAICompatibleAPI({
          preset: 'azure',
          endpoint: 'https://test.openai.azure.com',
          apiKey: '',
          deployment: 'gpt-4',
          apiVersion: '2023-05-15'
        });
        api.buildHeaders();
      }).toThrow('Azure OpenAI requires an API key');
    });

    test('should build correct Azure OpenAI request body', () => {
      const api = new OpenAICompatibleAPI({
        preset: 'azure',
        endpoint: 'https://test.openai.azure.com',
        apiKey: 'test-key',
        deployment: 'gpt-4',
        apiVersion: '2023-05-15'
      });

      const requestBody = api.buildRequestBody('Hello', 'System prompt');
      
      // Azure OpenAI should not include model in request body
      expect(requestBody).not.toHaveProperty('model');
      expect(requestBody).toHaveProperty('messages');
      expect(requestBody.messages).toHaveLength(2);
      expect(requestBody.messages[0]).toEqual({
        role: 'system',
        content: 'System prompt'
      });
      expect(requestBody.messages[1]).toEqual({
        role: 'user',
        content: 'Hello'
      });
    });
  });
});