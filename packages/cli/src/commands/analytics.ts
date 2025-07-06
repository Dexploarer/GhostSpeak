import { AnalyticsService } from '@podai/sdk';
import { getRpc, getCommitment } from '../context-helpers';

/**
 * Run platform analytics using the real SDK AnalyticsService
 * @param options - Analytics options (timeframe, etc.)
 */
export async function runAnalytics(options?: { timeframe?: '24h' | '7d' | '30d' }): Promise<void> {
  try {
    const rpc = await getRpc();
    const commitment = await getCommitment();
    const analyticsService = new AnalyticsService(rpc, commitment);
    const timeframe = options?.timeframe || '24h';
    const metrics = await analyticsService.getPlatformAnalytics(timeframe);
    console.log('📊 Platform analytics:', metrics);
  } catch (error) {
    console.error('❌ Failed to run analytics:', error);
  }
}

// TODO: Add more analytics operations as SDK expands 