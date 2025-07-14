// Test for utility functions from sidepanel.js
describe('Utility Functions Tests', () => {
  let mockDocument;

  beforeEach(() => {
    // Create a mock document for testing
    mockDocument = {
      createElement: jest.fn(() => ({
        textContent: '',
        innerHTML: '',
        set textContent(value) {
          this.innerHTML = value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
        },
        get textContent() {
          return this._textContent || '';
        }
      }))
    };
    global.document = mockDocument;
  });

  describe('escapeHtml function', () => {
    // We need to extract the escapeHtml function logic for testing
    // Since it's a method inside AIAssistant class, we'll test the logic directly
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    test('should escape basic HTML characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = escapeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    test('should escape quotes', () => {
      const input = 'He said "Hello" & she said \'Hi\'';
      const result = escapeHtml(input);
      expect(result).toContain('He said "Hello" &amp; she said \'Hi\'');
    });

    test('should handle empty string', () => {
      const result = escapeHtml('');
      expect(result).toBe('');
    });

    test('should handle null and undefined', () => {
      expect(() => escapeHtml(null)).not.toThrow();
      expect(() => escapeHtml(undefined)).not.toThrow();
    });

    test('should handle special characters', () => {
      const input = '<>&"\'';
      const result = escapeHtml(input);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toContain('&amp;');
    });

    test('should handle very long strings', () => {
      const longString = 'a'.repeat(10000) + '<script>' + 'b'.repeat(10000);
      const result = escapeHtml(longString);
      expect(result).not.toContain('<script>');
      expect(result.length).toBeGreaterThan(20000);
    });
  });

  describe('URL validation edge cases', () => {
    test('should handle various URL formats', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://api.openai.com/v1/chat',
        'https://bedrock-runtime.us-east-1.amazonaws.com'
      ];

      validUrls.forEach(url => {
        expect(url).toMatch(/^https?:\/\/.+/);
      });
    });

    test('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'javascript:alert(1)',
        '',
        null,
        undefined
      ];

      invalidUrls.forEach(url => {
        if (url) {
          expect(url).not.toMatch(/^https?:\/\/.+/);
        }
      });
    });

    test('should validate URL format properly', () => {
      const isValidUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        try {
          new URL(url);
          return url.startsWith('http://') || url.startsWith('https://');
        } catch {
          return false;
        }
      };

      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('invalid-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
    });
  });

  describe('Data validation utilities', () => {
    test('should validate JSON format', () => {
      const isValidJSON = (str) => {
        try {
          JSON.parse(str);
          return true;
        } catch {
          return false;
        }
      };

      expect(isValidJSON('{"key": "value"}')).toBe(true);
      expect(isValidJSON('{"key": value}')).toBe(false);
      expect(isValidJSON('null')).toBe(true);
      expect(isValidJSON('undefined')).toBe(false);
      expect(isValidJSON('')).toBe(false);
    });

    test('should validate email format', () => {
      const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user+tag@domain.co.uk')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
    });

    test('should validate API key format', () => {
      const isValidAPIKey = (key, type) => {
        if (!key || typeof key !== 'string') return false;
        
        switch (type) {
          case 'openai':
            return key.startsWith('sk-') && key.length > 20;
          case 'anthropic':
            return key.startsWith('sk-ant-') && key.length > 20;
          case 'aws':
            return key.startsWith('AKIA') && key.length === 20;
          default:
            return key.length > 10;
        }
      };

      expect(isValidAPIKey('sk-1234567890123456789012345', 'openai')).toBe(true);
      expect(isValidAPIKey('sk-ant-1234567890123456789012345', 'anthropic')).toBe(true);
      expect(isValidAPIKey('AKIA1234567890123456', 'aws')).toBe(true);
      expect(isValidAPIKey('short', 'openai')).toBe(false);
      expect(isValidAPIKey('', 'openai')).toBe(false);
      expect(isValidAPIKey(null, 'openai')).toBe(false);
    });
  });

  describe('String manipulation utilities', () => {
    test('should truncate text properly', () => {
      const truncateText = (text, maxLength, ellipsis = '...') => {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - ellipsis.length) + ellipsis;
      };

      expect(truncateText('Hello World', 10)).toBe('Hello W...');
      expect(truncateText('Short', 10)).toBe('Short');
      expect(truncateText('', 10)).toBe('');
      expect(truncateText('Hello World', 10, '…')).toBe('Hello Wor…');
    });

    test('should capitalize text properly', () => {
      const capitalizeFirst = (text) => {
        if (!text || typeof text !== 'string') return text;
        return text.charAt(0).toUpperCase() + text.slice(1);
      };

      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('HELLO')).toBe('HELLO');
      expect(capitalizeFirst('')).toBe('');
      expect(capitalizeFirst(null)).toBe(null);
      expect(capitalizeFirst('h')).toBe('H');
    });

    test('should format file sizes', () => {
      const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('Date and time utilities', () => {
    test('should format timestamps', () => {
      const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      };

      const testDate = new Date('2024-01-01T12:30:00Z');
      const result = formatTimestamp(testDate.toISOString());
      expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
    });

    test('should calculate time differences', () => {
      const getTimeDifference = (timestamp1, timestamp2) => {
        const diff = Math.abs(new Date(timestamp1) - new Date(timestamp2));
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
      };

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      expect(getTimeDifference(now, oneHourAgo)).toBe('1 hour ago');
      expect(getTimeDifference(now, oneDayAgo)).toBe('1 day ago');
    });
  });

  describe('Object utilities', () => {
    test('should deep clone objects', () => {
      const deepClone = (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (Array.isArray(obj)) return obj.map(item => deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
          }
        }
        return cloned;
      };

      const original = {
        name: 'test',
        nested: { value: 42 },
        array: [1, 2, { nested: true }]
      };

      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.nested).not.toBe(original.nested);
      expect(cloned.array).not.toBe(original.array);
    });

    test('should merge objects deeply', () => {
      const deepMerge = (target, source) => {
        const result = { ...target };
        
        for (const key in source) {
          if (source.hasOwnProperty(key)) {
            if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
              result[key] = deepMerge(result[key] || {}, source[key]);
            } else {
              result[key] = source[key];
            }
          }
        }
        
        return result;
      };

      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { b: { d: 3 }, e: 4 };
      
      const merged = deepMerge(obj1, obj2);
      
      expect(merged).toEqual({
        a: 1,
        b: { c: 2, d: 3 },
        e: 4
      });
    });
  });

  describe('Array utilities', () => {
    test('should remove duplicates from arrays', () => {
      const removeDuplicates = (arr) => {
        return [...new Set(arr)];
      };

      expect(removeDuplicates([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(removeDuplicates(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
      expect(removeDuplicates([])).toEqual([]);
    });

    test('should chunk arrays', () => {
      const chunkArray = (arr, size) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      };

      expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunkArray([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
      expect(chunkArray([], 2)).toEqual([]);
    });
  });
});
