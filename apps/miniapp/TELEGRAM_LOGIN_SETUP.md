# Telegram Login Widget Setup

The Telegram Login Widget allows users to authenticate with their Telegram account when accessing the Mini App from a browser (not from Telegram).

## Current Configuration

- **Bot Name**: Boo (GhostSpeak Marketing & Media Bot)
- **Bot Username**: `@boo_gs_bot`
- **Bot Token**: `8506178231:AAE...` (stored as `TELEGRAM_BOO_BOT_TOKEN` in web app's `.env.local`)

## Setup Required

### Step 1: Configure Bot Domain in BotFather

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/mybots`
3. Select **@boo_gs_bot**
4. Select **Bot Settings** → **Domain**
5. Send your domain (choose one):
   - **Production**: `ghostspeak.vercel.app` or your custom domain
   - **Local Testing**: Use ngrok (see below)

### Step 2A: Production Setup

If deploying to Vercel/production:

```bash
# Deploy the miniapp
cd apps/miniapp
vercel

# Get your deployment URL (e.g., ghostspeak-miniapp.vercel.app)
# Configure this domain in BotFather
```

Then in BotFather, send the domain **without** `https://`:
```
ghostspeak-miniapp.vercel.app
```

### Step 2B: Local Testing with ngrok

For local development:

```bash
# Install ngrok if needed
brew install ngrok  # macOS
# or download from https://ngrok.com

# Start ngrok tunnel
ngrok http 3334

# ngrok will show a public URL like:
# Forwarding: https://abc123.ngrok.io -> http://localhost:3334
```

Configure the ngrok domain in BotFather (without `https://`):
```
abc123.ngrok.io
```

**Important**: ngrok free tier URLs change every time you restart, so you'll need to update BotFather each time.

## How It Works

### User Flow:

1. **From Browser (not Telegram)**:
   - User visits the app
   - Sees "Verify Your Telegram Account" screen
   - Clicks "Log in with Telegram" button
   - Telegram Login Widget opens in popup
   - User authorizes with their Telegram account
   - User's real Telegram ID, username, name are extracted
   - User proceeds to the app

2. **From Telegram Mini App**:
   - User opens bot in Telegram
   - Bot sends Web App button
   - App detects Telegram context
   - Skips login widget
   - Uses Telegram's native authentication

### Security:

- Telegram verifies the domain matches BotFather configuration
- All data is cryptographically signed by Telegram
- Hash verification ensures data integrity
- sessionStorage keeps auth for current browser session only

## Verification

After configuring the domain, test the login widget:

1. Clear browser cache/cookies
2. Visit your app URL (production or ngrok)
3. You should see the Telegram Login button
4. Click it and authorize
5. Console should log: `Telegram auth successful: {id: ..., first_name: ..., ...}`

## Environment Variables

The miniapp uses:

```bash
# apps/miniapp/.env.local
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=boo_gs_bot
```

This is used to render the login widget. No server-side secrets needed on the client.

## Troubleshooting

### "Username invalid" error
- Bot username is wrong
- Check: `curl -s "https://api.telegram.org/bot<TOKEN>/getMe" | jq -r '.result.username'`

### Login widget doesn't appear
- Domain not configured in BotFather
- Using `localhost` directly (not allowed - use ngrok)
- Bot username mismatch

### Login succeeds but data not saved
- Check browser console for errors
- Verify sessionStorage has `telegram_user` key
- Check TelegramProvider is reading from sessionStorage

## Production Deployment

For production:

1. Deploy to Vercel/Cloudflare Pages
2. Get your production domain
3. Configure domain in BotFather
4. Set `NEXT_PUBLIC_APP_URL` in Vercel env vars
5. Users can now authenticate from any browser
6. Wallet linking will use their real Telegram user ID

## Development Workflow

**Recommended**:
- Use ngrok for local testing with real Telegram auth
- Or deploy to Vercel preview deployments for testing
- Production should always use the production domain

**Note**: The Telegram Login Widget is only needed for browser access. Users coming from Telegram (opening the Mini App via the bot) will use native Telegram authentication automatically.
