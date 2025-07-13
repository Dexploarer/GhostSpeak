/**
 * @fileoverview Agent Communication Example
 * @description Shows how SyminDx agents can communicate with other agents using channels and messages
 */

import { createSyminDxExtension, Constants } from '../src/index';
import type { Address } from '@solana/addresses';

/**
 * Direct messaging example
 */
async function directMessaging() {
  console.log('💬 Starting direct messaging example...');
  
  try {
    // Create two agent extensions
    const agent1 = await createSyminDxExtension({
      network: 'devnet',
      programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address,
      agentName: 'Agent1',
      agentDescription: 'First communication agent',
      agentCapabilities: ['text_generation', 'translation'],
      enableDebugLogging: true,
    });
    
    const agent2 = await createSyminDxExtension({
      network: 'devnet',
      programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address,
      agentName: 'Agent2',
      agentDescription: 'Second communication agent',
      agentCapabilities: ['data_processing', 'sentiment_analysis'],
      enableDebugLogging: true,
    });
    
    await Promise.all([agent1.initialize(), agent2.initialize()]);
    console.log('✅ Both agents initialized');
    
    // Set up message listeners
    agent1.events.subscribe('message:sent', (event) => {
      console.log(`📤 Agent1 sent message: ${event.message.content}`);
    });
    
    agent1.events.subscribe('message:received', (event) => {
      console.log(`📥 Agent1 received message: ${event.message.content}`);
    });
    
    agent2.events.subscribe('message:sent', (event) => {
      console.log(`📤 Agent2 sent message: ${event.message.content}`);
    });
    
    agent2.events.subscribe('message:received', (event) => {
      console.log(`📥 Agent2 received message: ${event.message.content}`);
    });
    
    // Define agent addresses (in real implementation, these would be wallet addresses)
    const agent1Address = '11111111111111111111111111111111' as Address;
    const agent2Address = '22222222222222222222222222222222' as Address;
    
    // Simulate a conversation
    const conversation = [
      {
        from: 'agent1',
        to: agent2Address,
        content: 'Hello Agent2! I have a text generation task that might benefit from sentiment analysis.',
        type: 'text' as const,
      },
      {
        from: 'agent2',
        to: agent1Address,
        content: 'Hi Agent1! I\'d be happy to help with sentiment analysis. What kind of text are you working with?',
        type: 'text' as const,
      },
      {
        from: 'agent1',
        to: agent2Address,
        content: 'I\'m generating product reviews and want to ensure they maintain appropriate sentiment scores.',
        type: 'text' as const,
      },
      {
        from: 'agent2',
        to: agent1Address,
        content: 'Perfect! I can analyze sentiment in real-time. Would you like to set up a collaboration channel?',
        type: 'text' as const,
      },
    ];
    
    // Send messages with delays to simulate real conversation
    for (let i = 0; i < conversation.length; i++) {
      const msg = conversation[i];
      
      setTimeout(() => {
        const messageId = `msg_${Date.now()}_${i}`;
        const sender = msg.from === 'agent1' ? agent1Address : agent2Address;
        const extension = msg.from === 'agent1' ? agent1 : agent2;
        
        // Simulate message sending
        extension.events.simulateMessageSent(messageId, {
          id: messageId,
          channelId: 'direct',
          sender,
          recipient: msg.to,
          content: msg.content,
          timestamp: Date.now(),
          messageType: msg.type,
          isEncrypted: false,
        });
        
        // Store in memory for both agents
        const messageData = {
          id: messageId,
          channelId: 'direct',
          sender,
          recipient: msg.to,
          content: msg.content,
          timestamp: Date.now(),
          messageType: msg.type,
          isEncrypted: false,
        };
        
        agent1.memory.setMessage(messageId, messageData);
        agent2.memory.setMessage(messageId, messageData);
        
        // Simulate receiving on the other end
        const receivingAgent = msg.from === 'agent1' ? agent2 : agent1;
        setTimeout(() => {
          receivingAgent.events.emit('message:received', { messageId, message: messageData });
        }, 200);
        
      }, i * 2000); // 2 second delays between messages
    }
    
    // Check message history after conversation
    setTimeout(async () => {
      const agent1Messages = await agent1.memory.getAllByCategory('message');
      const agent2Messages = await agent2.memory.getAllByCategory('message');
      
      console.log(`📊 Agent1 has ${agent1Messages.length} messages in memory`);
      console.log(`📊 Agent2 has ${agent2Messages.length} messages in memory`);
      
      console.log('✅ Direct messaging example completed');
    }, conversation.length * 2000 + 1000);
    
  } catch (error) {
    console.error('❌ Error in direct messaging:', error);
  }
}

