/**
 * GhostSpeak Protocol Debugging and Runtime Inspection Tools
 * 
 * Provides comprehensive debugging capabilities for smart contract development,
 * transaction analysis, and runtime inspection of agent behavior.
 */

import { Connection, PublicKey, Transaction, TransactionSignature, TransactionInstruction } from '@solana/web3.js';
import { Program, AnchorProvider, Idl, BN } from '@project-serum/anchor';

export interface DebugConfig {
  /** Enable verbose logging */
  verbose: boolean;
  /** Log transaction details */
  logTransactions: boolean;
  /** Log account changes */
  logAccountChanges: boolean;
  /** Log program invocations */
  logProgramInvocations: boolean;
  /** Enable performance monitoring */
  enablePerformanceMonitoring: boolean;
  /** Custom log handler */
  logHandler?: (level: LogLevel, message: string, data?: any) => void;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface TransactionDebugInfo {
  signature: string;
  instructions: InstructionDebugInfo[];
  accounts: AccountChangeInfo[];
  computeUnitsUsed: number;
  logs: string[];
  success: boolean;
  error?: string;
  performanceMetrics: PerformanceMetrics;
}

export interface InstructionDebugInfo {
  programId: string;
  instructionName?: string;
  accounts: string[];
  data: string;
  computeUnitsConsumed: number;
}

export interface AccountChangeInfo {
  address: string;
  before: AccountSnapshot | null;
  after: AccountSnapshot | null;
  lamportChange: number;
}

export interface AccountSnapshot {
  lamports: number;
  owner: string;
  data: string;
  executable: boolean;
  rentEpoch: number;
}

export interface PerformanceMetrics {
  totalTime: number;
  networkTime: number;
  computeTime: number;
  instructionTimes: number[];
}

export interface AgentDebugInfo {
  agentId: string;
  currentState: any;
  messageQueue: MessageDebugInfo[];
  performanceStats: AgentPerformanceStats;
  errorHistory: ErrorInfo[];
}

export interface MessageDebugInfo {
  id: string;
  type: string;
  sender: string;
  recipient: string;
  timestamp: number;
  processed: boolean;
  processingTime?: number;
  error?: string;
}

export interface AgentPerformanceStats {
  messagesProcessed: number;
  averageProcessingTime: number;
  errorRate: number;
  uptime: number;
  lastActivity: number;
}

export interface ErrorInfo {
  timestamp: number;
  error: string;
  context: any;
  stackTrace?: string;
}

class GhostSpeakDebugger {
  private connection: Connection;
  private config: DebugConfig;
  private transactionHistory: Map<string, TransactionDebugInfo> = new Map();
  private agentStates: Map<string, AgentDebugInfo> = new Map();
  private performanceMonitor: PerformanceMonitor;

  constructor(connection: Connection, config: Partial<DebugConfig> = {}) {
    this.connection = connection;
    this.config = {
      verbose: false,
      logTransactions: true,
      logAccountChanges: true,
      logProgramInvocations: true,
      enablePerformanceMonitoring: true,
      ...config
    };
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Debug a transaction execution
   */
  async debugTransaction(
    transaction: Transaction,
    signers?: any[]
  ): Promise<TransactionDebugInfo> {
    const startTime = performance.now();

    this.log('info', 'Starting transaction debug', {
      instructions: transaction.instructions.length,
      signers: signers?.length || 0
    });

    try {
      // Get account states before transaction
      const beforeStates = await this.captureAccountStates(transaction);

      // Send transaction
      const signature = await this.connection.sendTransaction(transaction, signers || []);
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature);
      
      // Get transaction details
      const txDetails = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      // Get account states after transaction
      const afterStates = await this.captureAccountStates(transaction);

      // Analyze instruction execution
      const instructionDebugInfo = await this.analyzeInstructions(
        transaction.instructions,
        txDetails?.meta?.logMessages || []
      );

      // Calculate performance metrics
      const endTime = performance.now();
      const performanceMetrics: PerformanceMetrics = {
        totalTime: endTime - startTime,
        networkTime: 0, // TODO: Measure network time
        computeTime: txDetails?.meta?.computeUnitsConsumed || 0,
        instructionTimes: [] // TODO: Measure individual instruction times
      };

      // Create debug info
      const debugInfo: TransactionDebugInfo = {
        signature,
        instructions: instructionDebugInfo,
        accounts: this.calculateAccountChanges(beforeStates, afterStates),
        computeUnitsUsed: txDetails?.meta?.computeUnitsConsumed || 0,
        logs: txDetails?.meta?.logMessages || [],
        success: !confirmation.value.err,
        error: confirmation.value.err ? JSON.stringify(confirmation.value.err) : undefined,
        performanceMetrics
      };

      // Store in history
      this.transactionHistory.set(signature, debugInfo);

      this.log('info', 'Transaction debug completed', {
        signature,
        success: debugInfo.success,
        computeUnits: debugInfo.computeUnitsUsed
      });

      return debugInfo;

    } catch (error) {
      this.log('error', 'Transaction debug failed', error);
      throw error;
    }
  }

