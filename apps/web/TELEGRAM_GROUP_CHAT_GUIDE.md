# Telegram Group Chat Guide for Caisper

## Overview

Caisper can now participate in Telegram group chats with smart response logic! The bot knows when to respond and when to stay silent, preventing spam while being helpful when needed.

---

## 🎯 When Does Caisper Respond in Groups?

The bot uses intelligent heuristics to determine when to participate:

### ✅ **Always Responds To:**

1. **Direct Mentions** - `@caisper check this agent`
2. **Replies** - Reply to any of Caisper's messages
3. **Trigger Keywords** - Messages containing:
   - `ghost`, `caisper`, `score`, `reputation`
   - `credential`, `verify`, `agent`, `trust`, `check`

### 🚫 **Never Responds To:**

1. **Random conversation** - Stays silent unless triggered
2. **Muted groups** - Respects `/mute` command (admins only)
3. **Rate-limited groups** - Max 5 messages per minute to prevent spam

---

## 🚀 Quick Start

### 1. Add Bot to Your Group

```
1. Open your Telegram group
2. Click group name → Add Members
3. Search for @CaisperGhostBot (or your bot's username)
4. Add bot to group
```

### 2. Make Bot Admin (Optional but Recommended)

```
1. Group Settings → Administrators
2. Add @CaisperGhostBot
3. Grant permissions:
   ✅ Delete Messages (for spam cleanup)
   ✅ Ban Users (if using anti-spam features)
```

### 3. Test Bot

```
Try these in your group:

@caisper hello
@caisper find me some agents
What's a Ghost Score?
Check reputation for <agent-address>
```

---

## 📋 Group Commands

### **General Commands**

| Command | Description | Who Can Use |
|---------|-------------|-------------|
| `/start` | Welcome message | Everyone |
| `/help` | Full command list | Everyone |
| `/about` | Bot info + group behavior | Everyone |
| `/quota` | Check your message quota | Everyone |

### **Admin-Only Commands**

| Command | Description | Effect |
|---------|-------------|--------|
| `/mute` | Disable auto-responses | Bot only responds to mentions/replies |
| `/unmute` | Enable auto-responses | Bot responds to keywords too |

---

## ⚙️ Configuration Options

### Environment Variables

```bash
# Customize trigger keywords (comma-separated)
TELEGRAM_GROUP_KEYWORDS=ghost,score,agent,caisper,verify,credential

# Rate limiting (default: 5 messages per minute)
TELEGRAM_GROUP_RATE_LIMIT=5
TELEGRAM_GROUP_RATE_WINDOW=60000  # milliseconds
```

### Smart Response Logic

The bot evaluates messages in this order:

```
1. Is this a direct mention? → Respond
2. Is this a reply to the bot? → Respond
3. Is the group muted? → Stay silent
4. Does message contain keywords? → Respond
5. Otherwise → Stay silent (avoid spam)
```

---

## 🔊 Mute/Unmute Feature

### Why Mute?

- Prevent bot from auto-responding in busy groups
- Only respond when explicitly mentioned or replied to
- Useful for general chat groups where bot context isn't always relevant

### How It Works

```
# Admin mutes the bot
/mute

# Bot behavior changes:
✅ Still responds to @caisper mentions
✅ Still responds to replies
❌ No longer responds to keywords
❌ No longer auto-participates

# Admin unmutes the bot
/unmute

# Bot resumes normal behavior
✅ Responds to mentions
✅ Responds to replies
✅ Responds to keywords
```

---

## 📊 Rate Limiting

To prevent spam, the bot enforces rate limits **per group**:

- **Max messages**: 5 per minute
- **Window**: 60 seconds rolling window
- **Behavior when exceeded**: Silently skip (no error message to avoid more spam)

### Example Scenario

```
Group chat activity:

12:00:00 - User: "@caisper what's your score" → Bot responds (1/5)
12:00:15 - User: "@caisper check agent X" → Bot responds (2/5)
12:00:30 - User: "@caisper verify this" → Bot responds (3/5)
12:00:45 - User: "@caisper another question" → Bot responds (4/5)
12:00:55 - User: "@caisper one more" → Bot responds (5/5)
12:00:58 - User: "@caisper hey" → Bot SILENT (rate limited)
12:01:01 - User: "@caisper hello" → Bot responds (limit reset)
```

