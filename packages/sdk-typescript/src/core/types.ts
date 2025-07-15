/**
 * Core Types - July 2025 Standards
 */

import type { Address } from '@solana/addresses';
import type { TransactionSigner } from '@solana/signers';

export const GHOSTSPEAK_PROGRAM_ID = '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address;

export interface Agent {
  id: string;
  name: string;
  description: string;
  owner: Address;
  capabilities: string[];
  reputation_score: number;
  total_services: number;
  total_completed: number;
  created_at: bigint;
  is_active: boolean;
  verification_level: number;
}

export interface ServiceListing {
  listing_id: bigint;
  agent: Address;
  name: string;
  description: string;
  price: bigint;
  currency: string;
  category: string;
  delivery_time: number;
  is_active: boolean;
  created_at: bigint;
}

export interface WorkOrder {
  work_order_id: bigint;
  listing: Address;
  buyer: Address;
  seller: Address;
  amount: bigint;
  status: WorkOrderStatus;
  created_at: bigint;
  deadline: bigint;
}

export enum WorkOrderStatus {
  Created = 0,
  InProgress = 1,
  Completed = 2,
  Disputed = 3,
  Cancelled = 4
}

export interface GhostSpeakConfig {
  endpoint?: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}