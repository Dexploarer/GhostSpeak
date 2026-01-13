# GhostSpeak Telegram Mini App

Unified Telegram Mini App combining Caisper (verification) and Boo (media generation) into a single tabbed interface.

## Overview

This Mini App provides a native Telegram experience for GhostSpeak's two AI agents:
- **Verify Tab** (Caisper): Check Ghost Scores, view credentials, browse agent directory
- **Create Tab** (Boo): Generate AI images with GhostSpeak branding
- **Profile Tab**: User settings, quota management, $GHOST holdings

## Tech Stack

- **Framework**: Next.js 15.4.10 (App Router)
- **React**: 19.1.0
- **Telegram SDK**: @tma.js/sdk@^3.1.4 (community SDK, better than official)
- **Styling**: TailwindCSS 4
- **State**: React Query (@tanstack/react-query@^5.71.10)
- **Fonts**: Geist Sans & Geist Mono
- **Package Manager**: Bun

## Architecture

### NO Backend Duplication
This Mini App is **UI-only**. All business logic lives in `apps/web`:
- API calls → `apps/web/api/v1/*`
- Convex functions → `apps/web/convex/*`
- ElizaOS runtime → `apps/web/server/elizaos/runtime.ts`

### File Structure

```
apps/miniapp/
├── app/
│   ├── layout.tsx              # Root layout with TMA providers
│   ├── page.tsx                # Landing/router (redirects based on start param)
│   ├── verify/page.tsx         # Caisper features
│   ├── create/page.tsx         # Boo features
│   └── profile/page.tsx        # User profile
├── components/
│   ├── providers/
│   │   ├── TelegramProvider.tsx  # @tma.js/sdk wrapper
│   │   └── QueryProvider.tsx     # React Query client
│   └── layout/
│       └── TabNavigation.tsx   # Bottom tab bar
├── lib/
│   ├── api.ts                  # API client (calls apps/web endpoints)
│   └── cn.ts                   # Tailwind utility
├── styles/
│   └── globals.css             # Telegram theme CSS variables
├── package.json
├── next.config.ts              # Next.js config (iframe headers)
├── tailwind.config.ts          # TailwindCSS 4
├── tsconfig.json
└── .env.local
```

## Development

### Prerequisites

- Bun >= 1.3.0
- Node >= 22.0.0
- Telegram Bot (@BotFather)

### Setup

1. **Install dependencies**:
   ```bash
   cd apps/miniapp
   bun install
   ```

2. **Configure environment** (`.env.local`):
   ```bash
   NEXT_PUBLIC_APP_URL=http://localhost:3334
   NEXT_PUBLIC_CONVEX_URL=https://lovely-cobra-639.convex.cloud
   CONVEX_DEPLOYMENT=dev:lovely-cobra-639
   NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
   NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID=4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB
   AI_GATEWAY_API_KEY=your_key_here
   ```

3. **Run development server**:
   ```bash
   bun run dev
   ```
   Runs on http://localhost:3334

4. **Build for production**:
   ```bash
   bun run build
   ```

### Testing Locally

Since Telegram Mini Apps only work inside Telegram, local development uses a fallback:
- Mock user data when not in Telegram WebView
- Test UI/UX without Telegram context
- Use Telegram's bot test environment for real testing

## Telegram Integration

### How Mini Apps Work

1. User opens bot (@caisper_bot or @boo_gs_bot)
2. Bot has menu button configured with Mini App URL
3. Clicking menu button opens WebView with your Next.js app
4. TelegramProvider initializes @tma.js/sdk
5. SDK provides user data, theme, navigation controls

### URL Routing with Start Parameters

Bots can deep-link to specific tabs:
- `/start verify` → Opens Verify tab
- `/start create` → Opens Create tab
- `/start profile` → Opens Profile tab

Implemented in `app/page.tsx` (landing page redirects based on `tgWebAppStartParam`).

### BotFather Setup

1. **Create Mini App**:
   ```
   /newapp
   @your_bot
   Title: GhostSpeak
   Description: AI Agent Trust Layer
   Photo: Upload ghost logo
   URL: https://miniapp.ghostspeak.io
   ```

