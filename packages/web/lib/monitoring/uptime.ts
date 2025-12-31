import { createSolanaRpc } from '@solana/rpc'

export interface HealthCheckResult {
  healthy: boolean
  timestamp: string
  checks: {
    convex: { status: 'healthy' | 'unhealthy'; message?: string; latency?: number }
    solana: { status: 'healthy' | 'unhealthy'; message?: string; latency?: number }
    database: { status: 'healthy' | 'unhealthy'; message?: string; latency?: number }
    serverWallet: {
      status: 'healthy' | 'unhealthy'
      message?: string
      latency?: number
      balance?: number
    }
    crossmint: { status: 'healthy' | 'unhealthy'; message?: string; latency?: number }
    payai: { status: 'healthy' | 'unhealthy'; message?: string; latency?: number }
  }
  version: string
  environment: string
}

/**
 * Health check for Convex connection
 */
async function checkConvex(): Promise<{
  status: 'healthy' | 'unhealthy'
  message?: string
  latency?: number
}> {
  try {
    const startTime = Date.now()

    // Check if Convex URL is configured
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return {
        status: 'unhealthy',
        message: 'Convex URL not configured',
      }
    }

    // Basic connectivity check - try to fetch from Convex API
    const response = await fetch(process.env.NEXT_PUBLIC_CONVEX_URL, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    const latency = Date.now() - startTime

    if (response.ok || response.status === 405) {
      // 405 is OK - it means the endpoint exists but doesn't accept HEAD
      return {
        status: 'healthy',
        latency,
      }
    }

    return {
      status: 'unhealthy',
      message: `HTTP ${response.status}`,
      latency,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Health check for Solana RPC connection
 */
async function checkSolana(): Promise<{
  status: 'healthy' | 'unhealthy'
  message?: string
  latency?: number
}> {
  try {
    const startTime = Date.now()

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'

    const rpc = createSolanaRpc(rpcUrl)

    // Try to get the latest blockhash
    await rpc.getLatestBlockhash().send()

    const latency = Date.now() - startTime

    return {
      status: 'healthy',
      latency,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Health check for database (Convex handles this, so we check Convex health)
 */
async function checkDatabase(): Promise<{
  status: 'healthy' | 'unhealthy'
  message?: string
  latency?: number
}> {
  // Since we're using Convex as our database, we can reuse the Convex check
  // or add specific database queries if needed
  return checkConvex()
}

/**
 * Health check for server wallet balance
 */
async function checkServerWallet(): Promise<{
  status: 'healthy' | 'unhealthy'
  message?: string
  latency?: number
  balance?: number
}> {
  try {
    const startTime = Date.now()

    // Dynamically import to avoid edge runtime issues
    const { getWalletInfo, isServerWalletConfigured } = await import('@/lib/server-wallet')

    if (!isServerWalletConfigured()) {
      return {
        status: 'unhealthy',
        message: 'Server wallet not configured',
      }
    }

    const walletInfo = await getWalletInfo()
    const latency = Date.now() - startTime

    // Warn if balance < 0.1 SOL
    if (walletInfo.balanceSol < 0.1) {
      return {
        status: 'unhealthy',
        message: `Low balance: ${walletInfo.balanceSol.toFixed(4)} SOL`,
        latency,
        balance: walletInfo.balanceSol,
      }
    }

    return {
      status: 'healthy',
      message: `${walletInfo.balanceSol.toFixed(4)} SOL`,
      latency,
      balance: walletInfo.balanceSol,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Wallet check failed',
    }
  }
}

/**
 * Health check for Crossmint API
 */
async function checkCrossmint(): Promise<{
  status: 'healthy' | 'unhealthy'
  message?: string
  latency?: number
}> {
  try {
    const startTime = Date.now()

    if (!process.env.CROSSMINT_SECRET_KEY) {
      return {
        status: 'unhealthy',
        message: 'Crossmint not configured',
      }
    }

    const crossmintUrl = process.env.CROSSMINT_API_URL || 'https://staging.crossmint.com'
    const response = await fetch(`${crossmintUrl}/api/2024-09-26/credentials`, {
      method: 'GET',
      headers: {
        'X-API-KEY': process.env.CROSSMINT_SECRET_KEY,
      },
      signal: AbortSignal.timeout(5000),
    })

    const latency = Date.now() - startTime

    if (!response.ok) {
      return {
        status: 'unhealthy',
        message: `HTTP ${response.status}`,
        latency,
      }
    }

    return {
      status: 'healthy',
      latency,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Crossmint check failed',
    }
  }
}

/**
 * Health check for PayAI webhook endpoint
 */
async function checkPayAI(): Promise<{
  status: 'healthy' | 'unhealthy'
  message?: string
  latency?: number
}> {
  try {
    const startTime = Date.now()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/payai/webhook`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })

    const latency = Date.now() - startTime

    if (!response.ok) {
      return {
        status: 'unhealthy',
        message: `HTTP ${response.status}`,
        latency,
      }
    }

    return {
      status: 'healthy',
      latency,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'PayAI check failed',
    }
  }
}

/**
 * Run all health checks
 */
export async function runHealthChecks(): Promise<HealthCheckResult> {
  const [convexHealth, solanaHealth, databaseHealth, walletHealth, crossmintHealth, payaiHealth] =
    await Promise.all([
      checkConvex(),
      checkSolana(),
      checkDatabase(),
      checkServerWallet(),
      checkCrossmint(),
      checkPayAI(),
    ])

  const allHealthy =
    convexHealth.status === 'healthy' &&
    solanaHealth.status === 'healthy' &&
    databaseHealth.status === 'healthy' &&
    walletHealth.status === 'healthy' &&
    crossmintHealth.status === 'healthy' &&
    payaiHealth.status === 'healthy'

  return {
    healthy: allHealthy,
    timestamp: new Date().toISOString(),
    checks: {
      convex: convexHealth,
      solana: solanaHealth,
      database: databaseHealth,
      serverWallet: walletHealth,
      crossmint: crossmintHealth,
      payai: payaiHealth,
    },
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.5.0',
    environment: process.env.NODE_ENV || 'development',
  }
}

/**
 * Simple uptime tracker
 */
export class UptimeMonitor {
  private startTime: number
  private checks: HealthCheckResult[] = []
  private maxChecks = 100 // Keep last 100 checks

  constructor() {
    this.startTime = Date.now()
  }

  getUptime(): number {
    return Date.now() - this.startTime
  }

  getUptimeFormatted(): string {
    const uptime = this.getUptime()
    const seconds = Math.floor(uptime / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  async recordCheck(): Promise<HealthCheckResult> {
    const result = await runHealthChecks()
    this.checks.push(result)

    // Keep only the last N checks
    if (this.checks.length > this.maxChecks) {
      this.checks.shift()
    }

    return result
  }

  getRecentChecks(count = 10): HealthCheckResult[] {
    return this.checks.slice(-count)
  }

  getSuccessRate(): number {
    if (this.checks.length === 0) return 100

    const healthyChecks = this.checks.filter((check) => check.healthy).length
    return (healthyChecks / this.checks.length) * 100
  }

  getAverageLatency(): {
    convex: number
    solana: number
    database: number
    serverWallet: number
    crossmint: number
    payai: number
  } {
    if (this.checks.length === 0) {
      return { convex: 0, solana: 0, database: 0, serverWallet: 0, crossmint: 0, payai: 0 }
    }

    const sum = this.checks.reduce(
      (acc, check) => ({
        convex: acc.convex + (check.checks.convex.latency || 0),
        solana: acc.solana + (check.checks.solana.latency || 0),
        database: acc.database + (check.checks.database.latency || 0),
        serverWallet: acc.serverWallet + (check.checks.serverWallet.latency || 0),
        crossmint: acc.crossmint + (check.checks.crossmint.latency || 0),
        payai: acc.payai + (check.checks.payai.latency || 0),
      }),
      { convex: 0, solana: 0, database: 0, serverWallet: 0, crossmint: 0, payai: 0 }
    )

    return {
      convex: Math.round(sum.convex / this.checks.length),
      solana: Math.round(sum.solana / this.checks.length),
      database: Math.round(sum.database / this.checks.length),
      serverWallet: Math.round(sum.serverWallet / this.checks.length),
      crossmint: Math.round(sum.crossmint / this.checks.length),
      payai: Math.round(sum.payai / this.checks.length),
    }
  }
}

// Export singleton instance
export const uptimeMonitor = new UptimeMonitor()
