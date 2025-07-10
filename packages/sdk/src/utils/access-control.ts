/**
 * Access Control Module for GhostSpeak Protocol
 * 
 * Implements role-based access control, channel permissions,
 * and private channel encryption.
 */

import { PublicKey } from '@solana/web3.js';
import { ValidationError } from './input-validator';
import nacl from 'tweetnacl';

// Permission levels
export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
  OWNER = 'owner',
}

// Channel types
export enum ChannelType {
  DIRECT = 'direct',
  GROUP = 'group',
  PUBLIC = 'public',
  PRIVATE = 'private',
}

// Role definitions
export interface Role {
  id: string;
  name: string;
  permissions: Set<string>;
  level: PermissionLevel;
}

// Channel permission structure
export interface ChannelPermissions {
  channelId: string;
  channelType: ChannelType;
  isPrivate: boolean;
  owner: PublicKey;
  admins: PublicKey[];
  participants: PublicKey[];
  readOnlyParticipants?: PublicKey[];
  encryptionKey?: Uint8Array;
}

// User context for access checks
export interface UserContext {
  publicKey: PublicKey;
  roles: string[];
  permissions: Set<string>;
}

/**
 * Access control manager
 */
export class AccessControlManager {
  private roles: Map<string, Role> = new Map();
  private channelPermissions: Map<string, ChannelPermissions> = new Map();
  private userRoles: Map<string, string[]> = new Map();
  private encryptionKeys: Map<string, Uint8Array> = new Map();

  constructor() {
    this.initializeDefaultRoles();
  }

  /**
   * Initialize default roles
   */
  private initializeDefaultRoles(): void {
    // Agent owner role
    this.addRole({
      id: 'agent_owner',
      name: 'Agent Owner',
      permissions: new Set([
        'agent.update',
        'agent.delete',
        'agent.activate',
        'agent.deactivate',
        'listing.create',
        'listing.update',
        'listing.delete',
      ]),
      level: PermissionLevel.OWNER,
    });

    // Channel admin role
    this.addRole({
      id: 'channel_admin',
      name: 'Channel Administrator',
      permissions: new Set([
        'channel.manage',
        'channel.add_participants',
        'channel.remove_participants',
        'channel.delete',
        'message.moderate',
      ]),
      level: PermissionLevel.ADMIN,
    });

    // Channel participant role
    this.addRole({
      id: 'channel_participant',
      name: 'Channel Participant',
      permissions: new Set([
        'channel.read',
        'message.send',
        'message.read',
      ]),
      level: PermissionLevel.WRITE,
    });

    // Read-only participant role
    this.addRole({
      id: 'channel_readonly',
      name: 'Read-Only Participant',
      permissions: new Set([
        'channel.read',
        'message.read',
      ]),
      level: PermissionLevel.READ,
    });

    // Marketplace participant role
    this.addRole({
      id: 'marketplace_user',
      name: 'Marketplace User',
      permissions: new Set([
        'service.purchase',
        'job.apply',
        'escrow.create',
        'payment.process',
      ]),
      level: PermissionLevel.WRITE,
    });
  }

  /**
   * Add a new role
   */
  addRole(role: Role): void {
    this.roles.set(role.id, role);
  }

  /**
   * Assign role to user
   */
  assignRole(userKey: PublicKey, roleId: string): void {
    const userKeyStr = userKey.toBase58();
    const currentRoles = this.userRoles.get(userKeyStr) || [];
    
    if (!currentRoles.includes(roleId)) {
      currentRoles.push(roleId);
      this.userRoles.set(userKeyStr, currentRoles);
    }
  }

  /**
   * Remove role from user
   */
  removeRole(userKey: PublicKey, roleId: string): void {
    const userKeyStr = userKey.toBase58();
    const currentRoles = this.userRoles.get(userKeyStr) || [];
    const filteredRoles = currentRoles.filter(r => r !== roleId);
    this.userRoles.set(userKeyStr, filteredRoles);
  }

  /**
   * Get user context with roles and permissions
   */
  getUserContext(userKey: PublicKey): UserContext {
    const userKeyStr = userKey.toBase58();
    const userRoles = this.userRoles.get(userKeyStr) || [];
    const permissions = new Set<string>();

    // Aggregate permissions from all roles
    for (const roleId of userRoles) {
      const role = this.roles.get(roleId);
      if (role) {
        for (const permission of role.permissions) {
          permissions.add(permission);
        }
      }
    }

    return {
      publicKey: userKey,
      roles: userRoles,
      permissions,
    };
  }

  /**
   * Check if user has permission
   */
  hasPermission(userKey: PublicKey, permission: string): boolean {
    const context = this.getUserContext(userKey);
    return context.permissions.has(permission);
  }

