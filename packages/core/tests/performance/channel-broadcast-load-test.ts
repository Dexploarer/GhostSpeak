/**
 * Channel Broadcast Performance Load Testing
 * 
 * Specialized test suite focusing on channel message broadcasting performance
 * to validate the 10+ msg/sec throughput requirement.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PodaiMarketplace } from '../../../target/types/podai_marketplace';
import { generateKeyPairSigner, type KeyPairSigner } from '@solana/signers';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Keypair, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { logger } from '../../../shared/logger';
import { performance } from 'perf_hooks';

interface ChannelMetrics {
  channelId: string;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  throughput: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  maxLatency: number;
  minLatency: number;
  broadcastEfficiency: number;
}

interface BroadcastTestResult {
  testName: string;
  duration: number;
  channelsUsed: number;
  totalBroadcasts: number;
  successfulBroadcasts: number;
  overallThroughput: number;
  channelMetrics: ChannelMetrics[];
  networkMetrics: {
    avgNetworkLatency: number;
    networkErrors: number;
    retries: number;
  };
  performanceBottlenecks: string[];
}

class ChannelBroadcastTester {
  private provider: AnchorProvider;
  private program: Program<PodaiMarketplace>;
  private testChannels: Map<string, { pda: PublicKey; participants: KeyPairSigner[] }> = new Map();
  private messageCounters: Map<string, number> = new Map();

  constructor(provider: AnchorProvider, program: Program<PodaiMarketplace>) {
    this.provider = provider;
    this.program = program;
  }

  async setupChannels(channelCount: number, participantsPerChannel: number): Promise<void> {
    logger.general.info(`🔧 Setting up ${channelCount} channels with ${participantsPerChannel} participants each...`);

    for (let i = 0; i < channelCount; i++) {
      const creator = Keypair.generate();
      const creatorSigner = await generateKeyPairSigner(creator);
      
      // Fund creator
      await this.provider.connection.requestAirdrop(creator.publicKey, 0.5 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Register creator as agent
      const [creatorAgentPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), creator.publicKey.toBuffer()],
        this.program.programId,
      );

      await this.program.methods
        .registerAgent(new anchor.BN(7), `https://broadcast-test.example.com/creator-${i}`)
        .accounts({
          agentAccount: creatorAgentPDA,
          signer: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Create channel
      const channelName = `broadcast-test-channel-${i}`;
      const [channelPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('channel'), creator.publicKey.toBuffer(), Buffer.from(channelName)],
        this.program.programId,
      );

      await this.program.methods
        .createChannel(
          channelName,
          `High-performance broadcast test channel ${i}`,
          { public: {} },
          1000, // High participant limit
          0,
        )
        .accounts({
          channelAccount: channelPDA,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      const participants: KeyPairSigner[] = [creatorSigner];

      // Add participants
      for (let j = 1; j < participantsPerChannel; j++) {
        const participant = Keypair.generate();
        const participantSigner = await generateKeyPairSigner(participant);
        
        // Fund participant
        await this.provider.connection.requestAirdrop(participant.publicKey, 0.2 * LAMPORTS_PER_SOL);
        
        // Register as agent
        const [participantAgentPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('agent'), participant.publicKey.toBuffer()],
          this.program.programId,
        );

        await this.program.methods
          .registerAgent(new anchor.BN(1), `https://broadcast-test.example.com/participant-${i}-${j}`)
          .accounts({
            agentAccount: participantAgentPDA,
            signer: participant.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([participant])
          .rpc();

        // Join channel
        const [participantPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('participant'), channelPDA.toBuffer(), participantAgentPDA.toBuffer()],
          this.program.programId,
        );

        await this.program.methods
          .joinChannel()
          .accounts({
            channelAccount: channelPDA,
            participantAccount: participantPDA,
            agentAccount: participantAgentPDA,
            invitationAccount: null,
            escrowAccount: null,
            user: participant.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([participant])
          .rpc();

        participants.push(participantSigner);
      }

      this.testChannels.set(channelName, { pda: channelPDA, participants });
      this.messageCounters.set(channelName, 0);
    }

    logger.general.info(`✅ Set up ${this.testChannels.size} channels`);
  }

  async runBroadcastTest(
    testName: string,
    duration: number,
    messageRate: number,
    pattern: 'steady' | 'burst' | 'random',
  ): Promise<BroadcastTestResult> {
    logger.general.info(`\n🚀 Running broadcast test: ${testName}`);
    logger.general.info(`   Duration: ${duration}ms`);
    logger.general.info(`   Target rate: ${messageRate} msg/sec`);
    logger.general.info(`   Pattern: ${pattern}`);

    const startTime = performance.now();
    const channelMetrics: Map<string, ChannelMetrics> = new Map();
    const latencies: number[] = [];
    let totalBroadcasts = 0;
    let successfulBroadcasts = 0;
    let networkErrors = 0;
    let retries = 0;

    // Initialize channel metrics
    for (const [channelName, _] of this.testChannels) {
      channelMetrics.set(channelName, {
        channelId: channelName,
        totalMessages: 0,
        successfulMessages: 0,
        failedMessages: 0,
        throughput: 0,
        avgLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        maxLatency: 0,
        minLatency: Number.MAX_VALUE,
        broadcastEfficiency: 0,
      });
    }

    // Message broadcasting loop
    const messageInterval = 1000 / messageRate; // ms between messages
    const endTime = startTime + duration;
    let lastMessageTime = startTime;

    while (performance.now() < endTime) {
      const currentTime = performance.now();
      
      // Determine if we should send a message based on pattern
      let shouldSend = false;
      switch (pattern) {
        case 'steady':
          shouldSend = currentTime - lastMessageTime >= messageInterval;
          break;
        case 'burst':
          // Send in bursts of 10 messages every second
          shouldSend = Math.floor((currentTime - startTime) / 1000) > Math.floor((lastMessageTime - startTime) / 1000);
          if (shouldSend) {
            for (let i = 0; i < 10; i++) {
              await this.broadcastMessage(channelMetrics, latencies, totalBroadcasts, successfulBroadcasts, networkErrors, retries);
              totalBroadcasts++;
            }
            shouldSend = false; // Already handled in loop
          }
          break;
        case 'random':
          shouldSend = Math.random() < (messageInterval / 100); // Random probability
          break;
      }

      if (shouldSend && pattern !== 'burst') {
        await this.broadcastMessage(channelMetrics, latencies, totalBroadcasts, successfulBroadcasts, networkErrors, retries);
        totalBroadcasts++;
        lastMessageTime = currentTime;
      }

      // Small delay to prevent CPU spinning
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const actualDuration = performance.now() - startTime;
    const overallThroughput = successfulBroadcasts / (actualDuration / 1000);

    // Calculate final metrics for each channel
    const channelMetricsArray: ChannelMetrics[] = [];
    for (const [channelName, metrics] of channelMetrics) {
      const channelLatencies = latencies.filter((_, index) => index % this.testChannels.size === Array.from(this.testChannels.keys()).indexOf(channelName));
      
      if (channelLatencies.length > 0) {
        const sorted = [...channelLatencies].sort((a, b) => a - b);
        metrics.avgLatency = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;
        metrics.p95Latency = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
        metrics.p99Latency = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
        metrics.maxLatency = sorted[sorted.length - 1];
        metrics.minLatency = sorted[0];
      }
      
      metrics.throughput = metrics.successfulMessages / (actualDuration / 1000);
      metrics.broadcastEfficiency = metrics.totalMessages > 0 ? (metrics.successfulMessages / metrics.totalMessages) * 100 : 0;
      
      channelMetricsArray.push(metrics);
    }

    // Identify bottlenecks
    const bottlenecks: string[] = [];
    if (overallThroughput < messageRate * 0.8) {
      bottlenecks.push(`Throughput below target: ${overallThroughput.toFixed(2)} < ${messageRate * 0.8}`);
    }
    
    const avgLatency = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
    if (avgLatency > 1000) {
      bottlenecks.push(`High average latency: ${avgLatency.toFixed(0)}ms`);
    }
    
    if (networkErrors > totalBroadcasts * 0.05) {
      bottlenecks.push(`High network error rate: ${((networkErrors / totalBroadcasts) * 100).toFixed(1)}%`);
    }

    return {
      testName,
      duration: actualDuration,
      channelsUsed: this.testChannels.size,
      totalBroadcasts,
      successfulBroadcasts,
      overallThroughput,
      channelMetrics: channelMetricsArray,
      networkMetrics: {
        avgNetworkLatency: avgLatency,
        networkErrors,
        retries,
      },
      performanceBottlenecks: bottlenecks,
    };
  }

  private async broadcastMessage(
    channelMetrics: Map<string, ChannelMetrics>,
    latencies: number[],
    totalBroadcasts: number,
    successfulBroadcasts: number,
    networkErrors: number,
    retries: number,
  ): Promise<void> {
    // Select random channel and participant
    const channels = Array.from(this.testChannels.entries());
    const [channelName, { pda: channelPDA, participants }] = channels[Math.floor(Math.random() * channels.length)];
    const sender = participants[Math.floor(Math.random() * participants.length)];
    
    const metrics = channelMetrics.get(channelName)!;
    metrics.totalMessages++;

    const messageIndex = this.messageCounters.get(channelName)! + 1;
    this.messageCounters.set(channelName, messageIndex);

    const [agentPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('agent'), sender.address.toBuffer()],
      this.program.programId,
    );
    const [participantPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('participant'), channelPDA.toBuffer(), agentPDA.toBuffer()],
      this.program.programId,
    );
    const [messagePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('channel_message'),
        channelPDA.toBuffer(),
        sender.address.toBuffer(),
        Buffer.from([messageIndex % 256]), // Wrap around to reuse PDAs
      ],
      this.program.programId,
    );

    const messageStart = performance.now();
    
    try {
      await this.program.methods
        .broadcastMessage(
          `High-throughput test message ${messageIndex} at ${Date.now()}`,
          { text: {} },
          null,
          messageIndex % 256,
        )
        .accounts({
          channelAccount: channelPDA,
          participantAccount: participantPDA,
          agentAccount: agentPDA,
          messageAccount: messagePDA,
          user: sender.address,
          systemProgram: SystemProgram.programId,
        })
        .signers([sender])
        .rpc();

      const messageEnd = performance.now();
      const latency = messageEnd - messageStart;
      
      latencies.push(latency);
      metrics.successfulMessages++;
      successfulBroadcasts++;
    } catch (error) {
      metrics.failedMessages++;
      networkErrors++;
      
      // Retry logic for recoverable errors
      if (this.isRetryableError(error)) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          await this.program.methods
            .broadcastMessage(
              `Retry: High-throughput test message ${messageIndex}`,
              { text: {} },
              null,
              messageIndex % 256,
            )
            .accounts({
              channelAccount: channelPDA,
              participantAccount: participantPDA,
              agentAccount: agentPDA,
              messageAccount: messagePDA,
              user: sender.address,
              systemProgram: SystemProgram.programId,
            })
            .signers([sender])
            .rpc();
          
          metrics.successfulMessages++;
          metrics.failedMessages--;
          successfulBroadcasts++;
        } catch (retryError) {
          // Retry failed
        }
      }
    }
  }

  private isRetryableError(error: any): boolean {
    const message = error.message || '';
    return message.includes('rate') || 
           message.includes('timeout') || 
           message.includes('network');
  }
}

describe('Channel Broadcast Performance Testing', () => {
  let provider: AnchorProvider;
  let program: Program<PodaiMarketplace>;
  let tester: ChannelBroadcastTester;
  let testResults: BroadcastTestResult[] = [];

  beforeAll(async () => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    program = anchor.workspace.PodaiMarketplace as Program<PodaiMarketplace>;
    
    tester = new ChannelBroadcastTester(provider, program);
  });

  afterAll(() => {
    generateBroadcastPerformanceReport(testResults);
  });

  describe('Basic Throughput Testing', () => {
    test('Should achieve 10+ msg/sec in single channel', async () => {
      await tester.setupChannels(1, 10);
      
      const result = await tester.runBroadcastTest(
        'Single Channel 10 msg/sec',
        30000, // 30 seconds
        10,    // 10 msg/sec target
        'steady',
      );

      testResults.push(result);
      
      logger.general.info(`📊 Single channel results:`);
      logger.general.info(`   Throughput: ${result.overallThroughput.toFixed(2)} msg/sec`);
      logger.general.info(`   Success rate: ${((result.successfulBroadcasts / result.totalBroadcasts) * 100).toFixed(1)}%`);
      logger.general.info(`   Avg latency: ${result.networkMetrics.avgNetworkLatency.toFixed(0)}ms`);
      
      expect(result.overallThroughput).toBeGreaterThan(10);
      expect(result.channelMetrics[0].broadcastEfficiency).toBeGreaterThan(95);
    });

    test('Should handle 20+ msg/sec across multiple channels', async () => {
      await tester.setupChannels(5, 5);
      
      const result = await tester.runBroadcastTest(
        'Multi-Channel 20 msg/sec',
        30000,
        20,
        'steady',
      );

      testResults.push(result);
      
      logger.general.info(`📊 Multi-channel results:`);
      logger.general.info(`   Total throughput: ${result.overallThroughput.toFixed(2)} msg/sec`);
      logger.general.info(`   Channels used: ${result.channelsUsed}`);
      logger.general.info(`   Avg per channel: ${(result.overallThroughput / result.channelsUsed).toFixed(2)} msg/sec`);
      
      expect(result.overallThroughput).toBeGreaterThan(20);
    });

    test('Should sustain high throughput under burst pattern', async () => {
      await tester.setupChannels(3, 8);
      
      const result = await tester.runBroadcastTest(
        'Burst Pattern Test',
        20000,
        15,
        'burst',
      );

      testResults.push(result);
      
      logger.general.info(`📊 Burst pattern results:`);
      logger.general.info(`   Burst throughput: ${result.overallThroughput.toFixed(2)} msg/sec`);
      logger.general.info(`   P95 latency: ${result.channelMetrics[0].p95Latency.toFixed(0)}ms`);
      logger.general.info(`   Max latency: ${Math.max(...result.channelMetrics.map(m => m.maxLatency)).toFixed(0)}ms`);
      
      expect(result.overallThroughput).toBeGreaterThan(10);
      expect(result.channelMetrics[0].p95Latency).toBeLessThan(2000);
    });
  });

  describe('Scalability Testing', () => {
    test('Should scale linearly with channel count', async () => {
      const channelCounts = [1, 3, 5, 10];
      const scalingResults: BroadcastTestResult[] = [];
      
      for (const count of channelCounts) {
        await tester.setupChannels(count, 5);
        
        const result = await tester.runBroadcastTest(
          `Scaling Test - ${count} channels`,
          15000,
          count * 5, // 5 msg/sec per channel
          'steady',
        );
        
        scalingResults.push(result);
        testResults.push(result);
      }
      
      // Analyze scaling efficiency
      logger.general.info(`\n📊 Scaling analysis:`);
      scalingResults.forEach(result => {
        const perChannelThroughput = result.overallThroughput / result.channelsUsed;
        logger.general.info(`   ${result.channelsUsed} channels: ${result.overallThroughput.toFixed(2)} total, ${perChannelThroughput.toFixed(2)} per channel`);
      });
      
      // Check linear scaling (at least 80% efficiency)
      const singleChannelThroughput = scalingResults[0].overallThroughput;
      const tenChannelThroughput = scalingResults[scalingResults.length - 1].overallThroughput;
      const scalingEfficiency = tenChannelThroughput / (singleChannelThroughput * 10);
      
      expect(scalingEfficiency).toBeGreaterThan(0.8);
    });

    test('Should handle maximum participant load', async () => {
      await tester.setupChannels(2, 50); // 2 channels with 50 participants each
      
      const result = await tester.runBroadcastTest(
        'Max Participants Test',
        30000,
        15,
        'random',
      );

      testResults.push(result);
      
      logger.general.info(`📊 Max participants results:`);
      logger.general.info(`   Participants per channel: 50`);
      logger.general.info(`   Throughput: ${result.overallThroughput.toFixed(2)} msg/sec`);
      logger.general.info(`   Broadcast efficiency: ${result.channelMetrics[0].broadcastEfficiency.toFixed(1)}%`);
      
      expect(result.overallThroughput).toBeGreaterThan(10);
      expect(result.channelMetrics[0].broadcastEfficiency).toBeGreaterThan(90);
    });
  });

  describe('Stress and Recovery Testing', () => {
    test('Should maintain performance during network congestion', async () => {
      await tester.setupChannels(5, 10);
      
      // Simulate network congestion by sending rapid messages
      const result = await tester.runBroadcastTest(
        'Network Congestion Test',
        20000,
        50, // Very high rate to cause congestion
        'steady',
      );

      testResults.push(result);
      
      logger.general.info(`📊 Congestion test results:`);
      logger.general.info(`   Attempted rate: 50 msg/sec`);
      logger.general.info(`   Achieved rate: ${result.overallThroughput.toFixed(2)} msg/sec`);
      logger.general.info(`   Network errors: ${result.networkMetrics.networkErrors}`);
      logger.general.info(`   Retries: ${result.networkMetrics.retries}`);
      
      // Should still maintain minimum throughput even under stress
      expect(result.overallThroughput).toBeGreaterThan(10);
    });

    test('Should recover quickly from broadcast failures', async () => {
      await tester.setupChannels(3, 7);
      
      // Run normal load
      const normalResult = await tester.runBroadcastTest(
        'Recovery Test - Normal',
        10000,
        15,
        'steady',
      );

      // Simulate failures by overloading
      const overloadResult = await tester.runBroadcastTest(
        'Recovery Test - Overload',
        5000,
        100, // Extreme load
        'burst',
      );

      // Test recovery
      const recoveryResult = await tester.runBroadcastTest(
        'Recovery Test - Post-Recovery',
        10000,
        15,
        'steady',
      );

      testResults.push(normalResult);
      testResults.push(overloadResult);
      testResults.push(recoveryResult);
      
      logger.general.info(`📊 Recovery test results:`);
      logger.general.info(`   Normal throughput: ${normalResult.overallThroughput.toFixed(2)} msg/sec`);
      logger.general.info(`   Overload throughput: ${overloadResult.overallThroughput.toFixed(2)} msg/sec`);
      logger.general.info(`   Recovery throughput: ${recoveryResult.overallThroughput.toFixed(2)} msg/sec`);
      
      // Recovery should return to near-normal levels
      const recoveryRatio = recoveryResult.overallThroughput / normalResult.overallThroughput;
      expect(recoveryRatio).toBeGreaterThan(0.9);
    });
  });

  describe('Latency and Performance Distribution', () => {
    test('Should maintain low latency for majority of messages', async () => {
      await tester.setupChannels(4, 10);
      
      const result = await tester.runBroadcastTest(
        'Latency Distribution Test',
        60000, // 1 minute for good sample size
        12,
        'steady',
      );

      testResults.push(result);
      
      // Analyze latency distribution
      const allLatencies: number[] = [];
      result.channelMetrics.forEach(m => {
        logger.general.info(`📊 Channel ${m.channelId} latency:`);
        logger.general.info(`   Min: ${m.minLatency.toFixed(0)}ms`);
        logger.general.info(`   Avg: ${m.avgLatency.toFixed(0)}ms`);
        logger.general.info(`   P95: ${m.p95Latency.toFixed(0)}ms`);
        logger.general.info(`   P99: ${m.p99Latency.toFixed(0)}ms`);
        logger.general.info(`   Max: ${m.maxLatency.toFixed(0)}ms`);
      });
      
      // Most messages should have reasonable latency
      const avgP95 = result.channelMetrics.reduce((sum, m) => sum + m.p95Latency, 0) / result.channelMetrics.length;
      expect(avgP95).toBeLessThan(1500);
      
      // P99 should still be reasonable
      const avgP99 = result.channelMetrics.reduce((sum, m) => sum + m.p99Latency, 0) / result.channelMetrics.length;
      expect(avgP99).toBeLessThan(2000);
    });

    test('Should distribute load evenly across channels', async () => {
      await tester.setupChannels(6, 6);
      
      const result = await tester.runBroadcastTest(
        'Load Distribution Test',
        30000,
        18, // 3 msg/sec per channel average
        'random',
      );

      testResults.push(result);
      
      // Calculate load distribution metrics
      const messageDistribution = result.channelMetrics.map(m => m.totalMessages);
      const avgMessages = messageDistribution.reduce((sum, val) => sum + val, 0) / messageDistribution.length;
      const variance = messageDistribution.reduce((sum, val) => sum + Math.pow(val - avgMessages, 2), 0) / messageDistribution.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / avgMessages) * 100;
      
      logger.general.info(`📊 Load distribution:`);
      logger.general.info(`   Average messages per channel: ${avgMessages.toFixed(1)}`);
      logger.general.info(`   Standard deviation: ${stdDev.toFixed(1)}`);
      logger.general.info(`   Coefficient of variation: ${coefficientOfVariation.toFixed(1)}%`);
      
      result.channelMetrics.forEach(m => {
        logger.general.info(`   Channel ${m.channelId}: ${m.totalMessages} messages (${m.throughput.toFixed(2)} msg/sec)`);
      });
      
      // Load should be relatively evenly distributed (CV < 30%)
      expect(coefficientOfVariation).toBeLessThan(30);
    });
  });
});

function generateBroadcastPerformanceReport(results: BroadcastTestResult[]) {
  logger.general.info('\n' + '='.repeat(80));
  logger.general.info('📡 CHANNEL BROADCAST PERFORMANCE REPORT');
  logger.general.info('='.repeat(80));
  
  // Overall summary
  const totalMessages = results.reduce((sum, r) => sum + r.successfulBroadcasts, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0) / 1000; // seconds
  const overallThroughput = totalMessages / totalDuration;
  
  logger.general.info('\n📈 Overall Performance:');
  logger.general.info(`   Total messages broadcast: ${totalMessages}`);
  logger.general.info(`   Total test duration: ${totalDuration.toFixed(1)}s`);
  logger.general.info(`   Overall throughput: ${overallThroughput.toFixed(2)} msg/sec`);
  
  // Test-by-test breakdown
  logger.general.info('\n📊 Test Results Summary:');
  results.forEach(result => {
    logger.general.info(`\n   ${result.testName}:`);
    logger.general.info(`     - Throughput: ${result.overallThroughput.toFixed(2)} msg/sec`);
    logger.general.info(`     - Success rate: ${((result.successfulBroadcasts / result.totalBroadcasts) * 100).toFixed(1)}%`);
    logger.general.info(`     - Channels: ${result.channelsUsed}`);
    logger.general.info(`     - Avg latency: ${result.networkMetrics.avgNetworkLatency.toFixed(0)}ms`);
    
    if (result.performanceBottlenecks.length > 0) {
      logger.general.info(`     - Bottlenecks: ${result.performanceBottlenecks.join(', ')}`);
    }
  });
  
  // Performance validation
  logger.general.info('\n✅ Key Performance Indicators:');
  
  const throughputTests = results.filter(r => r.testName.includes('10 msg/sec') || r.testName.includes('20 msg/sec'));
  const allMeetThroughput = throughputTests.every(r => r.overallThroughput >= 10);
  
  logger.general.info(`   ${allMeetThroughput ? '✅' : '❌'} Message throughput >= 10 msg/sec: ${allMeetThroughput ? 'PASS' : 'FAIL'}`);
  
  const avgSuccessRate = results.reduce((sum, r) => sum + (r.successfulBroadcasts / r.totalBroadcasts), 0) / results.length * 100;
  logger.general.info(`   ${avgSuccessRate >= 95 ? '✅' : '❌'} Average success rate: ${avgSuccessRate.toFixed(1)}% (target: 95%)`);
  
  const allLatencies = results.flatMap(r => r.channelMetrics.map(m => m.p95Latency));
  const avgP95Latency = allLatencies.reduce((sum, val) => sum + val, 0) / allLatencies.length;
  logger.general.info(`   ${avgP95Latency < 2000 ? '✅' : '❌'} P95 latency: ${avgP95Latency.toFixed(0)}ms (target: <2000ms)`);
  
  // Scalability analysis
  const scalingTests = results.filter(r => r.testName.includes('Scaling Test'));
  if (scalingTests.length > 0) {
    logger.general.info('\n📈 Scalability Analysis:');
    scalingTests.forEach(test => {
      const perChannelThroughput = test.overallThroughput / test.channelsUsed;
      logger.general.info(`   ${test.channelsUsed} channels: ${perChannelThroughput.toFixed(2)} msg/sec per channel`);
    });
  }
  
  // Recommendations
  logger.general.info('\n💡 Performance Recommendations:');
  
  const bottlenecks = new Set(results.flatMap(r => r.performanceBottlenecks));
  if (bottlenecks.size > 0) {
    logger.general.info('   Based on identified bottlenecks:');
    bottlenecks.forEach(bottleneck => {
      logger.general.info(`   - ${bottleneck}`);
    });
  } else {
    logger.general.info('   - System is performing within acceptable parameters');
    logger.general.info('   - Consider increasing load targets for future testing');
  }
  
  logger.general.info('\n' + '='.repeat(80));
}