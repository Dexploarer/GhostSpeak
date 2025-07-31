/**
 * Security Configuration for GhostSpeak Protocol
 * 
 * This file contains security-critical configuration that should be
 * environment-specific and never hardcoded in the smart contracts.
 */

import type { Address } from '@solana/addresses'
import { address } from '@solana/addresses'

export interface SecurityConfig {
  /** Protocol admin public key */
  protocolAdmin: Address
  /** Upgrade authority for the program (if upgradeable) */
  upgradeAuthority?: Address
  /** Fee receiver for protocol fees */
  feeReceiver: Address
  /** Emergency pause authority */
  emergencyAuthority?: Address
  /** Multisig threshold for critical operations */
  multisigThreshold?: number
  /** List of authorized verifiers for agent verification */
  authorizedVerifiers?: Address[]
}

/**
 * Get security configuration based on the current cluster
 */
export function getSecurityConfig(cluster: 'devnet' | 'testnet' | 'mainnet-beta'): SecurityConfig {
  switch (cluster) {
    case 'devnet':
      return {
        // For devnet, use a dedicated test wallet instead of system program
        protocolAdmin: address(
          process.env.DEVNET_ADMIN_KEY ?? 'DevnetAdminKey11111111111111111111111111111'
        ),
        upgradeAuthority: address(
          process.env.DEVNET_UPGRADE_AUTHORITY ?? 'DevnetUpgrade11111111111111111111111111111'
        ),
        feeReceiver: address(
          process.env.DEVNET_FEE_RECEIVER ?? 'DevnetFeeReceiver11111111111111111111111111'
        ),
        authorizedVerifiers: [
          // Add devnet test verifiers here
        ]
      }
    
    case 'testnet':
      return {
        protocolAdmin: address(
          process.env.TESTNET_ADMIN_KEY ?? 'TestnetAdminKey1111111111111111111111111111'
        ),
        upgradeAuthority: address(
          process.env.TESTNET_UPGRADE_AUTHORITY ?? 'TestnetUpgrade1111111111111111111111111111'
        ),
        feeReceiver: address(
          process.env.TESTNET_FEE_RECEIVER ?? 'TestnetFeeReceiver1111111111111111111111111'
        ),
        authorizedVerifiers: [
          // Add testnet verifiers here
        ]
      }
    
    case 'mainnet-beta':
      if (!process.env.MAINNET_ADMIN_KEY) {
        throw new Error('MAINNET_ADMIN_KEY environment variable is required for mainnet')
      }
      
      return {
        // Mainnet requires real keys from environment variables
        protocolAdmin: address(process.env.MAINNET_ADMIN_KEY),
        upgradeAuthority: process.env.MAINNET_UPGRADE_AUTHORITY 
          ? address(process.env.MAINNET_UPGRADE_AUTHORITY)
          : undefined, // Program should be non-upgradeable on mainnet
        feeReceiver: address(
          process.env.MAINNET_FEE_RECEIVER ?? process.env.MAINNET_ADMIN_KEY
        ),
        emergencyAuthority: process.env.MAINNET_EMERGENCY_AUTHORITY
          ? address(process.env.MAINNET_EMERGENCY_AUTHORITY)
          : undefined,
        multisigThreshold: 3, // Require 3-of-5 multisig for mainnet
        authorizedVerifiers: process.env.MAINNET_AUTHORIZED_VERIFIERS
          ? process.env.MAINNET_AUTHORIZED_VERIFIERS.split(',').map(key => address(key))
          : []
      }
    
    default:
      throw new Error(`Unknown cluster: ${cluster}`)
  }
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: SecurityConfig): void {
  // Ensure admin is not the system program
  if (config.protocolAdmin === '11111111111111111111111111111111') {
    throw new Error('Protocol admin cannot be the system program')
  }
  
  // Ensure all keys are valid addresses
  const keys = [
    config.protocolAdmin,
    config.upgradeAuthority,
    config.feeReceiver,
    config.emergencyAuthority,
    ...(config.authorizedVerifiers ?? [])
  ].filter(Boolean) as Address[]
  
  for (const key of keys) {
    try {
      // Validate that it's a proper address format (base58, 44 chars)
      if (typeof key !== 'string' || key.length !== 44) {
        throw new Error('Invalid address format')
      }
      // Try to create an address to validate it
      address(key)
    } catch {
      throw new Error(`Invalid address: ${key}`)
    }
  }
}

/**
 * Security best practices checklist
 */
export const SECURITY_CHECKLIST = {
  preMainnet: [
    'Transfer upgrade authority to multisig wallet',
    'Verify all admin keys are properly configured',
    'Enable monitoring and alerting',
    'Complete external security audit',
    'Implement emergency pause mechanism',
    'Set up bug bounty program',
    'Document incident response procedures'
  ],
  
  postLaunch: [
    'Regular security audits (quarterly)',
    'Monitor for suspicious activity',
    'Keep dependencies updated',
    'Review access controls monthly',
    'Test emergency procedures',
    'Maintain security documentation'
  ]
}

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
  default: {
    requestsPerWindow: 100,
    windowDurationSeconds: 60,
    penaltyDurationSeconds: 300
  },
  
  operations: {
    createAgent: { limit: 5, window: 3600 }, // 5 per hour
    createAuction: { limit: 10, window: 3600 }, // 10 per hour
    placeBid: { limit: 50, window: 300 }, // 50 per 5 minutes
    createEscrow: { limit: 20, window: 3600 }, // 20 per hour
    sendMessage: { limit: 100, window: 300 }, // 100 per 5 minutes
    updateAgent: { limit: 10, window: 3600 }, // 10 per hour
  }
}

/**
 * Security monitoring events to track
 */
export const SECURITY_EVENTS = {
  critical: [
    'ADMIN_CHANGE',
    'UPGRADE_INITIATED',
    'EMERGENCY_PAUSE',
    'LARGE_WITHDRAWAL',
    'AUTHORITY_TRANSFER'
  ],
  
  high: [
    'FAILED_AUTHENTICATION',
    'RATE_LIMIT_EXCEEDED',
    'INVALID_SIGNATURE',
    'REENTRANCY_DETECTED'
  ],
  
  medium: [
    'UNUSUAL_ACTIVITY',
    'HIGH_FREQUENCY_CALLS',
    'PARAMETER_VALIDATION_FAILED'
  ]
}