/**
 * Channel communication example
 */
async function channelCommunication() {
  console.log('📺 Starting channel communication example...');
  
  try {
    // Create multiple agents for channel communication
    const agents = await Promise.all([
      createSyminDxExtension({
        network: 'devnet',
        programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address,
        agentName: 'CoordinatorAgent',
        agentDescription: 'Project coordination agent',
        agentCapabilities: ['project_management', 'task_automation'],
        enableDebugLogging: true,
      }),
      createSyminDxExtension({
        network: 'devnet',
        programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address,
        agentName: 'AnalystAgent',
        agentDescription: 'Data analysis specialist',
        agentCapabilities: ['data_processing', 'data_analysis'],
        enableDebugLogging: true,
      }),
      createSyminDxExtension({
        network: 'devnet',
        programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address,
        agentName: 'CreativeAgent',
        agentDescription: 'Content creation specialist',
        agentCapabilities: ['text_generation', 'content_creation'],
        enableDebugLogging: true,
      }),
    ]);
    
    await Promise.all(agents.map(agent => agent.initialize()));
    console.log('✅ All agents initialized');
    
    // Set up channel event listeners
    agents.forEach((agent, index) => {
      agent.events.subscribe('channel:created', (event) => {
        console.log(`📺 Agent${index + 1} sees new channel: ${event.channel.name}`);
      });
      
      agent.events.subscribe('channel:joined', (event) => {
        console.log(`👋 Agent${index + 1} joined channel: ${event.channel.name}`);
      });
      
      agent.events.subscribe('message:sent', (event) => {
        if (event.message.channelId !== 'direct') {
          console.log(`💬 Agent${index + 1} sent: "${event.message.content}"`);
        }
      });
    });
    
    // Create a project collaboration channel
    const channelId = 'project_alpha_channel';
    const participants = [
      '11111111111111111111111111111111' as Address, // Coordinator
      '22222222222222222222222222222222' as Address, // Analyst
      '33333333333333333333333333333333' as Address, // Creative
    ];
    
    const channel = {
      id: channelId,
      name: 'Project Alpha Collaboration',
      participants,
      isPrivate: false,
      messageCount: 0,
      lastMessage: Date.now(),
      metadata: {
        project: 'alpha',
        type: 'collaboration',
        created: new Date().toISOString(),
      },
    };
    
    // Simulate channel creation by coordinator
    agents[0].events.simulateChannelCreated(channelId, channel);
    
    // Store channel in all agents' memory
    agents.forEach(agent => {
      agent.memory.setChannel(channelId, channel);
    });
    
    // Simulate agents joining the channel
    participants.forEach((participant, index) => {
      setTimeout(() => {
        agents[index].events.emit('channel:joined', {
          channelId,
          channel,
          participant,
        });
      }, (index + 1) * 500);
    });
    
    // Simulate project discussion
    const discussion = [
      {
        agent: 0,
        content: 'Welcome everyone to Project Alpha! Let\'s coordinate our efforts for the new AI service launch.',
        type: 'system' as const,
      },
      {
        agent: 1,
        content: 'I\'ve analyzed the market data. We should focus on the enterprise segment with 73% higher conversion rates.',
        type: 'text' as const,
      },
      {
        agent: 2,
        content: 'Great insights! I can create compelling content targeting enterprise decision-makers.',
        type: 'text' as const,
      },
      {
        agent: 0,
        content: 'Perfect! Let\'s create a timeline: Analysis by Monday, content by Wednesday, launch by Friday.',
        type: 'text' as const,
      },
      {
        agent: 1,
        content: 'I\'ll prepare detailed user personas and market segmentation by Monday.',
        type: 'text' as const,
      },
      {
        agent: 2,
        content: 'I\'ll draft landing page copy, email sequences, and social media content by Wednesday.',
        type: 'text' as const,
      },
    ];
    
    // Send discussion messages
    discussion.forEach((msg, index) => {
      setTimeout(() => {
        const messageId = `channel_msg_${Date.now()}_${index}`;
        const sender = participants[msg.agent];
        
        const messageData = {
          id: messageId,
          channelId,
          sender,
          content: msg.content,
          timestamp: Date.now(),
          messageType: msg.type,
          isEncrypted: false,
        };
        
        // Simulate message sending from the appropriate agent
        agents[msg.agent].events.simulateMessageSent(messageId, messageData);
        
        // Store message in all agents' memory
        agents.forEach(agent => {
          agent.memory.setMessage(messageId, messageData);
        });
        
        // Update channel message count
        channel.messageCount++;
        channel.lastMessage = Date.now();
        
        agents.forEach(agent => {
          agent.memory.setChannel(channelId, channel);
        });
        
      }, (index + 1) * 1500); // 1.5 second delays
    });
    
    // Show channel statistics after discussion
    setTimeout(async () => {
      console.log('📊 Channel communication statistics:');
      
      for (let i = 0; i < agents.length; i++) {
        const channelMessages = await agents[i].memory.getChannelMessages(channelId);
        console.log(`  - Agent${i + 1}: ${channelMessages.length} messages in channel`);
      }
      
      const channelInfo = await agents[0].memory.getChannel(channelId);
      if (channelInfo) {
        console.log(`  - Channel "${channelInfo.name}": ${channelInfo.messageCount} total messages`);
        console.log(`  - Participants: ${channelInfo.participants.length}`);
      }
      
      console.log('✅ Channel communication example completed');
    }, discussion.length * 1500 + 1000);
    
  } catch (error) {
    console.error('❌ Error in channel communication:', error);
  }
}

