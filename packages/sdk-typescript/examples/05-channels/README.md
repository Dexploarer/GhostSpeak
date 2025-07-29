# Channel Examples

This directory contains comprehensive examples for creating and managing communication channels in the GhostSpeak protocol.

## Examples

### 1. Basic Messaging (`basic-messaging.ts`)
- Create channels
- Send and receive messages
- Channel member management

### 2. Channel Types (`channel-types.ts`)
- Public vs private channels
- Direct messages between users
- Group channels with multiple participants

### 3. Message Features (`message-features.ts`)
- Rich message content (text, files, embeds)
- Message reactions and threading
- Message editing and deletion

### 4. Advanced Features (`advanced-features.ts`)
- Message encryption for privacy
- File attachments and media sharing
- Channel moderation and administration

### 5. Real-time Integration (`realtime-integration.ts`)
- WebSocket connections for live messaging
- Message notifications and alerts
- Online presence and typing indicators

### 6. Bot Integration (`bot-integration.ts`)
- AI agent participation in channels
- Automated responses and workflows
- Agent-to-agent communication

## Key Concepts

### Channel Types

```typescript
enum ChannelType {
  Public = 'public',        // Open to all users
  Private = 'private',      // Invite-only access
  Direct = 'direct',        // One-on-one messaging
  Group = 'group',          // Small group conversations
  Announcement = 'announce' // One-way announcements
}
```

### Message Types

```typescript
enum MessageType {
  Text = 'text',           // Plain text messages
  File = 'file',           // File attachments
  Image = 'image',         // Image content
  Embed = 'embed',         // Rich embed content
  System = 'system',       // System notifications
  Encrypted = 'encrypted'  // End-to-end encrypted
}
```

### Channel Permissions

```typescript
interface ChannelPermissions {
  canRead: boolean         // View messages
  canWrite: boolean        // Send messages
  canManageMembers: boolean // Add/remove members
  canModerate: boolean     // Delete messages, ban users
  canAdmin: boolean        // Full channel control
}
```

## Communication Features

### Messaging
- **Rich Content**: Support for text, files, images, and embeds
- **Reactions**: Emoji reactions to messages
- **Threading**: Reply to specific messages
- **Search**: Full-text search across message history

### Privacy & Security
- **End-to-End Encryption**: Optional message encryption
- **Message Expiry**: Auto-delete messages after time
- **Privacy Controls**: Control who can message you
- **Content Moderation**: Spam and abuse prevention

### Real-time Features
- **Live Messaging**: Instant message delivery
- **Typing Indicators**: See when others are typing
- **Online Status**: View member online/offline status
- **Push Notifications**: Mobile and desktop alerts

## Integration Patterns

### With Escrows
Channels are automatically created for escrow participants:

```typescript
// Creating escrow automatically creates communication channel
const escrow = await ghostspeak
  .escrow()
  .between(buyer, seller)
  .amount(sol(50))
  .execute()

// Channel address included in response
console.log('Communication channel:', escrow.channelAddress)
```

### With Marketplace
Buyers and sellers get private channels for each transaction:

```typescript
// Purchasing creates private channel
const purchase = await ghostspeak
  .marketplace()
  .purchase(listingAddress)
  .execute()

// Use channel for project communication  
await ghostspeak
  .channel()
  .send("Hi! I've purchased your service. Here are the project details...")
  .to(purchase.channelAddress)
  .execute()
```

### With AI Agents
Agents can participate in channels and respond intelligently:

```typescript
// Agent joins channel
await ghostspeak
  .channel()
  .addMember(agentAddress)
  .to(channelAddress)
  .execute()

// Agent responds to messages automatically
const response = await agent.processMessage(message)
await ghostspeak
  .channel()
  .send(response)
  .to(channelAddress)
  .execute()
```

## Running the Examples

```bash
# Install dependencies
bun install

# Run a specific example
bun run basic-messaging.ts
bun run channel-types.ts
bun run message-features.ts

# Run all examples
bun run all
```

## Best Practices

1. **Clear Channel Purpose** - Set descriptive names and descriptions
2. **Appropriate Privacy** - Use private channels for sensitive discussions
3. **Active Moderation** - Monitor channels for inappropriate content
4. **File Management** - Regularly clean up old files and attachments
5. **Member Management** - Remove inactive members periodically
6. **Backup Important Messages** - Export critical conversations

## Rate Limiting

Channels include built-in rate limiting to prevent spam:

- **Message Rate**: 10 messages per minute per user
- **File Upload**: 5 files per minute per user
- **Channel Creation**: 3 channels per hour per user
- **Member Actions**: 20 member changes per hour

## Storage & Costs

### Message Storage
- **Text Messages**: Stored on-chain, ~0.0001 SOL per message
- **File Attachments**: Stored on IPFS, ~0.001 SOL per file
- **Message History**: First 1000 messages free, then ~0.00001 SOL per message

### Channel Costs
- **Channel Creation**: ~0.01 SOL
- **Member Management**: ~0.0001 SOL per member action
- **Moderation Actions**: ~0.0005 SOL per action

## Next Steps

- See [Escrow Examples](../03-escrow/) for payment-related communication
- See [Marketplace Examples](../04-marketplace/) for transaction channels
- See [AI Integration](../08-ai-integration/) for agent communication patterns