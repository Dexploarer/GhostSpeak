/**
 * Input Validation Layer for GhostSpeak Protocol
 * 
 * Provides comprehensive input validation, sanitization, and security
 * measures to prevent XSS, injection attacks, and other vulnerabilities.
 */

import { PublicKey } from '@solana/web3.js';
import DOMPurify from 'isomorphic-dompurify';

// Security constants matching the Rust program
export const MAX_NAME_LENGTH = 64;
export const MAX_TITLE_LENGTH = 128;
export const MAX_DESCRIPTION_LENGTH = 512;
export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_GENERAL_STRING_LENGTH = 256;
export const MAX_CAPABILITIES_COUNT = 20;
export const MAX_PARTICIPANTS_COUNT = 50;
export const MAX_REQUIREMENTS_ITEMS = 10;
export const MAX_DELIVERABLES_COUNT = 10;
export const MAX_METADATA_URI_LENGTH = 512;

// Resource limits
export const MAX_AGENTS_PER_USER = 100;
export const MAX_MESSAGES_PER_CHANNEL = 10000;
export const MAX_LISTINGS_PER_AGENT = 50;
export const MAX_WORK_ORDERS_PER_USER = 100;

// Payment limits
export const MAX_PAYMENT_AMOUNT = 1_000_000_000_000; // 1M tokens (with 6 decimals)
export const MIN_PAYMENT_AMOUNT = 1_000; // 0.001 tokens

// Rate limiting
export const RATE_LIMIT_REQUESTS_PER_SECOND = 10;
export const RATE_LIMIT_WINDOW_MS = 1000;

// Validation errors
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Input validator class providing comprehensive validation methods
 */
export class InputValidator {
  private static readonly DANGEROUS_PATTERNS = [
    /<script[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers
    /<object[\s\S]*?<\/object>/gi,
    /<embed[\s\S]*?<\/embed>/gi,
    /vbscript:/gi,
    /data:text\/html/gi
  ];

  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(-{2}|\/\*|\*\/)/g, // SQL comments
    /(;|'|"|`|\\)/g, // SQL delimiters
  ];

  private static readonly CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/g;
  private static readonly WHITESPACE_REGEX = /\s+/g;

  /**
   * Sanitize a string input by removing dangerous content
   * @param input The string to sanitize
   * @param maxLength Maximum allowed length
   * @param fieldName Field name for error messages
   * @returns Sanitized string
   */
  static sanitizeString(input: string, maxLength: number, fieldName = 'input'): string {
    if (typeof input !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName, input);
    }

    // Remove null bytes and control characters (except newline, tab, carriage return)
    let sanitized = input.replace(/\x00/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(sanitized)) {
        throw new ValidationError(
          `${fieldName} contains potentially dangerous content`,
          fieldName,
          input
        );
      }
    }

    // Check for SQL injection patterns in certain fields
    if (fieldName !== 'description' && fieldName !== 'message') {
      for (const pattern of this.SQL_INJECTION_PATTERNS) {
        if (pattern.test(sanitized)) {
          throw new ValidationError(
            `${fieldName} contains invalid characters`,
            fieldName,
            input
          );
        }
      }
    }

    // Check length
    if (sanitized.length === 0) {
      throw new ValidationError(`${fieldName} cannot be empty`, fieldName, input);
    }

    if (sanitized.length > maxLength) {
      throw new ValidationError(
        `${fieldName} exceeds maximum length of ${maxLength} characters`,
        fieldName,
        input
      );
    }

