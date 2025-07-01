import chalk from 'chalk';
import { ContextDetector, IProjectInfo } from '../utils/context-detector.js';

export interface IAdaptiveInterface {
  run(): Promise<void>;
}

export class AdaptiveInterface implements IAdaptiveInterface {
  private detector: ContextDetector;
  private projectInfo?: IProjectInfo;

  constructor() {
    this.detector = new ContextDetector();
  }

  async run(): Promise<void> {
    await this.detectContext();
    await this.showWelcomeScreen();
    console.log(chalk.yellow('🚧 Interactive interface temporarily disabled for build fixes'));
    console.log(chalk.gray('Use individual CLI commands instead'));
  }

  private async detectContext(): Promise<void> {
    try {
      this.projectInfo = await this.detector.detectContext();
      console.log(chalk.gray(`Context detected: ${this.projectInfo.context} in ${this.projectInfo.path}`));
    } catch (error) {
      console.error(chalk.red('Failed to detect context:'), error);
      process.exit(1);
    }
  }

  private async showWelcomeScreen(): Promise<void> {
    console.clear();
    console.log(chalk.bold.magenta('🤖 GhostSpeak Agent Commerce Protocol'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    
    if (!this.projectInfo) return;

    // Context-specific welcome
    switch (this.projectInfo.context) {
      case 'ghostspeak-workspace':
        console.log(chalk.blue('🏗️  GhostSpeak Development Workspace'));
        console.log(chalk.gray('   Full protocol development environment detected'));
        break;
      
      case 'typescript-project':
        console.log(chalk.cyan('📘 TypeScript Project'));
        console.log(chalk.gray(`   Features: ${this.projectInfo.features.join(', ')}`));
        break;
      
      case 'rust-project':
        console.log(chalk.hex('#FFA500')('🦀 Rust Project'));
        console.log(chalk.gray(`   Features: ${this.projectInfo.features.join(', ')}`));
        break;
      
      case 'workspace-both':
        console.log(chalk.green('🔄 Multi-SDK Workspace'));
        console.log(chalk.gray('   TypeScript + Rust development environment'));
        break;
      
      default:
        console.log(chalk.red('❓ Unknown Context'));
    }

    console.log();
    console.log(chalk.gray(`📍 Path: ${this.projectInfo.path}`));
    console.log(chalk.gray(`🔧 SDKs: ${this.projectInfo.sdks.join(', ')}`));
    console.log(chalk.gray(`✨ Features: ${this.projectInfo.features.join(', ')}`));
    
    if (this.projectInfo.networkConfig) {
      console.log(chalk.gray(`🌐 Network: ${this.projectInfo.networkConfig.network}`));
    }
    
    console.log();
  }
}