  /**
   * Monitor agent runtime behavior
   */
  startAgentMonitoring(agentId: string): AgentMonitor {
    const monitor = new AgentMonitor(agentId, this);
    this.agentStates.set(agentId, {
      agentId,
      currentState: {},
      messageQueue: [],
      performanceStats: {
        messagesProcessed: 0,
        averageProcessingTime: 0,
        errorRate: 0,
        uptime: Date.now(),
        lastActivity: Date.now()
      },
      errorHistory: []
    });

    return monitor;
  }

  /**
   * Inspect program account data
   */
  async inspectAccount(address: PublicKey, program?: Program): Promise<any> {
    try {
      const accountInfo = await this.connection.getAccountInfo(address);
      
      if (!accountInfo) {
        this.log('warn', 'Account not found', { address: address.toBase58() });
        return null;
      }

      let decodedData = null;
      if (program && accountInfo.data.length > 0) {
        try {
          // Try to decode using program IDL
          decodedData = program.coder.accounts.decode(
            'AgentAccount', // This would need to be dynamic
            accountInfo.data
          );
        } catch (error) {
          this.log('warn', 'Failed to decode account data', error);
        }
      }

      const inspection = {
        address: address.toBase58(),
        lamports: accountInfo.lamports,
        owner: accountInfo.owner.toBase58(),
        executable: accountInfo.executable,
        rentEpoch: accountInfo.rentEpoch,
        dataLength: accountInfo.data.length,
        decodedData,
        rawData: accountInfo.data.toString('base64')
      };

      this.log('debug', 'Account inspection', inspection);
      return inspection;

    } catch (error) {
      this.log('error', 'Account inspection failed', error);
      throw error;
    }
  }

