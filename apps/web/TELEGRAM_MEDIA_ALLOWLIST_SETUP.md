# Telegram Media Generation - Allowlist Configuration

## ✅ Setup Complete

The Telegram bot `/media` command is now configured with **allowlist mode** for controlled image generation access.

---

## Configuration Summary

### Environment Variables

Location: `apps/web/.env.local` (dev) or Vercel Environment Variables (production)

```bash
TELEGRAM_MEDIA_MODE=allowlist
TELEGRAM_MEDIA_ALLOWLIST=the_dexploarer
```

### Registered Bot Commands

All commands are registered with Telegram BotFather and appear in autocomplete:

- `/start` - Welcome message and bot introduction
- `/help` - Show help guide and available commands
- `/quota` - Check your daily message quota
- `/media` - Generate AI images with Google Imagen 4 ⭐ **NEW**
- `/raid` - Generate X (Twitter) raid status
- `/about` - About Caisper bot
- `/mute` - Mute bot auto-responses in groups (admins only)
- `/unmute` - Unmute bot auto-responses in groups (admins only)

---

## How It Works

### Permission Flow

When a user sends `/media <prompt>`:

1. **Extract user info** - Username, user ID, wallet address
2. **Check blocklist** - Deny if user is blocked (if configured)
3. **Check allowlist mode**:
   - ✅ If user is `@the_dexploarer` → **Allow with unlimited images**
   - ❌ If user is not in allowlist → **Deny with helpful message**
4. **Check rate limits** - Allowlist users bypass all limits
5. **Generate image** - Call Google Imagen 4 via AI Gateway
6. **Send to Telegram** - Return image to user
7. **Increment counter** - Track usage for analytics

### Allowlist User Experience

**@the_dexploarer** can:
- Generate unlimited AI images
- No rate limits applied
- No daily quota restrictions
- Works in both DMs and groups

Example usage:
```
/media a friendly ghost floating in a digital void
/media raid Join the Ghost Army! Verify your agents with GhostSpeak
/media meme trusting unverified AI agents vs using GhostSpeak
```

### Non-Allowlist User Experience

All other users receive this message:

```
🔒 Image generation is restricted to authorized users.

Contact @the_dexploarer to request access.
```

---

## Testing

### Run Permission Tests

Test the allowlist configuration locally:

```bash
cd apps/web
bun run telegram:test-permissions
```

Expected output:
```
✅ Test 1: Allowlist User (@the_dexploarer) - PASS
✅ Test 2: Non-Allowlist User (@alice) - PASS (correctly denied)
✅ Test 3: Rate Limit Tracking - PASS
✅ Test 4: Group Admin Check - PASS
```

### Test in Telegram

1. Open Telegram
2. Search for your bot (e.g., `@CaisperGhostBot`)
3. Send: `/media a friendly ghost`

**Expected results:**
- ✅ @the_dexploarer → Image generated successfully
- ❌ Other users → "🔒 Image generation is restricted..."

---

## Management

### Add More Users to Allowlist

Update the environment variable to include multiple users:

```bash
# Supports usernames (with or without @) and user IDs
TELEGRAM_MEDIA_ALLOWLIST=the_dexploarer,alice,bob,123456789
```

**In Vercel:**
```bash
vercel env rm TELEGRAM_MEDIA_ALLOWLIST production
vercel env add TELEGRAM_MEDIA_ALLOWLIST production
# Enter: the_dexploarer,alice,bob,123456789
vercel --prod
```

### Change Permission Mode

Switch to a different mode anytime:

**Open Mode** (everyone with rate limits):
```bash
TELEGRAM_MEDIA_MODE=open
```

**Blocklist Mode** (everyone except blocklist):
```bash
TELEGRAM_MEDIA_MODE=blocklist
TELEGRAM_MEDIA_BLOCKLIST=spammer1,badactor
```

**Group Admins Only** (admins in groups, everyone in DMs):
```bash
TELEGRAM_MEDIA_MODE=group-admins
```

