/**
 * Shell Completion Commands - Autocompletion Support
 *
 * Provides shell autocompletion for bash, zsh, and fish shells.
 */

import chalk from 'chalk';
import { Logger } from '../core/Logger.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface CompletionOptions {
  shell?: 'bash' | 'zsh' | 'fish';
  install?: boolean;
  output?: string;
}

/**
 * Generate and optionally install shell completion scripts
 */
export async function generateCompletion(options: CompletionOptions = {}): Promise<void> {
  const cliLogger = new Logger(false);

  try {
    cliLogger.general.info(chalk.cyan('🔧 Shell Completion Generator'));
    cliLogger.general.info(chalk.gray('─'.repeat(50)));

    const shell = options.shell || detectShell();
    cliLogger.general.info(`Target Shell: ${chalk.cyan(shell)}`);

    const completionScript = generateCompletionScript(shell);
    
    if (options.install) {
      await installCompletion(shell, completionScript, cliLogger);
    } else if (options.output) {
      writeFileSync(options.output, completionScript);
      cliLogger.general.info(chalk.green(`✅ Completion script saved to: ${options.output}`));
    } else {
      cliLogger.general.info(chalk.yellow('Generated completion script:'));
      cliLogger.general.info(chalk.gray('─'.repeat(40)));
      cliLogger.general.info(completionScript);
    }

    showInstallationInstructions(shell, cliLogger);

  } catch (error) {
    cliLogger.error('Completion generation failed:', error);
    throw error;
  }
}

function detectShell(): 'bash' | 'zsh' | 'fish' {
  const shell = process.env.SHELL || '';
  
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('fish')) return 'fish';
  return 'bash'; // default
}

function generateCompletionScript(shell: 'bash' | 'zsh' | 'fish'): string {
  switch (shell) {
    case 'bash':
      return generateBashCompletion();
    case 'zsh':
      return generateZshCompletion();
    case 'fish':
      return generateFishCompletion();
    default:
      throw new Error(`Unsupported shell: ${shell}`);
  }
}

function generateBashCompletion(): string {
  return `#!/bin/bash

# GhostSpeak CLI Bash Completion

_ghostspeak_completion() {
    local cur prev opts
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    # Main commands
    local commands="status config agent marketplace channel message escrow analytics compression token mev dev admin quickstart wizard help"
    
    # Agent subcommands
    local agent_commands="register list"
    
    # Marketplace subcommands
    local marketplace_commands="list"
    
    # Channel subcommands
    local channel_commands="create list"
    
    # Message subcommands
    local message_commands="send list"
    
    # Escrow subcommands
    local escrow_commands="deposit"
    
    # Analytics subcommands
    local analytics_commands="dashboard"
    
    # Compression subcommands
    local compression_commands="status"
    
    # Token subcommands
    local token_commands="transfer"
    
    # MEV subcommands
    local mev_commands="status"
    
    # Dev subcommands
    local dev_commands="keys debug deploy"
    
    # Admin subcommands
    local admin_commands="monitor backup"

    case "\${COMP_CWORD}" in
        1)
            COMPREPLY=( \$(compgen -W "\${commands}" -- "\${cur}") )
            return 0
            ;;
        2)
            case "\${prev}" in
                agent)
                    COMPREPLY=( \$(compgen -W "\${agent_commands}" -- "\${cur}") )
                    return 0
                    ;;
                marketplace)
                    COMPREPLY=( \$(compgen -W "\${marketplace_commands}" -- "\${cur}") )
                    return 0
                    ;;
                channel)
                    COMPREPLY=( \$(compgen -W "\${channel_commands}" -- "\${cur}") )
                    return 0
                    ;;
                message)
                    COMPREPLY=( \$(compgen -W "\${message_commands}" -- "\${cur}") )
                    return 0
                    ;;
                escrow)
                    COMPREPLY=( \$(compgen -W "\${escrow_commands}" -- "\${cur}") )
                    return 0
                    ;;
                analytics)
                    COMPREPLY=( \$(compgen -W "\${analytics_commands}" -- "\${cur}") )
                    return 0
                    ;;
                compression)
                    COMPREPLY=( \$(compgen -W "\${compression_commands}" -- "\${cur}") )
                    return 0
                    ;;
                token)
                    COMPREPLY=( \$(compgen -W "\${token_commands}" -- "\${cur}") )
                    return 0
                    ;;
                mev)
                    COMPREPLY=( \$(compgen -W "\${mev_commands}" -- "\${cur}") )
                    return 0
                    ;;
                dev)
                    COMPREPLY=( \$(compgen -W "\${dev_commands}" -- "\${cur}") )
                    return 0
                    ;;
                admin)
                    COMPREPLY=( \$(compgen -W "\${admin_commands}" -- "\${cur}") )
                    return 0
                    ;;
            esac
            ;;
    esac

    # Global options
    local global_opts="--help --version --verbose --quiet --no-color --config --network"
    COMPREPLY=( \$(compgen -W "\${global_opts}" -- "\${cur}") )
}

complete -F _ghostspeak_completion ghostspeak
complete -F _ghostspeak_completion gs
`;
}

