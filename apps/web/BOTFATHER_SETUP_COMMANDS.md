# BotFather Setup Commands for Caisper

## Step-by-Step Setup with @BotFather

### 1. Set Bot Commands

Send this to @BotFather on Telegram:

```
/mybots
[Select your bot]
Edit Bot → Edit Commands
```

Then paste this command list:

```
start - Welcome message and bot introduction
help - Show available commands and examples
about - Bot info and capabilities
quota - Check your daily message quota
mute - Disable auto-responses in groups (admin only)
unmute - Enable auto-responses in groups (admin only)
```

---

### 2. Set Bot Description (What users see when they open the bot)

```
/mybots
[Select your bot]
Edit Bot → Edit Description
```

Paste this:

```
👻 Caisper - GhostSpeak's AI agent for verifying credentials and reputation

I help you discover and verify AI agents by checking their Ghost Scores, W3C credentials, and on-chain reputation.

💬 Just ask me anything! For example:
• "Find me some agents"
• "What's a Ghost Score?"
• "Check reputation for [agent-address]"

🔍 In groups, mention me with @caisper or use keywords like "ghost score", "agent", "credential" to get my attention.

📊 Free tier: 3 messages/day
🚀 Upgrade with $GHOST tokens for unlimited access

Let's get haunting! 👻✨
```

---

### 3. Set About Text (Short description)

```
/mybots
[Select your bot]
Edit Bot → Edit About Text
```

Paste this:

```
GhostSpeak's credential and reputation verification agent. I check Ghost Scores, verify W3C credentials, and help you discover trustworthy AI agents. Free tier: 3 messages/day. Upgrade with $GHOST for unlimited access.
```

---

### 4. Set Bot Picture (Optional)

```
/mybots
[Select your bot]
Edit Bot → Edit Botpic
```

Upload Caisper's avatar (the ghost logo from your assets).

---

### 5. Configure Privacy Settings (IMPORTANT for groups)

```
/mybots
[Select your bot]
Bot Settings → Group Privacy
```

**Set to: DISABLED**

This allows the bot to read all group messages (needed for keyword detection).

**Why?**
- With privacy mode ON, bot only sees messages that mention it or are commands
- With privacy mode OFF, bot can see all messages and detect keywords like "ghost score"

---

### 6. Set Join Groups Permission

```
/mybots
[Select your bot]
Bot Settings → Allow Groups?
```

**Set to: ENABLED**

This allows users to add the bot to groups.

---

### 7. Inline Mode (Optional - for future features)

```
/mybots
[Select your bot]
Bot Settings → Inline Mode
```

**Set to: DISABLED** (for now)

You can enable this later when you add inline queries.

---

## Quick Copy-Paste Setup

### Commands List (copy this entire block):
```
start - Welcome message and bot introduction
help - Show available commands and examples
about - Bot info and capabilities
quota - Check your daily message quota
mute - Disable auto-responses in groups (admin only)
unmute - Enable auto-responses in groups (admin only)
```

### Description (copy this entire block):
```
👻 Caisper - GhostSpeak's AI agent for verifying credentials and reputation

I help you discover and verify AI agents by checking their Ghost Scores, W3C credentials, and on-chain reputation.

💬 Just ask me anything! For example:
• "Find me some agents"
• "What's a Ghost Score?"
• "Check reputation for [agent-address]"

🔍 In groups, mention me with @caisper or use keywords like "ghost score", "agent", "credential" to get my attention.

📊 Free tier: 3 messages/day
🚀 Upgrade with $GHOST tokens for unlimited access

Let's get haunting! 👻✨
```

### About Text (copy this entire block):
```
GhostSpeak's credential and reputation verification agent. I check Ghost Scores, verify W3C credentials, and help you discover trustworthy AI agents. Free tier: 3 messages/day. Upgrade with $GHOST for unlimited access.
```

---

## Testing After Setup

### 1. Test in Private Chat (DM)

```
/start
/help
/about
/quota
"Find me some agents"
"What's a Ghost Score?"
```

### 2. Test in Group

**Without mention (should respond to keywords):**
```
What's a ghost score?
Check this agent's reputation
Tell me about credentials
```

**With mention:**
```
@caisper hello
@caisper find agents
@caisper verify this
```

**Admin commands:**
```
/mute
[Bot should now ignore keywords]

What's a ghost score?
[Bot should stay silent]

@caisper hello
[Bot should respond - mentions work even when muted]

/unmute
[Bot should resume responding to keywords]
```

---

## Group Setup Checklist

After adding bot to your group:

- [ ] Bot is member of group (added successfully)
- [ ] Privacy mode is OFF (bot can read all messages)
- [ ] Send `/about` to verify bot is working
- [ ] Test keyword trigger: "What's a ghost score?"
- [ ] Test mention: `@caisper hello`
- [ ] Test reply: Reply to one of bot's messages
- [ ] Test `/mute` (if you're admin)
- [ ] Test `/unmute` (if you're admin)

---

## Troubleshooting

### Bot doesn't respond to keywords in group

**Check 1: Privacy mode**
```
/mybots → [Your Bot] → Bot Settings → Group Privacy → DISABLED
```

**Check 2: Bot is actually in the group**
```
Open group members list, search for bot
```

**Check 3: Group is not muted**
```
Send: /about
Look for "Muted: No"
If muted: /unmute
```

### Bot doesn't respond to anything

**Check 1: Webhook is set**
```bash
bun run telegram:setup
```

**Check 2: Vercel deployment is live**
```bash
curl https://ghostspeak.vercel.app/api/telegram/webhook
# Should return: {"status":"ok",...}
```

**Check 3: Environment variables set in Vercel**
```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
NEXT_PUBLIC_APP_URL=https://ghostspeak.vercel.app
```

---

## Advanced: Customize Keywords for Your Group

If default keywords trigger too often (or not enough), customize:

```bash
# In Vercel, add environment variable:
TELEGRAM_GROUP_KEYWORDS=ghost,score,agent,reputation

# Examples for different communities:
# Crypto focus: token,dex,swap,agent,bot
# AI focus: ai,agent,llm,model,bot
# General: ghost,caisper,score
```

After changing keywords, redeploy:
```bash
vercel --prod
```

---

## Support

**Bot not working?**
1. Check this document's troubleshooting section
2. Review Vercel logs: `vercel logs --follow`
3. Test in DM first (simpler debugging)

**Need help?**
- GitHub: https://github.com/Ghostspeak/GhostSpeak/issues
- Email: support@ghostspeak.io

---

**You're all set! 👻 Caisper is ready to haunt your Telegram group!**
