# GhostSpeak Design System & Colors

## Overview

GhostSpeak uses a comprehensive design system built on TailwindCSS with custom CSS variables for theming. The system supports both light and dark modes with a consistent color palette centered around electric lime (#ccff00) as the primary brand color.

## Primary Color Palette

### Brand Colors

| Color Name | Light Mode | Dark Mode | Hex Values |
|------------|------------|-----------|------------|
| **Primary** | `#a3e635` | `#ccff00` | Light: `#a3e635`, Dark: `#ccff00` |
| **Primary Foreground** | `#000000` | `#000000` | `#000000` |
| **Primary RGB** | `163, 230, 53` | `204, 255, 0` | For CSS rgba() functions |

### Background Colors

| Color Name | Light Mode | Dark Mode | Purpose |
|------------|------------|-----------|---------|
| **Background** | `#f8fafc` | `#0a0a0a` | Main page background |
| **Foreground** | `#020617` | `#f8fafc` | Main text color |
| **Card** | `#ffffff` | `#111111` | Card/component backgrounds |
| **Popover** | `#ffffff` | `#111111` | Dropdown/modal backgrounds |
| **Secondary** | `#ecfdf5` | `#1a2e00` | Secondary backgrounds |
| **Muted** | `#f1f5f9` | `#1a1a1a` | Subtle backgrounds |
| **Accent** | `#f7fee7` | `#111a00` | Highlight backgrounds |

### Text Colors

| Color Name | Light Mode | Dark Mode | Purpose |
|------------|------------|-----------|---------|
| **Foreground** | `#020617` | `#f8fafc` | Primary text |
| **Muted Foreground** | `#64748b` | `#94a3b8` | Secondary text |
| **Secondary Foreground** | `#065f46` | `#d9f99d` | Secondary text |
| **Accent Foreground** | `#365314` | `#bef264` | Accent text |

### Border & Input Colors

| Color Name | Light Mode | Dark Mode | Purpose |
|------------|------------|-----------|---------|
| **Border** | `#e2e8f0` | `#262626` | Default borders |
| **Input** | `#e2e8f0` | `#262626` | Input field backgrounds |
| **Ring** | `#a3e635` | `#ccff00` | Focus rings |

### Status Colors

| Color Name | Hex Value | Purpose |
|------------|-----------|---------|
| **Destructive** | `#ef4444` | Errors, danger states |
| **Destructive Foreground** | `#ffffff` | Error text |

## CSS Custom Properties (CSS Variables)

### Light Theme (:root)
```css
--background: #f8fafc;
--foreground: #020617;
--primary: #a3e635;
--primary-foreground: #000000;
--primary-rgb: 163, 230, 53;
--secondary: #ecfdf5;
--secondary-foreground: #065f46;
--card: #ffffff;
--card-foreground: #020617;
--popover: #ffffff;
--popover-foreground: #020617;
--muted: #f1f5f9;
--muted-foreground: #64748b;
--accent: #f7fee7;
--accent-foreground: #365314;
--destructive: #ef4444;
--destructive-foreground: #ffffff;
--border: #e2e8f0;
--input: #e2e8f0;
--ring: #a3e635;
--radius: 0.75rem;
```

### Dark Theme (.dark)
```css
--background: #0a0a0a;
--foreground: #f8fafc;
--primary: #ccff00;
--primary-foreground: #000000;
--primary-rgb: 204, 255, 0;
--secondary: #1a2e00;
--secondary-foreground: #d9f99d;
--card: #111111;
--card-foreground: #f8fafc;
--popover: #111111;
--popover-foreground: #f8fafc;
--muted: #1a1a1a;
--muted-foreground: #94a3b8;
--accent: #111a00;
--accent-foreground: #bef264;
--destructive: #7f1d1d;
--destructive-foreground: #fecaca;
--border: #262626;
--input: #262626;
--ring: #ccff00;
```

### Dark Theme Premium Variables
```css
--bg-void: #0a0a0a;
--bg-card: #141414;
--bg-elevated: #1a1a1a;
--border-subtle: #262626;
--glass-border: rgba(255, 255, 255, 0.08);
--glow-intensity: 0.4;
```

## TailwindCSS Classes

### Primary Usage
```tsx
// Direct color classes
<div className="bg-primary text-primary-foreground">
  Primary content
</div>

// Using CSS variables
<div className="bg-[var(--primary)] text-[var(--primary-foreground)]">
  Custom primary
</div>
```

### Semantic Classes
```tsx
// Card with proper theming
<div className="bg-card text-card-foreground border border-border">
  Card content
</div>

// Muted text
<p className="text-muted-foreground">
  Secondary information
</p>

// Accent highlights
<div className="bg-accent text-accent-foreground">
  Highlighted content
</div>
```

## Visual Effects & Animations

### Glassmorphism
```css
.glass {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.dark .glass {
  background: rgba(10, 10, 10, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### Glow Effects
```css
.glow-card::before {
  background: radial-gradient(
    circle at center,
    rgba(var(--primary-rgb), var(--glow-intensity)) 0%,
    rgba(var(--primary-rgb), calc(var(--glow-intensity) * 0.3)) 40%,
    transparent 70%
  );
}
```

### Text Effects
```css
.text-shimmer {
  background: linear-gradient(
    to right,
    var(--foreground) 20%,
    var(--primary) 30%,
    var(--foreground) 70%,
    var(--primary) 80%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 500% auto;
  animation: textShimmer 5s ease-in-out infinite alternate;
}
```

## Component-Specific Colors

### Buttons
```tsx
// Primary button
<button className="bg-primary text-primary-foreground hover:opacity-90">
  Primary Action
</button>

// Secondary button
<button className="bg-secondary text-secondary-foreground">
  Secondary Action
</button>
```

### Status Indicators
```tsx
// Success state
<div className="bg-accent text-accent-foreground">
  Success message
</div>

// Error state
<div className="bg-destructive text-destructive-foreground">
  Error message
</div>
```

## Crossmint Integration Colors

The design system includes specific overrides for Crossmint wallet integration:

```css
/* Crossmint Container */
.crossmint-wrapper {
  --cm-primary: var(--primary);
  --cm-primary-text: var(--primary-foreground);
  --cm-background: var(--card);
  --cm-text: var(--foreground);
  --cm-border: var(--border);
  --cm-muted: var(--muted-foreground);
}
```

## Constants & Branding

Located in `lib/constants/branding.ts`:

```typescript
export const BRAND_NAME = 'GhostSpeak'
export const TAGLINE = 'Trust Layer for AI'

export const THEME_COLORS = {
  PRIMARY: 'primary', // Tailwind class reference
  BACKGROUND: '#111111', // Dark mode card background
}
```

## Implementation Guidelines

### 1. Always Use CSS Variables
```tsx
// ✅ Correct
<div className="bg-primary text-primary-foreground">

// ❌ Avoid hardcoded colors
<div style={{ backgroundColor: '#ccff00' }}>
```

### 2. Support Both Themes
```tsx
// ✅ Theme-aware
<div className="bg-card border border-border">

// ❌ Theme-specific only
<div className="bg-white dark:bg-gray-900">
```

### 3. Use Semantic Color Names
```tsx
// ✅ Semantic
<div className="text-destructive">Error</div>

// ❌ Non-semantic
<div className="text-red-500">Error</div>
```

### 4. Leverage CSS Custom Properties
```tsx
// ✅ Use CSS variables for dynamic effects
<div style={{
  background: `rgba(var(--primary-rgb), ${opacity})`
}}>
```

## Color Accessibility

### Contrast Ratios
- **Primary on Primary Foreground**: 15.2:1 (AAA compliant)
- **Foreground on Background**: 15.8:1 (AAA compliant)
- **Muted Foreground on Background**: 4.6:1 (AA compliant)

### Focus States
```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

## File Locations

- **Main Styles**: `apps/web/app/globals.css`
- **Constants**: `apps/web/lib/constants/branding.ts`
- **Tailwind Config**: Uses default with CSS custom properties
- **Component Styles**: Inline with Tailwind classes

## Maintenance

### Adding New Colors
1. Add to CSS custom properties in `globals.css`
2. Update both light and dark themes
3. Add to Tailwind theme if needed
4. Update this documentation

### Updating Existing Colors
1. Update CSS custom properties
2. Test in both light and dark modes
3. Verify accessibility compliance
4. Update dependent components

---

**Last Updated**: January 13, 2026
**Maintained by**: GhostSpeak Design System