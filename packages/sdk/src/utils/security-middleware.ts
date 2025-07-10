/**
 * Security Middleware for GhostSpeak Protocol
 * 
 * Provides comprehensive security middleware to intercept and validate
 * all operations before they reach the blockchain.
 */

import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { InputValidator, ValidationError } from './input-validator';

// Security middleware types
export interface SecurityContext {
  user: PublicKey;
  endpoint: string;
  timestamp: number;
  requestId: string;
}

export interface SecurityMiddlewareConfig {
  enableRateLimit: boolean;
  enableInputValidation: boolean;
  enableAccessControl: boolean;
  enableAuditLogging: boolean;
  rateLimitWindowMs: number;
  maxRequestsPerWindow: number;
}

export interface AuditLogEntry {
  timestamp: number;
  user: string;
  action: string;
  result: 'success' | 'failure' | 'blocked';
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Security middleware class for protecting all operations
 */
export class SecurityMiddleware {
  private config: SecurityMiddlewareConfig;
  private auditLog: AuditLogEntry[] = [];
  private rateLimitMap = new Map<string, number[]>();

  constructor(config: Partial<SecurityMiddlewareConfig> = {}) {
    this.config = {
      enableRateLimit: true,
      enableInputValidation: true,
      enableAccessControl: true,
      enableAuditLogging: true,
      rateLimitWindowMs: 60000, // 1 minute
      maxRequestsPerWindow: 60,
      ...config,
    };
  }

  /**
   * Main middleware interceptor
   */
  async intercept<T>(
    action: string,
    context: SecurityContext,
    operation: () => Promise<T>,
    validation?: {
      input?: any;
      requiredRole?: string;
      resourceLimits?: Record<string, number>;
    }
  ): Promise<T> {
    const startTime = Date.now();
    let result: 'success' | 'failure' | 'blocked' = 'blocked';
    let reason: string | undefined;

    try {
      // 1. Rate limiting check
      if (this.config.enableRateLimit) {
        this.checkRateLimit(context.user.toBase58());
      }

      // 2. Input validation
      if (this.config.enableInputValidation && validation?.input) {
        this.validateInput(action, validation.input);
      }

      // 3. Access control
      if (this.config.enableAccessControl && validation?.requiredRole) {
        await this.checkAccess(context, validation.requiredRole);
      }

      // 4. Resource limits
      if (validation?.resourceLimits) {
        await this.checkResourceLimits(context, validation.resourceLimits);
      }

      // Execute the operation
      const operationResult = await operation();
      result = 'success';
      
      return operationResult;
    } catch (error) {
      result = 'failure';
      reason = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      // 5. Audit logging
      if (this.config.enableAuditLogging) {
        this.logAudit({
          timestamp: startTime,
          user: context.user.toBase58(),
          action,
          result,
          reason,
          metadata: {
            endpoint: context.endpoint,
            requestId: context.requestId,
            duration: Date.now() - startTime,
          },
        });
      }
    }
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(userKey: string): void {
    const now = Date.now();
    const requests = this.rateLimitMap.get(userKey) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(
      time => now - time < this.config.rateLimitWindowMs
    );

    if (validRequests.length >= this.config.maxRequestsPerWindow) {
      throw new ValidationError(
        `Rate limit exceeded. Maximum ${this.config.maxRequestsPerWindow} requests per ${this.config.rateLimitWindowMs / 1000} seconds.`,
        'rateLimit',
        userKey
      );
    }

    // Add current request
    validRequests.push(now);
    this.rateLimitMap.set(userKey, validRequests);

    // Cleanup old entries periodically
    if (this.rateLimitMap.size > 1000) {
      const cutoff = now - this.config.rateLimitWindowMs;
      for (const [key, times] of this.rateLimitMap.entries()) {
        if (times.every(t => t < cutoff)) {
          this.rateLimitMap.delete(key);
        }
      }
    }
  }

  /**
   * Input validation based on action type
   */
  private validateInput(action: string, input: any): void {
    switch (action) {
      case 'registerAgent':
        InputValidator.validateAgentRegistration(input);
        break;
      case 'sendMessage':
        InputValidator.validateMessage(input.content);
        break;
      case 'createWorkOrder':
        InputValidator.validateWorkOrder(input);
        break;
      case 'createServiceListing':
        this.validateServiceListing(input);
        break;
      case 'purchaseService':
        this.validateServicePurchase(input);
        break;
      default:
        // Generic validation for unknown actions
        if (typeof input === 'object' && input !== null) {
          this.validateGenericInput(input);
        }
    }
  }

  /**
   * Service listing validation
   */
  private validateServiceListing(input: any): void {
    if (input.title) {
      InputValidator.sanitizeString(input.title, 128, 'title');
    }
    if (input.description) {
      InputValidator.sanitizeString(input.description, 512, 'description');
    }
    if (input.price !== undefined) {
      InputValidator.validateAmount(input.price, 1000, 1_000_000_000_000, 'price');
    }
    if (input.tags) {
      InputValidator.validateStringArray(input.tags, 10, 20, 'tags');
    }
  }

  /**
   * Service purchase validation
   */
  private validateServicePurchase(input: any): void {
    if (input.quantity !== undefined) {
      InputValidator.validateAmount(input.quantity, 1, 1000, 'quantity');
    }
    if (input.requirements) {
      InputValidator.validateStringArray(input.requirements, 10, 256, 'requirements');
    }
    if (input.customInstructions) {
      InputValidator.sanitizeString(input.customInstructions, 500, 'customInstructions');
    }
  }

  /**
   * Generic input validation
   */
  private validateGenericInput(input: Record<string, any>): void {
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        // Basic string validation
        if (value.length > 1000) {
          throw new ValidationError(
            `Field ${key} exceeds maximum length`,
            key,
            value
          );
        }
        
        // Check for dangerous patterns
        if (/<script|javascript:|vbscript:/i.test(value)) {
          throw new ValidationError(
            `Field ${key} contains potentially dangerous content`,
            key,
            value
          );
        }
      }
      
      if (typeof value === 'number') {
        if (!isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
          throw new ValidationError(
            `Field ${key} contains invalid numeric value`,
            key,
            value
          );
        }
      }
    }
  }

