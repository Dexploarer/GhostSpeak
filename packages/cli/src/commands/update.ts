import { Command } from 'commander'
import { intro, outro, spinner, confirm, isCancel, cancel } from '@clack/prompts'
import chalk from 'chalk'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const updateCommand = new Command('update')
  .description('Update GhostSpeak CLI to the latest version')
  .option('-f, --force', 'Force update without confirmation')
  .action(async (options: { force?: boolean }) => {
    intro(chalk.cyan('🔄 GhostSpeak CLI Updater'))

    try {
      const s = spinner()
      s.start('Checking current version...')
      
      // Get current version - foolproof approach
      let currentVersion = '1.12.0' // Fallback version
      
      // First, try to get version from the program itself
      const programVersion = updateCommand.parent?.version()
      if (programVersion && /^\d+\.\d+\.\d+/.test(programVersion)) {
        currentVersion = programVersion
      }
      
      // Method 1: Try reading from package.json first (most reliable)
      try {
        const { readFileSync } = await import('fs')
        const { fileURLToPath } = await import('url')
        const { dirname, join } = await import('path')
        
        const __filename = fileURLToPath(import.meta.url)
        const __dirname = dirname(__filename)
        
        // Try multiple possible package.json locations
        const possiblePaths = [
          join(__dirname, '../../package.json'),
          join(__dirname, '../../../package.json'),
          join(__dirname, '../../../../cli/package.json'),
          '/Users/michelleeidschun/.bun/install/global/node_modules/@ghostspeak/cli/package.json'
        ]
        
        for (const path of possiblePaths) {
          try {
            const pkg = JSON.parse(readFileSync(path, 'utf-8')) as { name?: string; version?: string }
            if (pkg.name === '@ghostspeak/cli' && pkg.version) {
              currentVersion = pkg.version
              break
            }
          } catch {
            // Try next path
          }
        }
      } catch {
        // If reading package.json fails, we'll try other methods
      }
      
      // Method 2: Try running the CLI with --version flag as backup
      if (currentVersion === '1.12.0') {
        try {
          // Try different command names that might be available
          const commands = [
            'ghostspeak --version',
            'ghost --version'
          ]
          
          for (const cmd of commands) {
            try {
              const { stdout } = await execAsync(cmd, { timeout: 5000 }) // 5 second timeout
              // Look for version after "CLI v" pattern to avoid catching other versions
              const versionMatch = /CLI v(\d+\.\d+\.\d+)/.exec(stdout)
              if (versionMatch) {
                currentVersion = versionMatch[1]
                break
              }
            } catch {
              // Try next command
            }
          }
        } catch {
          // If all methods fail, we'll use the fallback version
        }
      }
      
      // Method 3: If other methods failed, try npm list as a backup
      if (currentVersion === '1.12.0') {
        try {
          const { stdout } = await execAsync('npm list -g @ghostspeak/cli --depth=0 2>/dev/null || npm list @ghostspeak/cli --depth=0 2>/dev/null')
          const match = /@ghostspeak\/cli@(\S+)/.exec(stdout)
          if (match) {
            currentVersion = match[1]
          }
        } catch {
          // Still use fallback version
        }
      }
      
      s.message('Checking latest version...')
      
      // Check latest version on npm
      const { stdout: latestVersion } = await execAsync('npm view @ghostspeak/cli version')
      const latest = latestVersion.trim()
      
      s.stop('✅ Version check complete')
      
      console.log('')
      console.log(chalk.gray('Current version:'), chalk.yellow(`v${currentVersion}`))
      console.log(chalk.gray('Latest version:'), chalk.green(`v${latest}`))
      console.log('')
      
      // Compare versions
      if (currentVersion === latest) {
        console.log(chalk.green('✅ You are already using the latest version!'))
        outro('No update needed')
        return
      }
      
      // Check if newer version available
      const isNewer = compareVersions(latest, currentVersion) > 0
      
      if (!isNewer) {
        console.log(chalk.yellow('⚠️  You are using a newer version than the latest published version'))
        outro('No update needed')
        return
      }
      
      // Show changelog if available
      console.log(chalk.bold('📋 Update available!'))
      console.log(chalk.gray(`Version ${latest} is now available`))
      console.log('')
      
      // Confirm update
      let shouldUpdate = options.force
      if (!shouldUpdate) {
        const confirmResult = await confirm({
          message: 'Would you like to update now?',
          initialValue: true
        })
        
        if (isCancel(confirmResult)) {
          cancel('Update cancelled')
          return
        }
        
        shouldUpdate = confirmResult
      }
      
      if (!shouldUpdate) {
        outro('Update cancelled')
        return
      }
      
      // Determine best update method
      const updateSpinner = spinner()
      updateSpinner.start('Determining best update method...')
      
      // Check if globally installed
      let isGlobal = false
      let updateCmd = ''
      
      try {
        const { stdout } = await execAsync('npm list -g @ghostspeak/cli --depth=0')
        if (stdout.includes('@ghostspeak/cli')) {
          isGlobal = true
          // Acknowledge isGlobal for future use
          void isGlobal
          updateCmd = 'npm install -g @ghostspeak/cli@latest'
        }
      } catch {
        // Not globally installed via npm
      }
      
      // If not found globally, check other methods
      if (!updateCmd) {
        // Check if running via npx
        try {
          const { stdout } = await execAsync('which ghostspeak')
          if (stdout.includes('npx') || stdout.includes('.npm')) {
            updateCmd = 'npm install -g @ghostspeak/cli@latest'
            console.log(chalk.yellow('\n⚠️  Detected npx installation. Installing globally for better performance...'))
          } else {
            // Default to global install if we can't determine
            updateCmd = 'npm install -g @ghostspeak/cli@latest'
          }
        } catch {
          // Default to global install
          updateCmd = 'npm install -g @ghostspeak/cli@latest'
        }
      }
      
      updateSpinner.message('Updating GhostSpeak CLI...')
      
      try {
        // Use install instead of update for more reliable results
        // Use spawn to allow interactivity and showing output
        const { spawn } = await import('child_process')
        
        await new Promise<void>((resolve, reject) => {
          // split command into cmd and args
          const parts = updateCmd.split(' ')
          const cmd = parts[0]
          const arghost = parts.slice(1)
          
          const child = spawn(cmd, args, {
            stdio: 'inherit',
            shell: true
          })
          
          child.on('close', (code) => {
            if (code === 0) resolve()
            else reject(new Error(`Command failed with code ${code}`))
          })
          
          child.on('error', (err) => reject(err))
        })
        
        updateSpinner.stop('✅ Update successful!')
        
        console.log('')
        console.log(chalk.green('🎉 GhostSpeak CLI has been updated!'))
        console.log(chalk.gray(`Updated from v${currentVersion} to v${latest}`))
        console.log('')
        
        // Verify the update by checking version again
        try {
          const { stdout } = await execAsync('ghostspeak --version')
          const newVersion = (/(\d+\.\d+\.\d+)/.exec(stdout.trim()))?.[1]
          if (newVersion && newVersion === latest) {
            console.log(chalk.green('✅ Version verified:'), chalk.bold(`v${newVersion}`))
          }
        } catch {
          // Version check failed, but update likely succeeded
        }
        
        console.log('')
        console.log(chalk.cyan('What\'s new:'))
        console.log(chalk.gray('• Bug fixes and improvements'))
        console.log(chalk.gray('• Enhanced performance'))
        console.log(chalk.gray('• Updated dependencies'))
        console.log('')
        console.log(chalk.yellow('💡 Tip: Run "ghostspeak --help" or "ghost --help" to see all available commands'))
        
        outro('Update completed successfully')
      } catch (error) {
        updateSpinner.stop('❌ Update failed')
        
        console.error('')
        console.error(chalk.red('Failed to update CLI:'), error instanceof Error ? error.message : 'Unknown error')
        console.error('')
        console.error(chalk.yellow('Try updating manually with one of these commands:'))
        console.error(chalk.gray('  npm install -g @ghostspeak/cli@latest'))
        console.error(chalk.gray('  sudo npm install -g @ghostspeak/cli@latest') + chalk.dim(' (if permission denied)'))
        console.error('')
        console.error(chalk.dim('Or if you prefer using npx:'))
        console.error(chalk.gray('  npx @ghostspeak/cli@latest'))
        
        outro('Update failed')
        process.exit(1)
      }
      
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error')
      outro('Update check failed')
      process.exit(1)
    }
  })

// Simple version comparison
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] ?? 0
    const part2 = parts2[i] ?? 0
    
    if (part1 > part2) return 1
    if (part1 < part2) return -1
  }
  
  return 0
}