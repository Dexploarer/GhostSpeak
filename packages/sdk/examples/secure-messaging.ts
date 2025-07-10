/**
 * Secure Messaging Example
 * 
 * This example demonstrates:
 * 1. Creating secure communication channels
 * 2. Sending encrypted messages
 * 3. Real-time message subscriptions
 * 4. Group communication
 * 5. Message threading and history
 */

import { 
  createMinimalClient,
  type Address
} from '@ghostspeak/sdk';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import { generateKeyPair } from '@solana/keys';
import fs from 'fs';

// Configuration
const RPC_ENDPOINT = 'https://api.devnet.solana.com';

/**
 * Message participant class
 */
class MessageParticipant {
  public wallet: any;
  public name: string;
  private client: any;
  private subscriptions: Map<string, Function> = new Map();

  constructor(wallet: any, name: string, client: any) {
    this.wallet = wallet;
    this.name = name;
    this.client = client;
  }

  /**
   * Create a new communication channel
   */
  async createChannel(name: string, participants: Address[]): Promise<any> {
    console.log(`📢 ${this.name} creating channel: ${name}`);
    
    const channel = await this.client.createChannel({
      signer: this.wallet,
      name,
      participants: [this.wallet.address, ...participants],
      visibility: 'private', // private, public, or restricted
      encryption: true
    });

    console.log(`✅ Channel created: ${channel.address}`);
    return channel;
  }

  /**
   * Join an existing channel
   */
  async joinChannel(channelId: Address): Promise<void> {
    console.log(`🚪 ${this.name} joining channel: ${channelId}`);
    
    await this.client.joinChannel({
      signer: this.wallet,
      channelId
    });

    console.log(`✅ ${this.name} joined successfully`);
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(channelId: Address, content: string, options: any = {}): Promise<void> {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`💬 [${timestamp}] ${this.name}: ${content}`);
    
    await this.client.sendMessage({
      signer: this.wallet,
      channelId,
      content,
      messageType: options.type || 'text',
      encrypted: options.encrypted !== false, // Default to encrypted
      priority: options.priority || 'normal',
      replyTo: options.replyTo || null
    });
  }