  /**
   * Analyze compute unit usage
   */
  async analyzeComputeUnits(
    instructions: TransactionInstruction[]
  ): Promise<ComputeAnalysis> {
    const analysis: ComputeAnalysis = {
      estimatedUnits: 0,
      breakdown: [],
      recommendations: []
    };

    for (let i = 0; i < instructions.length; i++) {
      const instruction = instructions[i];
      const estimate = this.estimateInstructionCost(instruction);
      
      analysis.breakdown.push({
        index: i,
        programId: instruction.programId.toBase58(),
        estimatedCost: estimate,
        accounts: instruction.keys.length,
        dataSize: instruction.data.length
      });

      analysis.estimatedUnits += estimate;
    }

    // Generate recommendations
    if (analysis.estimatedUnits > 200000) {
      analysis.recommendations.push('Consider splitting transaction to reduce compute units');
    }

    if (analysis.breakdown.some(b => b.accounts > 10)) {
      analysis.recommendations.push('Some instructions use many accounts, consider optimization');
    }

    return analysis;
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(): TransactionDebugInfo[] {
    return Array.from(this.transactionHistory.values());
  }

  /**
   * Get agent debug information
   */
  getAgentDebugInfo(agentId: string): AgentDebugInfo | undefined {
    return this.agentStates.get(agentId);
  }

  /**
   * Clear debug history
   */
  clearHistory(): void {
    this.transactionHistory.clear();
    this.agentStates.clear();
  }

  private async captureAccountStates(transaction: Transaction): Promise<Map<string, AccountSnapshot>> {
    const states = new Map<string, AccountSnapshot>();
    const addresses = new Set<string>();

    // Collect all unique addresses from transaction
    transaction.instructions.forEach(ix => {
      ix.keys.forEach(key => {
        addresses.add(key.pubkey.toBase58());
      });
    });

    // Fetch account info for all addresses
    const accountInfos = await this.connection.getMultipleAccountsInfo(
      Array.from(addresses).map(addr => new PublicKey(addr))
    );

    accountInfos.forEach((info, index) => {
      const address = Array.from(addresses)[index];
      if (info) {
        states.set(address, {
          lamports: info.lamports,
          owner: info.owner.toBase58(),
          data: info.data.toString('base64'),
          executable: info.executable,
          rentEpoch: info.rentEpoch
        });
      }
    });

    return states;
  }

  private calculateAccountChanges(
    before: Map<string, AccountSnapshot>,
    after: Map<string, AccountSnapshot>
  ): AccountChangeInfo[] {
    const changes: AccountChangeInfo[] = [];
    const allAddresses = new Set([...before.keys(), ...after.keys()]);

    allAddresses.forEach(address => {
      const beforeState = before.get(address) || null;
      const afterState = after.get(address) || null;
      
      if (!beforeState && !afterState) return;

      const lamportChange = (afterState?.lamports || 0) - (beforeState?.lamports || 0);

      changes.push({
        address,
        before: beforeState,
        after: afterState,
        lamportChange
      });
    });

    return changes.filter(change => 
      change.lamportChange !== 0 || 
      change.before?.data !== change.after?.data
    );
  }

  private async analyzeInstructions(
    instructions: TransactionInstruction[],
    logs: string[]
  ): Promise<InstructionDebugInfo[]> {
    return instructions.map((ix, index) => ({
      programId: ix.programId.toBase58(),
      instructionName: this.parseInstructionName(ix, logs),
      accounts: ix.keys.map(key => key.pubkey.toBase58()),
      data: ix.data.toString('base64'),
      computeUnitsConsumed: this.parseComputeUnits(logs, index)
    }));
  }

  private parseInstructionName(instruction: TransactionInstruction, logs: string[]): string | undefined {
    // Try to parse instruction name from logs
    // This is a simplified implementation
    return undefined;
  }

  private parseComputeUnits(logs: string[], instructionIndex: number): number {
    // Parse compute units from logs for specific instruction
    // This is a simplified implementation
    return 0;
  }

  private estimateInstructionCost(instruction: TransactionInstruction): number {
    // Rough estimates based on instruction complexity
    const baseAccountCost = 100;
    const accountCost = instruction.keys.length * baseAccountCost;
    const dataCost = instruction.data.length * 10;
    
    return 5000 + accountCost + dataCost; // Base instruction cost
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (this.config.logHandler) {
      this.config.logHandler(level, message, data);
    } else if (this.config.verbose) {
      console.log(`[${level.toUpperCase()}] ${message}`, data);
    }
  }
}

interface ComputeAnalysis {
  estimatedUnits: number;
  breakdown: {
    index: number;
    programId: string;
    estimatedCost: number;
    accounts: number;
    dataSize: number;
  }[];
  recommendations: string[];
}

class AgentMonitor {
  constructor(
    private agentId: string,
    private debugInstance: GhostSpeakDebugger
  ) {}

  logMessage(message: MessageDebugInfo): void {
    const agentInfo = this.debugInstance.getAgentDebugInfo(this.agentId);
    if (agentInfo) {
      agentInfo.messageQueue.push(message);
      agentInfo.performanceStats.messagesProcessed++;
      agentInfo.performanceStats.lastActivity = Date.now();
    }
  }

  logError(error: string, context: any): void {
    const agentInfo = this.debugInstance.getAgentDebugInfo(this.agentId);
    if (agentInfo) {
      agentInfo.errorHistory.push({
        timestamp: Date.now(),
        error,
        context
      });
    }
  }

  updateState(state: any): void {
    const agentInfo = this.debugInstance.getAgentDebugInfo(this.agentId);
    if (agentInfo) {
      agentInfo.currentState = state;
    }
  }
}

class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(id: string): void {
    if (!this.measurements.has(id)) {
      this.measurements.set(id, []);
    }
    this.measurements.get(id)!.push(performance.now());
  }

  endMeasurement(id: string): number {
    const times = this.measurements.get(id);
    if (!times || times.length === 0) {
      throw new Error(`No measurement started for ${id}`);
    }

    const startTime = times.pop()!;
    return performance.now() - startTime;
  }

  getAverageTime(id: string): number {
    const times = this.measurements.get(id);
    if (!times || times.length === 0) return 0;

    const completedMeasurements = Math.floor(times.length / 2) * 2;
    const durations: number[] = [];

    for (let i = 0; i < completedMeasurements; i += 2) {
      durations.push(times[i + 1] - times[i]);
    }

    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  }
}

/**
 * Create a debugger instance
 */
export function createDebugger(connection: Connection, config?: Partial<DebugConfig>): GhostSpeakDebugger {
  return new GhostSpeakDebugger(connection, config);
}

export { GhostSpeakDebugger, AgentMonitor, PerformanceMonitor };