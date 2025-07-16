/**
 * Security Manager - API認証情報の暗号化ストレージを提供
 * Chrome拡張機能で利用可能なWeb Crypto APIを使用
 */
class SecurityManager {
  constructor() {
    this.keyName = 'ai-assistant-encryption-key';
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
    this.ivLength = 12;
    this.initialized = false;
  }

  /**
   * SecurityManagerを初期化
   * マスターキーを生成または復元
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // 既存のキーを取得試行
      const storedKey = await this.getStoredKey();
      if (storedKey) {
        this.masterKey = await this.importKey(storedKey);
      } else {
        // 新しいキーを生成
        this.masterKey = await this.generateKey();
        await this.storeKey(this.masterKey);
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize SecurityManager:', error);
      throw new Error('セキュリティマネージャーの初期化に失敗しました');
    }
  }

  /**
   * 新しい暗号化キーを生成
   */
  async generateKey() {
    return await crypto.subtle.generateKey(
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * キーをストレージに保存
   */
  async storeKey(key) {
    try {
      const exported = await crypto.subtle.exportKey('raw', key);
      const keyArray = Array.from(new Uint8Array(exported));
      
      // Chrome storage syncを使用してキーを保存
      await chrome.storage.sync.set({
        [this.keyName]: keyArray
      });
    } catch (error) {
      console.error('Failed to store encryption key:', error);
      throw new Error('暗号化キーの保存に失敗しました');
    }
  }

  /**
   * ストレージからキーを取得
   */
  async getStoredKey() {
    try {
      const result = await chrome.storage.sync.get([this.keyName]);
      if (result[this.keyName]) {
        return new Uint8Array(result[this.keyName]);
      }
      return null;
    } catch (error) {
      console.error('Failed to get stored key:', error);
      return null;
    }
  }

  /**
   * キーデータをCryptoKeyオブジェクトにインポート
   */
  async importKey(keyData) {
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: this.algorithm,
        length: this.keyLength
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * データを暗号化
   * @param {any} data - 暗号化するデータ
   * @returns {Promise<string>} Base64エンコードされた暗号化データ
   */
  async encrypt(data) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const jsonString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const plaintext = encoder.encode(jsonString);
      
      // ランダムなIVを生成
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
      
      // データを暗号化
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        this.masterKey,
        plaintext
      );
      
      // IVと暗号化データを結合
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(ciphertext), iv.length);
      
      // Base64エンコード
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('データの暗号化に失敗しました');
    }
  }

  /**
   * データを復号化
   * @param {string} encryptedData - Base64エンコードされた暗号化データ
   * @returns {Promise<any>} 復号化されたデータ
   */
  async decrypt(encryptedData) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Base64デコード
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(c => c.charCodeAt(0))
      );
      
      // IVと暗号化データを分離
      const iv = combined.slice(0, this.ivLength);
      const ciphertext = combined.slice(this.ivLength);
      
      // データを復号化
      const plaintext = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        this.masterKey,
        ciphertext
      );
      
      // テキストデータに変換
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(plaintext);
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('データの復号化に失敗しました');
    }
  }

  /**
   * 安全な設定値の保存
   * @param {string} key - 設定キー
   * @param {any} value - 設定値
   */
  async setSecure(key, value) {
    try {
      const encryptedValue = await this.encrypt(value);
      await chrome.storage.local.set({
        [`secure_${key}`]: encryptedValue
      });
    } catch (error) {
      console.error(`Failed to set secure value for ${key}:`, error);
      throw new Error(`設定値の保存に失敗しました: ${key}`);
    }
  }

  /**
   * 安全な設定値の取得
   * @param {string} key - 設定キー
   * @returns {Promise<any>} 設定値（存在しない場合はnull）
   */
  async getSecure(key) {
    try {
      const result = await chrome.storage.local.get([`secure_${key}`]);
      const encryptedValue = result[`secure_${key}`];
      
      if (encryptedValue) {
        return await this.decrypt(encryptedValue);
      }
      return null;
    } catch (error) {
      console.error(`Failed to get secure value for ${key}:`, error);
      return null;
    }
  }

  /**
   * 安全な設定値の削除
   * @param {string} key - 設定キー
   */
  async removeSecure(key) {
    try {
      await chrome.storage.local.remove([`secure_${key}`]);
    } catch (error) {
      console.error(`Failed to remove secure value for ${key}:`, error);
    }
  }

  /**
   * 全ての暗号化データをクリア
   */
  async clearAllSecure() {
    try {
      const allData = await chrome.storage.local.get();
      const secureKeys = Object.keys(allData).filter(key => key.startsWith('secure_'));
      
      if (secureKeys.length > 0) {
        await chrome.storage.local.remove(secureKeys);
      }
      
      // 暗号化キーも削除
      await chrome.storage.sync.remove([this.keyName]);
      
      this.initialized = false;
      this.masterKey = null;
    } catch (error) {
      console.error('Failed to clear secure data:', error);
      throw new Error('セキュアデータのクリアに失敗しました');
    }
  }

  /**
   * 入力値の検証
   * @param {string} type - 検証タイプ
   * @param {any} value - 検証する値
   * @returns {boolean} 検証結果
   */
  validateInput(type, value) {
    switch (type) {
      case 'apiKey':
        return this.validateAPIKey(value);
      case 'serviceAccount':
        return this.validateServiceAccount(value);
      case 'awsCredentials':
        return this.validateAWSCredentials(value);
      default:
        return true;
    }
  }

  /**
   * APIキーの検証
   */
  validateAPIKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('APIキーは文字列である必要があります');
    }
    
    if (apiKey.length < 10) {
      throw new Error('APIキーが短すぎます');
    }
    
    if (apiKey.includes(' ')) {
      throw new Error('APIキーに空白文字が含まれています');
    }
    
    return true;
  }

  /**
   * Service Accountの検証
   */
  validateServiceAccount(serviceAccount) {
    if (!serviceAccount || typeof serviceAccount !== 'object') {
      throw new Error('Service Accountは有効なJSONオブジェクトである必要があります');
    }
    
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
    for (const field of requiredFields) {
      if (!serviceAccount[field]) {
        throw new Error(`Service Accountに必要なフィールド「${field}」が不足しています`);
      }
    }
    
    if (serviceAccount.type !== 'service_account') {
      throw new Error('Service Accountのタイプが正しくありません');
    }
    
    return true;
  }

  /**
   * AWS認証情報の検証
   */
  validateAWSCredentials(credentials) {
    if (!credentials || typeof credentials !== 'object') {
      throw new Error('AWS認証情報は有効なオブジェクトである必要があります');
    }
    
    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
      throw new Error('AWS認証情報にAccess Key IDとSecret Access Keyが必要です');
    }
    
    if (credentials.accessKeyId.length < 16) {
      throw new Error('AWS Access Key IDが短すぎます');
    }
    
    if (credentials.secretAccessKey.length < 32) {
      throw new Error('AWS Secret Access Keyが短すぎます');
    }
    
    return true;
  }

  /**
   * HTMLの安全な文字列化
   */
  sanitizeHTML(html) {
    if (!html || typeof html !== 'string') {
      return '';
    }
    
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}

// シングルトンインスタンス
const securityManager = new SecurityManager();

// グローバルに利用可能にする
if (typeof window !== 'undefined') {
  window.securityManager = securityManager;
}