#!/usr/bin/env tsx
/**
 * @fileoverview Unified Agent Registration Script for GhostSpeak Protocol
 * @description Supports both direct Anchor calls and SDK-based registration methods
 * @author GhostSpeak Development Team
 * @version 1.0.0
 * 
 * @example
 * ```bash
 * # Register agent using SDK method
 * tsx scripts/register-agent.ts --method sdk --name "MyAgent"
 * 
 * # Register agent using direct Anchor method
 * tsx scripts/register-agent.ts --method anchor --name "MyAgent"
 * 
 * # Show help
 * tsx scripts/register-agent.ts --help
 * ```
 */

import { program } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { getDefaults, getCurrentNetwork, getProgram } from './config.js';

// SDK method imports
import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createKeyPairSignerFromBytes } from '@solana/signers';

// Anchor method imports  
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { SystemProgram, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';

/**
 * Configuration options for agent registration
 */
interface AgentRegistrationConfig {
  /** Registration method to use */
  method: 'sdk' | 'anchor';
  /** Optional agent name */
  name?: string;
  /** Optional agent description */
  description?: string;
  /** Optional agent capabilities */
  capabilities?: string[];
  /** Optional agent endpoint URL */
  endpoint?: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
  /** Optional custom wallet path */
  walletPath?: string;
}

/**
 * Unified agent registration system supporting multiple registration methods
 */
class UnifiedAgentRegistration {
  private config: AgentRegistrationConfig;

  constructor(config: AgentRegistrationConfig) {
    this.config = config;
  }

  private log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info'): void {
    const colors = {
      info: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red,
      success: chalk.green
    };
    console.log(colors[level](`[${new Date().toISOString()}] ${message}`));
  }

  private loadWallet(): Keypair {
    const walletPath = this.config.walletPath || 
                      process.env.ANCHOR_WALLET || 
                      path.join(process.env.HOME!, '.config/solana/id.json');
    
    try {
      const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
      return Keypair.fromSecretKey(Buffer.from(walletData));
    } catch (error) {
      throw new Error(`Failed to load wallet from ${walletPath}: ${error}`);
    }
  }

  private async checkBalance(connection: Connection, publicKey: any): Promise<void> {
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    this.log(`Balance: ${solBalance} SOL`, 'info');
    
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      throw new Error(`Insufficient balance: ${solBalance} SOL (minimum 0.1 SOL required)`);
    }
  }

  private generateAgentData() {
    const defaults = getDefaults();
    
    return {
      name: this.config.name || `Agent_${Date.now()}`,
      description: this.config.description || defaults.agent.description,
      capabilities: this.config.capabilities || defaults.agent.capabilities,
      endpoint: this.config.endpoint || defaults.agent.endpoint,
      metadata: JSON.stringify({
        version: '1.0.0',
        created: new Date().toISOString(),
        method: this.config.method
      })
    };
  }

  private async registerWithSDK(): Promise<void> {
    this.log('Using SDK-based registration method', 'info');
    
    try {
      // Dynamic import to handle potential import issues
      const { GhostSpeakClient } = await import('../packages/sdk-typescript/dist/index.js');
      
      const network = getCurrentNetwork();
      const connection = new Connection(this.config.rpcUrl || network.rpcUrl, 'confirmed');
      const walletKeypair = this.loadWallet();
      
      this.log(`Wallet: ${walletKeypair.publicKey.toBase58()}`, 'info');
      await this.checkBalance(connection, walletKeypair.publicKey);
      
      // Convert Keypair to TransactionSigner
      const signer = await createKeyPairSignerFromBytes(walletKeypair.secretKey);
      this.log(`Signer address: ${signer.address}`, 'info');
      
      // Create GhostSpeak client
      const client = new GhostSpeakClient({
        rpcEndpoint: this.config.rpcUrl || network.rpcUrl
      });
      
      const agentData = this.generateAgentData();
      this.log(`Registering agent: ${agentData.name}`, 'info');
      
      // Register agent with SDK
      const result = await client.registerAgent({
        signer,
        name: agentData.name,
        description: agentData.description,
        capabilities: agentData.capabilities,
        endpoint: agentData.endpoint,
        metadata: agentData.metadata
      });
      
      this.log(`Agent registered successfully!`, 'success');
      this.log(`Transaction: ${result.signature}`, 'info');
      this.log(`Agent Address: ${result.agentAddress}`, 'info');
      
    } catch (error) {
      throw new Error(`SDK registration failed: ${error}`);
    }
  }

  private async registerWithAnchor(): Promise<void> {
    this.log('Using direct Anchor registration method', 'info');
    
    try {
      // Import IDL dynamically
      const idlPath = path.join(process.cwd(), 'target/idl/ghostspeak_marketplace.json');
      if (!fs.existsSync(idlPath)) {
        throw new Error('IDL file not found. Please run "anchor build" first.');
      }
      
      const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
      const programConfig = getProgram('ghostspeak');
      const PROGRAM_ID = new anchor.web3.PublicKey(programConfig.programId);
      
      const network = getCurrentNetwork();
      const connection = new anchor.web3.Connection(
        this.config.rpcUrl || network.rpcUrl, 
        'confirmed'
      );
      
      const walletKeypair = this.loadWallet();
      const wallet = new anchor.Wallet(walletKeypair);
      
      this.log(`Wallet: ${wallet.publicKey.toBase58()}`, 'info');
      await this.checkBalance(connection, wallet.publicKey);
      
      const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed'
      });
      
      anchor.setProvider(provider);
      const program = new Program(idl, PROGRAM_ID, provider);
      
      const agentData = this.generateAgentData();
      this.log(`Registering agent: ${agentData.name}`, 'info');
      
      // Generate agent keypair
      const agentKeypair = Keypair.generate();
      
      // Derive PDAs
      const [agentPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), wallet.publicKey.toBuffer(), agentKeypair.publicKey.toBuffer()],
        PROGRAM_ID
      );
      
      // Register agent with Anchor
      const tx = await program.methods
        .registerAgent(
          agentData.name,
          agentData.description,
          agentData.capabilities,
          agentKeypair.publicKey,
          agentData.endpoint
        )
        .accounts({
          agent: agentPda,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .signers([agentKeypair])
        .rpc();
      
      this.log(`Agent registered successfully!`, 'success');
      this.log(`Transaction: ${tx}`, 'info');
      this.log(`Agent PDA: ${agentPda.toBase58()}`, 'info');
      this.log(`Agent Keypair: ${agentKeypair.publicKey.toBase58()}`, 'info');
      
    } catch (error) {
      throw new Error(`Anchor registration failed: ${error}`);
    }
  }

  async register(): Promise<void> {
    console.log(chalk.bold.blue('\n🤖 GhostSpeak Agent Registration'));
    console.log(chalk.gray(`Method: ${this.config.method.toUpperCase()}`));
    console.log(chalk.gray(`Started: ${new Date().toLocaleString()}\n`));
    
    try {
      if (this.config.method === 'sdk') {
        await this.registerWithSDK();
      } else {
        await this.registerWithAnchor();
      }
      
      console.log(chalk.bold.green('\n✅ Agent registration completed successfully!\n'));
      
    } catch (error) {
      console.log(chalk.bold.red('\n❌ Agent registration failed!'));
      console.log(chalk.red(`Error: ${error}\n`));
      throw error;
    }
  }
}

