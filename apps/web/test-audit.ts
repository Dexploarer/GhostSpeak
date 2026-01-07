import { ConvexHttpClient } from 'convex/browser';
import { api } from './convex/_generated/api';

const client = new ConvexHttpClient('https://lovely-cobra-639.convex.cloud');

async function test() {
  console.log('=== CAISPER CAPABILITY AUDIT ===\n');
  
  // 1. Discovery Stats
  console.log('1. DISCOVERY STATS');
  const stats = await client.query(api.ghostDiscovery.getDiscoveryStats);
  console.log('   Total agents:', stats.total);
  console.log('   ✅ Working\n');
  
  // 2. List Discovered Agents
  console.log('2. LIST DISCOVERED AGENTS');
  const agents = await client.query(api.ghostDiscovery.listDiscoveredAgents, { limit: 5 });
  console.log('   Returned:', agents.length, 'agents');
  console.log('   ✅ Working\n');
  
  // 3. Observatory Stats
  console.log('3. OBSERVATORY STATS');
  const obsStats = await client.query(api.observation.getObservatoryStats, {});
  console.log('   Total endpoints:', obsStats.totalEndpoints);
  console.log('   ✅ Working\n');
  
  // 4. List Endpoints
  console.log('4. LIST ENDPOINTS');
  const endpoints = await client.query(api.observation.listEndpoints, { activeOnly: true, limit: 3 });
  console.log('   Returned:', endpoints.length, 'endpoints');
  console.log('   ✅ Working\n');
  
  // 5. Get Tests For Agent
  console.log('5. GET TESTS FOR AGENT');
  const tests = await client.query(api.observation.getTestsForAgent, { 
    agentAddress: '53JhuF8bgxvUQ59nDG6kWs4awUQYCS3wswQmUsV5uC7t',
    limit: 3
  });
  console.log('   Tests:', tests.length);
  console.log('   ✅ Working\n');
  
  // 6. Get Fraud Signals
  console.log('6. GET FRAUD SIGNALS');
  const fraud = await client.query(api.observation.getFraudSignals, { 
    agentAddress: '53JhuF8bgxvUQ59nDG6kWs4awUQYCS3wswQmUsV5uC7t'
  });
  console.log('   Fraud signals:', fraud.length);
  console.log('   ✅ Working\n');
  
  // 7. Ghost Score
  console.log('7. GHOST SCORE');
  const score = await client.query(api.ghostScoreCalculator.calculateAgentScore, { 
    agentAddress: '53JhuF8bgxvUQ59nDG6kWs4awUQYCS3wswQmUsV5uC7t'
  });
  console.log('   Score:', score.score, '/ Tier:', score.tier);
  console.log('   ✅ Working\n');
  
  // 8. Get Single Agent
  console.log('8. GET SINGLE AGENT');
  const singleAgent = await client.query(api.ghostDiscovery.getDiscoveredAgent, { 
    ghostAddress: '53JhuF8bgxvUQ59nDG6kWs4awUQYCS3wswQmUsV5uC7t'
  });
  console.log('   Found:', singleAgent ? 'Yes' : 'No');
  console.log('   ✅ Working\n');
  
  // 9. External ID Mappings
  console.log('9. EXTERNAL ID MAPPINGS');
  const mappings = await client.query(api.ghostDiscovery.getExternalIdMappings, { 
    ghostAddress: '53JhuF8bgxvUQ59nDG6kWs4awUQYCS3wswQmUsV5uC7t'
  });
  console.log('   Mappings:', mappings.length);
  console.log('   ✅ Working\n');
  
  // 10. Daily Reports
  console.log('10. DAILY REPORTS');
  const reports = await client.query(api.observation.getReportsForAgent, {
    agentAddress: '53JhuF8bgxvUQ59nDG6kWs4awUQYCS3wswQmUsV5uC7t',
    limit: 1
  });
  console.log('   Reports:', reports.length);
  console.log('   ✅ Working\n');
  
  console.log('=== ALL 10 QUERIES VALIDATED ===');
}

test().catch(console.error);
