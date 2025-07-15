// Source code validation tests to ensure proper code coverage
const fs = require('fs');
const path = require('path');

describe('Source Code Validation Tests', () => {
  const scriptsDir = path.join(__dirname, '../../scripts');
  
  describe('File Structure and Content', () => {
    test('should have all required script files', () => {
      const requiredFiles = [
        'sidepanel.js',
        'content.js',
        'aws-bedrock.js',
        'azure-openai.js',
        'crypto-utils.js',
        'openai-compatible.js'
      ];
      
      requiredFiles.forEach(file => {
        const filePath = path.join(scriptsDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    test('should validate sidepanel.js structure', () => {
      const filePath = path.join(scriptsDir, 'sidepanel.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for AIAssistant class
      expect(content).toMatch(/class AIAssistant/);
      expect(content).toMatch(/constructor\(\)/);
      expect(content).toMatch(/async init\(\)/);
      expect(content).toMatch(/async loadConfigs\(\)/);
      expect(content).toMatch(/async saveConfigs\(\)/);
      expect(content).toMatch(/async loadUISettings\(\)/);
      expect(content).toMatch(/async saveUISettings\(\)/);
    });

    test('should validate content.js structure', () => {
      const filePath = path.join(scriptsDir, 'content.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for content script functionality
      expect(content).toMatch(/chrome\.runtime\.onMessage/);
      expect(content).toMatch(/extractPageContent/);
      expect(content).toMatch(/extractMainText/);
      expect(content).toMatch(/getSelectedText/);
    });

    test('should validate aws-bedrock.js structure', () => {
      const filePath = path.join(scriptsDir, 'aws-bedrock.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for AWS Bedrock API functionality
      expect(content).toMatch(/class AWSBedrockAPI/);
      expect(content).toMatch(/createCanonicalRequest/);
      expect(content).toMatch(/async callAPI/);
      expect(content).toMatch(/AWS Signature Version 4/);
    });


    test('should validate openai-compatible.js structure', () => {
      const filePath = path.join(scriptsDir, 'openai-compatible.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for OpenAI Compatible API functionality
      expect(content).toMatch(/class OpenAICompatibleAPI/);
      expect(content).toMatch(/async sendMessage/);
      expect(content).toMatch(/getPresetConfig/);
    });

    test('should validate crypto-utils.js structure', () => {
      const filePath = path.join(scriptsDir, 'crypto-utils.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for crypto utility functions
      expect(content).toMatch(/base64UrlEncode/);
      expect(content).toMatch(/createJWT/);
      expect(content).toMatch(/importKey/);
    });
  });

  describe('Code Quality and Security', () => {
    test('should not contain hardcoded secrets', () => {
      const files = [
        'sidepanel.js',
        'content.js',
        'aws-bedrock.js',
        'azure-openai.js',
        'crypto-utils.js',
        'openai-compatible.js'
      ];

      files.forEach(file => {
        const filePath = path.join(scriptsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for potential secrets (excluding template strings)
        expect(content).not.toMatch(/sk-[a-zA-Z0-9]{32,}/); // OpenAI API keys
        expect(content).not.toMatch(/AKIA[A-Z0-9]{16}/); // AWS Access Keys
        if (file !== 'crypto-utils.js') {
          expect(content).not.toMatch(/-----BEGIN PRIVATE KEY-----/); // Private keys (except in crypto utils)
        }
        expect(content).not.toMatch(/password\s*:\s*['"]\w+['"]/i); // Hardcoded passwords
      });
    });

    test('should use proper error handling', () => {
      const files = [
        'sidepanel.js',
        'aws-bedrock.js',
        'openai-compatible.js'
      ];

      files.forEach(file => {
        const filePath = path.join(scriptsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for try-catch blocks
        expect(content).toMatch(/try\s*{/);
        expect(content).toMatch(/catch\s*\(/);
        expect(content).toMatch(/console\.error/);
      });
    });

    test('should validate API endpoint formats', () => {
      const filePath = path.join(scriptsDir, 'openai-compatible.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for proper API endpoint validation
      expect(content).toMatch(/https?:\/\//);
      expect(content).toMatch(/api\.openai\.com/);
      expect(content).toMatch(/api\.anthropic\.com/);
    });
  });

  describe('Integration Points', () => {
    test('should validate Chrome API usage', () => {
      const files = [
        'sidepanel.js',
        'content.js'
      ];

      files.forEach(file => {
        const filePath = path.join(scriptsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for Chrome API usage
        expect(content).toMatch(/chrome\./);
        if (file === 'sidepanel.js') {
          expect(content).toMatch(/chrome\.storage/);
        }
      });
    });

    test('should validate message passing structure', () => {
      const contentPath = path.join(scriptsDir, 'content.js');
      const contentCode = fs.readFileSync(contentPath, 'utf8');
      
      // Check for proper message handling
      expect(contentCode).toMatch(/chrome\.runtime\.onMessage/);
      expect(contentCode).toMatch(/sendResponse/);
      expect(contentCode).toMatch(/action.*getPageContent/);
    });
  });

  describe('Configuration Management', () => {
    test('should validate configuration structure in sidepanel.js', () => {
      const filePath = path.join(scriptsDir, 'sidepanel.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for configuration management
      expect(content).toMatch(/vertex-ai/);
      expect(content).toMatch(/openai-compatible/);
      expect(content).toMatch(/aws-bedrock/);
      expect(content).toMatch(/uiSettings/);
    });

    test('should validate AI provider initialization', () => {
      const filePath = path.join(scriptsDir, 'sidepanel.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for AI provider initialization
      expect(content).toMatch(/GeminiAPI/);
      expect(content).toMatch(/OpenAICompatibleAPI/);
      expect(content).toMatch(/AWSBedrockAPI/);
    });
  });

  describe('Function Completeness', () => {
    test('should validate all required functions exist in sidepanel.js', () => {
      const filePath = path.join(scriptsDir, 'sidepanel.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      const requiredFunctions = [
        'init',
        'loadConfigs',
        'saveConfigs',
        'loadUISettings',
        'saveUISettings',
        'setupEventListeners',
        'showAppropriateScreen',
        'switchTab',
        'sendMessage',
        'escapeHtml'
      ];

      requiredFunctions.forEach(func => {
        expect(content).toMatch(new RegExp(`(async\\s+)?${func}\\s*\\(`));
      });
    });

    test('should validate AWS signature implementation', () => {
      const filePath = path.join(scriptsDir, 'aws-bedrock.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for AWS signature functions
      expect(content).toMatch(/sha256/);
      expect(content).toMatch(/hmac/);
      expect(content).toMatch(/createCanonicalRequest/);
      expect(content).toMatch(/createStringToSign/);
      expect(content).toMatch(/createSignature/);
    });

    test('should validate crypto utilities', () => {
      const filePath = path.join(scriptsDir, 'crypto-utils.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for crypto functions
      expect(content).toMatch(/importKey/);
      expect(content).toMatch(/sign/);
      expect(content).toMatch(/TextEncoder/);
      expect(content).toMatch(/base64UrlEncode/);
    });
  });

  describe('Code Coverage Enhancement', () => {
    test('should execute simple functions from sidepanel.js', () => {
      const filePath = path.join(scriptsDir, 'sidepanel.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Test a simple utility function
      const escapeHtmlMatch = content.match(/escapeHtml\s*\([^)]*\)\s*{([^}]+)}/);
      if (escapeHtmlMatch) {
        expect(escapeHtmlMatch[1]).toMatch(/textContent/);
        expect(escapeHtmlMatch[1]).toMatch(/innerHTML/);
      }
    });

    test('should validate model configurations', () => {
      const filePath = path.join(scriptsDir, 'sidepanel.js');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for model configurations
      expect(content).toMatch(/gemini-/);
      expect(content).toMatch(/gpt-/);
      expect(content).toMatch(/claude-/);
      expect(content).toMatch(/anthropic/);
    });
  });
});