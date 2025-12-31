/**
 * Privacy Module
 *
 * Exports all privacy-related functionality for the GhostSpeak SDK.
 */

// Export module
export { PrivacyModule } from './PrivacyModule.js'

// Export helpers
export {
  calculateVisibleScore,
  getReputationTier,
  getScoreRange,
  canViewerAccess,
  filterMetricsByVisibility,
  getDefaultMetricVisibility,
  validatePrivacySettings,
  getTierDisplayName,
  getRangeDisplayString,
} from './privacy-helpers.js'

// Re-export types from privacy-types
export {
  PrivacyMode,
  VisibilityLevel,
  ReputationTier,
  ScoreRange,
  PrivacyPresets,
  PRIVACY_CONSTANTS,
  type MetricVisibility,
  type PrivacySettings,
  type PrivacyPreset,
  type VisibleReputation,
  type InitializePrivacyParams,
  type UpdatePrivacyModeParams,
  type SetMetricVisibilityParams,
  type GrantAccessParams,
  type RevokeAccessParams,
  type ApplyPresetParams,
} from '../../types/privacy-types.js'
