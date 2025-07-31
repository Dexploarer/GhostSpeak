/**
 * Type mapping utilities for converting between SDK types and UI types
 * Handles enum conversions and interface adaptations
 */

// SDK imports - commented out to avoid fs dependency issues
// import type {
//   GeneratedChannelType as SDKChannelType,
//   GeneratedMessageType as SDKMessageType,
//   GeneratedEscrowStatus as SDKEscrowStatus,
// } from '@ghostspeak/sdk'

// Define SDK types locally to avoid import issues
// These actually map to numeric enums in the real SDK
type SDKChannelType = number | 'Public' | 'Private' | 'Direct' | 'Group'
type SDKMessageType = number | 'Text' | 'Image' | 'File' | 'Audio' | 'System'
type SDKEscrowStatus = number | 'Active' | 'Completed' | 'Disputed' | 'Refunded' | 'Expired'

// UI type imports
import { ChannelType as UIChannelType, MessageType as UIMessageType } from '@/lib/queries/channels'
import { EscrowStatus as UIEscrowStatus } from '@/lib/queries/escrow'

// =============================================================================
// CHANNEL TYPE MAPPINGS
// =============================================================================

/**
 * Map SDK ChannelType (numeric enum) to UI ChannelType (string enum)
 */
export function mapSDKChannelTypeToUI(sdkType: SDKChannelType): UIChannelType {
  // Handle both numeric and string types
  if (typeof sdkType === 'string') {
    switch (sdkType) {
      case 'Direct':
        return UIChannelType.Direct
      case 'Group':
        return UIChannelType.Group
      case 'Public':
        return UIChannelType.Public
      case 'Private':
        return UIChannelType.Private
      default:
        return UIChannelType.Public
    }
  }

  // SDK uses numeric enum: Direct=0, Group=1, Public=2, Private=3
  switch (sdkType) {
    case 0: // SDKChannelType.Direct
      return UIChannelType.Direct
    case 1: // SDKChannelType.Group
      return UIChannelType.Group
    case 2: // SDKChannelType.Public
      return UIChannelType.Public
    case 3: // SDKChannelType.Private
      return UIChannelType.Private
    default:
      return UIChannelType.Public
  }
}

/**
 * Map UI ChannelType (string enum) to SDK ChannelType (numeric enum)
 */
export function mapUIChannelTypeToSDK(uiType: UIChannelType): SDKChannelType {
  // Map UI string enum to SDK numeric enum
  switch (uiType) {
    case UIChannelType.Direct:
      return 0 as SDKChannelType // SDKChannelType.Direct
    case UIChannelType.Group:
      return 1 as SDKChannelType // SDKChannelType.Group
    case UIChannelType.Public:
      return 2 as SDKChannelType // SDKChannelType.Public
    case UIChannelType.Private:
      return 3 as SDKChannelType // SDKChannelType.Private
    default:
      return 2 as SDKChannelType // Default to Public
  }
}

// =============================================================================
// MESSAGE TYPE MAPPINGS
// =============================================================================

/**
 * Map SDK MessageType (numeric enum) to UI MessageType (string enum)
 */
export function mapSDKMessageTypeToUI(sdkType: SDKMessageType): UIMessageType {
  // Handle both numeric and string types
  if (typeof sdkType === 'string') {
    switch (sdkType) {
      case 'Text':
        return UIMessageType.Text
      case 'File':
        return UIMessageType.File
      case 'Image':
        return UIMessageType.Image
      case 'Audio':
        return UIMessageType.Audio
      default:
        return UIMessageType.Text
    }
  }

  // SDK uses numeric enum: Text=0, File=1, Image=2, Audio=3, System=4
  switch (sdkType) {
    case 0: // SDKMessageType.Text
      return UIMessageType.Text
    case 1: // SDKMessageType.File
      return UIMessageType.File
    case 2: // SDKMessageType.Image
      return UIMessageType.Image
    case 3: // SDKMessageType.Audio
      return UIMessageType.Audio
    case 4: // SDKMessageType.System
      return UIMessageType.System
    default:
      return UIMessageType.Text
  }
}

/**
 * Map UI MessageType (string enum) to SDK MessageType (numeric enum)
 */
