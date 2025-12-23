/**
 * Version check utility - checks if CLI is outdated on startup
 */
import { exec } from 'child_process'
import { promisify } from 'util'
import chalk from 'chalk'

const execAsync = promisify(exec)

// Cache file to avoid checking every run
const VERSION_CHECK_INTERVAL = 4 * 60 * 60 * 1000 // 4 hours in ms

interface VersionCache {
  lastCheck: number
  latestVersion: string | null
  notifiedVersion: string | null
}

const versionCache: VersionCache = {
  lastCheck: 0,
  latestVersion: null,
  notifiedVersion: null
}

/**
 * Compare two semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  // Remove beta/alpha suffixes for comparison
  const clean1 = v1.replace(/-.*$/, '')
  const clean2 = v2.replace(/-.*$/, '')
  
  const parts1 = clean1.split('.').map(Number)
  const parts2 = clean2.split('.').map(Number)
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] ?? 0
    const part2 = parts2[i] ?? 0
    
    if (part1 > part2) return 1
    if (part1 < part2) return -1
  }
  
  return 0
}

/**
 * Check if a newer version is available and notify user
 * This runs asynchronously in the background to not slow down CLI startup
 */
export async function checkForUpdates(currentVersion: string): Promise<void> {
  try {
    const now = Date.now()
    
    // Skip if checked recently
    if (now - versionCache.lastCheck < VERSION_CHECK_INTERVAL && versionCache.latestVersion) {
      // Use cached version
      if (versionCache.latestVersion && versionCache.notifiedVersion !== versionCache.latestVersion) {
        showUpdateNotification(currentVersion, versionCache.latestVersion)
      }
      return
    }
    
    // Check npm for latest version (with timeout)
    const { stdout } = await execAsync('npm view @ghostspeak/cli version', { timeout: 5000 })
    const latestVersion = stdout.trim()
    
    // Update cache
    versionCache.lastCheck = now
    versionCache.latestVersion = latestVersion
    
    // Compare versions
    if (compareVersions(latestVersion, currentVersion) > 0) {
      showUpdateNotification(currentVersion, latestVersion)
      versionCache.notifiedVersion = latestVersion
    }
  } catch {
    // Silently fail - don't interrupt CLI for version check failures
  }
}

/**
 * Show update notification to user
 */
function showUpdateNotification(currentVersion: string, latestVersion: string): void {
  console.log('')
  console.log(chalk.yellow('╭─────────────────────────────────────────────────────────────╮'))
  console.log(chalk.yellow('│') + chalk.bold.yellow('  🔔 Update available! ') + chalk.gray(`${currentVersion} → `) + chalk.green.bold(latestVersion) + chalk.yellow('                  │'))
  console.log(chalk.yellow('│') + chalk.gray('  Run ') + chalk.cyan('ghostspeak update') + chalk.gray(' or ') + chalk.cyan('ghost update') + chalk.gray(' to upgrade') + chalk.yellow('       │'))
  console.log(chalk.yellow('╰─────────────────────────────────────────────────────────────╯'))
  console.log('')
}

/**
 * Start async version check (non-blocking)
 */
export function startVersionCheck(currentVersion: string): void {
  // Run in background, don't await
  checkForUpdates(currentVersion).catch(() => {
    // Silently ignore - version check is best-effort
  })
}
