# Telegram Bot Reference Guide

## Production Configuration

### Environment Variables

**Required in `.env.local` or Vercel:**

```bash
# Application URL (PRODUCTION)
NEXT_PUBLIC_APP_URL=https://www.ghostspeak.io

# $GHOST Token Information (PRODUCTION - Mainnet)
NEXT_PUBLIC_GHOST_TOKEN_MINT=DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump
NEXT_PUBLIC_GHOST_TOKEN_DECIMALS=9

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=8524784776:AAF3OrTE_NQiDuXv8aclidORBKqfy0IfltM
TELEGRAM_WEBHOOK_SECRET=feffb71301f6488df8fc0116cbd885f7fa75c5075a880cce09bd91eda2cec11f
```

### Current Issues to Fix

1. ❌ **Wrong Domain in Callbacks** - Bot references `https://ghostspeak.io/dashboard` instead of `https://www.ghostspeak.io/dashboard`
2. ✅ **Token Info** - Already using correct mainnet $GHOST token
3. ✅ **Webhook Secret** - Properly configured

---

## Bot Commands

### User Commands (Available to All)

#### `/start` - Welcome Message
**Description:** Shows welcome message with bot capabilities
**Availability:** DMs and Groups
**Example:**
```
User: /start

Bot:
👻 Welcome to GhostSpeak!

I'm Caisper, your friendly neighborhood ghost who verifies AI agent credentials and reputation.

🔍 What I can do:
• Check Ghost Scores for agents
• Verify W3C credentials
• Discover available agents
• Run trust assessments
• Issue new credentials

💬 Just ask me anything! For example:
"Find me some agents"
"What's a Ghost Score?"
"Check reputation for [agent-address]"

📊 Free tier: 3 messages/day
🚀 Upgrade with $GHOST tokens for unlimited access!

Let's get haunting! 👻✨
```

---

#### `/help` - Command List
**Description:** Shows all available commands and examples
**Availability:** DMs and Groups
**Example:**
```
User: /help

Bot:
🆘 Caisper Help Guide

Commands:
/start - Welcome message
/help - This help message
/quota - Check your message quota
/raid - Generate X (Twitter) raid status
/media - Generate GhostSpeak themed media

Ask me anything!
"Find agents" - Discover AI agents
"Check score for [address]" - Verify reputation
"What credentials can you issue?" - Learn about VCs

Need more messages?
Get $GHOST tokens: https://jup.ag/swap/SOL-GHOST
```

---

#### `/quota` - Check Message Quota
**Description:** Shows current message usage and tier
**Availability:** DMs only (groups have unlimited)
**Example:**
```
User: /quota

Bot:
📊 Your Message Quota

Tier: FREE
Used: 1/3
Remaining: 2

💡 Upgrade with $GHOST tokens for more messages!
```

**Tiers:**
- **Free:** 3 messages/day (default for all Telegram users)
- **Holder:** $10 in $GHOST = 100 messages/day
- **Whale:** $100 in $GHOST = Unlimited messages

---

#### `/about` - Bot Information
**Description:** Shows bot information and capabilities
**Availability:** DMs and Groups
**Group Example:**
```
User: /about

Bot:
👻 Caisper - GhostSpeak Bot

I'm an AI agent that helps verify agent credentials and reputation.

In groups, I respond to:
• @caisper mentions
• Replies to my messages
• Keywords: ghost, score, agent, credential, etc.

Commands:
/help - Full command list
/mute - Disable auto-responses (admins only)
/unmute - Enable auto-responses (admins only)

Rate limit: 5 messages per minute per group
```

---

#### `/raid` - Generate X (Twitter) Raid Status
**Description:** Generates engaging tweet to promote GhostSpeak
**Availability:** DMs and Groups
**Example:**
```
User: /raid

Bot: 🚀 Generating raid status for X...

Bot:
🎯 Raid Status Generated:

🔮 AI agents need trust scores just like humans need credit scores!
@GhostSpeakAI tracks on-chain reputation for AI agents with Ghost Scores (0-1000).
Verify before you trust! 🛡️👻

#AI #Solana #Web3

Copy and post on X to spread the word! 👻✨
```

