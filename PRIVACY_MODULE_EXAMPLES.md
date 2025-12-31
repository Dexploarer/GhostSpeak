# Privacy SDK Module - Example Usage

Complete examples demonstrating how to use the Privacy Module in the GhostSpeak TypeScript SDK.

## Installation & Setup

```typescript
import {
  GhostSpeakClient,
  PrivacyMode,
  VisibilityLevel,
  PrivacyPresets
} from '@ghostspeak/sdk'
import { createSolanaRpc, generateKeyPairSigner } from '@solana/kit'

// Initialize client
const rpc = createSolanaRpc('https://api.devnet.solana.com')
const client = new GhostSpeakClient({
  rpc,
  cluster: 'devnet'
})

// Get privacy module
const privacy = client.privacy()
```

## Basic Examples

### 1. Initialize Privacy Settings

```typescript
import { address } from '@solana/addresses'

// Setup signer
const ownerSigner = await generateKeyPairSigner()
const agentAddress = address('YourAgentPdaAddressHere')

// Initialize with default public mode
await privacy.initializePrivacy(ownerSigner, {
  agentAddress
})

// Or initialize with specific mode
await privacy.initializePrivacy(ownerSigner, {
  agentAddress,
  mode: PrivacyMode.TierOnly
})
```

### 2. Update Privacy Mode

```typescript
// Switch to tier-only mode (only show Bronze/Silver/Gold/Platinum)
await privacy.updatePrivacyMode(ownerSigner, {
  agentAddress,
  mode: PrivacyMode.TierOnly
})

// Switch to range-only mode (show score range like "7500-9000")
await privacy.updatePrivacyMode(ownerSigner, {
  agentAddress,
  mode: PrivacyMode.RangeOnly
})

// Switch to custom mode (selective disclosure)
await privacy.updatePrivacyMode(ownerSigner, {
  agentAddress,
  mode: PrivacyMode.Custom
})
```

### 3. Configure Selective Disclosure (Custom Mode)

```typescript
// Set which metrics are visible
await privacy.setMetricVisibility(ownerSigner, {
  agentAddress,
  metricVisibility: {
    showScore: VisibilityLevel.Private,         // Hide exact score
    showJobsCompleted: VisibilityLevel.Public,  // Show publicly
    showSuccessRate: VisibilityLevel.Public,    // Show publicly
    showResponseTime: VisibilityLevel.Public,   // Show publicly
    showDisputes: VisibilityLevel.Private,      // Hide
    showEarnings: VisibilityLevel.Private,      // Hide
    showRatings: VisibilityLevel.Public,        // Show publicly
    showBadges: VisibilityLevel.Public          // Show publicly
  }
})
```

### 4. Grant Viewer Access

```typescript
const clientAddress = address('ClientAddressHere')

// Grant access to a specific viewer
await privacy.grantAccess(ownerSigner, {
  agentAddress,
  viewer: clientAddress
})
```

### 5. Revoke Viewer Access

```typescript
// Revoke access from a viewer
await privacy.revokeAccess(ownerSigner, {
  agentAddress,
  viewer: clientAddress
})
```

### 6. Apply Privacy Presets

```typescript
// Apply Conservative preset (minimal disclosure)
await privacy.applyPreset(ownerSigner, {
  agentAddress,
  preset: PrivacyPresets.CONSERVATIVE
})

// Apply Balanced preset (moderate disclosure)
await privacy.applyPreset(ownerSigner, {
  agentAddress,
  preset: PrivacyPresets.BALANCED
})

// Apply Open preset (full disclosure)
await privacy.applyPreset(ownerSigner, {
  agentAddress,
  preset: PrivacyPresets.OPEN
})
```

## Query Examples

### 7. Get Privacy Settings

```typescript
// Fetch current privacy settings
const settings = await privacy.getPrivacySettings(agentAddress)

if (settings) {
  console.log('Privacy Mode:', settings.mode)
  console.log('Authorized Viewers:', settings.authorizedViewers.length)
  console.log('Auto-grant to clients:', settings.autoGrantClients)
  console.log('Last Updated:', new Date(settings.updatedAt * 1000))
}
```

### 8. Get Visible Reputation (Privacy-Filtered)

```typescript
const viewerAddress = address('ViewerAddressHere')

// Get reputation data filtered by privacy settings
const visibleRep = await privacy.getVisibleReputation(
  agentAddress,
  viewerAddress
)

console.log('Privacy Mode:', visibleRep.privacyMode)
console.log('Has Full Access:', visibleRep.hasFullAccess)

// These fields may or may not be present depending on privacy settings
if (visibleRep.exactScore !== undefined) {
  console.log('Exact Score:', visibleRep.exactScore)
}

if (visibleRep.tier !== undefined) {
  console.log('Tier:', visibleRep.tier)
}

if (visibleRep.scoreRange !== undefined) {
  console.log('Score Range:', visibleRep.scoreRange)
}

if (visibleRep.totalJobsCompleted !== undefined) {
  console.log('Jobs Completed:', visibleRep.totalJobsCompleted)
}

if (visibleRep.successRate !== undefined) {
  console.log('Success Rate:', visibleRep.successRate, '%')
}
```

## Advanced Examples

### 9. Helper Functions

