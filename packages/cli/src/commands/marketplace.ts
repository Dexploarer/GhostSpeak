/**
 * Marketplace Commands - Agent Service Marketplace
 *
 * Access and interact with the decentralized agent marketplace.
 */

import chalk from 'chalk';
import { createSolanaRpc } from '@solana/rpc';
import { address } from '@solana/addresses';
import type { Address } from '@solana/addresses';
import { createKeyPairSignerFromBytes } from '@solana/signers';
import { ConfigManager } from '../core/ConfigManager.js';
import { Logger } from '../core/Logger.js';
import { logger } from '../utils/logger.js';
import { ProgressIndicator } from '../utils/prompts.js';
// Import marketplace implementation from the new file
import { MarketplaceImpl, ServiceListingStatus, type MarketplaceFilters, type ServiceListingAccount } from '../../../sdk/src/services/marketplace-impl.js';
import type { ServiceListingDataArgs } from '../../../sdk/src/generated-v2/instructions/createServiceListing.js';
import { lamportsToSol } from '../utils/format.js';
import { isVerboseMode } from '../utils/cli-options.js';

export interface ListServicesOptions {
  category?: string;
  sortBy?: 'price' | 'rating' | 'sales' | 'created';
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
}

export interface CreateListingOptions {
  title: string;
  description: string;
  price: number;
  category: string;
  tags?: string[];
  estimatedDelivery?: number;
  maxOrders?: number;
}

export interface PurchaseServiceOptions {
  listingId: string;
  quantity?: number;
  requirements?: string[];
  instructions?: string;
}

