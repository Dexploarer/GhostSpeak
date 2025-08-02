/**
 * Agent analytics command
 */

import type { Command } from 'commander'
import chalk from 'chalk'
import { 
  intro, 
  outro, 
  spinner,
  log
} from '@clack/prompts'
import type { AnalyticsOptions } from '../../types/cli-types.js'
import { formatAnalytics } from '../agent/helpers.js'
import { container, ServiceTokens } from '../../core/Container.js'
import type { IAgentService } from '../../types/services.js'

// Analytics interface for type safety
interface AgentAnalytics {
  totalEarnings: number
  jobsCompleted: number
  successRate: number
  averageRating: number
  totalTransactions: number
  uniqueClients: number
  totalVolume: bigint
  activeAgents: number
  totalJobs: number
  totalAgents: number
  verifiedAgents: number
  jobsByCategory: Record<string, number>
  earningsTrend: { timestamp: bigint; earnings: bigint }[]
  topClients: { address: string; jobCount: number; totalSpent: bigint }[]
  topCategories: { name: string; agentCount: number }[]
  topPerformers: { name: string; address: string; successRate: number; totalEarnings: bigint }[]
  growthMetrics: {
    weeklyGrowth: number
    monthlyGrowth: number
    userGrowth: number
    revenueGrowth: number
  }
  insights: string[]
}

