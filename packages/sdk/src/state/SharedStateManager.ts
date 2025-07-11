/**
 * SharedStateManager - Unified state management for CLI and SDK
 * 
 * This module provides a shared state management system with real-time
 * synchronization between CLI and SDK operations.
 */

import { EventEmitter } from 'events';
import { existsSync } from 'fs';
import { readFile, writeFile, mkdir, watch } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type { Address } from '@solana/addresses';
import type { TransactionSignature } from '@solana/web3.js';

export interface TransactionRecord {
  signature: TransactionSignature;
  type: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
  details?: any;
}

export interface SessionState {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  activeAgent?: string;
  activeChannel?: string;
  pendingTransactions: TransactionRecord[];
  completedTransactions: TransactionRecord[];
}

export interface RuntimeState {
  sessions: Record<string, SessionState>;
  currentSessionId?: string;
  globalStats: {
    totalTransactions: number;
    totalAgentsCreated: number;
    totalChannelsCreated: number;
    totalMessagessSent: number;
  };
}

export interface StateChangeEvent {
  type: 'session' | 'transaction' | 'agent' | 'channel' | 'global';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
}

export class SharedStateManager extends EventEmitter {
  private static instance: SharedStateManager | null = null;
  private state: RuntimeState;
  private readonly statePath: string;
  private fileWatcher: any = null;
  private saveTimeout: NodeJS.Timeout | null = null;
  
  private constructor(state: RuntimeState, statePath: string) {
    super();
    this.state = state;
    this.statePath = statePath;
  }
  
  /**
   * Get or create the shared state manager instance
   */
  static async getInstance(customPath?: string): Promise<SharedStateManager> {
    if (SharedStateManager.instance) {
      return SharedStateManager.instance;
    }
    
    const statePath = customPath || join(homedir(), '.ghostspeak', 'runtime-state.json');
    
    try {
      let state: RuntimeState;
      
      if (existsSync(statePath)) {
        const stateData = await readFile(statePath, 'utf8');
        state = JSON.parse(stateData, (key, value) => {
          // Handle Date deserialization
          if ((key === 'startTime' || key === 'lastActivity' || key === 'timestamp') && typeof value === 'string') {
            return new Date(value);
          }
          return value;
        });
      } else {
        state = createDefaultState();
        
        // Create state directory
        const stateDir = dirname(statePath);
        if (!existsSync(stateDir)) {
          await mkdir(stateDir, { recursive: true });
        }
        
        // Save initial state
        await writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');
      }
      
      SharedStateManager.instance = new SharedStateManager(state, statePath);
      
      // Start file watching for cross-process synchronization
      await SharedStateManager.instance.startFileWatching();
      
      return SharedStateManager.instance;
    } catch (error) {
      console.error('Error loading shared state:', error);
      const defaultState = createDefaultState();
      SharedStateManager.instance = new SharedStateManager(defaultState, statePath);
      return SharedStateManager.instance;
    }
  }
  
  /**
   * Start or get current session
   */
  async startSession(): Promise<string> {
    const sessionId = generateSessionId();
    const session: SessionState = {
      sessionId,
      startTime: new Date(),
      lastActivity: new Date(),
      pendingTransactions: [],
      completedTransactions: [],
    };
    
    this.state.sessions[sessionId] = session;
    this.state.currentSessionId = sessionId;
    
    await this.save();
    this.emit('stateChange', {
      type: 'session',
      action: 'create',
      data: session,
      timestamp: new Date(),
    } as StateChangeEvent);
    
    return sessionId;
  }
  
  /**
   * Get current session
   */
  getCurrentSession(): SessionState | null {
    if (!this.state.currentSessionId) {
      return null;
    }
    
    return this.state.sessions[this.state.currentSessionId] || null;
  }
  
  /**
   * Update session activity
   */
  async updateSessionActivity(): Promise<void> {
    const session = this.getCurrentSession();
    if (session) {
      session.lastActivity = new Date();
      await this.save();
    }
  }
  
  /**
   * Set active agent
   */
  async setActiveAgent(agentName: string): Promise<void> {
    const session = this.getCurrentSession();
    if (session) {
      session.activeAgent = agentName;
      await this.save();
      this.emit('stateChange', {
        type: 'agent',
        action: 'update',
        data: { agentName },
        timestamp: new Date(),
      } as StateChangeEvent);
    }
  }
  
  /**
   * Set active channel
   */
  async setActiveChannel(channelName: string): Promise<void> {
    const session = this.getCurrentSession();
    if (session) {
      session.activeChannel = channelName;
      await this.save();
      this.emit('stateChange', {
        type: 'channel',
        action: 'update',
        data: { channelName },
        timestamp: new Date(),
      } as StateChangeEvent);
    }
  }
  
