/**
 * Usage examples for IPFS integration in GhostSpeak SDK
 */

import './text-encoder-polyfill.js'
import type { Address } from '@solana/addresses'
import type { TransactionSigner } from '@solana/kit'
import type { IPFSConfig } from '../types/ipfs-types.js'
import type { AgentInstructions } from '../client/instructions/AgentInstructions.js'
import type { ChannelInstructions } from '../client/instructions/ChannelInstructions.js'
import { createIPFSUtils } from './ipfs-utils.js'

/**
 * Example: Basic IPFS configuration for different providers
 */
export const IPFS_EXAMPLES = {
  /**
   * Pinata configuration example
   */
  pinataConfig: {
    provider: {
      name: 'pinata' as const,
      jwt: 'your-pinata-jwt-token-here',
      endpoint: 'https://api.pinata.cloud'
    },
    gateways: [
      'https://gateway.pinata.cloud',
      'https://ipfs.io'
    ],
    autoPinning: true,
    sizeThreshold: 800,
    maxRetries: 3,
    retryDelay: 1000,
    enableCache: true,
    cacheTTL: 300000
  } as IPFSConfig,

  /**
   * Local IPFS node configuration example
   */
  localNodeConfig: {
    provider: {
      name: 'ipfs-http-client' as const,
      endpoint: 'http://localhost:5001'
    },
    gateways: [
      'http://localhost:8080',
      'https://ipfs.io'
    ],
    autoPinning: true,
    sizeThreshold: 800
  } as IPFSConfig,

  /**
   * Multiple provider configuration with fallbacks
   */
  multiProviderConfig: {
    provider: {
      name: 'pinata' as const,
      jwt: 'primary-pinata-jwt'
    },
    fallbackProviders: [
      {
        name: 'ipfs-http-client' as const,
        endpoint: 'http://localhost:5001'
      }
    ],
    gateways: [
      'https://gateway.pinata.cloud',
      'http://localhost:8080',
      'https://ipfs.io'
    ],
    sizeThreshold: 500 // Lower threshold for better performance
  } as IPFSConfig
}

/**
 * Example: Creating an agent with large metadata stored on IPFS
 */
export async function exampleCreateAgentWithIPFS(
  agentInstructions: AgentInstructions,
  signer: TransactionSigner,
  ipfsConfig: IPFSConfig
): Promise<string> {
  console.log('📝 Example: Creating agent with IPFS metadata storage')
  
  // Configure IPFS for the agent instructions
  agentInstructions.configureIPFS(ipfsConfig)

  // Create an agent with extensive metadata that will be stored on IPFS
  const agentAddress = await agentInstructions.create(signer, {
    name: 'Advanced AI Research Assistant',
    description: `This is a highly sophisticated AI agent designed for comprehensive research tasks. 
    It specializes in data analysis, literature review, statistical modeling, and report generation.
    
    Key Features:
    - Advanced natural language processing capabilities
    - Statistical analysis and data visualization
    - Multi-language support (English, Spanish, French, German, Chinese, Japanese)
    - Integration with major academic databases and APIs
    - Real-time data processing and insights
    - Collaborative research workflows
    - Citation management and bibliography generation
    - Automated report formatting and publication-ready outputs
    
    Technical Specifications:
    - Model Architecture: Transformer-based with 175B parameters
    - Context Window: 32,000 tokens
    - Response Time: < 2 seconds average
    - Accuracy Rate: 97.3% on research tasks
    - Supported File Formats: PDF, DOCX, CSV, JSON, XML, BibTeX
    - API Integrations: PubMed, arXiv, Google Scholar, JSTOR, IEEE Xplore
    
    Use Cases:
    - Academic research and thesis writing
    - Market research and competitive analysis  
    - Scientific literature reviews
    - Data analysis and statistical modeling
    - Patent research and IP analysis
    - Grant proposal writing
    - Systematic reviews and meta-analyses
    
    This extensive description would normally exceed Solana transaction limits,
    but with IPFS integration, it can be stored off-chain while maintaining
    full accessibility and integrity through the blockchain reference.`,
    category: 'research',
    capabilities: [
      'academic-research',
      'data-analysis', 
      'statistical-modeling',
      'literature-review',
      'citation-management',
      'multi-language-processing',
      'report-generation',
      'bibliography-creation',
      'patent-analysis',
      'market-research',
      'meta-analysis',
      'grant-writing',
      'peer-review',
      'research-methodology',
      'quantitative-analysis',
      'qualitative-analysis'
    ],
    serviceEndpoint: 'https://advanced-research-agent.example.com/api',
    forceIPFS: true // Force IPFS storage even if metadata is small
  })

  console.log(`✅ Agent created with IPFS metadata: ${agentAddress}`)
  return agentAddress
}