2. **Set menu button** (for both Caisper and Boo):
   ```
   /setmenubutton
   @caisper_bot
   Menu button text: Open GhostSpeak
   URL: https://miniapp.ghostspeak.io?tgWebAppStartParam=verify
   ```

   ```
   /setmenubutton
   @boo_gs_bot
   Menu button text: Create Images
   URL: https://miniapp.ghostspeak.io?tgWebAppStartParam=create
   ```

3. **Configure domain** (for both bots):
   ```
   /setappdomain
   @your_bot
   miniapp.ghostspeak.io
   ```

## Deployment

### Option 1: Vercel (Recommended)

1. **Deploy to Vercel**:
   ```bash
   vercel deploy --prod
   ```

2. **Add environment variables** in Vercel dashboard:
   - All vars from `.env.local`
   - Set custom domain: `miniapp.ghostspeak.io`

3. **Update bot URLs** in BotFather with production URL

### Option 2: Subdomain on Existing Domain

If `apps/web` is already deployed to `www.ghostspeak.io`:
- Deploy miniapp to `miniapp.ghostspeak.io`
- Configure DNS CNAME → Vercel
- Update BotFather URLs

### Telegram Port Restrictions

Telegram only allows webhooks/Mini Apps on ports: **443, 80, 88, 8443**
- Use standard HTTPS (443) for production
- No custom ports like :3000 or :8080

## TON Blockchain

### Do We Need TON?

**NO** (for basic Mini App functionality)

TON is **only required** if you:
- Sell digital goods inside Telegram (must use Telegram Stars)
- Create/distribute crypto tokens
- Promote non-TON crypto assets

GhostSpeak uses Solana, so we:
- Check $GHOST balance via Solana RPC (external to Telegram)
- Don't sell anything in-app
- Use existing quota system (no payments in Mini App)

### Future: If We Add TON Payments

If we later add in-app purchases:
1. Use Telegram Stars (TON-based currency)
2. Integrate TON Connect wallet
3. Bridge Solana ↔ TON (cross-chain)
4. Or accept both $GHOST and TON

## Authentication

### How It Works

1. TelegramProvider reads `initData` from SDK
2. Extract user ID, username, first/last name
3. Map to existing session system:
   ```typescript
   userId: `telegram_${telegramUserId}`
   ```
4. No separate login needed! Telegram handles auth.

### Quota System

Reuses existing quota logic from `apps/web`:
- Check $GHOST holdings via Solana RPC
- Free tier: 5 messages/day
- Holder ($10 GHOST): 25/day
- Whale ($100 GHOST): 100/day
- Allowlist: Unlimited

API endpoint: `/api/v1/quota?userId=telegram_123456`

## API Integration

All API calls go to `apps/web`:

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ghostspeak.io'

// Discover agents
const { agents } = await discoverAgents({ verified: true })

// Generate image (Boo)
const { imageUrl } = await generateImage({
  userId: telegramUserId,
  prompt: 'A friendly ghost',
  template: 'raid',
  characterId: 'boo'
})

// Get Ghost Score (Caisper)
const { score } = await getGhostScore(agentAddress)

// Check quota
const { remaining } = await getUserQuota(telegramUserId)
```

## Theme System

Telegram provides theme colors dynamically:
- Light mode: `#ffffff`, `#000000`, etc.
- Dark mode: `#18222d`, `#ffffff`, etc.
- Custom themes: User's Telegram theme

TelegramProvider applies CSS variables:
```css
--tg-theme-bg-color
--tg-theme-text-color
--tg-theme-button-color
--tg-theme-hint-color
```

TailwindCSS uses these:
```jsx
<div className="bg-tg-bg text-tg-text" />
```

## Navigation

### Bottom Tab Bar

Three tabs (always visible):
- 🔍 Verify (Caisper)
- 🎨 Create (Boo)
- 👤 Profile

Implemented in `components/layout/TabNavigation.tsx`

### Back Button

Telegram's native back button:
- Mounted by TelegramProvider
- Hidden on landing page
- Shows when user navigates deeper
- Calls `window.history.back()`

