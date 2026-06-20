import crypto from 'crypto';

// The key must be exactly 32 bytes (256 bits) for aes-256-gcm, supplied as a
// 64-character hex string in KYC_ENCRYPTION_KEY. It MUST stay constant across
// restarts, otherwise previously-encrypted ID numbers can never be decrypted.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.KYC_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'KYC_ENCRYPTION_KEY is not set. Add a 64-char hex key to .env.local — ' +
        'a missing/rotating key makes encrypted KYC data unrecoverable.'
    );
  }
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new Error('KYC_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).');
  }
  return key;
}

/**
 * Encrypts a string using AES-256-GCM
 */
export function encryptData(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();

  // Format: iv:salt:authTag:encryptedData
  return `${iv.toString('hex')}:${salt.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a string encrypted with encryptData
 */
export function decryptData(encryptedText: string): string {
  try {
    const key = getKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    // Format: iv:salt:authTag:encrypted — salt (parts[1]) is reserved and unused here.
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed', error);
    return '*** DECRYPTION_FAILED ***';
  }
}
