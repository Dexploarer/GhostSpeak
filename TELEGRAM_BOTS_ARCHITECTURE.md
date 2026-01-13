# GhostSpeak Telegram Bots Architecture

## Overview

GhostSpeak uses **TWO separate Telegram bots** for different purposes:

### 1. Caisper Bot (@caisper_bot)
**Purpose**: Main AI agent for verification & reputation
**Token**: `TELEGRAM_BOT_TOKEN` = `8524784776:AAF...`
**Webhook**: `/api/telegram/webhook`
**Character**: Caisper (verification specialist)

**Features**:
- Agent reputation checking
- W3C credential verification
- Ghost Score queries
- DM and Group chat support
- Message quota system (3/day free, upgradeable with $GHOST)

**Usage**:
- Users message `@caisper_bot` on Telegram
- Works in DMs and group chats
- Processes messages through Caisper character

---

### 2. Boo Bot (@boo_gs_bot)
**Purpose**: Marketing & media agent with Mini App
**Token**: `TELEGRAM_BOO_BOT_TOKEN` = `8506178231:AAE...`
**Webhook**: *Not yet configured*
**Character**: Boo (community marketing helper)

**Features**:
- Image generation (Google Imagen 4)
- Twitter caption writing
- Ouija board reports
- Telegram Mini App (Web UI)
- Same quota system as Caisper

**Usage**:
- Users message `@boo_gs_bot` on Telegram (when webhook configured)
- Users can open Mini App from bot menu
- Mini App provides web interface for image generation

---

## Current Status

### ✅ Working (Production):
1. **Caisper Bot (@caisper_bot)**
   - Webhook configured
   - DM chat works
   - Group chat works
   - Deployed to Vercel

2. **Web App (localhost:3333)**
   - Caisper character available
   - Boo character available
   - Both work via web interface

### 🚧 Needs Configuration:

1. **Boo Bot Telegram Webhook**
   - Need to create separate webhook endpoint for Boo
   - Current: Only Caisper has webhook (`/api/telegram/webhook`)
   - **Option A**: Create `/api/telegram/webhook/boo` for Boo-specific handling
   - **Option B**: Share webhook, route by bot token

2. **Boo Mini App Telegram Login**
   - Bot username configured: `@boo_gs_bot`
   - Need to set domain in BotFather for login widget to work
   - **Required**: Configure domain for `@boo_gs_bot` in BotFather

---

## Architecture Decisions Needed

### Question 1: Should Boo have its own Telegram chat bot?

**Option A: Yes - Boo gets own chat interface**
- Users can message `@boo_gs_bot` for image generation, captions, etc.
- Need separate webhook endpoint or shared webhook with routing
- Boo processes messages using Boo character actions

**Option B: No - Boo is Mini App only**
- `@boo_gs_bot` only serves the Mini App
- No chat messages to `@boo_gs_bot`
- Users interact with Boo only via Mini App web interface

**Current Implementation**: Mini App only (Option B)

### Question 2: Mini App - Which characters should be available?

**Current**: Mini App has:
- Boo actions (image generation, captions, ouija)
- Tab navigation for different features
- Profile page with wallet linking

**Options**:
1. **Mini App = Boo only** (current)
   - `/create` → Boo image generation
   - `/verify` → *Could add Caisper verification*
   - Keep Caisper separate in main chat bot

2. **Mini App = Both Boo + Caisper**
   - Add Caisper tab for verification
   - Users can switch between agents
   - Unified experience

---

## Recommended Setup

### Immediate (Working Setup):

1. **Keep Caisper Bot as-is**
   - No changes needed
   - Already working in production

2. **Boo Bot = Mini App Only**
   - Don't create chat webhook for Boo yet
   - Focus on Mini App experience
   - Simpler architecture

3. **Mini App Domain Setup**
   - Deploy Mini App to Vercel
   - Configure domain in BotFather for `@boo_gs_bot`
   - Enable Telegram Login Widget for browser users

### Future Enhancements:

1. **Add Boo Chat Bot** (if needed)
   - Create `/api/telegram/webhook/boo` endpoint
   - Configure webhook URL with BotFather
   - Boo can respond to messages

2. **Add Caisper to Mini App** (if desired)
   - Add verification tab to Mini App
   - Users can verify agents via web UI
   - Unified experience

---

## Implementation Summary

### What's Working:
✅ Web App (`localhost:3333`)
  - Caisper chat (/caisper)
  - Both characters available

✅ Caisper Telegram Bot (`@caisper_bot`)
  - DM chat
  - Group chat
  - Deployed webhook

✅ Mini App UI (`localhost:3334`)
  - Image generation (Boo)
  - Profile with wallet linking
  - Telegram auth gate (needs domain config)

### What Needs Setup:

🔧 **Boo Bot Mini App Domain** (Required for login widget)
  - Deploy Mini App to Vercel
  - Configure domain in BotFather
  - OR use ngrok for local testing

🤔 **Boo Bot Chat** (Optional - user decision)
  - Do we want `@boo_gs_bot` to respond to chat messages?
  - Or keep it Mini App only?

---

## Next Steps

1. **Decision**: Should Boo have chat capabilities or Mini App only?

2. **If Mini App only** (recommended for now):
   - Deploy Mini App to Vercel
   - Configure domain in BotFather for `@boo_gs_bot`
   - Test Telegram Login Widget
   - Users open Mini App from `@boo_gs_bot` menu button

3. **If Boo needs chat**:
   - Create new webhook endpoint
   - Route messages to Boo character
   - Configure webhook URL with BotFather

## Summary

- **Caisper Bot**: Fully working, production ready ✅
- **Boo Bot**: Mini App ready, needs domain config 🔧
- **Choice**: Mini App only vs. Mini App + Chat
- **Recommendation**: Start with Mini App only, add chat later if needed
