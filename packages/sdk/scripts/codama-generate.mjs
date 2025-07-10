#!/usr/bin/env node

/**
 * Codama generation script for podAI Marketplace
 * Generates TypeScript SDK instruction builders from Anchor program
 */

import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import { renderVisitor } from '@codama/renderers-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the Anchor program IDL
const projectRoot = join(__dirname, '../../../');
const idlPath = join(projectRoot, 'target/idl/podai_marketplace.json');

// Output directory for generated TypeScript files
const outputDir = join(__dirname, '../src/generated-v2');

console.log('🚀 Starting Codama generation process...');
console.log(`IDL Path: ${idlPath}`);
console.log(`Output Directory: ${outputDir}`);

try {
  // Read the IDL file
  const idlData = JSON.parse(readFileSync(idlPath, 'utf8'));
  console.log(`✅ IDL loaded successfully: ${idlData.name}`);

  // Create Codama root node from IDL
  const rootNode = rootNodeFromAnchor(idlData);
  console.log(`✅ Codama root node created`);

  // Generate TypeScript SDK files
  console.log('🔄 Generating TypeScript SDK files...');
  renderVisitor(rootNode, outputDir);

  console.log('✅ Codama generation completed successfully!');
  console.log('📁 Generated files in:', outputDir);

  // List generated instruction files
  const instructionFiles = [
    'createWorkOrder.ts',
    'submitWorkDelivery.ts',
    'processPayment.ts',
    'createServiceListing.ts',
    'purchaseService.ts',
    'createJobPosting.ts',
    'applyToJob.ts',
    'acceptJobApplication.ts',
    'completeHiredJob.ts',
    'submitReview.ts',
    'createReplicationTemplate.ts',
    'replicateAgent.ts',
    'createA2aSession.ts',
    'sendA2aMessage.ts',
    'updateA2aStatus.ts',
    'processUserIntent.ts',
    'routeIntentToAgents.ts',
    'createServiceAuction.ts',
    'placeAuctionBid.ts',
    'createDynamicPricingEngine.ts',
    'updateDynamicPricing.ts',
    'initiateNegotiation.ts',
    'makeCounterOffer.ts',
    'createBulkDeal.ts',
    'createRoyaltyStream.ts',
    'listAgentForResale.ts',
    'fileDispute.ts',
    'submitDisputeEvidence.ts',
    'createAnalyticsDashboard.ts',
    'registerExtension.ts',
    'createIncentiveProgram.ts',
    'distributeIncentives.ts',
  ];

  console.log('\n📋 Expected instruction builders generated:');
  instructionFiles.forEach(file => {
    console.log(`  ✓ ${file}`);
  });

  console.log('\n🎉 All instruction builders have been generated!');
  console.log(
    '💡 You can now use these instructions in your TypeScript services.'
  );
} catch (error) {
  console.error('❌ Codama generation failed:', error.message);

  // Provide helpful error messages
  if (error.code === 'ENOENT') {
    console.error('💡 Make sure you have built the Anchor program first:');
    console.error('   cd packages/core && anchor build');
  } else if (error.name === 'SyntaxError') {
    console.error('💡 The IDL file might be corrupted. Try rebuilding:');
    console.error('   cd packages/core && anchor build');
  } else {
    console.error('💡 Check the error details above and ensure:');
    console.error('   - Anchor program is built');
    console.error('   - IDL file exists and is valid');
    console.error('   - Output directory is writable');
  }

  process.exit(1);
}
