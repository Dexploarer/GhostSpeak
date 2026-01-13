# Telegram Bot Integration for Caisper

## Overview

GhostSpeak's Caisper agent is now available on Telegram! Users can chat with Caisper directly in Telegram to:
- Check Ghost Scores for AI agents
- Verify W3C credentials
- Discover available agents
- Run trust assessments
- Issue new credentials

## Architecture

```
Telegram User Message
  ↓
Telegram Bot API sends webhook POST to /api/telegram/webhook
  ↓
Webhook validates secret + extracts message
  ↓
Calls processAgentMessage() (same as web chat)
  ↓
Returns Caisper response to Telegram API
  ↓
User sees response in Telegram
```

### Key Features

- ✅ **Vercel-compatible**: Uses webhooks (not long-polling)
- ✅ **Reuses existing infrastructure**: Same ElizaOS runtime, Convex database, message quota system
- ✅ **No breaking changes**: Completely isolated from web chat
- ✅ **Secure**: Webhook secret validation + message quota enforcement

## Setup Instructions

### 1. Create a Telegram Bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow instructions
3. Choose a name (e.g., "Caisper Ghost")
4. Choose a username (e.g., `@CaisperGhostBot`)
5. Copy the bot token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### 2. Generate Webhook Secret

```bash
openssl rand -hex 32
```

Copy the output (64-character hex string).

### 3. Set Environment Variables

#### Local Development (.env.local)

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_WEBHOOK_SECRET=your-64-char-hex-string-from-step-2

# For local development with ngrok
NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io

# Media Generation Permissions (optional)
TELEGRAM_MEDIA_MODE=open                           # Permission mode: allowlist | blocklist | group-admins | open (default: open)
TELEGRAM_MEDIA_ALLOWLIST=username1,@username2,123456789  # Comma-separated usernames/IDs for unlimited access
TELEGRAM_MEDIA_BLOCKLIST=spammer1,@spammer2        # Comma-separated usernames/IDs to block
TELEGRAM_MEDIA_RATE_LIMIT=10                       # Default rate limit (images/day) for non-tiered users (default: 10)
```

#### Vercel Production

Add these to your Vercel project environment variables:

1. Go to Vercel project settings → Environment Variables
2. Add required variables:
   - `TELEGRAM_BOT_TOKEN` = `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
   - `TELEGRAM_WEBHOOK_SECRET` = `your-64-char-hex-string`
   - `NEXT_PUBLIC_APP_URL` = `https://ghostspeak.vercel.app` (or your custom domain)

3. Add optional media permission variables:
   - `TELEGRAM_MEDIA_MODE` = `open` (or `allowlist`, `blocklist`, `group-admins`)
   - `TELEGRAM_MEDIA_ALLOWLIST` = `username1,@username2,123456789` (if using allowlist mode)
   - `TELEGRAM_MEDIA_BLOCKLIST` = `spammer1,@spammer2` (if using blocklist mode)
   - `TELEGRAM_MEDIA_RATE_LIMIT` = `10` (if you want to override default)

### 4. Deploy to Vercel

```bash
git add .
git commit -m "feat: add Telegram bot integration"
git push origin main
```

Vercel will auto-deploy.

### 5. Register Webhook

After deployment completes:

```bash
cd apps/web
bun run scripts/setup-telegram-bot.ts
```

Expected output:
```
🤖 Setting up Telegram bot webhook...

📍 Webhook URL: https://ghostspeak.vercel.app/api/telegram/webhook
🔐 Webhook Secret: ✅ Set

✅ Bot found: @CaisperGhostBot (Caisper Ghost)
   Bot ID: 123456789

🧹 Removing existing webhook...
✅ Old webhook removed

📡 Setting new webhook...
✅ Webhook set successfully!

🔍 Verifying webhook...
   URL: https://ghostspeak.vercel.app/api/telegram/webhook
   Pending updates: 0

✅ Webhook verified!

🧪 Testing connection...
✅ Connection successful! (0 pending updates)

═══════════════════════════════════════════════════════════
🎉 Telegram bot setup complete!
═══════════════════════════════════════════════════════════
```

### 6. Test Your Bot

1. Open Telegram
2. Search for your bot (e.g., `@CaisperGhostBot`)
3. Send `/start`
4. Try: "Find me some agents"

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message with bot introduction |
| `/help` | Help guide with available commands |
| `/quota` | Check your daily message quota |
| `/media <prompt>` | Generate AI images with Google Imagen 4 |
| `/raid` | Generate X (Twitter) raid status |
| `/mute` | Mute bot in group (admins only) |
| `/unmute` | Unmute bot in group (admins only) |
| `/about` | About Caisper bot |

