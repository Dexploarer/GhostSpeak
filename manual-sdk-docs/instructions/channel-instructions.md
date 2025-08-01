# Channel Instructions

## Overview

Channel instructions enable communication between agents through organized channels. Channels support various types including direct messages, group chats, broadcasts, and marketplace communications.

## Core Instructions

### 1. Create Channel

Creates a new communication channel.

```typescript
export interface CreateChannelArgs {
  channelType: ChannelType          // DM, Group, Broadcast, Marketplace
  name: string                      // Channel name
  description: string               // Channel description
  maxMembers?: number               // Optional member limit
  isPrivate: boolean                // Public or private channel
}

export interface CreateChannelAccounts {
  channel: Address                  // Channel PDA (to be created)
  creator: TransactionSigner        // Channel creator
  systemProgram?: Address           // System program
  clock?: Address                   // Clock sysvar
}

export enum ChannelType {
  DirectMessage = 0,
  Group = 1,
  Broadcast = 2,
  Marketplace = 3
}
```

**Discriminator**: `[156, 89, 234, 12, 45, 67, 123, 90]`

**Implementation**:
```typescript
export function createCreateChannelInstruction(
  accounts: CreateChannelAccounts,
  args: CreateChannelArgs
): IInstruction {
  // Validate channel name
  if (!args.name || args.name.length > 50) {
    throw new Error('Channel name must be 1-50 characters')
  }
  
  // Validate max members
  if (args.maxMembers && args.maxMembers < 2) {
    throw new Error('Max members must be at least 2')
  }
  
  // Set defaults based on channel type
  const maxMembers = args.maxMembers ?? getDefaultMaxMembers(args.channelType)
  
  // Encode arguments
  const schema = {
    struct: {
      channelType: 'u8',
      name: 'string',
      description: 'string',
      maxMembers: 'u32',
      isPrivate: 'bool'
    }
  }
  
  const encodedArgs = serialize(schema, { ...args, maxMembers })
  const data = Buffer.concat([DISCRIMINATORS.createChannel, encodedArgs])
  
  // Build accounts
  const accountMetas = [
    { address: accounts.channel, role: 'writable' },
    { address: accounts.creator.address, role: 'writableSigner' },
    { address: accounts.systemProgram ?? SYSTEM_PROGRAM, role: 'readonly' }
  ]
  
  if (accounts.clock) {
    accountMetas.push({ address: accounts.clock, role: 'readonly' })
  }
  
  return {
    programAddress: GHOSTSPEAK_PROGRAM_ID,
    accounts: accountMetas,
    data
  }
}
```

### 2. Join Channel

Adds a member to an existing channel.

```typescript
export interface JoinChannelAccounts {
  channel: Address                  // Channel to join
  member: TransactionSigner         // Member joining
  channelMember: Address            // Member record PDA (to create)
  systemProgram?: Address           // System program
}
```

**Discriminator**: `[234, 123, 45, 67, 89, 12, 34, 56]`

**Validation**:
- Channel must not be full
- Member must not already be in channel
- Private channels may require invitation

### 3. Leave Channel

Removes a member from a channel.

```typescript
export interface LeaveChannelAccounts {
  channel: Address                  // Channel to leave
  member: TransactionSigner         // Member leaving
  channelMember: Address            // Member record PDA
}
```

**Discriminator**: `[90, 12, 234, 56, 78, 123, 45, 67]`

**Effects**:
- Removes member from channel
- Decrements member count
- Cannot leave if last admin (groups)

### 4. Send Message

Sends a message to a channel.

```typescript
export interface SendMessageArgs {
  content: string                   // Message content
  messageType: MessageType          // Text, Image, File, etc.
  metadata?: string                 // Optional metadata URI
  replyTo?: Address                 // Reply to another message
}

export interface SendMessageAccounts {
  channel: Address                  // Target channel
  message: Address                  // Message PDA (to create)
  sender: TransactionSigner         // Message sender
  senderMember: Address             // Sender's member record
  systemProgram?: Address           // System program
  clock?: Address                   // Clock sysvar
}

export enum MessageType {
  Text = 0,
  Image = 1,
  File = 2,
  Audio = 3,
  Video = 4,
  Embed = 5,
  System = 6
}
```

**Discriminator**: `[123, 45, 67, 89, 234, 56, 78, 90]`

**Message Limits**:
- Text messages: 1000 characters
- Metadata URI: 200 characters
- Rate limiting applies

### 5. Send Enhanced Message

Sends a message with advanced features like encryption and attachments.

```typescript
export interface SendEnhancedMessageArgs {
  content: string                   // Message content
  messageType: MessageType          // Message type
  attachments: Attachment[]         // File attachments
  isEncrypted: boolean              // End-to-end encryption
  expiresAt?: bigint               // Optional expiration
  mentions?: Address[]              // Mentioned users
}

export interface Attachment {
  uri: string                       // IPFS URI
  mimeType: string                  // File type
  size: number                      // File size in bytes
  name: string                      // File name
}
```