export async function listServices(
  options: ListServicesOptions
): Promise<void> {
  const logger = new Logger(isVerboseMode());
  const progress = new ProgressIndicator('Loading marketplace services...');

  try {
    logger.general.info(chalk.cyan('🛒 GhostSpeak Marketplace'));
    logger.general.info(chalk.gray('─'.repeat(40)));

    // Start progress indicator
    progress.start();

    // Load configuration
    progress.update('Loading configuration...');
    const config = await ConfigManager.load();
    const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com';
    logger.general.info(chalk.gray(`Network: ${config.network || 'devnet'}`));

    if (options.category) {
      logger.general.info(chalk.gray(`Category: ${options.category}`));
    }
    logger.general.info('');

    // Try to connect to blockchain, but fallback to demo mode if needed
    let listings: ServiceListingAccount[] = [];
    let total = 0;
    let hasMore = false;
    let isDemo = false;

    try {
      // Create RPC client
      progress.update('Connecting to blockchain...');
      const rpc = createSolanaRpc(rpcUrl);
      const programId = address(config.programId || '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');

      // Initialize marketplace service
      progress.update('Initializing marketplace service...');
      const marketplace = new MarketplaceImpl(rpc, programId);

      // Build filters
      const filters: MarketplaceFilters = {
        status: [ServiceListingStatus.Active],
        sortBy: options.sortBy || 'created',
        sortOrder: 'desc',
      };

      if (options.category) {
        filters.serviceTypes = [options.category];
      }

      if (options.minPrice !== undefined) {
        filters.minPrice = BigInt(options.minPrice * 1e9); // Convert SOL to lamports
      }

      if (options.maxPrice !== undefined) {
        filters.maxPrice = BigInt(options.maxPrice * 1e9);
      }

      if (options.minRating !== undefined) {
        filters.minRating = options.minRating;
      }

      // Browse listings
      progress.update('Fetching marketplace listings...');
      const result = await marketplace.browseListings(
        filters,
        options.limit || 20,
        0
      );
      
      listings = result.listings;
      total = result.total;
      hasMore = result.hasMore;
      
      // Success
      progress.succeed('Marketplace listings loaded successfully');
    } catch (error) {
      // If blockchain connection fails, show demo data
      logger.general.info(chalk.yellow('⚠️  Unable to connect to blockchain. Showing demo services.'));
      logger.general.info(chalk.gray('To see real services, ensure the program is deployed and you have network access.\n'));
      isDemo = true;

      // Generate demo listings
      const demoListings = generateDemoListings(options);
      listings = demoListings.listings;
      total = demoListings.total;
      hasMore = demoListings.hasMore;
    }

    if (listings.length === 0) {
      logger.general.info(chalk.yellow('No services found'));
      if (options.category) {
        logger.general.info(
          chalk.gray(`Try a different category or remove the filter`)
        );
      }
      logger.general.info('');
      logger.general.info(chalk.gray('Available categories:'));
      logger.general.info(chalk.gray('  • analytics - Data analysis and insights'));
      logger.general.info(chalk.gray('  • productivity - Task automation and management'));
      logger.general.info(chalk.gray('  • creative - Content generation and design'));
      logger.general.info(chalk.gray('  • security - Security audits and monitoring'));
      logger.general.info(chalk.gray('  • data - Data processing and transformation'));
      logger.general.info(chalk.gray('  • trading - Trading bots and market analysis'));
      logger.general.info(chalk.gray('  • automation - Workflow automation'));
    } else {
      logger.general.info(chalk.yellow(`Available Services (${listings.length} of ${total})${isDemo ? ' - Demo Mode' : ''}:`));
      logger.general.info('');
      
      listings.forEach((listing, index) => {
        logger.general.info(`  ${index + 1}. ${chalk.bold(listing.title)}`);
        logger.general.info(`     ID: ${listing.id}`);
        logger.general.info(`     Seller: ${listing.seller.slice(0, 8)}...${listing.seller.slice(-4)}`);
        logger.general.info(`     Category: ${chalk.cyan(listing.serviceType)}`);
        logger.general.info(`     Price: ${chalk.green(lamportsToSol(listing.price) + ' SOL')}`);
        
        const stars = Math.floor(listing.averageRating);
        const halfStar = listing.averageRating - stars >= 0.5;
        const ratingDisplay = '★'.repeat(stars) + (halfStar ? '☆' : '');
        logger.general.info(
          `     Rating: ${chalk.yellow(ratingDisplay)} (${listing.averageRating.toFixed(1)}/5.0)`
        );
        
        logger.general.info(`     Sales: ${listing.totalSales} completed`);
        logger.general.info(`     Available: ${listing.maxOrders - listing.activeOrders} slots`);
        logger.general.info(`     ${chalk.gray(listing.description.substring(0, 60))}...`);
        if (listing.tags.length > 0) {
          logger.general.info(`     Tags: ${chalk.gray(listing.tags.join(', '))}`);
        }
        logger.general.info('');
      });

      if (hasMore) {
        logger.general.info(chalk.gray('Use --limit to see more results'));
      }
    }

    logger.general.info(chalk.green('✅ Marketplace listing completed'));
    
    if (isDemo) {
      logger.general.info('');
      logger.general.info(chalk.yellow('💡 To interact with real services:'));
      logger.general.info(chalk.gray('   1. Ensure the GhostSpeak program is deployed'));
      logger.general.info(chalk.gray('   2. Connect to the correct network (devnet/mainnet)'));
      logger.general.info(chalk.gray('   3. Run: ghostspeak config show'));
    }
  } catch (error) {
    logger.error('Marketplace listing failed:', error);
    logger.general.info('');
    logger.general.info(chalk.red('❌ Error Details:'));
    logger.general.info(chalk.gray(error instanceof Error ? error.message : String(error)));
    logger.general.info('');
    logger.general.info(chalk.yellow('💡 Troubleshooting:'));
    logger.general.info(chalk.gray('   • Check your network connection'));
    logger.general.info(chalk.gray('   • Verify RPC endpoint is accessible'));
    logger.general.info(chalk.gray('   • Ensure the program is deployed to devnet'));
    logger.general.info(chalk.gray('   • Run: ghostspeak status'));
  }
}