    return sanitized;
  }

  /**
   * Sanitize HTML content using DOMPurify
   * @param input HTML string to sanitize
   * @returns Sanitized HTML
   */
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') {
      throw new ValidationError('HTML input must be a string', 'html', input);
    }

    // Configure DOMPurify for strict sanitization
    const config = {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'title'],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    };

    return DOMPurify.sanitize(input, config);
  }

  /**
   * Validate a Solana address
   * @param address Address to validate
   * @returns true if valid
   */
  static validateAddress(address: string): boolean {
    if (typeof address !== 'string') {
      throw new ValidationError('Address must be a string', 'address', address);
    }

    try {
      const pubkey = new PublicKey(address);
      // Check if it's a valid public key by converting back to string
      return pubkey.toBase58() === address;
    } catch {
      return false;
    }
  }

  /**
   * Validate a numeric amount
   * @param amount Amount to validate
   * @param min Minimum allowed value
   * @param max Maximum allowed value
   * @param fieldName Field name for error messages
   * @returns Validated amount
   */
  static validateAmount(
    amount: number | string,
    min: number,
    max: number,
    fieldName = 'amount'
  ): number {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numAmount) || !isFinite(numAmount)) {
      throw new ValidationError(`${fieldName} must be a valid number`, fieldName, amount);
    }

    if (numAmount < min) {
      throw new ValidationError(
        `${fieldName} must be at least ${min}`,
        fieldName,
        amount
      );
    }

    if (numAmount > max) {
      throw new ValidationError(
        `${fieldName} cannot exceed ${max}`,
        fieldName,
        amount
      );
    }

    // Check for integer overflow
    if (numAmount > Number.MAX_SAFE_INTEGER) {
      throw new ValidationError(
        `${fieldName} exceeds maximum safe integer`,
        fieldName,
        amount
      );
    }

    return numAmount;
  }

  /**
   * Validate an array of strings
   * @param array Array to validate
   * @param maxCount Maximum number of items
   * @param maxItemLength Maximum length per item
   * @param fieldName Field name for error messages
   * @returns Validated and sanitized array
   */
  static validateStringArray(
    array: string[],
    maxCount: number,
    maxItemLength: number,
    fieldName = 'array'
  ): string[] {
    if (!Array.isArray(array)) {
      throw new ValidationError(`${fieldName} must be an array`, fieldName, array);
    }

    if (array.length > maxCount) {
      throw new ValidationError(
        `${fieldName} cannot contain more than ${maxCount} items`,
        fieldName,
        array
      );
    }

    return array.map((item, index) =>
      this.sanitizeString(item, maxItemLength, `${fieldName}[${index}]`)
    );
  }

  /**
   * Validate a metadata URI
   * @param uri URI to validate
   * @returns Validated URI
   */
  static validateMetadataUri(uri: string): string {
    const sanitized = this.sanitizeString(uri, MAX_METADATA_URI_LENGTH, 'metadataUri');

    // Check for valid URI schemes
    const validSchemes = ['https://', 'http://', 'ipfs://', 'ar://'];
    const hasValidScheme = validSchemes.some(scheme => sanitized.startsWith(scheme));

    if (!hasValidScheme) {
      throw new ValidationError(
        'Metadata URI must start with https://, http://, ipfs://, or ar://',
        'metadataUri',
        uri
      );
    }

    // Basic URL validation
    try {
      if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) {
        new URL(sanitized);
      }
    } catch {
      throw new ValidationError('Invalid metadata URI format', 'metadataUri', uri);
    }

    return sanitized;
  }

  /**
   * Validate a timestamp
   * @param timestamp Timestamp to validate
   * @param minTime Minimum allowed time (defaults to current time)
   * @param maxTime Maximum allowed time (defaults to 1 year from now)
   * @param fieldName Field name for error messages
   * @returns Validated timestamp
   */
  static validateTimestamp(
    timestamp: number,
    minTime = Date.now() / 1000,
    maxTime = Date.now() / 1000 + 365 * 24 * 60 * 60,
    fieldName = 'timestamp'
  ): number {
    const validated = this.validateAmount(timestamp, minTime, maxTime, fieldName);

    // Additional check for reasonable dates
    const year2000 = 946684800; // Unix timestamp for Jan 1, 2000
    const year2100 = 4102444800; // Unix timestamp for Jan 1, 2100

    if (validated < year2000 || validated > year2100) {
      throw new ValidationError(
        `${fieldName} must be a reasonable date`,
        fieldName,
        timestamp
      );
    }

    return validated;
  }

  /**
   * Validate percentage value (0-100)
   * @param percentage Percentage to validate
   * @param fieldName Field name for error messages
   * @returns Validated percentage
   */
  static validatePercentage(percentage: number, fieldName = 'percentage'): number {
    return this.validateAmount(percentage, 0, 100, fieldName);
  }

  /**
   * Validate agent registration data
   */
  static validateAgentRegistration(data: {
    name: string;
    description: string;
    capabilities: string[];
    metadataUri: string;
    serviceEndpoint: string;
  }): {
    name: string;
    description: string;
    capabilities: string[];
    metadataUri: string;
    serviceEndpoint: string;
  } {
    return {
      name: this.sanitizeString(data.name, MAX_NAME_LENGTH, 'name'),
      description: this.sanitizeString(data.description, MAX_DESCRIPTION_LENGTH, 'description'),
      capabilities: this.validateStringArray(
        data.capabilities,
        MAX_CAPABILITIES_COUNT,
        MAX_NAME_LENGTH,
        'capabilities'
      ),
      metadataUri: this.validateMetadataUri(data.metadataUri),
      serviceEndpoint: this.validateMetadataUri(data.serviceEndpoint),
    };
  }

  /**
   * Validate message content
   */
  static validateMessage(content: string): string {
    // Allow slightly more flexibility for messages but still sanitize
    const sanitized = this.sanitizeString(content, MAX_MESSAGE_LENGTH, 'message');
    
    // Additional check for repeated characters (spam prevention)
    const repeatedChars = /(.)\1{20,}/g;
    if (repeatedChars.test(sanitized)) {
      throw new ValidationError(
        'Message contains excessive repeated characters',
        'message',
        content
      );
    }

    return sanitized;
  }

  /**
   * Validate work order data
   */
  static validateWorkOrder(data: {
    title: string;
    description: string;
    requirements: string[];
    paymentAmount: number;
    deadline: number;
  }): {
    title: string;
    description: string;
    requirements: string[];
    paymentAmount: number;
    deadline: number;
  } {
    return {
      title: this.sanitizeString(data.title, MAX_TITLE_LENGTH, 'title'),
      description: this.sanitizeString(data.description, MAX_DESCRIPTION_LENGTH, 'description'),
      requirements: this.validateStringArray(
        data.requirements,
        MAX_REQUIREMENTS_ITEMS,
        MAX_GENERAL_STRING_LENGTH,
        'requirements'
      ),
      paymentAmount: this.validateAmount(
        data.paymentAmount,
        MIN_PAYMENT_AMOUNT,
        MAX_PAYMENT_AMOUNT,
        'paymentAmount'
      ),
      deadline: this.validateTimestamp(data.deadline, Date.now() / 1000, undefined, 'deadline'),
    };
  }

  /**
   * Rate limiting check
   */
  private static rateLimitMap = new Map<string, number[]>();

  static checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const requests = this.rateLimitMap.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(
      time => now - time < RATE_LIMIT_WINDOW_MS
    );

    if (validRequests.length >= RATE_LIMIT_REQUESTS_PER_SECOND) {
      throw new ValidationError(
        'Rate limit exceeded. Please try again later.',
        'rateLimit',
        identifier
      );
    }

    // Add current request
    validRequests.push(now);
    this.rateLimitMap.set(identifier, validRequests);

    // Cleanup old entries periodically
    if (this.rateLimitMap.size > 1000) {
      const cutoff = now - RATE_LIMIT_WINDOW_MS;
      for (const [key, times] of this.rateLimitMap.entries()) {
        if (times.every(t => t < cutoff)) {
          this.rateLimitMap.delete(key);
        }
      }
    }

    return true;
  }

  /**
   * Validate IPFS hash
   */
  static validateIpfsHash(hash: string): string {
    const sanitized = this.sanitizeString(hash, 64, 'ipfsHash');
    
    // Basic IPFS hash validation (CIDv0 or CIDv1)
    const ipfsPattern = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z0-9]{58})$/;
    if (!ipfsPattern.test(sanitized)) {
      throw new ValidationError('Invalid IPFS hash format', 'ipfsHash', hash);
    }

    return sanitized;
  }
}

// Export convenience functions
export const {
  sanitizeString,
  sanitizeHtml,
  validateAddress,
  validateAmount,
  validateStringArray,
  validateMetadataUri,
  validateTimestamp,
  validatePercentage,
  validateAgentRegistration,
  validateMessage,
  validateWorkOrder,
  checkRateLimit,
  validateIpfsHash,
} = InputValidator;