## Message Quota

Telegram users use the same quota system as web users:

| Tier | $GHOST Holdings | Daily Messages |
|------|----------------|----------------|
| **Free** | $0 | 3 messages/day |
| **Holder** | $10+ in $GHOST | 100 messages/day |
| **Whale** | $100+ in $GHOST | Unlimited |

**Future Enhancement**: Link Telegram account to Solana wallet for auto-tier detection.

## Media Generation Permissions

The `/media` command supports flexible permission control to prevent abuse while encouraging community engagement.

### Permission Modes

Configure with `TELEGRAM_MEDIA_MODE`:

#### 1. `open` (Default)
- **Everyone** can generate images
- Subject to rate limits based on $GHOST holdings
- Best for: Public community engagement

#### 2. `allowlist`
- **Only authorized users** can generate images
- Users in `TELEGRAM_MEDIA_ALLOWLIST` get unlimited access
- Everyone else is denied
- Best for: Private/exclusive communities

#### 3. `blocklist`
- **Everyone except blocked users** can generate images
- Users in `TELEGRAM_MEDIA_BLOCKLIST` are denied
- Everyone else subject to rate limits
- Best for: Open communities with specific bad actors

#### 4. `group-admins`
- **Group admins only** in group chats
- **Everyone** in DMs
- Best for: Preventing group spam while keeping DMs open

### Rate Limits

All users (except allowlist) are subject to rate limits based on $GHOST holdings:

| Tier | $GHOST Holdings | Daily Images | Notes |
|------|----------------|--------------|-------|
| **Free** | $0 | 5 images/day | Default for all users |
| **Holder** | $10+ in $GHOST | 25 images/day | Auto-detected via wallet |
| **Whale** | $100+ in $GHOST | 100 images/day | Auto-detected via wallet |
| **Allowlist** | Any | Unlimited | Overrides all other limits |

**Note**: Rate limits reset every 24 hours and are tracked per wallet address.

### Configuration Examples

#### Example 1: Open to everyone (default)
```bash
TELEGRAM_MEDIA_MODE=open
```
- Anyone can generate images
- Free users: 5/day, Holders: 25/day, Whales: 100/day

#### Example 2: Allowlist only
```bash
TELEGRAM_MEDIA_MODE=allowlist
TELEGRAM_MEDIA_ALLOWLIST=the_dexploarer,@alice,123456789
```
- Only `@the_dexploarer`, `@alice`, and user ID `123456789` can generate
- Unlimited images for allowlisted users
- Everyone else is denied

#### Example 3: Blocklist with custom rate limit
```bash
TELEGRAM_MEDIA_MODE=blocklist
TELEGRAM_MEDIA_BLOCKLIST=spammer1,@badactor
TELEGRAM_MEDIA_RATE_LIMIT=20
```
- Everyone except `@spammer1` and `@badactor` can generate
- Non-tiered users get 20/day instead of default 10/day
- $GHOST holders still get tier-based limits

#### Example 4: Group admins only
```bash
TELEGRAM_MEDIA_MODE=group-admins
```
- Only group admins can use `/media` in groups
- DMs are unrestricted (subject to rate limits)
- Prevents group spam

### Allowlist/Blocklist Format

Supports both usernames and Telegram user IDs:

```bash
# Usernames (with or without @)
TELEGRAM_MEDIA_ALLOWLIST=alice,@bob,charlie

# User IDs (numeric)
TELEGRAM_MEDIA_ALLOWLIST=123456789,987654321

# Mix of both
TELEGRAM_MEDIA_ALLOWLIST=alice,123456789,@bob
```

**How to find Telegram user ID:**
1. Forward a message from the user to `@userinfobot`
2. The bot will reply with user ID

### Permission Check Flow

When a user runs `/media`:

1. **Blocklist check** - Always deny if in blocklist
2. **Mode check** - Check permission mode rules
3. **Rate limit check** - Check daily quota (unless allowlisted)
4. **Generate image** - If all checks pass
5. **Increment counter** - Track usage for rate limiting

### Error Messages

Users see helpful error messages when denied:

**Blocklist**:
```
🚫 You are not authorized to generate images.
```

**Allowlist mode**:
```
🔒 Image generation is restricted to authorized users.

Contact @the_dexploarer to request access.
```