function generateZshCompletion(): string {
  return `#compdef ghostspeak gs

# GhostSpeak CLI Zsh Completion

_ghostspeak() {
    local context state line
    typeset -A opt_args

    _arguments -C \\
        '(--help -h)'{--help,-h}'[Show help]' \\
        '(--version -v)'{--version,-v}'[Show version]' \\
        '--verbose[Enable verbose logging]' \\
        '--quiet[Suppress non-essential output]' \\
        '--no-color[Disable colored output]' \\
        '--config[Path to configuration file]:config file:_files' \\
        '--network[Solana network]:network:(devnet testnet mainnet-beta)' \\
        '1: :_ghostspeak_commands' \\
        '*:: :->args'

    case $state in
        args)
            case $words[1] in
                agent)
                    _arguments \\
                        '1: :_ghostspeak_agent_commands' \\
                        '*:: :->agent_args'
                    case $state in
                        agent_args)
                            case $words[1] in
                                register)
                                    _arguments \\
                                        '1:agent name:' \\
                                        '(--type -t)'{--type,-t}'[Agent type]:type:(general analytics productivity creative)' \\
                                        '(--description -d)'{--description,-d}'[Agent description]:'
                                    ;;
                            esac
                            ;;
                    esac
                    ;;
                channel)
                    _arguments \\
                        '1: :_ghostspeak_channel_commands' \\
                        '*:: :->channel_args'
                    case $state in
                        channel_args)
                            case $words[1] in
                                create)
                                    _arguments \\
                                        '1:channel name:' \\
                                        '(--description -d)'{--description,-d}'[Channel description]:' \\
                                        '(--private -p)'{--private,-p}'[Make channel private]' \\
                                        '(--max-participants -m)'{--max-participants,-m}'[Maximum participants]:count:' \\
                                        '(--encrypted -e)'{--encrypted,-e}'[Enable encryption]'
                                    ;;
                            esac
                            ;;
                    esac
                    ;;
                message)
                    _arguments \\
                        '1: :_ghostspeak_message_commands' \\
                        '*:: :->message_args'
                    case $state in
                        message_args)
                            case $words[1] in
                                send)
                                    _arguments \\
                                        '1:channel:' \\
                                        '2:content:' \\
                                        '(--type -t)'{--type,-t}'[Content type]:type:(text json binary)' \\
                                        '(--encrypted -e)'{--encrypted,-e}'[Encrypt message]' \\
                                        '(--reply-to -r)'{--reply-to,-r}'[Reply to message]:message_id:'
                                    ;;
                                list)
                                    _arguments \\
                                        '1:channel:' \\
                                        '(--limit -l)'{--limit,-l}'[Number of messages]:count:'
                                    ;;
                            esac
                            ;;
                    esac
                    ;;
            esac
            ;;
    esac
}

_ghostspeak_commands() {
    local commands
    commands=(
        'status:Show system status and health'
        'config:Manage CLI configuration'
        'agent:Manage AI agents'
        'marketplace:Access the agent marketplace'
        'channel:Manage communication channels'
        'message:Send and manage messages'
        'escrow:Manage escrow services'
        'analytics:View system analytics'
        'compression:Manage ZK compression'
        'token:SPL Token 2022 features'
        'mev:MEV protection tools'
        'dev:Developer utilities'
        'admin:Administrative tools'
        'quickstart:Quick setup guide'
        'wizard:Interactive setup wizard'
        'help:Show help information'
    )
    _describe 'commands' commands
}

_ghostspeak_agent_commands() {
    local commands
    commands=(
        'register:Register a new AI agent'
        'list:List registered agents'
    )
    _describe 'agent commands' commands
}

_ghostspeak_channel_commands() {
    local commands
    commands=(
        'create:Create a new communication channel'
        'list:List your channels'
    )
    _describe 'channel commands' commands
}

_ghostspeak_message_commands() {
    local commands
    commands=(
        'send:Send a message to a channel'
        'list:List messages in a channel'
    )
    _describe 'message commands' commands
}

_ghostspeak "$@"
`;
}