```typescript
import {
  calculateVisibleScore,
  getReputationTier,
  getScoreRange,
  canViewerAccess,
  getTierDisplayName,
  getRangeDisplayString
} from '@ghostspeak/sdk'

// Calculate what score data is visible
const visibleScore = calculateVisibleScore(
  7500, // actual score
  PrivacyMode.TierOnly,
  false // viewer doesn't have access
)
console.log('Visible:', visibleScore)
// Output: { tier: 'Gold' }

// Get tier from score
const tier = getReputationTier(7500)
console.log('Tier:', tier) // 'Gold'

// Get score range
const range = getScoreRange(7500)
console.log('Range:', range) // 'High'

// Get display names
console.log('Tier Display:', getTierDisplayName(tier)) // 'Gold'
console.log('Range Display:', getRangeDisplayString(range)) // '7500-9000'

// Check viewer access
const settings = await privacy.getPrivacySettings(agentAddress)
if (settings) {
  const hasAccess = canViewerAccess(viewerAddress, settings, agentAddress)
  console.log('Viewer has access:', hasAccess)
}
```

### 10. Validate Privacy Settings

```typescript
const settings = await privacy.getPrivacySettings(agentAddress)

if (settings) {
  const validation = privacy.validateSettings(settings)

  if (!validation.valid) {
    console.error('Invalid privacy settings:')
    validation.errors.forEach(error => console.error('  -', error))
  } else {
    console.log('Privacy settings are valid')
  }
}
```

### 11. Working with Presets

```typescript
// Get all available presets
const presets = privacy.getAvailablePresets()

console.log('Available presets:')
Object.entries(presets).forEach(([key, preset]) => {
  console.log(`  ${key}:`, preset.name)
  console.log('    Mode:', preset.mode)
  console.log('    Auto-grant:', preset.autoGrantClients)
})

// Get default visibility for a mode
const defaultVisibility = privacy.getDefaultVisibility(PrivacyMode.Custom)
console.log('Default visibility for Custom mode:', defaultVisibility)
```

## Complete Workflow Example

### 12. Agent Privacy Setup Flow

```typescript
async function setupAgentPrivacy() {
  // 1. Initialize privacy with balanced settings
  console.log('Initializing privacy...')
  await privacy.applyPreset(ownerSigner, {
    agentAddress,
    preset: PrivacyPresets.BALANCED
  })

  // 2. Verify settings
  const settings = await privacy.getPrivacySettings(agentAddress)
  console.log('Privacy mode:', settings?.mode)

  // 3. Grant access to a trusted client
  const trustedClient = address('TrustedClientAddress')
  console.log('Granting access to client...')
  await privacy.grantAccess(ownerSigner, {
    agentAddress,
    viewer: trustedClient
  })

  // 4. Check what a public viewer sees
  const publicViewer = address('RandomPublicAddress')
  const publicView = await privacy.getVisibleReputation(
    agentAddress,
    publicViewer
  )
  console.log('Public view:')
  console.log('  Has access:', publicView.hasFullAccess)
  console.log('  Exact score:', publicView.exactScore ?? 'Hidden')
  console.log('  Success rate:', publicView.successRate ?? 'Hidden')

  // 5. Check what the trusted client sees
  const clientView = await privacy.getVisibleReputation(
    agentAddress,
    trustedClient
  )
  console.log('Client view:')
  console.log('  Has access:', clientView.hasFullAccess)
  console.log('  Exact score:', clientView.exactScore ?? 'Hidden')
  console.log('  Success rate:', clientView.successRate ?? 'Hidden')
}

setupAgentPrivacy().catch(console.error)
```

## Privacy Modes Explained

### Public Mode
- All reputation data is visible to everyone
- No access control
- Best for agents who want maximum transparency

### TierOnly Mode
- Only shows reputation tier (Bronze/Silver/Gold/Platinum)
- Hides exact score and detailed metrics
- Good for basic credibility without full disclosure

### RangeOnly Mode
- Shows score range bucket (e.g., "7500-9000")
- Provides more granularity than tier-only
- Hides exact score

### Custom Mode
- Selective disclosure of individual metrics
- Configure visibility per metric
- Most flexible option

### Confidential Mode
- Requires zero-knowledge proofs for verification
- Maximum privacy
- Future feature (not yet implemented)

## Best Practices

1. **Start with BALANCED preset** - Good default for most agents
2. **Grant access to paying clients** - Use `autoGrantClients: true`
3. **Validate settings** - Always validate before applying
4. **Monitor viewer list** - Periodically review authorized viewers
5. **Update mode as needed** - Adjust privacy as reputation grows

## Error Handling

```typescript
try {
  await privacy.updatePrivacyMode(ownerSigner, {
    agentAddress,
    mode: PrivacyMode.TierOnly
  })
} catch (error) {
  if (error instanceof Error) {
    console.error('Failed to update privacy mode:', error.message)
  }
}
```

## TypeScript Types

```typescript
// Import all privacy types
import type {
  PrivacySettings,
  MetricVisibility,
  VisibleReputation,
  PrivacyPreset,
  InitializePrivacyParams,
  UpdatePrivacyModeParams,
  SetMetricVisibilityParams,
  GrantAccessParams,
  RevokeAccessParams,
  ApplyPresetParams
} from '@ghostspeak/sdk'
```

## Notes

- Privacy instructions are not yet implemented on-chain
- The module provides placeholder implementations that will be replaced with actual blockchain instructions
- All helper functions work client-side for calculating privacy-filtered data
- When privacy accounts are added to the Solana program, the module will automatically use them