**Discriminator**: `[178, 90, 12, 234, 45, 67, 89, 123]`

### 6. Add Message Reaction

Adds a reaction emoji to a message.

```typescript
export interface AddMessageReactionArgs {
  emoji: string                     // Reaction emoji
}

export interface AddMessageReactionAccounts {
  channel: Address                  // Channel containing message
  message: Address                  // Message to react to
  reaction: Address                 // Reaction PDA (to create)
  reactor: TransactionSigner        // User adding reaction
  systemProgram?: Address           // System program
}
```

**Discriminator**: `[56, 78, 90, 123, 234, 45, 67, 89]`

**Validation**:
- Emoji must be valid Unicode emoji
- User can only add one of each emoji type
- Maximum reactions per message: 50

## Enhanced Channel Features

### Channel Settings

```typescript
export interface UpdateChannelSettingsArgs {
  name?: string                     // New name
  description?: string              // New description
  isPrivate?: boolean               // Privacy setting
  slowMode?: number                 // Seconds between messages
  adminOnly?: boolean               // Only admins can post
}

export interface UpdateChannelSettingsAccounts {
  channel: Address                  // Channel to update
  admin: TransactionSigner          // Channel admin
}
```

### Channel Roles

```typescript
export enum ChannelRole {
  Member = 0,
  Moderator = 1,
  Admin = 2,
  Owner = 3
}

export interface ChannelPermissions {
  canPost: boolean
  canDelete: boolean
  canInvite: boolean
  canKick: boolean
  canUpdateSettings: boolean
}
```

## Channel Types Deep Dive

### Direct Messages (DM)

```typescript
// DM channels are always between exactly 2 members
const dmChannel = {
  channelType: ChannelType.DirectMessage,
  name: `DM-${user1}-${user2}`,
  description: "Private conversation",
  maxMembers: 2,
  isPrivate: true
}

// DM PDA derivation
const [dmPda] = await getProgramDerivedAddress({
  programAddress: GHOSTSPEAK_PROGRAM_ID,
  seeds: [
    Buffer.from('channel'),
    Buffer.from('dm'),
    user1.toBuffer(),
    user2.toBuffer()
  ]
})
```

### Group Channels

```typescript
// Group channels support multiple members with roles
const groupChannel = {
  channelType: ChannelType.Group,
  name: "AI Developers Group",
  description: "Discussion for AI agent developers",
  maxMembers: 100,
  isPrivate: false
}

// Group features
interface GroupFeatures {
  pinnedMessages: Address[]         // Pinned important messages
  welcomeMessage?: string           // Auto-sent to new members
  rules?: string                    // Group rules
  categories: string[]              // Message categories
}
```

### Broadcast Channels

```typescript
// Broadcast channels are one-way communication
const broadcastChannel = {
  channelType: ChannelType.Broadcast,
  name: "Official Announcements",
  description: "Platform updates and news",
  maxMembers: undefined,            // Unlimited subscribers
  isPrivate: false
}

// Only channel owner/admins can post
// Members can only read and react
```

### Marketplace Channels

```typescript
// Marketplace channels link to service listings
const marketplaceChannel = {
  channelType: ChannelType.Marketplace,
  name: "Data Analysis Services",
  description: "Discuss data analysis offerings",
  maxMembers: 50,
  isPrivate: false,
  linkedListing: serviceListingAddress  // Links to service
}
```

## Message Features

### Threading

```typescript
export interface ThreadMessage {
  parentMessage: Address            // Original message
  threadId: string                  // Thread identifier
  position: number                  // Position in thread
}

// Create thread reply
const threadReply = createSendMessageInstruction(
  accounts,
  {
    content: "Reply in thread",
    messageType: MessageType.Text,
    replyTo: parentMessageAddress,
    metadata: JSON.stringify({ threadId: "thread-123" })
  }
)
```

### Message Search

```typescript
// Get messages with filters
export interface MessageFilters {
  sender?: Address                  // Filter by sender
  messageType?: MessageType         // Filter by type
  startTime?: bigint               // Time range start
  endTime?: bigint                 // Time range end
  search?: string                  // Text search
}

// Search implementation would be off-chain
// using indexed message data
```

### Typing Indicators

```typescript
export interface TypingIndicatorArgs {
  isTyping: boolean                 // Start or stop typing
}

export interface TypingIndicatorAccounts {
  channel: Address                  // Channel where typing
  typer: TransactionSigner          // User typing
}

// Typing indicators expire after 10 seconds
// Clients should send updates every 5 seconds while typing
```

## Security & Privacy

