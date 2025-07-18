import { Command } from 'commander'
import { intro, outro, spinner, confirm, note } from '@clack/prompts'
import pc from 'picocolors'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const execAsync = promisify(exec)

export const sdkCommand = new Command('sdk')
  .description('Manage GhostSpeak SDK installation')

sdkCommand
  .command('install')
  .description('Install the GhostSpeak SDK')
  .option('-g, --global', 'Install globally', false)
  .option('-v, --version <version>', 'Specific version to install')
  .option('-D, --dev', 'Save as dev dependency', false)
  .action(async (options) => {
        try {
          intro(pc.cyan('🛠️  GhostSpeak SDK Installer'))

          // Check if we're in a Node.js project
          const hasPackageJson = existsSync(join(process.cwd(), 'package.json'))
          
          if (!options.global && !hasPackageJson) {
            const shouldInit = await confirm({
              message: 'No package.json found. Initialize a new project?',
              initialValue: true
            })

            if (shouldInit) {
              const s = spinner()
              s.start('Initializing new project')
              
              try {
                await execAsync('npm init -y')
                s.stop('Project initialized')
              } catch (error) {
                s.stop('Failed to initialize project')
                throw error
              }
            } else {
              outro(pc.yellow('⚠️  Cancelled SDK installation'))
              return
            }
          }

          // Determine package manager
          const packageManager = await detectPackageManager()
          
          // Build install command
          const packageName = '@ghostspeak/sdk'
          const version = options.version || 'latest'
          const versionString = version === 'latest' ? '' : `@${version}`
          
          let installCmd: string
          if (options.global) {
            installCmd = `${packageManager} ${packageManager === 'yarn' ? 'global add' : 'install -g'} ${packageName}${versionString}`
          } else {
            const saveFlag = options.dev ? (packageManager === 'yarn' ? '--dev' : '--save-dev') : ''
            installCmd = `${packageManager} ${packageManager === 'yarn' ? 'add' : 'install'} ${saveFlag} ${packageName}${versionString}`
          }

          const s = spinner()
          s.start(`Installing ${packageName}${versionString}`)

          try {
            const { stdout, stderr } = await execAsync(installCmd)
            s.stop(`Successfully installed ${packageName}`)

            // Show post-installation message
            if (!options.global) {
              note(
                `Import the SDK in your code:

${pc.cyan("import { GhostSpeakClient } from '@ghostspeak/sdk'")}

Example usage:
${pc.gray(`
const client = new GhostSpeakClient(connection, signer)
const agents = await client.agent.listAgents()
`)}`,
                'Quick Start'
              )
            }

            outro(pc.green('✅ SDK installed successfully!'))
          } catch (error: any) {
            s.stop('Failed to install SDK')
            console.error(pc.red(`\nError: ${error.message}`))
            outro(pc.red('❌ SDK installation failed'))
            process.exit(1)
          }
        } catch (error: any) {
          console.error(pc.red(`\nError: ${error.message}`))
          outro(pc.red('❌ SDK installation failed'))
          process.exit(1)
        }
      })

sdkCommand
  .command('info')
  .description('Show SDK information and installation status')
  .action(async () => {
        intro(pc.cyan('📦 GhostSpeak SDK Information'))

        try {
          // Check if SDK is installed locally
          const localPath = join(process.cwd(), 'node_modules', '@ghostspeak', 'sdk', 'package.json')
          const hasLocal = existsSync(localPath)

          if (hasLocal) {
            const packageJson = JSON.parse(readFileSync(localPath, 'utf-8'))
            console.log(pc.green('\n✓ SDK installed locally'))
            console.log(pc.gray(`  Version: ${packageJson.version}`))
            console.log(pc.gray(`  Path: ${join(process.cwd(), 'node_modules', '@ghostspeak', 'sdk')}`))
          } else {
            console.log(pc.yellow('\n✗ SDK not installed locally'))
          }

          // Check global installation
          try {
            const { stdout } = await execAsync('npm list -g @ghostspeak/sdk --depth=0')
            if (stdout.includes('@ghostspeak/sdk')) {
              console.log(pc.green('\n✓ SDK installed globally'))
              const versionMatch = /@ghostspeak\/sdk@(\S+)/.exec(stdout)
              if (versionMatch) {
                console.log(pc.gray(`  Version: ${versionMatch[1]}`))
              }
            }
          } catch {
            console.log(pc.yellow('\n✗ SDK not installed globally'))
          }

          // Show latest version
          try {
            const { stdout } = await execAsync('npm view @ghostspeak/sdk version')
            console.log(pc.cyan(`\n📦 Latest version: ${stdout.trim()}`))
          } catch {
            console.log(pc.gray('\n⚠️  Could not fetch latest version'))
          }

          // Installation instructions
          if (!hasLocal) {
            console.log(pc.gray('\nTo install the SDK:'))
            console.log(pc.cyan('  npx ghostspeak sdk install'))
            console.log(pc.cyan('  npx ghostspeak sdk install --global'))
          }

          outro(pc.green('✅ SDK info complete'))
        } catch (error: any) {
          console.error(pc.red(`\nError: ${error.message}`))
          outro(pc.red('❌ Failed to get SDK info'))
          process.exit(1)
        }
      })

async function detectPackageManager(): Promise<string> {
  // Check for lock files
  if (existsSync(join(process.cwd(), 'bun.lockb'))) return 'bun'
  if (existsSync(join(process.cwd(), 'yarn.lock'))) return 'yarn'
  if (existsSync(join(process.cwd(), 'pnpm-lock.yaml'))) return 'pnpm'
  
  // Default to npm
  return 'npm'
}