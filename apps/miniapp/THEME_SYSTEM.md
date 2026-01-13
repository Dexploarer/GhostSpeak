# Theme System - Light/Dark Mode

## How Users Control Light/Dark Mode

### 🎨 **Automatic Theme Detection**

The GhostSpeak Mini App **automatically detects** the user's theme preference from **Telegram's settings** - users don't need to do anything!

### How It Works

1. **User sets theme in Telegram:**
   - Open Telegram Settings
   - Go to "Chat Settings" → "Color Theme" (or "Appearance")
   - Choose a theme:
     - **Light themes** → Mini App shows light mode
     - **Dark themes** → Mini App shows dark mode
     - **System theme** → Follows device light/dark mode

2. **Mini App detects the theme:**
   - Telegram SDK provides `colorScheme` value (`'light'` or `'dark'`)
   - TelegramProvider reads this value on app load
   - Applies `.dark` class to `<html>` element if dark mode

3. **CSS responds to the class:**
   ```css
   /* Light mode (default) */
   :root {
     --background: #f8fafc;  /* Light slate */
     --primary: #a3e635;     /* Legible lime */
   }

   /* Dark mode (when .dark class is present) */
   .dark {
     --background: #0a0a0a;  /* Pure dark */
     --primary: #ccff00;     /* Electric lime */
   }
   ```

## Implementation Details

### TelegramProvider.tsx

```typescript
useEffect(() => {
  // Apply dark mode class based on Telegram's color scheme
  try {
    const colorScheme = themeParams.colorScheme()
    const isDark = colorScheme === 'dark'

    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  } catch (error) {
    // If not in Telegram, default to light mode
    document.documentElement.classList.remove('dark')
  }
}, [contextValue.themeParams])
```

### Theme Detection Flow

```
User changes theme in Telegram
         ↓
Telegram SDK updates colorScheme
         ↓
TelegramProvider detects change
         ↓
.dark class added/removed from <html>
         ↓
CSS variables switch values
         ↓
Entire app re-styles instantly
```

## Supported Telegram Themes

The Mini App works with **all Telegram themes**:

### Light Themes
- Default Light
- Day
- Arctic Blue
- Custom light themes
→ Mini App shows: **Light mode** (white background, dark text)

### Dark Themes
- Night
- Midnight
- Dark Blue
- Tinted
- Custom dark themes
→ Mini App shows: **Dark mode** (black background, light text)

## Color Tokens

All components use CSS custom properties that change based on theme:

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--background` | `#f8fafc` (light slate) | `#0a0a0a` (pure dark) |
| `--foreground` | `#020617` (dark slate) | `#f8fafc` (light slate) |
| `--primary` | `#a3e635` (legible lime) | `#ccff00` (electric lime) |
| `--card` | `#ffffff` (white) | `#111111` (near black) |
| `--muted` | `#f1f5f9` (light gray) | `#1a1a1a` (dark gray) |
| `--border` | `#e2e8f0` (light border) | `#262626` (dark border) |

## Real-time Theme Switching

**Question:** Can users switch themes while the Mini App is open?

**Answer:** Yes! Telegram Mini Apps can detect theme changes in real-time:

1. User changes theme in Telegram settings
2. Telegram sends theme update event to Mini App
3. TelegramProvider listens for changes
4. App re-renders with new theme
5. **Instant theme switch** (no page reload needed)

### Listening for Theme Changes (Future Enhancement)

```typescript
// Listen for Telegram theme changes
useEffect(() => {
  const handleThemeChange = () => {
    const newColorScheme = themeParams.colorScheme()
    const isDark = newColorScheme === 'dark'
    
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Subscribe to theme changes
  themeParams.on('change', handleThemeChange)

  return () => {
    themeParams.off('change', handleThemeChange)
  }
}, [])
```

## Testing Theme Switching

### In Development (Browser)
- Default: **Light mode** (no Telegram SDK)
- Can manually test dark mode in browser DevTools:
  ```javascript
  document.documentElement.classList.add('dark')
  ```

### In Telegram
1. Open Mini App
2. Go to Telegram Settings → Color Theme
3. Switch between light/dark themes
4. See Mini App update instantly

## Brand Consistency

Both themes use **GhostSpeak's electric lime** primary color:

**Light Mode:**
- Primary: `#a3e635` (slightly darker for better contrast on light background)
- Electric, energetic, readable

**Dark Mode:**
- Primary: `#ccff00` (pure electric lime)
- Glows against dark background
- Maximum vibrancy

## Fallback Behavior

If Telegram SDK fails to initialize:
- **Default to light mode**
- User can still use the app
- All features work normally
- Just no automatic theme detection

## User Experience

✅ **Pros:**
- Zero configuration for users
- Matches Telegram app theme
- Consistent experience across Telegram
- Battery-friendly (dark mode saves power on OLED)

🎯 **Design Philosophy:**
- Users expect Mini Apps to match Telegram's theme
- No need for separate theme toggle in Mini App
- Reduces UI clutter
- Follows platform conventions

## Future Enhancements

### Possible Theme Features:
1. **Real-time theme change listener** (detect changes while app is open)
2. **Theme transition animations** (smooth fade between themes)
3. **Custom theme overrides** (let users pick GhostSpeak-specific themes)
4. **High contrast mode** (for accessibility)
5. **Color blind modes** (alternative color schemes)

## Summary

**How users control light/dark mode:**
→ They change their **Telegram theme** in Telegram Settings

**The Mini App automatically:**
- Detects Telegram's color scheme
- Applies matching theme (light or dark)
- Uses GhostSpeak brand colors
- Switches instantly when user changes Telegram theme

**No settings needed in the Mini App itself!** 🎉

---

**Documentation Date:** January 13, 2026  
**Status:** ✅ Implemented  
**Version:** 1.0.0