  /**
   * Add pending transaction
   */
  async addPendingTransaction(transaction: Omit<TransactionRecord, 'status'>): Promise<void> {
    const session = this.getCurrentSession();
    if (session) {
      const txRecord: TransactionRecord = {
        ...transaction,
        status: 'pending',
      };
      
      session.pendingTransactions.push(txRecord);
      await this.save();
      
      this.emit('stateChange', {
        type: 'transaction',
        action: 'create',
        data: txRecord,
        timestamp: new Date(),
      } as StateChangeEvent);
    }
  }
  
  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    signature: TransactionSignature,
    status: 'confirmed' | 'failed'
  ): Promise<void> {
    const session = this.getCurrentSession();
    if (session) {
      const txIndex = session.pendingTransactions.findIndex(
        tx => tx.signature === signature
      );
      
      if (txIndex !== -1) {
        const transaction = session.pendingTransactions[txIndex];
        transaction.status = status;
        
        // Move to completed transactions
        session.pendingTransactions.splice(txIndex, 1);
        session.completedTransactions.push(transaction);
        
        await this.save();
        
        this.emit('stateChange', {
          type: 'transaction',
          action: 'update',
          data: transaction,
          timestamp: new Date(),
        } as StateChangeEvent);
      }
    }
  }
  
  /**
   * Increment global statistics
   */
  async incrementStats(stat: keyof RuntimeState['globalStats']): Promise<void> {
    this.state.globalStats[stat]++;
    await this.save();
    
    this.emit('stateChange', {
      type: 'global',
      action: 'update',
      data: { stat, value: this.state.globalStats[stat] },
      timestamp: new Date(),
    } as StateChangeEvent);
  }
  
  /**
   * Get current state
   */
  getState(): RuntimeState {
    return JSON.parse(JSON.stringify(this.state));
  }
  
  /**
   * Save state with debouncing
   */
  private async save(): Promise<void> {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Debounce saves to avoid excessive disk writes
    this.saveTimeout = setTimeout(async () => {
      try {
        await writeFile(
          this.statePath,
          JSON.stringify(this.state, null, 2),
          'utf8'
        );
      } catch (error) {
        console.error('Error saving shared state:', error);
      }
    }, 100);
  }
  
  /**
   * Start file watching for cross-process synchronization
   */
  private async startFileWatching(): Promise<void> {
    try {
      // Watch for external changes to the state file
      const watcher = watch(this.statePath);
      
      (async () => {
        for await (const event of watcher) {
          if (event.eventType === 'change') {
            await this.reloadState();
          }
        }
      })();
      
      this.fileWatcher = watcher;
    } catch (error) {
      console.error('Error starting file watcher:', error);
    }
  }
  
  /**
   * Reload state from disk
   */
  private async reloadState(): Promise<void> {
    try {
      if (existsSync(this.statePath)) {
        const stateData = await readFile(this.statePath, 'utf8');
        const newState = JSON.parse(stateData, (key, value) => {
          if ((key === 'startTime' || key === 'lastActivity' || key === 'timestamp') && typeof value === 'string') {
            return new Date(value);
          }
          return value;
        });
        
        // Check if state actually changed
        if (JSON.stringify(this.state) !== JSON.stringify(newState)) {
          this.state = newState;
          this.emit('stateReloaded', this.state);
        }
      }
    } catch (error) {
      console.error('Error reloading state:', error);
    }
  }
  
  /**
   * Clean up old sessions
   */
  async cleanupOldSessions(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const now = new Date().getTime();
    const sessionsToDelete: string[] = [];
    
    for (const [sessionId, session] of Object.entries(this.state.sessions)) {
      if (now - session.lastActivity.getTime() > maxAge) {
        sessionsToDelete.push(sessionId);
      }
    }
    
    for (const sessionId of sessionsToDelete) {
      delete this.state.sessions[sessionId];
    }
    
    if (sessionsToDelete.length > 0) {
      await this.save();
    }
  }
  
  /**
   * Destroy the state manager
   */
  async destroy(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    if (this.fileWatcher) {
      this.fileWatcher.close();
    }
    
    this.removeAllListeners();
    SharedStateManager.instance = null;
  }
}

// Helper functions
function createDefaultState(): RuntimeState {
  return {
    sessions: {},
    globalStats: {
      totalTransactions: 0,
      totalAgentsCreated: 0,
      totalChannelsCreated: 0,
      totalMessagessSent: 0,
    },
  };
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default SharedStateManager;