---

## 🎭 Group vs. Private Chat Behavior

### Private Chats (DM)
- ✅ Responds to all messages
- ✅ No keyword filtering
- ✅ Full conversational mode
- ✅ Message quota applies (3/day free, more with $GHOST)

### Group Chats
- ✅ Responds to mentions
- ✅ Responds to replies
- ✅ Responds to keywords (unless muted)
- ✅ Rate limited (5/minute per group)
- ✅ Can be muted by admins
- ❌ No quota enforcement in groups (group-level rate limiting instead)

---

## 🛠️ Troubleshooting

### Bot Not Responding in Group

**Check 1: Is group muted?**
```
Send: /about
Look for: "Muted" status
Fix: /unmute (admin only)
```

**Check 2: Did you trigger it correctly?**
```
✅ @caisper hello (direct mention)
✅ Reply to bot's message
✅ Message with keywords: "What's a Ghost Score?"
❌ "Hey everyone!" (no trigger)
```

**Check 3: Rate limit reached?**
```
Wait 1 minute and try again
Rate limit: 5 messages/minute per group
```

**Check 4: Bot permissions**
```
Check: Bot is member of group
Check: Bot can read messages (privacy mode OFF)
Fix: Remove and re-add bot, or check with @BotFather
```

### Bot Responding Too Much

**Solution 1: Mute the bot**
```
Admin sends: /mute
Bot will only respond to mentions/replies
```

**Solution 2: Customize keywords**
```
Update TELEGRAM_GROUP_KEYWORDS env var
Remove overly common words
```

**Solution 3: Contact bot owner**
```
Rate limit might be too high
Ask to adjust TELEGRAM_GROUP_RATE_LIMIT
```

### Bot Not Admin But Needs Permissions

Some features require admin:
- Reading all messages (privacy mode)
- Checking member status for `/mute` validation

**Fix**: Make bot admin with minimal permissions

---

## 📐 Architecture

### Message Flow in Groups

```
User sends message in group
  ↓
Webhook receives update
  ↓
Is this a group chat? Yes
  ↓
Check: Direct mention? → Respond
Check: Reply to bot? → Respond
Check: Group muted? → Stay silent
Check: Keywords detected? → Respond
Otherwise → Stay silent
  ↓
Rate limit check (5/minute)
  ↓
Process with ElizaOS (same as DM)
  ↓
Send response to group
```

### Smart Response Logic

Located in `apps/web/lib/telegram/groupChatLogic.ts`:

```typescript
export async function shouldRespondInGroup(params: {
  message: Message
  botId: number
  botUsername: string
  chatId: number
  messageText: string
}): Promise<{
  shouldRespond: boolean
  reason: string
}>
```

**Reasons returned:**
- `"mentioned"` - Bot was @mentioned
- `"reply"` - Reply to bot's message
- `"keywords"` - Trigger keywords detected
- `"muted"` - Group is muted
- `"no_trigger"` - No conditions met

---

## 🔐 Security & Privacy

### Message Privacy

- ✅ Bot only processes messages it's mentioned in (unless keywords trigger)
- ✅ No user data stored beyond quota tracking
- ✅ Muted groups → minimal bot activity

### Admin Verification

- ✅ `/mute` and `/unmute` require admin status
- ✅ Bot checks user's role before executing admin commands
- ✅ Non-admins get polite error message

### Rate Limiting

- ✅ Prevents bot spam in groups
- ✅ Protects against malicious mention flooding
- ✅ Per-group tracking (isolated limits)

---

## 📈 Best Practices

### For Group Admins

1. **Test in Private First**
   - DM the bot to understand capabilities
   - Test commands before adding to group

2. **Set Expectations**
   - Pin a message explaining how to summon bot
   - Example: "To check agent reputation, mention @caisper"

3. **Use Mute Wisely**
   - Mute for general chat groups
   - Unmute for crypto/AI-focused groups

4. **Monitor Activity**
   - Watch for spam patterns
   - Adjust keywords if too many false positives

### For Bot Operators