  /**
   * Set channel permissions
   */
  setChannelPermissions(permissions: ChannelPermissions): void {
    this.channelPermissions.set(permissions.channelId, permissions);
    
    // Store encryption key if provided
    if (permissions.encryptionKey) {
      this.encryptionKeys.set(permissions.channelId, permissions.encryptionKey);
    }
  }

  /**
   * Get channel permissions
   */
  getChannelPermissions(channelId: string): ChannelPermissions | undefined {
    return this.channelPermissions.get(channelId);
  }

  /**
   * Check channel access
   */
  checkChannelAccess(
    userKey: PublicKey,
    channelId: string,
    action: string
  ): boolean {
    const permissions = this.getChannelPermissions(channelId);
    if (!permissions) {
      throw new ValidationError(
        'Channel not found or permissions not configured',
        'channelAccess',
        channelId
      );
    }

    const userKeyStr = userKey.toBase58();
    const ownerStr = permissions.owner.toBase58();
    const adminStrs = permissions.admins.map(a => a.toBase58());
    const participantStrs = permissions.participants.map(p => p.toBase58());
    const readOnlyStrs = permissions.readOnlyParticipants?.map(p => p.toBase58()) || [];

    // Owner has all permissions
    if (userKeyStr === ownerStr) {
      return true;
    }

    // Check admin permissions
    if (adminStrs.includes(userKeyStr)) {
      return this.checkAdminPermission(action);
    }

    // Check participant permissions
    if (participantStrs.includes(userKeyStr)) {
      return this.checkParticipantPermission(action);
    }

    // Check read-only permissions
    if (readOnlyStrs.includes(userKeyStr)) {
      return this.checkReadOnlyPermission(action);
    }

    // Public channels allow read access to anyone
    if (permissions.channelType === ChannelType.PUBLIC && action === 'read') {
      return true;
    }

    return false;
  }

  /**
   * Check admin permission for action
   */
  private checkAdminPermission(action: string): boolean {
    const adminActions = [
      'read', 'write', 'manage', 'add_participants', 
      'remove_participants', 'moderate'
    ];
    return adminActions.includes(action);
  }

  /**
   * Check participant permission for action
   */
  private checkParticipantPermission(action: string): boolean {
    const participantActions = ['read', 'write'];
    return participantActions.includes(action);
  }

  /**
   * Check read-only permission for action
   */
  private checkReadOnlyPermission(action: string): boolean {
    return action === 'read';
  }

  /**
   * Validate channel membership
   */
  validateChannelMembership(
    userKey: PublicKey,
    channelId: string,
    requiredAction = 'read'
  ): void {
    if (!this.checkChannelAccess(userKey, channelId, requiredAction)) {
      throw new ValidationError(
        `Access denied: User does not have ${requiredAction} permission for channel`,
        'channelAccess',
        {
          user: userKey.toBase58(),
          channel: channelId,
          action: requiredAction,
        }
      );
    }
  }

  /**
   * Generate encryption key for private channel
   */
  generateChannelEncryptionKey(): Uint8Array {
    return nacl.randomBytes(32); // 256-bit key
  }

  /**
   * Encrypt message for private channel
   */
  encryptMessage(channelId: string, message: string): string {
    const encryptionKey = this.encryptionKeys.get(channelId);
    if (!encryptionKey) {
      throw new ValidationError(
        'Encryption key not found for private channel',
        'encryption',
        channelId
      );
    }

    const nonce = nacl.randomBytes(24);
    const messageBytes = new TextEncoder().encode(message);
    const encrypted = nacl.secretbox(messageBytes, nonce, encryptionKey);

    // Combine nonce and encrypted data
    const combined = new Uint8Array(nonce.length + encrypted.length);
    combined.set(nonce);
    combined.set(encrypted, nonce.length);

    return Buffer.from(combined).toString('base64');
  }