/**
 * Example: Retrieving agent metadata from IPFS
 */
export async function exampleRetrieveAgentMetadata(
  agentInstructions: AgentInstructions,
  agentAddress: Address,
  ipfsConfig: IPFSConfig
): Promise<void> {
  console.log('📥 Example: Retrieving agent metadata from IPFS')
  
  // Configure IPFS for retrieval
  agentInstructions.configureIPFS(ipfsConfig)

  // Get agent with full metadata
  const result = await agentInstructions.getAgentWithMetadata(agentAddress)
  
  if (result?.metadata) {
    console.log('Agent Metadata:')
    console.log(`  Name: ${result.metadata.name}`)
    console.log(`  Description: ${result.metadata.description?.substring(0, 200)}...`)
    console.log(`  Capabilities: ${result.metadata.capabilities?.join(', ')}`)
    console.log(`  Service Endpoint: ${result.metadata.serviceEndpoint}`)
    console.log(`  Created: ${result.metadata.createdAt}`)
  } else {
    console.log('No metadata found or failed to retrieve from IPFS')
  }
}

/**
 * Example: Sending large messages via IPFS
 */
export async function exampleSendLargeMessage(
  channelInstructions: ChannelInstructions,
  signer: TransactionSigner,
  channelAddress: Address,
  ipfsConfig: IPFSConfig
): Promise<string> {
  console.log('📤 Example: Sending large message via IPFS')
  
  // Configure IPFS for the channel instructions
  channelInstructions.configureIPFS(ipfsConfig)

  // Send a large message that will be automatically stored on IPFS
  const largeMessage = `# Research Findings Report

## Executive Summary
This comprehensive report presents the findings from our extensive research study on AI agent performance in decentralized systems. The study spanned 12 months and involved analysis of over 10,000 agent interactions across multiple blockchain networks.

## Methodology
Our research employed a mixed-methods approach combining:
- Quantitative analysis of transaction data
- Qualitative assessment of agent behavior patterns
- Performance benchmarking across different network conditions
- User satisfaction surveys and feedback analysis

## Key Findings

### Performance Metrics
1. **Response Time**: Average response time decreased by 34% when using IPFS for large content storage
2. **Transaction Costs**: 67% reduction in gas fees for metadata-heavy operations
3. **Reliability**: 99.7% uptime achieved with proper IPFS redundancy
4. **Scalability**: System handled 50x increase in concurrent users without performance degradation

### Technical Insights
- IPFS integration reduced on-chain storage requirements by 89%
- Content deduplication saved approximately 2.3TB of redundant data
- Gateway redundancy improved content availability to 99.97%
- Automatic fallback mechanisms prevented data loss in 100% of tested scenarios

### User Experience Impact
- Users reported 45% improvement in application responsiveness
- Large file sharing became seamless with IPFS integration
- Cross-platform compatibility improved significantly
- Offline access capabilities enhanced user satisfaction

## Recommendations
Based on our findings, we recommend:
1. Implementing IPFS as the default storage solution for content > 800 bytes
2. Establishing redundant gateway infrastructure for enterprise deployments
3. Adopting automated pinning strategies for critical content
4. Implementing content validation and integrity checking mechanisms

## Conclusion
The integration of IPFS with blockchain-based AI agent systems represents a significant advancement in decentralized application architecture. The benefits in terms of performance, cost-efficiency, and user experience make it an essential component for next-generation dApps.

This report demonstrates the type of large content that would traditionally be impossible to store on-chain but can now be seamlessly integrated using IPFS while maintaining blockchain security and transparency.`

  const signature = await channelInstructions.sendMessage(
    signer,
    channelAddress,
    {
      channelId: channelAddress,
      content: largeMessage,
      messageType: 0,
      attachments: [],
      ipfsConfig,
      forceIPFS: true
    }
  )

  console.log(`✅ Large message sent via IPFS: ${signature}`)
  return signature
}