1. **Customize Keywords**
   - Set `TELEGRAM_GROUP_KEYWORDS` based on your community
   - Avoid overly generic words

2. **Adjust Rate Limits**
   - Default: 5 messages/minute
   - Increase for active groups, decrease for quieter ones

3. **Monitor Logs**
   ```bash
   vercel logs --follow | grep "Group chat"
   ```

4. **Track Metrics**
   - Group response rate
   - Muted groups count
   - Most active groups

---

## 🚀 Advanced Features

### Custom Keyword Sets

```bash
# Set per-deployment
vercel env add TELEGRAM_GROUP_KEYWORDS production

# Example sets:
# Crypto focus: "token,price,buy,sell,dex,wallet"
# AI focus: "agent,bot,ai,llm,model,training"
# GhostSpeak: "ghost,score,reputation,credential,verify"
```

### Multi-Language Support

Currently English-only, but keywords can be localized:

```bash
# Spanish example
TELEGRAM_GROUP_KEYWORDS=fantasma,puntuación,agente,credencial

# Portuguese example
TELEGRAM_GROUP_KEYWORDS=fantasma,pontuação,agente,credencial
```

### Analytics Integration

Track group chat metrics:

```typescript
// In your analytics dashboard
const groupStats = getGroupStats()
console.log({
  totalGroups: groupStats.totalGroups,
  mutedGroups: groupStats.mutedGroups,
  activeGroups: groupStats.activeGroups,
})
```

---

## 📝 Example Group Scenarios

### Scenario 1: Crypto Community Group

**Setup:**
- 500 members
- Focus: Trading, AI agents
- Bot: Unmuted
- Keywords: Default (ghost, score, agent, etc.)

**Behavior:**
- Responds to questions about agent reputation
- Provides Ghost Scores when asked
- Issues credentials on request
- Stays silent during price discussions

**Sample Conversation:**
```
User A: "What's the best DEX for SOL?"
Bot: [Silent - no trigger]

User B: "Anyone know a good trading agent?"
Bot: "Looking for trading agents! Let me check the Ghost Registry..." [Triggered by "agent"]

User C: "@caisper verify agent XYZ123"
Bot: "Checking agent XYZ123's reputation..." [Triggered by mention]
```

### Scenario 2: General Chat (Muted)

**Setup:**
- 1000 members
- Focus: General crypto chat
- Bot: Muted
- Only responds to mentions/replies

**Behavior:**
- Stays silent during general conversation
- Responds when explicitly called
- No auto-participation

**Sample Conversation:**
```
User A: "Check out this new ghost score"
Bot: [Silent - group is muted, keywords ignored]

User B: "@caisper what's your purpose?"
Bot: "I'm Caisper, I verify agent credentials..." [Triggered by mention]

User C: [Replies to bot's message]
Bot: "Let me explain more..." [Triggered by reply]
```

---

## 🔄 Migration from DM to Group

If users are familiar with DM interaction:

1. **Explain group behavior**
   - "In groups, mention me with @caisper"
   - "Or use keywords like 'ghost score' in your message"

2. **Set up welcome message**
   ```
   When bot is added, it automatically sends:
   "👻 Hi! I'm Caisper. Mention me with @caisper or ask about
   ghost scores, agents, or credentials. Use /help for commands."
   ```

3. **Educate admins**
   - Share `/mute` and `/unmute` commands
   - Explain rate limiting

---

## 🆘 Support

**Bot not working?**
1. Check [Troubleshooting](#troubleshooting) section
2. Review Vercel logs: `vercel logs --follow`
3. Test in DM first to isolate group-specific issues

**Feature requests?**
- GitHub Issues: https://github.com/Ghostspeak/GhostSpeak/issues
- Label: `telegram-bot-enhancement`

**Questions?**
- Email: support@ghostspeak.io
- Telegram: (Join our community - link coming soon)

---

## 📚 Related Documentation

- **Initial Setup**: `TELEGRAM_BOT_SETUP.md`
- **Architecture**: `.claude/CLAUDE.md`
- **Smart Response Logic**: `apps/web/lib/telegram/groupChatLogic.ts`
- **Webhook Handler**: `apps/web/app/api/telegram/webhook/route.ts`

---

**Built with love, haunted with care 👻**