async function main(): Promise<void> {
  program
    .name('register-agent')
    .description('Unified agent registration for GhostSpeak protocol')
    .requiredOption('-m, --method <method>', 'Registration method (sdk|anchor)')
    .option('-n, --name <name>', 'Agent name')
    .option('-d, --description <desc>', 'Agent description')
    .option('-c, --capabilities <caps>', 'Comma-separated capabilities', (value) => value.split(','))
    .option('-e, --endpoint <url>', 'Agent endpoint URL')
    .option('-r, --rpc-url <url>', 'RPC endpoint URL', 'https://api.devnet.solana.com')
    .option('-w, --wallet-path <path>', 'Path to wallet keypair file')
    .parse();

  const options = program.opts();

  // Validate method
  if (!['sdk', 'anchor'].includes(options.method)) {
    console.error(chalk.red('Invalid method. Must be: sdk or anchor'));
    process.exit(1);
  }

  const config: AgentRegistrationConfig = {
    method: options.method,
    name: options.name,
    description: options.description,
    capabilities: options.capabilities,
    endpoint: options.endpoint,
    rpcUrl: options.rpcUrl,
    walletPath: options.walletPath
  };

  const registration = new UnifiedAgentRegistration(config);
  
  try {
    await registration.register();
    process.exit(0);
  } catch (error) {
    console.error(chalk.red(`Registration failed: ${error}`));
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Registration system error:'), error);
    process.exit(1);
  });
}

export { UnifiedAgentRegistration };
export type { AgentRegistrationConfig };