**Group admins mode**:
```
👮 Only group admins can generate images in this chat.

Use /media in a DM with me for unrestricted access!
```

**Rate limit exceeded**:
```
⏱️ Daily image limit reached (5/5)!

**Current Tier:** Free

**Upgrade with $GHOST:**
• Holder ($10): 25 images/day
• Whale ($100): 100 images/day

Get $GHOST: https://jup.ag/swap/SOL-GHOST

Limit resets in 12 hours.
```

## Local Development with ngrok

Telegram requires HTTPS for webhooks. For local development:

1. Install ngrok: `brew install ngrok` (or download from https://ngrok.com)

2. Start your Next.js dev server:
   ```bash
   cd apps/web
   bun run dev
   ```

3. In another terminal, start ngrok:
   ```bash
   ngrok http 3333
   ```

4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

5. Set environment variable:
   ```bash
   export NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
   ```

6. Run setup script:
   ```bash
   bun run scripts/setup-telegram-bot.ts
   ```

7. Test your bot on Telegram!

**Note**: ngrok URLs change on restart. Re-run setup script if you restart ngrok.

## Monitoring

### Check Webhook Health

```bash
curl https://ghostspeak.vercel.app/api/telegram/webhook
```

Expected response:
```json
{
  "status": "ok",
  "service": "telegram-webhook",
  "timestamp": "2026-01-10T12:34:56.789Z"
}
```

### View Logs

**Vercel logs**:
```bash
vercel logs --follow
```

**Convex logs** (message storage):
```bash
bunx convex logs
```

### Telegram Webhook Info

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

## Troubleshooting

### Bot not responding

1. **Check webhook is registered**:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```

   Look for `"url": "https://your-domain.com/api/telegram/webhook"`

2. **Check webhook is publicly accessible**:
   ```bash
   curl https://ghostspeak.vercel.app/api/telegram/webhook
   ```

   Should return `{"status":"ok",...}`

3. **Check Vercel environment variables**:
   - `TELEGRAM_BOT_TOKEN` is set
   - `TELEGRAM_WEBHOOK_SECRET` is set
   - `NEXT_PUBLIC_APP_URL` matches your domain

4. **Check Vercel logs for errors**:
   ```bash
   vercel logs --follow
   ```

### "Unauthorized" error

- Webhook secret mismatch
- Check `TELEGRAM_WEBHOOK_SECRET` in Vercel matches the secret used in setup script

### Messages timing out

- Telegram webhooks must respond within 60 seconds
- Check Convex/ElizaOS isn't timing out
- Check Vercel function timeout (default: 10s for Hobby, 60s for Pro)

### Quota not working

- Check Convex is accessible
- Check `messageQuota` Convex functions exist
- Telegram users use `telegram_<USER_ID>` as walletAddress

### Local development issues

- ngrok HTTPS URL must be used (not HTTP)
- ngrok free tier URLs expire after 2 hours
- Re-run setup script if ngrok restarts

## Files Added

```
apps/web/
├── app/api/telegram/webhook/
│   └── route.ts                    # Webhook handler
├── lib/telegram/
│   ├── adapter.ts                  # Telegram ↔ ElizaOS adapter
│   ├── groupChatLogic.ts           # Group chat handling
│   └── mediaPermissions.ts         # Media generation permission system
├── scripts/
│   └── setup-telegram-bot.ts      # Webhook registration script
└── TELEGRAM_BOT_SETUP.md          # This file
```

## Security Considerations

1. **Webhook Secret**: Always set `TELEGRAM_WEBHOOK_SECRET` to prevent unauthorized requests
2. **Rate Limiting**: Message quota prevents abuse (3 messages/day for free tier)
3. **User Isolation**: Telegram user IDs prefixed with `telegram_` to avoid collision with Solana addresses
4. **HTTPS Only**: Telegram requires HTTPS - enforced by Telegram Bot API

## Future Enhancements

- [ ] Link Telegram account to Solana wallet (auto-upgrade tier based on $GHOST holdings)
- [ ] Inline query support (e.g., `@CaisperGhostBot check score <address>`)
- [ ] Group chat support (Caisper as group admin)
- [ ] Telegram Mini App for full dashboard experience
- [ ] Push notifications for credential expirations
- [ ] Multi-language support

## Support

**Issues**: https://github.com/Ghostspeak/GhostSpeak/issues
**Telegram Community**: (Coming soon)
**Email**: support@ghostspeak.io

---

*Built with Telegraf, ElizaOS, and ghostly dedication 👻*
