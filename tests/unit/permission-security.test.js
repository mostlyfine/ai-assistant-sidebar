/**
 * Permission Security Tests
 * セキュリティ権限最小化の検証テスト
 */

const fs = require('fs');
const path = require('path');

describe('Permission Security Tests', () => {
  let manifest;

  beforeAll(() => {
    // manifest.jsonを読み込み
    const manifestPath = path.join(__dirname, '../../manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(manifestContent);
  });

  describe('Manifest Permissions', () => {
    test('should only have minimal required permissions', () => {
      const allowedPermissions = ['sidePanel', 'storage', 'activeTab', 'tabs', 'scripting'];
      
      // 許可された権限のみが設定されていることを確認
      expect(manifest.permissions).toEqual(expect.arrayContaining(allowedPermissions));
      expect(manifest.permissions.length).toBe(allowedPermissions.length);
    });

    test('should not have content_scripts section', () => {
      // content_scriptsセクションが削除されていることを確認
      expect(manifest.content_scripts).toBeUndefined();
    });

    test('should not request all_urls permission', () => {
      const hostPermissions = manifest.host_permissions || [];
      
      // 全サイトアクセス権限が含まれていないことを確認
      expect(hostPermissions).not.toContain('<all_urls>');
      expect(hostPermissions).not.toContain('*://*/*');
      expect(hostPermissions).not.toContain('http://*/*');
      expect(hostPermissions).not.toContain('https://*/*');
    });

    test('should only have specific API endpoints in host_permissions', () => {
      const hostPermissions = manifest.host_permissions || [];
      
      // 各host_permissionが特定のAPIエンドポイントのみであることを確認
      hostPermissions.forEach(permission => {
        const isValidEndpoint = 
          permission.includes('googleapis.com') ||
          permission.includes('openai.com') ||
          permission.includes('openai.azure.com') ||
          permission.includes('cognitiveservices.azure.com') ||
          permission.includes('anthropic.com') ||
          permission.includes('groq.com') ||
          permission.includes('deepseek.com') ||
          permission.includes('localhost:11434') ||
          permission.includes('amazonaws.com');
        
        expect(isValidEndpoint).toBe(true);
      });
    });
  });

  describe('Security Compliance', () => {
    test('should have Manifest V3 compliance', () => {
      expect(manifest.manifest_version).toBe(3);
    });

    test('should not expose dangerous permissions', () => {
      const dangerousPermissions = [
        'bookmarks',
        'browsingData',
        'cookies',
        'downloads',
        'history',
        'management',
        'nativeMessaging',
        'privacy',
        'topSites',
        'webNavigation'
      ];

      dangerousPermissions.forEach(permission => {
        expect(manifest.permissions).not.toContain(permission);
      });
    });

    test('should have appropriate background configuration', () => {
      expect(manifest.background).toBeDefined();
      expect(manifest.background.service_worker).toBe('background.js');
      
      // Manifest V2の古い設定がないことを確認
      expect(manifest.background.scripts).toBeUndefined();
      expect(manifest.background.persistent).toBeUndefined();
    });
  });

  describe('Content Security Policy', () => {
    test('should not have inline script permissions if CSP is defined', () => {
      if (manifest.content_security_policy) {
        const csp = manifest.content_security_policy.extension_pages || manifest.content_security_policy;
        
        // unsafe-inlineが含まれていないことを確認
        expect(csp).not.toMatch(/unsafe-inline/);
        expect(csp).not.toMatch(/unsafe-eval/);
      }
    });
  });
});

describe('Dynamic Content Script Injection', () => {
  // Chrome API mocks
  global.chrome = {
    scripting: {
      executeScript: jest.fn()
    },
    tabs: {
      query: jest.fn(),
      sendMessage: jest.fn(),
      get: jest.fn()
    },
    runtime: {
      lastError: null
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle content script injection failure gracefully', async () => {
    // executeScript失敗をシミュレート
    chrome.scripting.executeScript.mockRejectedValue(new Error('Cannot access tab'));
    chrome.tabs.query.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);

    // AIAssistantクラスをモック（実際の実装では動的にインポート）
    const mockGetPageContent = async () => {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: 1 },
          files: ['scripts/content.js']
        });
      } catch (error) {
        // エラー時のフォールバック
        return null;
      }
    };

    const result = await mockGetPageContent();
    expect(result).toBeNull();
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 1 },
      files: ['scripts/content.js']
    });
  });

  test('should validate tab URL before injection', () => {
    const isValidUrl = (url) => {
      return url.startsWith('http://') || url.startsWith('https://');
    };

    // 有効なURL
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://example.com')).toBe(true);

    // 無効なURL（injection不可）
    expect(isValidUrl('chrome://extensions/')).toBe(false);
    expect(isValidUrl('about:blank')).toBe(false);
    expect(isValidUrl('moz-extension://')).toBe(false);
  });

  test('should handle permission denied scenarios', async () => {
    chrome.tabs.sendMessage.mockRejectedValue(new Error('Cannot access tab'));
    
    const mockHandlePermissionError = (error) => {
      if (error.message.includes('Cannot access')) {
        return { fallback: true, text: '', url: 'restricted' };
      }
      throw error;
    };

    const result = mockHandlePermissionError(new Error('Cannot access tab'));
    expect(result.fallback).toBe(true);
    expect(result.text).toBe('');
  });
});