// Helper function to generate demo listings
function generateDemoListings(options: ListServicesOptions): {
  listings: ServiceListingAccount[];
  total: number;
  hasMore: boolean;
} {
  const allDemoListings: ServiceListingAccount[] = [
    {
      version: 1,
      bump: 255,
      id: 1n,
      seller: address('11111111111111111111111111111111'),
      agent: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      title: 'AI Content Writer Pro',
      description: 'Professional AI agent that creates high-quality blog posts, articles, and marketing content tailored to your brand voice',
      serviceType: 'creative',
      tags: ['writing', 'content', 'marketing', 'seo'],
      price: BigInt(0.5 * 1e9),
      tokenMint: address('11111111111111111111111111111111'),
      paymentToken: address('11111111111111111111111111111111'),
      estimatedDelivery: 3600n,
      maxOrders: 10,
      activeOrders: 3,
      status: ServiceListingStatus.Active,
      listedAt: BigInt(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updatedAt: BigInt(Date.now() - 24 * 60 * 60 * 1000),
      totalSales: 47,
      totalRevenue: BigInt(23.5 * 1e9),
      averageRating: 4.8,
      totalReviews: 42,
    },
    {
      version: 1,
      bump: 255,
      id: 2n,
      seller: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      agent: address('So11111111111111111111111111111111111111112'),
      title: 'Smart Data Analytics Bot',
      description: 'Advanced analytics agent that processes your data and generates actionable insights with visualizations',
      serviceType: 'analytics',
      tags: ['data', 'analysis', 'visualization', 'insights'],
      price: BigInt(1.0 * 1e9),
      tokenMint: address('11111111111111111111111111111111'),
      paymentToken: address('11111111111111111111111111111111'),
      estimatedDelivery: 7200n,
      maxOrders: 5,
      activeOrders: 2,
      status: ServiceListingStatus.Active,
      listedAt: BigInt(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: BigInt(Date.now() - 2 * 24 * 60 * 60 * 1000),
      totalSales: 23,
      totalRevenue: BigInt(23.0 * 1e9),
      averageRating: 4.6,
      totalReviews: 18,
    },
    {
      version: 1,
      bump: 255,
      id: 3n,
      seller: address('So11111111111111111111111111111111111111112'),
      agent: address('Stake11111111111111111111111111111111111111'),
      title: 'Security Audit Assistant',
      description: 'Automated security scanning agent that audits smart contracts and identifies vulnerabilities',
      serviceType: 'security',
      tags: ['audit', 'smart-contract', 'vulnerability', 'solana'],
      price: BigInt(2.0 * 1e9),
      tokenMint: address('11111111111111111111111111111111'),
      paymentToken: address('11111111111111111111111111111111'),
      estimatedDelivery: 14400n,
      maxOrders: 3,
      activeOrders: 1,
      status: ServiceListingStatus.Active,
      listedAt: BigInt(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: BigInt(Date.now() - 3 * 24 * 60 * 60 * 1000),
      totalSales: 15,
      totalRevenue: BigInt(30.0 * 1e9),
      averageRating: 4.9,
      totalReviews: 12,
    },
    {
      version: 1,
      bump: 255,
      id: 4n,
      seller: address('Stake11111111111111111111111111111111111111'),
      agent: address('Vote111111111111111111111111111111111111111'),
      title: 'DeFi Trading Bot',
      description: 'Intelligent trading agent that executes strategies on Solana DeFi protocols with risk management',
      serviceType: 'trading',
      tags: ['defi', 'trading', 'arbitrage', 'yield'],
      price: BigInt(3.0 * 1e9),
      tokenMint: address('11111111111111111111111111111111'),
      paymentToken: address('11111111111111111111111111111111'),
      estimatedDelivery: 3600n,
      maxOrders: 20,
      activeOrders: 12,
      status: ServiceListingStatus.Active,
      listedAt: BigInt(Date.now() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: BigInt(Date.now() - 1 * 60 * 60 * 1000),
      totalSales: 156,
      totalRevenue: BigInt(468.0 * 1e9),
      averageRating: 4.7,
      totalReviews: 89,
    },
    {
      version: 1,
      bump: 255,
      id: 5n,
      seller: address('Vote111111111111111111111111111111111111111'),
      agent: address('Config1111111111111111111111111111111111111'),
      title: 'Task Automation Master',
      description: 'Productivity agent that automates repetitive tasks and manages workflows across multiple platforms',
      serviceType: 'productivity',
      tags: ['automation', 'workflow', 'productivity', 'integration'],
      price: BigInt(0.75 * 1e9),
      tokenMint: address('11111111111111111111111111111111'),
      paymentToken: address('11111111111111111111111111111111'),
      estimatedDelivery: 1800n,
      maxOrders: 15,
      activeOrders: 8,
      status: ServiceListingStatus.Active,
      listedAt: BigInt(Date.now() - 21 * 24 * 60 * 60 * 1000),
      updatedAt: BigInt(Date.now() - 12 * 60 * 60 * 1000),
      totalSales: 67,
      totalRevenue: BigInt(50.25 * 1e9),
      averageRating: 4.5,
      totalReviews: 54,
    },
  ];

  // Filter by category if specified
  let filteredListings = allDemoListings;
  if (options.category) {
    filteredListings = allDemoListings.filter(
      listing => listing.serviceType === options.category
    );
  }

  // Apply price filters
  if (options.minPrice !== undefined) {
    const minPriceLamports = BigInt(options.minPrice * 1e9);
    filteredListings = filteredListings.filter(
      listing => listing.price >= minPriceLamports
    );
  }

  if (options.maxPrice !== undefined) {
    const maxPriceLamports = BigInt(options.maxPrice * 1e9);
    filteredListings = filteredListings.filter(
      listing => listing.price <= maxPriceLamports
    );
  }

  // Apply rating filter
  if (options.minRating !== undefined) {
    filteredListings = filteredListings.filter(
      listing => listing.averageRating >= options.minRating
    );
  }

  // Sort listings
  if (options.sortBy) {
    filteredListings.sort((a, b) => {
      switch (options.sortBy) {
        case 'price':
          return Number(a.price - b.price);
        case 'rating':
          return b.averageRating - a.averageRating;
        case 'sales':
          return b.totalSales - a.totalSales;
        case 'created':
        default:
          return Number(b.listedAt - a.listedAt);
      }
    });
  }

  // Apply limit
  const limit = options.limit || 20;
  const paginatedListings = filteredListings.slice(0, limit);

  return {
    listings: paginatedListings,
    total: filteredListings.length,
    hasMore: filteredListings.length > limit,
  };
}

export async function createListing(
  options: CreateListingOptions
): Promise<void> {
  const logger = new Logger(isVerboseMode());

  try {
    logger.general.info(chalk.cyan('📝 Creating Service Listing'));
    logger.general.info(chalk.gray('─'.repeat(40)));

    // Load configuration
    const config = await ConfigManager.load();
    const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com';
    
    // Load wallet
    if (!config.walletPath) {
      throw new Error('No wallet configured. Run "ghostspeak wallet create" first.');
    }

    const walletData = await import(config.walletPath);
    const keypair = createKeyPairSignerFromBytes(new Uint8Array(walletData.default));

    // Create RPC client
    const rpc = createSolanaRpc(rpcUrl);
    const programId = address(config.programId || '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');

    // Initialize marketplace service
    const marketplace = new MarketplaceImpl(rpc, programId);

    // Prepare listing data
    const listingData: ServiceListingDataArgs = {
      title: options.title,
      description: options.description,
      price: BigInt(options.price * 1e9), // Convert SOL to lamports
      tokenMint: address('11111111111111111111111111111111'), // Native SOL
      serviceType: options.category,
      paymentToken: address('11111111111111111111111111111111'), // Native SOL
      estimatedDelivery: BigInt((options.estimatedDelivery || 24) * 3600), // Convert hours to seconds
      tags: options.tags || [],
    };

    // Get agent address (for now, use a default)
    const agentAddress = address('11111111111111111111111111111111'); // TODO: Get actual agent

    logger.general.info(`Creating listing: ${options.title}`);
    logger.general.info(`Price: ${options.price} SOL`);
    logger.general.info(`Category: ${options.category}`);

    // Create the listing
    const result = await marketplace.createListing(
      keypair,
      agentAddress,
      listingData
    );

    logger.general.info(chalk.green('✅ Service listing created successfully!'));
    logger.general.info(`Listing ID: ${result.listingId}`);
    logger.general.info(`Listing Address: ${result.listingAddress}`);
    logger.general.info(`Transaction: ${result.signature}`);
  } catch (error) {
    logger.error('Failed to create listing:', error);
    throw error;
  }
}

export async function purchaseService(
  options: PurchaseServiceOptions
): Promise<void> {
  const logger = new Logger(isVerboseMode());

  try {
    logger.general.info(chalk.cyan('💰 Purchasing Service'));
    logger.general.info(chalk.gray('─'.repeat(40)));

    // Load configuration
    const config = await ConfigManager.load();
    const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com';
    
    // Load wallet
    if (!config.walletPath) {
      throw new Error('No wallet configured. Run "ghostspeak wallet create" first.');
    }

    const walletData = await import(config.walletPath);
    const keypair = createKeyPairSignerFromBytes(new Uint8Array(walletData.default));

    // Create RPC client
    const rpc = createSolanaRpc(rpcUrl);
    const programId = address(config.programId || '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');

    // Initialize marketplace service
    const marketplace = new MarketplaceImpl(rpc, programId);

    const listingId = BigInt(options.listingId);
    const quantity = options.quantity || 1;

    logger.general.info(`Purchasing from listing: ${listingId}`);
    logger.general.info(`Quantity: ${quantity}`);
    
    if (options.requirements && options.requirements.length > 0) {
      logger.general.info(`Requirements: ${options.requirements.join(', ')}`);
    }
    
    if (options.instructions) {
      logger.general.info(`Instructions: ${options.instructions}`);
    }

    // Purchase the service
    const result = await marketplace.purchaseService(
      keypair,
      listingId,
      quantity,
      options.requirements,
      options.instructions
    );

    logger.general.info(chalk.green('✅ Service purchased successfully!'));
    logger.general.info(`Order ID: ${result.orderId}`);
    logger.general.info(`Order Address: ${result.orderAddress}`);
    logger.general.info(`Transaction: ${result.signature}`);
  } catch (error) {
    logger.error('Failed to purchase service:', error);
    throw error;
  }
}

export async function searchMarketplace(query: string): Promise<void> {
  const logger = new Logger(isVerboseMode());

  try {
    logger.general.info(chalk.cyan('🔍 Searching Marketplace'));
    logger.general.info(chalk.gray('─'.repeat(40)));
    logger.general.info(`Query: "${query}"`);
    logger.general.info('');

    // Load configuration
    const config = await ConfigManager.load();
    const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com';

    // Create RPC client
    const rpc = createSolanaRpc(rpcUrl);
    const programId = address(config.programId || '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');

    // Initialize marketplace service
    const marketplace = new MarketplaceImpl(rpc, programId);

    // Search listings
    const results = await marketplace.searchListings(query, {}, 20);

    if (results.length === 0) {
      logger.general.info(chalk.yellow('No results found'));
      logger.general.info(chalk.gray('Try different search terms'));
    } else {
      logger.general.info(chalk.yellow(`Found ${results.length} results:`));
      
      results.forEach((listing, index) => {
        logger.general.info(`  ${index + 1}. ${chalk.bold(listing.title)}`);
        logger.general.info(`     Category: ${listing.serviceType}`);
        logger.general.info(`     Price: ${chalk.green(lamportsToSol(listing.price) + ' SOL')}`);
        logger.general.info(`     Rating: ${chalk.yellow('★'.repeat(Math.floor(listing.averageRating)))} (${listing.averageRating.toFixed(1)})`);
        logger.general.info(`     ${listing.description.substring(0, 80)}...`);
        logger.general.info('');
      });
    }

    logger.general.info(chalk.green('✅ Search completed'));
  } catch (error) {
    logger.error('Marketplace search failed:', error);
    throw error;
  }
}

export async function getTrending(limit: number = 10): Promise<void> {
  const logger = new Logger(isVerboseMode());

  try {
    logger.general.info(chalk.cyan('🔥 Trending Services'));
    logger.general.info(chalk.gray('─'.repeat(40)));

    // Load configuration
    const config = await ConfigManager.load();
    const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com';

    // Create RPC client
    const rpc = createSolanaRpc(rpcUrl);
    const programId = address(config.programId || '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');

    // Initialize marketplace service
    const marketplace = new MarketplaceImpl(rpc, programId);

    // Get trending listings
    const listings = await marketplace.getTrendingListings(limit);

    if (listings.length === 0) {
      logger.general.info(chalk.yellow('No trending services found'));
    } else {
      logger.general.info(chalk.yellow(`Top ${listings.length} Trending Services:`));
      
      listings.forEach((listing, index) => {
        logger.general.info(`  ${chalk.bold('#' + (index + 1))} ${listing.title}`);
        logger.general.info(`     Sales: ${chalk.green(listing.totalSales.toString())}`);
        logger.general.info(`     Revenue: ${chalk.green(lamportsToSol(listing.totalRevenue) + ' SOL')}`);
        logger.general.info(`     Rating: ${chalk.yellow('★'.repeat(Math.floor(listing.averageRating)))} (${listing.averageRating.toFixed(1)})`);
        logger.general.info(`     Category: ${listing.serviceType}`);
        logger.general.info('');
      });
    }

    logger.general.info(chalk.green('✅ Trending services loaded'));
  } catch (error) {
    logger.error('Failed to get trending services:', error);
    throw error;
  }
}

export async function getMarketplaceStats(): Promise<void> {
  const logger = new Logger(isVerboseMode());

  try {
    logger.general.info(chalk.cyan('📊 Marketplace Analytics'));
    logger.general.info(chalk.gray('─'.repeat(40)));

    // Load configuration
    const config = await ConfigManager.load();
    const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com';

    // Create RPC client
    const rpc = createSolanaRpc(rpcUrl);
    const programId = address(config.programId || '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');

    // Initialize marketplace service
    const marketplace = new MarketplaceImpl(rpc, programId);

    // Get analytics
    const stats = await marketplace.getAnalytics();

    logger.general.info(chalk.yellow('Overall Statistics:'));
    logger.general.info(`  Total Listings: ${stats.totalListings}`);
    logger.general.info(`  Active Listings: ${stats.activeListings}`);
    logger.general.info(`  Total Sales: ${stats.totalSales}`);
    logger.general.info(`  Total Volume: ${chalk.green(lamportsToSol(stats.totalVolume) + ' SOL')}`);
    logger.general.info(`  Average Price: ${chalk.green(lamportsToSol(stats.averagePrice) + ' SOL')}`);
    logger.general.info('');

    if (stats.topCategories.length > 0) {
      logger.general.info(chalk.yellow('Top Categories:'));
      stats.topCategories.forEach((cat, index) => {
        logger.general.info(`  ${index + 1}. ${cat.category}: ${cat.count} listings`);
      });
      logger.general.info('');
    }

    if (stats.topSellers.length > 0) {
      logger.general.info(chalk.yellow('Top Sellers:'));
      stats.topSellers.slice(0, 5).forEach((seller, index) => {
        logger.general.info(`  ${index + 1}. ${seller.seller.substring(0, 8)}...`);
        logger.general.info(`     Sales: ${seller.sales}`);
        logger.general.info(`     Volume: ${chalk.green(lamportsToSol(seller.volume) + ' SOL')}`);
      });
    }

    logger.general.info('');
    logger.general.info(chalk.green('✅ Analytics loaded successfully'));
  } catch (error) {
    logger.error('Failed to get marketplace analytics:', error);
    throw error;
  }
}
