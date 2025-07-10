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
// Import marketplace implementation from the new file
import { MarketplaceImpl, ServiceListingStatus, type MarketplaceFilters } from '../../../sdk/src/services/marketplace-impl.js';
import type { ServiceListingDataArgs } from '../../../sdk/src/generated-v2/instructions/createServiceListing.js';
import { lamportsToSol } from '../utils/format.js';

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
  const logger = new Logger(false);

  try {
    logger.general.info(chalk.cyan('🛒 GhostSpeak Marketplace'));
    logger.general.info(chalk.gray('─'.repeat(40)));

    // Load configuration
    const config = await ConfigManager.load();
    const rpcUrl = config.rpcUrl || 'https://api.devnet.solana.com';
    logger.general.info(chalk.gray(`Network: ${config.network || 'devnet'}`));

    if (options.category) {
      logger.general.info(chalk.gray(`Category: ${options.category}`));
    }
    logger.general.info('');

    // Create RPC client
    const rpc = createSolanaRpc(rpcUrl);
    const programId = address(config.programId || '4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');

    // Initialize marketplace service
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
    const { listings, total, hasMore } = await marketplace.browseListings(
      filters,
      options.limit || 20,
      0
    );

    if (listings.length === 0) {
      logger.general.info(chalk.yellow('No services found'));
      if (options.category) {
        logger.general.info(
          chalk.gray(`Try a different category or remove the filter`)
        );
      }
    } else {
      logger.general.info(chalk.yellow(`Available Services (${listings.length} of ${total}):`));
      
      listings.forEach((listing, index) => {
        logger.general.info(`  ${index + 1}. ${chalk.bold(listing.title)}`);
        logger.general.info(`     ID: ${listing.id}`);
        logger.general.info(`     Seller: ${listing.seller}`);
        logger.general.info(`     Category: ${listing.serviceType}`);
        logger.general.info(`     Price: ${chalk.green(lamportsToSol(listing.price) + ' SOL')}`);
        logger.general.info(
          `     Rating: ${chalk.yellow('★'.repeat(Math.floor(listing.averageRating)))} (${listing.averageRating.toFixed(1)})`
        );
        logger.general.info(`     Sales: ${listing.totalSales}`);
        logger.general.info(`     Available: ${listing.maxOrders - listing.activeOrders} of ${listing.maxOrders}`);
        logger.general.info(`     Description: ${listing.description}`);
        if (listing.tags.length > 0) {
          logger.general.info(`     Tags: ${listing.tags.join(', ')}`);
        }
        logger.general.info('');
      });

      if (hasMore) {
        logger.general.info(chalk.gray('Use --limit to see more results'));
      }
    }

    logger.general.info(chalk.green('✅ Marketplace listing completed'));
    logger.general.info('');
    logger.general.info(
      chalk.gray(
        'Categories: analytics, productivity, creative, security, data, trading, automation'
      )
    );
  } catch (error) {
    logger.error('Marketplace listing failed:', error);
    throw error;
  }
}

export async function createListing(
  options: CreateListingOptions
): Promise<void> {
  const logger = new Logger(false);

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
  const logger = new Logger(false);

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
  const logger = new Logger(false);

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
  const logger = new Logger(false);

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
  const logger = new Logger(false);

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
