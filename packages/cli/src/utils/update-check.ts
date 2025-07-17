import chalk from 'chalk'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const execAsync = promisify(exec)

interface UpdateCheckCache {
  lastCheck: number
  latestVersion: string
  currentVersion: string
}

const CACHE_FILE = join(homedir(), '.ghostspeak', 'update-check.json')
const CHECK_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours

export async function checkForUpdates(currentVersion: string): Promise<void> {
  try {
    // Check if we should skip update check
    if (process.env.GHOSTSPEAK_SKIP_UPDATE_CHECK === '1') {
      return
    }

    // Check cache to avoid too frequent checks
    if (existsSync(CACHE_FILE)) {
      try {
        const cache: UpdateCheckCache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'))
        const timeSinceLastCheck = Date.now() - cache.lastCheck
        
        if (timeSinceLastCheck < CHECK_INTERVAL) {
          // Use cached result if recent
          if (cache.latestVersion && cache.latestVersion !== currentVersion && compareVersions(cache.latestVersion, currentVersion) > 0) {
            showUpdateNotification(currentVersion, cache.latestVersion)
          }
          return
        }
      } catch {
        // Ignore cache errors
      }
    }

    // Check latest version in background
    execAsync('npm view @ghostspeak/cli version')
      .then(({ stdout }) => {
        const latestVersion = stdout.trim()
        
        // Update cache
        const cache: UpdateCheckCache = {
          lastCheck: Date.now(),
          latestVersion,
          currentVersion
        }
        
        // Ensure directory exists
        const cacheDir = join(homedir(), '.ghostspeak')
        if (!existsSync(cacheDir)) {
          require('fs').mkdirSync(cacheDir, { recursive: true })
        }
        
        writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
        
        // Show notification if update available
        if (latestVersion !== currentVersion && compareVersions(latestVersion, currentVersion) > 0) {
          showUpdateNotification(currentVersion, latestVersion)
        }
      })
      .catch(() => {
        // Silently ignore errors
      })
  } catch {
    // Silently ignore all errors
  }
}

function showUpdateNotification(currentVersion: string, latestVersion: string): void {
  console.log('')
  console.log(chalk.yellow('╭─────────────────────────────────────────────────────╮'))
  console.log(chalk.yellow('│') + chalk.bold('  🔄 Update Available!                               ') + chalk.yellow('│'))
  console.log(chalk.yellow('│') + chalk.gray(`  Current: v${currentVersion}`) + ' '.repeat(41 - currentVersion.length) + chalk.yellow('│'))
  console.log(chalk.yellow('│') + chalk.green(`  Latest:  v${latestVersion}`) + ' '.repeat(41 - latestVersion.length) + chalk.yellow('│'))
  console.log(chalk.yellow('│') + ' '.repeat(53) + chalk.yellow('│'))
  console.log(chalk.yellow('│') + chalk.cyan('  Run ') + chalk.bold.cyan('gs update') + chalk.cyan(' to update automatically') + ' '.repeat(14) + chalk.yellow('│'))
  console.log(chalk.yellow('╰─────────────────────────────────────────────────────╯'))
  console.log('')
}

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0
    const part2 = parts2[i] || 0
    
    if (part1 > part2) return 1
    if (part1 < part2) return -1
  }
  
  return 0
}