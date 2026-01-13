# Boo - GhostSpeak Community Marketing Agent

**Date:** January 13, 2026
**Purpose:** Help GhostSpeak community create branded marketing content

---

## What Boo Should Actually Do

Boo is **GhostSpeak's community marketing helper**. That's it. Simple.

### Core Purpose:
Help GhostSpeak community members create:
- Raid graphics for X/Twitter
- Memes about GhostSpeak
- Announcements for features
- Profile cards for agents
- Infographics explaining Ghost Score

**All with GhostSpeak branding baked in.**

---

## Actions Boo Actually Needs (6 total)

### 1. GENERATE_IMAGE ✅
**Status:** Already implemented
**What it does:** Creates branded images with 13 templates
**Why:** Core feature - community needs graphics

### 2. LIST_TEMPLATES ✅
**Status:** Already in generateImage action
**What it does:** Shows available image templates
**Why:** Users need to know what they can make

### 3. SHOW_MY_IMAGES
**What it does:** Show user's last few generated images
**Why:** Let them see what they made recently
**Keep it simple:** Just last 10 images, no fancy filtering

### 4. WRITE_CAPTION
**What it does:** Write Twitter/X captions for images
**Why:** Make it easy to share on social
**Keep it simple:** Twitter only, 2-3 variations, done

### 5. CHECK_QUOTA
**What it does:** Show how many generations left
**Why:** Users need to know their limits
**Keep it simple:** "You have X/Y images left this month"

### 6. GENERATE_OUIJA ✅
**Status:** Already implemented
**What it does:** Fun mystical agent reports
**Why:** Entertaining, on-brand

---

## What Boo DOESN'T Need

❌ Video generation - out of scope
❌ Audio generation - out of scope
❌ GIF generation - out of scope
❌ Platform optimization - overcomplicated
❌ Engagement analysis - overcomplicated
❌ Brand consistency checker - overcomplicated
❌ Custom templates - overcomplicated
❌ Trend analysis - overcomplicated
❌ Asset library - overcomplicated
❌ Remix tools - overcomplicated
❌ Export bundles - overcomplicated

**Why remove all this?**
Because Boo's job is: **Help GhostSpeak community make images for Twitter raids and memes.**

That's it. Keep it focused.

---

## Implementation Plan (Simplified)

### What We Have:
1. ✅ GENERATE_IMAGE - Working
2. ✅ LIST_TEMPLATES - Working
3. ✅ GENERATE_OUIJA - Working

### What We Need to Add:
4. **SHOW_MY_IMAGES** - Simple history (10 images max)
5. **WRITE_CAPTION** - Twitter captions only
6. **CHECK_QUOTA** - Simple quota display

**Total work:** ~2 hours to add these 3 simple actions

### What We Need to Fix:
- Mini App currently bypasses Boo (calls API directly)
- Fix: Route through Boo character
- Remove exposed API key
- **Time:** 1 hour

**Grand Total:** 3 hours to complete Boo properly

---

## Simplified Actions

### SHOW_MY_IMAGES (NEW - Simple)

```typescript
export const showMyImagesAction: Action = {
  name: 'SHOW_MY_IMAGES',
  description: 'Show user\'s last 10 generated images',

  validate: async (_, message) => {
    const text = message.content.text.toLowerCase()
    return text.includes('my images') || text.includes('my creations') || text.includes('what i made')
  },

  handler: async (runtime, message, _, __, callback) => {
    // Just get last 10 images from Convex
    // Show URLs and descriptions
    // That's it. No fancy filtering, no cost tracking, just show the images.
  }
}
```

### WRITE_CAPTION (NEW - Simple)

```typescript
export const writeCaptionAction: Action = {
  name: 'WRITE_CAPTION',
  description: 'Write Twitter/X captions for images',

  validate: async (_, message) => {
    const text = message.content.text.toLowerCase()
    return text.includes('caption') || text.includes('tweet')
  },

  handler: async (runtime, message, _, __, callback) => {
    // Get user's prompt
    // Generate 2-3 Twitter captions (280 chars max)
    // Add #GhostSpeak #Web3 hashtags
    // Done. No platform detection, no 5 variations, just Twitter.
  }
}
```

### CHECK_QUOTA (NEW - Simple)

```typescript
export const checkQuotaAction: Action = {
  name: 'CHECK_QUOTA',
  description: 'Show generation quota status',

  validate: async (_, message) => {
    const text = message.content.text.toLowerCase()
    return text.includes('quota') || text.includes('how many') || text.includes('generations left')
  },

  handler: async (runtime, message, _, __, callback) => {
    // Get user's tier (free/holder/whale)
    // Show: "You have 3/5 images left this month"
    // Show: "Resets in 17 days"
    // That's it. No progress bars, no upgrade suggestions, just the facts.
  }
}
```

---

## Boo's Personality (Simplified)

**Boo is:**
- Energetic about GhostSpeak
- Helpful with making content
- Focused on community raids and memes
- Uses ghost/lime/tech emojis (👻 💚 ⚡)

**Boo is NOT:**
- A full creative agency
- An analytics dashboard
- A social media manager
- A video production studio

**Example conversations:**

```
User: "Make a raid graphic"
Boo: "🚀 On it! What should the raid say? (I'll add GhostSpeak branding automatically)"

User: "Join the Ghost Army - trust verified agents!"
Boo: "✨ Generating your raid graphic with electric lime branding..."
     [Returns image]
     "Want me to write some tweet captions for this too?"

User: "Yes"
Boo: "📝 Here are 3 tweet options:
     1. 🚀 Join the Ghost Army! Trust verified agents...
     2. 👻 No more rug pulls. AI agents you can trust...
     3. ⚡ GhostSpeak: Where AI agent trust is real..."

User: "How many images can I make?"
Boo: "You have 3/5 images left this month (Free tier). Resets in 17 days.
     Want to upgrade to Holder tier for 25/month? Hold 100 $GHOST!"
```

Simple. Focused. Useful.

---

## Next Steps (Corrected)

### 1. Simplify Existing Work
- Delete overcomplicated actions (listCreations, quotaStatus, generateCaption)
- Keep only what's needed for GhostSpeak community

### 2. Add 3 Simple Actions
- SHOW_MY_IMAGES (last 10 only)
- WRITE_CAPTION (Twitter only)
- CHECK_QUOTA (simple display)

### 3. Fix Mini App
- Route through Boo character
- Remove exposed API key
- Test image generation

**Total Time:** 3-4 hours
**Total Actions:** 6 (focused, simple, useful)

---

## What Success Looks Like

**Good:**
- Community member opens Telegram Mini App
- Generates a raid graphic about Ghost Score
- Gets 3 tweet captions automatically
- Shares on Twitter
- Other community members do the same
- GhostSpeak brand visibility increases

**Perfect outcome:**
- 100 community members using Boo
- Average 5 raid graphics per month each
- 500 branded images/month on Twitter
- Costs us $20/month in API fees
- Community growth and engagement

---

## Apology

You're right - I overcomplicated this massively. Boo doesn't need to be a full AI agency.

**Boo's job:** Help GhostSpeak community make branded raid graphics and memes for Twitter.

**That's it.**

Everything else was scope creep. Let's keep it simple and focused on what actually helps the GhostSpeak community.

---

**Next action:** Should I delete the overcomplicated actions and create 3 simple ones instead?