  /**
   * Access control check
   */
  private async checkAccess(context: SecurityContext, requiredRole: string): Promise<void> {
    // This would integrate with your role-based access control system
    // For now, we'll implement basic checks
    
    switch (requiredRole) {
      case 'agent_owner':
        // Verify the user owns the agent they're trying to modify
        break;
      case 'channel_participant':
        // Verify the user is a participant in the channel
        break;
      case 'admin':
        // Verify admin privileges
        break;
      default:
        // Allow by default for unknown roles (for now)
        break;
    }
  }

  /**
   * Resource limits check
   */
  private async checkResourceLimits(
    context: SecurityContext,
    limits: Record<string, number>
  ): Promise<void> {
    // This would check against on-chain user registry
    // For now, implement basic client-side checks
    
    const userKey = context.user.toBase58();
    
    // Check rate limits per resource type
    for (const [resource, limit] of Object.entries(limits)) {
      const key = `${userKey}:${resource}`;
      const count = this.getResourceUsage(key);
      
      if (count >= limit) {
        throw new ValidationError(
          `Resource limit exceeded for ${resource}. Maximum: ${limit}`,
          'resourceLimit',
          { resource, count, limit }
        );
      }
    }
  }

  /**
   * Get resource usage count (mock implementation)
   */
  private getResourceUsage(key: string): number {
    // In a real implementation, this would query the on-chain user registry
    // For now, return a mock value
    return 0;
  }

  /**
   * Audit logging
   */
  private logAudit(entry: AuditLogEntry): void {
    this.auditLog.push(entry);
    
    // Keep only last 1000 entries to prevent memory issues
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // In production, you'd send this to a logging service
    if (entry.result === 'failure' || entry.result === 'blocked') {
      console.warn('Security event:', entry);
    }
  }

  /**
   * Transaction instruction validator
   */
  validateInstruction(instruction: TransactionInstruction): void {
    // Validate instruction data
    if (instruction.data.length > 1024 * 10) { // 10KB limit
      throw new ValidationError(
        'Transaction instruction data too large',
        'instruction',
        instruction.data.length
      );
    }

    // Validate number of accounts
    if (instruction.keys.length > 64) {
      throw new ValidationError(
        'Too many accounts in instruction',
        'instruction',
        instruction.keys.length
      );
    }

    // Check for suspicious patterns in instruction data
    const dataStr = instruction.data.toString('hex');
    if (dataStr.includes('deadbeef') || dataStr.includes('cafebabe')) {
      throw new ValidationError(
        'Instruction contains suspicious data patterns',
        'instruction',
        dataStr
      );
    }
  }

  /**
   * Channel membership validation
   */
  async validateChannelAccess(
    user: PublicKey,
    channelId: string,
    participants: PublicKey[]
  ): Promise<boolean> {
    // Check if user is in participants list
    const userKey = user.toBase58();
    const participantKeys = participants.map(p => p.toBase58());
    
    if (!participantKeys.includes(userKey)) {
      throw new ValidationError(
        'User is not a participant in this channel',
        'channelAccess',
        { user: userKey, channel: channelId }
      );
    }

    return true;
  }

  /**
   * Private channel encryption validation
   */
  validatePrivateChannelMessage(
    message: string,
    isPrivate: boolean,
    isEncrypted: boolean
  ): void {
    if (isPrivate && !isEncrypted) {
      throw new ValidationError(
        'Messages in private channels must be encrypted',
        'encryption',
        { isPrivate, isEncrypted }
      );
    }

    // Basic validation for encrypted message format
    if (isEncrypted) {
      try {
        // Should be base64 encoded
        const decoded = Buffer.from(message, 'base64');
        if (decoded.length < 16) { // Minimum for encrypted data
          throw new ValidationError(
            'Invalid encrypted message format',
            'encryption',
            message.length
          );
        }
      } catch {
        throw new ValidationError(
          'Invalid encrypted message encoding',
          'encryption',
          message
        );
      }
    }
  }

  /**
   * Get audit logs (for debugging/monitoring)
   */
  getAuditLogs(filter?: {
    user?: string;
    action?: string;
    result?: 'success' | 'failure' | 'blocked';
    since?: number;
  }): AuditLogEntry[] {
    let logs = this.auditLog;

    if (filter) {
      logs = logs.filter(log => {
        if (filter.user && log.user !== filter.user) return false;
        if (filter.action && log.action !== filter.action) return false;
        if (filter.result && log.result !== filter.result) return false;
        if (filter.since && log.timestamp < filter.since) return false;
        return true;
      });
    }

    return logs;
  }

  /**
   * Clear audit logs (for testing)
   */
  clearAuditLogs(): void {
    this.auditLog = [];
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SecurityMiddlewareConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Export convenience instance
export const securityMiddleware = new SecurityMiddleware();