export function mapUIMessageTypeToSDK(uiType: UIMessageType): SDKMessageType {
  // Map UI string enum to SDK numeric enum
  switch (uiType) {
    case UIMessageType.Text:
      return 0 as SDKMessageType // SDKMessageType.Text
    case UIMessageType.File:
      return 1 as SDKMessageType // SDKMessageType.File
    case UIMessageType.Image:
      return 2 as SDKMessageType // SDKMessageType.Image
    case UIMessageType.Audio:
      return 3 as SDKMessageType // SDKMessageType.Audio
    case UIMessageType.System:
      return 4 as SDKMessageType // SDKMessageType.System
    case UIMessageType.Code:
      return 0 as SDKMessageType // Map Code to Text for SDK
    case UIMessageType.Reaction:
      return 4 as SDKMessageType // Map Reaction to System for SDK
    default:
      return 0 as SDKMessageType // Default to Text
  }
}

// =============================================================================
// ESCROW STATUS MAPPINGS
// =============================================================================

/**
 * Map SDK EscrowStatus to UI EscrowStatus
 * SDK uses numeric enum: Active=0, Completed=1, Disputed=2, Resolved=3, Cancelled=4
 */
export function mapSDKEscrowStatusToUI(sdkStatus: SDKEscrowStatus): UIEscrowStatus {
  // SDK uses numeric enum values - cast to number for comparison
  const statusValue = sdkStatus as unknown as number
  switch (statusValue) {
    case 0: // Active
      return UIEscrowStatus.Active
    case 1: // Completed
      return UIEscrowStatus.Completed
    case 2: // Disputed
      return UIEscrowStatus.Disputed
    case 3: // Resolved
      return UIEscrowStatus.Resolved
    case 4: // Cancelled
      return UIEscrowStatus.Cancelled
    default:
      return UIEscrowStatus.Active
  }
}

/**
 * Map UI EscrowStatus to SDK EscrowStatus
 */
export function mapUIEscrowStatusToSDK(uiStatus: UIEscrowStatus): SDKEscrowStatus {
  // Map UI string enum to SDK numeric enum
  switch (uiStatus) {
    case UIEscrowStatus.Active:
      return 0 as unknown as SDKEscrowStatus // Active
    case UIEscrowStatus.Completed:
      return 1 as unknown as SDKEscrowStatus // Completed
    case UIEscrowStatus.Disputed:
      return 2 as unknown as SDKEscrowStatus // Disputed
    case UIEscrowStatus.Resolved:
      return 3 as unknown as SDKEscrowStatus // Resolved
    case UIEscrowStatus.Cancelled:
      return 4 as unknown as SDKEscrowStatus // Cancelled
    case UIEscrowStatus.Refunded:
      return 1 as unknown as SDKEscrowStatus // Map Refunded to Completed for SDK (no direct equivalent)
    default:
      return 0 as unknown as SDKEscrowStatus // Default to Active
  }
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if a value is a valid SDK ChannelType
 */
export function isValidSDKChannelType(value: unknown): value is SDKChannelType {
  return typeof value === 'number' && value >= 0 && value <= 3
}

/**
 * Check if a value is a valid SDK MessageType
 */
export function isValidSDKMessageType(value: unknown): value is SDKMessageType {
  return typeof value === 'number' && value >= 0 && value <= 4
}

/**
 * Check if a value is a valid SDK EscrowStatus
 */
export function isValidSDKEscrowStatus(value: unknown): value is SDKEscrowStatus {
  return typeof value === 'number' && value >= 0 && value <= 4
}

// =============================================================================
// NULL/UNDEFINED CONVERTERS
// =============================================================================

/**
 * Convert SDK null values to undefined for UI compatibility
 */
export function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

/**
 * Convert UI undefined values to null for SDK compatibility
 */
export function undefinedToNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value
}

/**
 * Safely convert bigint to number for UI display
 */
export function bigintToNumber(value: bigint): number {
  // Safely convert bigint to number, handling potential overflow
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    console.warn('BigInt value exceeds MAX_SAFE_INTEGER, precision may be lost')
  }
  return Number(value)
}

/**
 * Convert number to bigint for SDK compatibility
 */
export function numberToBigint(value: number): bigint {
  return BigInt(Math.floor(value))
}