function generateFishCompletion(): string {
  return `# GhostSpeak CLI Fish Completion

# Main commands
complete -c ghostspeak -f
complete -c gs -f

# Global options
complete -c ghostspeak -l help -s h -d "Show help"
complete -c ghostspeak -l version -s v -d "Show version"
complete -c ghostspeak -l verbose -d "Enable verbose logging"
complete -c ghostspeak -l quiet -d "Suppress non-essential output"
complete -c ghostspeak -l no-color -d "Disable colored output"
complete -c ghostspeak -l config -d "Path to configuration file" -r
complete -c ghostspeak -l network -d "Solana network" -xa "devnet testnet mainnet-beta"

# Main commands
complete -c ghostspeak -n "__fish_use_subcommand" -xa "status" -d "Show system status and health"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "config" -d "Manage CLI configuration"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "agent" -d "Manage AI agents"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "marketplace" -d "Access the agent marketplace"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "channel" -d "Manage communication channels"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "message" -d "Send and manage messages"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "escrow" -d "Manage escrow services"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "analytics" -d "View system analytics"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "compression" -d "Manage ZK compression"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "token" -d "SPL Token 2022 features"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "mev" -d "MEV protection tools"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "dev" -d "Developer utilities"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "admin" -d "Administrative tools"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "quickstart" -d "Quick setup guide"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "wizard" -d "Interactive setup wizard"
complete -c ghostspeak -n "__fish_use_subcommand" -xa "help" -d "Show help information"

# Agent subcommands
complete -c ghostspeak -n "__fish_seen_subcommand_from agent" -xa "register" -d "Register a new AI agent"
complete -c ghostspeak -n "__fish_seen_subcommand_from agent" -xa "list" -d "List registered agents"

# Agent register options
complete -c ghostspeak -n "__fish_seen_subcommand_from agent; and __fish_seen_subcommand_from register" -l type -s t -d "Agent type" -xa "general analytics productivity creative"
complete -c ghostspeak -n "__fish_seen_subcommand_from agent; and __fish_seen_subcommand_from register" -l description -s d -d "Agent description"

# Channel subcommands
complete -c ghostspeak -n "__fish_seen_subcommand_from channel" -xa "create" -d "Create a new communication channel"
complete -c ghostspeak -n "__fish_seen_subcommand_from channel" -xa "list" -d "List your channels"

# Channel create options
complete -c ghostspeak -n "__fish_seen_subcommand_from channel; and __fish_seen_subcommand_from create" -l description -s d -d "Channel description"
complete -c ghostspeak -n "__fish_seen_subcommand_from channel; and __fish_seen_subcommand_from create" -l private -s p -d "Make channel private"
complete -c ghostspeak -n "__fish_seen_subcommand_from channel; and __fish_seen_subcommand_from create" -l max-participants -s m -d "Maximum participants"
complete -c ghostspeak -n "__fish_seen_subcommand_from channel; and __fish_seen_subcommand_from create" -l encrypted -s e -d "Enable encryption"

# Message subcommands
complete -c ghostspeak -n "__fish_seen_subcommand_from message" -xa "send" -d "Send a message to a channel"
complete -c ghostspeak -n "__fish_seen_subcommand_from message" -xa "list" -d "List messages in a channel"

# Message send options
complete -c ghostspeak -n "__fish_seen_subcommand_from message; and __fish_seen_subcommand_from send" -l type -s t -d "Content type" -xa "text json binary"
complete -c ghostspeak -n "__fish_seen_subcommand_from message; and __fish_seen_subcommand_from send" -l encrypted -s e -d "Encrypt message"
complete -c ghostspeak -n "__fish_seen_subcommand_from message; and __fish_seen_subcommand_from send" -l reply-to -s r -d "Reply to message"

# Copy completions for gs alias
complete -c gs -w ghostspeak
`;
}

