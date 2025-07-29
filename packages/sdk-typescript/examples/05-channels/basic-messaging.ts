/**
 * Basic Channel Messaging Example
 * 
 * Shows how to create channels, send messages, and manage members
 */

import GhostSpeak, { sol, type GhostSpeak as GS } from '@ghostspeak/sdk'
import { Keypair } from '@solana/kit'
import type { Address } from '@solana/addresses'

async function main() {
  console.log('💬 Basic Channel Messaging Example')
  console.log('═════════════════════════════════════')

  const ghostspeak = new GhostSpeak().enableDevMode()
  
  // Create test keypairs
  const alice = await Keypair.generate()
  const bob = await Keypair.generate()
  const charlie = await Keypair.generate()
  
  console.log('👥 Test Participants:')
  console.log(`   Alice: ${alice.address}`)
  console.log(`   Bob: ${bob.address}`)
  console.log(`   Charlie: ${charlie.address}`)

  // 1. Create a Public Channel
  console.log('\n📤 Creating public channel...')
  
  try {
    const channel = await ghostspeak
      .channel()
      .create("general-discussion")
      .description("General discussion channel for the community")
      .public()
      .maxMembers(100)
      .debug()
      .execute()

    console.log('✅ Public channel created!')
    console.log(`   Address: ${channel.address}`)
    console.log(`   Transaction: ${channel.signature}`)
    
    const channelModule = ghostspeak.channel()
    
    // 2. Query Channel Details
    console.log('\n📊 Retrieving channel details...')
    
    const channelData = await channelModule.getAccount(channel.address)
    if (channelData) {
      console.log('📋 Channel Details:')
      console.log(`   Name: ${channelData.name}`)
      console.log(`   Type: ${channelData.channelType}`)
      console.log(`   Members: ${channelData.memberCount}/${channelData.maxMembers}`)
      console.log(`   Created: ${channelData.createdAt}`)
      console.log(`   Owner: ${channelData.owner}`)
    }

    // 3. Add Members to Channel
    console.log('\n👥 Adding members to channel...')
    
    const addBobTx = await channelModule.addMember(alice, {
      channelAddress: channel.address,
      memberAddress: bob.address
    })
    
    console.log('✅ Bob added to channel')
    console.log(`   Transaction: ${addBobTx}`)
    
    const addCharlieTx = await channelModule.addMember(alice, {
      channelAddress: channel.address,
      memberAddress: charlie.address
    })
    
    console.log('✅ Charlie added to channel')
    console.log(`   Transaction: ${addCharlieTx}`)

    // 4. Send Messages
    console.log('\n💬 Sending messages...')
    
    // Alice sends welcome message
    const message1 = await channelModule
      .send("Welcome everyone! This is our new discussion channel. Feel free to share ideas and ask questions.")
      .to(channel.address)
      .execute()
    
    console.log('📝 Alice sent welcome message')
    console.log(`   Message ID: ${message1.address}`)
    
    // Bob responds
    const message2 = await channelModule
      .send("Thanks Alice! Excited to be here. Looking forward to great discussions.")
      .to(channel.address)
      .from(bob)
      .execute()
    
    console.log('📝 Bob responded')
    console.log(`   Message ID: ${message2.address}`)
    
    // Charlie joins the conversation
    const message3 = await channelModule
      .send("Hello everyone! 👋 Thanks for adding me to the channel.")
      .to(channel.address)
      .from(charlie)
      .execute()
    
    console.log('📝 Charlie joined conversation')
    console.log(`   Message ID: ${message3.address}`)

    // 5. Query Messages
    console.log('\n📖 Retrieving channel messages...')
    
    const messages = await channelModule.getMessages(channel.address, { limit: 10 })
    console.log(`Found ${messages.length} messages in channel`)
    
    for (const [index, msg] of messages.entries()) {
      const timestamp = new Date(msg.data.timestamp).toLocaleTimeString()
      console.log(`   ${index + 1}. [${timestamp}] ${msg.data.sender}: ${msg.data.content}`)
    }

    // 6. React to Messages
    console.log('\n👍 Adding reactions to messages...')
    
    const reactionTx = await channelModule.reactToMessage(bob, {
      messageAddress: message1.address,
      reaction: "👍"
    })
    
    console.log('✅ Bob reacted to Alice\'s message')
    console.log(`   Transaction: ${reactionTx}`)
    
    // Add another reaction
    const reaction2Tx = await channelModule.reactToMessage(charlie, {
      messageAddress: message1.address,
      reaction: "🎉"
    })
    
    console.log('✅ Charlie reacted to Alice\'s message')
    console.log(`   Transaction: ${reaction2Tx}`)

    // 7. Edit Message
    console.log('\n✏️ Editing message...')
    
    const editTx = await channelModule.editMessage(alice, {
      messageAddress: message1.address,
      newContent: "Welcome everyone! This is our new discussion channel. Feel free to share ideas and ask questions. Updated: Please keep discussions on-topic and respectful."
    })
    
    console.log('✅ Alice edited her message')
    console.log(`   Transaction: ${editTx}`)

    // 8. Query Message with Reactions
    console.log('\n📊 Checking message reactions...')
    
    const messageWithReactions = await channelModule.getMessage(message1.address)
    if (messageWithReactions && messageWithReactions.reactions) {
      console.log('🎭 Message Reactions:')
      for (const [emoji, users] of Object.entries(messageWithReactions.reactions)) {
        console.log(`   ${emoji}: ${users.length} users`)
      }
    }

    // 9. Query Channel Members
    console.log('\n👥 Checking channel members...')
    
    const members = await channelModule.getMembers(channel.address)
    console.log(`Channel has ${members.length} members:`)
    
    for (const [index, member] of members.entries()) {
      console.log(`   ${index + 1}. ${member.address} (joined: ${member.joinedAt})`)
    }

    // 10. Create Direct Message Channel
    console.log('\n📱 Creating direct message channel...')
    
    const dmChannel = await channelModule
      .createDirect(alice.address, bob.address)
      .execute()
    
    console.log('✅ Direct message channel created')
    console.log(`   Address: ${dmChannel.address}`)
    
    // Send DM
    const dmMessage = await channelModule
      .send("Hey Bob! This is a private message just between us.")
      .to(dmChannel.address)
      .from(alice)
      .execute()
    
    console.log('📝 Private message sent')
    console.log(`   Message ID: ${dmMessage.address}`)

    // 11. Remove Member (Demonstration)
    console.log('\n➖ Demonstrating member removal...')
    
    // Alice removes Charlie temporarily for demo
    const removeTx = await channelModule.removeMember(alice, {
      channelAddress: channel.address,
      memberAddress: charlie.address
    })
    
    console.log('✅ Charlie temporarily removed from channel')
    console.log(`   Transaction: ${removeTx}`)
    
    // Re-add Charlie
    const readdTx = await channelModule.addMember(alice, {
      channelAddress: channel.address,
      memberAddress: charlie.address
    })
    
    console.log('✅ Charlie re-added to channel')
    console.log(`   Transaction: ${readdTx}`)

  } catch (error) {
    handleError(error)
  }

  // 12. Query User's Channels
  console.log('\n📋 Querying Alice\'s channels...')
  
  try {
    const aliceChannels = await ghostspeak.channel().getUserChannels(alice.address)
    console.log(`Alice is a member of ${aliceChannels.length} channels`)
    
    for (const userChannel of aliceChannels) {
      console.log(`   • ${userChannel.data.name} (${userChannel.data.channelType})`)
    }
  } catch (error) {
    console.error('❌ Failed to query user channels:', error.message)
  }

  // 13. Demonstrate Rate Limiting
  console.log('\n⏱️ Rate limiting demonstration...')
  console.log('   ℹ️ Channels have built-in rate limiting:')
  console.log('   • 10 messages per minute per user')
  console.log('   • 5 file uploads per minute per user')
  console.log('   • 20 member actions per hour per channel')

  console.log('\n✨ Basic channel messaging complete!')
}

/**
 * Handle errors with GhostSpeak's smart error system
 */
function handleError(error: unknown) {
  if (error instanceof Error && 'code' in error) {
    const gsError = error as GS.SDKError
    console.error('\n❌ Error:', gsError.message)
    
    if (gsError.solution) {
      console.log('💡 Solution:', gsError.solution)
    }
    
    if (gsError.context) {
      console.log('📊 Context:', gsError.context)
    }
  } else {
    console.error('\n❌ Error:', error)
  }
}

main().catch(handleError)