### Re-register Commands

If you add new commands or change descriptions:

```bash
cd apps/web
bun run telegram:register-commands
```

---

## Production Deployment

### Deploy to Vercel

```bash
# 1. Set environment variables in Vercel
vercel env add TELEGRAM_MEDIA_MODE production
# Enter: allowlist

vercel env add TELEGRAM_MEDIA_ALLOWLIST production
# Enter: the_dexploarer

# 2. Deploy
git add .
git commit -m "feat: configure Telegram media allowlist mode"
git push origin main

# 3. Verify
vercel logs --follow
```

### Post-Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Bot commands registered with `bun run telegram:register-commands`
- [ ] Webhook URL set correctly (see TELEGRAM_BOT_SETUP.md)
- [ ] Test `/media` command as allowlist user
- [ ] Test `/media` command as non-allowlist user
- [ ] Verify rate limiting doesn't apply to allowlist users

---

## Available Scripts

```bash
# Setup webhook
bun run telegram:setup

# Register bot commands with BotFather
bun run telegram:register-commands

# Test media permissions
bun run telegram:test-permissions
```

---

## Files

```
apps/web/
├── lib/telegram/
│   ├── mediaPermissions.ts           # Permission checking logic
│   ├── adapter.ts                    # Telegram ↔ ElizaOS adapter
│   └── groupChatLogic.ts             # Group chat handling
├── app/api/telegram/webhook/
│   └── route.ts                      # Webhook with /media command
├── scripts/
│   ├── setup-telegram-bot.ts         # Webhook registration
│   ├── register-bot-commands.ts      # Command registration (NEW)
│   └── test-media-permissions.ts     # Permission tests (NEW)
└── TELEGRAM_BOT_SETUP.md             # Full setup guide
```

---

## Rate Limit Tiers

Even in allowlist mode, the system tracks these tiers for non-allowlist users:

| Tier | $GHOST Holdings | Daily Images | Notes |
|------|----------------|--------------|-------|
| **Free** | $0 | 5 images/day | Default for all users |
| **Holder** | $10+ in $GHOST | 25 images/day | Auto-detected via Convex |
| **Whale** | $100+ in $GHOST | 100 images/day | Auto-detected via Convex |
| **Allowlist** | Any | **Unlimited** | Overrides all limits |

**Note**: In allowlist mode, non-allowlist users are denied before rate limit checks.

---

## Image Templates

The `/media` command supports 13 branded templates:

**Social/Viral** (Telegram only):
- `raid` - X/Twitter raid graphics
- `meme` - Relatable memes
- `quote` - Quote cards
- `stat-highlight` - Stat highlights
- `story-announcement` - Story graphics

**Product-Focused** (Telegram & Web):
- `announcement` - Feature announcements
- `token-promo` - Token promotions
- `infographic` - Educational infographics
- `explainer` - Explainer graphics
- `comparison` - Comparison charts
- `agent-card` - Agent profile cards
- `leaderboard` - Leaderboard graphics
- `tutorial` - Tutorial graphics

---

## Troubleshooting

### Commands don't appear in Telegram

Run the registration script:
```bash
bun run telegram:register-commands
```

### Permission checks failing

Verify environment variables are set:
```bash
grep TELEGRAM_MEDIA apps/web/.env.local
```

Should show:
```
TELEGRAM_MEDIA_MODE=allowlist
TELEGRAM_MEDIA_ALLOWLIST=the_dexploarer
```

### Allowlist user still denied

1. Check username matches exactly (case-insensitive, without @)
2. Verify `.env.local` is loaded
3. Restart dev server
4. Check logs for permission check results

---

## Support

- **Documentation**: `apps/web/TELEGRAM_BOT_SETUP.md`
- **Issues**: https://github.com/Ghostspeak/GhostSpeak/issues
- **Developer**: @the_dexploarer

---

*Generated: 2026-01-13 | Mode: Allowlist | Status: ✅ Active*
