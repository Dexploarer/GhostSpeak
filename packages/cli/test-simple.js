/**
 * Simple test for the PodAI Client - JavaScript version
 */

console.log('🚀 Testing PodAI Client basics...');

async function testBasics() {
  try {
    // Test basic functionality
    console.log('✅ Basic Node.js functionality working');
    
    // Test fetch (our main dependency)
    const response = await fetch('https://api.devnet.solana.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getVersion',
        params: []
      })
    });
    
    const data = await response.json();
    console.log(`✅ Solana RPC connection working: ${data.result['solana-core']}`);
    
    // Test our client module
    const { createPodAIClient } = await import('./src/client.js');
    console.log('✅ PodAI client module imported successfully');
    
    const client = createPodAIClient({
      rpcUrl: 'https://api.devnet.solana.com',
      network: 'devnet',
      commitment: 'confirmed'
    });
    
    console.log('✅ PodAI client created successfully');
    
    const initialized = await client.initialize();
    console.log(`✅ Client initialized: ${initialized}`);
    
    console.log('\n🎉 All basic tests passed! The client is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testBasics(); 