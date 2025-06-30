#!/usr/bin/env node

import { program } from 'commander';
import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { } from 'nanospinner';
import boxen from 'boxen';


// Import command implementations
import { RegisterAgentCommand } from './commands/register-agent.js';
import { DevelopSDKCommand } from './commands/develop-sdk.js';
import { ManageChannelsCommand } from './commands/manage-channels.js';
import { TestE2ECommand } from './commands/test-e2e.js';
import { ViewAnalyticsCommand } from './commands/view-analytics.js';
import { SettingsCommand } from './commands/settings.js';
import { HelpCommand } from './commands/help.js';
import { DeployProtocolCommand } from './commands/deploy-protocol.js';

// Types
interface MainMenuChoice {
  name: string;
  value: string;
  description?: string;
}

class PodAICLI {
  /**
   * Display the beautiful welcome header
   */
  private async showWelcome(): Promise<void> {
    console.clear();
    
    // ASCII Art Title
    const title = figlet.textSync('podAI', {
      font: 'Big',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    });
    
    console.log(gradient.cristal(title));
    console.log();
    
    // Welcome box
    const welcomeText = boxen(
      chalk.cyan('🤖 Welcome to podAI Protocol\n') +
      chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n') +
      chalk.white('Decentralized Agent Communication Platform\n') +
      chalk.gray('• Register and manage AI agents\n') +
      chalk.gray('• Real-time encrypted messaging\n') +
      chalk.gray('• On-chain verification and reputation\n') +
      chalk.gray('• Built on Solana for speed and scale\n\n') +
      chalk.yellow('⚡ Ready for production use with full E2E testing'),
      {
        padding: 2,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        backgroundColor: '#1a1a1a'
      }
    );
    
    console.log(welcomeText);
    console.log();
  }

  /**
   * Show main interactive menu
   */
  private async showMainMenu(): Promise<string> {
    const choices: MainMenuChoice[] = [
      {
        name: '🤖 Register New Agent',
        value: 'register',
        description: 'Create and register a new AI agent on-chain'
      },
      {
        name: '⚡ Develop with SDK',
        value: 'sdk',
        description: 'Interactive SDK development and testing'
      },
      {
        name: '💬 Manage Channels',
        value: 'channels',
        description: 'Create, join, and manage communication channels'
      },
      {
        name: '🧪 Test E2E Functionality',
        value: 'test',
        description: 'Run comprehensive end-to-end tests'
      },
      {
        name: '📊 View Analytics',
        value: 'analytics',
        description: 'Network statistics and agent performance metrics'
      },
      {
        name: '🚀 Deploy Protocol',
        value: 'deploy',
        description: 'Deploy and validate protocol infrastructure'
      },
      {
        name: '⚙️  Settings',
        value: 'settings',
        description: 'Configure network, wallet, and preferences'
      },
      {
        name: '❓ Help & Documentation',
        value: 'help',
        description: 'Learn how to use podAI Protocol'
      },
      {
        name: '🚪 Exit',
        value: 'exit',
        description: 'Leave the podAI CLI'
      }
    ];

    const answer = await select({
      message: chalk.bold('What would you like to do?'),
      choices: (choices as any).map(choice => ({
        name: choice.name,
        value: choice.value,
        description: choice.description
      }))
    });

    return answer;
  }

  /**
   * Main CLI loop
   */
  async run(): Promise<void> {
    try {
      // Show welcome screen
      await this.showWelcome();

      // Main interactive loop
      while (true) {
        const choice = await this.showMainMenu();

        try {
          switch (choice) {
            case 'register':
              const registerCommand = new RegisterAgentCommand();
              await registerCommand.execute();
              break;
              
            case 'sdk':
              const sdkCommand = new DevelopSDKCommand();
              await sdkCommand.execute();
              break;
              
            case 'channels':
              const channelsCommand = new ManageChannelsCommand();
              await channelsCommand.execute();
              break;
              
            case 'test':
              const testCommand = new TestE2ECommand();
              await testCommand.execute();
              break;
              
            case 'analytics':
              const analyticsCommand = new ViewAnalyticsCommand();
              await analyticsCommand.execute();
              break;
              
            case 'deploy':
              const deployCommand = new DeployProtocolCommand();
              await deployCommand.execute();
              break;
              
            case 'settings':
              const settingsCommand = new SettingsCommand();
              await settingsCommand.execute();
              break;
              
            case 'help':
              const helpCommand = new HelpCommand();
              await helpCommand.execute();
              break;
              
            case 'exit':
              console.log(
                boxen(
                  chalk.cyan('👋 Thanks for using podAI Protocol!\n') +
                  chalk.gray('Stay connected: docs.podai.com'),
                  {
                    padding: 1,
                    borderColor: 'cyan',
                    borderStyle: 'round'
                  }
                )
              );
              process.exit(0);
              
            default:
              console.log(chalk.red('Invalid choice. Please try again.'));
          }
        } catch (commandError) {
          console.error(chalk.red('❌ Command failed:'), commandError instanceof Error ? commandError.message : String(commandError));
          
          // Ask if user wants to continue after error
          const continueAfterError = await confirm({
            message: 'Continue to main menu?',
            default: true
          });
          
          if (!continueAfterError) {
            process.exit(1);
          }
        }

        // Add spacing between operations
        console.log('\n' + chalk.gray('─'.repeat(60)) + '\n');
        
        // Ask if user wants to continue
        const continueChoice = await confirm({
          message: 'Would you like to do something else?',
          default: true
        });
        
        if (!continueChoice) {
          console.log(chalk.cyan('👋 Thanks for using podAI!'));
          process.exit(0);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        console.log(chalk.cyan('\n👋 Until next time!'));
        process.exit(0);
      } else {
        console.error(chalk.red('❌ CLI Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    }
  }
}

// CLI Program Setup
program
  .name('podai')
  .description('Interactive CLI for podAI Protocol')
  .version('1.0.0')
  .action(async () => {
    const cli = new PodAICLI();
    await cli.run();
  });

// Handle CLI execution
program.parse();

export { PodAICLI };
export default program; 