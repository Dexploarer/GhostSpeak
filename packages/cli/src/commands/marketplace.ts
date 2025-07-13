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
import { LazyModules } from '@ghostspeak/sdk';
import { lamportsToSol } from '../utils/format.js';
import { isVerboseMode } from '../utils/cli-options.js';

// Real marketplace service instance
let marketplaceService: any = null;
let rpcClient: any = null;

async function getMarketplaceService() {
  if (!marketplaceService) {
    try {
      // Load configuration
      const config = await ConfigManager.load();
      const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com';
      const programId = address(config.programId || '367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK');
      
      // Create RPC client
      rpcClient = createSolanaRpc(rpcUrl);
      
      // Load marketplace service from SDK
      const marketplaceModule = await LazyModules.marketplace;
      marketplaceService = new marketplaceModule.MarketplaceService(rpcClient, programId);
      
      logger.general.debug('Marketplace service initialized successfully');
    } catch (error) {
      logger.general.error('Failed to initialize marketplace service:', error);
      throw error;
    }
  }
  return marketplaceService;
}

async function getKeypairFromConfig() {
  const config = await ConfigManager.load();
  
  if (!config.walletPath) {
    throw new Error('No wallet configured. Run "ghostspeak wallet create" first.');
  }
  
  try {
    const walletData = await import(config.walletPath);
    return createKeyPairSignerFromBytes(new Uint8Array(walletData.default));
  } catch (error) {
    throw new Error(`Failed to load wallet from ${config.walletPath}. Please check your wallet configuration.`);
  }
}

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

    // Connect to blockchain to fetch real service listings
    let listings: any[] = [];
    let total = 0;
    let hasMore = false;

    // Initialize marketplace service
    progress.update('Initializing marketplace service...');
    const marketplace = await getMarketplaceService();

    // Build filters
    const filters: any = {
      status: 'Active',
      sortBy: options.sortBy || 'created',
      sortOrder: 'desc',
    };

    if (options.category) {
      filters.serviceType = options.category;
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
    const result = await marketplace.browseListings({
      filters,
      limit: options.limit || 20,
      offset: 0
    });
    
    listings = result.listings || [];
    total = result.total || 0;
    hasMore = result.hasMore || false;
    
    // Success
    progress.succeed('Marketplace listings loaded successfully');

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
      logger.general.info(chalk.yellow(`Available Services (${listings.length} of ${total}):`));
      logger.general.info('');
      
      listings.forEach((listing: any, index: number) => {
        const account = listing.account || listing;
        logger.general.info(`  ${index + 1}. ${chalk.bold(account.title)}`);
        logger.general.info(`     ID: ${listing.publicKey || account.id}`);
        logger.general.info(`     Seller: ${account.seller?.slice(0, 8)}...${account.seller?.slice(-4)}`);
        logger.general.info(`     Category: ${chalk.cyan(account.serviceType)}`);
        logger.general.info(`     Price: ${chalk.green(lamportsToSol(Number(account.price)) + ' SOL')}`);
        
        const rating = account.averageRating || 0;
        const stars = Math.floor(rating);
        const halfStar = rating - stars >= 0.5;
        const ratingDisplay = '★'.repeat(stars) + (halfStar ? '☆' : '');
        logger.general.info(
          `     Rating: ${chalk.yellow(ratingDisplay)} (${rating.toFixed(1)}/5.0)`
        );
        
        logger.general.info(`     Sales: ${account.totalSales || 0} completed`);
        logger.general.info(`     Available: ${(account.maxOrders || 0) - (account.activeOrders || 0)} slots`);
        logger.general.info(`     ${chalk.gray((account.description || '').substring(0, 60))}...`);
        if (account.tags && account.tags.length > 0) {
          logger.general.info(`     Tags: ${chalk.gray(account.tags.join(', '))}`);
        }
        logger.general.info('');
      });

      if (hasMore) {
        logger.general.info(chalk.gray('Use --limit to see more results'));
      }
    }

    logger.general.info(chalk.green('✅ Marketplace listing completed'));
  } catch (error) {
    progress.fail('Failed to connect to blockchain');
    logger.general.error('Marketplace listing failed:', error);
    logger.general.info('');
    logger.general.info(chalk.red('❌ Unable to fetch marketplace listings'));
    logger.general.info(chalk.gray(error instanceof Error ? error.message : String(error)));
    logger.general.info('');
    logger.general.info(chalk.yellow('💡 Troubleshooting:'));
    logger.general.info(chalk.gray('   • Check your network connection'));
    logger.general.info(chalk.gray('   • Verify RPC endpoint is accessible'));
    logger.general.info(chalk.gray('   • Ensure the GhostSpeak program is deployed'));
    logger.general.info(chalk.gray('   • Check network configuration: ghostspeak config show'));
    logger.general.info(chalk.gray('   • Verify blockchain status: ghostspeak status'));
    throw error;
  }
}

