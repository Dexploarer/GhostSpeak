import { z } from 'zod';
import { Address } from '@solana/addresses';

// ElizaOS Core Interfaces (simplified based on available documentation)
export interface IAgentRuntime {
  getSetting(key: string): string | undefined;
  character: {
    name: string;
    username?: string;
    [key: string]: any;
  };
  databaseAdapter: any;
  messageManager: any;
  [key: string]: any;
}

export interface Message {
  id?: string;
  userId: string;
  content: {
    text: string;
    action?: string;
    source?: string;
    [key: string]: any;
  };
  roomId: string;
  agentId?: string;
  createdAt?: number;
}

export interface State {
  userId?: string;
  roomId?: string;
  agentId?: string;
  bio?: string;
  lore?: string;
  messageDirections?: string;
  postDirections?: string;
  recentMessages?: string;
  recentMessagesData?: Message[];
  [key: string]: any;
}

export interface Action {
  name: string;
  description: string;
  examples: Array<Array<{
    user: string;
    content: { text: string; action?: string };
  }>>;
  similes?: string[];
  validate: (runtime: IAgentRuntime, message: Message, state?: State) => Promise<boolean>;
  handler: (runtime: IAgentRuntime, message: Message, state?: State) => Promise<{
    success: boolean;
    response?: any;
    error?: string;
  }>;
}

export interface Provider {
  name: string;
  description: string;
  get: (runtime: IAgentRuntime, message?: Message, state?: State) => Promise<string>;
}

export interface Service {
  name: string;
  description: string;
  initialize: (runtime: IAgentRuntime) => Promise<void>;
  cleanup?: () => Promise<void>;
  health?: () => Promise<boolean>;
}

export interface Evaluator {
  name: string;
  description: string;
  similes?: string[];
  examples?: Array<Array<{
    user: string;
    content: { text: string };
  }>>;
  validate: (runtime: IAgentRuntime, message: Message, state?: State) => Promise<boolean>;
  handler: (runtime: IAgentRuntime, message: Message, state?: State) => Promise<{
    success: boolean;
    data?: any;
    confidence?: number;
  }>;
}

export interface Plugin {
  name: string;
  description: string;
  actions?: Action[];
  providers?: Provider[];
  services?: Service[];
  evaluators?: Evaluator[];
  initialize?: (runtime: IAgentRuntime) => Promise<void>;
}

// GhostSpeak Plugin Configuration
export const GhostSpeakConfigSchema = z.object({
  SOLANA_RPC_URL: z.string().url().default('https://api.devnet.solana.com'),
  SOLANA_WALLET_PRIVATE_KEY: z.string().min(1, 'Wallet private key is required'),
  GHOSTSPEAK_PROGRAM_ID: z.string().default('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP'),
  GHOSTSPEAK_NETWORK: z.enum(['devnet', 'testnet', 'mainnet-beta']).default('devnet'),
  LIGHT_RPC_URL: z.string().url().optional(),
  PHOTON_INDEXER_URL: z.string().url().optional(),
});

export type GhostSpeakConfig = z.infer<typeof GhostSpeakConfigSchema>;

// GhostSpeak Protocol Types
export interface AgentInfo {
  id: Address;
  name: string;
  description: string;
  metadata: string;
  owner: Address;
  isActive: boolean;
  reputation: number;
  totalJobs: number;
  successfulJobs: number;
  createdAt: number;
}

export interface ServiceListing {
  id: Address;
  agentId: Address;
  title: string;
  description: string;
  price: number;
  category: string;
  isActive: boolean;
  metadata: string;
  createdAt: number;
}

export interface JobPosting {
  id: Address;
  clientId: Address;
  title: string;
  description: string;
  budget: number;
  deadline: number;
  category: string;
  isActive: boolean;
  metadata: string;
  createdAt: number;
}

export interface WorkOrder {
  id: Address;
  jobPostingId: Address;
  serviceListingId?: Address;
  clientId: Address;
  agentId: Address;
  amount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  createdAt: number;
  completedAt?: number;
}

export interface ChannelInfo {
  id: Address;
  name: string;
  description: string;
  participants: Address[];
  isPublic: boolean;
  createdAt: number;
}

export interface MessageInfo {
  id: Address;
  channelId: Address;
  senderId: Address;
  content: string;
  timestamp: number;
  messageType: 'text' | 'file' | 'system';
}

export interface PaymentInfo {
  id: Address;
  fromAddress: Address;
  toAddress: Address;
  amount: number;
  token: Address;
  status: 'pending' | 'completed' | 'failed';
  workOrderId?: Address;
  timestamp: number;
}

// Plugin State Management
export interface GhostSpeakPluginState {
  isInitialized: boolean;
  currentAgent?: AgentInfo;
  connectedWallet?: Address;
  networkStatus: 'connected' | 'disconnected' | 'error';
  lastSync: number;
  cache: {
    agents: Map<string, AgentInfo>;
    services: Map<string, ServiceListing>;
    jobs: Map<string, JobPosting>;
    workOrders: Map<string, WorkOrder>;
    channels: Map<string, ChannelInfo>;
    payments: Map<string, PaymentInfo>;
  };
}

// Natural Language Processing Types
export interface IntentRecognition {
  intent: 'register_agent' | 'create_service' | 'create_job' | 'send_message' | 
          'make_payment' | 'check_status' | 'search_marketplace' | 'unknown';
  confidence: number;
  entities: Record<string, any>;
  context?: string;
}

export interface ActionResponse {
  success: boolean;
  data?: any;
  error?: string;
  transactionId?: string;
  followUpActions?: string[];
  userMessage?: string;
}

// Validation Schemas
export const AddressSchema = z.string().refine(
  (val) => {
    try {
      // Basic validation for Solana address format
      return val.length >= 32 && val.length <= 44;
    } catch {
      return false;
    }
  },
  { message: 'Invalid Solana address format' }
);

export const AgentRegistrationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
  metadata: z.string().optional(),
  skills: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
});

export const ServiceListingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(2000),
  price: z.number().min(0),
  category: z.string().min(1),
  metadata: z.string().optional(),
  deliveryTime: z.number().optional(),
});

export const JobPostingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10).max(2000),
  budget: z.number().min(0),
  deadline: z.number().optional(),
  category: z.string().min(1),
  metadata: z.string().optional(),
  requiredSkills: z.array(z.string()).optional(),
});

export const MessageSchema = z.object({
  content: z.string().min(1).max(10000),
  channelId: z.string().optional(),
  recipientId: z.string().optional(),
  messageType: z.enum(['text', 'file', 'system']).default('text'),
});

export const PaymentSchema = z.object({
  recipientAddress: AddressSchema,
  amount: z.number().min(0),
  token: AddressSchema.optional(),
  workOrderId: z.string().optional(),
  memo: z.string().optional(),
});

// Error Types
export class GhostSpeakPluginError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'GhostSpeakPluginError';
  }
}

export class ValidationError extends GhostSpeakPluginError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class NetworkError extends GhostSpeakPluginError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
  }
}

export class AuthenticationError extends GhostSpeakPluginError {
  constructor(message: string, details?: any) {
    super(message, 'AUTHENTICATION_ERROR', details);
  }
}