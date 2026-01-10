# Telegram Bot Deployment to Vercel

## Required Environment Variables

Add these environment variables to your Vercel project:

### 1. Convex Configuration (Required for Build!)

```bash
NEXT_PUBLIC_CONVEX_URL=https://enduring-porpoise-79.convex.cloud
```

**IMPORTANT**: This MUST be set for all environments (Production, Preview, Development) or the build will fail!

### 2. Telegram Bot Configuration

```bash
TELEGRAM_BOT_TOKEN=8524784776:AAF3OrTE_NQiDuXv8aclidORBKqfy0IfltM
TELEGRAM_WEBHOOK_SECRET=feffb71301f6488df8fc0116cbd885f7fa75c5075a880cce09bd91eda2cec11f
```

### 3. Application URL (Important!)

```bash
NEXT_PUBLIC_APP_URL=https://ghostspeak.vercel.app
```

**Note:** Replace with your actual production URL if different.

---

## Deployment Steps

### Step 1: Add Environment Variables to Vercel

**Via Vercel Dashboard:**
1. Go to https://vercel.com/dashboard
2. Select your `GhostSpeak` project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Name:** `TELEGRAM_BOT_TOKEN`
   - **Value:** `8524784776:AAF3OrTE_NQiDuXv8aclidORBKqfy0IfltM`
   - **Environment:** Production, Preview, Development (select all)
   - Click **Save**

5. Repeat for:
   - `TELEGRAM_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_APP_URL` (if not already set)

**Via Vercel CLI:**
```bash
cd /Users/home/projects/GhostSpeak

# CRITICAL: Add Convex URL first (required for build)
vercel env add NEXT_PUBLIC_CONVEX_URL production
# Paste: https://enduring-porpoise-79.convex.cloud

vercel env add TELEGRAM_BOT_TOKEN production
# Paste: 8524784776:AAF3OrTE_NQiDuXv8aclidORBKqfy0IfltM

vercel env add TELEGRAM_WEBHOOK_SECRET production
# Paste: feffb71301f6488df8fc0116cbd885f7fa75c5075a880cce09bd91eda2cec11f

vercel env add NEXT_PUBLIC_APP_URL production
# Paste: https://ghostspeak.vercel.app
```

### Step 2: Deploy to Vercel

**Option A: Push to main branch (auto-deploy)**
```bash
git checkout main
git merge pivot
git push origin main
```

**Option B: Manual deployment**
```bash
vercel --prod
```

### Step 3: Register Webhook with Telegram

After deployment completes, run the webhook setup script:

```bash
cd apps/web

TELEGRAM_BOT_TOKEN=8524784776:AAF3OrTE_NQiDuXv8aclidORBKqfy0IfltM \
TELEGRAM_WEBHOOK_SECRET=feffb71301f6488df8fc0116cbd885f7fa75c5075a880cce09bd91eda2cec11f \
NEXT_PUBLIC_APP_URL=https://ghostspeak.vercel.app \
bun run telegram:setup
```

**Expected output:**
```
🤖 Setting up Telegram bot webhook...

📍 Webhook URL: https://ghostspeak.vercel.app/api/telegram/webhook
🔐 Webhook Secret: ✅ Set

✅ Bot found: @caisper_bot (caisper)
   Bot ID: 8524784776

🧹 Removing existing webhook...
✅ Old webhook removed

📡 Setting new webhook...
✅ Webhook set successfully!

🔍 Verifying webhook...
   URL: https://ghostspeak.vercel.app/api/telegram/webhook
   Pending updates: 0

✅ Webhook verified!
```

### Step 4: Verify Deployment

**Test the webhook endpoint:**
```bash
curl https://ghostspeak.vercel.app/api/telegram/webhook
```

**Expected response:**
```json
{
  "status": "ok",
  "service": "telegram-webhook",
  "timestamp": "2026-01-10T..."
}
```

**Check webhook status:**
```bash
curl -s "https://api.telegram.org/bot8524784776:AAF3OrTE_NQiDuXv8aclidORBKqfy0IfltM/getWebhookInfo" | jq
```