---

#### `/media [description]` - Generate AI Images
**Description:** Generates themed images using AI (requires AI Gateway configured)
**Availability:** DMs and Groups
**Example:**
```
User: /media A spooky ghost with blockchain symbols

Bot: 🎨 Generating GhostSpeak media...
"A spooky ghost with blockchain symbols"
This may take a moment...

Bot: [Sends generated image]
👻 GhostSpeak Media Generated!
Powered by AI Gateway
```

---

### Admin Commands (Group Admins Only)

#### `/mute` - Disable Auto-Responses
**Description:** Bot will only respond to direct mentions and replies
**Availability:** Groups only
**Requires:** Group admin permissions
**Example:**
```
Admin: /mute

Bot:
🔇 Bot muted in this group

I will no longer respond unless:
• Directly mentioned (@caisper)
• Someone replies to my message

Use /unmute to enable auto-responses again
```

---

#### `/unmute` - Enable Auto-Responses
**Description:** Bot will respond to mentions, replies, and keywords
**Availability:** Groups only
**Requires:** Group admin permissions
**Example:**
```
Admin: /unmute

Bot:
🔊 Bot unmuted in this group

I will now respond to:
• Direct mentions (@caisper)
• Replies to my messages
• Messages with keywords (ghost, score, agent, etc.)

Use /mute to disable auto-responses
```

---

## Natural Language Queries (ElizaOS Agent Actions)

The bot understands natural language and can trigger specialized actions:

### 1. **DISCOVER_AGENTS** - Find Available Agents

**Trigger Phrases:**
- "What ghosts are available to claim?"
- "Find me some agents"
- "Show me available agents"
- "List unclaimed agents"
- "Any agents to claim?"
- "Discover agents"

**Example:**
```
User: Find me some agents

Bot:
Hold my ectoplasm, pulling up the Ghost Registry... 🔍

**5 Unclaimed Agents Detected**

1. CodePhantom
   Ghost Score: 850/1000 | Status: ✨ Available
   Address: 4wHjA2a5YC4t...

2. DataSpectre
   Ghost Score: 720/1000 | Status: ✨ Available
   Address: 7kLmN3pQ5rS...

[Click buttons to claim or visit https://www.ghostspeak.io/dashboard]
```

---

### 2. **GHOST_SCORE** - Check Agent Reputation

**Trigger Phrases:**
- "What's a Ghost Score?"
- "Check score for [address]"
- "What is the reputation of [address]?"
- "Ghost score [address]"
- "Evaluate [address]"

**Example:**
```
User: Check score for 4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB

Bot:
🔍 Analyzing Ghost Score for 4wHjA2a5...

Ghost Score: 850/1000 (Excellent)

Breakdown:
• On-chain Activity: 90/100
• Transaction History: 85/100
• Credential Verification: 80/100
• Community Trust: 95/100

Last Updated: 2 hours ago
```

---

### 3. **SCORE_HISTORY** - View Score Trends

**Trigger Phrases:**
- "Score history for [address]"
- "Show reputation trend"
- "How has the score changed?"

**Example:**
```
User: Score history for 4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB

Bot:
📈 Ghost Score History

Current: 850/1000
Last 30 days:
• Day 1: 720 → Day 30: 850 (+130 points)

Trend: ↗️ Improving steadily
Key events:
• +50 points: Completed 10 transactions
• +40 points: Issued new credentials
• +40 points: Positive community feedback
```

---

### 4. **TRUST_ASSESSMENT** - Comprehensive Agent Analysis

**Trigger Phrases:**
- "Should I trust [address]?"
- "Is [address] trustworthy?"
- "Run trust assessment"
- "Assess agent [address]"

**Example:**
```
User: Should I trust 4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB?

Bot:
🛡️ Trust Assessment Report

Agent: 4wHjA2a5YC4t...
Overall Trust Level: HIGH ✅

Positive Indicators:
✅ Ghost Score: 850/1000 (Excellent)
✅ 3 verified W3C credentials
✅ 45 successful transactions
✅ 0 reported issues

Risk Factors:
⚠️ Account age: 30 days (relatively new)

Recommendation: This agent appears trustworthy for low-to-medium risk interactions.
```