/**
 * Example: Sending message with file attachments
 */
export async function exampleSendMessageWithAttachments(
  channelInstructions: ChannelInstructions,
  signer: TransactionSigner,
  channelAddress: Address,
  ipfsConfig: IPFSConfig
): Promise<string> {
  console.log('📎 Example: Sending message with file attachments')
  
  // Sample file attachments (in real usage, these would come from user uploads)
  const attachments = [
    {
      filename: 'research-data.csv',
      content: new TextEncoder().encode(`Date,Agent,Performance,Cost
2024-01-01,Agent1,95.2,0.001
2024-01-02,Agent2,97.8,0.0008
2024-01-03,Agent1,96.1,0.0009`),
      contentType: 'text/csv'
    },
    {
      filename: 'analysis-notes.txt',
      content: 'Initial analysis shows promising results. Performance metrics exceed baseline by 23%. Recommend continued monitoring and potential expansion of test parameters.',
      contentType: 'text/plain'
    },
    {
      filename: 'config.json',
      content: JSON.stringify({
        testParameters: {
          duration: '12 months',
          sampleSize: 10000,
          metrics: ['response_time', 'accuracy', 'cost_efficiency']
        },
        thresholds: {
          acceptable_response_time: 2000,
          minimum_accuracy: 0.95,
          max_cost_per_operation: 0.001
        }
      }, null, 2),
      contentType: 'application/json'
    }
  ]

  const signature = await channelInstructions.sendMessageWithAttachments(
    signer,
    channelAddress,
    'Please review the attached research data and analysis. The preliminary results look very promising!',
    attachments,
    {
      messageType: 0,
      ipfsConfig
    }
  )

  console.log(`✅ Message with attachments sent: ${signature}`)
  return signature
}

/**
 * Example: Resolving message content from IPFS
 */
export async function exampleResolveMessageContent(
  channelInstructions: ChannelInstructions,
  messageContent: string,
  ipfsConfig: IPFSConfig
): Promise<void> {
  console.log('📥 Example: Resolving message content from IPFS')
  
  // Configure IPFS for retrieval
  channelInstructions.configureIPFS(ipfsConfig)

  const resolved = await channelInstructions.resolveMessageContent(messageContent)
  
  if (resolved.isIPFS) {
    console.log('Message retrieved from IPFS:')
    console.log(`  IPFS Hash: ${resolved.metadata?.ipfsHash}`)
    console.log(`  Original Size: ${resolved.metadata?.originalSize} bytes`)
    console.log(`  Preview: ${resolved.metadata?.contentPreview}`)
    console.log(`  Full Content: ${resolved.resolvedContent.substring(0, 500)}...`)
  } else {
    console.log('Message stored inline:')
    console.log(`  Content: ${resolved.resolvedContent}`)
  }
}

/**
 * Example: Batch operations with IPFS
 */
export async function exampleBatchIPFSOperations(
  ipfsConfig: IPFSConfig
): Promise<void> {
  console.log('🔄 Example: Batch IPFS operations')
  
  const ipfsUtils = createIPFSUtils(ipfsConfig)
  
  // Prepare multiple content items for upload
  const contentItems = [
    {
      content: JSON.stringify({ type: 'agent_config', version: '1.0', settings: { maxRetries: 3 } }),
      type: 'custom' as const,
      filename: 'agent-config.json'
    },
    {
      content: 'This is a sample document for testing batch operations.',
      type: 'custom' as const,
      filename: 'sample-doc.txt'
    },
    {
      content: JSON.stringify({ 
        report: 'Monthly Performance', 
        data: [1, 2, 3, 4, 5],
        summary: 'All systems operating normally'
      }),
      type: 'custom' as const,
      filename: 'performance-report.json'
    }
  ]

  // Perform batch upload
  const results = await ipfsUtils.batchUpload(contentItems)
  
  console.log('Batch upload results:')
  results.forEach((result, index) => {
    if (result.success) {
      console.log(`  ✅ Item ${index + 1}: ${result.data?.uri}`)
    } else {
      console.log(`  ❌ Item ${index + 1}: ${result.message}`)
    }
  })
}