export function registerAnalyticsCommand(parentCommand: Command): void {
  parentCommand
    .command('analytics')
    .description('View agent performance analytics')
    .option('-a, --agent <address>', 'Specific agent address')
    .option('--mine', 'Show analytics for my agents only')
    .option('-p, --period <period>', 'Time period (7d, 30d, 90d, 1y)')
    .action(async (options: AnalyticsOptions) => {
      intro(chalk.cyan('📊 Agent Analytics'))

      try {
        const s = spinner()
        s.start('Loading analytics data...')
        
        // Get AgentService from container
        const agentService = container.resolve<IAgentService>(ServiceTokens.AGENT_SERVICE)
        
        let analytics: AgentAnalytics
        
        try {
          // For specific agent analytics
          if (options.agent) {
            const agentAnalytics = await agentService.getAnalytics(options.agent)
            analytics = {
              totalEarnings: Number(agentAnalytics.totalEarnings),
              jobsCompleted: agentAnalytics.completedJobs,
              successRate: agentAnalytics.successRate,
              averageRating: agentAnalytics.averageRating,
              totalTransactions: agentAnalytics.totalJobs,
              uniqueClients: 0,
              totalVolume: BigInt(0),
              activeAgents: 1,
              totalJobs: agentAnalytics.totalJobs,
              totalAgents: 1,
              verifiedAgents: 1,
              jobsByCategory: {},
              earningsTrend: [],
              topClients: [],
              topCategories: [],
              topPerformers: [],
              growthMetrics: {
                weeklyGrowth: 0,
                monthlyGrowth: 0,
                userGrowth: 0,
                revenueGrowth: 0
              },
              insights: ['Analytics data coming from service layer']
            }
          } else {
            throw new Error('Analytics methods not fully implemented yet')
          }
        } catch {
          s.stop('❌ Analytics not available')
          
          // Show fallback message with formatted helper output
          const fallbackAnalytics: AgentAnalytics = {
            totalEarnings: 0,
            jobsCompleted: 0,
            successRate: 0,
            averageRating: 0,
            totalTransactions: 0,
            uniqueClients: 0,
            totalVolume: BigInt(0),
            activeAgents: 0,
            totalJobs: 0,
            totalAgents: 0,
            verifiedAgents: 0,
            jobsByCategory: {},
            earningsTrend: [],
            topClients: [],
            topCategories: [],
            topPerformers: [],
            growthMetrics: {
              weeklyGrowth: 0,
              monthlyGrowth: 0,
              userGrowth: 0,
              revenueGrowth: 0
            },
            insights: []
          }
          
          console.log('')
          console.log(chalk.yellow('📊 Agent Analytics'))
          console.log(chalk.gray('Analytics are not yet available in the current SDK version.'))
          console.log('')
          console.log(chalk.bold('Sample Analytics Format:'))
          // Convert to SDK format for formatting
          const sdkFormatAnalytics = {
            totalJobs: fallbackAnalytics.totalJobs,
            completedJobs: fallbackAnalytics.jobsCompleted,
            averageRating: fallbackAnalytics.averageRating,
            totalEarnings: BigInt(fallbackAnalytics.totalEarnings),
            responseTime: 0,
            successRate: fallbackAnalytics.successRate,
            activeJobs: 0,
            failedJobs: 0,
            disputes: 0,
            disputesWon: 0
          }
          
          formatAnalytics(sdkFormatAnalytics).forEach(line => {
            console.log(chalk.gray('  ' + line))
          })
          console.log('')
          console.log(chalk.bold('What you can do instead:'))
          console.log(chalk.cyan('• gs agent status') + chalk.gray(' - View basic agent information'))
          console.log(chalk.cyan('• gs agent list') + chalk.gray(' - See all registered agents'))
          console.log(chalk.cyan('• gs marketplace list') + chalk.gray(' - Browse marketplace activity'))
          console.log('')
          console.log(chalk.gray('Analytics will be available in a future SDK update.'))
          
          outro('Analytics feature coming soon')
          return
        }

        s.stop('✅ Analytics loaded')

        // Display analytics dashboard
        log.info(`\n${chalk.bold('📈 Performance Overview:')}`)
        log.info('─'.repeat(30))
        
        if (options.agent || options.mine) {
          // Individual agent or user analytics
          log.info(
            `${chalk.gray('Active Agents:')} ${analytics.activeAgents}\n` +
            `${chalk.gray('Total Jobs Completed:')} ${analytics.totalJobs}\n` +
            `${chalk.gray('Success Rate:')} ${(analytics.successRate * 100).toFixed(1)}%\n` +
            `${chalk.gray('Average Rating:')} ${analytics.averageRating.toFixed(1)} ⭐\n` +
            `${chalk.gray('Total Earnings:')} ${(Number(analytics.totalEarnings) / 1_000_000_000).toFixed(3)} SOL\n`
          )

          if (Object.keys(analytics.jobsByCategory).length > 0) {
            log.info(`\n${chalk.bold('📋 Jobs by Category:')}`)
            Object.entries(analytics.jobsByCategory).forEach(([category, count]) => {
              log.info(`   ${chalk.gray(category + ':')} ${count}`)
            })
          }

          if (analytics.earningsTrend.length > 0) {
            log.info(`\n${chalk.bold('💰 Earnings Trend:')}`)
            analytics.earningsTrend.forEach((point) => {
              const date = new Date(Number(point.timestamp) * 1000).toLocaleDateString()
              const earningsSOL = (Number(point.earnings) / 1_000_000_000).toFixed(3)
              log.info(`   ${chalk.gray(date + ':')} ${earningsSOL} SOL`)
            })
          }

          if (analytics.topClients.length > 0) {
            log.info(`\n${chalk.bold('👥 Top Clients:')}`)
            analytics.topClients.slice(0, 5).forEach((client: { address: string; jobCount: number; totalSpent: bigint }, index: number) => {
              log.info(
                `   ${index + 1}. ${client.address}\n` +
                `      ${chalk.gray('Jobs:')} ${client.jobCount} | ${chalk.gray('Spent:')} ${(Number(client.totalSpent) / 1_000_000_000).toFixed(3)} SOL`
              )
            })
          }

        } else {
          // Marketplace-wide analytics
          log.info(
            `${chalk.gray('Total Agents:')} ${analytics.totalAgents}\n` +
            `${chalk.gray('Verified Agents:')} ${analytics.verifiedAgents} (${((analytics.verifiedAgents / analytics.totalAgents) * 100).toFixed(1)}%)\n` +
            `${chalk.gray('Active Agents:')} ${analytics.activeAgents}\n` +
            `${chalk.gray('Total Jobs:')} ${analytics.totalJobs}\n` +
            `${chalk.gray('Marketplace Volume:')} ${(Number(analytics.totalVolume) / 1_000_000_000).toFixed(3)} SOL\n`
          )

          if (analytics.topCategories.length > 0) {
            log.info(`\n${chalk.bold('🏆 Popular Categories:')}`)
            analytics.topCategories.slice(0, 5).forEach((category: { name: string; agentCount: number }, index: number) => {
              log.info(`   ${index + 1}. ${category.name} (${category.agentCount} agents)`)
            })
          }

          if (analytics.topPerformers.length > 0) {
            log.info(`\n${chalk.bold('⭐ Top Performing Agents:')}`)
            analytics.topPerformers.slice(0, 5).forEach((agent: { name: string; address: string; successRate: number; totalEarnings: bigint }, index: number) => {
              log.info(
                `   ${index + 1}. ${agent.name}\n` +
                `      ${chalk.gray('Success Rate:')} ${agent.successRate}% | ${chalk.gray('Earnings:')} ${Number(agent.totalEarnings) / 1_000_000} SOL`
              )
            })
          }

          // Growth metrics always exist
          log.info(`\n${chalk.bold('📈 Growth Metrics:')}`)
          log.info(
            `   ${chalk.gray('Weekly Growth:')} ${analytics.growthMetrics.weeklyGrowth > 0 ? '+' : ''}${analytics.growthMetrics.weeklyGrowth}%\n` +
            `   ${chalk.gray('Monthly Growth:')} ${analytics.growthMetrics.monthlyGrowth > 0 ? '+' : ''}${analytics.growthMetrics.monthlyGrowth}%\n` +
            `   ${chalk.gray('User Growth:')} ${analytics.growthMetrics.userGrowth > 0 ? '+' : ''}${analytics.growthMetrics.userGrowth}%\n` +
            `   ${chalk.gray('Revenue Growth:')} ${analytics.growthMetrics.revenueGrowth > 0 ? '+' : ''}${analytics.growthMetrics.revenueGrowth}%`
          )
        }

        // Performance insights
        if (analytics.insights.length > 0) {
          log.info(`\n${chalk.bold('💡 Performance Insights:')}`)
          analytics.insights.forEach((insight: string) => {
            log.info(`   💡 ${insight}`)
          })
        }

        outro(
          `${chalk.yellow('💡 Analytics Tips:')}\n` +
          `• Monitor success rates and ratings regularly\n` +
          `• Focus on high-demand capability categories\n` +
          `• Engage with top clients for repeat business\n\n` +
          `${chalk.cyan('npx ghostspeak agent analytics --mine')} - View your agent analytics`
        )
        
      } catch (_error) {
        log.error(`Failed to load analytics: ${error instanceof Error ? _error.message : 'Unknown error'}`)
      }
    })
}