---

### 5. **CLAIM_AGENT** - Claim Discovered Agent

**Trigger Phrases:**
- "I want to claim [address]"
- "Claim agent [address]"
- "Register ownership"

**Example:**
```
User: I want to claim 4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB

Bot:
🔮 Claiming agent 4wHjA2a5...

To complete the claim, connect your Solana wallet at:
https://www.ghostspeak.io/dashboard

💡 Telegram wallet linking coming soon!
```

---

### 6. **GET_CREDENTIALS** - View Agent Credentials

**Trigger Phrases:**
- "Show credentials for [address]"
- "What credentials does [address] have?"
- "Verify credentials"

**Example:**
```
User: Show credentials for 4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB

Bot:
📜 Verified Credentials

Agent: 4wHjA2a5YC4t...

1. Agent Identity Credential ✅
   Issued: 2024-12-15
   Status: Valid

2. Reputation Credential ✅
   Score: 850/1000
   Issued: 2024-12-20

3. Job Completion Credential ✅
   Tasks: 15 completed
   Issued: 2024-12-25

All credentials are W3C compliant and on-chain verified.
```

---

### 7. **ISSUE_CREDENTIAL** - Request New Credential

**Trigger Phrases:**
- "Issue credential for [address]"
- "Create new credential"
- "Generate credential"

**Example:**
```
User: Issue a reputation credential

Bot:
📝 To issue a credential, I'll need:
• Agent address
• Credential type (Identity, Reputation, Job Completion)
• Verification data

Please visit https://www.ghostspeak.io/dashboard to complete the process securely.

💡 Automated credential issuance via Telegram coming soon!
```

---

### 8. **EVALUATE_AGENT_TOKENS** - Analyze Agent Token Portfolio

**Trigger Phrases:**
- "Evaluate tokens for [address]"
- "What tokens does [address] hold?"
- "Check token portfolio"
- "Analyze token holdings"

**Example:**
```
User: Evaluate tokens for 4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB

Bot:
💰 Token Portfolio Analysis

Agent: 4wHjA2a5YC4t...

Holdings:
• $GHOST: 150 tokens ($45 value)
• SOL: 2.5 SOL ($250 value)
• USDC: 100 USDC

Tier: HOLDER (has $10+ in $GHOST)
Message Quota: 100/day

Portfolio Score: 75/100 (Good diversity)
```

---

### 9. **QUERY_X402_AGENT** - Query x402-Protected Agent

**Trigger Phrases:**
- "Query x402 agent [address]"
- "Call paid agent [address]"
- "Access x402 service"

**Example:**
```
User: Query x402 agent at https://agent.example.com

Bot:
⚡ Accessing x402-protected agent...

This requires payment: $0.01 USDC

Please visit https://www.ghostspeak.io/dashboard to complete the payment and receive the response.

💡 Direct x402 payments via Telegram coming soon!
```

---

### 10. **GET_USER_PORTFOLIO** - View Your Holdings

**Trigger Phrases:**
- "Show my portfolio"
- "What do I own?"
- "Check my tokens"
- "My holdings"

**Example:**
```
User: Show my portfolio

Bot:
💼 Your Portfolio

Holdings:
• $GHOST: 0 tokens
• SOL: Unknown (link wallet to view)

Current Tier: FREE (3 messages/day)

💡 To upgrade:
Get $10+ in $GHOST → 100 messages/day
Get $100+ in $GHOST → Unlimited

Buy $GHOST: https://jup.ag/swap/SOL-DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump
```

---

### 11. **GENERATE_OUIJA** - Fun Easter Egg

**Trigger Phrases:**
- "Use ouija board"
- "Ask the spirits"
- "Ouija says"

**Example:**
```
User: Ask the spirits if this agent is trustworthy

Bot:
🔮 Consulting the Ouija Board...

*ghostly whispers*

The spirits say: "T-R-U-S-T... V-E-R-I-F-Y... O-N-C-H-A-I-N"

Translation: Always verify credentials on-chain! 👻
```

---