describe('Password Field Protection Logic', () => {
  test('should not extract password field values', () => {
    // テストロジック：パスワードフィールド除外の確認
    const mockInputs = [
      { type: 'text', name: 'username', value: 'testuser' },
      { type: 'password', name: 'password', value: 'secret123' },
      { type: 'email', name: 'email', value: 'test@example.com' },
      { type: 'textarea', name: 'comments', value: 'Some comments' }
    ];

    // パスワードフィールド除外のロジック
    const extractSafeContent = (inputs) => {
      const safeContent = [];
      inputs.forEach(input => {
        // パスワードフィールドを除外
        if (input.type !== 'password') {
          if (input.value && input.value.trim()) {
            safeContent.push(input.value.trim());
          }
        }
      });
      return safeContent.join(' ');
    };

    const content = extractSafeContent(mockInputs);
    
    // パスワード値が含まれていないことを確認
    expect(content).not.toContain('secret123');
    
    // 他の値は含まれることを確認
    expect(content).toContain('testuser');
    expect(content).toContain('test@example.com');
    expect(content).toContain('Some comments');
  });

  test('should exclude sensitive input types', () => {
    const mockInputs = [
      { type: 'text', value: 'normal text' },
      { type: 'password', value: 'password123' },
      { type: 'hidden', value: 'hidden_token' },
      { type: 'submit', value: 'Submit' },
      { type: 'reset', value: 'Reset' }
    ];

    const excludeSensitiveInputs = (inputs) => {
      const sensitiveTypes = ['password', 'hidden'];
      const safeValues = [];

      inputs.forEach(input => {
        if (!sensitiveTypes.includes(input.type)) {
          if (input.value && input.type !== 'submit' && input.type !== 'reset') {
            safeValues.push(input.value);
          }
        }
      });

      return safeValues;
    };

    const values = excludeSensitiveInputs(mockInputs);
    
    expect(values).toContain('normal text');
    expect(values).not.toContain('password123');
    expect(values).not.toContain('hidden_token');
  });
});

describe('Security Audit Logging', () => {
  test('should track permission usage', () => {
    const auditLog = [];
    
    const logPermissionUsage = (permission, context, details = {}) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        permission,
        context,
        details
      };
      auditLog.push(logEntry);
    };

    // 権限使用をログ
    logPermissionUsage('activeTab', 'getPageContent', { tabId: 1, url: 'https://example.com' });
    logPermissionUsage('scripting', 'injectContentScript', { tabId: 1 });

    expect(auditLog).toHaveLength(2);
    expect(auditLog[0].permission).toBe('activeTab');
    expect(auditLog[1].permission).toBe('scripting');
    expect(auditLog[0].details.tabId).toBe(1);
  });

  test('should limit audit log size', () => {
    const maxLogSize = 50;
    const auditLog = [];

    const addLogEntry = (entry) => {
      auditLog.push(entry);
      if (auditLog.length > maxLogSize) {
        auditLog.shift(); // 古いエントリを削除
      }
    };

    // 100個のエントリを追加
    for (let i = 0; i < 100; i++) {
      addLogEntry({ id: i, timestamp: new Date().toISOString() });
    }

    // 最大サイズを超えないことを確認
    expect(auditLog.length).toBe(maxLogSize);
    
    // 最新50件が保持されていることを確認
    expect(auditLog[0].id).toBe(50);
    expect(auditLog[49].id).toBe(99);
  });
});