/**
 * Example: IPFS utilities usage
 */
export async function exampleIPFSUtilities(
  ipfsConfig: IPFSConfig
): Promise<void> {
  console.log('🔧 Example: IPFS utilities usage')
  
  const ipfsUtils = createIPFSUtils(ipfsConfig)
  
  // Store some test content
  const testMetadata = {
    name: 'Test Agent',
    version: '1.0.0',
    capabilities: ['testing', 'demonstration'],
    description: 'This is a test agent for demonstrating IPFS utilities',
    serviceEndpoint: 'https://test-agent.example.com/api'
  }

  const storageResult = await ipfsUtils.storeAgentMetadata(testMetadata)
  
  console.log('Storage result:')
  console.log(`  URI: ${storageResult.uri}`)
  console.log(`  Used IPFS: ${storageResult.useIpfs}`)
  console.log(`  Size: ${storageResult.size} bytes`)
  
  if (storageResult.ipfsMetadata) {
    console.log(`  IPFS Hash: ${storageResult.ipfsMetadata.ipfsHash}`)
    console.log(`  Pinned: ${storageResult.ipfsMetadata.pinned}`)
  }

  // Retrieve the content back
  const retrievedMetadata = await ipfsUtils.retrieveAgentMetadata(storageResult.uri)
  console.log('Retrieved metadata:', retrievedMetadata)

  // Check utilities stats
  const stats = ipfsUtils.getStats()
  console.log('IPFS Utils Stats:')
  console.log(`  Cache size: ${stats.cacheStats.size}`)
  console.log(`  Cached keys: ${stats.cacheStats.keys.join(', ')}`)
}

/**
 * Complete example combining all IPFS features
 */
export async function exampleCompleteIPFSIntegration(
  agentInstructions: AgentInstructions,
  channelInstructions: ChannelInstructions,
  signer: TransactionSigner,
  ipfsConfig: IPFSConfig
): Promise<void> {
  console.log('🚀 Complete IPFS integration example')
  
  try {
    // 1. Create agent with IPFS metadata
    const agentAddress = await exampleCreateAgentWithIPFS(
      agentInstructions,
      signer,
      ipfsConfig
    )

    // 2. Create a channel
    channelInstructions.configureIPFS(ipfsConfig)
    const channelResult = await channelInstructions.create(signer, {
      name: 'IPFS Demo Channel',
      description: 'Channel for demonstrating IPFS integration',
      visibility: 'public'
    })

    // 3. Send large message via IPFS
    await exampleSendLargeMessage(
      channelInstructions,
      signer,
      channelResult.channelId,
      ipfsConfig
    )

    // 4. Send message with attachments
    await exampleSendMessageWithAttachments(
      channelInstructions,
      signer,
      channelResult.channelId,
      ipfsConfig
    )

    // 5. Retrieve agent metadata
    await exampleRetrieveAgentMetadata(
      agentInstructions,
      agentAddress as Address,
      ipfsConfig
    )

    // 6. Demonstrate batch operations
    await exampleBatchIPFSOperations(ipfsConfig)

    // 7. Show utilities usage
    await exampleIPFSUtilities(ipfsConfig)

    console.log('✅ Complete IPFS integration example completed successfully!')

  } catch (error) {
    console.error('❌ IPFS integration example failed:', error instanceof Error ? error.message : String(error))
    throw error
  }
}

/**
 * Configuration examples for different deployment scenarios
 */
export const DEPLOYMENT_CONFIGS = {
  development: {
    ...IPFS_EXAMPLES.localNodeConfig,
    enableCache: true,
    sizeThreshold: 100 // Lower threshold for testing
  },
  
  staging: {
    ...IPFS_EXAMPLES.pinataConfig,
    sizeThreshold: 500,
    maxRetries: 5
  },
  
  production: {
    ...IPFS_EXAMPLES.multiProviderConfig,
    sizeThreshold: 800,
    maxRetries: 3,
    enableCache: true,
    cacheTTL: 600000 // 10 minutes
  }
} as const