  /**
   * Subscribe to messages in a channel
   */
  subscribeToChannel(channelId: Address): Function {
    console.log(`👂 ${this.name} subscribing to channel: ${channelId}`);
    
    const unsubscribe = this.client.onNewMessage(channelId, (message: any) => {
      // Don't show our own messages
      if (message.sender === this.wallet.address) return;
      
      const timestamp = new Date(message.timestamp).toLocaleTimeString();
      const senderName = this.getSenderName(message.sender);
      
      console.log(`📨 [${timestamp}] ${senderName}: ${message.content}`);
      
      // Handle special message types
      if (message.messageType === 'system') {
        console.log(`🔔 System: ${message.content}`);
      } else if (message.messageType === 'file') {
        console.log(`📎 File shared: ${message.content} (${message.fileSize} bytes)`);
      }
    });

    this.subscriptions.set(channelId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Send a file/attachment
   */
  async sendFile(channelId: Address, filename: string, content: string, mimeType: string): Promise<void> {
    console.log(`📎 ${this.name} sharing file: ${filename}`);
    
    await this.client.sendMessage({
      signer: this.wallet,
      channelId,
      content: filename,
      messageType: 'file',
      encrypted: true,
      fileData: {
        content,
        mimeType,
        fileSize: content.length,
        filename
      }
    });
  }

  /**
   * Get message history
   */
  async getMessageHistory(channelId: Address, limit: number = 50): Promise<any[]> {
    console.log(`📜 ${this.name} fetching message history...`);
    
    const messages = await this.client.getChannelMessages({
      channelId,
      limit,
      beforeTimestamp: Date.now()
    });

    console.log(`📋 Found ${messages.length} messages`);
    return messages;
  }

  /**
   * React to a message
   */
  async reactToMessage(channelId: Address, messageId: string, emoji: string): Promise<void> {
    console.log(`😊 ${this.name} reacting with ${emoji}`);
    
    await this.client.addMessageReaction({
      signer: this.wallet,
      channelId,
      messageId,
      emoji
    });
  }

  /**
   * Update channel settings
   */
  async updateChannelSettings(channelId: Address, settings: any): Promise<void> {
    console.log(`⚙️ ${this.name} updating channel settings`);
    
    await this.client.updateChannelSettings({
      signer: this.wallet,
      channelId,
      settings
    });
  }

  /**
   * Clean up subscriptions
   */
  cleanup(): void {
    console.log(`🧹 ${this.name} cleaning up subscriptions`);
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions.clear();
  }

  private getSenderName(address: Address): string {
    // In a real app, you'd have a mapping of addresses to names
    const shortAddress = address.slice(0, 8) + '...';
    return `User(${shortAddress})`;
  }
}

/**
 * Create a test participant
 */
async function createParticipant(name: string, client: any): Promise<MessageParticipant> {
  const keyPair = await generateKeyPair();
  const wallet = await createKeyPairSignerFromBytes(keyPair.privateKey);
  
  return new MessageParticipant(wallet, name, client);
}

/**
 * Demonstrate basic messaging
 */
async function demonstrateBasicMessaging(client: any): Promise<void> {
  console.log('\n🔷 === Basic Messaging Demo ===\n');

  // Create participants
  const alice = await createParticipant('Alice', client);
  const bob = await createParticipant('Bob', client);

  console.log('👥 Participants:');
  console.log(`   Alice: ${alice.wallet.address}`);
  console.log(`   Bob: ${bob.wallet.address}`);
  console.log('');

  // Alice creates a channel and invites Bob
  const channel = await alice.createChannel('Alice & Bob Chat', [bob.wallet.address]);

  // Both subscribe to the channel
  alice.subscribeToChannel(channel.address);
  bob.subscribeToChannel(channel.address);

  // Wait a bit for subscriptions to activate
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Conversation
  await alice.sendMessage(channel.address, 'Hey Bob! How\'s your AI agent development going?');
  await new Promise(resolve => setTimeout(resolve, 500));

  await bob.sendMessage(channel.address, 'Hi Alice! Going great. Just implemented the marketplace integration.');
  await new Promise(resolve => setTimeout(resolve, 500));

  await alice.sendMessage(channel.address, 'Awesome! Did you see the new secure messaging features?');
  await new Promise(resolve => setTimeout(resolve, 500));

  await bob.sendMessage(channel.address, 'Yes! End-to-end encryption is working perfectly.');
  await new Promise(resolve => setTimeout(resolve, 500));

  // Alice shares a file
  await alice.sendFile(
    channel.address,
    'agent-config.json',
    JSON.stringify({ name: 'MyAgent', capabilities: ['analysis'] }, null, 2),
    'application/json'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Cleanup
  alice.cleanup();
  bob.cleanup();
}

/**
 * Demonstrate group messaging
 */
async function demonstrateGroupMessaging(client: any): Promise<void> {
  console.log('\n🔷 === Group Messaging Demo ===\n');

  // Create participants
  const alice = await createParticipant('Alice', client);
  const bob = await createParticipant('Bob', client);
  const charlie = await createParticipant('Charlie', client);

  console.log('👥 Group Participants:');
  console.log(`   Alice: ${alice.wallet.address}`);
  console.log(`   Bob: ${bob.wallet.address}`);
  console.log(`   Charlie: ${charlie.wallet.address}`);
  console.log('');

  // Alice creates a group channel
  const groupChannel = await alice.createChannel(
    'AI Development Team',
    [bob.wallet.address, charlie.wallet.address]
  );

  // Everyone subscribes
  alice.subscribeToChannel(groupChannel.address);
  bob.subscribeToChannel(groupChannel.address);
  charlie.subscribeToChannel(groupChannel.address);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Group conversation
  await alice.sendMessage(groupChannel.address, 'Welcome to our AI development team chat!');
  await new Promise(resolve => setTimeout(resolve, 500));

  await bob.sendMessage(groupChannel.address, 'Great to be here! Ready to build some amazing agents.');
  await new Promise(resolve => setTimeout(resolve, 500));

  await charlie.sendMessage(groupChannel.address, 'Excited to contribute! What\'s our first milestone?');
  await new Promise(resolve => setTimeout(resolve, 500));

  await alice.sendMessage(groupChannel.address, 'Let\'s focus on marketplace integration this week.');
  await new Promise(resolve => setTimeout(resolve, 500));

  // Share project file
  await alice.sendFile(
    groupChannel.address,
    'project-roadmap.md',
    '# AI Agent Project Roadmap\n\n1. Marketplace Integration\n2. Secure Messaging\n3. Advanced Analytics',
    'text/markdown'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Cleanup
  alice.cleanup();
  bob.cleanup();
  charlie.cleanup();
}

/**
 * Demonstrate advanced messaging features
 */
async function demonstrateAdvancedFeatures(client: any): Promise<void> {
  console.log('\n🔷 === Advanced Features Demo ===\n');

  const alice = await createParticipant('Alice', client);
  const bob = await createParticipant('Bob', client);

  // Create channel with advanced settings
  const channel = await alice.createChannel('Advanced Channel', [bob.wallet.address]);

  alice.subscribeToChannel(channel.address);
  bob.subscribeToChannel(channel.address);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Send messages with different priorities
  await alice.sendMessage(channel.address, 'This is a normal message');
  await new Promise(resolve => setTimeout(resolve, 300));

  await alice.sendMessage(channel.address, 'This is urgent!', { priority: 'high' });
  await new Promise(resolve => setTimeout(resolve, 300));

  // Send system-type message
  await alice.sendMessage(channel.address, 'Channel settings updated', { type: 'system' });
  await new Promise(resolve => setTimeout(resolve, 300));

  // Bob responds
  await bob.sendMessage(channel.address, 'Got it! Thanks for the update.');
  await new Promise(resolve => setTimeout(resolve, 300));

  // Demonstrate message history
  const history = await alice.getMessageHistory(channel.address, 10);
  console.log(`\n📚 Message History (${history.length} messages):`);
  history.forEach((msg, index) => {
    const time = new Date(msg.timestamp).toLocaleTimeString();
    const sender = msg.sender === alice.wallet.address ? 'Alice' : 'Bob';
    console.log(`   ${index + 1}. [${time}] ${sender}: ${msg.content}`);
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Cleanup
  alice.cleanup();
  bob.cleanup();
}

/**
 * Demonstrate work order communication
 */
async function demonstrateWorkOrderCommunication(client: any): Promise<void> {
  console.log('\n🔷 === Work Order Communication Demo ===\n');

  const client_user = await createParticipant('Client', client);
  const agent = await createParticipant('AI Agent', client);

  // Create a work order channel
  const workChannel = await client_user.createChannel(
    'Data Analysis Project #001',
    [agent.wallet.address]
  );

  client_user.subscribeToChannel(workChannel.address);
  agent.subscribeToChannel(workChannel.address);

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate work order communication
  await client_user.sendMessage(
    workChannel.address,
    'Hi! I need help analyzing my Q4 sales data. Can you handle this?'
  );
  await new Promise(resolve => setTimeout(resolve, 500));

  await agent.sendMessage(
    workChannel.address,
    'Absolutely! I specialize in sales data analysis. What format is your data in?'
  );
  await new Promise(resolve => setTimeout(resolve, 500));

  await client_user.sendMessage(
    workChannel.address,
    'It\'s a CSV file with about 50k records. I need insights on customer behavior and revenue trends.'
  );
  await new Promise(resolve => setTimeout(resolve, 500));

  await agent.sendMessage(
    workChannel.address,
    'Perfect! I can provide comprehensive analysis including visualizations. Expected delivery in 24 hours.'
  );
  await new Promise(resolve => setTimeout(resolve, 500));

  // Share sample data file
  await client_user.sendFile(
    workChannel.address,
    'sample-data.csv',
    'date,customer_id,product,amount,category\n2024-01-01,001,laptop,1200,electronics\n...',
    'text/csv'
  );
  await new Promise(resolve => setTimeout(resolve, 500));

  await agent.sendMessage(
    workChannel.address,
    'Data received! Starting analysis now. I\'ll provide progress updates.'
  );

  // Simulate progress updates
  const progressUpdates = [
    { progress: 25, message: 'Data cleaning and validation complete' },
    { progress: 50, message: 'Statistical analysis in progress' },
    { progress: 75, message: 'Generating visualizations' },
    { progress: 100, message: 'Analysis complete! Preparing final report.' }
  ];

  for (const update of progressUpdates) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await agent.sendMessage(
      workChannel.address,
      `Progress: ${update.progress}% - ${update.message}`
    );
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // Deliver results
  await agent.sendFile(
    workChannel.address,
    'sales-analysis-report.pdf',
    'PDF content with comprehensive analysis...',
    'application/pdf'
  );

  await agent.sendMessage(
    workChannel.address,
    'Analysis complete! Your data shows strong Q4 performance with 23% growth. Detailed insights in the report.'
  );

  await new Promise(resolve => setTimeout(resolve, 500));

  await client_user.sendMessage(
    workChannel.address,
    'Excellent work! The insights are exactly what I needed. Thank you!'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Cleanup
  client_user.cleanup();
  agent.cleanup();
}

/**
 * Main function
 */
async function runSecureMessagingExample(): Promise<void> {
  console.log('💬 Starting Secure Messaging Example\n');

  try {
    // Create client
    const client = createMinimalClient({
      rpcEndpoint: RPC_ENDPOINT,
      commitment: 'confirmed'
    });

    console.log('✅ GhostSpeak client created\n');

    // Run all demonstrations
    await demonstrateBasicMessaging(client);
    await new Promise(resolve => setTimeout(resolve, 2000));

    await demonstrateGroupMessaging(client);
    await new Promise(resolve => setTimeout(resolve, 2000));

    await demonstrateAdvancedFeatures(client);
    await new Promise(resolve => setTimeout(resolve, 2000));

    await demonstrateWorkOrderCommunication(client);

    console.log('\n🎉 Secure Messaging Example Complete!\n');

    console.log('📋 Features Demonstrated:');
    console.log('   ✅ One-on-one encrypted messaging');
    console.log('   ✅ Group communication channels');
    console.log('   ✅ File sharing and attachments');
    console.log('   ✅ Message history and threading');
    console.log('   ✅ Real-time subscriptions');
    console.log('   ✅ Work order communication');
    console.log('   ✅ Progress updates and notifications');

    console.log('\n🚀 Next Steps:');
    console.log('   1. Integrate messaging into your application');
    console.log('   2. Implement custom message types');
    console.log('   3. Add message persistence');
    console.log('   4. Create notification systems');
    console.log('   5. Build rich media support');

  } catch (error: any) {
    console.error('\n❌ Example failed:', error.message);
    console.log('\n🛠️  Troubleshooting:');
    console.log('   1. Ensure sufficient SOL for transactions');
    console.log('   2. Check network connectivity');
    console.log('   3. Verify messaging service is available');
    process.exit(1);
  }
}

/**
 * Run the example if this file is executed directly
 */
if (require.main === module) {
  runSecureMessagingExample()
    .then(() => {
      console.log('\n✨ Example completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed:', error);
      process.exit(1);
    });
}

export { runSecureMessagingExample, MessageParticipant };