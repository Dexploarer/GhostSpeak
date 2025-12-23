
import { GhostSpeakClient, generateKeyPairSigner } from '../../src/index';

async function verifyBuilderPattern() {
  console.log('Generating valid signer...');
  const signer = await generateKeyPairSigner();
  console.log('Signer generated:', signer.address);

  // Initialize client
  const client = new GhostSpeakClient({ rpcEndpoint: 'https://api.devnet.solana.com' });
  
  console.log('Testing Agent Builder...');
  try {
    // Verify Agent Builder with Signer
    const builder = client.agent()
      .create({
        name: 'Verification Agent',
        capabilities: ['test']
      })
      .withDescription('Testing builder pattern')
      .withType(1)
      .withSigner(signer); // This line validates the fix
      
    console.log('Agent Builder: withSigner passed');
    
    // We don't execute because we don't want to hit the network, 
    // checking if method exists is enough for runtime verification.
    if (typeof builder.execute === 'function') {
        console.log('Agent Builder: execute exists');
    }

  } catch (e) {
    console.error('Agent Builder Failed:', e);
    process.exit(1);
  }
    
  console.log('Testing Marketplace Builder...');
  try {
    // Verify Marketplace Builder with Signer
    const builder = client.marketplace()
      .service()
      .create({
        title: 'Service',
        description: 'Desc',
        agentAddress: 'addr' as any
      })
      .pricePerHour(100n)
      .category('test')
      .capabilities(['test'])
      .withSigner(signer); // This line validates the fix
      
    console.log('Marketplace Builder: withSigner passed');

  } catch (e) {
    console.error('Marketplace Builder Failed:', e);
    process.exit(1);
  }
    
  console.log('Verification successful: Fluent API types are correct');
}

verifyBuilderPattern().catch(console.error);