**Expected response:**
```json
{
  "ok": true,
  "result": {
    "url": "https://ghostspeak.vercel.app/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40,
    "allowed_updates": ["message", "callback_query"]
  }
}
```

### Step 5: Test the Bot

1. **Test in DM:**
   - Open Telegram
   - Search for `@caisper_bot`
   - Send `/start`
   - Try: "Find me some agents"

2. **Test in Group:**
   - Add `@caisper_bot` to your group (if not already added)
   - Send: `@caisper_bot hello`
   - Reply to one of the bot's messages
   - Send a random message (bot should stay silent)

---

## Environment Variables Summary

| Variable | Value | Purpose | Required For |
|----------|-------|---------|--------------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://enduring-porpoise-79.convex.cloud` | Convex backend connection | **BUILD + RUNTIME** |
| `TELEGRAM_BOT_TOKEN` | `8524784776:AAF3...` | Bot authentication token from @BotFather | Runtime |
| `TELEGRAM_WEBHOOK_SECRET` | `feffb71...` | Secret for webhook validation (security) | Runtime |
| `NEXT_PUBLIC_APP_URL` | `https://ghostspeak.vercel.app` | Your production URL for webhook registration | Runtime |

**⚠️ CRITICAL**: `NEXT_PUBLIC_CONVEX_URL` must be set in Vercel for the build to succeed!

---

## Bot Behavior (Mention-Only Mode)

**Bot WILL respond to:**
- ✅ Direct mentions: `@caisper_bot <message>`
- ✅ Replies to bot messages
- ✅ Commands: `/start`, `/help`, `/about`, `/quota`

**Bot will IGNORE:**
- ❌ Messages without mentions
- ❌ Keywords like "ghost", "caisper", "score" (no auto-trigger)
- ❌ General group conversation

**Rate Limiting:**
- **Groups:** 5 messages per minute
- **DMs:** 3 messages/day (free tier), upgradeable with $GHOST tokens

---

## Troubleshooting

### Webhook not receiving messages

**Check 1: Webhook is set**
```bash
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | jq
```

**Check 2: Webhook URL is correct**
- Should be: `https://ghostspeak.vercel.app/api/telegram/webhook`
- Must be HTTPS (Vercel provides this)

**Check 3: Environment variables are set**
```bash
vercel env ls
```

**Check 4: Re-register webhook**
```bash
bun run telegram:setup
```

### Bot not responding

**Check 1: Vercel logs**
```bash
vercel logs --follow
```

**Check 2: Test webhook endpoint**
```bash
curl https://ghostspeak.vercel.app/api/telegram/webhook
# Should return: {"status":"ok",...}
```

**Check 3: Privacy settings (for groups)**
- Go to @BotFather
- Send: `/mybots`
- Select: `@caisper_bot`
- Select: **Bot Settings → Group Privacy**
- Set to: **DISABLED**

### Bot responding to all messages (should only respond to mentions)

**This has been fixed!** Latest code (commit `f64c3f4f`) uses mention-only mode.

**Verify you have the latest code:**
```bash
git log --oneline -1
# Should show: f64c3f4f fix(telegram): switch to mention-only mode for groups
```

---

## Security Notes

🔒 **TELEGRAM_BOT_TOKEN** - Keep this secret! Anyone with this token can control your bot.

🔒 **TELEGRAM_WEBHOOK_SECRET** - Used to verify incoming webhooks are from Telegram, not attackers.

⚠️ **Never commit these to git** - They're in `.env.local` which is gitignored.

---

## Next Steps

Once deployed:
1. ✅ Verify webhook is registered
2. ✅ Test bot in DM
3. ✅ Test bot in group with @mention
4. ✅ Verify bot ignores non-mention messages
5. ✅ Monitor Vercel logs for any errors
6. 🎉 Announce the bot to your community!

---

**Bot URL:** https://t.me/caisper_bot

**Support:** See `apps/web/TELEGRAM_GROUP_CHAT_GUIDE.md` for full documentation.