## Performance

- **Build size**: ~117 KB First Load JS (optimized)
- **Static generation**: All pages pre-rendered
- **Code splitting**: Automatic by Next.js
- **Image optimization**: Next.js Image component (when we add images)

## Known Limitations

1. **No server-side rendering of Telegram data**:
   - initData only available client-side
   - All pages are static, then hydrate with user data

2. **Development testing**:
   - Can't fully test in browser (no initData)
   - Must use Telegram's test environment or production bot

3. **Theme preview**:
   - Can't preview all Telegram themes locally
   - Test with real Telegram app for accurate colors

## Troubleshooting

### "Mini App not loading"
- Check Telegram allows the domain (BotFather /setappdomain)
- Verify HTTPS certificate is valid
- Check iframe headers in next.config.ts

### "User data not showing"
- TelegramProvider may have failed to init
- Check console for errors
- Verify @tma.js/sdk version matches

### "Build fails with type errors"
- Ensure all dependencies installed: `bun install`
- Check TypeScript version: `bun run type-check`
- Clear .next cache: `rm -rf .next`

## ✅ Implementation Status

### Phase 1: Foundation (COMPLETE)
- ✅ Tab navigation with Caisper, Boo, Profile labels
- ✅ Telegram provider integration
- ✅ Design system matching main app (electric lime #ccff00)
- ✅ Responsive layout

### Phase 2: Verify Tab - Caisper (COMPLETE)
- ✅ Agent search by Solana address
- ✅ Ghost Score display (0-1000) with color-coded tiers
- ✅ Score breakdown with progress bar
- ✅ Badges display (Verified, Active, etc.)
- ✅ Quick stats grid (Reputation, Trend, Trust)
- ✅ Empty state with search prompt
- ✅ Error handling for invalid addresses

### Phase 3: Create Tab - Boo (COMPLETE)
- ✅ Template selector with 6 templates:
  - 🚀 Raid Graphics
  - 😂 Meme
  - 📢 Announcement
  - 📊 Infographic
  - 💬 Quote Card
  - 🤖 Agent Profile
- ✅ Image generation form with prompt input
- ✅ Loading states during generation
- ✅ Image preview with download option
- ✅ Template-based generation (ready for AI Gateway)
- ✅ Empty state with creation prompt

### Phase 4: Profile Tab (COMPLETE)
- ✅ User info display (name, username, Telegram ID)
- ✅ Premium badge for Telegram Premium users
- ✅ Message quota tracking with progress bar
- ✅ Tier display (Free 🆓, Holder 💎, Whale 🐋)
- ✅ Reset timer countdown
- ✅ $GHOST holdings display
- ✅ Tier upgrade options with pricing
- ✅ "Buy $GHOST on Jupiter" CTA button
- ✅ Stats grid (Agents Verified, Images Generated)

### Next Steps: Production Integration

**Backend Integration:**
- [ ] Connect Caisper to real GhostSpeak API (`/api/v1/agent/{address}`)
- [ ] Connect Boo to AI Gateway for real image generation
- [ ] Connect Profile to Convex for real quota tracking
- [ ] Add wallet connection for $GHOST holdings

**Polish & Optimization:**
- [ ] Add loading skeletons
- [ ] Implement error boundaries
- [ ] Add analytics (PostHog)
- [ ] Performance monitoring (Sentry)
- [ ] Offline support with service workers

**Deployment:**
- [ ] Deploy to production (miniapp.ghostspeak.io)
- [ ] Configure Telegram Bots (@caisper_bot, @boo_gs_bot)
- [ ] Set environment variables in Vercel
- [ ] Test in production Telegram

## Resources

- [Telegram Mini Apps Docs](https://core.telegram.org/bots/webapps)
- [@tma.js/sdk Documentation](https://docs.telegram-mini-apps.com/packages/tma-js-sdk)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [TailwindCSS 4 Docs](https://tailwindcss.com/docs)
- [GhostSpeak Main Repo](https://github.com/Ghostspeak/GhostSpeak)

## License

Same as main GhostSpeak repository.
