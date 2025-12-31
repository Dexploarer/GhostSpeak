# Privacy Components

Complete privacy UI system for GhostSpeak agent reputation data.

## Overview

These components allow users to control the visibility of their agent's reputation metrics with granular privacy controls, access control lists, and real-time preview of privacy settings.

## Components

### 1. PrivacyIndicator

A small badge/icon showing an agent's privacy level.

**Props:**

- `mode`: Privacy mode ('public' | 'tier-only' | 'authorized-only' | 'hidden')
- `className`: Optional CSS classes
- `showLabel`: Show text label (default: false)
- `size`: Icon size ('sm' | 'md' | 'lg')

**Usage:**

```tsx
import { PrivacyIndicator } from '@/components/privacy'

;<PrivacyIndicator mode="tier-only" size="sm" />
```

**Features:**

- Color-coded badges (Green, Blue, Yellow, Red)
- Tooltip with privacy description
- Responsive sizing

---

### 2. PrivacyModeSelector

Radio-group style selector for privacy modes with visual examples and warnings.

**Props:**

- `value`: Current privacy mode
- `onChange`: Callback when mode changes
- `disabled`: Disable interaction

**Usage:**

```tsx
import { PrivacyModeSelector } from '@/components/privacy'

const [mode, setMode] = useState<PrivacyMode>('public')

<PrivacyModeSelector value={mode} onChange={setMode} />
```

**Features:**

- 4 privacy modes with descriptions
- Warning alerts for restrictive modes
- Visual selection indicators
- Responsive grid layout

---

### 3. MetricVisibilityControl

Grid of toggles for controlling individual metric visibility.

**Props:**

- `settings`: Current metric visibility settings
- `onChange`: Callback when settings change
- `onSave`: Save handler
- `onReset`: Reset handler
- `isSaving`: Loading state

**Usage:**

```tsx
import { MetricVisibilityControl } from '@/components/privacy'

const [settings, setSettings] = useState<MetricSettings>({
  overallScore: 'public',
  reputationTier: 'public',
  // ... other metrics
})

<MetricVisibilityControl
  settings={settings}
  onChange={setSettings}
  onSave={handleSave}
  onReset={handleReset}
/>
```

**Features:**

- Grouped by category (Core, Performance, Trust, Quality, etc.)
- Individual metric controls
- Quick "set all" actions
- Collapsible categories
- Save/Reset buttons

---

### 4. AccessControlList

Manage authorized viewers with wallet addresses and expiration dates.

**Props:**

- `viewers`: Array of authorized viewers
- `onAddViewer`: Callback to add viewer
- `onRemoveViewer`: Callback to remove viewer
- `onBulkRemove`: Callback for bulk removal
- `maxViewers`: Maximum allowed viewers (default: 50)

**Usage:**

```tsx
import { AccessControlList } from '@/components/privacy'

const [viewers, setViewers] = useState<AuthorizedViewer[]>([])

<AccessControlList
  viewers={viewers}
  onAddViewer={(viewer) => setViewers([...viewers, viewer])}
  onRemoveViewer={(address) => setViewers(viewers.filter(v => v.walletAddress !== address))}
  onBulkRemove={(addresses) => setViewers(viewers.filter(v => !addresses.includes(v.walletAddress)))}
/>
```

**Features:**

- Add viewers with wallet validation
- Optional nicknames
- Expiration date picker
- Bulk selection and removal
- Empty state design

---

### 5. PrivacyPreview

Side-by-side comparison showing owner view vs public view.

**Props:**

- `privacyMode`: Current privacy mode
- `metricSettings`: Metric visibility settings
- `reputationData`: Agent reputation data

**Usage:**

```tsx
import { PrivacyPreview } from '@/components/privacy'

;<PrivacyPreview
  privacyMode="tier-only"
  metricSettings={settings}
  reputationData={agentReputation}
/>
```

**Features:**

- Real-time preview updates
- Visual tier badges
- Locked indicator for hidden metrics
- Responsive layout

---

### 6. PrivacySettingsPanel

Main dashboard component integrating all privacy features.

**Props:**

- `agentAddress`: Agent wallet address
- `initialSettings`: Initial privacy settings
- `reputationData`: Agent reputation data
- `onSave`: Async save handler

**Usage:**

```tsx
import { PrivacySettingsPanel } from '@/components/privacy'

;<PrivacySettingsPanel
  agentAddress={walletAddress}
  onSave={async (settings) => {
    await sdk.privacy.updateSettings(settings)
  }}
  reputationData={agentData}
/>
```

**Features:**

- Tabbed interface (Mode, Metrics, Access, Preview)
- Quick preset configurations
- Unsaved changes tracking
- Mobile responsive
- Toast notifications

## Page Integration

### Privacy Settings Page

Location: `/app/dashboard/privacy/page.tsx`

**Features:**

- Wallet connection requirement
- Integration with GhostSpeak SDK
- Devnet indicator
- Loading states

## Design System

### Colors

- **Public**: Green (`text-green-500`, `bg-green-500/10`)
- **Tier Only**: Blue (`text-blue-500`, `bg-blue-500/10`)
- **Authorized**: Yellow (`text-yellow-500`, `bg-yellow-500/10`)
- **Hidden**: Red (`text-red-500`, `bg-red-500/10`)

### Icons (lucide-react)

- Public: `Eye`
- Tier Only: `Shield`
- Authorized: `Lock`
- Hidden: `EyeOff`

## Integration with AgentCard

The `AgentCard` component supports privacy indicators:

```tsx
<AgentCard agent={agent} privacyMode="tier-only" showPrivacyFiltered={true} />
```

## Navigation

Privacy settings added to:

- Dashboard sidebar (`/dashboard/privacy`)
- Mobile sidebar
- Agents page (Privacy button)

## SDK Integration (TODO)

Future integration points with GhostSpeak SDK:

```typescript
// Fetch privacy settings
const settings = await client.privacy.getSettings(agentAddress)

// Update privacy settings
await client.privacy.updateSettings({
  agentAddress,
  mode: 'tier-only',
  metricSettings,
  authorizedViewers,
})

// Check if viewer is authorized
const isAuthorized = await client.privacy.isAuthorized(agentAddress, viewerAddress)
```

## Accessibility

All components include:

- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support
- Color contrast compliance

## Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Touch-friendly targets (min 44x44px)
- Collapsible mobile sidebars

## Testing

Recommended test cases:

- Privacy mode changes
- Metric visibility toggles
- Access control list CRUD operations
- Wallet address validation
- Expiration date logic
- Preview updates
- Save/reset functionality

## Dependencies

- React 18+
- Next.js 14+
- Tailwind CSS
- shadcn/ui components
- lucide-react icons
- @solana/wallet-adapter-react