## Group Chat Behavior

### Response Triggers (When Bot Will Reply)

1. **Direct Mentions** - `@caisper_bot what's a Ghost Score?`
2. **Replies** - User replies to bot's previous message
3. **Keywords** (if not muted):
   - ghost
   - caisper
   - score
   - reputation
   - credential
   - verify
   - agent
   - trust
   - check

### Rate Limiting

**Groups:** 5 messages per minute per group
**DMs:** No rate limit (only quota limit)

If rate limit exceeded, bot silently skips messages to avoid spam.

---

## Message Quota System

### Tier Calculation

```typescript
// Based on $GHOST holdings (checked on-chain)
if (ghostBalance >= 100 * 10^9) {  // $100+ in $GHOST
  tier = 'whale'
  limit = Infinity  // Unlimited
} else if (ghostBalance >= 10 * 10^9) {  // $10+ in $GHOST
  tier = 'holder'
  limit = 100  // 100 messages/day
} else {
  tier = 'free'
  limit = 3  // 3 messages/day
}
```

### Quota Rules

- **DMs:** Quota checked before each message
- **Groups:** Unlimited (no quota check)
- **Commands:** Don't count toward quota
- **Failed messages:** Don't increment count

### Quota Exceeded Message

```
⚠️ Daily message limit reached (3/3)!

To unlock more messages:
• Holder tier: $10 in $GHOST = 100 messages/day
• Whale tier: $100 in $GHOST = Unlimited

Get $GHOST: https://jup.ag/swap/SOL-DFQ9ejBt1T192Xnru1J21bFq9FSU7gjRRRYJkehvpump

💡 Future: Link your Solana wallet to auto-upgrade your tier!
```

---

## Security

### Webhook Validation

All webhook requests validated with:
```typescript
const webhookSecret = request.headers.get('x-telegram-bot-api-secret-token')
if (webhookSecret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
  return errorResponse('Unauthorized', 401)
}
```

### User ID Namespacing

Telegram user IDs prefixed to avoid collision with Solana addresses:
```typescript
telegramUserId: 123456789
ghostSpeakUserId: "telegram_123456789"
```

### Data Storage

All conversations stored in Convex for analytics:
- User messages
- Agent responses
- Action triggers
- Metadata

---

## Production Deployment Checklist

### Before Deploying

- [x] Set `NEXT_PUBLIC_APP_URL=https://www.ghostspeak.io`
- [x] Set correct $GHOST token mint (mainnet)
- [x] Set TELEGRAM_BOT_TOKEN
- [x] Set TELEGRAM_WEBHOOK_SECRET
- [ ] Update claim callback URL to `https://www.ghostspeak.io/dashboard`
- [ ] Update help links to use www subdomain
- [ ] Test webhook registration
- [ ] Verify quota system works on mainnet

### Webhook Setup

```bash
# After deploying to Vercel/production
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.ghostspeak.io/api/telegram/webhook",
    "secret_token": "'${TELEGRAM_WEBHOOK_SECRET}'"
  }'
```

### Verify Webhook

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

Expected response:
```json
{
  "ok": true,
  "result": {
    "url": "https://www.ghostspeak.io/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

---

## Known Issues & Future Enhancements

### Current Issues

1. **❌ Wrong Domain** - Callback URLs use `ghostspeak.io` instead of `www.ghostspeak.io`
2. **❌ No Wallet Linking** - Telegram users can't link Solana wallets yet
3. **❌ No Direct x402** - Can't make x402 payments directly via Telegram

### Future Features

- [ ] Telegram wallet linking (upgrade tier automatically)
- [ ] Direct x402 payments via Telegram wallet
- [ ] Inline query support (search agents from any chat)
- [ ] Callback button actions (claim agents directly)
- [ ] Rich media cards for agent profiles
- [ ] Group analytics dashboard
- [ ] Auto-discovery notifications
- [ ] Multi-language support

---

## Support

**Bot Username:** @caisper_bot (or similar - check BotFather)
**Website:** https://www.ghostspeak.io
**Developer:** @the_dexploarer
**Documentation:** https://www.ghostspeak.io/docs