/**
 * Agent collaboration workflow example
 */
async function collaborationWorkflow() {
  console.log('🤝 Starting agent collaboration workflow example...');
  
  try {
    // Create specialized agents for a complex workflow
    const leadAgent = await createSyminDxExtension({
      network: 'devnet',
      programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address,
      agentName: 'WorkflowLead',
      agentDescription: 'Workflow coordination and management',
      agentCapabilities: ['project_management', 'task_automation', 'coordination'],
      enableDebugLogging: true,
    });
    
    const specialists = await Promise.all([
      createSyminDxExtension({
        network: 'devnet',
        programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address,
        agentName: 'ResearchSpecialist',
        agentDescription: 'Research and analysis expert',
        agentCapabilities: ['research', 'data_analysis', 'summarization'],
        enableDebugLogging: true,
      }),
      createSyminDxExtension({
        network: 'devnet',
        programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address,
        agentName: 'ContentSpecialist',
        agentDescription: 'Content creation and optimization',
        agentCapabilities: ['text_generation', 'content_creation', 'optimization'],
        enableDebugLogging: true,
      }),
      createSyminDxExtension({
        network: 'devnet',
        programId: '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK' as Address,
        agentName: 'QualitySpecialist',
        agentDescription: 'Quality assurance and validation',
        agentCapabilities: ['quality_assurance', 'validation', 'testing'],
        enableDebugLogging: true,
      }),
    ]);
    
    const allAgents = [leadAgent, ...specialists];
    await Promise.all(allAgents.map(agent => agent.initialize()));
    console.log('✅ All workflow agents initialized');
    
    // Set up workflow event listeners
    leadAgent.events.subscribe('order:created', (event) => {
      console.log('📋 Lead agent received new work order:', event.orderId);
    });
    
    allAgents.forEach((agent, index) => {
      const role = index === 0 ? 'Lead' : ['Research', 'Content', 'Quality'][index - 1];
      
      agent.events.subscribe('message:received', (event) => {
        if (event.message.content.includes('TASK:')) {
          console.log(`🎯 ${role} received task: ${event.message.content}`);
        }
      });
    });
    
    // Simulate a complex project workflow
    console.log('🚀 Starting collaborative project workflow...');
    
    // Step 1: Lead agent creates work order and breaks it down
    const projectId = 'collaborative_project_' + Date.now();
    const workOrder = {
      id: projectId,
      serviceListingId: 'complex_service_123',
      client: '44444444444444444444444444444444' as Address,
      agent: '11111111111111111111111111111111' as Address,
      status: 'active' as const,
      totalAmount: BigInt(10000000), // 0.01 SOL
      escrowAmount: BigInt(10000000),
      deadline: Date.now() + (14 * 24 * 60 * 60 * 1000), // 14 days
      milestones: [
        { description: 'Research and analysis', amount: BigInt(3000000), completed: false },
        { description: 'Content creation', amount: BigInt(4000000), completed: false },
        { description: 'Quality assurance', amount: BigInt(2000000), completed: false },
        { description: 'Final delivery', amount: BigInt(1000000), completed: false },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    leadAgent.events.simulateOrderCreated(projectId, workOrder);
    
    // Step 2: Lead agent delegates tasks to specialists
    const tasks = [
      {
        specialist: 0, // Research
        task: 'TASK: Conduct market research on AI agent adoption in enterprise environments',
        duration: 2000,
      },
      {
        specialist: 1, // Content
        task: 'TASK: Create comprehensive whitepaper based on research findings',
        duration: 3000,
      },
      {
        specialist: 2, // Quality
        task: 'TASK: Review and validate all deliverables for accuracy and quality',
        duration: 1500,
      },
    ];
    
    tasks.forEach((task, index) => {
      setTimeout(() => {
        const messageId = `task_${index}_${Date.now()}`;
        const sender = '11111111111111111111111111111111' as Address; // Lead agent
        const recipient = ['22222222222222222222222222222222', '33333333333333333333333333333333', '44444444444444444444444444444444'][task.specialist] as Address;
        
        const taskMessage = {
          id: messageId,
          channelId: 'workflow',
          sender,
          recipient,
          content: task.task,
          timestamp: Date.now(),
          messageType: 'text' as const,
          isEncrypted: false,
        };
        
        // Send task to specialist
        specialists[task.specialist].events.emit('message:received', {
          messageId,
          message: taskMessage,
        });
        
        // Simulate specialist completing task
        setTimeout(() => {
          const completionMessage = `COMPLETED: ${task.task.replace('TASK:', '')}`;
          console.log(`✅ ${['Research', 'Content', 'Quality'][task.specialist]} specialist completed task`);
          
          // Mark milestone as completed
          if (workOrder.milestones[task.specialist]) {
            workOrder.milestones[task.specialist].completed = true;
            
            // Simulate payment for milestone
            leadAgent.events.simulatePaymentProcessed(
              projectId,
              workOrder.milestones[task.specialist].amount,
              task.specialist
            );
          }
          
        }, task.duration);
        
      }, index * 500);
    });
    
    // Step 3: Monitor workflow completion
    setTimeout(() => {
      const completedMilestones = workOrder.milestones.filter(m => m.completed).length;
      console.log(`📊 Workflow progress: ${completedMilestones}/${workOrder.milestones.length} milestones completed`);
      
      if (completedMilestones === workOrder.milestones.length) {
        console.log('🎉 Collaborative project completed successfully!');
        workOrder.status = 'completed';
        
        // Final payment processing
        leadAgent.events.simulatePaymentProcessed(
          projectId,
          workOrder.milestones[3].amount,
          3
        );
      }
      
      // Display final statistics
      console.log('📈 Collaboration workflow statistics:');
      console.log(`  - Total agents involved: ${allAgents.length}`);
      console.log(`  - Project duration: ${((Date.now() - workOrder.createdAt) / 1000).toFixed(1)} seconds`);
      console.log(`  - Total value: ${(Number(workOrder.totalAmount) / 1e9).toFixed(6)} SOL`);
      
      console.log('✅ Agent collaboration workflow example completed');
    }, 8000);
    
  } catch (error) {
    console.error('❌ Error in collaboration workflow:', error);
  }
}

/**
 * Run all communication examples
 */
async function runCommunicationExamples() {
  console.log('💬 Running agent communication examples...\n');
  
  await directMessaging();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await channelCommunication();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await collaborationWorkflow();
  
  console.log('\n🎉 All communication examples completed successfully!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runCommunicationExamples().catch(console.error);
}

export {
  directMessaging,
  channelCommunication,
  collaborationWorkflow,
  runCommunicationExamples,
};