async function installCompletion(shell: 'bash' | 'zsh' | 'fish', script: string, cliLogger: Logger): Promise<void> {
  const home = homedir();
  let installPath: string;
  let sourceCommand: string;

  switch (shell) {
    case 'bash':
      // Try bash_completion.d first, fallback to .bashrc
      const bashCompletionDir = '/usr/local/etc/bash_completion.d';
      const homeCompletionDir = join(home, '.bash_completion.d');
      
      if (existsSync('/usr/local/etc') && process.platform === 'darwin') {
        installPath = join(bashCompletionDir, 'ghostspeak');
      } else {
        if (!existsSync(homeCompletionDir)) {
          mkdirSync(homeCompletionDir, { recursive: true });
        }
        installPath = join(homeCompletionDir, 'ghostspeak');
      }
      sourceCommand = `source ${installPath}`;
      break;

    case 'zsh':
      // Install to user's zsh functions directory
      const zshFuncDir = join(home, '.zsh', 'completions');
      if (!existsSync(zshFuncDir)) {
        mkdirSync(zshFuncDir, { recursive: true });
      }
      installPath = join(zshFuncDir, '_ghostspeak');
      sourceCommand = `fpath=(~/.zsh/completions $fpath) && autoload -U compinit && compinit`;
      break;

    case 'fish':
      // Install to fish completions directory
      const fishCompDir = join(home, '.config', 'fish', 'completions');
      if (!existsSync(fishCompDir)) {
        mkdirSync(fishCompDir, { recursive: true });
      }
      installPath = join(fishCompDir, 'ghostspeak.fish');
      sourceCommand = '# Fish will automatically load completions';
      break;

    default:
      throw new Error(`Unsupported shell: ${shell}`);
  }

  try {
    writeFileSync(installPath, script);
    cliLogger.general.info(chalk.green(`✅ Completion script installed to: ${installPath}`));
    
    if (shell !== 'fish') {
      cliLogger.general.info('');
      cliLogger.general.info(chalk.yellow('To activate completions, add this to your shell profile:'));
      cliLogger.general.info(chalk.gray(`  ${sourceCommand}`));
    }
    
  } catch (error) {
    cliLogger.general.info(chalk.yellow(`⚠️  Could not install to system location: ${installPath}`));
    
    // Fallback to home directory
    const fallbackPath = join(home, `.ghostspeak-completion-${shell}`);
    writeFileSync(fallbackPath, script);
    cliLogger.general.info(chalk.green(`✅ Completion script saved to: ${fallbackPath}`));
  }
}

function showInstallationInstructions(shell: 'bash' | 'zsh' | 'fish', cliLogger: Logger): void {
  cliLogger.general.info('');
  cliLogger.general.info(chalk.cyan('📋 Manual Installation Instructions:'));
  
  switch (shell) {
    case 'bash':
      cliLogger.general.info('');
      cliLogger.general.info(chalk.yellow('For Bash:'));
      cliLogger.general.info('1. Save the completion script to a file (e.g., ~/.ghostspeak-completion)');
      cliLogger.general.info('2. Add this line to your ~/.bashrc or ~/.bash_profile:');
      cliLogger.general.info(chalk.gray('   source ~/.ghostspeak-completion'));
      cliLogger.general.info('3. Reload your shell or run: source ~/.bashrc');
      break;

    case 'zsh':
      cliLogger.general.info('');
      cliLogger.general.info(chalk.yellow('For Zsh:'));
      cliLogger.general.info('1. Save the completion script as _ghostspeak in your fpath');
      cliLogger.general.info('2. Add these lines to your ~/.zshrc:');
      cliLogger.general.info(chalk.gray('   fpath=(~/.zsh/completions $fpath)'));
      cliLogger.general.info(chalk.gray('   autoload -U compinit && compinit'));
      cliLogger.general.info('3. Reload your shell or run: exec zsh');
      break;

    case 'fish':
      cliLogger.general.info('');
      cliLogger.general.info(chalk.yellow('For Fish:'));
      cliLogger.general.info('1. Save the completion script to ~/.config/fish/completions/ghostspeak.fish');
      cliLogger.general.info('2. Fish will automatically load completions on restart');
      cliLogger.general.info('3. Reload completions: fish_update_completions');
      break;
  }
  
  cliLogger.general.info('');
  cliLogger.general.info(chalk.cyan('💡 Test your completion:'));
  cliLogger.general.info('  Type "ghostspeak " and press Tab to see available commands');
}