export async function createListing(
  options: CreateListingOptions
): Promise<void> {
  const logger = new Logger(isVerboseMode());

  try {
    logger.general.info(chalk.cyan('📝 Creating Service Listing'));
    logger.general.info(chalk.gray('─'.repeat(40)));

    // Load configuration and wallet
    const config = await ConfigManager.load();
    const keypair = await getKeypairFromConfig();

    // Initialize marketplace service
    const marketplace = await getMarketplaceService();

    // Prepare listing data
    const listingData = {
      title: options.title,
      description: options.description,
      price: BigInt(options.price * 1e9), // Convert SOL to lamports
      serviceType: options.category,
      estimatedDelivery: BigInt((options.estimatedDelivery || 24) * 3600), // Convert hours to seconds
      tags: options.tags || [],
      maxOrders: options.maxOrders || 100,
    };

    logger.general.info(`Creating listing: ${options.title}`);
    logger.general.info(`Price: ${options.price} SOL`);
    logger.general.info(`Category: ${options.category}`);

    // Create the listing
    const result = await marketplace.createListing({
      authority: keypair,
      listingData
    });

    logger.general.info(chalk.green('✅ Service listing created successfully!'));
    logger.general.info(`Listing ID: ${result.listingId}`);
    logger.general.info(`Listing Address: ${result.listingAddress}`);
    logger.general.info(`Transaction: ${result.signature}`);
  } catch (error) {
    logger.general.error('Failed to create listing:', error);
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

    // Load configuration and wallet
    const config = await ConfigManager.load();
    const keypair = await getKeypairFromConfig();

    // Initialize marketplace service
    const marketplace = await getMarketplaceService();

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
    const result = await marketplace.purchaseService({
      buyer: keypair,
      listingId: listingId,
      quantity: quantity,
      requirements: options.requirements,
      instructions: options.instructions
    });

    logger.general.info(chalk.green('✅ Service purchased successfully!'));
    logger.general.info(`Order ID: ${result.orderId}`);
    logger.general.info(`Order Address: ${result.orderAddress}`);
    logger.general.info(`Transaction: ${result.signature}`);
  } catch (error) {
    logger.general.error('Failed to purchase service:', error);
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

    // Initialize marketplace service
    const marketplace = await getMarketplaceService();

    // Search listings
    const results = await marketplace.searchListings({
      query: query,
      filters: {},
      limit: 20
    });

    if (results.length === 0) {
      logger.general.info(chalk.yellow('No results found'));
      logger.general.info(chalk.gray('Try different search terms'));
    } else {
      logger.general.info(chalk.yellow(`Found ${results.length} results:`));
      
      results.forEach((listing: any, index: number) => {
        const account = listing.account || listing;
        logger.general.info(`  ${index + 1}. ${chalk.bold(account.title)}`);
        logger.general.info(`     Category: ${account.serviceType}`);
        logger.general.info(`     Price: ${chalk.green(lamportsToSol(Number(account.price)) + ' SOL')}`);
        const rating = account.averageRating || 0;
        logger.general.info(`     Rating: ${chalk.yellow('★'.repeat(Math.floor(rating)))} (${rating.toFixed(1)})`);
        logger.general.info(`     ${(account.description || '').substring(0, 80)}...`);
        logger.general.info('');
      });
    }

    logger.general.info(chalk.green('✅ Search completed'));
  } catch (error) {
    logger.general.error('Marketplace search failed:', error);
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

    // Initialize marketplace service
    const marketplace = await getMarketplaceService();

    // Get trending listings
    const listings = await marketplace.getTrendingListings({ limit });

    if (listings.length === 0) {
      logger.general.info(chalk.yellow('No trending services found'));
    } else {
      logger.general.info(chalk.yellow(`Top ${listings.length} Trending Services:`));
      
      listings.forEach((listing: any, index: number) => {
        const account = listing.account || listing;
        logger.general.info(`  ${chalk.bold('#' + (index + 1))} ${account.title}`);
        logger.general.info(`     Sales: ${chalk.green((account.totalSales || 0).toString())}`);
        logger.general.info(`     Revenue: ${chalk.green(lamportsToSol(Number(account.totalRevenue || 0)) + ' SOL')}`);
        const rating = account.averageRating || 0;
        logger.general.info(`     Rating: ${chalk.yellow('★'.repeat(Math.floor(rating)))} (${rating.toFixed(1)})`);
        logger.general.info(`     Category: ${account.serviceType}`);
        logger.general.info('');
      });
    }

    logger.general.info(chalk.green('✅ Trending services loaded'));
  } catch (error) {
    logger.general.error('Failed to get trending services:', error);
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

    // Initialize marketplace service
    const marketplace = await getMarketplaceService();

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
    logger.general.error('Failed to get marketplace analytics:', error);
    throw error;
  }
}
