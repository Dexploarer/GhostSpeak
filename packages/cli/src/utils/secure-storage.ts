import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'node:crypto';
import { readFile, writeFile, access, chmod, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { Keypair } from '@solana/web3.js';
import { envConfig } from './env-config.js';

interface EncryptedData {
  iv: string;
  salt: string;
  encrypted: string;
  version: number;
}

/**
 * Secure storage for private keys and sensitive data
 * Uses AES-256-GCM encryption with scrypt key derivation
 */
export class SecureStorage {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly SALT_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;
  private static readonly VERSION = 1;
  private static readonly STORAGE_DIR = '.ghostspeak/secure';
  
  /**
   * Get the secure storage directory path
   */
  private static getStorageDir(): string {
    return resolve(homedir(), this.STORAGE_DIR);
  }
  
  /**
   * Get the full path for a storage key
   */
  private static getStoragePath(key: string): string {
    return resolve(this.getStorageDir(), `${key}.enc`);
  }
  
  /**
   * Derive encryption key from password and salt using scrypt
   */
  private static async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const iterations = envConfig.keyDerivationIterations || 100000;
      scrypt(password, salt, this.KEY_LENGTH, { N: iterations }, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }
  
  /**
   * Ensure storage directory exists with proper permissions
   */
  private static async ensureStorageDir(): Promise<void> {
    const dir = this.getStorageDir();
    try {
      await access(dir);
    } catch {
      await mkdir(dir, { recursive: true, mode: 0o700 });
    }
    // Ensure directory has proper permissions
    await chmod(dir, 0o700);
  }
  
  /**
   * Encrypt data with password
   */
  static async encrypt(data: string, password: string): Promise<EncryptedData> {
    const salt = randomBytes(this.SALT_LENGTH);
    const iv = randomBytes(this.IV_LENGTH);
    const key = await this.deriveKey(password, salt);
    
    const cipher = createCipheriv(this.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ]);
    
    // Get the auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine encrypted data with auth tag
    const combined = Buffer.concat([encrypted, authTag]);
    
    return {
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      encrypted: combined.toString('hex'),
      version: this.VERSION,
    };
  }
  
  /**
   * Decrypt data with password
   */
  static async decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
    if (encryptedData.version !== this.VERSION) {
      throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
    }
    
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const combined = Buffer.from(encryptedData.encrypted, 'hex');
    
    // Split encrypted data and auth tag
    const encrypted = combined.subarray(0, combined.length - this.TAG_LENGTH);
    const authTag = combined.subarray(combined.length - this.TAG_LENGTH);
    
    const key = await this.deriveKey(password, salt);
    
    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    try {
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error('Failed to decrypt: Invalid password or corrupted data');
    }
  }
  
  /**
   * Store encrypted data
   */
  static async store(key: string, data: string, password: string): Promise<void> {
    await this.ensureStorageDir();
    const encrypted = await this.encrypt(data, password);
    const path = this.getStoragePath(key);
    
    // Write encrypted data
    await writeFile(path, JSON.stringify(encrypted, null, 2), 'utf8');
    
    // Set file permissions to owner-only
    await chmod(path, 0o600);
  }
  
  /**
   * Retrieve and decrypt data
   */
  static async retrieve(key: string, password: string): Promise<string> {
    const path = this.getStoragePath(key);
    
    try {
      const content = await readFile(path, 'utf8');
      const encrypted: EncryptedData = JSON.parse(content);
      return await this.decrypt(encrypted, password);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`No data found for key: ${key}`);
      }
      throw error;
    }
  }
  
  /**
   * Check if a key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      await access(this.getStoragePath(key));
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Store a Solana keypair securely
   */
  static async storeKeypair(key: string, keypair: Keypair, password: string): Promise<void> {
    const secretKey = JSON.stringify(Array.from(keypair.secretKey));
    await this.store(key, secretKey, password);
  }
  
  /**
   * Retrieve a Solana keypair
   */
  static async retrieveKeypair(key: string, password: string): Promise<Keypair> {
    const secretKeyJson = await this.retrieve(key, password);
    const secretKey = new Uint8Array(JSON.parse(secretKeyJson));
    return Keypair.fromSecretKey(secretKey);
  }
  
  /**
   * Delete encrypted data
   */
  static async delete(key: string): Promise<void> {
    const path = this.getStoragePath(key);
    const { unlink } = await import('node:fs/promises');
    try {
      await unlink(path);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
  
  /**
   * List all stored keys
   */
  static async listKeys(): Promise<string[]> {
    const { readdir } = await import('node:fs/promises');
    try {
      const dir = this.getStorageDir();
      const files = await readdir(dir);
      return files
        .filter(f => f.endsWith('.enc'))
        .map(f => f.replace('.enc', ''));
    } catch {
      return [];
    }
  }
}

/**
 * Prompt for password securely (masks input)
 */
export async function promptPassword(message: string = 'Enter password: '): Promise<string> {
  const { createInterface } = await import('node:readline');
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    // Disable echo for password input
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    process.stdout.write(message);
    
    let password = '';
    process.stdin.on('data', (char) => {
      const key = char.toString();
      
      switch (key) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          process.stdin.pause();
          process.stdin.removeAllListeners('data');
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }
          process.stdout.write('\n');
          rl.close();
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit(0);
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += key;
          process.stdout.write('*');
          break;
      }
    });
  });
}

/**
 * Clear sensitive data from memory
 */
export function clearMemory(data: string | Uint8Array): void {
  if (typeof data === 'string') {
    // For strings, we can't directly clear memory in JavaScript
    // But we can at least ensure the reference is released
    data = '';
  } else if (data instanceof Uint8Array) {
    // Zero out the array
    data.fill(0);
  }
}