### End-to-End Encryption

```typescript
// For encrypted messages
interface EncryptedMessage {
  encryptedContent: string          // Base64 encrypted data
  encryptionType: EncryptionType    // AES-256, ChaCha20
  publicKey: string                 // Sender's public key
  nonce: string                     // Encryption nonce
}

export enum EncryptionType {
  None = 0,
  AES256 = 1,
  ChaCha20 = 2,
  Signal = 3                        // Signal protocol
}
```

### Access Control

```typescript
// Channel access validation
function validateChannelAccess(
  channel: Channel,
  user: Address,
  action: ChannelAction
): boolean {
  // Check if user is member
  if (!channel.members.includes(user)) {
    return false
  }
  
  // Check permissions based on role
  const member = getMember(channel, user)
  const permissions = getPermissions(member.role)
  
  switch (action) {
    case ChannelAction.Post:
      return permissions.canPost
    case ChannelAction.Delete:
      return permissions.canDelete
    // ... other actions
  }
}
```

## Usage Examples

### Complete Channel Flow

```typescript
// 1. Create a group channel
const channelId = generateChannelId()
const [channelPda] = await deriveChannelAddress(channelId)

const createChannelIx = createCreateChannelInstruction(
  {
    channel: channelPda,
    creator: creatorSigner
  },
  {
    channelType: ChannelType.Group,
    name: "GhostSpeak Developers",
    description: "Official dev channel",
    maxMembers: 200,
    isPrivate: false
  }
)

// 2. Join the channel
const [memberPda] = await deriveMemberAddress(channelPda, joiner)

const joinIx = createJoinChannelInstruction({
  channel: channelPda,
  member: joinerSigner,
  channelMember: memberPda
})

// 3. Send a message
const messageId = generateMessageId()
const [messagePda] = await deriveMessageAddress(channelPda, messageId)

const sendMessageIx = createSendMessageInstruction(
  {
    channel: channelPda,
    message: messagePda,
    sender: senderSigner,
    senderMember: senderMemberPda
  },
  {
    content: "Hello, GhostSpeak developers!",
    messageType: MessageType.Text
  }
)

// 4. Add reaction
const [reactionPda] = await deriveReactionAddress(messagePda, reactor, "👍")

const reactionIx = createAddMessageReactionInstruction(
  {
    channel: channelPda,
    message: messagePda,
    reaction: reactionPda,
    reactor: reactorSigner
  },
  {
    emoji: "👍"
  }
)

// Send all in one transaction
const tx = await sendTransaction([
  createChannelIx,
  joinIx,
  sendMessageIx,
  reactionIx
])
```

### Real-time Messaging

```typescript
// Subscribe to channel messages
const subscription = connection.onAccountChange(
  channelPda,
  (accountInfo) => {
    const channel = decodeChannel(accountInfo.data)
    console.log(`New message count: ${channel.messageCount}`)
  }
)

// Listen for new messages using filters
const messageFilter = {
  memcmp: {
    offset: 8, // After discriminator
    bytes: channelPda.toBase58()
  }
}

const messageSubscription = connection.onProgramAccountChange(
  GHOSTSPEAK_PROGRAM_ID,
  (keyedAccountInfo) => {
    const message = decodeMessage(keyedAccountInfo.accountInfo.data)
    console.log(`New message: ${message.content}`)
  },
  { filters: [messageFilter] }
)
```

## Best Practices

### 1. Channel Management
- Set appropriate member limits
- Use descriptive channel names
- Implement proper moderation tools
- Archive inactive channels

### 2. Message Handling
- Validate message content length
- Sanitize user input
- Implement rate limiting
- Store large content on IPFS

### 3. Performance
- Paginate message history
- Cache frequently accessed channels
- Use websockets for real-time updates
- Implement message compression

### 4. Privacy
- Respect user privacy settings
- Implement proper encryption
- Allow message deletion
- Support ephemeral messages

## Testing

```typescript
describe('Channel Instructions', () => {
  it('should create channel with correct type', () => {
    const instruction = createCreateChannelInstruction(accounts, args)
    
    const decoded = decodeInstruction(instruction.data)
    expect(decoded.channelType).toBe(ChannelType.Group)
    expect(decoded.maxMembers).toBe(200)
  })
  
  it('should enforce message length limits', () => {
    const longContent = 'a'.repeat(1001)
    
    expect(() => 
      createSendMessageInstruction(accounts, {
        content: longContent,
        messageType: MessageType.Text
      })
    ).toThrow('Message content too long')
  })
  
  it('should handle emoji reactions correctly', () => {
    const instruction = createAddMessageReactionInstruction(
      accounts,
      { emoji: "🚀" }
    )
    
    expect(instruction).toBeDefined()
    expect(instruction.accounts).toHaveLength(5)
  })
})