  /**
   * Decrypt message from private channel
   */
  decryptMessage(channelId: string, encryptedMessage: string): string {
    const encryptionKey = this.encryptionKeys.get(channelId);
    if (!encryptionKey) {
      throw new ValidationError(
        'Encryption key not found for private channel',
        'encryption',
        channelId
      );
    }

    try {
      const combined = Buffer.from(encryptedMessage, 'base64');
      const nonce = combined.slice(0, 24);
      const encrypted = combined.slice(24);

      const decrypted = nacl.secretbox.open(encrypted, nonce, encryptionKey);
      if (!decrypted) {
        throw new Error('Decryption failed');
      }

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      throw new ValidationError(
        'Failed to decrypt message',
        'encryption',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Add participant to channel
   */
  addChannelParticipant(
    channelId: string,
    adminKey: PublicKey,
    newParticipant: PublicKey,
    isReadOnly = false
  ): void {
    // Check admin permission
    this.validateChannelMembership(adminKey, channelId, 'manage');

    const permissions = this.getChannelPermissions(channelId);
    if (!permissions) {
      throw new ValidationError('Channel not found', 'channelAccess', channelId);
    }

    const newParticipantStr = newParticipant.toBase58();

    if (isReadOnly) {
      if (!permissions.readOnlyParticipants) {
        permissions.readOnlyParticipants = [];
      }
      if (!permissions.readOnlyParticipants.some(p => p.toBase58() === newParticipantStr)) {
        permissions.readOnlyParticipants.push(newParticipant);
      }
    } else {
      if (!permissions.participants.some(p => p.toBase58() === newParticipantStr)) {
        permissions.participants.push(newParticipant);
      }
    }

    this.setChannelPermissions(permissions);
  }

  /**
   * Remove participant from channel
   */
  removeChannelParticipant(
    channelId: string,
    adminKey: PublicKey,
    participant: PublicKey
  ): void {
    // Check admin permission
    this.validateChannelMembership(adminKey, channelId, 'manage');

    const permissions = this.getChannelPermissions(channelId);
    if (!permissions) {
      throw new ValidationError('Channel not found', 'channelAccess', channelId);
    }

    const participantStr = participant.toBase58();

    // Remove from participants
    permissions.participants = permissions.participants.filter(
      p => p.toBase58() !== participantStr
    );

    // Remove from read-only participants
    if (permissions.readOnlyParticipants) {
      permissions.readOnlyParticipants = permissions.readOnlyParticipants.filter(
        p => p.toBase58() !== participantStr
      );
    }

    // Remove from admins (but not owner)
    permissions.admins = permissions.admins.filter(
      a => a.toBase58() !== participantStr
    );

    this.setChannelPermissions(permissions);
  }

  /**
   * Create new channel with permissions
   */
  createChannel(
    channelId: string,
    owner: PublicKey,
    channelType: ChannelType,
    isPrivate: boolean,
    initialParticipants: PublicKey[] = []
  ): ChannelPermissions {
    let encryptionKey: Uint8Array | undefined;
    
    if (isPrivate) {
      encryptionKey = this.generateChannelEncryptionKey();
    }

    const permissions: ChannelPermissions = {
      channelId,
      channelType,
      isPrivate,
      owner,
      admins: [owner], // Owner is always an admin
      participants: [owner, ...initialParticipants],
      readOnlyParticipants: [],
      encryptionKey,
    };

    this.setChannelPermissions(permissions);
    return permissions;
  }

  /**
   * Validate private channel message requirements
   */
  validatePrivateChannelMessage(
    channelId: string,
    message: string,
    isEncrypted: boolean
  ): void {
    const permissions = this.getChannelPermissions(channelId);
    if (!permissions) {
      throw new ValidationError('Channel not found', 'channelAccess', channelId);
    }

    if (permissions.isPrivate && !isEncrypted) {
      throw new ValidationError(
        'Messages in private channels must be encrypted',
        'encryption',
        { channelId, isPrivate: permissions.isPrivate, isEncrypted }
      );
    }

    if (isEncrypted && !permissions.isPrivate) {
      throw new ValidationError(
        'Encrypted messages can only be sent in private channels',
        'encryption',
        { channelId, isPrivate: permissions.isPrivate, isEncrypted }
      );
    }
  }

  /**
   * Get user's accessible channels
   */
  getUserChannels(userKey: PublicKey): string[] {
    const userKeyStr = userKey.toBase58();
    const accessibleChannels: string[] = [];

    for (const [channelId, permissions] of this.channelPermissions.entries()) {
      const ownerStr = permissions.owner.toBase58();
      const participantStrs = permissions.participants.map(p => p.toBase58());
      const readOnlyStrs = permissions.readOnlyParticipants?.map(p => p.toBase58()) || [];

      if (
        userKeyStr === ownerStr ||
        participantStrs.includes(userKeyStr) ||
        readOnlyStrs.includes(userKeyStr) ||
        permissions.channelType === ChannelType.PUBLIC
      ) {
        accessibleChannels.push(channelId);
      }
    }

    return accessibleChannels;
  }

  /**
   * Clear all permissions (for testing)
   */
  clearPermissions(): void {
    this.channelPermissions.clear();
    this.userRoles.clear();
    this.encryptionKeys.clear();
  }
}

// Export singleton instance
export const accessControl = new AccessControlManager();