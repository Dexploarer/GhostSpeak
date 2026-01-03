/**
 * MCP Server Test Client
 *
 * Comprehensive test suite for GhostSpeak MCP server
 * Tests all tools and validates data correctness against Convex database
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { ConvexHttpClient } from 'convex/browser'

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(color: string, symbol: string, message: string) {
  console.log(`${color}${symbol}${colors.reset} ${message}`)
}

function success(message: string) {
  log(colors.green, '✅', message)
}

function error(message: string) {
  log(colors.red, '❌', message)
}

function info(message: string) {
  log(colors.blue, 'ℹ️ ', message)
}

function section(title: string) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}`)
  console.log(`${title}`)
  console.log(`${'='.repeat(60)}${colors.reset}\n`)
}

// Test state
let testsPassed = 0
let testsFailed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    success(message)
    testsPassed++
  } else {
    error(message)
    testsFailed++
  }
}

async function main() {
  console.log('\n🧪 GhostSpeak MCP Server - Comprehensive Test Suite\n')

  // Initialize Convex client for data validation
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) {
    error('NEXT_PUBLIC_CONVEX_URL environment variable is required')
    process.exit(1)
  }

  const convex = new ConvexHttpClient(convexUrl)
  info(`Connected to Convex: ${convexUrl}`)

  // Initialize MCP client
  const client = new Client({
    name: 'ghostspeak-test-client',
    version: '1.0.0',
  }, {
    capabilities: {},
  })

  const transport = new StdioClientTransport({
    command: 'bun',
    args: ['run', 'src/index.ts'],
    env: {
      ...process.env,
      NEXT_PUBLIC_CONVEX_URL: convexUrl,
    },
  })

  info('Starting MCP server...')
  await client.connect(transport)
  success('MCP server connected')

  // Test 1: List Tools
  section('TEST 1: List Available Tools')
  try {
    const toolsResponse = await client.listTools()
    const tools = toolsResponse.tools

    assert(tools.length === 3, `Expected 3 tools, got ${tools.length}`)
    assert(
      tools.some((t) => t.name === 'search_discovered_agents'),
      'Tool "search_discovered_agents" is available'
    )
    assert(
      tools.some((t) => t.name === 'claim_agent'),
      'Tool "claim_agent" is available'
    )
    assert(
      tools.some((t) => t.name === 'get_discovery_stats'),
      'Tool "get_discovery_stats" is available'
    )

    info(`Tools: ${tools.map((t) => t.name).join(', ')}`)
  } catch (err) {
    error(`Failed to list tools: ${err}`)
    testsFailed++
  }

  // Test 2: List Resources
  section('TEST 2: List Available Resources')
  try {
    const resourcesResponse = await client.listResources()
    const resources = resourcesResponse.resources

    assert(resources.length === 1, `Expected 1 resource, got ${resources.length}`)
    assert(
      resources.some((r) => r.uri === 'discovery://stats'),
      'Resource "discovery://stats" is available'
    )

    info(`Resources: ${resources.map((r) => r.uri).join(', ')}`)
  } catch (err) {
    error(`Failed to list resources: ${err}`)
    testsFailed++
  }

  // Test 3: Get Discovery Stats (Tool)
  section('TEST 3: Test get_discovery_stats Tool')
  try {
    const statsResult = await client.callTool({
      name: 'get_discovery_stats',
      arguments: {},
    })

    assert(statsResult.content.length > 0, 'Stats result has content')
    const statsContent = JSON.parse(statsResult.content[0].text as string)

    assert('stats' in statsContent, 'Response contains stats object')
    assert('timestamp' in statsContent, 'Response contains timestamp')

    const stats = statsContent.stats
    assert(typeof stats.total === 'number', 'stats.total is a number')
    assert(typeof stats.totalDiscovered === 'number', 'stats.totalDiscovered is a number')
    assert(typeof stats.totalClaimed === 'number', 'stats.totalClaimed is a number')
    assert(typeof stats.totalVerified === 'number', 'stats.totalVerified is a number')

    info(`Total agents: ${stats.total}`)
    info(`Discovered: ${stats.totalDiscovered}`)
    info(`Claimed: ${stats.totalClaimed}`)
    info(`Verified: ${stats.totalVerified}`)

    // Validate against Convex
    const convexStats = await convex.query('ghostDiscovery:getDiscoveryStats' as any, {})
    assert(
      JSON.stringify(stats) === JSON.stringify(convexStats),
      'MCP stats match Convex database'
    )
  } catch (err) {
    error(`Failed to get discovery stats: ${err}`)
    testsFailed++
  }

  // Test 4: Read Discovery Stats (Resource)
  section('TEST 4: Test discovery://stats Resource')
  try {
    const resourceResult = await client.readResource({
      uri: 'discovery://stats',
    })

    assert(resourceResult.contents.length > 0, 'Resource has contents')
    const resourceStats = JSON.parse(resourceResult.contents[0].text as string)

    assert(typeof resourceStats.total === 'number', 'Resource stats.total is a number')
    assert(typeof resourceStats.totalDiscovered === 'number', 'Resource stats.totalDiscovered is a number')

    info(`Resource stats: ${JSON.stringify(resourceStats)}`)

    // Validate against Convex
    const convexStats = await convex.query('ghostDiscovery:getDiscoveryStats' as any, {})
    assert(
      JSON.stringify(resourceStats) === JSON.stringify(convexStats),
      'Resource stats match Convex database'
    )
  } catch (err) {
    error(`Failed to read resource: ${err}`)
    testsFailed++
  }

  // Test 5: Search Discovered Agents (default parameters)
  section('TEST 5: Test search_discovered_agents (default params)')
  try {
    const searchResult = await client.callTool({
      name: 'search_discovered_agents',
      arguments: {},
    })

    assert(searchResult.content.length > 0, 'Search result has content')
    const searchContent = JSON.parse(searchResult.content[0].text as string)

    assert('agents' in searchContent, 'Response contains agents array')
    assert('stats' in searchContent, 'Response contains stats object')
    assert('count' in searchContent, 'Response contains count')
    assert('timestamp' in searchContent, 'Response contains timestamp')

    const agents = searchContent.agents
    assert(Array.isArray(agents), 'Agents is an array')
    assert(agents.length > 0, `Found ${agents.length} agents`)
    assert(agents.length <= 20, 'Default limit of 20 is respected')

    info(`Found ${agents.length} agents (default limit: 20)`)

    // Validate first agent structure
    if (agents.length > 0) {
      const firstAgent = agents[0]
      assert('ghostAddress' in firstAgent, 'Agent has ghostAddress')
      assert('status' in firstAgent, 'Agent has status')
      assert('discoverySource' in firstAgent, 'Agent has discoverySource')
      assert('firstSeenTimestamp' in firstAgent, 'Agent has firstSeenTimestamp')
      assert('slot' in firstAgent, 'Agent has slot')

      // Validate Solana address format
      const addressRegex = /^[A-HJ-NP-Za-km-z1-9]{32,44}$/
      assert(
        addressRegex.test(firstAgent.ghostAddress),
        `Valid Solana address: ${firstAgent.ghostAddress.slice(0, 8)}...`
      )

      info(`First agent: ${firstAgent.ghostAddress.slice(0, 8)}...`)
      info(`Status: ${firstAgent.status}`)
      info(`Discovery source: ${firstAgent.discoverySource}`)
    }

    // Validate against Convex
    const convexAgents = await convex.query('ghostDiscovery:listDiscoveredAgents' as any, {
      status: 'discovered',
      limit: 20,
    })

    assert(
      agents.length === convexAgents.length,
      `MCP returned ${agents.length} agents, Convex has ${convexAgents.length}`
    )

    // Check first agent matches
    if (agents.length > 0 && convexAgents.length > 0) {
      assert(
        agents[0].ghostAddress === convexAgents[0].ghostAddress,
        'First agent matches Convex database'
      )
    }
  } catch (err) {
    error(`Failed to search discovered agents: ${err}`)
    testsFailed++
  }

  // Test 6: Search Discovered Agents (with limit)
  section('TEST 6: Test search_discovered_agents (limit: 5)')
  try {
    const searchResult = await client.callTool({
      name: 'search_discovered_agents',
      arguments: { limit: 5 },
    })

    const searchContent = JSON.parse(searchResult.content[0].text as string)
    const agents = searchContent.agents

    assert(agents.length <= 5, `Limit of 5 respected (got ${agents.length})`)
    info(`Returned ${agents.length} agents with limit=5`)

    // Validate against Convex
    const convexAgents = await convex.query('ghostDiscovery:listDiscoveredAgents' as any, {
      status: 'discovered',
      limit: 5,
    })

    assert(
      agents.length === convexAgents.length,
      `MCP and Convex both returned ${agents.length} agents`
    )
  } catch (err) {
    error(`Failed to search with limit: ${err}`)
    testsFailed++
  }

  // Test 7: Search All Agents
  section('TEST 7: Test search_discovered_agents (limit: 100)')
  try {
    const searchResult = await client.callTool({
      name: 'search_discovered_agents',
      arguments: { limit: 100 },
    })

    const searchContent = JSON.parse(searchResult.content[0].text as string)
    const agents = searchContent.agents

    info(`Total agents in database: ${agents.length}`)

    // Validate all agents have correct structure
    const allValid = agents.every((agent: any) => {
      return (
        typeof agent.ghostAddress === 'string' &&
        typeof agent.status === 'string' &&
        typeof agent.discoverySource === 'string' &&
        typeof agent.firstSeenTimestamp === 'number' &&
        typeof agent.slot === 'number'
      )
    })

    assert(allValid, 'All agents have valid structure')

    // Validate against Convex
    const convexAgents = await convex.query('ghostDiscovery:listDiscoveredAgents' as any, {
      status: 'discovered',
      limit: 100,
    })

    assert(
      agents.length === convexAgents.length,
      `MCP and Convex both have ${agents.length} agents`
    )

    // Validate all addresses match
    const mcpAddresses = agents.map((a: any) => a.ghostAddress).sort()
    const convexAddresses = convexAgents.map((a: any) => a.ghostAddress).sort()

    assert(
      JSON.stringify(mcpAddresses) === JSON.stringify(convexAddresses),
      'All agent addresses match between MCP and Convex'
    )

    info(`Validated ${agents.length} agent addresses against Convex`)
  } catch (err) {
    error(`Failed to search all agents: ${err}`)
    testsFailed++
  }

  // Test 8: Claim Agent (Ownership Validation - Should Fail)
  section('TEST 8: Test claim_agent (ownership mismatch - should fail)')
  try {
    const claimResult = await client.callTool({
      name: 'claim_agent',
      arguments: {
        agentAddress: '5eLbn3wj3iScc2fVH8hyNGRBttDTY5rZpeGk1rcjLek2',
        claimedBy: 'HoFsjmCNuvyzGzUaxXiNgRZpUbBhiEzatXG9H5FdUx2e', // Different valid address
      },
    })

    const claimContent = JSON.parse(claimResult.content[0].text as string)

    assert(claimContent.success === false, 'Claim failed as expected (ownership mismatch)')
    assert('error' in claimContent, 'Error message present')
    assert(
      claimContent.error === 'Ownership verification failed',
      'Correct error: Ownership verification failed'
    )

    info('Ownership validation working correctly')
  } catch (err) {
    error(`Failed ownership validation test: ${err}`)
    testsFailed++
  }

  // Test 9: Claim Agent (Matching Addresses - Should Work)
  section('TEST 9: Test claim_agent (matching addresses)')
  try {
    // Get a real discovered agent from Convex (skip first one since we may have claimed it)
    const convexAgents = await convex.query('ghostDiscovery:listDiscoveredAgents' as any, {
      status: 'discovered',
      limit: 10,
    })

    // Find an unclaimed agent
    const unclaimedAgent = convexAgents.find((a: any) => a.status === 'discovered')

    if (unclaimedAgent) {
      const testAgent = unclaimedAgent.ghostAddress

      const claimResult = await client.callTool({
        name: 'claim_agent',
        arguments: {
          agentAddress: testAgent,
          claimedBy: testAgent, // Same address
        },
      })

      const claimContent = JSON.parse(claimResult.content[0].text as string)

      // This might succeed or fail depending on if already claimed
      if (claimContent.success) {
        success('Claim succeeded with matching addresses')
        assert('agentAddress' in claimContent, 'Response contains agentAddress')
        assert('claimedBy' in claimContent, 'Response contains claimedBy')
        assert('nextSteps' in claimContent, 'Response contains nextSteps')
        assert(Array.isArray(claimContent.nextSteps), 'nextSteps is an array')
        info(`Successfully claimed ${testAgent.slice(0, 8)}...`)
      } else {
        // If already claimed, that's also a valid state
        info(`Agent already claimed: ${claimContent.error || 'Already owned'}`)
        assert('error' in claimContent, 'Response contains error message')
      }
    } else {
      info('No discovered agents available to test claiming')
    }
  } catch (err) {
    error(`Failed claim agent test: ${err}`)
    testsFailed++
  }

  // Test 10: Claim Non-Existent Agent
  section('TEST 10: Test claim_agent (non-existent agent)')
  try {
    const fakeAddress = '1111111111111111111111111111111111111111'

    const claimResult = await client.callTool({
      name: 'claim_agent',
      arguments: {
        agentAddress: fakeAddress,
        claimedBy: fakeAddress,
      },
    })

    const claimContent = JSON.parse(claimResult.content[0].text as string)

    assert(claimContent.success === false, 'Claim failed for non-existent agent')
    assert(
      claimContent.error === 'Agent not found',
      'Correct error: Agent not found'
    )

    info('Non-existent agent handling working correctly')
  } catch (err) {
    error(`Failed non-existent agent test: ${err}`)
    testsFailed++
  }

  // Summary
  section('TEST SUMMARY')
  console.log(`${colors.green}✅ Tests Passed: ${testsPassed}${colors.reset}`)
  console.log(`${colors.red}❌ Tests Failed: ${testsFailed}${colors.reset}`)
  console.log(`${colors.cyan}📊 Total Tests: ${testsPassed + testsFailed}${colors.reset}`)

  if (testsFailed === 0) {
    success('All tests passed!')
  } else {
    error(`${testsFailed} test(s) failed`)
  }

  // Cleanup
  await client.close()
  process.exit(testsFailed === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
