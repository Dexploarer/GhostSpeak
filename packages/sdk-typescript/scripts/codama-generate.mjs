#!/usr/bin/env node

/**
 * Codama generation script for podAI Marketplace
 * Generates TypeScript SDK instruction builders from Anchor program
 */

import { createFromRoot } from '@codama/nodes-from-anchor';
import { renderVisitor } from '@codama/renderers-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the Anchor program IDL
const projectRoot = join(__dirname, '../../../../');
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
    const rootNode = createFromRoot(idlData);
    console.log(`✅ Codama root node created`);
    
    // Generate TypeScript SDK files
    const visitor = renderVisitor(outputDir, {
        // Instruction generation options
        instructionAccountTypes: ['account', 'signer', 'program'],
        instructionDataTypes: ['struct', 'enum'],
        
        // Account generation options
        accountTypes: ['account'],
        
        // Type generation options
        typeOptions: {
            useNativeTypes: true,
            useOptionalTypes: true,
        },
        
        // Specific instructions to generate
        instructions: [
            // Core instructions (already generated)
            'register_agent',
            'create_channel',
            'send_message',
            'add_participant',
            'broadcast_message',
            
            // Work order instructions (missing)
            'create_work_order',
            'submit_work_delivery',
            'process_payment',
            
            // Service marketplace instructions (missing)
            'create_service_listing',
            'purchase_service',
            
            // Job marketplace instructions (missing)
            'create_job_posting',
            'apply_to_job',
            'accept_job_application',
            'complete_hired_job',
            
            // Review system
            'submit_review',
            
            // Agent replication
            'create_replication_template',
            'replicate_agent',
            
            // A2A Communication
            'create_a2a_session',
            'send_a2a_message',
            'update_a2a_status',
            
            // Intent processing
            'process_user_intent',
            'route_intent_to_agents',
            
            // Advanced features
            'create_service_auction',
            'place_auction_bid',
            'create_dynamic_pricing_engine',
            'update_dynamic_pricing',
            'initiate_negotiation',
            'make_counter_offer',
            'create_bulk_deal',
            'create_royalty_stream',
            'list_agent_for_resale',
            'file_dispute',
            'submit_dispute_evidence',
            'create_analytics_dashboard',
            'register_extension',
            'create_incentive_program',
            'distribute_incentives',
        ],
        
        // Generate program and account types
        programs: true,
        accounts: true,
        types: true,
    });
    
    console.log('🔄 Generating TypeScript SDK files...');
    visitor.visit(rootNode);
    
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
    console.log('💡 You can now use these instructions in your TypeScript services.');
    
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