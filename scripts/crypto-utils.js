class CryptoUtils {
  async base64UrlEncode(data) {
    const encoded = btoa(data);
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  async importKey(pemKey) {
    const binaryDer = this.pemToBinary(pemKey);
    return await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );
  }

  pemToBinary(pem) {
    const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '')
                     .replace(/-----END PRIVATE KEY-----/, '')
                     .replace(/\s/g, '');
    
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  }

  async createJWT(serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour later
    
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id
    };
    
    const payload = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      iat: now,
      exp: exp
    };
    
    const headerEncoded = await this.base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = await this.base64UrlEncode(JSON.stringify(payload));
    
    const unsignedToken = `${headerEncoded}.${payloadEncoded}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(unsignedToken);
    
    const cryptoKey = await this.importKey(serviceAccount.private_key);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
    
    const signatureArray = new Uint8Array(signature);
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray));
    const signatureEncoded = signatureBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    return `${unsignedToken}.${signatureEncoded}`;
  }
}