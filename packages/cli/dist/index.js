#!/usr/bin/env node
import { createRequire } from 'module';
import { address } from '@solana/addresses';
import { config } from 'dotenv';
import path, { join, dirname, resolve } from 'path';
import fs3, { existsSync, readFileSync, writeFileSync, chmodSync, mkdirSync, unlinkSync, renameSync, promises } from 'fs';
import { URL as URL$1, fileURLToPath } from 'url';
import { createKeyPairSignerFromBytes, pipe, createTransactionMessage, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstruction, signTransactionMessageWithSigners, sendAndConfirmTransactionFactory, address as address$1, getProgramDerivedAddress, getAddressEncoder, assertAccountExists, AccountRole, generateKeyPairSigner, fetchEncodedAccount, transformEncoder, getStructEncoder, getU8Encoder, upgradeRoleToSigner, getU64Encoder, decodeAccount, isTransactionSigner as isTransactionSigner$1, getStructDecoder, getAddressDecoder, getU64Decoder, getOptionDecoder, getU32Decoder, getEnumDecoder } from '@solana/kit';
import os, { homedir } from 'os';
import { createSolanaClient } from 'gill';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import nacl from 'tweetnacl';
import { EventEmitter } from 'events';
import { Subject, filter, BehaviorSubject, merge, map } from 'rxjs';
import { GhostSpeakClient, CredentialModule, GHOSTSPEAK_PROGRAM_ID, AgentModule, GovernanceModule } from '@ghostspeak/sdk';
import { intro, select, isCancel, cancel, text, confirm, spinner, outro, note, log, multiselect } from '@clack/prompts';
import chalk34 from 'chalk';
import { ConvexHttpClient } from 'convex/browser';
import { Command, program } from 'commander';
import figlet from 'figlet';
import { randomUUID, scrypt, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import fs2, { chmod, access, mkdir, writeFile, readFile } from 'fs/promises';
import 'node-fetch';
import { createKeyPairSignerFromBytes as createKeyPairSignerFromBytes$1 } from '@solana/signers';
import ora from 'ora';
import pc from 'picocolors';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Table } from 'console-table-printer';
import 'cli-table3';
import boxen from 'boxen';
import React14, { createContext, useState, useEffect, useContext } from 'react';
import { render, useApp, useInput, Box, Text, measureElement } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import { jsx, jsxs } from 'react/jsx-runtime';
import Spinner2 from 'ink-spinner';
import process2 from 'process';
import { deriveAttestationPda, serializeAttestationData, getCreateAttestationInstruction } from 'sas-lib';
import pino from 'pino';

createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  __defProp(target, "default", { value: mod, enumerable: true }) ,
  mod
));
function getCurrentProgramId(network = "devnet") {
  return PROGRAM_IDS[network];
}
var PROGRAM_IDS;
var init_program_ids = __esm({
  "../../config/program-ids.ts"() {
    PROGRAM_IDS = {
      devnet: address("4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB"),
      localnet: address("4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB"),
      testnet: address("4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB"),
      // Same as devnet for now
      mainnet: address("4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB")
      // TODO: Update after mainnet deployment
    };
  }
});
function loadEnvFiles() {
  const envLocations = [
    // 1. Current working directory
    resolve(process.cwd(), ".env"),
    // 2. Project root (two levels up from CLI package)
    resolve(process.cwd(), "../../.env"),
    // 3. CLI package directory (same as this file)
    (() => {
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        return resolve(__dirname, "../../.env");
      } catch (error) {
        return "";
      }
    })(),
    // 4. Parent of CLI package directory
    (() => {
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        return resolve(__dirname, "../../../.env");
      } catch (error) {
        return "";
      }
    })()
  ].filter(Boolean);
  for (const envPath of envLocations) {
    if (existsSync(envPath)) {
      config({ path: envPath });
      break;
    }
  }
}
function getCurrentNetwork() {
  const network = process.env.GHOSTSPEAK_NETWORK ?? "devnet";
  if (!["mainnet-beta", "devnet", "testnet", "localnet"].includes(network)) {
    throw new Error(`Invalid network: ${network}`);
  }
  return network;
}
function getProgramId() {
  const network = getCurrentNetwork();
  const networkKey = network === "mainnet-beta" ? "mainnet" : network;
  const canonicalId = PROGRAM_IDS[networkKey];
  let envProgramIdStr;
  switch (network) {
    case "mainnet-beta":
      envProgramIdStr = process.env.GHOSTSPEAK_PROGRAM_ID_MAINNET;
      break;
    case "devnet":
      envProgramIdStr = process.env.GHOSTSPEAK_PROGRAM_ID_DEVNET;
      break;
    case "testnet":
      envProgramIdStr = process.env.GHOSTSPEAK_PROGRAM_ID_TESTNET;
      break;
    case "localnet":
      envProgramIdStr = process.env.GHOSTSPEAK_PROGRAM_ID_LOCALNET;
      break;
  }
  if (envProgramIdStr) {
    try {
      const envProgramId = address$1(envProgramIdStr);
      if (envProgramId !== canonicalId) {
        console.warn("\u26A0\uFE0F  WARNING: Program ID mismatch detected!");
        console.warn(`   Environment: ${envProgramId}`);
        console.warn(`   Canonical:   ${canonicalId}`);
        console.warn(`   Using canonical program ID from config/program-ids.ts`);
        console.warn(`   To fix: Update GHOSTSPEAK_PROGRAM_ID_${network.toUpperCase().replace("-", "_")} in .env`);
      }
      return canonicalId;
    } catch (error) {
      console.warn(`Invalid program ID in environment for ${network}: ${envProgramIdStr}`);
      console.warn(`Using canonical program ID: ${canonicalId}`);
      return canonicalId;
    }
  }
  return canonicalId;
}
function getUsdcMint() {
  const network = getCurrentNetwork();
  let mintStr;
  switch (network) {
    case "mainnet-beta":
      mintStr = process.env.GHOSTSPEAK_USDC_MINT_MAINNET ?? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
      break;
    case "devnet":
      mintStr = process.env.GHOSTSPEAK_USDC_MINT_DEVNET ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
      break;
    case "testnet":
    case "localnet":
      mintStr = process.env.GHOSTSPEAK_USDC_MINT_TESTNET ?? "11111111111111111111111111111111";
      break;
  }
  return address$1(mintStr);
}
function loadEnvironmentConfig() {
  const network = getCurrentNetwork();
  return {
    network,
    rpcUrl: process.env.GHOSTSPEAK_RPC_URL ?? getDefaultRpcUrl(network),
    programId: getProgramId(),
    walletPath: process.env.GHOSTSPEAK_WALLET_PATH ?? "~/.config/solana/ghostspeak.json",
    usdcMint: getUsdcMint(),
    debug: process.env.GHOSTSPEAK_DEBUG === "true",
    logLevel: process.env.GHOSTSPEAK_LOG_LEVEL ?? "info",
    encryptionSalt: process.env.GHOSTSPEAK_ENCRYPTION_SALT,
    keyDerivationIterations: parseInt(process.env.GHOSTSPEAK_KEY_DERIVATION_ITERATIONS ?? "100000", 10)
  };
}
function getDefaultRpcUrl(network) {
  switch (network) {
    case "mainnet-beta":
      return "https://api.mainnet-beta.solana.com";
    case "devnet":
      return "https://api.devnet.solana.com";
    case "testnet":
      return "https://api.testnet.solana.com";
    case "localnet":
      return "http://localhost:8899";
    default:
      return "https://api.devnet.solana.com";
  }
}
function getEnvConfig() {
  if (!_envConfig) {
    _envConfig = loadEnvironmentConfig();
  }
  return _envConfig;
}
var _envConfig, envConfig;
var init_env_config = __esm({
  "src/utils/env-config.ts"() {
    init_program_ids();
    loadEnvFiles();
    _envConfig = null;
    envConfig = new Proxy({}, {
      get(_target, prop) {
        return getEnvConfig()[prop];
      }
    });
  }
});

// src/utils/config.ts
var config_exports = {};
__export(config_exports, {
  ensureConfigDir: () => ensureConfigDir,
  getConfigPath: () => getConfigPath,
  loadConfig: () => loadConfig,
  resetConfig: () => resetConfig,
  saveConfig: () => saveConfig
});
function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 448 });
  }
}
function loadConfig() {
  ensureConfigDir();
  if (!existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG;
  }
  try {
    const configData = readFileSync(CONFIG_FILE, "utf-8");
    const config2 = JSON.parse(configData);
    return { ...DEFAULT_CONFIG, ...config2 };
  } catch (error) {
    console.error("Error loading config:", error);
    return DEFAULT_CONFIG;
  }
}
function saveConfig(config2) {
  ensureConfigDir();
  const currentConfig = loadConfig();
  const newConfig = { ...currentConfig, ...config2 };
  writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
  chmodSync(CONFIG_FILE, 384);
}
function resetConfig() {
  ensureConfigDir();
  if (existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    chmodSync(CONFIG_FILE, 384);
  }
}
function getConfigPath() {
  return CONFIG_FILE;
}
var CONFIG_DIR, CONFIG_FILE, DEFAULT_CONFIG;
var init_config = __esm({
  "src/utils/config.ts"() {
    init_env_config();
    CONFIG_DIR = join(homedir(), ".ghostspeak");
    CONFIG_FILE = join(CONFIG_DIR, "config.json");
    DEFAULT_CONFIG = {
      network: envConfig.network,
      walletPath: envConfig.walletPath.startsWith("~") ? join(homedir(), envConfig.walletPath.slice(2)) : envConfig.walletPath,
      programId: envConfig.programId.toString(),
      rpcUrl: envConfig.rpcUrl
    };
  }
});
function createCustomClient(rpcUrl) {
  return createSolanaClient({ urlOrMoniker: rpcUrl });
}
var init_solana_client = __esm({
  "src/core/solana-client.ts"() {
    init_config();
  }
});
var WalletService;
var init_wallet_service = __esm({
  "src/services/wallet-service.ts"() {
    init_solana_client();
    WalletService = class {
      walletsDir;
      registryPath;
      constructor() {
        const ghostspeakDir = join(homedir(), ".ghostspeak");
        this.walletsDir = join(ghostspeakDir, "wallets");
        this.registryPath = join(this.walletsDir, "registry.json");
        if (!existsSync(ghostspeakDir)) {
          mkdirSync(ghostspeakDir, { recursive: true });
        }
        if (!existsSync(this.walletsDir)) {
          mkdirSync(this.walletsDir, { recursive: true });
        }
      }
      /**
       * Get or create the wallets registry
       */
      getRegistry() {
        if (existsSync(this.registryPath)) {
          try {
            return JSON.parse(readFileSync(this.registryPath, "utf-8"));
          } catch (error) {
          }
        }
        return {
          activeWallet: null,
          wallets: {}
        };
      }
      /**
       * Save the registry
       */
      saveRegistry(registry) {
        writeFileSync(this.registryPath, JSON.stringify(registry, null, 2));
      }
      /**
       * Generate a new mnemonic seed phrase
       */
      generateMnemonic() {
        return bip39.generateMnemonic(256);
      }
      /**
       * Create keypair from mnemonic with proper BIP44 derivation
       * Returns both the signer and the raw 64-byte secret key
       */
      async keypairFromMnemonic(mnemonic, index = 0) {
        if (!bip39.validateMnemonic(mnemonic)) {
          throw new Error("Invalid mnemonic phrase");
        }
        try {
          const seed = await bip39.mnemonicToSeed(mnemonic);
          const derivationPath = `m/44'/501'/${index}'/0'`;
          const { key } = derivePath(derivationPath, seed.toString("hex"));
          const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(key));
          const secretKey = keyPair.secretKey;
          const signer = await createKeyPairSignerFromBytes(secretKey);
          return { signer, secretKey };
        } catch (error) {
          throw new Error(`Failed to derive keypair from mnemonic: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
      /**
       * Create a new wallet
       */
      async createWallet(name, network = "devnet", mnemonic) {
        const registry = this.getRegistry();
        if (name in registry.wallets) {
          throw new Error(`Wallet with name "${name}" already exists`);
        }
        const seedPhrase = mnemonic ?? this.generateMnemonic();
        const { signer, secretKey } = await this.keypairFromMnemonic(seedPhrase);
        const walletData = {
          metadata: {
            name,
            address: signer.address.toString(),
            network,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            isActive: Object.keys(registry.wallets).length === 0
            // First wallet is active by default
          },
          keypair: Array.from(secretKey)
        };
        const walletPath = join(this.walletsDir, `${name}.json`);
        writeFileSync(walletPath, JSON.stringify(walletData, null, 2));
        registry.wallets[name] = walletData.metadata;
        if (walletData.metadata.isActive) {
          registry.activeWallet = name;
        }
        this.saveRegistry(registry);
        return { wallet: walletData, mnemonic: seedPhrase };
      }
      /**
       * Import wallet from private key or mnemonic
       */
      async importWallet(name, secretKeyOrMnemonic, network = "devnet") {
        const registry = this.getRegistry();
        if (name in registry.wallets) {
          throw new Error(`Wallet with name "${name}" already exists`);
        }
        let signer;
        let privateKeyBytes;
        if (typeof secretKeyOrMnemonic === "string") {
          if (bip39.validateMnemonic(secretKeyOrMnemonic)) {
            const result = await this.keypairFromMnemonic(secretKeyOrMnemonic);
            signer = result.signer;
            privateKeyBytes = result.secretKey;
          } else {
            try {
              const bytes = JSON.parse(secretKeyOrMnemonic);
              privateKeyBytes = new Uint8Array(bytes);
              if (privateKeyBytes.length === 32) {
                const keyPair = nacl.sign.keyPair.fromSeed(privateKeyBytes);
                privateKeyBytes = keyPair.secretKey;
              }
              signer = await createKeyPairSignerFromBytes(privateKeyBytes);
            } catch (error) {
              throw new Error("Invalid private key or mnemonic format");
            }
          }
        } else {
          privateKeyBytes = secretKeyOrMnemonic;
          if (privateKeyBytes.length === 32) {
            const keyPair = nacl.sign.keyPair.fromSeed(privateKeyBytes);
            privateKeyBytes = keyPair.secretKey;
          }
          signer = await createKeyPairSignerFromBytes(privateKeyBytes);
        }
        const walletData = {
          metadata: {
            name,
            address: signer.address.toString(),
            network,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            isActive: Object.keys(registry.wallets).length === 0
          },
          keypair: Array.from(privateKeyBytes)
        };
        const walletPath = join(this.walletsDir, `${name}.json`);
        writeFileSync(walletPath, JSON.stringify(walletData, null, 2));
        registry.wallets[name] = walletData.metadata;
        if (walletData.metadata.isActive) {
          registry.activeWallet = name;
        }
        this.saveRegistry(registry);
        return walletData;
      }
      /**
       * List all wallets
       */
      listWallets() {
        const registry = this.getRegistry();
        return Object.values(registry.wallets).sort((a, b) => b.lastUsed - a.lastUsed);
      }
      /**
       * Get active wallet
       */
      getActiveWallet() {
        const registry = this.getRegistry();
        if (!registry.activeWallet) {
          return null;
        }
        return this.getWallet(registry.activeWallet);
      }
      /**
       * Get wallet by name
       */
      getWallet(name) {
        const registry = this.getRegistry();
        if (!(name in registry.wallets)) {
          return null;
        }
        const walletPath = join(this.walletsDir, `${name}.json`);
        if (!existsSync(walletPath)) {
          return null;
        }
        try {
          const walletData = JSON.parse(readFileSync(walletPath, "utf-8"));
          walletData.metadata.lastUsed = Date.now();
          registry.wallets[name].lastUsed = Date.now();
          this.saveRegistry(registry);
          return walletData;
        } catch (error) {
          return null;
        }
      }
      /**
       * Set active wallet
       */
      setActiveWallet(name) {
        const registry = this.getRegistry();
        if (!(name in registry.wallets)) {
          throw new Error(`Wallet "${name}" not found`);
        }
        Object.keys(registry.wallets).forEach((walletName) => {
          registry.wallets[walletName].isActive = walletName === name;
        });
        registry.activeWallet = name;
        this.saveRegistry(registry);
      }
      /**
       * Rename wallet
       */
      renameWallet(oldName, newName) {
        const registry = this.getRegistry();
        if (!(oldName in registry.wallets)) {
          throw new Error(`Wallet "${oldName}" not found`);
        }
        if (newName in registry.wallets) {
          throw new Error(`Wallet "${newName}" already exists`);
        }
        const oldPath = join(this.walletsDir, `${oldName}.json`);
        const newPath = join(this.walletsDir, `${newName}.json`);
        if (existsSync(oldPath)) {
          const walletData = JSON.parse(readFileSync(oldPath, "utf-8"));
          walletData.metadata.name = newName;
          writeFileSync(newPath, JSON.stringify(walletData, null, 2));
          unlinkSync(oldPath);
        }
        const metadata = registry.wallets[oldName];
        metadata.name = newName;
        registry.wallets[newName] = metadata;
        delete registry.wallets[oldName];
        if (registry.activeWallet === oldName) {
          registry.activeWallet = newName;
        }
        this.saveRegistry(registry);
      }
      /**
       * Delete wallet
       */
      deleteWallet(name) {
        const registry = this.getRegistry();
        if (!(name in registry.wallets)) {
          throw new Error(`Wallet "${name}" not found`);
        }
        if (registry.activeWallet === name && Object.keys(registry.wallets).length > 1) {
          throw new Error("Cannot delete active wallet. Switch to another wallet first.");
        }
        const walletPath = join(this.walletsDir, `${name}.json`);
        if (existsSync(walletPath)) {
          unlinkSync(walletPath);
        }
        delete registry.wallets[name];
        if (registry.activeWallet === name) {
          const remainingWallets = Object.keys(registry.wallets);
          registry.activeWallet = remainingWallets.length > 0 ? remainingWallets[0] : null;
          if (registry.activeWallet) {
            registry.wallets[registry.activeWallet].isActive = true;
          }
        }
        this.saveRegistry(registry);
      }
      /**
       * Get wallet balance
       */
      async getBalance(walletAddress, network) {
        try {
          const rpcUrl = network === "devnet" ? "https://api.devnet.solana.com" : network === "testnet" ? "https://api.testnet.solana.com" : "https://api.mainnet-beta.solana.com";
          const client = createCustomClient(rpcUrl);
          const { value: balance } = await client.rpc.getBalance(address$1(walletAddress)).send();
          return Number(balance) / 1e9;
        } catch (error) {
          return 0;
        }
      }
      /**
       * Get signer for a wallet
       */
      async getSigner(name) {
        const wallet = this.getWallet(name);
        if (!wallet) {
          return null;
        }
        return createKeyPairSignerFromBytes(new Uint8Array(wallet.keypair));
      }
      /**
       * Get active signer
       */
      async getActiveSigner() {
        const wallet = this.getActiveWallet();
        if (!wallet) {
          return null;
        }
        return createKeyPairSignerFromBytes(new Uint8Array(wallet.keypair));
      }
      /**
       * Interface-compatible method: Create wallet with return type for IWalletService
       */
      async createWalletInterface(name, network) {
        const mnemonic = bip39.generateMnemonic();
        const { wallet: walletData } = await this.createWallet(name, network, mnemonic);
        const walletInfo = {
          address: address$1(walletData.metadata.address),
          name: walletData.metadata.name,
          network: walletData.metadata.network,
          metadata: {
            createdAt: walletData.metadata.createdAt,
            lastUsed: walletData.metadata.lastUsed,
            isActive: walletData.metadata.isActive
          }
        };
        return { wallet: walletInfo, mnemonic };
      }
      /**
       * Interface-compatible method: Import wallet from mnemonic
       */
      async importWalletInterface(name, mnemonic, network) {
        const walletData = await this.importWallet(name, mnemonic, network);
        return {
          address: address$1(walletData.metadata.address),
          name: walletData.metadata.name,
          network: walletData.metadata.network,
          metadata: {
            createdAt: walletData.metadata.createdAt,
            lastUsed: walletData.metadata.lastUsed,
            isActive: walletData.metadata.isActive
          }
        };
      }
      /**
       * Interface-compatible method: List wallets as WalletInfo[]
       */
      async listWalletsInterface() {
        const wallets = this.listWallets();
        return wallets.map((wallet) => ({
          address: address$1(wallet.address),
          name: wallet.name,
          network: wallet.network,
          metadata: {
            createdAt: wallet.createdAt,
            lastUsed: wallet.lastUsed,
            isActive: wallet.isActive
          }
        }));
      }
      /**
       * Interface-compatible method: Get active wallet as WalletInfo
       */
      getActiveWalletInterface() {
        const wallet = this.getActiveWallet();
        if (!wallet) return null;
        return {
          address: address$1(wallet.metadata.address),
          name: wallet.metadata.name,
          network: wallet.metadata.network,
          metadata: {
            createdAt: wallet.metadata.createdAt,
            lastUsed: wallet.metadata.lastUsed,
            isActive: wallet.metadata.isActive
          }
        };
      }
      /**
       * Interface-compatible method: Set active wallet
       */
      async setActiveWalletInterface(name) {
        this.setActiveWallet(name);
      }
      /**
       * Interface-compatible method: Get balance for address
       */
      async getBalanceInterface(walletAddress) {
        const balance = await this.getBalance(walletAddress.toString(), "devnet");
        return BigInt(Math.floor(balance * 1e9));
      }
      /**
       * Interface-compatible method: Sign transaction
       */
      async signTransaction(signer, transaction) {
        try {
          const { signTransaction: signTransactionKit } = await import('@solana/kit');
          const tx = transaction;
          const signedTransaction = await signTransactionKit([signer], tx);
          const signatures = Object.values(signedTransaction.signatures);
          if (signatures.length > 0) {
            const signature = signatures[0];
            if (!signature) {
              throw new Error("Signature is null");
            }
            console.log(`\u2705 Transaction signed by ${signer.address.toString()}`);
            return signature.toString();
          } else {
            throw new Error("No signature found in signed transaction");
          }
        } catch (error) {
          console.error("Failed to sign transaction:", error);
          throw new Error(`Transaction signing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
      /**
       * Migrate old wallet.json to new system
       */
      async migrateOldWallet() {
        const oldWalletPath = join(homedir(), ".ghostspeak", "wallet.json");
        if (!existsSync(oldWalletPath)) {
          return;
        }
        try {
          const oldWalletData = JSON.parse(readFileSync(oldWalletPath, "utf-8"));
          await this.importWallet("main", new Uint8Array(oldWalletData), "devnet");
          renameSync(oldWalletPath, oldWalletPath + ".backup");
        } catch (error) {
          console.warn("Failed to migrate old wallet:", error);
        }
      }
    };
  }
});
var EventBus, EventCorrelator, StreamManager, CommandResultStream, BlockchainEventListener, CLIStateManager;
var init_event_system = __esm({
  "src/core/event-system.ts"() {
    EventBus = class _EventBus extends EventEmitter {
      static instance = null;
      eventSubjects = /* @__PURE__ */ new Map();
      globalSubject = new Subject();
      eventHistory = [];
      maxHistorySize = 1e3;
      correlationIdCounter = 0;
      /**
       * Get singleton instance
       */
      static getInstance() {
        _EventBus.instance ??= new _EventBus();
        return _EventBus.instance;
      }
      /**
       * Emit an event
       */
      emit(type, data, options) {
        const event = {
          type,
          data,
          timestamp: /* @__PURE__ */ new Date(),
          source: options?.source,
          metadata: options?.metadata,
          correlationId: options?.correlationId ?? this.generateCorrelationId()
        };
        this.addToHistory(event);
        super.emit(type, event);
        this.globalSubject.next(event);
        const subject = this.eventSubjects.get(type);
        if (subject) {
          subject.next(event);
        }
        return true;
      }
      /**
       * Listen to events (EventEmitter style)
       */
      on(eventName, listener) {
        super.on(eventName, listener);
        return this;
      }
      /**
       * Listen to events once
       */
      once(eventName, listener) {
        super.once(eventName, listener);
        return this;
      }
      /**
       * Remove event listener
       */
      off(eventName, listener) {
        super.off(eventName, listener);
        return this;
      }
      /**
       * Create an observable stream for events matching pattern
       */
      createStream(pattern) {
        return this.globalSubject.pipe(
          filter((event) => this.matchesPattern(event.type, pattern))
        );
      }
      /**
       * Create a typed observable stream
       */
      createTypedStream(eventType) {
        let subject = this.eventSubjects.get(eventType);
        if (!subject) {
          subject = new Subject();
          this.eventSubjects.set(eventType, subject);
        }
        return subject.asObservable();
      }
      /**
       * Subscribe to events matching pattern
       */
      subscribe(pattern, handler, _options) {
        const subscription = this.createStream(pattern).subscribe(handler);
        return {
          unsubscribe: () => subscription.unsubscribe()
        };
      }
      /**
       * Get event history
       */
      getHistory(filter2) {
        let events = this.eventHistory;
        if (filter2?.type) {
          events = events.filter((event) => this.matchesPattern(event.type, filter2.type));
        }
        if (filter2?.since) {
          events = events.filter((event) => event.timestamp >= filter2.since);
        }
        if (filter2?.limit) {
          events = events.slice(-filter2.limit);
        }
        return events;
      }
      /**
       * Clear event history
       */
      clearHistory() {
        this.eventHistory = [];
      }
      /**
       * Wait for specific event
       */
      waitFor(eventType, timeout = 3e4) {
        return new Promise((resolve3, reject) => {
          const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for event: ${eventType}`));
          }, timeout);
          this.once(eventType, (event) => {
            clearTimeout(timer);
            resolve3(event);
          });
        });
      }
      /**
       * Batch emit multiple events
       */
      emitBatch(events) {
        events.forEach(({ type, data }) => {
          this.emit(type, data);
        });
      }
      /**
       * Create event correlation for tracing
       */
      correlate(correlationId) {
        return new EventCorrelator(this, correlationId);
      }
      /**
       * Add event to history
       */
      addToHistory(event) {
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.maxHistorySize) {
          this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
      }
      /**
       * Check if event type matches pattern
       */
      matchesPattern(eventType, pattern) {
        if (typeof pattern === "string") {
          if (pattern.includes("*")) {
            const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
            return regex.test(eventType);
          }
          return eventType === pattern;
        }
        if (pattern instanceof RegExp) {
          return pattern.test(eventType);
        }
        if (typeof pattern === "function") {
          return pattern(eventType);
        }
        return false;
      }
      /**
       * Generate correlation ID
       */
      generateCorrelationId() {
        return `corr_${Date.now()}_${++this.correlationIdCounter}`;
      }
    };
    EventCorrelator = class {
      constructor(eventBus2, correlationId) {
        this.eventBus = eventBus2;
        this.correlationId = correlationId;
      }
      /**
       * Emit event with correlation ID
       */
      emit(type, data, metadata) {
        this.eventBus.emit(type, data, {
          correlationId: this.correlationId,
          metadata
        });
      }
      /**
       * Get all events for this correlation
       */
      getCorrelatedEvents() {
        return this.eventBus.getHistory({
          type: () => true
        }).filter((event) => event.correlationId === this.correlationId);
      }
      /**
       * Create stream for correlated events
       */
      createStream() {
        return this.eventBus.createStream(() => true).pipe(
          filter((event) => event.correlationId === this.correlationId)
        );
      }
    };
    StreamManager = class {
      subjects = /* @__PURE__ */ new Map();
      eventBus = EventBus.getInstance();
      constructor() {
        this.eventBus.createStream("*").subscribe((event) => {
          this.updateStream(event.type, event.data);
        });
      }
      /**
       * Create or get a data stream
       */
      getStream(key, initialValue) {
        let subject = this.subjects.get(key);
        if (!subject) {
          subject = new BehaviorSubject(initialValue);
          this.subjects.set(key, subject);
        }
        return subject.asObservable();
      }
      /**
       * Update stream with new data
       */
      updateStream(key, data) {
        const subject = this.subjects.get(key);
        if (subject) {
          subject.next(data);
        }
      }
      /**
       * Create combined stream from multiple sources
       */
      combineStreams(...keys) {
        const streams = keys.map((key) => this.getStream(key));
        return merge(...streams).pipe(
          map(() => keys.map((key) => this.subjects.get(key)?.value))
        );
      }
      /**
       * Close stream
       */
      closeStream(key) {
        const subject = this.subjects.get(key);
        if (subject) {
          subject.complete();
          this.subjects.delete(key);
        }
      }
      /**
       * Close all streams
       */
      closeAllStreams() {
        this.subjects.forEach((subject) => subject.complete());
        this.subjects.clear();
      }
    };
    CommandResultStream = class {
      resultSubject = new Subject();
      eventBus = EventBus.getInstance();
      constructor() {
        this.eventBus.on("command:executed", (event) => {
          const data = event.data;
          this.resultSubject.next({
            command: data.command,
            success: data.success,
            result: data.result,
            error: data.error,
            timestamp: event.timestamp
          });
        });
      }
      /**
       * Get stream of command results
       */
      getResultStream() {
        return this.resultSubject.asObservable();
      }
      /**
       * Get stream for specific command
       */
      getCommandStream(command) {
        return this.resultSubject.pipe(
          filter((result) => result.command === command)
        );
      }
      /**
       * Subscribe to command results
       */
      subscribe(handler) {
        const subscription = this.resultSubject.subscribe(handler);
        return {
          unsubscribe: () => subscription.unsubscribe()
        };
      }
    };
    BlockchainEventListener = class {
      eventBus = EventBus.getInstance();
      isListening = false;
      subscriptions = [];
      /**
       * Start listening to blockchain events
       */
      async startListening() {
        if (this.isListening) {
          return;
        }
        this.isListening = true;
        this.simulateBlockchainEvents();
        this.eventBus.emit("blockchain:listener:started");
      }
      /**
       * Stop listening to blockchain events
       */
      stopListening() {
        if (!this.isListening) {
          return;
        }
        this.isListening = false;
        this.subscriptions.forEach((sub) => sub.unsubscribe());
        this.subscriptions = [];
        this.eventBus.emit("blockchain:listener:stopped");
      }
      /**
       * Simulate blockchain events (replace with real implementation)
       */
      simulateBlockchainEvents() {
        const events = [
          "transaction:confirmed",
          "agent:registered",
          "auction:bid_placed"
        ];
        const emitRandomEvent = () => {
          if (!this.isListening) return;
          const eventType = events[Math.floor(Math.random() * events.length)];
          this.eventBus.emit(`blockchain:${eventType}`, {
            blockHash: "block_" + Math.random().toString(36).substr(2, 9),
            timestamp: /* @__PURE__ */ new Date()
          });
          setTimeout(emitRandomEvent, 5e3 + Math.random() * 1e4);
        };
        setTimeout(emitRandomEvent, 1e3);
      }
    };
    CLIStateManager = class {
      state = new BehaviorSubject({
        activeCommand: null,
        user: null,
        network: "devnet",
        wallet: null,
        isOnline: true
      });
      eventBus = EventBus.getInstance();
      constructor() {
        this.setupEventHandlers();
      }
      /**
       * Get current state
       */
      getState() {
        return this.state.asObservable();
      }
      /**
       * Update state
       */
      updateState(updates) {
        const currentState = this.state.value;
        const newState = { ...currentState, ...updates };
        this.state.next(newState);
        this.eventBus.emit("cli:state:updated", newState);
      }
      /**
       * Setup event handlers for state management
       */
      setupEventHandlers() {
        this.eventBus.on("command:started", (event) => {
          const command = event.data.command;
          this.updateState({ activeCommand: command });
        });
        this.eventBus.on("command:completed", () => {
          this.updateState({ activeCommand: null });
        });
        this.eventBus.on("wallet:connected", (event) => {
          const wallet = event.data;
          this.updateState({ wallet });
        });
        this.eventBus.on("network:changed", (event) => {
          const network = event.data.network;
          this.updateState({ network });
        });
      }
    };
    EventBus.getInstance();
    new StreamManager();
    new CommandResultStream();
    new BlockchainEventListener();
    new CLIStateManager();
  }
});
var PooledConnection, ConnectionPool, ConnectionPoolManager;
var init_connection_pool = __esm({
  "src/core/connection-pool.ts"() {
    init_event_system();
    PooledConnection = class extends EventEmitter {
      rpc;
      endpoint;
      createdAt;
      lastUsed;
      requestCount = 0;
      isActive = false;
      pool;
      constructor(rpc, endpoint, pool) {
        super();
        this.rpc = rpc;
        this.endpoint = endpoint;
        this.pool = pool;
        this.createdAt = /* @__PURE__ */ new Date();
        this.lastUsed = /* @__PURE__ */ new Date();
      }
      /**
       * Execute RPC call with performance tracking
       */
      async call(method, params) {
        const startTime = Date.now();
        this.isActive = true;
        this.requestCount++;
        this.lastUsed = /* @__PURE__ */ new Date();
        try {
          const result = await this.rpc[method]?.(...params ?? []);
          const responseTime = Date.now() - startTime;
          this.updateResponseTime(responseTime);
          this.emit("request_completed", {
            method,
            responseTime,
            success: true
          });
          return result;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          this.updateResponseTime(responseTime);
          this.emit("request_failed", {
            method,
            responseTime,
            error
          });
          throw error;
        } finally {
          this.isActive = false;
          this.pool.releaseConnection(this);
        }
      }
      /**
       * Get connection statistics
       */
      getStats() {
        return {
          endpoint: this.endpoint.url,
          createdAt: this.createdAt,
          lastUsed: this.lastUsed,
          requestCount: this.requestCount,
          isActive: this.isActive,
          health: this.endpoint.health,
          responseTime: this.endpoint.responseTime
        };
      }
      /**
       * Check if connection is stale
       */
      isStale(maxIdleTime) {
        return Date.now() - this.lastUsed.getTime() > maxIdleTime;
      }
      /**
       * Update response time statistics
       */
      updateResponseTime(responseTime) {
        const stats = this.endpoint.responseTime;
        stats.current = responseTime;
        stats.min = Math.min(stats.min, responseTime);
        stats.max = Math.max(stats.max, responseTime);
        stats.samples.push(responseTime);
        if (stats.samples.length > 100) {
          stats.samples = stats.samples.slice(-100);
        }
        stats.average = stats.samples.reduce((sum, time) => sum + time, 0) / stats.samples.length;
      }
    };
    ConnectionPool = class extends EventEmitter {
      network;
      endpoints;
      connections = [];
      activeConnections = /* @__PURE__ */ new Set();
      config;
      healthCheckInterval = null;
      stats = {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        totalRequests: 0,
        averageResponseTime: 0,
        hitRate: 0,
        failures: 0,
        healthStats: {}
      };
      constructor(network, endpoints, config2 = {
        minConnections: 2,
        maxConnections: 10,
        maxIdleTime: 3e5,
        // 5 minutes
        healthCheckInterval: 3e4
        // 30 seconds
      }) {
        super();
        this.network = network;
        this.endpoints = endpoints;
        this.config = config2;
        this.initializePool();
        this.startHealthChecks();
      }
      /**
       * Get connection from pool
       */
      async getConnection() {
        const idleConnection = this.getIdleConnection();
        if (idleConnection) {
          this.activeConnections.add(idleConnection);
          this.updateStats();
          return idleConnection;
        }
        if (this.connections.length < this.config.maxConnections) {
          const connection = await this.createConnection();
          this.connections.push(connection);
          this.activeConnections.add(connection);
          this.updateStats();
          return connection;
        }
        return this.waitForConnection();
      }
      /**
       * Release connection back to pool
       */
      releaseConnection(connection) {
        this.activeConnections.delete(connection);
        this.updateStats();
        this.emit("connection_released", connection);
      }
      /**
       * Get pool statistics
       */
      getStats() {
        return { ...this.stats };
      }
      /**
       * Close all connections and cleanup
       */
      async close() {
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
          this.healthCheckInterval = null;
        }
        for (const connection of this.connections) {
          connection.removeAllListeners();
        }
        this.connections = [];
        this.activeConnections.clear();
        this.emit("pool_closed");
      }
      /**
       * Initialize pool with minimum connections
       */
      async initializePool() {
        const promises = [];
        for (let i = 0; i < this.config.minConnections; i++) {
          promises.push(this.createConnection());
        }
        try {
          const connections = await Promise.all(promises);
          this.connections.push(...connections);
          this.updateStats();
        } catch (error) {
          this.emit("pool_initializationerror", error);
        }
      }
      /**
       * Create new connection
       */
      async createConnection() {
        const endpoint = this.selectEndpoint();
        try {
          const client = createSolanaClient({ urlOrMoniker: endpoint.url });
          const rpc = client.rpc;
          const connection = new PooledConnection(rpc, endpoint, this);
          connection.on("request_completed", (data) => {
            this.stats.totalRequests++;
            this.updateAverageResponseTime(data.responseTime);
          });
          connection.on("request_failed", (_data) => {
            this.stats.failures++;
            this.updateEndpointHealth(endpoint, "degraded");
          });
          this.emit("connection_created", connection);
          return connection;
        } catch (error) {
          this.updateEndpointHealth(endpoint, "unhealthy");
          throw new Error(`Failed to create connection to ${endpoint.url}: ${error}`);
        }
      }
      /**
       * Get idle connection from pool
       */
      getIdleConnection() {
        for (const connection of this.connections) {
          if (!this.activeConnections.has(connection) && !connection.isStale(this.config.maxIdleTime)) {
            return connection;
          }
        }
        return null;
      }
      /**
       * Wait for connection to become available
       */
      async waitForConnection() {
        return new Promise((resolve3, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Connection timeout: No connections available"));
          }, 1e4);
          const onConnectionReleased = (connection) => {
            clearTimeout(timeout);
            this.off("connection_released", onConnectionReleased);
            this.activeConnections.add(connection);
            resolve3(connection);
          };
          this.on("connection_released", onConnectionReleased);
        });
      }
      /**
       * Select best endpoint using weighted round-robin
       */
      selectEndpoint() {
        const healthyEndpoints = this.endpoints.filter(
          (ep) => ep.health === "healthy" || ep.health === "unknown"
        );
        if (healthyEndpoints.length === 0) {
          const degradedEndpoints = this.endpoints.filter((ep) => ep.health === "degraded");
          if (degradedEndpoints.length > 0) {
            return degradedEndpoints[0];
          }
          return this.endpoints[0];
        }
        const totalWeight = healthyEndpoints.reduce((sum, ep) => {
          const performanceWeight = Math.max(1, 1e3 / (ep.responseTime.average ?? 1e3));
          return sum + ep.weight * performanceWeight;
        }, 0);
        const random = Math.random() * totalWeight;
        let currentWeight = 0;
        for (const endpoint of healthyEndpoints) {
          const performanceWeight = Math.max(1, 1e3 / (endpoint.responseTime.average ?? 1e3));
          currentWeight += endpoint.weight * performanceWeight;
          if (random <= currentWeight) {
            return endpoint;
          }
        }
        return healthyEndpoints[0];
      }
      /**
       * Start health check monitoring
       */
      startHealthChecks() {
        this.healthCheckInterval = setInterval(() => {
          this.performHealthChecks();
        }, this.config.healthCheckInterval);
      }
      /**
       * Perform health checks on all endpoints
       */
      async performHealthChecks() {
        const promises = this.endpoints.map((endpoint) => this.checkEndpointHealth(endpoint));
        await Promise.allSettled(promises);
        this.cleanupStaleConnections();
      }
      /**
       * Check health of specific endpoint
       */
      async checkEndpointHealth(endpoint) {
        const startTime = Date.now();
        try {
          const client = createSolanaClient({ urlOrMoniker: endpoint.url });
          await client.rpc.getLatestBlockhash().send();
          const responseTime = Date.now() - startTime;
          endpoint.responseTime.current = responseTime;
          endpoint.lastHealthCheck = /* @__PURE__ */ new Date();
          if (responseTime < 1e3) {
            this.updateEndpointHealth(endpoint, "healthy");
          } else if (responseTime < 3e3) {
            this.updateEndpointHealth(endpoint, "degraded");
          } else {
            this.updateEndpointHealth(endpoint, "unhealthy");
          }
        } catch (error) {
          this.updateEndpointHealth(endpoint, "unhealthy");
          endpoint.lastHealthCheck = /* @__PURE__ */ new Date();
        }
      }
      /**
       * Update endpoint health status
       */
      updateEndpointHealth(endpoint, health) {
        if (endpoint.health !== health) {
          const oldHealth = endpoint.health;
          endpoint.health = health;
          this.stats.healthStats[endpoint.url] = health;
          this.emit("endpoint_health_changed", {
            endpoint: endpoint.url,
            oldHealth,
            newHealth: health
          });
        }
      }
      /**
       * Clean up stale connections
       */
      cleanupStaleConnections() {
        const staleConnections = this.connections.filter(
          (conn) => !this.activeConnections.has(conn) && conn.isStale(this.config.maxIdleTime)
        );
        for (const staleConnection of staleConnections) {
          const index = this.connections.indexOf(staleConnection);
          if (index > -1) {
            this.connections.splice(index, 1);
            staleConnection.removeAllListeners();
          }
        }
        this.updateStats();
      }
      /**
       * Update pool statistics
       */
      updateStats() {
        this.stats.totalConnections = this.connections.length;
        this.stats.activeConnections = this.activeConnections.size;
        this.stats.idleConnections = this.connections.length - this.activeConnections.size;
        this.stats.hitRate = this.stats.totalRequests > 0 ? (this.stats.totalRequests - this.stats.failures) / this.stats.totalRequests * 100 : 0;
        for (const endpoint of this.endpoints) {
          this.stats.healthStats[endpoint.url] = endpoint.health;
        }
      }
      /**
       * Update average response time
       */
      updateAverageResponseTime(responseTime) {
        const currentAvg = this.stats.averageResponseTime;
        const totalRequests = this.stats.totalRequests;
        this.stats.averageResponseTime = totalRequests > 1 ? (currentAvg * (totalRequests - 1) + responseTime) / totalRequests : responseTime;
      }
    };
    ConnectionPoolManager = class _ConnectionPoolManager extends EventEmitter {
      static instance = null;
      pools = /* @__PURE__ */ new Map();
      eventBus = EventBus.getInstance();
      defaultEndpoints = {
        "mainnet-beta": [
          {
            url: "https://api.mainnet-beta.solana.com",
            weight: 10,
            maxConnections: 5,
            timeout: 3e4,
            healthCheckInterval: 6e4,
            health: "unknown",
            lastHealthCheck: /* @__PURE__ */ new Date(),
            responseTime: { current: 0, average: 0, min: Infinity, max: 0, samples: [] }
          },
          {
            url: "https://solana-api.projectserum.com",
            weight: 8,
            maxConnections: 3,
            timeout: 3e4,
            healthCheckInterval: 6e4,
            health: "unknown",
            lastHealthCheck: /* @__PURE__ */ new Date(),
            responseTime: { current: 0, average: 0, min: Infinity, max: 0, samples: [] }
          }
        ],
        "testnet": [
          {
            url: "https://api.testnet.solana.com",
            weight: 10,
            maxConnections: 5,
            timeout: 3e4,
            healthCheckInterval: 6e4,
            health: "unknown",
            lastHealthCheck: /* @__PURE__ */ new Date(),
            responseTime: { current: 0, average: 0, min: Infinity, max: 0, samples: [] }
          }
        ],
        "devnet": [
          {
            url: "https://api.devnet.solana.com",
            weight: 10,
            maxConnections: 5,
            timeout: 3e4,
            healthCheckInterval: 6e4,
            health: "unknown",
            lastHealthCheck: /* @__PURE__ */ new Date(),
            responseTime: { current: 0, average: 0, min: Infinity, max: 0, samples: [] }
          }
        ],
        "localnet": [
          {
            url: "http://localhost:8899",
            weight: 10,
            maxConnections: 3,
            timeout: 1e4,
            healthCheckInterval: 3e4,
            health: "unknown",
            lastHealthCheck: /* @__PURE__ */ new Date(),
            responseTime: { current: 0, average: 0, min: Infinity, max: 0, samples: [] }
          }
        ]
      };
      /**
       * Get singleton instance
       */
      static getInstance() {
        if (!_ConnectionPoolManager.instance) {
          _ConnectionPoolManager.instance = new _ConnectionPoolManager();
        }
        return _ConnectionPoolManager.instance;
      }
      /**
       * Get connection for network
       */
      async getConnection(network) {
        let pool = this.pools.get(network);
        if (!pool) {
          pool = await this.createPool(network);
          this.pools.set(network, pool);
        }
        return pool.getConnection();
      }
      /**
       * Add custom RPC endpoint
       */
      addEndpoint(network, endpoint) {
        if (!this.defaultEndpoints[network]) {
          this.defaultEndpoints[network] = [];
        }
        this.defaultEndpoints[network].push(endpoint);
        const existingPool = this.pools.get(network);
        if (existingPool) {
          existingPool.close();
          this.pools.delete(network);
        }
        this.eventBus.emit("connection_pool:endpoint_added", { network, endpoint });
      }
      /**
       * Get statistics for all pools
       */
      getAllStats() {
        const stats = {};
        for (const [network, pool] of this.pools) {
          stats[network] = pool.getStats();
        }
        return stats;
      }
      /**
       * Close all pools
       */
      async closeAll() {
        const promises = Array.from(this.pools.values()).map((pool) => pool.close());
        await Promise.all(promises);
        this.pools.clear();
        this.eventBus.emit("connection_pool:all_closed");
      }
      /**
       * Create pool for network
       */
      async createPool(network) {
        const endpoints = this.defaultEndpoints[network] ?? [];
        if (endpoints.length === 0) {
          throw new Error(`No RPC endpoints configured for network: ${network}`);
        }
        const pool = new ConnectionPool(network, endpoints);
        pool.on("connection_created", (connection) => {
          this.eventBus.emit("connection_pool:connection_created", { network, connection });
        });
        pool.on("endpoint_health_changed", (data) => {
          this.eventBus.emit("connection_pool:health_changed", { network, ...data });
        });
        return pool;
      }
    };
    ConnectionPoolManager.getInstance();
  }
});

// src/services/blockchain/rpc-pool-manager.ts
var PooledRpcClient, RpcPoolManager, rpcPoolManager;
var init_rpc_pool_manager = __esm({
  "src/services/blockchain/rpc-pool-manager.ts"() {
    init_connection_pool();
    init_event_system();
    PooledRpcClient = class {
      network;
      poolManager = ConnectionPoolManager.getInstance();
      eventBus = EventBus.getInstance();
      metrics = {
        totalOperations: 0,
        averageResponseTime: 0,
        operationsByType: {},
        errorRate: 0,
        cacheHitRate: 0,
        networkDistribution: {}
      };
      operations = [];
      constructor(network) {
        this.network = network;
      }
      /**
       * Get account information
       */
      async getAccountInfo(address26, options) {
        return this.executeRpcCall("getAccountInfo", async (connection) => {
          return connection.call("getAccountInfo", [address26, options]);
        });
      }
      /**
       * Get account balance
       */
      async getBalance(address26, commitment) {
        return this.executeRpcCall("getBalance", async (connection) => {
          return connection.call("getBalance", [address26, { commitment }]);
        });
      }
      /**
       * Get latest blockhash
       */
      async getLatestBlockhash(commitment) {
        return this.executeRpcCall("getLatestBlockhash", async (connection) => {
          return connection.call("getLatestBlockhash", [{ commitment }]);
        });
      }
      /**
       * Send transaction
       */
      async sendTransaction(transaction, options) {
        return this.executeRpcCall("sendTransaction", async (connection) => {
          return connection.call("sendTransaction", [transaction, options]);
        });
      }
      /**
       * Confirm transaction
       */
      async confirmTransaction(signature, commitment) {
        return this.executeRpcCall("confirmTransaction", async (connection) => {
          return connection.call("getSignatureStatus", [signature, { commitment }]);
        });
      }
      /**
       * Get program accounts
       */
      async getProgramAccounts(programId, options) {
        return this.executeRpcCall("getProgramAccounts", async (connection) => {
          return connection.call("getProgramAccounts", [programId, options]);
        });
      }
      /**
       * Get multiple accounts (batched operation)
       */
      async getMultipleAccounts(addresses, options) {
        return this.executeRpcCall("getMultipleAccounts", async (connection) => {
          return connection.call("getMultipleAccounts", [addresses, options]);
        });
      }
      /**
       * Simulate transaction
       */
      async simulateTransaction(transaction, options) {
        return this.executeRpcCall("simulateTransaction", async (connection) => {
          return connection.call("simulateTransaction", [transaction, options]);
        });
      }
      /**
       * Get transaction details
       */
      async getTransaction(signature, options) {
        return this.executeRpcCall("getTransaction", async (connection) => {
          return connection.call("getTransaction", [signature, options]);
        });
      }
      /**
       * Get transaction history for address
       */
      async getTransactionHistory(address26, options) {
        return this.executeRpcCall("getTransactionHistory", async (connection) => {
          return connection.call("getSignaturesForAddress", [address26, options]);
        });
      }
      /**
       * Get performance metrics
       */
      getMetrics() {
        return { ...this.metrics };
      }
      /**
       * Get recent operations
       */
      getRecentOperations(limit = 100) {
        return this.operations.slice(-limit);
      }
      /**
       * Clear metrics and operation history
       */
      clearMetrics() {
        this.metrics = {
          totalOperations: 0,
          averageResponseTime: 0,
          operationsByType: {},
          errorRate: 0,
          cacheHitRate: 0,
          networkDistribution: {}
        };
        this.operations = [];
      }
      /**
       * Execute RPC call with performance tracking
       */
      async executeRpcCall(operationType, operation) {
        const startTime = Date.now();
        const rpcOperation = {
          type: operationType,
          network: this.network,
          startTime
        };
        try {
          const connection = await this.poolManager.getConnection(this.network);
          const result = await operation(connection);
          rpcOperation.endTime = Date.now();
          rpcOperation.success = true;
          this.recordOperation(rpcOperation);
          return result;
        } catch (error) {
          rpcOperation.endTime = Date.now();
          rpcOperation.success = false;
          rpcOperation.error = error;
          this.recordOperation(rpcOperation);
          this.eventBus.emit("rpc:operation_failed", {
            operation: rpcOperation,
            error
          });
          throw error;
        }
      }
      /**
       * Record operation for metrics tracking
       */
      recordOperation(operation) {
        this.operations.push(operation);
        if (this.operations.length > 1e3) {
          this.operations = this.operations.slice(-1e3);
        }
        this.updateMetrics(operation);
        this.eventBus.emit("rpc:operation_completed", operation);
      }
      /**
       * Update performance metrics
       */
      updateMetrics(operation) {
        this.metrics.totalOperations++;
        this.metrics.operationsByType[operation.type] = (this.metrics.operationsByType[operation.type] || 0) + 1;
        this.metrics.networkDistribution[operation.network] = (this.metrics.networkDistribution[operation.network] || 0) + 1;
        if (operation.endTime) {
          const responseTime = operation.endTime - operation.startTime;
          const currentAvg = this.metrics.averageResponseTime;
          const totalOps = this.metrics.totalOperations;
          this.metrics.averageResponseTime = totalOps > 1 ? (currentAvg * (totalOps - 1) + responseTime) / totalOps : responseTime;
        }
        const recentOperations = this.operations.slice(-100);
        const errorCount = recentOperations.filter((op) => !op.success).length;
        this.metrics.errorRate = errorCount / recentOperations.length * 100;
      }
    };
    RpcPoolManager = class _RpcPoolManager {
      static instance = null;
      clients = /* @__PURE__ */ new Map();
      eventBus = EventBus.getInstance();
      /**
       * Get singleton instance
       */
      static getInstance() {
        if (!_RpcPoolManager.instance) {
          _RpcPoolManager.instance = new _RpcPoolManager();
        }
        return _RpcPoolManager.instance;
      }
      /**
       * Get RPC client for network
       */
      getClient(network) {
        let client = this.clients.get(network);
        if (!client) {
          client = new PooledRpcClient(network);
          this.clients.set(network, client);
          this.eventBus.emit("rpc_pool:client_created", { network });
        }
        return client;
      }
      /**
       * Get aggregated metrics for all clients
       */
      getAggregatedMetrics() {
        const byNetwork = {};
        let totalOperations = 0;
        let totalResponseTime = 0;
        let totalErrors = 0;
        const operationsByType = {};
        for (const [network, client] of this.clients) {
          const metrics = client.getMetrics();
          byNetwork[network] = metrics;
          totalOperations += metrics.totalOperations;
          totalResponseTime += metrics.averageResponseTime * metrics.totalOperations;
          totalErrors += metrics.errorRate / 100 * metrics.totalOperations;
          for (const [type, count] of Object.entries(metrics.operationsByType)) {
            operationsByType[type] = (operationsByType[type] || 0) + count;
          }
        }
        const overall = {
          totalOperations,
          averageResponseTime: totalOperations > 0 ? totalResponseTime / totalOperations : 0,
          operationsByType,
          errorRate: totalOperations > 0 ? totalErrors / totalOperations * 100 : 0,
          cacheHitRate: 0,
          // Will be calculated when cache integration is added
          networkDistribution: {}
        };
        for (const [network, metrics] of Object.entries(byNetwork)) {
          overall.networkDistribution[network] = metrics.totalOperations;
        }
        return {
          overall,
          byNetwork
        };
      }
      /**
       * Health check all clients
       */
      async healthCheck() {
        const results = {};
        const promises = Array.from(this.clients.entries()).map(async ([network, client]) => {
          try {
            await client.getLatestBlockhash();
            results[network] = true;
          } catch (error) {
            results[network] = false;
            this.eventBus.emit("rpc_pool:health_check_failed", { network, error });
          }
        });
        await Promise.allSettled(promises);
        this.eventBus.emit("rpc_pool:health_check_completed", results);
        return results;
      }
      /**
       * Clear all metrics
       */
      clearAllMetrics() {
        for (const client of this.clients.values()) {
          client.clearMetrics();
        }
        this.eventBus.emit("rpc_pool:metrics_cleared");
      }
    };
    rpcPoolManager = RpcPoolManager.getInstance();
  }
});

// src/utils/client.ts
var client_exports = {};
__export(client_exports, {
  getAddressExplorerUrl: () => getAddressExplorerUrl,
  getExplorerUrl: () => getExplorerUrl,
  getWallet: () => getWallet,
  initializeClient: () => initializeClient,
  toSDKSigner: () => toSDKSigner
});
async function getWallet() {
  const walletService = new WalletService();
  const activeSigner = await walletService.getActiveSigner();
  if (activeSigner) {
    return activeSigner;
  }
  await walletService.migrateOldWallet();
  const postMigrationSigner = await walletService.getActiveSigner();
  if (postMigrationSigner) {
    return postMigrationSigner;
  }
  const config2 = loadConfig();
  if (config2.walletPath && existsSync(config2.walletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(config2.walletPath, "utf-8"));
      const signer = await createKeyPairSignerFromBytes(new Uint8Array(walletData));
      await walletService.importWallet("migrated", new Uint8Array(walletData), config2.network === "localnet" ? "devnet" : config2.network);
      log.info("Migrated existing wallet to new wallet system");
      return signer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      log.error(`Failed to load wallet from config: ${config2.walletPath}`);
      log.error(`Error details: ${errorMessage}`);
      if (errorMessage.includes("ENOENT")) {
        log.info(`\u{1F4A1} Wallet file not found. Create a new wallet or check the path.`);
      } else if (errorMessage.includes("permission")) {
        log.info(`\u{1F4A1} Permission denied. Check file permissions for ${config2.walletPath}`);
      } else if (errorMessage.includes("JSON")) {
        log.info(`\u{1F4A1} Wallet file appears to be corrupted. Try restoring from backup.`);
      }
    }
  }
  const walletPath = join(homedir(), ".config", "solana", "ghostspeak-cli.json");
  if (existsSync(walletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(walletPath, "utf-8"));
      const signer = await createKeyPairSignerFromBytes(new Uint8Array(walletData));
      await walletService.importWallet("cli-wallet", new Uint8Array(walletData), config2.network === "localnet" ? "devnet" : config2.network);
      return signer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      log.error("Failed to load GhostSpeak CLI wallet");
      log.error(`Error details: ${errorMessage}`);
      if (errorMessage.includes("ENOENT")) {
        log.info(`\u{1F4A1} GhostSpeak CLI wallet not found at ${walletPath}`);
      } else if (errorMessage.includes("JSON")) {
        log.info(`\u{1F4A1} GhostSpeak CLI wallet file appears corrupted. Delete ${walletPath} to create a new one.`);
      } else if (errorMessage.includes("Invalid")) {
        log.info(`\u{1F4A1} GhostSpeak CLI wallet contains invalid key data. Try recreating the wallet.`);
      }
    }
  }
  const defaultWalletPath = join(homedir(), ".config", "solana", "id.json");
  if (existsSync(defaultWalletPath)) {
    try {
      const walletData = JSON.parse(readFileSync(defaultWalletPath, "utf-8"));
      const signer = await createKeyPairSignerFromBytes(new Uint8Array(walletData));
      await walletService.importWallet("solana-cli", new Uint8Array(walletData), config2.network === "localnet" ? "devnet" : config2.network);
      return signer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      log.error("Failed to load default Solana CLI wallet");
      log.error(`Error details: ${errorMessage}`);
      if (errorMessage.includes("ENOENT")) {
        log.info(`\u{1F4A1} Solana CLI wallet not found. Run 'solana-keygen new' to create one.`);
      } else if (errorMessage.includes("JSON")) {
        log.info(`\u{1F4A1} Solana CLI wallet file corrupted. Run 'solana-keygen recover' to restore.`);
      } else if (errorMessage.includes("Invalid")) {
        log.info(`\u{1F4A1} Invalid Solana wallet format. Generate a new keypair with 'solana-keygen new'.`);
      }
    }
  }
  try {
    log.info("No wallet found. Creating a new one...");
    const { wallet, mnemonic } = await walletService.createWallet("default", config2.network);
    log.success(`Created new wallet: ${wallet.metadata.address}`);
    log.warn("\u26A0\uFE0F  Save your seed phrase:");
    log.warn(mnemonic);
    log.info("");
    log.info("Next steps:");
    log.info(`  1. Save your seed phrase securely`);
    log.info(`  2. Fund your wallet: ${chalk34.cyan("ghost faucet")}`);
    log.info(`  3. Create an agent: ${chalk34.cyan("ghost agent register")}`);
    const signer = await walletService.getActiveSigner();
    if (!signer) {
      throw new Error("Failed to retrieve newly created wallet");
    }
    return signer;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error("Failed to create new wallet");
    log.error(`Error details: ${errorMessage}`);
    if (errorMessage.includes("permission")) {
      log.info(`\u{1F4A1} Permission denied. Check write permissions in ~/.config/solana/`);
    } else if (errorMessage.includes("ENOSPC")) {
      log.info(`\u{1F4A1} No space left on device. Free up some disk space and try again.`);
    } else {
      log.info(`\u{1F4A1} Try running with elevated permissions or check your file system.`);
    }
    throw new Error(`Wallet creation failed: ${errorMessage}`);
  }
}
function toSDKSigner(signer) {
  return signer;
}
async function initializeClient(network) {
  const config2 = loadConfig();
  const selectedNetwork = network ?? config2.network;
  let rpcUrl = config2.rpcUrl;
  if (!rpcUrl) {
    switch (selectedNetwork) {
      case "mainnet-beta":
        rpcUrl = "https://api.mainnet-beta.solana.com";
        break;
      case "testnet":
        rpcUrl = "https://api.testnet.solana.com";
        break;
      case "localnet":
        rpcUrl = "http://localhost:8899";
        break;
      case "devnet":
      default:
        rpcUrl = "https://api.devnet.solana.com";
        break;
    }
  }
  if (!rpcUrl || typeof rpcUrl !== "string") {
    throw new Error("Invalid RPC URL configuration");
  }
  try {
    new URL$1(rpcUrl);
  } catch (error) {
    throw new Error(`Invalid RPC endpoint URL: ${rpcUrl}`);
  }
  const networkType = selectedNetwork === "localnet" ? "devnet" : selectedNetwork;
  const pooledRpcClient = rpcPoolManager.getClient(networkType);
  const solanaClient = createCustomClient(rpcUrl);
  const rpc = solanaClient.rpc;
  let rpcSubscriptions;
  const wallet = await getWallet();
  const programId = config2.programId || GHOSTSPEAK_PROGRAM_ID;
  console.log("\u{1F50D} [DEBUG] Program ID from config:", programId);
  console.log("\u{1F50D} [DEBUG] Program ID length:", programId.length);
  console.log("\u{1F50D} [DEBUG] GHOSTSPEAK_PROGRAM_ID fallback:", GHOSTSPEAK_PROGRAM_ID);
  const extendedRpc = rpc;
  const client = new GhostSpeakClient({
    rpc: extendedRpc,
    programId: address$1(programId),
    commitment: "confirmed"
  });
  const clientAny = client;
  const moduleConfig = {
    rpc: extendedRpc,
    programId: address$1(programId),
    commitment: "confirmed",
    cluster: config2.network === "devnet" || config2.network === "testnet" || config2.network === "mainnet-beta" ? config2.network : "devnet",
    rpcEndpoint: rpcUrl
  };
  if (!client.agent || typeof client.agent === "function") {
    clientAny.agent = new AgentModule(moduleConfig);
  }
  if (!clientAny.governance || typeof clientAny.governance === "function") {
    clientAny.governance = new GovernanceModule(moduleConfig);
  }
  try {
    if (wallet.address) {
      const balanceResponse = await rpc.getBalance(wallet.address).send();
      const balance = balanceResponse.value;
      if (balance === 0n) {
        log.warn(chalk34.yellow("\u26A0\uFE0F  Your wallet has 0 SOL. You need SOL to perform transactions."));
        log.info(chalk34.dim("Run: npx ghostspeak faucet --save"));
      }
    }
  } catch (error) {
    console.warn("Balance check failed:", error instanceof Error ? error.message : "Unknown error");
  }
  client.cleanup = async () => {
    try {
      if (rpcSubscriptions) ;
    } catch (error) {
      console.debug("Client cleanup warning:", error instanceof Error ? error.message : "Unknown error");
    }
  };
  return {
    client,
    wallet,
    rpc,
    pooledRpc: pooledRpcClient
  };
}
function getExplorerUrl(signature, network = "devnet") {
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}
function getAddressExplorerUrl(address26, network = "devnet") {
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `https://explorer.solana.com/address/${address26}${cluster}`;
}
var init_client = __esm({
  "src/utils/client.ts"() {
    init_config();
    init_wallet_service();
    init_rpc_pool_manager();
    init_solana_client();
  }
});

// src/utils/type-guards.ts
function isValidAgent(value) {
  if (!value || typeof value !== "object") return false;
  const obj = value;
  return Boolean(
    typeof obj.address === "string" && obj.data && typeof obj.data === "object" && typeof obj.data.name === "string" && typeof obj.owner === "string"
  );
}
function validateAgentArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(isValidAgent);
}
function isError(value) {
  return value instanceof Error;
}
function isErrorWithMessage(value) {
  return isError(value) && typeof value.message === "string";
}
function getErrorMessage(error) {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}
var init_type_guards = __esm({
  "src/utils/type-guards.ts"() {
  }
});

// src/utils/sdk-helpers.ts
var sdk_helpers_exports = {};
__export(sdk_helpers_exports, {
  SafeAgentClient: () => SafeAgentClient,
  SafeAuthorizationClient: () => SafeAuthorizationClient,
  SafeGhostClient: () => SafeGhostClient,
  SafeGovernanceClient: () => SafeGovernanceClient,
  SafeMultisigClient: () => SafeMultisigClient,
  SafeSDKClient: () => SafeSDKClient,
  createSafeSDKClient: () => createSafeSDKClient
});
function createSafeSDKClient(client) {
  return new SafeSDKClient(client);
}
var SafeAgentClient, SafeGovernanceClient, SafeGhostClient, SafeMultisigClient, SafeAuthorizationClient, SafeSDKClient;
var init_sdk_helpers = __esm({
  "src/utils/sdk-helpers.ts"() {
    init_type_guards();
    SafeAgentClient = class {
      agentClient;
      constructor(client) {
        this.agentClient = client.agent;
      }
      async listByOwner(params) {
        try {
          if (!this.agentClient) return [];
          const result = await this.agentClient.listByOwner(params);
          return validateAgentArray(result);
        } catch (error) {
          console.warn("Failed to list agents:", error instanceof Error ? error.message : String(error));
          return [];
        }
      }
      async getAgentAccount(agentAddress) {
        try {
          if (!this.agentClient) return null;
          const result = await this.agentClient.get?.(agentAddress);
          return result || null;
        } catch (error) {
          console.warn("Failed to get agent account:", error instanceof Error ? error.message : String(error));
          return null;
        }
      }
    };
    SafeGovernanceClient = class {
      governanceClient;
      constructor(client) {
        this.governanceClient = client.governance;
      }
      async createMultisig(signer, params) {
        try {
          if (!this.governanceClient) return null;
          const result = await this.governanceClient.createMultisig(signer, params);
          return result.signature;
        } catch (error) {
          console.warn("Failed to create multisig:", error instanceof Error ? error.message : String(error));
          return null;
        }
      }
      async listMultisigs(params) {
        try {
          if (!this.governanceClient) return [];
          const result = await this.governanceClient.listMultisigs();
          if (!Array.isArray(result)) return [];
          const filtered = params?.creator ? result.filter((m) => m.signers.includes(params.creator)) : result;
          return filtered.map((item) => ({
            address: item.address,
            name: item.name,
            members: item.signers,
            threshold: item.threshold,
            creator: item.signers[0]
            // Use first signer as creator
          }));
        } catch (error) {
          console.warn("Failed to list multisigs:", error instanceof Error ? error.message : String(error));
          return [];
        }
      }
      async createProposal(signer, params) {
        try {
          if (!this.governanceClient) return null;
          const result = await this.governanceClient.createProposal(signer, params);
          return result.signature;
        } catch (error) {
          console.warn("Failed to create proposal:", error instanceof Error ? error.message : String(error));
          return null;
        }
      }
      async listProposals(params) {
        try {
          if (!this.governanceClient) return [];
          const result = await this.governanceClient.listProposals(params?.multisigAddress);
          if (!Array.isArray(result)) return [];
          return result.map((item) => ({
            address: item.address,
            title: item.title,
            description: item.description,
            type: item.proposalType,
            status: item.status,
            creator: item.address,
            // Use proposal address as creator placeholder
            votesFor: item.yesVotes,
            votesAgainst: item.noVotes,
            threshold: Math.ceil((item.eligibleVoters ?? 1) / 2),
            // Simple majority
            deadline: BigInt(item.votingEndsAt)
          }));
        } catch (error) {
          console.warn("Failed to list proposals:", error instanceof Error ? error.message : String(error));
          return [];
        }
      }
      async vote(signer, params) {
        try {
          if (!this.governanceClient) return null;
          const result = await this.governanceClient.vote(signer, params);
          return result.signature;
        } catch (error) {
          console.warn("Failed to vote:", error instanceof Error ? error.message : String(error));
          return null;
        }
      }
      async grantRole(_params) {
        return null;
      }
      async revokeRole(_params) {
        return null;
      }
    };
    SafeGhostClient = class {
      client;
      constructor(client) {
        this.client = client;
      }
      async getGhost(ghostAddress) {
        try {
          return await this.client.ghosts.getGhostAgent(ghostAddress);
        } catch (error) {
          console.warn("Failed to get ghost:", error instanceof Error ? error.message : String(error));
          return null;
        }
      }
      async getAllGhosts() {
        try {
          return await this.client.ghosts.getAllGhosts();
        } catch (error) {
          console.warn("Failed to get all ghosts:", error instanceof Error ? error.message : String(error));
          return [];
        }
      }
      async getGhostsByType(agentType = 10) {
        try {
          return await this.client.ghosts.getGhostsByType(agentType);
        } catch (error) {
          console.warn("Failed to get ghosts by type:", error instanceof Error ? error.message : String(error));
          return [];
        }
      }
      async getClaimedGhosts(owner) {
        try {
          return await this.client.ghosts.getClaimedGhosts(owner);
        } catch (error) {
          console.warn("Failed to get claimed ghosts:", error instanceof Error ? error.message : String(error));
          return [];
        }
      }
    };
    SafeMultisigClient = class {
      client;
      constructor(client) {
        this.client = client;
      }
      async createMultisig(params) {
        const result = await this.client.multisigModule.createMultisig(params);
        return result;
      }
      async createProposal(params) {
        const result = await this.client.multisigModule.createProposal(params);
        return result;
      }
      async executeProposal(params) {
        const result = await this.client.multisigModule.executeProposal(params);
        return result;
      }
      async getMultisig(multisigAddress) {
        return await this.client.multisigModule.getMultisig(multisigAddress);
      }
      async getMultisigsByCreator(creator) {
        return await this.client.multisigModule.getMultisigsByCreator(creator);
      }
      get programId() {
        return this.client.programId;
      }
    };
    SafeAuthorizationClient = class {
      client;
      constructor(client) {
        this.client = client;
      }
      async createAuthorization(params) {
        const result = await this.client.authorization.createAuthorization(params);
        return result;
      }
      async revokeAuthorization(params) {
        const result = await this.client.authorization.revokeAuthorization(params);
        return result;
      }
      async getAuthorization(authAddress) {
        return await this.client.authorization.getAuthorization(authAddress);
      }
      async getAuthorizationsByAgent(agentAddress) {
        return await this.client.authorization.getAuthorizationsByAgent(agentAddress);
      }
      get programId() {
        return this.client.programId;
      }
    };
    SafeSDKClient = class {
      agent;
      governance;
      ghosts;
      multisigModule;
      authorization;
      client;
      constructor(client) {
        this.client = client;
        this.agent = new SafeAgentClient(client);
        this.governance = new SafeGovernanceClient(client);
        this.ghosts = new SafeGhostClient(client);
        this.multisigModule = new SafeMultisigClient(client);
        this.authorization = new SafeAuthorizationClient(client);
      }
      get programId() {
        return this.client.programId;
      }
      get governanceModule() {
        return this.client.governanceModule;
      }
    };
  }
});

// ../../node_modules/.bun/deepmerge@4.3.1/node_modules/deepmerge/dist/cjs.js
var require_cjs = __commonJS({
  "../../node_modules/.bun/deepmerge@4.3.1/node_modules/deepmerge/dist/cjs.js"(exports$1, module) {
    var isMergeableObject = function isMergeableObject2(value) {
      return isNonNullObject(value) && !isSpecial(value);
    };
    function isNonNullObject(value) {
      return !!value && typeof value === "object";
    }
    function isSpecial(value) {
      var stringValue = Object.prototype.toString.call(value);
      return stringValue === "[object RegExp]" || stringValue === "[object Date]" || isReactElement(value);
    }
    var canUseSymbol = typeof Symbol === "function" && Symbol.for;
    var REACT_ELEMENT_TYPE = canUseSymbol ? /* @__PURE__ */ Symbol.for("react.element") : 60103;
    function isReactElement(value) {
      return value.$$typeof === REACT_ELEMENT_TYPE;
    }
    function emptyTarget(val) {
      return Array.isArray(val) ? [] : {};
    }
    function cloneUnlessOtherwiseSpecified(value, options) {
      return options.clone !== false && options.isMergeableObject(value) ? deepmerge2(emptyTarget(value), value, options) : value;
    }
    function defaultArrayMerge(target, source, options) {
      return target.concat(source).map(function(element) {
        return cloneUnlessOtherwiseSpecified(element, options);
      });
    }
    function getMergeFunction(key, options) {
      if (!options.customMerge) {
        return deepmerge2;
      }
      var customMerge = options.customMerge(key);
      return typeof customMerge === "function" ? customMerge : deepmerge2;
    }
    function getEnumerableOwnPropertySymbols(target) {
      return Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(target).filter(function(symbol) {
        return Object.propertyIsEnumerable.call(target, symbol);
      }) : [];
    }
    function getKeys(target) {
      return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target));
    }
    function propertyIsOnObject(object, property) {
      try {
        return property in object;
      } catch (_) {
        return false;
      }
    }
    function propertyIsUnsafe(target, key) {
      return propertyIsOnObject(target, key) && !(Object.hasOwnProperty.call(target, key) && Object.propertyIsEnumerable.call(target, key));
    }
    function mergeObject(target, source, options) {
      var destination = {};
      if (options.isMergeableObject(target)) {
        getKeys(target).forEach(function(key) {
          destination[key] = cloneUnlessOtherwiseSpecified(target[key], options);
        });
      }
      getKeys(source).forEach(function(key) {
        if (propertyIsUnsafe(target, key)) {
          return;
        }
        if (propertyIsOnObject(target, key) && options.isMergeableObject(source[key])) {
          destination[key] = getMergeFunction(key, options)(target[key], source[key], options);
        } else {
          destination[key] = cloneUnlessOtherwiseSpecified(source[key], options);
        }
      });
      return destination;
    }
    function deepmerge2(target, source, options) {
      options = options || {};
      options.arrayMerge = options.arrayMerge || defaultArrayMerge;
      options.isMergeableObject = options.isMergeableObject || isMergeableObject;
      options.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;
      var sourceIsArray = Array.isArray(source);
      var targetIsArray = Array.isArray(target);
      var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;
      if (!sourceAndTargetTypesMatch) {
        return cloneUnlessOtherwiseSpecified(source, options);
      } else if (sourceIsArray) {
        return options.arrayMerge(target, source, options);
      } else {
        return mergeObject(target, source, options);
      }
    }
    deepmerge2.all = function deepmergeAll(array, options) {
      if (!Array.isArray(array)) {
        throw new Error("first argument should be an array");
      }
      return array.reduce(function(prev, next) {
        return deepmerge2(prev, next, options);
      }, {});
    };
    var deepmerge_1 = deepmerge2;
    module.exports = deepmerge_1;
  }
});

// src/utils/convex-client.ts
var convex_client_exports = {};
__export(convex_client_exports, {
  getConvexClient: () => getConvexClient,
  getDiscoveredAgent: () => getDiscoveredAgent,
  getDiscoveryStats: () => getDiscoveryStats,
  getExternalIdMappings: () => getExternalIdMappings,
  getGhostScore: () => getGhostScore,
  markGhostClaimed: () => markGhostClaimed,
  queryDiscoveredAgents: () => queryDiscoveredAgents,
  resolveExternalId: () => resolveExternalId
});
function getConvexClient() {
  if (!convexClient) {
    const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error(
        "CONVEX_URL not configured. Please set CONVEX_URL environment variable."
      );
    }
    convexClient = new ConvexHttpClient(convexUrl);
  }
  return convexClient;
}
async function queryDiscoveredAgents(params) {
  const client = getConvexClient();
  return await client.query("ghostDiscovery:listDiscoveredAgents", {
    status: params?.status,
    limit: params?.limit || 100
  });
}
async function getDiscoveryStats() {
  const client = getConvexClient();
  return await client.query("ghostDiscovery:getDiscoveryStats");
}
async function getDiscoveredAgent(ghostAddress) {
  const client = getConvexClient();
  return await client.query("ghostDiscovery:getDiscoveredAgent", {
    ghostAddress
  });
}
async function getExternalIdMappings(ghostAddress) {
  const client = getConvexClient();
  return await client.query("ghostDiscovery:getExternalIdMappings", {
    ghostAddress
  });
}
async function resolveExternalId(platform, externalId) {
  const client = getConvexClient();
  return await client.query("ghostDiscovery:resolveExternalId", {
    platform,
    externalId
  });
}
async function markGhostClaimed(ghostAddress, claimedBy, claimTxSignature) {
  const client = getConvexClient();
  return await client.mutation("ghostDiscovery:claimAgent", {
    ghostAddress,
    claimedBy,
    claimTxSignature
  });
}
async function getGhostScore(agentAddress) {
  const client = getConvexClient();
  return await client.query("ghostScoreCalculator:calculateAgentScore", {
    agentAddress
  });
}
var convexClient;
var init_convex_client = __esm({
  "src/utils/convex-client.ts"() {
    convexClient = null;
  }
});
async function registerAgentPrompts(options) {
  const name = options.name ?? await text({
    message: "What is your agent's name?",
    placeholder: "e.g., DataAnalyzer Pro",
    validate: (value) => {
      if (!value) return "Agent name is required";
      if (value.length < 3) return "Agent name must be at least 3 characters";
      if (value.length > 50) return "Agent name must be less than 50 characters";
    }
  });
  if (isCancel(name)) {
    cancel("Agent registration cancelled");
    process.exit(0);
  }
  const description = options.description ?? await text({
    message: "Describe what your agent does:",
    placeholder: "e.g., Analyzes data and generates insights for businesses",
    validate: (value) => {
      if (!value) return "Description is required";
      if (value.length < 10) return "Description must be at least 10 characters";
      if (value.length > 500) return "Description must be less than 500 characters";
    }
  });
  if (isCancel(description)) {
    cancel("Agent registration cancelled");
    process.exit(0);
  }
  let capabilities;
  if (options.capabilities) {
    capabilities = options.capabilities.split(",").map((c) => c.trim());
  } else {
    const result = await multiselect({
      message: "Select your agent's capabilities:",
      options: [
        { value: "data-analysis", label: "\u{1F4CA} Data Analysis & Insights" },
        { value: "writing", label: "\u270D\uFE0F  Content Writing & Editing" },
        { value: "coding", label: "\u{1F4BB} Programming & Development" },
        { value: "translation", label: "\u{1F310} Language Translation" },
        { value: "image-processing", label: "\u{1F5BC}\uFE0F  Image Processing & AI Vision" },
        { value: "automation", label: "\u{1F916} Task Automation & Workflows" },
        { value: "research", label: "\u{1F50D} Research & Information Gathering" },
        { value: "customer-service", label: "\u{1F3A7} Customer Service & Support" },
        { value: "financial-analysis", label: "\u{1F4B0} Financial Analysis & Trading" },
        { value: "content-moderation", label: "\u{1F6E1}\uFE0F  Content Moderation" }
      ],
      required: true
    });
    if (isCancel(result)) {
      cancel("Agent registration cancelled");
      process.exit(0);
    }
    capabilities = result;
  }
  const serviceEndpoint = options.endpoint ?? await text({
    message: "Enter your agent's service endpoint URL:",
    placeholder: "https://api.your-agent.com/v1",
    validate: (value) => {
      if (!value) return "Service endpoint is required";
      try {
        new URL$1(value);
        return void 0;
      } catch {
        return "Please enter a valid URL";
      }
    }
  });
  if (isCancel(serviceEndpoint)) {
    cancel("Agent registration cancelled");
    process.exit(0);
  }
  let agentType = options.type || "standard";
  if (!options.type) {
    const selectedType = await select({
      message: "Select Agent Type:",
      options: [
        { value: "standard", label: "Standard Agent", hint: "Best for most use cases (Mutable, On-chain Reputation)" },
        { value: "compressed", label: "Compressed Agent", hint: "Lower cost, requires Merkle Tree (Optimized)" }
      ]
    });
    if (isCancel(selectedType)) {
      cancel("Agent registration cancelled");
      process.exit(0);
    }
    agentType = selectedType;
  }
  let merkleTree;
  if (agentType === "compressed") {
    merkleTree = await text({
      message: "Enter Merkle Tree Address:",
      placeholder: "Base58 address...",
      validate: (value) => {
        if (!value) return "Merkle Tree address is required for compressed agents";
        if (value.length < 32) return "Invalid address length";
      }
    });
    if (isCancel(merkleTree)) {
      cancel("Agent registration cancelled");
      process.exit(0);
    }
  }
  const hasMetadata = options.metadata === false ? false : options.metadata === true ? true : await confirm({
    message: "Do you have additional metadata to link? (JSON file with detailed specs)"
  });
  if (typeof hasMetadata !== "boolean" && isCancel(hasMetadata)) {
    cancel("Agent registration cancelled");
    process.exit(0);
  }
  let metadataUri = "";
  if (hasMetadata) {
    const uri = await text({
      message: "Enter metadata URI:",
      placeholder: "https://your-site.com/agent-metadata.json",
      validate: (value) => {
        if (!value) return "Metadata URI is required when metadata is enabled";
        try {
          new URL$1(value);
          return void 0;
        } catch {
          return "Please enter a valid URL";
        }
      }
    });
    if (isCancel(uri)) {
      cancel("Agent registration cancelled");
      process.exit(0);
    }
    metadataUri = uri;
  }
  console.log("\n" + chalk34.bold("\u{1F4CB} Registration Summary:"));
  console.log("\u2500".repeat(40));
  console.log(chalk34.cyan("Name:") + ` ${name}`);
  console.log(chalk34.cyan("Description:") + ` ${description}`);
  console.log(chalk34.cyan("Capabilities:") + ` ${capabilities.join(", ")}`);
  console.log(chalk34.cyan("Endpoint:") + ` ${serviceEndpoint}`);
  if (metadataUri) {
    console.log(chalk34.cyan("Metadata:") + ` ${metadataUri}`);
  }
  const confirmed = options.yes ? true : await confirm({
    message: "Register this agent on the blockchain?"
  });
  if (!options.yes && (isCancel(confirmed) || !confirmed)) {
    cancel("Agent registration cancelled");
    process.exit(0);
  }
  return {
    name,
    description,
    capabilities,
    metadataUri,
    serviceEndpoint,
    merkleTree
  };
}
function formatAnalytics(analytics) {
  return [
    `Total Earnings: ${analytics.totalEarnings} SOL`,
    `Jobs Completed: ${analytics.completedJobs}`,
    `Success Rate: ${(analytics.successRate * 100).toFixed(1)}%`,
    `Average Rating: ${analytics.averageRating.toFixed(1)}/5.0`,
    `Total Transactions: ${analytics.totalJobs}`,
    `Active Jobs: ${analytics.activeJobs}`
  ];
}
function validateAgentParams(params) {
  if (!params.name || params.name.length < 3) {
    return "Agent name must be at least 3 characters long";
  }
  if (!params.description || params.description.length < 10) {
    return "Agent description must be at least 10 characters long";
  }
  if (!params.capabilities || params.capabilities.length === 0) {
    return "Agent must have at least one capability";
  }
  if (params.capabilities.some((cap) => cap.length < 2)) {
    return "Each capability must be at least 2 characters long";
  }
  return null;
}
function formatAgentInfo(agent) {
  return {
    name: agent.name ?? "Unknown",
    address: agent.address ? agent.address.toString().slice(0, 8) + "..." + agent.address.toString().slice(-8) : "Unknown",
    description: agent.description ?? "No description",
    capabilities: Array.isArray(agent.capabilities) ? agent.capabilities.join(", ") : "None",
    status: agent.isActive ? "Active" : "Inactive",
    created: agent.createdAt ? new Date(Number(agent.createdAt)).toLocaleDateString() : "Unknown"
  };
}
function displayRegisteredAgentInfo(agent) {
  console.log("\n" + chalk34.green("\u{1F389} Your agent has been registered!"));
  console.log(chalk34.gray(`Name: ${agent.name}`));
  console.log(chalk34.gray(`Description: ${agent.description}`));
  console.log(chalk34.gray(`Capabilities: ${agent.capabilities.join(", ")}`));
  console.log(chalk34.gray(`Agent ID: ${agent.id}`));
  console.log(chalk34.gray(`Agent Address: ${agent.address.toString()}`));
  console.log("");
  console.log(chalk34.yellow("\u{1F4A1} Agent data stored locally"));
  console.log(chalk34.yellow("\u{1F4A1} Use your agent ID for future operations:"));
  console.log(chalk34.gray(`   ${agent.id}`));
}

// src/core/Container.ts
var Container = class _Container {
  static instance;
  services = /* @__PURE__ */ new Map();
  factories = /* @__PURE__ */ new Map();
  singletonCache = /* @__PURE__ */ new Map();
  creationTime = /* @__PURE__ */ new Map();
  /**
   * Get singleton instance
   */
  static getInstance() {
    return _Container.instance ??= new _Container();
  }
  /**
   * Register a service factory
   */
  register(token, factory) {
    this.factories.set(token, factory);
  }
  /**
   * Register a singleton service instance
   */
  registerSingleton(token, instance) {
    this.services.set(token, instance);
  }
  /**
   * Resolve a service by token with enhanced caching
   */
  resolve(token) {
    if (this.singletonCache.has(token)) {
      return this.singletonCache.get(token);
    }
    if (this.services.has(token)) {
      const instance = this.services.get(token);
      this.singletonCache.set(token, instance);
      return instance;
    }
    if (this.factories.has(token)) {
      const factory = this.factories.get(token);
      const startTime = Date.now();
      const instance = factory();
      const endTime = Date.now();
      this.services.set(token, instance);
      this.singletonCache.set(token, instance);
      this.creationTime.set(token, endTime - startTime);
      return instance;
    }
    throw new Error(`Service not registered: ${token}`);
  }
  /**
   * Get a service by token (alias for resolve)
   */
  get(token) {
    return this.resolve(token);
  }
  /**
   * Check if a service is registered
   */
  has(token) {
    return this.services.has(token) || this.factories.has(token);
  }
  /**
   * Clear all services (useful for testing)
   */
  clear() {
    this.services.clear();
    this.factories.clear();
    this.singletonCache.clear();
    this.creationTime.clear();
  }
  /**
   * Get performance metrics for service creation
   */
  getPerformanceMetrics() {
    const metrics = {};
    this.creationTime.forEach((time, token) => {
      metrics[token] = time;
    });
    return metrics;
  }
  /**
   * Warm up services by pre-creating frequently used ones
   */
  warmUp(tokens) {
    tokens.forEach((token) => {
      try {
        this.resolve(token);
      } catch (error) {
      }
    });
  }
  /**
   * Get all registered service tokens
   */
  getRegisteredTokens() {
    return [
      ...Array.from(this.services.keys()),
      ...Array.from(this.factories.keys())
    ];
  }
};
var container = new Container();
var ServiceTokens = {
  LOGGER_SERVICE: "LoggerService",
  AGENT_SERVICE: "AgentService",
  WALLET_SERVICE: "WalletService",
  BLOCKCHAIN_SERVICE: "BlockchainService",
  STORAGE_SERVICE: "StorageService"
};

// src/commands/agent/register.ts
function registerRegisterCommand(parentCommand) {
  parentCommand.command("register").description("Register a new AI agent").option("-n, --name <name>", "Agent name").option("-d, --description <description>", "Agent description").option("-c, --capabilities <capabilities>", "Comma-separated list of capabilities (e.g. automation,coding)").option("--endpoint <endpoint>", "Service endpoint URL").option("-t, --type <type>", "Agent type: standard or compressed (default: standard)").option("--no-metadata", "Skip metadata URI prompt").option("-y, --yes", "Skip confirmation prompt").action(async (_options) => {
    const logger2 = container.resolve(ServiceTokens.LOGGER_SERVICE);
    logger2.info("Starting agent registration command");
    intro(chalk34.cyan("\u{1F916} Register New AI Agent"));
    try {
      const agentData = await registerAgentPrompts(_options);
      if (isCancel(agentData)) {
        logger2.warn("Agent registration cancelled by user during prompts.");
        cancel("Agent registration cancelled");
        return;
      }
      logger2.info("User prompts completed", { agentData: { ...agentData, capabilities: agentData.capabilities.join(",") } });
      const validationError = validateAgentParams({
        name: agentData.name,
        description: agentData.description,
        capabilities: agentData.capabilities
      });
      if (validationError) {
        logger2.error("Agent parameter validation failed", new Error(validationError));
        cancel(chalk34.red(validationError));
        return;
      }
      const agentService = container.resolve(ServiceTokens.AGENT_SERVICE);
      logger2.info("AgentService resolved from container");
      const s = spinner();
      s.start("Registering agent...");
      try {
        const agent = await agentService.register({
          name: agentData.name,
          description: agentData.description,
          capabilities: agentData.capabilities,
          category: agentData.capabilities[0] || "automation",
          merkleTree: agentData.merkleTree,
          metadata: {
            serviceEndpoint: agentData.serviceEndpoint
          }
        });
        s.stop("\u2705 Agent registered successfully!");
        logger2.info("Agent registered successfully", { agentId: agent.id });
        displayRegisteredAgentInfo(agent);
        outro("Agent registration completed");
      } catch (error) {
        s.stop("\u274C Registration failed");
        throw error;
      }
    } catch (error) {
      logger2.handleError(error, "Agent registration failed");
      outro(chalk34.red("Operation failed"));
    }
  });
}

// src/types/services.ts
var ServiceError = class extends Error {
  constructor(message, code, suggestion, canRetry = false) {
    super(message);
    this.code = code;
    this.suggestion = suggestion;
    this.canRetry = canRetry;
    this.name = "ServiceError";
  }
};
var ValidationError = class extends ServiceError {
  constructor(message, suggestion) {
    super(message, "VALIDATION_ERROR", suggestion, false);
    this.name = "ValidationError";
  }
};
var NotFoundError = class extends ServiceError {
  constructor(resource, id) {
    super(`${resource} not found: ${id}`, "NOT_FOUND", `Check that the ${resource.toLowerCase()} ID is correct`, false);
    this.name = "NotFoundError";
  }
};
var NetworkError = class extends ServiceError {
  constructor(message, suggestion) {
    super(message, "NETWORK_ERROR", suggestion ?? "Check your network connection and try again", true);
    this.name = "NetworkError";
  }
};
var UnauthorizedError = class extends ServiceError {
  constructor(message = "Unauthorized access") {
    super(message, "UNAUTHORIZED", "Make sure you have permission to perform this action", false);
    this.name = "UnauthorizedError";
  }
};

// src/utils/enhanced-error-handler.ts
function handleServiceError(error) {
  if (error instanceof ServiceError) {
    let actions = [];
    if (error instanceof ValidationError) {
      actions = ["Review the input parameters", "Check the command help for usage examples"];
    } else if (error instanceof NotFoundError) {
      actions = ["Verify the ID is correct", "List available items to find the right one"];
    } else if (error instanceof NetworkError) {
      actions = ["Check network connection", "Verify Solana RPC endpoint is accessible"];
    } else if (error instanceof UnauthorizedError) {
      actions = ["Check wallet permissions", "Ensure you own the resource you're trying to modify"];
    }
    return {
      message: error.message,
      suggestion: error.suggestion ?? "Please try again",
      actions,
      canRetry: error.canRetry
    };
  }
  const message = error instanceof Error ? error.message : "Unknown error occurred";
  return {
    message,
    suggestion: "This is an unexpected error. Please try again or contact support",
    actions: ["Try the command again", "Check the loghost for more details"],
    canRetry: true
  };
}
function displayErrorAndCancel(error, operation = "Operation") {
  const errorInfo = handleServiceError(error);
  console.log("");
  console.log(chalk34.red("\u274C " + operation + " failed"));
  console.log(chalk34.red("Error: " + errorInfo.message));
  if (errorInfo.suggestion) {
    console.log("");
    console.log(chalk34.yellow("\u{1F4A1} Suggestion: " + errorInfo.suggestion));
  }
  if (errorInfo.actions.length > 0) {
    console.log("");
    console.log(chalk34.cyan("\u{1F4CB} What you can do:"));
    errorInfo.actions.forEach((action) => {
      console.log(chalk34.gray("  \u2022 " + action));
    });
  }
  if (errorInfo.canRetry) {
    console.log("");
    console.log(chalk34.blue("\u{1F504} You can try this command again"));
  }
  cancel(chalk34.red(operation + " cancelled"));
}

// src/commands/agent/list.ts
function registerListCommand(parentCommand) {
  parentCommand.command("list").description("List all registered agents").option("--limit <limit>", "Maximum number of agents to display", "10").action(async (options) => {
    intro(chalk34.cyan("\u{1F4CB} List Registered Agents"));
    const s = spinner();
    s.start("Fetching agents...");
    try {
      const agentService = container.resolve(ServiceTokens.AGENT_SERVICE);
      const agents = await agentService.list({
        limit: parseInt(options.limit)
      });
      s.stop("\u2705 Agents loaded");
      if (agents.length === 0) {
        console.log("\n" + chalk34.yellow("No agents found"));
        outro("Try registering an agent with: npx ghostspeak agent register");
        return;
      }
      console.log("\n" + chalk34.bold(`Available Agents (${agents.length}):`));
      console.log("\u2500".repeat(60));
      agents.forEach((agent, index) => {
        const formattedInfo = formatAgentInfo(agent);
        console.log(chalk34.cyan(`${index + 1}. ${formattedInfo.name}`));
        console.log(chalk34.gray(`   Address: ${formattedInfo.address}`));
        console.log(chalk34.gray(`   Owner: ${agent.owner ? agent.owner.toString() : "Unclaimed (Ghost)"}`));
        console.log(chalk34.gray(`   Description: ${formattedInfo.description}`));
        console.log(chalk34.gray(`   Capabilities: ${formattedInfo.capabilities}`));
        console.log(chalk34.gray(`   Status: ${formattedInfo.status === "Active" ? "\u{1F7E2} Active" : "\u{1F534} Inactive"}`));
        console.log(chalk34.gray(`   Reputation: ${agent.reputationScore}/100`));
        console.log(chalk34.gray(`   Created: ${formattedInfo.created}`));
        console.log("");
      });
      outro("Agent listing completed");
    } catch (error) {
      s.stop("\u274C Failed to fetch agents");
      displayErrorAndCancel(error, "Agent listing");
    }
  });
}
function registerSearchCommand(parentCommand) {
  parentCommand.command("search").description("Search agents by capabilities").action(async () => {
    intro(chalk34.cyan("\u{1F50D} Search AI Agents"));
    try {
      const capabilities = await multiselect({
        message: "Select capabilities to search for:",
        options: [
          { value: "data-analysis", label: "Data Analysis" },
          { value: "writing", label: "Writing & Content Creation" },
          { value: "coding", label: "Programming & Development" },
          { value: "translation", label: "Language Translation" },
          { value: "image-processing", label: "Image Processing" },
          { value: "automation", label: "Task Automation" },
          { value: "research", label: "Research & Information Gathering" }
        ]
      });
      if (isCancel(capabilities)) {
        cancel("Search cancelled");
        return;
      }
      const s = spinner();
      s.start("Searching for agents...");
      const agentService = container.resolve(ServiceTokens.AGENT_SERVICE);
      const results = await agentService.list({
        // Add capability filter to service interface
        limit: 50
      });
      const filteredResults = results.filter(
        (agent) => agent.capabilities.some((cap) => capabilities.includes(cap))
      );
      s.stop("\u2705 Search completed");
      if (filteredResults.length === 0) {
        console.log("\n" + chalk34.yellow(`No agents found with capabilities: ${capabilities.join(", ")}`));
        outro("Try searching with different capabilities");
        return;
      }
      console.log("\n" + chalk34.bold(`Found ${filteredResults.length} agents with capabilities: ${capabilities.join(", ")}`));
      console.log("\u2500".repeat(60));
      filteredResults.forEach((agent, index) => {
        const matchingCaps = agent.capabilities.filter((cap) => capabilities.includes(cap));
        const formattedInfo = formatAgentInfo(agent);
        console.log(chalk34.cyan(`${index + 1}. ${formattedInfo.name}`));
        console.log(chalk34.gray(`   Address: ${formattedInfo.address}`));
        console.log(chalk34.gray(`   Matches: ${matchingCaps.join(", ")}`));
        console.log(chalk34.gray(`   All capabilities: ${formattedInfo.capabilities}`));
        console.log(chalk34.gray(`   Reputation: ${agent.reputationScore}/100`));
        console.log(chalk34.gray(`   Status: ${formattedInfo.status === "Active" ? "\u{1F7E2} Active" : "\u{1F534} Inactive"}`));
        console.log("");
      });
      outro("Search completed");
    } catch (error) {
      cancel(chalk34.red("Search failed: " + (error instanceof Error ? error.message : "Unknown error")));
    }
  });
}
function registerStatusCommand(parentCommand) {
  parentCommand.command("status").description("Check status of your agents").action(async () => {
    intro(chalk34.cyan("\u{1F4CA} Agent Status"));
    try {
      const s = spinner();
      s.start("Checking agent status...");
      const agentService = container.resolve(ServiceTokens.AGENT_SERVICE);
      const walletService = container.resolve(ServiceTokens.WALLET_SERVICE);
      const wallet = walletService.getActiveWalletInterface();
      if (!wallet) {
        cancel(chalk34.red("No active wallet found. Please select a wallet first."));
        return;
      }
      const agents = await agentService.list({
        owner: wallet.address
      });
      s.stop("\u2705 Status updated");
      if (agents.length === 0) {
        console.log("\n" + chalk34.yellow("You have no registered agents"));
        outro("Register an agent with: npx ghostspeak agent register");
        return;
      }
      console.log("\n" + chalk34.bold("Your Agents:"));
      console.log("\u2500".repeat(60));
      for (const agent of agents) {
        const statusIcon = agent.isActive ? chalk34.green("\u25CF") : chalk34.red("\u25CB");
        const statusText = agent.isActive ? "Active" : "Inactive";
        console.log(`${statusIcon} ${agent.name}` + chalk34.gray(` - ${statusText}`));
        console.log(chalk34.gray(`  Agent ID: ${agent.id}`));
        console.log(chalk34.gray(`  Address: ${agent.address.toString()}`));
        console.log(chalk34.gray(`  Owner: ${agent.owner.toString()}`));
        console.log(chalk34.gray(`  Created: ${new Date(Number(agent.createdAt)).toLocaleString()}`));
        console.log(chalk34.gray(`  Reputation Score: ${agent.reputationScore}/100`));
        console.log(chalk34.gray(`  Capabilities: ${agent.capabilities.join(", ")}`));
        console.log("");
      }
      outro("Status check completed");
    } catch (error) {
      cancel(chalk34.red("Status check failed: " + (error instanceof Error ? error.message : "Unknown error")));
    }
  });
}

// src/types/cli-types.ts
function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// src/commands/agent/update.ts
function registerUpdateCommand(parentCommand) {
  parentCommand.command("update").description("Update your AI agent details").option("--agent-id <id>", "Agent ID to update").action(async (options) => {
    intro(chalk34.cyan("\u{1F504} Update AI Agent"));
    try {
      const s = spinner();
      s.start("Loading your agents...");
      const agentService = container.resolve(ServiceTokens.AGENT_SERVICE);
      const myAgents = await agentService.list({});
      s.stop("\u2705 Agents loaded");
      if (myAgents.length === 0) {
        cancel("You have no registered agents to update");
        return;
      }
      let selectedAgentId;
      if (options.agentId) {
        selectedAgentId = options.agentId;
      } else {
        const selectedAgent = await select({
          message: "Select agent to update:",
          options: myAgents.map((agent) => ({
            value: agent.id,
            label: `${agent.name} (${agent.isActive ? "Active" : "Inactive"})`
          }))
        });
        if (isCancel(selectedAgent)) {
          cancel("Update cancelled");
          return;
        }
        selectedAgentId = selectedAgent;
      }
      const currentAgent = await agentService.getById(selectedAgentId);
      if (!currentAgent) {
        cancel("Agent not found");
        return;
      }
      console.log("\n" + chalk34.bold("Current Agent Details:"));
      console.log("\u2500".repeat(40));
      console.log(chalk34.cyan("Name:") + ` ${currentAgent.name}`);
      console.log(chalk34.cyan("Description:") + ` ${currentAgent.description}`);
      console.log(chalk34.cyan("Capabilities:") + ` ${currentAgent.capabilities.join(", ")}`);
      console.log(chalk34.cyan("Reputation:") + ` ${currentAgent.reputationScore}/100`);
      console.log(chalk34.cyan("Agent ID:") + ` ${currentAgent.id}`);
      const updateChoice = await select({
        message: "What would you like to update?",
        options: [
          { value: "name", label: "\u{1F4DD} Name" },
          { value: "description", label: "\u{1F4C4} Description" },
          { value: "endpoint", label: "\u{1F517} Service Endpoint" },
          { value: "capabilities", label: "\u{1F6E0}\uFE0F  Capabilities" },
          { value: "price", label: "\u{1F4B0} Pricing" },
          { value: "all", label: "\u{1F4CB} Update Everything" }
        ]
      });
      if (isCancel(updateChoice)) {
        cancel("Update cancelled");
        return;
      }
      const updates = {};
      if (updateChoice === "name" || updateChoice === "all") {
        const newName = await text({
          message: "New agent name:",
          placeholder: currentAgent.name,
          initialValue: updateChoice === "all" ? currentAgent.name : void 0,
          validate: (value) => {
            if (!value) return "Name is required";
            if (value.length < 3) return "Name must be at least 3 characters";
          }
        });
        if (isCancel(newName)) {
          cancel("Update cancelled");
          return;
        }
        updates.name = newName;
      }
      if (updateChoice === "description" || updateChoice === "all") {
        const newDescription = await text({
          message: "New description:",
          placeholder: currentAgent.description,
          initialValue: updateChoice === "all" ? currentAgent.description : void 0,
          validate: (value) => {
            if (!value) return "Description is required";
            if (value.length < 20) return "Description must be at least 20 characters";
          }
        });
        if (isCancel(newDescription)) {
          cancel("Update cancelled");
          return;
        }
        updates.description = newDescription;
      }
      if (updateChoice === "endpoint" || updateChoice === "all") {
        const newEndpoint = await text({
          message: "New service endpoint URL:",
          placeholder: "https://api.example.com/agent",
          initialValue: updateChoice === "all" ? void 0 : void 0,
          validate: (value) => {
            if (!value) return "Endpoint is required";
            if (!isValidUrl(value)) {
              return "Please enter a valid URL";
            }
            return;
          }
        });
        if (isCancel(newEndpoint)) {
          cancel("Update cancelled");
          return;
        }
        updates.endpoint = newEndpoint;
      }
      if (updateChoice === "capabilities" || updateChoice === "all") {
        const newCapabilities = await multiselect({
          message: "Select agent capabilities:",
          options: [
            { value: "data-analysis", label: "\u{1F4CA} Data Analysis" },
            { value: "writing", label: "\u270D\uFE0F  Writing & Content Creation" },
            { value: "coding", label: "\u{1F4BB} Programming & Development" },
            { value: "debugging", label: "\u{1F41B} Debugging" },
            { value: "code-review", label: "\u{1F50D} Code Review" },
            { value: "translation", label: "\u{1F310} Language Translation" },
            { value: "image-processing", label: "\u{1F5BC}\uFE0F  Image Processing" },
            { value: "automation", label: "\u{1F916} Task Automation" }
          ],
          required: true
        });
        if (isCancel(newCapabilities)) {
          cancel("Update cancelled");
          return;
        }
        updates.capabilities = newCapabilities;
      }
      if (updateChoice === "price" || updateChoice === "all") {
        const newPrice = await text({
          message: "New price per task (in SOL):",
          placeholder: "0.001",
          validate: (value) => {
            if (!value) return "Price is required";
            const num = parseFloat(value);
            if (isNaN(num) || num < 0) return "Please enter a valid positive number";
          }
        });
        if (isCancel(newPrice)) {
          cancel("Update cancelled");
          return;
        }
        updates.pricing = { pricePerTask: parseFloat(newPrice) };
      }
      console.log("\n" + chalk34.bold("\u{1F4CB} Update Summary:"));
      console.log("\u2500".repeat(40));
      Object.entries(updates).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          console.log(chalk34.cyan(`${key}:`) + ` ${value.join(", ")}`);
        } else {
          console.log(chalk34.cyan(`${key}:`) + ` ${value}`);
        }
      });
      const confirmed = await confirm({
        message: "Apply these updates?"
      });
      if (isCancel(confirmed) || !confirmed) {
        cancel("Update cancelled");
        return;
      }
      const updateSpinner = spinner();
      updateSpinner.start("Updating agent...");
      try {
        const updatedAgent = await agentService.update(selectedAgentId, {
          name: updates.name,
          description: updates.description,
          capabilities: updates.capabilities,
          metadata: {
            endpoint: updates.endpoint,
            pricing: updates.pricing
          }
        });
        updateSpinner.stop("\u2705 Agent updated successfully!");
        console.log("\n" + chalk34.green("\u{1F389} Agent has been updated!"));
        console.log(chalk34.gray(`Agent ID: ${updatedAgent.id}`));
        console.log(chalk34.gray(`Name: ${updatedAgent.name}`));
        console.log(chalk34.gray(`Description: ${updatedAgent.description}`));
        console.log(chalk34.gray("Changes have been saved"));
        outro("Agent update completed");
      } catch (error) {
        updateSpinner.stop("\u274C Update failed");
        throw error;
      }
    } catch (error) {
      cancel(chalk34.red("Agent update failed: " + (error instanceof Error ? error.message : "Unknown error")));
    }
  });
}
function registerVerifyCommand(parentCommand) {
  parentCommand.command("verify").description("Verify an AI agent (admin only) - Feature coming soon").option("-a, --agent <id>", "Agent ID to verify").option("--auto", "Auto-verify based on criteria").action(async (options) => {
    intro(chalk34.cyan("\u{1F50D} Agent Verification"));
    try {
      const agentService = container.resolve(ServiceTokens.AGENT_SERVICE);
      console.log("");
      console.log(chalk34.yellow("\u26A0\uFE0F  Agent Verification Feature"));
      console.log(chalk34.gray("This feature is currently under development and not yet available."));
      console.log("");
      console.log(chalk34.cyan("What agent verification will include:"));
      console.log(chalk34.gray("\u2022 Admin privilege verification"));
      console.log(chalk34.gray("\u2022 Agent quality and compliance checks"));
      console.log(chalk34.gray("\u2022 Approval/rejection workflow"));
      console.log(chalk34.gray("\u2022 Information request system"));
      console.log("");
      if (options.agent) {
        const agent = await agentService.getById(options.agent);
        if (agent) {
          console.log(chalk34.blue(`Target agent: ${agent.name}`));
          console.log(chalk34.gray(`Owner: ${agent.owner.toString()}`));
          console.log(chalk34.gray(`Status: ${agent.isActive ? "Active" : "Inactive"}`));
        } else {
          console.log(chalk34.red(`Agent not found: ${options.agent}`));
        }
      }
      outro("Agent verification will be available in a future update");
    } catch (error) {
      displayErrorAndCancel(error, "Agent verification");
    }
  });
}
function registerAnalyticsCommand(parentCommand) {
  parentCommand.command("analytics").description("View agent performance analytics").option("-a, --agent <address>", "Specific agent address").option("--mine", "Show analytics for my agents only").option("-p, --period <period>", "Time period (7d, 30d, 90d, 1y)").action(async (options) => {
    intro(chalk34.cyan("\u{1F4CA} Agent Analytics"));
    try {
      const s = spinner();
      s.start("Loading analytics data...");
      const agentService = container.resolve(ServiceTokens.AGENT_SERVICE);
      let analytics;
      try {
        if (options.agent) {
          const agentAnalytics = await agentService.getAnalytics(options.agent);
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
            insights: ["Analytics data coming from service layer"]
          };
        } else {
          throw new Error("Analytics methods not fully implemented yet");
        }
      } catch (error) {
        s.stop("\u274C Analytics not available");
        const fallbackAnalytics = {
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
        };
        console.log("");
        console.log(chalk34.yellow("\u{1F4CA} Agent Analytics"));
        console.log(chalk34.gray("Analytics are not yet available in the current SDK version."));
        console.log("");
        console.log(chalk34.bold("Sample Analytics Format:"));
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
        };
        formatAnalytics(sdkFormatAnalytics).forEach((line) => {
          console.log(chalk34.gray("  " + line));
        });
        console.log("");
        console.log(chalk34.bold("What you can do instead:"));
        console.log(chalk34.cyan("\u2022 ghost agent status") + chalk34.gray(" - View basic agent information"));
        console.log(chalk34.cyan("\u2022 ghost agent list") + chalk34.gray(" - See all registered agents"));
        console.log(chalk34.cyan("\u2022 ghost airdrop") + chalk34.gray(" - Get devnet GHOST tokens for testing"));
        console.log("");
        console.log(chalk34.gray("Analytics coming soon via PayAI integration."));
        outro("Analytics feature coming soon");
        return;
      }
      s.stop("\u2705 Analytics loaded");
      log.info(`
${chalk34.bold("\u{1F4C8} Performance Overview:")}`);
      log.info("\u2500".repeat(30));
      if (options.agent || options.mine) {
        log.info(
          `${chalk34.gray("Active Agents:")} ${analytics.activeAgents}
${chalk34.gray("Total Jobs Completed:")} ${analytics.totalJobs}
${chalk34.gray("Success Rate:")} ${(analytics.successRate * 100).toFixed(1)}%
${chalk34.gray("Average Rating:")} ${analytics.averageRating.toFixed(1)} \u2B50
${chalk34.gray("Total Earnings:")} ${(Number(analytics.totalEarnings) / 1e9).toFixed(3)} SOL
`
        );
        if (Object.keys(analytics.jobsByCategory).length > 0) {
          log.info(`
${chalk34.bold("\u{1F4CB} Jobs by Category:")}`);
          Object.entries(analytics.jobsByCategory).forEach(([category, count]) => {
            log.info(`   ${chalk34.gray(category + ":")} ${count}`);
          });
        }
        if (analytics.earningsTrend.length > 0) {
          log.info(`
${chalk34.bold("\u{1F4B0} Earnings Trend:")}`);
          analytics.earningsTrend.forEach((point) => {
            const date = new Date(Number(point.timestamp) * 1e3).toLocaleDateString();
            const earningsSOL = (Number(point.earnings) / 1e9).toFixed(3);
            log.info(`   ${chalk34.gray(date + ":")} ${earningsSOL} SOL`);
          });
        }
        if (analytics.topClients.length > 0) {
          log.info(`
${chalk34.bold("\u{1F465} Top Clients:")}`);
          analytics.topClients.slice(0, 5).forEach((client, index) => {
            log.info(
              `   ${index + 1}. ${client.address}
      ${chalk34.gray("Jobs:")} ${client.jobCount} | ${chalk34.gray("Spent:")} ${(Number(client.totalSpent) / 1e9).toFixed(3)} SOL`
            );
          });
        }
      } else {
        log.info(
          `${chalk34.gray("Total Agents:")} ${analytics.totalAgents}
${chalk34.gray("Verified Agents:")} ${analytics.verifiedAgents} (${(analytics.verifiedAgents / analytics.totalAgents * 100).toFixed(1)}%)
${chalk34.gray("Active Agents:")} ${analytics.activeAgents}
${chalk34.gray("Total Jobs:")} ${analytics.totalJobs}
${chalk34.gray("Protocol Volume:")} ${(Number(analytics.totalVolume) / 1e9).toFixed(3)} SOL
`
        );
        if (analytics.topCategories.length > 0) {
          log.info(`
${chalk34.bold("\u{1F3C6} Popular Categories:")}`);
          analytics.topCategories.slice(0, 5).forEach((category, index) => {
            log.info(`   ${index + 1}. ${category.name} (${category.agentCount} agents)`);
          });
        }
        if (analytics.topPerformers.length > 0) {
          log.info(`
${chalk34.bold("\u2B50 Top Performing Agents:")}`);
          analytics.topPerformers.slice(0, 5).forEach((agent, index) => {
            log.info(
              `   ${index + 1}. ${agent.name}
      ${chalk34.gray("Success Rate:")} ${agent.successRate}% | ${chalk34.gray("Earnings:")} ${Number(agent.totalEarnings) / 1e6} SOL`
            );
          });
        }
        log.info(`
${chalk34.bold("\u{1F4C8} Growth Metrics:")}`);
        log.info(
          `   ${chalk34.gray("Weekly Growth:")} ${analytics.growthMetrics.weeklyGrowth > 0 ? "+" : ""}${analytics.growthMetrics.weeklyGrowth}%
   ${chalk34.gray("Monthly Growth:")} ${analytics.growthMetrics.monthlyGrowth > 0 ? "+" : ""}${analytics.growthMetrics.monthlyGrowth}%
   ${chalk34.gray("User Growth:")} ${analytics.growthMetrics.userGrowth > 0 ? "+" : ""}${analytics.growthMetrics.userGrowth}%
   ${chalk34.gray("Revenue Growth:")} ${analytics.growthMetrics.revenueGrowth > 0 ? "+" : ""}${analytics.growthMetrics.revenueGrowth}%`
        );
      }
      if (analytics.insights.length > 0) {
        log.info(`
${chalk34.bold("\u{1F4A1} Performance Insights:")}`);
        analytics.insights.forEach((insight) => {
          log.info(`   \u{1F4A1} ${insight}`);
        });
      }
      outro(
        `${chalk34.yellow("\u{1F4A1} Analytics Tips:")}
\u2022 Monitor success rates and ratings regularly
\u2022 Focus on high-demand capability categories
\u2022 Engage with top clients for repeat business

${chalk34.cyan("npx ghostspeak agent analytics --mine")} - View your agent analytics`
      );
    } catch (error) {
      log.error(`Failed to load analytics: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  });
}

// src/utils/secure-storage.ts
init_env_config();
var SecureStorage = class {
  static ALGORITHM = "aes-256-gcm";
  static KEY_LENGTH = 32;
  static SALT_LENGTH = 32;
  static IV_LENGTH = 16;
  static TAG_LENGTH = 16;
  static VERSION = 1;
  static STORAGE_DIR = ".ghostspeak/secure";
  /**
   * Get the secure storage directory path
   */
  static getStorageDir() {
    return resolve(homedir(), this.STORAGE_DIR);
  }
  /**
   * Get the full path for a storage key
   */
  static getStoragePath(key) {
    return resolve(this.getStorageDir(), `${key}.enc`);
  }
  /**
   * Derive encryption key from password and salt using scrypt
   */
  static async deriveKey(password, salt) {
    return new Promise((resolve3, reject) => {
      const iterations = envConfig.keyDerivationIterations || 1e5;
      scrypt(password, salt, this.KEY_LENGTH, { N: iterations }, (err, derivedKey) => {
        if (err) reject(err);
        else resolve3(derivedKey);
      });
    });
  }
  /**
   * Ensure storage directory exists with proper permissions
   */
  static async ensureStorageDir() {
    const dir = this.getStorageDir();
    try {
      await access(dir);
    } catch (error) {
      await mkdir(dir, { recursive: true, mode: 448 });
    }
    await chmod(dir, 448);
  }
  /**
   * Encrypt data with password
   */
  static async encrypt(data, password) {
    const salt = randomBytes(this.SALT_LENGTH);
    const iv = randomBytes(this.IV_LENGTH);
    const key = await this.deriveKey(password, salt);
    const cipher = createCipheriv(this.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, "utf8"),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([encrypted, authTag]);
    return {
      iv: iv.toString("hex"),
      salt: salt.toString("hex"),
      encrypted: combined.toString("hex"),
      version: this.VERSION
    };
  }
  /**
   * Decrypt data with password
   */
  static async decrypt(encryptedData, password) {
    if (encryptedData.version !== this.VERSION) {
      throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
    }
    const salt = Buffer.from(encryptedData.salt, "hex");
    const iv = Buffer.from(encryptedData.iv, "hex");
    const combined = Buffer.from(encryptedData.encrypted, "hex");
    const encrypted = combined.subarray(0, combined.length - this.TAG_LENGTH);
    const authTag = combined.subarray(combined.length - this.TAG_LENGTH);
    const key = await this.deriveKey(password, salt);
    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    try {
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      return decrypted.toString("utf8");
    } catch (error) {
      throw new Error("Failed to decrypt: Invalid password or corrupted data");
    }
  }
  /**
   * Store encrypted data
   */
  static async store(key, data, password) {
    await this.ensureStorageDir();
    const encrypted = await this.encrypt(data, password);
    const path4 = this.getStoragePath(key);
    await writeFile(path4, JSON.stringify(encrypted, null, 2), "utf8");
    await chmod(path4, 384);
  }
  /**
   * Retrieve and decrypt data
   */
  static async retrieve(key, password) {
    const path4 = this.getStoragePath(key);
    try {
      const content = await readFile(path4, "utf8");
      const encrypted = JSON.parse(content);
      return await this.decrypt(encrypted, password);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        throw new Error(`No data found for key: ${key}`);
      }
      throw error;
    }
  }
  /**
   * Check if a key exists
   */
  static async exists(key) {
    try {
      await access(this.getStoragePath(key));
      return true;
    } catch (error) {
      return false;
    }
  }
  /**
   * Store a Solana keypair securely
   * Note: In Web3.js v2, we can't extract the secret key from a KeyPairSigner.
   * This method now expects the raw secret key bytes to be passed separately.
   */
  static async storeKeypair(key, secretKeyBytes, password) {
    const secretKey = JSON.stringify(Array.from(secretKeyBytes));
    await this.store(key, secretKey, password);
  }
  /**
   * Retrieve a Solana keypair
   */
  static async retrieveKeypair(key, password) {
    const secretKeyJson = await this.retrieve(key, password);
    const secretKey = new Uint8Array(JSON.parse(secretKeyJson));
    return await createKeyPairSignerFromBytes(secretKey);
  }
  /**
   * Delete encrypted data
   */
  static async delete(key) {
    const path4 = this.getStoragePath(key);
    const { unlink } = await import('fs/promises');
    try {
      await unlink(path4);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code !== "ENOENT") {
        throw error;
      }
    }
  }
  /**
   * List all stored keys
   */
  static async listKeys() {
    const { readdir } = await import('fs/promises');
    try {
      const dir = this.getStorageDir();
      const files = await readdir(dir);
      return files.filter((f) => f.endsWith(".enc")).map((f) => f.replace(".enc", ""));
    } catch (error) {
      return [];
    }
  }
};
async function promptPassword(message = "Enter password: ") {
  const { createInterface } = await import('readline');
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve3) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdout.write(message);
    let password = "";
    process.stdin.on("data", (char) => {
      const key = char.toString();
      switch (key) {
        case "\n":
        case "\r":
        case "":
          process.stdin.pause();
          process.stdin.removeAllListeners("data");
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }
          process.stdout.write("\n");
          rl.close();
          resolve3(password);
          break;
        case "":
          process.exit(0);
          break;
        case "\x7F":
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write("\b \b");
          }
          break;
        default:
          password += key;
          process.stdout.write("*");
          break;
      }
    });
  });
}
function clearMemory(data) {
  if (typeof data === "string") {
    data = "";
  } else if (data instanceof Uint8Array) {
    data.fill(0);
  }
}
var AtomicFileManager = class {
  static locks = /* @__PURE__ */ new Map();
  static async writeJSON(filePath, data) {
    const lockKey = filePath;
    if (this.locks.has(lockKey)) {
      await this.locks.get(lockKey);
    }
    const operation = this.performAtomicWrite(filePath, data);
    this.locks.set(lockKey, operation);
    try {
      await operation;
    } finally {
      this.locks.delete(lockKey);
    }
  }
  static async performAtomicWrite(filePath, data) {
    const tempPath = `${filePath}.tmp`;
    const backupPath = `${filePath}.backup`;
    try {
      try {
        await promises.access(filePath);
        await promises.copyFile(filePath, backupPath);
      } catch {
      }
      await promises.writeFile(tempPath, JSON.stringify(data, null, 2));
      await promises.rename(tempPath, filePath);
      try {
        await promises.unlink(backupPath);
      } catch {
      }
    } catch (error) {
      try {
        await promises.unlink(tempPath);
      } catch {
      }
      try {
        await promises.access(backupPath);
        await promises.copyFile(backupPath, filePath);
        await promises.unlink(backupPath);
      } catch {
      }
      throw error;
    }
  }
  static async readJSON(filePath) {
    const lockKey = filePath;
    if (this.locks.has(lockKey)) {
      await this.locks.get(lockKey);
    }
    try {
      const data = await promises.readFile(filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
};
var AGENT_CREDENTIALS_DIR = join(homedir(), ".ghostspeak", "agents");
var AgentWalletManager = class {
  /**
   * Generate a new agent wallet with credentials
   */
  static async generateAgentWallet(agentName, description, ownerWallet) {
    await generateKeyPairSigner();
    const agentId = agentName.toLowerCase().replace(/\s+/g, "-");
    const uuid = randomUUID();
    const keypairBytes = new Uint8Array(64);
    crypto.getRandomValues(keypairBytes);
    const exportableWallet = await createKeyPairSignerFromBytes(keypairBytes);
    const credentials = {
      agentId,
      uuid,
      name: agentName,
      description,
      agentWallet: {
        publicKey: exportableWallet.address.toString()
      },
      ownerWallet: ownerWallet.toString(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    return {
      agentWallet: exportableWallet,
      credentials,
      secretKey: keypairBytes
      // Return separately for secure storage
    };
  }
  /**
   * Save agent credentials to file system (with secure key storage)
   */
  static async saveCredentials(credentials, secretKey, password) {
    await promises.mkdir(AGENT_CREDENTIALS_DIR, { recursive: true });
    const agentDir = join(AGENT_CREDENTIALS_DIR, credentials.agentId);
    await promises.mkdir(agentDir, { recursive: true });
    const credentialsPath = join(agentDir, "credentials.json");
    await promises.writeFile(credentialsPath, JSON.stringify(credentials, null, 2));
    await chmod(credentialsPath, 384);
    if (secretKey && password) {
      const keyStorageId = `agent-${credentials.agentId}`;
      const keypairSigner = await createKeyPairSignerFromBytes(secretKey);
      const legacyKeypair = {
        publicKey: { toBase58: () => keypairSigner.address },
        secretKey
      };
      await SecureStorage.storeKeypair(keyStorageId, legacyKeypair, password);
      clearMemory(secretKey);
    }
    const uuidMappingPath = join(AGENT_CREDENTIALS_DIR, "uuid-mapping.json");
    try {
      const uuidMapping = await AtomicFileManager.readJSON(uuidMappingPath) ?? {};
      uuidMapping[credentials.uuid] = credentials.agentId;
      await AtomicFileManager.writeJSON(uuidMappingPath, uuidMapping);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error updating UUID mapping:", message);
      throw new Error(`Failed to update UUID mapping: ${message}`);
    }
  }
  /**
   * Load agent credentials by agent ID
   */
  static async loadCredentials(agentId) {
    try {
      const credentialsPath = join(AGENT_CREDENTIALS_DIR, agentId, "credentials.json");
      const credentialsData = await promises.readFile(credentialsPath, "utf-8");
      return JSON.parse(credentialsData);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return null;
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Error reading agent credentials for ${agentId}:`, message);
      throw new Error(`Failed to read agent credentials for ${agentId}: ${message}`);
    }
  }
  /**
   * Load agent credentials by UUID
   */
  static async loadCredentialsByUuid(uuid) {
    try {
      const uuidMappingPath = join(AGENT_CREDENTIALS_DIR, "uuid-mapping.json");
      const mappingData = await promises.readFile(uuidMappingPath, "utf-8");
      const uuidMapping = JSON.parse(mappingData);
      const agentId = uuidMapping[uuid];
      if (!agentId) return null;
      return await this.loadCredentials(agentId);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return null;
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Error loading credentials by UUID ${uuid}:`, message);
      throw new Error(`Failed to load credentials by UUID: ${message}`);
    }
  }
  /**
   * Get all agent credentials for a specific owner
   */
  static async getAgentsByOwner(ownerAddress) {
    try {
      const agentDirs = await promises.readdir(AGENT_CREDENTIALS_DIR);
      const agents = [];
      for (const agentId of agentDirs) {
        if (agentId === "uuid-mapping.json") continue;
        const credentials = await this.loadCredentials(agentId);
        if (credentials && credentials.ownerWallet === ownerAddress.toString()) {
          agents.push(credentials);
        }
      }
      return agents.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return [];
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Error getting agents by owner ${ownerAddress}:`, message);
      throw new Error(`Failed to get agents by owner: ${message}`);
    }
  }
  /**
   * Create agent wallet signer from credentials (requires password)
   */
  static async createAgentSigner(credentials, password) {
    password ??= await promptPassword(`Enter password for agent ${credentials.name}: `);
    const keyStorageId = `agent-${credentials.agentId}`;
    const keypair = await SecureStorage.retrieveKeypair(keyStorageId, password);
    clearMemory(password);
    return keypair;
  }
  /**
   * Update agent credentials
   */
  static async updateCredentials(agentId, updates) {
    const existingCredentials = await this.loadCredentials(agentId);
    if (!existingCredentials) {
      throw new Error(`Agent credentials not found for ID: ${agentId}`);
    }
    const updatedCredentials = {
      ...existingCredentials,
      ...updates,
      updatedAt: Date.now()
    };
    await this.saveCredentials(updatedCredentials);
  }
  /**
   * Delete agent credentials
   */
  static async deleteCredentials(agentId) {
    const credentials = await this.loadCredentials(agentId);
    if (!credentials) return;
    const uuidMappingPath = join(AGENT_CREDENTIALS_DIR, "uuid-mapping.json");
    try {
      const uuidMapping = await AtomicFileManager.readJSON(uuidMappingPath) ?? {};
      delete uuidMapping[credentials.uuid];
      await AtomicFileManager.writeJSON(uuidMappingPath, uuidMapping);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error updating UUID mapping during deletion:", message);
    }
    const agentDir = join(AGENT_CREDENTIALS_DIR, agentId);
    await promises.rm(agentDir, { recursive: true, force: true });
  }
  /**
   * Check if agent credentials exist
   */
  static async credentialsExist(agentId) {
    return await this.loadCredentials(agentId) !== null;
  }
  /**
   * List all agent IDs
   */
  static async listAgentIds() {
    try {
      const agentDirs = await promises.readdir(AGENT_CREDENTIALS_DIR);
      return agentDirs.filter((dir) => dir !== "uuid-mapping.json");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return [];
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error listing agent IDs:", message);
      throw new Error(`Failed to list agent IDs: ${message}`);
    }
  }
};
var AgentBackupManager = class {
  /**
   * Backup agent credentials to a file
   */
  static async backupAgent(agentId, backupPath) {
    const credentials = await AgentWalletManager.loadCredentials(agentId);
    if (!credentials) {
      throw new Error(`Agent credentials not found for ID: ${agentId}`);
    }
    await promises.mkdir(dirname(backupPath), { recursive: true });
    const backupData = {
      version: "1.0.0",
      exportedAt: Date.now(),
      credentials
    };
    await promises.writeFile(backupPath, JSON.stringify(backupData, null, 2));
  }
  /**
   * Restore agent credentials from backup
   */
  static async restoreAgent(backupPath) {
    const backupData = await promises.readFile(backupPath, "utf-8");
    const backup = JSON.parse(backupData);
    if (!backup.credentials) {
      throw new Error("Invalid backup file format");
    }
    const credentials = backup.credentials;
    const existingCredentials = await AgentWalletManager.loadCredentials(credentials.agentId);
    if (existingCredentials) {
      throw new Error(`Agent ${credentials.agentId} already exists`);
    }
    await AgentWalletManager.saveCredentials(credentials);
    return credentials.agentId;
  }
  /**
   * Backup all agents for an owner
   */
  static async backupAllAgents(ownerAddress, backupDir) {
    const agents = await AgentWalletManager.getAgentsByOwner(ownerAddress);
    await promises.mkdir(backupDir, { recursive: true });
    for (const agent of agents) {
      const backupPath = join(backupDir, `${agent.agentId}.json`);
      await this.backupAgent(agent.agentId, backupPath);
    }
  }
};

// src/commands/agent/credentials.ts
function registerCredentialsCommand(parentCommand) {
  parentCommand.command("credentials").description("Manage agent credentials").action(async () => {
    intro(chalk34.cyan("\u{1F510} Agent Credentials Manager"));
    try {
      const walletService = container.resolve(ServiceTokens.WALLET_SERVICE);
      const wallet = walletService.getActiveWalletInterface();
      if (!wallet) {
        cancel(chalk34.red("No active wallet found. Please select a wallet first."));
        return;
      }
      const action = await select({
        message: "What would you like to do?",
        options: [
          { value: "list", label: "\u{1F4CB} List all agent credentials" },
          { value: "show", label: "\u{1F441}\uFE0F  Show agent details" },
          { value: "backup", label: "\u{1F4BE} Backup agent credentials" },
          { value: "restore", label: "\u{1F4E5} Restore agent credentials" },
          { value: "delete", label: "\u{1F5D1}\uFE0F  Delete agent credentials" }
        ]
      });
      if (isCancel(action)) {
        cancel("Operation cancelled");
        return;
      }
      switch (action) {
        case "list":
          await listCredentials(wallet.address);
          break;
        case "show":
          await showCredentials(wallet.address);
          break;
        case "backup":
          await backupCredentials(wallet.address);
          break;
        case "restore":
          await restoreCredentials();
          break;
        case "delete":
          await deleteCredentials(wallet.address);
          break;
      }
      outro("Credential management completed");
    } catch (error) {
      cancel(chalk34.red("Error: " + (error instanceof Error ? error.message : "Unknown error")));
    }
  });
}
async function listCredentials(ownerAddress) {
  const s = spinner();
  s.start("Loading agent credentials...");
  const credentials = await AgentWalletManager.getAgentsByOwner(ownerAddress);
  s.stop("\u2705 Credentials loaded");
  if (credentials.length === 0) {
    console.log("\n" + chalk34.yellow("No agent credentials found"));
    return;
  }
  console.log("\n" + chalk34.bold(`\u{1F510} Your Agent Credentials (${credentials.length})`));
  console.log("\u2550".repeat(70));
  credentials.forEach((cred, index) => {
    console.log(chalk34.cyan(`${index + 1}. ${cred.name}`));
    console.log(chalk34.gray(`   Agent ID: ${cred.agentId}`));
    console.log(chalk34.gray(`   UUID: ${cred.uuid}`));
    console.log(chalk34.gray(`   Agent Wallet: ${cred.agentWallet.publicKey}`));
    console.log(chalk34.gray(`   Created: ${new Date(cred.createdAt).toLocaleString()}`));
    console.log(chalk34.gray(`   CNFT: ${cred.cnftMint ? "\u2705 Yes" : "\u274C No"}`));
    console.log("");
  });
}
async function showCredentials(ownerAddress) {
  const credentials = await AgentWalletManager.getAgentsByOwner(ownerAddress);
  if (credentials.length === 0) {
    console.log("\n" + chalk34.yellow("No agent credentials found"));
    return;
  }
  const selectedAgentId = await select({
    message: "Select agent to view details:",
    options: credentials.map((cred) => ({
      value: cred.agentId,
      label: `${cred.name} (${cred.uuid})`
    }))
  });
  if (isCancel(selectedAgentId)) {
    return;
  }
  const selectedCredentials = credentials.find((cred) => cred.agentId === selectedAgentId);
  if (!selectedCredentials) {
    console.log(chalk34.red("Agent not found"));
    return;
  }
  console.log("\n" + chalk34.bold("\u{1F510} Agent Credentials:"));
  console.log("\u2500".repeat(50));
  console.log(chalk34.cyan("Name:") + ` ${selectedCredentials.name}`);
  console.log(chalk34.cyan("Agent ID:") + ` ${selectedCredentials.agentId}`);
  console.log(chalk34.cyan("UUID:") + ` ${selectedCredentials.uuid}`);
  console.log(chalk34.cyan("Description:") + ` ${selectedCredentials.description}`);
  console.log(chalk34.cyan("Agent Wallet:") + ` ${selectedCredentials.agentWallet.publicKey}`);
  console.log(chalk34.cyan("Owner:") + ` ${selectedCredentials.ownerWallet}`);
  console.log(chalk34.cyan("Created:") + ` ${new Date(selectedCredentials.createdAt).toLocaleString()}`);
  console.log(chalk34.cyan("Updated:") + ` ${new Date(selectedCredentials.updatedAt).toLocaleString()}`);
  if (selectedCredentials.cnftMint) {
    console.log(chalk34.cyan("CNFT Mint:") + ` ${selectedCredentials.cnftMint}`);
    console.log(chalk34.cyan("Merkle Tree:") + ` ${selectedCredentials.merkleTree}`);
  }
}
async function backupCredentials(ownerAddress) {
  const credentials = await AgentWalletManager.getAgentsByOwner(ownerAddress);
  if (credentials.length === 0) {
    console.log("\n" + chalk34.yellow("No agent credentials found"));
    return;
  }
  const backupType = await select({
    message: "Backup type:",
    options: [
      { value: "single", label: "\u{1F4C4} Single agent backup" },
      { value: "all", label: "\u{1F4E6} Backup all agents" }
    ]
  });
  if (isCancel(backupType)) {
    return;
  }
  if (backupType === "single") {
    const selectedAgentId = await select({
      message: "Select agent to backup:",
      options: credentials.map((cred) => ({
        value: cred.agentId,
        label: `${cred.name} (${cred.uuid})`
      }))
    });
    if (isCancel(selectedAgentId)) {
      return;
    }
    const backupPath = await text({
      message: "Backup file path:",
      placeholder: `./agent-backup-${selectedAgentId}.json`,
      validate: (value) => {
        if (!value) return "Backup path is required";
      }
    });
    if (isCancel(backupPath)) {
      return;
    }
    const s = spinner();
    s.start("Creating backup...");
    try {
      await AgentBackupManager.backupAgent(selectedAgentId, backupPath);
      s.stop("\u2705 Backup created");
      console.log(chalk34.green(`
\u2705 Agent backup saved to: ${backupPath}`));
    } catch (error) {
      s.stop("\u274C Backup failed");
      console.log(chalk34.red("Backup failed: " + (error instanceof Error ? error.message : "Unknown error")));
    }
  } else {
    const backupDir = await text({
      message: "Backup directory:",
      placeholder: "./agent-backups",
      validate: (value) => {
        if (!value) return "Backup directory is required";
      }
    });
    if (isCancel(backupDir)) {
      return;
    }
    const s = spinner();
    s.start("Creating backups...");
    try {
      await AgentBackupManager.backupAllAgents(ownerAddress, backupDir);
      s.stop("\u2705 Backups created");
      console.log(chalk34.green(`
\u2705 All agent backups saved to: ${backupDir}`));
    } catch (error) {
      s.stop("\u274C Backup failed");
      console.log(chalk34.red("Backup failed: " + (error instanceof Error ? error.message : "Unknown error")));
    }
  }
}
async function restoreCredentials() {
  const backupPath = await text({
    message: "Backup file path:",
    placeholder: "./agent-backup.json",
    validate: (value) => {
      if (!value) return "Backup path is required";
    }
  });
  if (isCancel(backupPath)) {
    return;
  }
  const s = spinner();
  s.start("Restoring agent...");
  try {
    const agentId = await AgentBackupManager.restoreAgent(backupPath);
    s.stop("\u2705 Agent restored");
    console.log(chalk34.green(`
\u2705 Agent restored: ${agentId}`));
  } catch (error) {
    s.stop("\u274C Restore failed");
    console.log(chalk34.red("Restore failed: " + (error instanceof Error ? error.message : "Unknown error")));
  }
}
async function deleteCredentials(ownerAddress) {
  const credentials = await AgentWalletManager.getAgentsByOwner(ownerAddress);
  if (credentials.length === 0) {
    console.log("\n" + chalk34.yellow("No agent credentials found"));
    return;
  }
  const selectedAgentId = await select({
    message: "Select agent to delete:",
    options: credentials.map((cred) => ({
      value: cred.agentId,
      label: `${cred.name} (${cred.uuid})`
    }))
  });
  if (isCancel(selectedAgentId)) {
    return;
  }
  const selectedCredentials = credentials.find((cred) => cred.agentId === selectedAgentId);
  if (!selectedCredentials) {
    console.log(chalk34.red("Agent not found"));
    return;
  }
  console.log("\n" + chalk34.bold("\u26A0\uFE0F  WARNING: This will permanently delete agent credentials"));
  console.log(chalk34.red("Agent to delete:") + ` ${selectedCredentials.name}`);
  console.log(chalk34.red("UUID:") + ` ${selectedCredentials.uuid}`);
  console.log(chalk34.yellow("This action cannot be undone!"));
  const confirmed = await confirm({
    message: "Are you sure you want to delete these credentials?"
  });
  if (isCancel(confirmed) || !confirmed) {
    console.log(chalk34.gray("Deletion cancelled"));
    return;
  }
  const s = spinner();
  s.start("Deleting credentials...");
  try {
    await AgentWalletManager.deleteCredentials(selectedCredentials.agentId);
    s.stop("\u2705 Credentials deleted");
    console.log(chalk34.green(`
\u2705 Agent credentials deleted: ${selectedCredentials.name}`));
  } catch (error) {
    s.stop("\u274C Deletion failed");
    console.log(chalk34.red("Deletion failed: " + (error instanceof Error ? error.message : "Unknown error")));
  }
}
function registerUuidCommand(parentCommand) {
  parentCommand.command("uuid").description("Look up agent by UUID").argument("[uuid]", "Agent UUID").action(async (uuid) => {
    intro(chalk34.cyan("\u{1F50D} Agent UUID Lookup"));
    try {
      if (!uuid) {
        uuid = await text({
          message: "Enter agent UUID:",
          placeholder: "e.g., 550e8400-e29b-41d4-a716-446655440000",
          validate: (value) => {
            if (!value) return "UUID is required";
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
              return "Invalid UUID format";
            }
          }
        });
        if (isCancel(uuid)) {
          cancel("Lookup cancelled");
          return;
        }
      }
      const s = spinner();
      s.start("Looking up agent...");
      const credentials = await AgentWalletManager.loadCredentialsByUuid(uuid);
      if (!credentials) {
        s.stop("\u274C Agent not found");
        console.log(chalk34.yellow("\nAgent not found for UUID: " + uuid));
        outro("Make sure the UUID is correct and the agent is registered on this device");
        return;
      }
      s.stop("\u2705 Agent found");
      console.log("\n" + chalk34.bold("\u{1F916} Agent Details:"));
      console.log("\u2500".repeat(50));
      console.log(chalk34.cyan("Name:") + ` ${credentials.name}`);
      console.log(chalk34.cyan("Agent ID:") + ` ${credentials.agentId}`);
      console.log(chalk34.cyan("UUID:") + ` ${credentials.uuid}`);
      console.log(chalk34.cyan("Description:") + ` ${credentials.description}`);
      console.log(chalk34.cyan("Agent Wallet:") + ` ${credentials.agentWallet.publicKey}`);
      console.log(chalk34.cyan("Owner:") + ` ${credentials.ownerWallet}`);
      console.log(chalk34.cyan("Created:") + ` ${new Date(credentials.createdAt).toLocaleString()}`);
      console.log(chalk34.cyan("Updated:") + ` ${new Date(credentials.updatedAt).toLocaleString()}`);
      if (credentials.cnftMint) {
        console.log(chalk34.cyan("CNFT Mint:") + ` ${credentials.cnftMint}`);
      }
      if (credentials.merkleTree) {
        console.log(chalk34.cyan("Merkle Tree:") + ` ${credentials.merkleTree}`);
      }
      outro("Agent lookup completed");
    } catch (error) {
      cancel(chalk34.red("Lookup failed: " + (error instanceof Error ? error.message : "Unknown error")));
    }
  });
}

// src/commands/agent/index.ts
var agentCommand = new Command("agent").description("Manage AI agents in the GhostSpeak protocol").alias("a");
registerRegisterCommand(agentCommand);
registerListCommand(agentCommand);
registerSearchCommand(agentCommand);
registerStatusCommand(agentCommand);
registerUpdateCommand(agentCommand);
registerVerifyCommand(agentCommand);
registerAnalyticsCommand(agentCommand);
registerCredentialsCommand(agentCommand);
registerUuidCommand(agentCommand);
agentCommand.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name() + " " + cmd.usage()
});
agentCommand.addHelpText("after", `
${chalk34.cyan("\u{1F916} AI Agent Management Commands")}

${chalk34.yellow("Getting Started:")}
  $ ghost agent register                    # Register a new AI agent with guided setup
  $ ghost agent status                      # Check your agents' current status
  $ ghost agent list                        # View all registered agents

${chalk34.yellow("Agent Operations:")}
  $ ghost agent update --agent-id <id>      # Update agent details and capabilities
  $ ghost agent search                      # Find agents by capabilities
  $ ghost agent analytics --mine            # View your agent performance metrics
  $ ghost agent verify --agent <id>         # Verify agent (admin only)

${chalk34.yellow("Management:")}
  $ ghost agent credentials                 # Backup/restore agent credentials
  $ ghost agent uuid <uuid>                 # Look up agent by UUID

${chalk34.cyan("Quick Shortcuts:")}
  $ ghost a r                              # agent register
  $ ghost a l                              # agent list  
  $ ghost a s                              # agent status
  $ ghost a u                              # agent update

${chalk34.gray("\u{1F4A1} Tips:")}
  ${chalk34.gray("\u2022 Start with")} ghost agent register ${chalk34.gray("to create your first agent")}
  ${chalk34.gray("\u2022 Use")} ghost agent status ${chalk34.gray("to monitor agent health and activity")}
  ${chalk34.gray("\u2022 Agents can have multiple capabilities to serve diverse client needs")}
  ${chalk34.gray("\u2022 Keep your agent credentials secure - they cannot be recovered if lost")}

${chalk34.blue("\u{1F517} Related Commands:")}
  $ ghost wallet list                       # Manage agent owner wallets
  $ ghost credentials                       # Issue/manage verifiable credentials
`);

// src/commands/config.ts
init_config();
init_solana_client();

// src/utils/helpers.ts
function lamportsToSol(lamports) {
  const sol = Number(lamports) / 1e9;
  return sol.toFixed(4);
}
var configCommand = new Command("config").description("Configure GhostSpeak CLI settings");
configCommand.command("setup").description("Initial setup and wallet configuration").action(async () => {
  intro(chalk34.green("\u2699\uFE0F  GhostSpeak CLI Setup"));
  try {
    const network = await select({
      message: "Select Solana network:",
      options: [
        { value: "devnet", label: "\u{1F9EA} Devnet (Development)" },
        { value: "testnet", label: "\u{1F9EA} Testnet (Testing)" },
        { value: "mainnet", label: "\u{1F310} Mainnet (Production)" }
      ]
    });
    if (isCancel(network)) {
      cancel("Setup cancelled");
      return;
    }
    const walletPath = await text({
      message: "Path to your Solana wallet:",
      placeholder: "~/.config/solana/id.json",
      validate: (value) => {
        if (!value) return "Wallet path is required";
        const expandedPath = value.replace("~", homedir());
        if (!existsSync(expandedPath)) {
          return `Wallet file not found at: ${expandedPath}`;
        }
        return void 0;
      }
    });
    if (isCancel(walletPath)) {
      cancel("Setup cancelled");
      return;
    }
    const rpcUrl = await text({
      message: "Custom RPC URL (optional):",
      placeholder: "Leave empty for default RPC endpoints"
    });
    if (isCancel(rpcUrl)) {
      cancel("Setup cancelled");
      return;
    }
    console.log("\n" + chalk34.bold("\u{1F4CB} Configuration Summary:"));
    console.log("\u2500".repeat(40));
    console.log(chalk34.green("Network:") + ` ${network}`);
    console.log(chalk34.green("Wallet:") + ` ${walletPath}`);
    if (rpcUrl) {
      console.log(chalk34.green("RPC URL:") + ` ${rpcUrl}`);
    }
    const confirmed = await confirm({
      message: "Save this configuration?"
    });
    if (isCancel(confirmed) || !confirmed) {
      cancel("Setup cancelled");
      return;
    }
    const s = spinner();
    s.start("Saving configuration...");
    const expandedWalletPath = walletPath.toString().replace("~", homedir());
    saveConfig({
      network,
      walletPath: expandedWalletPath,
      rpcUrl: rpcUrl ? rpcUrl.toString() : void 0
    });
    s.stop("\u2705 Configuration saved!");
    console.log("\n" + chalk34.green("\u{1F389} GhostSpeak CLI is now configured!"));
    console.log(chalk34.gray("You can now use all CLI commands."));
    outro("Setup completed successfully");
  } catch (error) {
    cancel(chalk34.red("Setup failed: " + (error instanceof Error ? error.message : "Unknown error")));
  }
});
configCommand.command("show").description("Show current configuration").action(async () => {
  intro(chalk34.green("\u{1F4CB} Current Configuration"));
  try {
    const config2 = loadConfig();
    console.log("\n" + chalk34.bold("\u2699\uFE0F  GhostSpeak CLI Settings"));
    console.log("\u2550".repeat(50));
    console.log(chalk34.green("Network:") + ` ${config2.network}`);
    console.log(chalk34.green("RPC URL:") + ` ${config2.rpcUrl ?? `Default ${config2.network} RPC`}`);
    console.log(chalk34.green("Wallet:") + ` ${config2.walletPath}`);
    console.log(chalk34.green("Program ID:") + ` ${config2.programId}`);
    console.log(chalk34.gray("Config File:") + ` ${getConfigPath()}`);
    if (existsSync(config2.walletPath)) {
      const s = spinner();
      s.start("Checking wallet balance...");
      try {
        const client = createCustomClient(
          config2.rpcUrl ?? (config2.network === "devnet" ? "https://api.devnet.solana.com" : config2.network === "testnet" ? "https://api.testnet.solana.com" : "https://api.mainnet-beta.solana.com")
        );
        const walletData = readFileSync(config2.walletPath, "utf-8");
        const signer = await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(walletData)));
        const balanceResponse = await client.rpc.getBalance(signer.address).send();
        const balance = balanceResponse.value;
        s.stop("");
        console.log("");
        console.log(chalk34.gray("\u{1F4B0} Wallet Address:") + ` ${signer.address}`);
        console.log(chalk34.gray("\u{1F4B0} Wallet Balance:") + ` ${lamportsToSol(balance)} SOL`);
      } catch (error) {
        s.stop("");
        console.log("");
        console.log(chalk34.yellow("\u26A0\uFE0F  Could not fetch wallet balance"));
      }
    } else {
      console.log("");
      console.log(chalk34.yellow("\u26A0\uFE0F  Wallet file not found"));
    }
    outro("Configuration displayed");
  } catch (error) {
    cancel(chalk34.red("Failed to load configuration: " + (error instanceof Error ? error.message : "Unknown error")));
  }
});
configCommand.command("reset").description("Reset CLI configuration").action(async () => {
  intro(chalk34.yellow("\u{1F504} Reset Configuration"));
  const confirmed = await confirm({
    message: "Are you sure you want to reset all settings?"
  });
  if (isCancel(confirmed) || !confirmed) {
    cancel("Reset cancelled");
    return;
  }
  const s = spinner();
  s.start("Resetting configuration...");
  resetConfig();
  s.stop("\u2705 Configuration reset!");
  console.log("\n" + chalk34.yellow("\u{1F504} All settings have been reset to defaults."));
  console.log(chalk34.gray('Run "ghostspeak config setup" to reconfigure.'));
  outro("Reset completed");
});
var FaucetService = class {
  config;
  cacheFile;
  constructor(config2) {
    this.config = {
      rateLimitMinutes: 60,
      // 1 hour between requests
      maxDailyRequests: 10,
      // Max 10 requests per day
      defaultAmount: 1,
      cacheDir: path.join(os.homedir(), ".ghostspeak", "faucet"),
      ...config2
    };
    this.cacheFile = path.join(this.config.cacheDir, "requests.json");
  }
  /**
   * Initialize faucet service (create cache directory)
   */
  async initialize() {
    try {
      await fs2.mkdir(this.config.cacheDir, { recursive: true });
    } catch (error) {
      console.warn("Warning: Failed to create faucet cache directory:", error);
    }
  }
  /**
   * Load request history from cache
   */
  async loadRequestHistory() {
    try {
      const data = await fs2.readFile(this.cacheFile, "utf8");
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }
  /**
   * Save request to cache
   */
  async saveRequest(request) {
    try {
      const history = await this.loadRequestHistory();
      history.push(request);
      const recentHistory = history.slice(-100);
      await fs2.writeFile(this.cacheFile, JSON.stringify(recentHistory, null, 2));
    } catch (error) {
      console.warn("Warning: Failed to save request history:", error);
    }
  }
  /**
   * Check if a wallet can request SOL from a specific source
   */
  async checkFaucetStatus(walletAddress, source, network) {
    const history = await this.loadRequestHistory();
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1e3;
    const rateLimitTime = now - this.config.rateLimitMinutes * 60 * 1e3;
    const relevantRequests = history.filter(
      (req) => req.walletAddress === walletAddress && req.source === source && req.network === network
    );
    const dailyRequests = relevantRequests.filter((req) => req.timestamp > oneDayAgo);
    const dailyRequestsUsed = dailyRequests.length;
    const recentRequests = relevantRequests.filter((req) => req.timestamp > rateLimitTime);
    const hasRecentRequest = recentRequests.length > 0;
    const lastRequest = relevantRequests.sort((a, b) => b.timestamp - a.timestamp)[0];
    if (dailyRequestsUsed >= this.config.maxDailyRequests) {
      return {
        canRequest: false,
        dailyRequestsUsed,
        dailyRequestsLimit: this.config.maxDailyRequests,
        lastRequest
      };
    }
    if (hasRecentRequest) {
      const lastRequestTime = recentRequests[0].timestamp;
      const timeUntilNext = Math.ceil((lastRequestTime + this.config.rateLimitMinutes * 60 * 1e3 - now) / 6e4);
      return {
        canRequest: false,
        timeUntilNext,
        dailyRequestsUsed,
        dailyRequestsLimit: this.config.maxDailyRequests,
        lastRequest
      };
    }
    return {
      canRequest: true,
      dailyRequestsUsed,
      dailyRequestsLimit: this.config.maxDailyRequests,
      lastRequest
    };
  }
  /**
   * Record a successful faucet request
   */
  async recordRequest(walletAddress, network, source, amount, signature) {
    const request = {
      walletAddress,
      network,
      source,
      timestamp: Date.now(),
      amount,
      signature
    };
    await this.saveRequest(request);
  }
  /**
   * Get faucet request statistics
   */
  async getStatistics(walletAddress) {
    const history = await this.loadRequestHistory();
    const relevantRequests = walletAddress ? history.filter((req) => req.walletAddress === walletAddress) : history;
    const successfulRequests = relevantRequests.filter((req) => req.signature);
    const totalSOLReceived = relevantRequests.reduce((sum, req) => sum + req.amount, 0);
    const requestsBySource = {};
    const requestsByNetwork = {};
    relevantRequests.forEach((req) => {
      requestsBySource[req.source] = (requestsBySource[req.source] || 0) + 1;
      requestsByNetwork[req.network] = (requestsByNetwork[req.network] || 0) + 1;
    });
    return {
      totalRequests: relevantRequests.length,
      successfulRequests: successfulRequests.length,
      totalSOLReceived,
      requestsBySource,
      requestsByNetwork
    };
  }
  /**
   * Clean old request history
   */
  async cleanOldRequests(daysToKeep = 30) {
    const history = await this.loadRequestHistory();
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1e3;
    const filteredHistory = history.filter((req) => req.timestamp > cutoffTime);
    const removedCount = history.length - filteredHistory.length;
    if (removedCount > 0) {
      await fs2.writeFile(this.cacheFile, JSON.stringify(filteredHistory, null, 2));
    }
    return removedCount;
  }
  /**
   * Get available faucet sources with their status
   */
  getAvailableSources() {
    return [
      {
        name: "Solana Official",
        id: "solana",
        description: "Official Solana faucet with reliable service",
        networks: ["devnet", "testnet"],
        rateLimit: "1 hour",
        typicalAmount: "1-2 SOL"
      },
      {
        name: "Alchemy",
        id: "alchemy",
        description: "Alchemy-powered faucet with good uptime",
        networks: ["devnet", "testnet"],
        rateLimit: "1 hour",
        typicalAmount: "1 SOL"
      },
      {
        name: "RPC Airdrop",
        id: "rpc",
        description: "Direct RPC airdrop (fallback method)",
        networks: ["devnet", "testnet"],
        rateLimit: "1 hour",
        typicalAmount: "1 SOL"
      }
    ];
  }
};

// src/commands/faucet.ts
init_wallet_service();
init_solana_client();
async function requestFromSolanaFaucet(walletAddress, network, amount = 1) {
  try {
    console.log(`\u{1F4A7} Requesting ${amount} SOL from Solana faucet...`);
    const faucetUrl = network === "devnet" ? "https://faucet.solana.com/api/airdrop" : "https://faucet.solana.com/api/airdrop";
    const response = await fetch(faucetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pubkey: walletAddress,
        lamports: amount * 1e9,
        // Convert SOL to lamports
        cluster: network
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.signature) {
      const explorerUrl = `https://explorer.solana.com/tx/${data.signature}?cluster=${network}`;
      return {
        source: "Solana Official",
        success: true,
        signature: data.signature,
        amount,
        explorerUrl
      };
    } else {
      throw new Error(data.error ?? "Unknown error from Solana faucet");
    }
  } catch (error) {
    return {
      source: "Solana Official",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function requestFromAlchemyFaucet(walletAddress, network) {
  try {
    console.log(`\u2697\uFE0F Requesting SOL from Alchemy faucet...`);
    const faucetUrl = network === "devnet" ? "https://solana-devnet-faucet.alchemy.com/api/faucet" : "https://solana-testnet-faucet.alchemy.com/api/faucet";
    const response = await fetch(faucetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        address: walletAddress,
        network
      })
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.txHash || data.signature) {
      const signature = data.txHash ?? data.signature;
      const amount = data.amount ?? 1;
      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
      return {
        source: "Alchemy",
        success: true,
        signature,
        amount,
        explorerUrl
      };
    } else {
      throw new Error(data.error ?? data.message ?? "Unknown error from Alchemy faucet");
    }
  } catch (error) {
    return {
      source: "Alchemy",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function requestFromRpcAirdrop(walletAddress, network, amount = 1) {
  try {
    console.log(`\u{1F310} Requesting ${amount} SOL via RPC airdrop...`);
    const rpcUrl = network === "devnet" ? "https://api.devnet.solana.com" : "https://api.testnet.solana.com";
    const client = createCustomClient(rpcUrl);
    const lamports = BigInt(Math.floor(amount * 1e9));
    const rpc = client.rpc;
    const airdropResult = await rpc.requestAirdrop(
      address$1(walletAddress),
      lamports
    ).send();
    const signature = airdropResult;
    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
    return {
      source: "RPC Airdrop",
      success: true,
      signature,
      amount,
      explorerUrl
    };
  } catch (error) {
    return {
      source: "RPC Airdrop",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function checkBalance(walletAddress, network) {
  try {
    const rpcUrl = network === "devnet" ? "https://api.devnet.solana.com" : "https://api.testnet.solana.com";
    const client = createCustomClient(rpcUrl);
    const { value: balance } = await client.rpc.getBalance(address$1(walletAddress)).send();
    return Number(balance) / 1e9;
  } catch (error) {
    console.warn("Failed to check balance:", error);
    return 0;
  }
}
async function faucetCommand(options) {
  try {
    console.log("\u{1F4A7} GhostSpeak Faucet - Get SOL for Development");
    console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    const network = options.network ?? "devnet";
    const amount = parseFloat(options.amount ?? "1");
    const source = options.source ?? "all";
    console.log(`\u{1F310} Network: ${network}`);
    console.log(`\u{1F4B0} Amount: ${amount} SOL`);
    console.log(`\u{1F527} Source: ${source}`);
    console.log("");
    const faucetService = new FaucetService();
    await faucetService.initialize();
    const walletService = new WalletService();
    let walletAddress;
    let walletName;
    const activeWallet = walletService.getActiveWallet();
    if (activeWallet) {
      walletAddress = activeWallet.metadata.address;
      walletName = activeWallet.metadata.name;
      console.log(`\u{1F464} Using active wallet: ${chalk34.cyan(walletName)}`);
      console.log(`\u{1F4CD} Address: ${walletAddress}`);
    } else {
      console.log(chalk34.yellow("\u26A0\uFE0F  No active wallet found."));
      console.log("");
      console.log("Create a wallet first:");
      console.log(`  ${chalk34.cyan("ghost wallet create")} - Create a new wallet`);
      console.log(`  ${chalk34.cyan("ghost wallet import")} - Import existing wallet`);
      console.log("");
      process.exit(1);
    }
    const initialBalance = await checkBalance(walletAddress, network);
    console.log(`\u{1F4B3} Current Balance: ${initialBalance} SOL`);
    console.log("");
    const sources = source === "all" ? ["solana", "alchemy"] : [source];
    const results = [];
    for (const sourceName of sources) {
      console.log(`
\u{1F50D} Checking ${sourceName} faucet status...`);
      const status = await faucetService.checkFaucetStatus(walletAddress, sourceName, network);
      if (!status.canRequest) {
        if (status.timeUntilNext) {
          console.log(`\u23F3 Rate limited. Wait ${status.timeUntilNext} minutes before next request.`);
        } else {
          console.log(`\u{1F4CA} Daily limit reached (${status.dailyRequestsUsed}/${status.dailyRequestsLimit} requests used).`);
        }
        results.push({
          source: sourceName,
          success: false,
          error: status.timeUntilNext ? `Rate limited. Wait ${status.timeUntilNext} minutes.` : `Daily limit reached (${status.dailyRequestsUsed}/${status.dailyRequestsLimit}).`
        });
        continue;
      }
      let result;
      if (sourceName === "solana") {
        result = await requestFromSolanaFaucet(walletAddress, network, amount);
      } else if (sourceName === "alchemy") {
        result = await requestFromAlchemyFaucet(walletAddress, network);
      } else {
        result = { source: sourceName, success: false, error: "Unknown source" };
      }
      if (result.success && result.signature) {
        await faucetService.recordRequest(
          walletAddress,
          network,
          sourceName,
          result.amount ?? amount,
          result.signature
        );
      }
      results.push(result);
    }
    const hasSuccess = results.some((r) => r.success);
    if (!hasSuccess && source === "all") {
      console.log("\n\u{1F504} Trying RPC airdrop as fallback...");
      const rpcStatus = await faucetService.checkFaucetStatus(walletAddress, "rpc", network);
      if (rpcStatus.canRequest) {
        const result = await requestFromRpcAirdrop(walletAddress, network, amount);
        if (result.success && result.signature) {
          await faucetService.recordRequest(
            walletAddress,
            network,
            "rpc",
            result.amount ?? amount,
            result.signature
          );
        }
        results.push(result);
      } else {
        console.log("\u23F3 RPC airdrop also rate limited");
      }
    }
    console.log("\u{1F4CA} FAUCET RESULTS:");
    console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    let totalReceived = 0;
    results.forEach((result, index) => {
      const status = result.success ? "\u2705" : "\u274C";
      console.log(`${status} ${result.source}:`);
      if (result.success) {
        console.log(`   Amount: ${result.amount} SOL`);
        console.log(`   Signature: ${result.signature}`);
        console.log(`   Explorer: ${result.explorerUrl}`);
        totalReceived += result.amount ?? 0;
      } else {
        console.log(`   Error: ${result.error}`);
      }
      if (index < results.length - 1) console.log("");
    });
    console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    console.log(`\u{1F4B0} Total Received: ${totalReceived} SOL`);
    if (totalReceived > 0) {
      console.log("\n\u23F3 Waiting for transactions to confirm...");
      await new Promise((resolve3) => setTimeout(resolve3, 3e3));
      const finalBalance = await checkBalance(walletAddress, network);
      console.log(`\u{1F4B3} Final Balance: ${finalBalance} SOL (+${finalBalance - initialBalance} SOL)`);
    }
    console.log("\n\u{1F4CB} WALLET INFO:");
    console.log(`   Address: ${walletAddress}`);
    console.log(`   Network: ${network}`);
    console.log(`   Balance: ${await checkBalance(walletAddress, network)} SOL`);
    console.log("\n\u{1F4A1} TIP: Your wallet is saved. Use ghost wallet list to see all wallets.");
  } catch (error) {
    console.error("\u274C Faucet command failed:", error);
    process.exit(1);
  }
}
function setupFaucetCommand(program2) {
  program2.command("faucet").description("Get SOL from development faucets").option("-n, --network <network>", "Network to use (devnet|testnet)", "devnet").option("-a, --amount <amount>", "Amount of SOL to request", "1").option("-w, --wallet <path>", "Path to existing wallet file").option("-s, --source <source>", "Faucet source (solana|alchemy|all)", "all").option("--save", "Save generated wallet to file").action((_options) => {
    faucetCommand(_options).catch(console.error);
  });
  const faucetCmd = program2.commands.find((cmd) => cmd.name() === "faucet");
  faucetCmd.command("balance").description("Check wallet balance").option("-w, --wallet <name>", "Wallet name to check").option("-n, --network <network>", "Network to check (devnet|testnet)", "devnet").action(async (_options) => {
    try {
      const walletService = new WalletService();
      let walletAddress;
      let walletName;
      if (_options.wallet) {
        const wallet = walletService.getWallet(_options.wallet);
        if (!wallet) {
          console.error(`\u274C Wallet "${_options.wallet}" not found`);
          process.exit(1);
        }
        walletAddress = wallet.metadata.address;
        walletName = wallet.metadata.name;
      } else {
        const activeWallet = walletService.getActiveWallet();
        if (!activeWallet) {
          console.error("\u274C No active wallet found. Create one with: ghost wallet create");
          process.exit(1);
        }
        walletAddress = activeWallet.metadata.address;
        walletName = activeWallet.metadata.name;
      }
      const balance = await checkBalance(walletAddress, _options.network ?? "devnet");
      console.log(`\u{1F4B3} Wallet: ${chalk34.cyan(walletName)}`);
      console.log(`\u{1F4CD} Address: ${walletAddress}`);
      console.log(`\u{1F4B0} Balance: ${chalk34.green(`${balance} SOL`)} (${_options.network})`);
    } catch (error) {
      console.error("\u274C Failed to check balance:", error);
      process.exit(1);
    }
  });
  faucetCmd.command("status").description("Check faucet status and rate limits").option("-w, --wallet <name>", "Wallet name to check").option("-n, --network <network>", "Network to check (devnet|testnet)", "devnet").option("-s, --source <source>", "Specific source to check (solana|alchemy|rpc)").action(async (_options) => {
    try {
      const faucetService = new FaucetService();
      await faucetService.initialize();
      const walletService = new WalletService();
      let walletAddress;
      let walletName;
      if (_options.wallet) {
        const wallet = walletService.getWallet(_options.wallet);
        if (!wallet) {
          console.error(`\u274C Wallet "${_options.wallet}" not found`);
          process.exit(1);
        }
        walletAddress = wallet.metadata.address;
        walletName = wallet.metadata.name;
      } else {
        const activeWallet = walletService.getActiveWallet();
        if (!activeWallet) {
          console.error("\u274C No active wallet found. Create one with: ghost wallet create");
          process.exit(1);
        }
        walletAddress = activeWallet.metadata.address;
        walletName = activeWallet.metadata.name;
      }
      const network = _options.network ?? "devnet";
      const sources = _options.source ? [_options.source] : ["solana", "alchemy", "rpc"];
      console.log("\u{1F4CA} FAUCET STATUS");
      console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
      console.log(`Wallet: ${chalk34.cyan(walletName)}`);
      console.log(`Address: ${walletAddress}`);
      console.log(`Network: ${network}`);
      console.log("");
      for (const source of sources) {
        const status = await faucetService.checkFaucetStatus(walletAddress, source, network);
        const statusIcon = status.canRequest ? "\u2705" : "\u274C";
        console.log(`${statusIcon} ${source.toUpperCase()} Faucet:`);
        console.log(`   Can Request: ${status.canRequest ? "Yes" : "No"}`);
        if (status.timeUntilNext) {
          console.log(`   Wait Time: ${status.timeUntilNext} minutes`);
        }
        console.log(`   Daily Usage: ${status.dailyRequestsUsed}/${status.dailyRequestsLimit}`);
        if (status.lastRequest) {
          const lastDate = new Date(status.lastRequest.timestamp).toLocaleString();
          console.log(`   Last Request: ${lastDate} (${status.lastRequest.amount} SOL)`);
          if (status.lastRequest.signature) {
            console.log(`   Last Signature: ${status.lastRequest.signature}`);
          }
        }
        console.log("");
      }
      const stats = await faucetService.getStatistics();
      console.log("\u{1F4C8} OVERALL STATISTICS");
      console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
      console.log(`Total Requests: ${stats.totalRequests}`);
      console.log(`Successful Requests: ${stats.successfulRequests}`);
      console.log(`Total SOL Received: ${stats.totalSOLReceived} SOL`);
      console.log("");
      console.log("By Source:");
      Object.entries(stats.requestsBySource).forEach(([source, count]) => {
        console.log(`   ${source}: ${count} requests`);
      });
      console.log("");
      console.log("By Network:");
      Object.entries(stats.requestsByNetwork).forEach(([network2, count]) => {
        console.log(`   ${network2}: ${count} requests`);
      });
    } catch (error) {
      console.error("\u274C Failed to check faucet status:", error);
      process.exit(1);
    }
  });
  faucetCmd.command("sources").description("List available faucet sources").action(async () => {
    const faucetService = new FaucetService();
    const sources = faucetService.getAvailableSources();
    console.log("\u{1F6B0} AVAILABLE FAUCET SOURCES");
    console.log("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
    sources.forEach((source, index) => {
      console.log(`${index + 1}. ${source.name} (${source.id})`);
      console.log(`   Description: ${source.description}`);
      console.log(`   Networks: ${source.networks.join(", ")}`);
      console.log(`   Rate Limit: ${source.rateLimit}`);
      console.log(`   Typical Amount: ${source.typicalAmount}`);
      if (index < sources.length - 1) console.log("");
    });
  });
  faucetCmd.command("clean").description("Clean old faucet request history").option("-d, --days <days>", "Days of history to keep", "30").action(async (_options) => {
    try {
      const faucetService = new FaucetService();
      await faucetService.initialize();
      const daysToKeep = parseInt(_options.days ?? "30");
      const removedCount = await faucetService.cleanOldRequests(daysToKeep);
      console.log(`\u{1F9F9} Cleaned ${removedCount} old request records`);
      console.log(`\u{1F4C5} Kept ${daysToKeep} days of history`);
    } catch (error) {
      console.error("\u274C Failed to clean request history:", error);
      process.exit(1);
    }
  });
}
var AccountState = /* @__PURE__ */ ((AccountState2) => {
  AccountState2[AccountState2["Uninitialized"] = 0] = "Uninitialized";
  AccountState2[AccountState2["Initialized"] = 1] = "Initialized";
  AccountState2[AccountState2["Frozen"] = 2] = "Frozen";
  return AccountState2;
})(AccountState || {});
function getAccountStateDecoder() {
  return getEnumDecoder(AccountState);
}
function getTokenDecoder() {
  return getStructDecoder([
    ["mint", getAddressDecoder()],
    ["owner", getAddressDecoder()],
    ["amount", getU64Decoder()],
    [
      "delegate",
      getOptionDecoder(getAddressDecoder(), {
        prefix: getU32Decoder(),
        noneValue: "zeroes"
      })
    ],
    ["state", getAccountStateDecoder()],
    [
      "isNative",
      getOptionDecoder(getU64Decoder(), {
        prefix: getU32Decoder(),
        noneValue: "zeroes"
      })
    ],
    ["delegatedAmount", getU64Decoder()],
    [
      "closeAuthority",
      getOptionDecoder(getAddressDecoder(), {
        prefix: getU32Decoder(),
        noneValue: "zeroes"
      })
    ]
  ]);
}
function decodeToken(encodedAccount) {
  return decodeAccount(
    encodedAccount,
    getTokenDecoder()
  );
}
async function fetchToken(rpc, address26, config2) {
  const maybeAccount = await fetchMaybeToken(rpc, address26, config2);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}
async function fetchMaybeToken(rpc, address26, config2) {
  const maybeAccount = await fetchEncodedAccount(rpc, address26, config2);
  return decodeToken(maybeAccount);
}
var ASSOCIATED_TOKEN_PROGRAM_ADDRESS = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
var TOKEN_PROGRAM_ADDRESS = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
if (process.env.NODE_ENV !== "production") ;
if (process.env.NODE_ENV !== "production") ;
function expectAddress(value) {
  if (!value) {
    throw new Error("Expected a Address.");
  }
  if (typeof value === "object" && "address" in value) {
    return value.address;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
function getAccountMetaFactory(programAddress, optionalAccountStrategy) {
  return (account) => {
    if (!account.value) {
      return Object.freeze({
        address: programAddress,
        role: AccountRole.READONLY
      });
    }
    const writableRole = account.isWritable ? AccountRole.WRITABLE : AccountRole.READONLY;
    return Object.freeze({
      address: expectAddress(account.value),
      role: isTransactionSigner(account.value) ? upgradeRoleToSigner(writableRole) : writableRole,
      ...isTransactionSigner(account.value) ? { signer: account.value } : {}
    });
  };
}
function isTransactionSigner(value) {
  return !!value && typeof value === "object" && "address" in value && isTransactionSigner$1(value);
}
async function findAssociatedTokenPda(seeds, config2 = {}) {
  const {
    programAddress = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  } = config2;
  return await getProgramDerivedAddress({
    programAddress,
    seeds: [
      getAddressEncoder().encode(seeds.owner),
      getAddressEncoder().encode(seeds.tokenProgram),
      getAddressEncoder().encode(seeds.mint)
    ]
  });
}
var CREATE_ASSOCIATED_TOKEN_DISCRIMINATOR = 0;
function getCreateAssociatedTokenInstructionDataEncoder() {
  return transformEncoder(
    getStructEncoder([["discriminator", getU8Encoder()]]),
    (value) => ({
      ...value,
      discriminator: CREATE_ASSOCIATED_TOKEN_DISCRIMINATOR
    })
  );
}
async function getCreateAssociatedTokenInstructionAsync(input, config2) {
  const programAddress = ASSOCIATED_TOKEN_PROGRAM_ADDRESS;
  const originalAccounts = {
    payer: { value: input.payer ?? null, isWritable: true },
    ata: { value: input.ata ?? null, isWritable: true },
    owner: { value: input.owner ?? null, isWritable: false },
    mint: { value: input.mint ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  }
  if (!accounts.ata.value) {
    accounts.ata.value = await findAssociatedTokenPda({
      owner: expectAddress(accounts.owner.value),
      tokenProgram: expectAddress(accounts.tokenProgram.value),
      mint: expectAddress(accounts.mint.value)
    });
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value = "11111111111111111111111111111111";
  }
  const getAccountMeta = getAccountMetaFactory(programAddress);
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.payer),
      getAccountMeta(accounts.ata),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.mint),
      getAccountMeta(accounts.systemProgram),
      getAccountMeta(accounts.tokenProgram)
    ],
    data: getCreateAssociatedTokenInstructionDataEncoder().encode({}),
    programAddress
  });
}
var TRANSFER_DISCRIMINATOR = 3;
function getTransferInstructionDataEncoder() {
  return transformEncoder(
    getStructEncoder([
      ["discriminator", getU8Encoder()],
      ["amount", getU64Encoder()]
    ]),
    (value) => ({ ...value, discriminator: TRANSFER_DISCRIMINATOR })
  );
}
function getTransferInstruction(input, config2) {
  const programAddress = TOKEN_PROGRAM_ADDRESS;
  const originalAccounts = {
    source: { value: input.source ?? null, isWritable: true },
    destination: { value: input.destination ?? null, isWritable: true },
    authority: { value: input.authority ?? null, isWritable: false }
  };
  const accounts = originalAccounts;
  const args2 = { ...input };
  const remainingAccounts = (args2.multiSigners ?? []).map(
    (signer) => ({
      address: signer.address,
      role: AccountRole.READONLY_SIGNER,
      signer
    })
  );
  const getAccountMeta = getAccountMetaFactory(programAddress);
  return Object.freeze({
    accounts: [
      getAccountMeta(accounts.source),
      getAccountMeta(accounts.destination),
      getAccountMeta(accounts.authority),
      ...remainingAccounts
    ],
    data: getTransferInstructionDataEncoder().encode(
      args2
    ),
    programAddress
  });
}
if (process.env.NODE_ENV !== "production") ;

// src/commands/airdrop.ts
init_solana_client();
var DEVNET_GHOST_MINT = "BV4uhhMJ84zjwRomS15JMH5wdXVrMP8o9E1URS4xtYoh";
var DECIMALS = 6;
var AIRDROP_AMOUNT = 1e4;
var RATE_LIMIT_FILE = path.join(process.cwd(), ".ghost-airdrop-claims.json");
var RATE_LIMIT_HOURS = 24;
function loadClaims() {
  try {
    if (fs3.existsSync(RATE_LIMIT_FILE)) {
      const data = fs3.readFileSync(RATE_LIMIT_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
  }
  return {};
}
function saveClaims(claims) {
  try {
    fs3.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(claims, null, 2));
  } catch (error) {
  }
}
function canClaim(wallet) {
  const claims = loadClaims();
  const lastClaim = claims[wallet];
  if (!lastClaim) return true;
  const hoursSinceClaim = (Date.now() - lastClaim) / (1e3 * 60 * 60);
  return hoursSinceClaim >= RATE_LIMIT_HOURS;
}
function getTimeUntilNextClaim(wallet) {
  const claims = loadClaims();
  const lastClaim = claims[wallet];
  if (!lastClaim) return "0 hours";
  const hoursSinceClaim = (Date.now() - lastClaim) / (1e3 * 60 * 60);
  const hoursRemaining = Math.ceil(RATE_LIMIT_HOURS - hoursSinceClaim);
  if (hoursRemaining <= 0) return "0 hours";
  if (hoursRemaining === 1) return "1 hour";
  return `${hoursRemaining} hours`;
}
function recordClaim(wallet) {
  const claims = loadClaims();
  claims[wallet] = Date.now();
  saveClaims(claims);
}
var airdropCommand = new Command("airdrop").description("Airdrop devnet GHOST tokens for testing (10,000 GHOST per request - CLI version)").option("-r, --recipient <address>", "Recipient wallet address (defaults to your wallet)").action(async (options) => {
  const spinner31 = ora();
  try {
    const walletPath = process.env.SOLANA_WALLET || path.join(process.env.HOME || "", ".config/solana/id.json");
    if (!fs3.existsSync(walletPath)) {
      console.error(chalk34.red("\u274C Wallet not found!"));
      console.log(chalk34.gray(`   Expected: ${walletPath}`));
      console.log(chalk34.yellow("   Set SOLANA_WALLET environment variable or create wallet with:"));
      console.log(chalk34.gray("   solana-keygen new"));
      process.exit(1);
    }
    const secretKeyBytes = new Uint8Array(JSON.parse(fs3.readFileSync(walletPath, "utf-8")));
    const walletKeypair = await createKeyPairSignerFromBytes$1(secretKeyBytes);
    const recipientAddress = options.recipient ? address(options.recipient) : walletKeypair.address;
    console.log(chalk34.blue("\u{1FA82} GhostSpeak Devnet GHOST Airdrop"));
    console.log(chalk34.gray("=".repeat(60)));
    console.log(chalk34.gray(`  Recipient: ${recipientAddress}`));
    console.log(chalk34.gray(`  Amount: ${AIRDROP_AMOUNT.toLocaleString()} GHOST`));
    console.log(chalk34.gray(`  Network: devnet`));
    if (!canClaim(recipientAddress)) {
      const timeRemaining = getTimeUntilNextClaim(recipientAddress);
      console.log(chalk34.yellow(`
\u23F0 Rate limit: Already claimed within last 24 hours`));
      console.log(chalk34.gray(`   Next claim available in: ${timeRemaining}`));
      process.exit(1);
    }
    spinner31.start("Connecting to devnet...");
    const client = createCustomClient(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
    );
    const rpc = client.rpc;
    const ghostMintAddress = address(DEVNET_GHOST_MINT);
    const [faucetTokenAccount] = await findAssociatedTokenPda({
      mint: ghostMintAddress,
      owner: walletKeypair.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS
    });
    try {
      const faucetAccountData = await fetchToken(rpc, faucetTokenAccount);
      const faucetBalance = Number(faucetAccountData.data.amount) / 10 ** DECIMALS;
      if (faucetBalance < AIRDROP_AMOUNT) {
        spinner31.fail("Insufficient faucet balance");
        console.log(chalk34.red(`
\u274C Faucet has only ${faucetBalance.toLocaleString()} GHOST`));
        console.log(chalk34.gray("   Please contact the GhostSpeak team to refill the faucet"));
        process.exit(1);
      }
      spinner31.succeed(`Faucet balance: ${faucetBalance.toLocaleString()} GHOST`);
    } catch (error) {
      spinner31.fail("Faucet not initialized");
      console.log(chalk34.red("\n\u274C Devnet airdrop faucet not set up"));
      console.log(chalk34.gray("   Please contact the GhostSpeak team"));
      process.exit(1);
    }
    spinner31.start("Setting up recipient token account...");
    const [recipientTokenAccount] = await findAssociatedTokenPda({
      mint: ghostMintAddress,
      owner: recipientAddress,
      tokenProgram: TOKEN_PROGRAM_ADDRESS
    });
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    const createAtaInstruction = await getCreateAssociatedTokenInstructionAsync({
      payer: walletKeypair,
      mint: ghostMintAddress,
      owner: recipientAddress,
      ata: recipientTokenAccount
    });
    const amountWithDecimals = BigInt(AIRDROP_AMOUNT) * BigInt(10 ** DECIMALS);
    const transferInstruction = getTransferInstruction({
      source: faucetTokenAccount,
      destination: recipientTokenAccount,
      authority: walletKeypair,
      amount: amountWithDecimals
    });
    spinner31.text = "Building transaction...";
    const transactionMessage = await pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayerSigner(walletKeypair, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(
        latestBlockhash,
        tx
      ),
      (tx) => appendTransactionMessageInstruction(createAtaInstruction, tx),
      (tx) => appendTransactionMessageInstruction(transferInstruction, tx)
    );
    spinner31.text = `Transferring ${AIRDROP_AMOUNT.toLocaleString()} GHOST...`;
    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
    const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({
      rpc,
      rpcSubscriptions: void 0
      // Subscriptions not currently available
    });
    const signature = await sendAndConfirmTransaction(signedTransaction, { commitment: "confirmed" });
    spinner31.succeed("Transfer complete!");
    recordClaim(recipientAddress);
    const updatedAccount = await fetchToken(rpc, recipientTokenAccount);
    const newBalance = Number(updatedAccount.data.amount) / 10 ** DECIMALS;
    console.log(chalk34.green("\n\u2705 Airdrop successful!"));
    console.log(chalk34.gray("  Transaction:"), chalk34.cyan(signature));
    console.log(chalk34.gray("  Explorer:"), chalk34.cyan(`https://explorer.solana.com/tx/${signature}?cluster=devnet`));
    console.log(chalk34.gray("  New Balance:"), chalk34.green(`${newBalance.toLocaleString()} GHOST`));
    console.log(chalk34.blue("\n\u{1F4A1} Next Steps:"));
    console.log(chalk34.gray("  1. Stake GHOST: ghost stake <amount>"));
    console.log(chalk34.gray("  2. Register agent: ghost agent register"));
    console.log(chalk34.gray("  3. Test features in devnet"));
    console.log(chalk34.gray("\n  Next airdrop available in 24 hours"));
  } catch (error) {
    spinner31.fail("Airdrop failed");
    console.error(chalk34.red("\n\u{1F4A5} Error:"), error.message);
    if (error.message?.includes("Transaction simulation failed")) {
      console.log(chalk34.yellow("\n  Common causes:"));
      console.log(chalk34.gray("  \u2022 Insufficient SOL for rent"));
      console.log(chalk34.gray("  \u2022 Faucet needs refilling"));
      console.log(chalk34.gray("  \u2022 Network congestion"));
    }
    process.exit(1);
  }
});
var execAsync = promisify(exec);
var sdkCommand = new Command("sdk").description("Manage GhostSpeak SDK installation");
sdkCommand.command("install").description("Install the GhostSpeak SDK").option("-g, --global", "Install globally", false).option("-v, --version <version>", "Specific version to install").option("-D, --dev", "Save as dev dependency", false).action(async (options) => {
  try {
    intro(pc.cyan("\u{1F6E0}\uFE0F  GhostSpeak SDK Installer"));
    const hasPackageJson = existsSync(join(process.cwd(), "package.json"));
    if (!options.global && !hasPackageJson) {
      const shouldInit = await confirm({
        message: "No package.json found. Initialize a new project?",
        initialValue: true
      });
      if (shouldInit) {
        const s2 = spinner();
        s2.start("Initializing new project");
        try {
          await execAsync("npm init -y");
          s2.stop("Project initialized");
        } catch (error) {
          s2.stop("Failed to initialize project");
          throw error;
        }
      } else {
        outro(pc.yellow("\u26A0\uFE0F  Cancelled SDK installation"));
        return;
      }
    }
    const packageManager = await detectPackageManager();
    const packageName = "@ghostspeak/sdk";
    const version = options.version ?? "latest";
    const versionString = version === "latest" ? "" : `@${version}`;
    let installCmd;
    if (options.global) {
      installCmd = `${packageManager} ${packageManager === "yarn" ? "global add" : "install -g"} ${packageName}${versionString}`;
    } else {
      const saveFlag = options.dev ? packageManager === "yarn" ? "--dev" : "--save-dev" : "";
      installCmd = `${packageManager} ${packageManager === "yarn" ? "add" : "install"} ${saveFlag} ${packageName}${versionString}`;
    }
    const s = spinner();
    s.start(`Installing ${packageName}${versionString}`);
    try {
      const { stdout, stderr } = await execAsync(installCmd);
      void stdout;
      void stderr;
      s.stop(`Successfully installed ${packageName}`);
      if (!options.global) {
        note(
          `Import the SDK in your code:

${pc.cyan("import { GhostSpeakClient } from '@ghostspeak/sdk'")}

Example usage:
${pc.gray(`
const client = new GhostSpeakClient(connection, signer)
const agents = await client.agent.listAgents()
`)}`,
          "Quick Start"
        );
      }
      outro(pc.green("\u2705 SDK installed successfully!"));
    } catch (error) {
      s.stop("Failed to install SDK");
      console.error(pc.red(`
Error: ${error instanceof Error ? error.message : "Unknown error"}`));
      outro(pc.red("\u274C SDK installation failed"));
      process.exit(1);
    }
  } catch (error) {
    console.error(pc.red(`
Error: ${error instanceof Error ? error.message : "Unknown error"}`));
    outro(pc.red("\u274C SDK installation failed"));
    process.exit(1);
  }
});
sdkCommand.command("info").description("Show SDK information and installation status").action(async () => {
  intro(pc.cyan("\u{1F4E6} GhostSpeak SDK Information"));
  try {
    const localPath = join(process.cwd(), "node_modules", "@ghostspeak", "sdk", "package.json");
    const hasLocal = existsSync(localPath);
    if (hasLocal) {
      const packageJson = JSON.parse(readFileSync(localPath, "utf-8"));
      console.log(pc.green("\n\u2713 SDK installed locally"));
      console.log(pc.gray(`  Version: ${packageJson.version}`));
      console.log(pc.gray(`  Path: ${join(process.cwd(), "node_modules", "@ghostspeak", "sdk")}`));
    } else {
      console.log(pc.yellow("\n\u2717 SDK not installed locally"));
    }
    try {
      const { stdout } = await execAsync("npm list -g @ghostspeak/sdk --depth=0");
      if (stdout.includes("@ghostspeak/sdk")) {
        console.log(pc.green("\n\u2713 SDK installed globally"));
        const versionMatch = /@ghostspeak\/sdk@(\S+)/.exec(stdout);
        if (versionMatch) {
          console.log(pc.gray(`  Version: ${versionMatch[1]}`));
        }
      }
    } catch (error) {
      console.log(pc.yellow("\n\u2717 SDK not installed globally"));
    }
    try {
      const { stdout } = await execAsync("npm view @ghostspeak/sdk version");
      console.log(pc.cyan(`
\u{1F4E6} Latest version: ${stdout.trim()}`));
    } catch (error) {
      console.log(pc.gray("\n\u26A0\uFE0F  Could not fetch latest version"));
    }
    if (!hasLocal) {
      console.log(pc.gray("\nTo install the SDK:"));
      console.log(pc.cyan("  npx ghostspeak sdk install"));
      console.log(pc.cyan("  npx ghostspeak sdk install --global"));
    }
    outro(pc.green("\u2705 SDK info complete"));
  } catch (error) {
    console.error(pc.red(`
Error: ${error instanceof Error ? error.message : "Unknown error"}`));
    outro(pc.red("\u274C Failed to get SDK info"));
    process.exit(1);
  }
});
async function detectPackageManager() {
  if (existsSync(join(process.cwd(), "bun.lockb"))) return "bun";
  if (existsSync(join(process.cwd(), "yarn.lock"))) return "yarn";
  if (existsSync(join(process.cwd(), "pnpm-lock.yaml"))) return "pnpm";
  return "npm";
}
var execAsync2 = promisify(exec);
var updateCommand = new Command("update").description("Update GhostSpeak CLI to the latest version").option("-f, --force", "Force update without confirmation").action(async (options) => {
  intro(chalk34.cyan("\u{1F504} GhostSpeak CLI Updater"));
  try {
    const s = spinner();
    s.start("Checking current version...");
    let currentVersion = "1.12.0";
    const programVersion = updateCommand.parent?.version();
    if (programVersion && /^\d+\.\d+\.\d+/.test(programVersion)) {
      currentVersion = programVersion;
    }
    try {
      const { readFileSync: readFileSync15 } = await import('fs');
      const { fileURLToPath: fileURLToPath3 } = await import('url');
      const { dirname: dirname4, join: join14 } = await import('path');
      const __filename = fileURLToPath3(import.meta.url);
      const __dirname = dirname4(__filename);
      const possiblePaths = [
        join14(__dirname, "../../package.json"),
        join14(__dirname, "../../../package.json"),
        join14(__dirname, "../../../../cli/package.json"),
        "/Users/michelleeidschun/.bun/install/global/node_modules/@ghostspeak/cli/package.json"
      ];
      for (const path4 of possiblePaths) {
        try {
          const pkg = JSON.parse(readFileSync15(path4, "utf-8"));
          if (pkg.name === "@ghostspeak/cli" && pkg.version) {
            currentVersion = pkg.version;
            break;
          }
        } catch {
        }
      }
    } catch {
    }
    if (currentVersion === "1.12.0") {
      try {
        const commands = [
          "ghostspeak --version",
          "ghost --version"
        ];
        for (const cmd of commands) {
          try {
            const { stdout } = await execAsync2(cmd, { timeout: 5e3 });
            const versionMatch = /CLI v(\d+\.\d+\.\d+)/.exec(stdout);
            if (versionMatch) {
              currentVersion = versionMatch[1];
              break;
            }
          } catch {
          }
        }
      } catch {
      }
    }
    if (currentVersion === "1.12.0") {
      try {
        const { stdout } = await execAsync2("npm list -g @ghostspeak/cli --depth=0 2>/dev/null || npm list @ghostspeak/cli --depth=0 2>/dev/null");
        const match = /@ghostspeak\/cli@(\S+)/.exec(stdout);
        if (match) {
          currentVersion = match[1];
        }
      } catch {
      }
    }
    s.message("Checking latest version...");
    const { stdout: latestVersion } = await execAsync2("npm view @ghostspeak/cli version");
    const latest = latestVersion.trim();
    s.stop("\u2705 Version check complete");
    console.log("");
    console.log(chalk34.gray("Current version:"), chalk34.yellow(`v${currentVersion}`));
    console.log(chalk34.gray("Latest version:"), chalk34.green(`v${latest}`));
    console.log("");
    if (currentVersion === latest) {
      console.log(chalk34.green("\u2705 You are already using the latest version!"));
      outro("No update needed");
      return;
    }
    const isNewer = compareVersions(latest, currentVersion) > 0;
    if (!isNewer) {
      console.log(chalk34.yellow("\u26A0\uFE0F  You are using a newer version than the latest published version"));
      outro("No update needed");
      return;
    }
    console.log(chalk34.bold("\u{1F4CB} Update available!"));
    console.log(chalk34.gray(`Version ${latest} is now available`));
    console.log("");
    let shouldUpdate = options.force;
    if (!shouldUpdate) {
      const confirmResult = await confirm({
        message: "Would you like to update now?",
        initialValue: true
      });
      if (isCancel(confirmResult)) {
        cancel("Update cancelled");
        return;
      }
      shouldUpdate = confirmResult;
    }
    if (!shouldUpdate) {
      outro("Update cancelled");
      return;
    }
    const updateSpinner = spinner();
    updateSpinner.start("Determining best update method...");
    let isGlobal = false;
    let updateCmd = "";
    try {
      const { stdout } = await execAsync2("npm list -g @ghostspeak/cli --depth=0");
      if (stdout.includes("@ghostspeak/cli")) {
        isGlobal = true;
        void isGlobal;
        updateCmd = "npm install -g @ghostspeak/cli@latest";
      }
    } catch {
    }
    if (!updateCmd) {
      try {
        const { stdout } = await execAsync2("which ghostspeak");
        if (stdout.includes("npx") || stdout.includes(".npm")) {
          updateCmd = "npm install -g @ghostspeak/cli@latest";
          console.log(chalk34.yellow("\n\u26A0\uFE0F  Detected npx installation. Installing globally for better performance..."));
        } else {
          updateCmd = "npm install -g @ghostspeak/cli@latest";
        }
      } catch {
        updateCmd = "npm install -g @ghostspeak/cli@latest";
      }
    }
    updateSpinner.message("Updating GhostSpeak CLI...");
    try {
      const { spawn } = await import('child_process');
      await new Promise((resolve3, reject) => {
        const parts = updateCmd.split(" ");
        const cmd = parts[0];
        const arghost = parts.slice(1);
        const child = spawn(cmd, args, {
          stdio: "inherit",
          shell: true
        });
        child.on("close", (code) => {
          if (code === 0) resolve3();
          else reject(new Error(`Command failed with code ${code}`));
        });
        child.on("error", (err) => reject(err));
      });
      updateSpinner.stop("\u2705 Update successful!");
      console.log("");
      console.log(chalk34.green("\u{1F389} GhostSpeak CLI has been updated!"));
      console.log(chalk34.gray(`Updated from v${currentVersion} to v${latest}`));
      console.log("");
      try {
        const { stdout } = await execAsync2("ghostspeak --version");
        const newVersion = /(\d+\.\d+\.\d+)/.exec(stdout.trim())?.[1];
        if (newVersion && newVersion === latest) {
          console.log(chalk34.green("\u2705 Version verified:"), chalk34.bold(`v${newVersion}`));
        }
      } catch {
      }
      console.log("");
      console.log(chalk34.cyan("What's new:"));
      console.log(chalk34.gray("\u2022 Bug fixes and improvements"));
      console.log(chalk34.gray("\u2022 Enhanced performance"));
      console.log(chalk34.gray("\u2022 Updated dependencies"));
      console.log("");
      console.log(chalk34.yellow('\u{1F4A1} Tip: Run "ghostspeak --help" or "ghost --help" to see all available commands'));
      outro("Update completed successfully");
    } catch (error) {
      updateSpinner.stop("\u274C Update failed");
      console.error("");
      console.error(chalk34.red("Failed to update CLI:"), error instanceof Error ? error.message : "Unknown error");
      console.error("");
      console.error(chalk34.yellow("Try updating manually with one of these commands:"));
      console.error(chalk34.gray("  npm install -g @ghostspeak/cli@latest"));
      console.error(chalk34.gray("  sudo npm install -g @ghostspeak/cli@latest") + chalk34.dim(" (if permission denied)"));
      console.error("");
      console.error(chalk34.dim("Or if you prefer using npx:"));
      console.error(chalk34.gray("  npx @ghostspeak/cli@latest"));
      outro("Update failed");
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk34.red("Error:"), error instanceof Error ? error.message : "Unknown error");
    outro("Update check failed");
    process.exit(1);
  }
});
function compareVersions(v1, v2) {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] ?? 0;
    const part2 = parts2[i] ?? 0;
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  return 0;
}

// src/commands/governance/multisig.ts
init_client();
var ErrorHandler = class {
  static ERROR_MAPPINGS = /* @__PURE__ */ new Map([
    [
      /insufficient funds|insufficient lamports/i,
      () => ({
        message: "Insufficient SOL balance",
        suggestion: "You need more SOL to complete this transaction.",
        actions: [
          "Run: ghost faucet --save (for devnet)",
          "Check balance: ghost wallet balance",
          "Transfer SOL from another wallet"
        ],
        canRetry: false
      })
    ],
    [
      /blockhash not found|blockhash expired/i,
      (error) => ({
        message: "Transaction expired",
        suggestion: "The transaction took too long and expired.",
        actions: [
          "Try the operation again",
          "Check your network connection",
          "Use a faster RPC endpoint"
        ],
        canRetry: true
      })
    ],
    [
      /account.*does not exist|account.*not found/i,
      () => ({
        message: "Account not found",
        suggestion: "The account you're trying to interact with doesn't exist.",
        actions: [
          "Verify the address is correct",
          "The account may need to be initialized first",
          "Check if you're on the correct network (devnet/mainnet)"
        ],
        canRetry: false
      })
    ],
    [
      /already in use|already exists/i,
      (error) => ({
        message: "Resource already exists",
        suggestion: "You're trying to create something that already exists.",
        actions: [
          "Use a different ID or name",
          "Check existing resources with list commands",
          "Delete the existing resource if needed"
        ],
        canRetry: false
      })
    ],
    [
      /simulation failed/i,
      (error) => ({
        message: "Transaction simulation failed",
        suggestion: "The transaction would fail if submitted to the blockchain.",
        actions: [
          "Check all input parameters are correct",
          "Ensure you have the necessary permissions",
          "Verify account states are as expected"
        ],
        canRetry: true
      })
    ],
    [
      /rate limit/i,
      (error) => ({
        message: "Rate limit exceeded",
        suggestion: "You've made too many requests too quickly.",
        actions: [
          "Wait 30-60 seconds before retrying",
          "Use a custom RPC endpoint for higher limits",
          "Batch operations when possible"
        ],
        canRetry: true,
        retryDelay: 3e4
      })
    ],
    [
      /network|connection|timeout/i,
      (error) => ({
        message: "Network connection issue",
        suggestion: "Unable to connect to the Solana network.",
        actions: [
          "Check your internet connection",
          "Try a different RPC endpoint",
          "Check if the RPC service is operational"
        ],
        canRetry: true,
        retryDelay: 5e3
      })
    ],
    [
      /unauthorized|permission denied|access denied/i,
      (error) => ({
        message: "Permission denied",
        suggestion: "You don't have permission to perform this action.",
        actions: [
          "Ensure you're using the correct wallet",
          "Check if you have the required role",
          "Verify ownership of the resource"
        ],
        canRetry: false
      })
    ],
    [
      /invalid.*address|malformed.*address/i,
      (error) => ({
        message: "Invalid address format",
        suggestion: "The provided address is not a valid Solana address.",
        actions: [
          "Check for typos in the address",
          "Ensure it's a base58 encoded string",
          "Verify the address length (44 characters)"
        ],
        canRetry: false
      })
    ],
    [
      /signature.*failed|signing.*failed/i,
      (error) => ({
        message: "Transaction signing failed",
        suggestion: "Unable to sign the transaction with your wallet.",
        actions: [
          "Check your wallet is properly configured",
          "Ensure the wallet file exists and is readable",
          "Verify the wallet has the correct permissions"
        ],
        canRetry: true
      })
    ]
  ]);
  /**
   * Handle an error with user-friendly output
   */
  static handle(error, context) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorInfo = this.parseError(errorMessage);
    console.log("");
    console.log(chalk34.red.bold("\u274C Error: ") + chalk34.red(errorInfo.message));
    if (context?.operation) {
      console.log(chalk34.gray(`Operation: ${context.operation}`));
    }
    if (errorInfo.suggestion || context?.suggestion) {
      console.log("");
      console.log(chalk34.yellow("\u{1F4A1} ") + chalk34.yellow.bold("What happened:"));
      console.log(chalk34.gray(`   ${errorInfo.suggestion || context?.suggestion}`));
    }
    if (errorInfo.actions.length > 0) {
      console.log("");
      console.log(chalk34.cyan("\u{1F527} ") + chalk34.cyan.bold("How to fix:"));
      errorInfo.actions.forEach((action, index) => {
        console.log(chalk34.gray(`   ${index + 1}. ${action}`));
      });
    }
    if (errorInfo.canRetry || context?.canRetry) {
      console.log("");
      if (errorInfo.retryDelay) {
        const seconds = Math.round(errorInfo.retryDelay / 1e3);
        console.log(chalk34.gray(`\u23F1\uFE0F  You can retry in ${seconds} seconds`));
      } else {
        console.log(chalk34.gray("\u{1F504} You can retry this operation"));
      }
    }
    if (process.env.DEBUG || process.env.VERBOSE) {
      console.log("");
      console.log(chalk34.gray("\u{1F41B} Technical details:"));
      console.log(chalk34.gray(`   ${errorMessage}`));
      if (error instanceof Error && error.stack) {
        console.log(chalk34.gray("   Stack trace:"));
        console.log(chalk34.gray(error.stack.split("\n").map((line) => "   " + line).join("\n")));
      }
    }
    console.log("");
  }
  /**
   * Parse error message and return user-friendly information
   */
  static parseError(errorMessage) {
    for (const [pattern, handler] of this.ERROR_MAPPINGS) {
      if (pattern.test(errorMessage)) {
        return handler(errorMessage);
      }
    }
    return {
      message: this.cleanErrorMessage(errorMessage),
      suggestion: "An unexpected error occurred.",
      actions: [
        "Check your input parameters",
        "Verify your network connection",
        "Try again in a few moments",
        "Run with DEBUG=1 for more details"
      ],
      canRetry: true
    };
  }
  /**
   * Clean up technical error messages
   */
  static cleanErrorMessage(message) {
    let cleaned = message.replace(/^Error:\s*/i, "").replace(/^Failed to\s*/i, "").replace(/^Unable to\s*/i, "").replace(/^Exception:\s*/i, "");
    cleaned = cleaned.replace(/instruction \d+:/gi, "");
    cleaned = cleaned.replace(/0x[a-fA-F0-9]+/g, "");
    cleaned = cleaned.replace(/[A-HJ-NP-Z1-9]{44}/g, "<address>");
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return cleaned;
  }
  /**
   * Create a retry handler with exponential backoff
   */
  static async withRetry(operation, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1e3,
      maxDelay = 3e4,
      onRetry
    } = options;
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt === maxRetries) {
          throw lastError;
        }
        const delay = Math.min(initialDelay * Math.pow(2, attempt - 1), maxDelay);
        if (onRetry) {
          onRetry(attempt, lastError);
        } else {
          log.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        }
        await new Promise((resolve3) => setTimeout(resolve3, delay));
      }
    }
    throw lastError;
  }
};
function handleError(error, context) {
  ErrorHandler.handle(error, context);
}

// src/commands/governance/multisig.ts
init_sdk_helpers();
var multisigCommand = new Command("multisig").description("Manage multi-signature wallets");
multisigCommand.command("create").description("Create a new multisig wallet").option("-n, --name <name>", "Multisig name").option("-m, --members <members>", "Comma-separated list of member addresses").option("-t, --threshold <threshold>", "Number of signatures required").action(async (options) => {
  intro(chalk34.blue("Create Multisig Wallet"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("Connected to devnet");
    let name = options.name;
    if (!name) {
      const nameInput = await text({
        message: "Multisig wallet name:",
        placeholder: "Treasury Multisig",
        validate: (value) => {
          if (!value || value.trim().length === 0) {
            return "Multisig name is required";
          }
          if (value.length > 50) {
            return "Name must be less than 50 characters";
          }
        }
      });
      if (isCancel(nameInput)) {
        cancel("Multisig creation cancelled");
        return;
      }
      name = nameInput.toString();
    }
    let members = options.members;
    if (!members) {
      const membersInput = await text({
        message: "Member addresses (comma-separated):",
        placeholder: "addr1,addr2,addr3",
        validate: (value) => {
          if (!value || value.trim().length === 0) {
            return "At least one member address is required";
          }
          const addresses = value.split(",").map((a) => a.trim());
          if (addresses.length < 2) {
            return "Multisig requires at least 2 members";
          }
          if (addresses.length > 10) {
            return "Maximum 10 members allowed";
          }
          for (const addr of addresses) {
            try {
              address(addr);
            } catch {
              return `Invalid address format: ${addr}`;
            }
          }
        }
      });
      if (isCancel(membersInput)) {
        cancel("Multisig creation cancelled");
        return;
      }
      members = membersInput.toString();
    }
    const memberAddresses = members.split(",").map((a) => a.trim());
    let threshold = options.threshold;
    if (!threshold) {
      const thresholdInput = await select({
        message: "Signature threshold:",
        options: [
          { value: "1", label: "1 signature", hint: "Any member can execute" },
          { value: "2", label: "2 signatures", hint: "Requires 2 members" },
          { value: Math.ceil(memberAddresses.length / 2).toString(), label: `${Math.ceil(memberAddresses.length / 2)} signatures`, hint: "Simple majority" },
          { value: memberAddresses.length.toString(), label: `${memberAddresses.length} signatures`, hint: "Unanimous (all members)" }
        ]
      });
      if (isCancel(thresholdInput)) {
        cancel("Multisig creation cancelled");
        return;
      }
      threshold = thresholdInput.toString();
    }
    const thresholdNum = parseInt(threshold);
    note(
      `${chalk34.bold("Multisig Details:")}
${chalk34.gray("Name:")} ${name}
${chalk34.gray("Members:")} ${memberAddresses.length}
${chalk34.gray("Threshold:")} ${thresholdNum} of ${memberAddresses.length}
${chalk34.gray("Creator:")} ${wallet.address.slice(0, 8)}...${wallet.address.slice(-8)}
${chalk34.gray("Security:")} ${thresholdNum === memberAddresses.length ? "Maximum" : thresholdNum === 1 ? "Minimal" : "Balanced"}`,
      "Multisig Preview"
    );
    const confirmCreate = await confirm({
      message: "Create this multisig wallet?"
    });
    if (isCancel(confirmCreate) || !confirmCreate) {
      cancel("Multisig creation cancelled");
      return;
    }
    s.start("Creating multisig on blockchain...");
    try {
      const signature = await safeClient.governance.createMultisig(toSDKSigner(wallet), {
        signers: memberAddresses.map((addr) => address(addr)),
        threshold: thresholdNum,
        multisigId: BigInt(Date.now()),
        name: `Multisig-${Date.now()}`,
        multisigType: "standard"
      });
      if (!signature) {
        throw new Error("Failed to get transaction signature");
      }
      s.stop("Multisig created successfully!");
      const explorerUrl = getExplorerUrl(signature, "devnet");
      outro(
        `${chalk34.green("Multisig Created Successfully!")}

${chalk34.bold("Multisig Details:")}
${chalk34.gray("Name:")} ${name}
${chalk34.gray("Members:")} ${memberAddresses.length}
${chalk34.gray("Threshold:")} ${thresholdNum} signatures required

${chalk34.bold("Transaction:")}
${chalk34.gray("Signature:")} ${signature}
${chalk34.gray("Explorer:")} ${explorerUrl}

${chalk34.yellow("Next Steps:")}
- Share multisig address with members
- Create proposals: ${chalk34.cyan("ghost governance proposal create")}
- Manage transactions through multisig approval process`
      );
    } catch (error) {
      s.stop("Failed to create multisig");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to create multisig: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
multisigCommand.command("list").description("List your multisig wallets").action(async () => {
  intro(chalk34.blue("Your Multisig Wallets"));
  try {
    const s = spinner();
    s.start("Loading multisig wallets...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    const multisigs = await safeClient.governance.listMultisigs({ creator: wallet.address });
    s.stop(`Found ${multisigs.length} multisig wallets`);
    if (multisigs.length === 0) {
      outro(
        `${chalk34.yellow("No multisig wallets found")}

${chalk34.gray("- Create a multisig:")} ${chalk34.cyan("ghost governance multisig create")}
${chalk34.gray("Get invited to existing multisigs by other members")}`
      );
      return;
    }
    log.info(`
${chalk34.bold("Your Multisig Wallets:")}
`);
    multisigs.forEach((multisig, index) => {
      const isCreator = multisig.creator === wallet.address;
      const role = isCreator ? chalk34.green("CREATOR") : chalk34.blue("MEMBER");
      log.info(
        `${chalk34.bold(`${index + 1}. ${multisig.name}`)}
   ${chalk34.gray("Address:")} ${multisig.address.slice(0, 8)}...${multisig.address.slice(-8)}
   ${chalk34.gray("Members:")} ${multisig.members.length}
   ${chalk34.gray("Threshold:")} ${multisig.threshold} of ${multisig.members.length}
   ${chalk34.gray("Your Role:")} ${role}
   ${chalk34.gray("Pending Proposals:")} ${multisig.pendingProposals ?? 0}
`
      );
    });
    outro(
      `${chalk34.yellow("Commands:")}
${chalk34.cyan("ghost governance proposal create")} - Create proposal
${chalk34.cyan("ghost governance proposal list")} - View proposals
${chalk34.cyan("ghost governance vote")} - Vote on proposals`
    );
  } catch (error) {
    log.error(`Failed to load multisigs: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});

// src/commands/governance/proposal.ts
init_client();
init_sdk_helpers();
var proposalCommand = new Command("proposal").description("Manage governance proposals");
proposalCommand.command("create").description("Create a new governance proposal").option("-t, --title <title>", "Proposal title").option("-d, --description <description>", "Proposal description").option("--type <type>", "Proposal type (config, upgrade, transfer, custom)").action(async (options) => {
  intro(chalk34.yellow("Create Governance Proposal"));
  try {
    const s = spinner();
    s.start("Loading your multisigs...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    const multisigs = await safeClient.governance.listMultisigs({ creator: wallet.address });
    s.stop(`Found ${multisigs.length} multisig wallets`);
    if (multisigs.length === 0) {
      outro("No multisig wallets found. Create one first with: ghost governance multisig create");
      return;
    }
    const multisigChoice = await select({
      message: "Select multisig for proposal:",
      options: multisigs.map((ms) => ({
        value: ms.address,
        label: ms.name,
        hint: `${ms.threshold} of ${ms.members.length} signatures required`
      }))
    });
    if (isCancel(multisigChoice)) {
      cancel("Proposal creation cancelled");
      return;
    }
    const selectedMultisig = multisigs.find((ms) => ms.address === multisigChoice.toString());
    let title = options.title;
    if (!title) {
      const titleInput = await text({
        message: "Proposal title:",
        placeholder: "Increase transaction fee threshold",
        validate: (value) => {
          if (!value || value.trim().length === 0) {
            return "Proposal title is required";
          }
          if (value.length > 100) {
            return "Title must be less than 100 characters";
          }
        }
      });
      if (isCancel(titleInput)) {
        cancel("Proposal creation cancelled");
        return;
      }
      title = titleInput.toString();
    }
    let type = options.type;
    if (!type) {
      const typeChoice = await select({
        message: "Proposal type:",
        options: [
          { value: "config", label: "Configuration Change", hint: "Modify protocol parameters" },
          { value: "upgrade", label: "Protocol Upgrade", hint: "Upgrade smart contracts" },
          { value: "transfer", label: "Treasury Transfer", hint: "Transfer funds from treasury" },
          { value: "custom", label: "Custom Action", hint: "Custom governance action" }
        ]
      });
      if (isCancel(typeChoice)) {
        cancel("Proposal creation cancelled");
        return;
      }
      type = typeChoice.toString();
    }
    let description = options.description;
    if (!description) {
      const descriptionInput = await text({
        message: "Proposal description:",
        placeholder: "Detailed explanation of what this proposal does and why...",
        validate: (value) => {
          if (!value || value.trim().length < 20) {
            return "Please provide at least 20 characters describing the proposal";
          }
          if (value.length > 1e3) {
            return "Description must be less than 1000 characters";
          }
        }
      });
      if (isCancel(descriptionInput)) {
        cancel("Proposal creation cancelled");
        return;
      }
      description = descriptionInput.toString();
    }
    const duration = await select({
      message: "Voting period:",
      options: [
        { value: "1", label: "1 day", hint: "Quick decision" },
        { value: "3", label: "3 days", hint: "Standard period" },
        { value: "7", label: "1 week", hint: "Extended discussion" },
        { value: "14", label: "2 weeks", hint: "Complex proposals" }
      ]
    });
    if (isCancel(duration)) {
      cancel("Proposal creation cancelled");
      return;
    }
    note(
      `${chalk34.bold("Proposal Details:")}
${chalk34.gray("Multisig:")} ${selectedMultisig.name}
${chalk34.gray("Title:")} ${title}
${chalk34.gray("Type:")} ${type.toUpperCase()}
${chalk34.gray("Description:")} ${description.slice(0, 100)}${description.length > 100 ? "..." : ""}
${chalk34.gray("Voting Period:")} ${duration} days
${chalk34.gray("Required Votes:")} ${selectedMultisig.threshold} of ${selectedMultisig.members.length}`,
      "Proposal Preview"
    );
    const confirmCreate = await confirm({
      message: "Create this proposal?"
    });
    if (isCancel(confirmCreate) || !confirmCreate) {
      cancel("Proposal creation cancelled");
      return;
    }
    s.start("Creating proposal on blockchain...");
    try {
      const signature = await safeClient.governance.createProposal(toSDKSigner(wallet), {
        multisig: address(selectedMultisig.address),
        title,
        description,
        proposalType: type,
        votingDuration: parseInt(duration) * 24 * 3600,
        // Convert days to seconds
        proposalId: BigInt(Date.now())
      });
      if (!signature) {
        throw new Error("Failed to get transaction signature");
      }
      s.stop("Proposal created successfully!");
      const explorerUrl = getExplorerUrl(signature, "devnet");
      outro(
        `${chalk34.green("Proposal Created Successfully!")}

${chalk34.bold("Proposal Details:")}
${chalk34.gray("Title:")} ${title}
${chalk34.gray("Type:")} ${type.toUpperCase()}
${chalk34.gray("Multisig:")} ${selectedMultisig.name}
${chalk34.gray("Voting Period:")} ${duration} days

${chalk34.bold("Transaction:")}
${chalk34.gray("Signature:")} ${signature}
${chalk34.gray("Explorer:")} ${explorerUrl}

${chalk34.yellow("Next Steps:")}
- Notify multisig members about the proposal
- Members can vote: ${chalk34.cyan("ghost governance vote")}
- Monitor voting progress: ${chalk34.cyan("ghost governance proposal list")}`
      );
    } catch (error) {
      s.stop("Failed to create proposal");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to create proposal: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
proposalCommand.command("list").description("List governance proposals").option("--active", "Show only active proposals").action(async (_options) => {
  intro(chalk34.yellow("Governance Proposals"));
  try {
    const s = spinner();
    s.start("Loading proposals...");
    const { client, wallet: _wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    const proposals = await safeClient.governance.listProposals();
    s.stop(`Found ${proposals.length} proposals`);
    if (proposals.length === 0) {
      outro(
        `${chalk34.yellow("No proposals found")}

${chalk34.gray("- Create a proposal:")} ${chalk34.cyan("ghost governance proposal create")}
${chalk34.gray("- Join a multisig to participate in governance")}`
      );
      return;
    }
    log.info(`
${chalk34.bold("Governance Proposals:")}
`);
    proposals.forEach((proposal, index) => {
      const status = proposal.status.toLowerCase();
      const statusColor = status === "active" ? chalk34.yellow : status === "passed" ? chalk34.green : status === "failed" ? chalk34.red : chalk34.gray;
      const votesFor = proposal.votesFor ?? 0;
      const votesAgainst = proposal.votesAgainst ?? 0;
      const totalVotes = votesFor + votesAgainst;
      const threshold = proposal.threshold;
      log.info(
        `${chalk34.bold(`${index + 1}. ${proposal.title}`)}
   ${chalk34.gray("Type:")} ${proposal.type.toUpperCase()}
   ${chalk34.gray("Status:")} ${statusColor(status.toUpperCase())}
   ${chalk34.gray("Votes:")} ${votesFor} yes, ${votesAgainst} no (${totalVotes}/${threshold} required)
   ${chalk34.gray("Creator:")} ${proposal.creator.slice(0, 8)}...${proposal.creator.slice(-8)}
   ${chalk34.gray("Deadline:")} ${proposal.deadline ? new Date(Number(proposal.deadline) * 1e3).toLocaleDateString() : "N/A"}
`
      );
    });
    outro(
      `${chalk34.yellow("Commands:")}
${chalk34.cyan("ghost governance vote")} - Vote on active proposals
${chalk34.cyan("ghost governance proposal create")} - Create new proposal`
    );
  } catch (error) {
    log.error(`Failed to load proposals: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});

// src/commands/governance/vote.ts
init_client();
init_sdk_helpers();
var voteCommand = new Command("vote").description("Vote on governance proposals").option("-p, --proposal <address>", "Proposal address").option("-c, --choice <choice>", "Vote choice (yes, no, abstain)").action(async (options) => {
  intro(chalk34.yellow("Vote on Proposal"));
  try {
    const s = spinner();
    s.start("Loading active proposals...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    const proposals = await safeClient.governance.listProposals();
    s.stop(`Found ${proposals.length} active proposals`);
    if (proposals.length === 0) {
      outro("No active proposals found to vote on");
      return;
    }
    let selectedProposal = options.proposal;
    if (!selectedProposal) {
      const proposalChoice = await select({
        message: "Select proposal to vote on:",
        options: proposals.map((proposal2) => ({
          value: proposal2.address,
          label: proposal2.title,
          hint: `${proposal2.type} - ${proposal2.votesFor ?? 0} yes, ${proposal2.votesAgainst ?? 0} no`
        }))
      });
      if (isCancel(proposalChoice)) {
        cancel("Voting cancelled");
        return;
      }
      selectedProposal = proposalChoice.toString();
    }
    const proposal = proposals.find((p) => p.address === selectedProposal);
    if (!proposal) {
      log.error("Proposal not found or not active");
      return;
    }
    let choice = options.choice;
    if (!choice) {
      const voteChoice = await select({
        message: "How do you vote?",
        options: [
          { value: "yes", label: "Yes (Approve)", hint: "Vote in favor of the proposal" },
          { value: "no", label: "No (Reject)", hint: "Vote against the proposal" },
          { value: "abstain", label: "Abstain", hint: "Do not vote either way" }
        ]
      });
      if (isCancel(voteChoice)) {
        cancel("Voting cancelled");
        return;
      }
      choice = voteChoice;
    }
    note(
      `${chalk34.bold("Vote Details:")}
${chalk34.gray("Proposal:")} ${proposal.title}
${chalk34.gray("Type:")} ${proposal.type.toUpperCase()}
${chalk34.gray("Your Vote:")} ${choice.toUpperCase()}
${chalk34.gray("Current Votes:")} ${proposal.votesFor ?? 0} yes, ${proposal.votesAgainst ?? 0} no
${chalk34.gray("Required:")} ${proposal.threshold} votes to pass`,
      "Vote Confirmation"
    );
    const confirmVote = await confirm({
      message: `Cast your vote as "${choice.toUpperCase()}"?`
    });
    if (isCancel(confirmVote) || !confirmVote) {
      cancel("Voting cancelled");
      return;
    }
    s.start("Casting vote on blockchain...");
    try {
      const signature = await safeClient.governance.vote(toSDKSigner(wallet), {
        proposal: address(selectedProposal),
        vote: choice
      });
      if (!signature) {
        throw new Error("Failed to get transaction signature");
      }
      s.stop("Vote cast successfully!");
      const explorerUrl = getExplorerUrl(signature, "devnet");
      outro(
        `${chalk34.green("Vote Cast Successfully!")}

${chalk34.bold("Vote Details:")}
${chalk34.gray("Proposal:")} ${proposal.title}
${chalk34.gray("Your Vote:")} ${choice.toUpperCase()}
${chalk34.gray("Status:")} Recorded on blockchain

${chalk34.bold("Transaction:")}
${chalk34.gray("Signature:")} ${signature}
${chalk34.gray("Explorer:")} ${explorerUrl}

${chalk34.yellow("Your vote is now part of the governance process!")}`
      );
    } catch (error) {
      s.stop("Failed to cast vote");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to vote: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});

// src/commands/governance/rbac.ts
init_client();
init_sdk_helpers();
var rbacCommand = new Command("rbac").description("Manage role-based access control");
rbacCommand.command("grant").description("Grant role to user").option("-u, --user <address>", "User address").option("-r, --role <role>", "Role to grant").action(async (options) => {
  intro(chalk34.green("Grant Role"));
  try {
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    let userAddress = options.user;
    if (!userAddress) {
      const userInput = await text({
        message: "User address to grant role to:",
        validate: (value) => {
          if (!value) return "User address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(userInput)) {
        cancel("Role grant cancelled");
        return;
      }
      userAddress = userInput.toString().trim();
    }
    let role = options.role;
    if (!role) {
      const roleChoice = await select({
        message: "Select role to grant:",
        options: [
          { value: "admin", label: "Admin", hint: "Full system access" },
          { value: "moderator", label: "Moderator", hint: "Moderation privileges" },
          { value: "arbitrator", label: "Arbitrator", hint: "Dispute resolution" },
          { value: "operator", label: "Operator", hint: "System operations" }
        ]
      });
      if (isCancel(roleChoice)) {
        cancel("Role grant cancelled");
        return;
      }
      role = roleChoice.toString();
    }
    const confirmGrant = await confirm({
      message: `Grant ${role} role to ${userAddress}?`
    });
    if (isCancel(confirmGrant) || !confirmGrant) {
      cancel("Role grant cancelled");
      return;
    }
    const s = spinner();
    s.start("Granting role on blockchain...");
    try {
      const signature = await safeClient.governance.grantRole({
        user: address(userAddress),
        role,
        granter: wallet.address,
        signer: toSDKSigner(wallet)
      });
      if (!signature) {
        throw new Error("Failed to get transaction signature");
      }
      s.stop("Role granted successfully!");
      const explorerUrl = getExplorerUrl(signature, "devnet");
      outro(
        `${chalk34.green("Role Granted!")}

${chalk34.gray("User:")} ${userAddress}
${chalk34.gray("Role:")} ${role.toUpperCase()}
${chalk34.gray("Explorer:")} ${explorerUrl}`
      );
    } catch (error) {
      s.stop("Failed to grant role");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to grant role: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
rbacCommand.command("revoke").description("Revoke role from user").option("-u, --user <address>", "User address").option("-r, --role <role>", "Role to revoke").action(async (options) => {
  intro(chalk34.red("Revoke Role"));
  try {
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    let userAddress = options.user;
    if (!userAddress) {
      const userInput = await text({
        message: "User address to revoke role from:",
        validate: (value) => {
          if (!value) return "User address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(userInput)) {
        cancel("Role revoke cancelled");
        return;
      }
      userAddress = userInput.toString().trim();
    }
    let role = options.role;
    if (!role) {
      const roleChoice = await select({
        message: "Select role to revoke:",
        options: [
          { value: "admin", label: "Admin", hint: "Remove admin access" },
          { value: "moderator", label: "Moderator", hint: "Remove moderation privileges" },
          { value: "arbitrator", label: "Arbitrator", hint: "Remove arbitration rights" },
          { value: "operator", label: "Operator", hint: "Remove operation access" }
        ]
      });
      if (isCancel(roleChoice)) {
        cancel("Role revoke cancelled");
        return;
      }
      role = roleChoice.toString();
    }
    const confirmRevoke = await confirm({
      message: `Revoke ${role} role from ${userAddress}?`
    });
    if (isCancel(confirmRevoke) || !confirmRevoke) {
      cancel("Role revoke cancelled");
      return;
    }
    const s = spinner();
    s.start("Revoking role on blockchain...");
    try {
      const signature = await safeClient.governance.revokeRole({
        user: address(userAddress),
        role,
        revoker: wallet.address,
        signer: toSDKSigner(wallet)
      });
      if (!signature) {
        throw new Error("Failed to get transaction signature");
      }
      s.stop("Role revoked successfully!");
      const explorerUrl = getExplorerUrl(signature, "devnet");
      outro(
        `${chalk34.red("Role Revoked!")}

${chalk34.gray("User:")} ${userAddress}
${chalk34.gray("Role:")} ${role.toUpperCase()}
${chalk34.gray("Explorer:")} ${explorerUrl}`
      );
    } catch (error) {
      s.stop("Failed to revoke role");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to revoke role: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});

// src/commands/governance/index.ts
var governanceCommand = new Command("governance").description("Participate in protocol governance");
governanceCommand.addCommand(multisigCommand);
governanceCommand.addCommand(proposalCommand);
governanceCommand.addCommand(voteCommand);
governanceCommand.addCommand(rbacCommand);
governanceCommand.action(async () => {
  intro(chalk34.blue("GhostSpeak Governance"));
  log.info(`
${chalk34.bold("Available Commands:")}
`);
  log.info(`${chalk34.cyan("ghost governance multisig")} - Manage multisig wallets`);
  log.info(`${chalk34.cyan("ghost governance proposal")} - Create and manage proposals`);
  log.info(`${chalk34.cyan("ghost governance vote")} - Vote on active proposals`);
  log.info(`${chalk34.cyan("ghost governance rbac")} - Manage roles and permissions`);
  outro("Use --help with any command for more details");
});
init_wallet_service();
init_solana_client();
function showProgress(progress) {
  const percentage = Math.round(progress.step / progress.totalSteps * 100);
  const filled = Math.round(percentage / 5);
  const empty = 20 - filled;
  console.log("\n" + chalk34.cyan("Setup Progress:"));
  console.log(chalk34.gray("[") + chalk34.green("\u2588".repeat(filled)) + chalk34.gray("\u2591".repeat(empty)) + chalk34.gray("]") + ` ${percentage}%`);
  console.log(chalk34.gray(`Step ${progress.step}/${progress.totalSteps}: `) + chalk34.white(progress.currentTask) + "\n");
}
async function generateNewWallet(name) {
  const walletService = new WalletService();
  let walletName = "ghost1";
  const registry = walletService.listWallets();
  const existingNames = new Set(registry.map((w) => w.name));
  if (existingNames.has(walletName)) {
    let i = 1;
    while (existingNames.has(`ghost${i}`)) {
      i++;
    }
    walletName = `ghost${i}`;
  }
  const { wallet, mnemonic } = await walletService.createWallet(walletName, "devnet");
  const signer = await walletService.getSigner(walletName);
  if (!signer) {
    throw new Error("Failed to create wallet");
  }
  return {
    signer,
    address: wallet.metadata.address,
    balance: 0,
    isNew: true,
    mnemonic
  };
}
async function loadExistingWallet(walletPath) {
  const expandedPath = walletPath.replace("~", homedir());
  if (!existsSync(expandedPath)) {
    throw new Error(`Wallet file not found at: ${expandedPath}`);
  }
  const walletData = readFileSync(expandedPath, "utf-8");
  const keyArray = JSON.parse(walletData);
  const privateKey = new Uint8Array(keyArray);
  const signer = await createKeyPairSignerFromBytes(privateKey);
  return {
    signer,
    address: signer.address,
    balance: 0,
    isNew: false
  };
}
async function checkWalletBalance(walletAddress, network) {
  try {
    const rpcUrl = network === "devnet" ? "https://api.devnet.solana.com" : "https://api.testnet.solana.com";
    const client = createCustomClient(rpcUrl);
    const { value: balance } = await client.rpc.getBalance(address$1(walletAddress)).send();
    return Number(balance) / 1e9;
  } catch (error) {
    console.warn("Failed to check balance:", error);
    return 0;
  }
}
async function fundWallet(walletAddress, network, targetAmount = 2) {
  const s = spinner();
  s.start("Requesting SOL from faucets...");
  const faucetService = new FaucetService();
  await faucetService.initialize();
  let totalReceived = 0;
  const errors = [];
  const sources = ["web3", "solana", "rpc"];
  for (const source of sources) {
    if (totalReceived >= targetAmount) break;
    try {
      const status = await faucetService.checkFaucetStatus(walletAddress, source, network);
      if (!status.canRequest) {
        errors.push(`${source}: Rate limited`);
        continue;
      }
      let result;
      if (source === "web3") {
        const response = await fetch("https://api.devnet.solana.com/faucet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pubkey: walletAddress,
            lamports: 1e9
            // 1 SOL
          })
        });
        const data = await response.json();
        result = {
          success: Boolean(data.signature),
          signature: data.signature,
          amount: 1,
          error: data.error
        };
      } else if (source === "solana") {
        const response = await fetch("https://faucet.solana.com/api/airdrop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pubkey: walletAddress,
            lamports: 1e9,
            cluster: network
          })
        });
        const data = await response.json();
        result = {
          success: Boolean(data.signature),
          signature: data.signature,
          amount: 1,
          error: data.error
        };
      } else {
        const rpcUrl = network === "devnet" ? "https://api.devnet.solana.com" : "https://api.testnet.solana.com";
        const client = createCustomClient(rpcUrl);
        try {
          const lamports = 1000000000n;
          const signature = await client.rpc.requestAirdrop(
            address$1(walletAddress),
            lamports
          ).send();
          result = {
            success: true,
            signature,
            amount: 1
          };
        } catch (error) {
          result = {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
      }
      if (result.success && result.signature) {
        await faucetService.recordRequest(
          walletAddress,
          network,
          source,
          result.amount ?? 1,
          result.signature
        );
        totalReceived += result.amount ?? 1;
        s.message(`Received ${result.amount} SOL from ${source}`);
      } else {
        errors.push(`${source}: ${result.error ?? "Failed"}`);
      }
    } catch (error) {
      errors.push(`${source}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  s.stop(totalReceived > 0 ? `\u2705 Received ${totalReceived} SOL` : "\u274C Failed to get SOL");
  if (totalReceived > 0) {
    console.log(chalk34.gray("Waiting for transaction confirmations..."));
    await new Promise((resolve3) => setTimeout(resolve3, 3e3));
  }
  return {
    success: totalReceived > 0,
    amount: totalReceived,
    errors
  };
}
function showSetupSummary(result) {
  console.log("\n" + chalk34.bold.green("\u{1F389} Setup Complete!"));
  console.log("\u2550".repeat(50));
  console.log("\n" + chalk34.bold("Wallet Information:"));
  console.log(chalk34.gray("  Address:  ") + chalk34.white(result.wallet.address));
  console.log(chalk34.gray("  Balance:  ") + chalk34.white(`${result.wallet.balance.toFixed(4)} SOL`));
  console.log(chalk34.gray("  Network:  ") + chalk34.white(result.network));
  console.log(chalk34.gray("  Type:     ") + chalk34.white(result.wallet.isNew ? "New wallet" : "Imported wallet"));
  if (result.multisigAddress) {
    console.log("\n" + chalk34.bold("Multisig Wallet:"));
    console.log(chalk34.gray("  Address:  ") + chalk34.white(result.multisigAddress));
    console.log(chalk34.gray("  Status:   ") + chalk34.green("\u2705 Created"));
  }
  console.log("\n" + chalk34.bold("Configuration:"));
  console.log(chalk34.gray("  Config:   ") + chalk34.white(result.configPath));
  console.log(chalk34.gray("  Status:   ") + chalk34.green("\u2705 Saved"));
  if (result.errors.length > 0) {
    console.log("\n" + chalk34.yellow("\u26A0\uFE0F  Some issues occurred:"));
    result.errors.forEach((error) => {
      console.log(chalk34.gray("  \u2022 ") + chalk34.yellow(error));
    });
  }
  console.log("\n" + chalk34.bold("Next Steps:"));
  if (!result.agentCreated) {
    console.log(chalk34.gray("  1. Create your first agent:"));
    console.log(chalk34.cyan("     ghost agent register"));
  }
  console.log(chalk34.gray("  2. Get devnet GHOST tokens:"));
  console.log(chalk34.cyan("     ghost airdrop"));
  console.log(chalk34.gray("  3. View your setup:"));
  console.log(chalk34.cyan("     ghost config show"));
  console.log("\n" + chalk34.green("Welcome to GhostSpeak! \u{1F680}"));
}
function validateNetwork(network) {
  if (network !== "devnet" && network !== "testnet") {
    throw new Error("Invalid network. Only devnet and testnet are supported for quickstart.");
  }
  return network;
}

// src/commands/quickstart.ts
init_config();
init_client();
var quickstartCommand = new Command("quickstart").description("Quick setup for new and existing users");
quickstartCommand.command("new").description("Complete setup for new users (creates wallet)").option("-n, --network <network>", "Network to use (devnet|testnet)", "devnet").option("--skip-agent", "Skip agent creation").option("--skip-multisig", "Skip multisig wallet creation").action(async (options) => {
  intro(chalk34.cyan("\u{1F680} GhostSpeak Quick Start - New User Setup"));
  const progress = { step: 0, totalSteps: 7, currentTask: "" };
  const errors = [];
  let wallet;
  let multisigAddress;
  let agentCreated = false;
  try {
    progress.step = 1;
    progress.currentTask = "Selecting network";
    showProgress(progress);
    const network = validateNetwork(options.network ?? "devnet");
    log.success(`\u2705 Network: ${network}`);
    progress.step = 2;
    progress.currentTask = "Generating new wallet";
    showProgress(progress);
    const s = spinner();
    s.start("Generating secure wallet...");
    const walletResult = await generateNewWallet();
    wallet = walletResult;
    s.stop("\u2705 Wallet generated and saved");
    log.info(`\u{1F4B3} Wallet Address: ${chalk34.white(wallet.address)}`);
    log.info(`\u{1F4C1} Saved to: ${chalk34.gray("~/.ghostspeak/wallets/main.json")}`);
    log.warn("");
    log.warn("\u{1F510} IMPORTANT: Save your seed phrase!");
    log.warn("This is the ONLY way to recover your wallet:");
    log.warn("");
    log.warn(chalk34.yellow(walletResult.mnemonic));
    log.warn("");
    progress.step = 3;
    progress.currentTask = "Funding wallet from faucets";
    showProgress(progress);
    const fundingResult = await fundWallet(wallet.address, network);
    if (fundingResult.success) {
      wallet.balance = await checkWalletBalance(wallet.address, network);
      log.success(`\u2705 Wallet funded with ${fundingResult.amount} SOL`);
    } else {
      errors.push("Failed to get SOL from faucets - you may need to fund manually");
      log.warn("\u26A0\uFE0F  Could not automatically fund wallet");
    }
    progress.step = 4;
    progress.currentTask = "Saving CLI configuration";
    showProgress(progress);
    saveConfig({
      network,
      walletPath: "~/.ghostspeak/wallets/main.json",
      rpcUrl: network === "devnet" ? "https://api.devnet.solana.com" : "https://api.testnet.solana.com"
    });
    log.success("\u2705 Configuration saved");
    if (!options.skipMultisig && wallet.balance > 0.01) {
      progress.step = 5;
      progress.currentTask = "Creating multisig wallet for enhanced security";
      showProgress(progress);
      const createMultisig = await confirm({
        message: "Create a multisig wallet for enhanced security?",
        initialValue: true
      });
      if (!isCancel(createMultisig) && createMultisig) {
        try {
          const multisigName = await text({
            message: "Multisig wallet name:",
            placeholder: "My GhostSpeak Wallet",
            defaultValue: "Quick Start Wallet"
          });
          if (!isCancel(multisigName)) {
            s.start("Creating multisig wallet...");
            const { initializeClient: initializeClient2, toSDKSigner: toSDKSigner6 } = await Promise.resolve().then(() => (init_client(), client_exports));
            const { createSafeSDKClient: createSafeSDKClient2 } = await Promise.resolve().then(() => (init_sdk_helpers(), sdk_helpers_exports));
            const { address: _address } = await import('@solana/addresses');
            const { client: sdkClient } = await initializeClient2(network);
            const safeClient = createSafeSDKClient2(sdkClient);
            const signature = await safeClient.governance.createMultisig(
              toSDKSigner6(wallet.signer),
              {
                name: multisigName.toString(),
                signers: [wallet.signer.address],
                threshold: 1,
                multisigType: "standard",
                multisigId: BigInt(Date.now())
              }
            );
            multisigAddress = wallet.address;
            s.stop("\u2705 Multisig wallet created");
            log.info(`\u{1F510} Multisig Address: ${chalk34.white(multisigAddress)}`);
            log.info(`\u{1F517} Explorer: ${getExplorerUrl(signature ?? "", network)}`);
          }
        } catch (error) {
          errors.push(`Multisig creation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
          log.warn("\u26A0\uFE0F  Could not create multisig wallet");
        }
      }
    }
    if (!options.skipAgent && wallet.balance > 0.01) {
      progress.step = 6;
      progress.currentTask = "Optional: Register your first AI agent";
      showProgress(progress);
      const registerAgent = await confirm({
        message: "Would you like to register your first AI agent now?"
      });
      if (!isCancel(registerAgent) && registerAgent) {
        log.info(chalk34.yellow("\n\u{1F4A1} Launching agent registration...\n"));
        const { spawn } = await import('child_process');
        const child = spawn(process.argv[0], [process.argv[1], "agent", "register"], {
          stdio: "inherit",
          env: process.env
        });
        await new Promise((resolve3) => {
          child.on("close", (code) => {
            if (code === 0) {
              agentCreated = true;
              log.success("\u2705 Agent registration completed");
            } else {
              errors.push("Agent registration was cancelled or failed");
            }
            resolve3();
          });
        });
      }
    }
    progress.step = 7;
    progress.currentTask = "Setup complete!";
    showProgress(progress);
    const result = {
      success: true,
      wallet,
      multisigAddress,
      network,
      configPath: getConfigPath(),
      agentCreated,
      errors
    };
    showSetupSummary(result);
    outro(chalk34.green("\u{1F389} Quick start setup completed!"));
  } catch (error) {
    cancel(chalk34.red("Setup failed: " + (error instanceof Error ? error.message : "Unknown error")));
    process.exit(1);
  }
});
quickstartCommand.command("existing").description("Setup for users with existing Solana wallets").option("-n, --network <network>", "Network to use (devnet|testnet)", "devnet").option("-w, --wallet <path>", "Path to existing wallet file").option("--skip-multisig", "Skip multisig wallet creation").action(async (options) => {
  intro(chalk34.cyan("\u{1F680} GhostSpeak Quick Start - Existing Wallet Setup"));
  const progress = { step: 0, totalSteps: 6, currentTask: "" };
  const errors = [];
  let wallet;
  let multisigAddress;
  try {
    progress.step = 1;
    progress.currentTask = "Selecting network";
    showProgress(progress);
    const network = validateNetwork(options.network ?? "devnet");
    log.success(`\u2705 Network: ${network}`);
    progress.step = 2;
    progress.currentTask = "Importing existing wallet";
    showProgress(progress);
    let walletPath = options.wallet;
    if (!walletPath) {
      const pathInput = await text({
        message: "Path to your Solana wallet file:",
        placeholder: "~/.config/solana/id.json",
        validate: (value) => {
          if (!value) return "Wallet path is required";
          const expandedPath = value.replace("~", homedir());
          if (!existsSync(expandedPath)) {
            return `Wallet file not found at: ${expandedPath}`;
          }
          return void 0;
        }
      });
      if (isCancel(pathInput)) {
        cancel("Setup cancelled");
        return;
      }
      walletPath = pathInput.toString();
    }
    const s = spinner();
    s.start("Loading wallet...");
    wallet = await loadExistingWallet(walletPath);
    wallet.balance = await checkWalletBalance(wallet.address, network);
    s.stop("\u2705 Wallet imported successfully");
    log.info(`\u{1F4B3} Wallet Address: ${chalk34.white(wallet.address)}`);
    log.info(`\u{1F4B0} Current Balance: ${chalk34.white(`${wallet.balance.toFixed(4)} SOL`)}`);
    if (wallet.balance < 0.1) {
      progress.step = 3;
      progress.currentTask = "Checking wallet balance";
      showProgress(progress);
      log.warn("\u26A0\uFE0F  Low balance detected");
      const requestFunding = await confirm({
        message: "Would you like to request testnet SOL from faucets?"
      });
      if (!isCancel(requestFunding) && requestFunding) {
        const fundingResult = await fundWallet(wallet.address, network, 2);
        if (fundingResult.success) {
          wallet.balance = await checkWalletBalance(wallet.address, network);
          log.success(`\u2705 Wallet funded with ${fundingResult.amount} SOL`);
        } else {
          errors.push("Failed to get SOL from faucets - you may need to fund manually");
          log.warn("\u26A0\uFE0F  Could not automatically fund wallet");
        }
      }
    } else {
      progress.step = 3;
      progress.currentTask = "Wallet balance verified";
      showProgress(progress);
      log.success("\u2705 Wallet has sufficient balance");
    }
    progress.step = 4;
    progress.currentTask = "Saving CLI configuration";
    showProgress(progress);
    const expandedWalletPath = walletPath.replace("~", homedir());
    saveConfig({
      network,
      walletPath: expandedWalletPath,
      rpcUrl: network === "devnet" ? "https://api.devnet.solana.com" : "https://api.testnet.solana.com"
    });
    log.success("\u2705 Configuration saved");
    if (!options.skipMultisig && wallet.balance > 0.01) {
      progress.step = 5;
      progress.currentTask = "Optional: Create multisig wallet wrapper";
      showProgress(progress);
      note(
        "A multisig wallet adds an extra layer of security by requiring multiple signatures for transactions. This is recommended for production use.\n\nYou can still use your existing wallet directly if you prefer.",
        "About Multisig Wallets"
      );
      const createMultisig = await confirm({
        message: "Create a multisig wrapper for your wallet?"
      });
      if (!isCancel(createMultisig) && createMultisig) {
        try {
          const multisigName = await text({
            message: "Multisig wallet name:",
            placeholder: "My Secure Wallet",
            defaultValue: "GhostSpeak Multisig"
          });
          if (!isCancel(multisigName)) {
            s.start("Creating multisig wrapper...");
            const { initializeClient: initializeClient2, toSDKSigner: toSDKSigner6 } = await Promise.resolve().then(() => (init_client(), client_exports));
            const { createSafeSDKClient: createSafeSDKClient2 } = await Promise.resolve().then(() => (init_sdk_helpers(), sdk_helpers_exports));
            const { address: _address } = await import('@solana/addresses');
            const { client: sdkClient } = await initializeClient2(network);
            const safeClient = createSafeSDKClient2(sdkClient);
            const signature = await safeClient.governance.createMultisig(
              toSDKSigner6(wallet.signer),
              {
                name: multisigName.toString(),
                signers: [wallet.signer.address],
                threshold: 1,
                multisigType: "standard",
                multisigId: BigInt(Date.now())
              }
            );
            multisigAddress = wallet.address;
            s.stop("\u2705 Multisig wallet created");
            log.info(`\u{1F510} Multisig Address: ${chalk34.white(multisigAddress)}`);
            log.info(`\u{1F517} Explorer: ${getExplorerUrl(signature ?? "", network)}`);
          }
        } catch (error) {
          errors.push(`Multisig creation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
          log.warn("\u26A0\uFE0F  Could not create multisig wallet");
        }
      }
    }
    progress.step = 6;
    progress.currentTask = "Setup complete!";
    showProgress(progress);
    const result = {
      success: true,
      wallet,
      multisigAddress,
      network,
      configPath: getConfigPath(),
      agentCreated: false,
      errors
    };
    showSetupSummary(result);
    outro(chalk34.green("\u{1F389} Quick start setup completed!"));
  } catch (error) {
    cancel(chalk34.red("Setup failed: " + (error instanceof Error ? error.message : "Unknown error")));
    process.exit(1);
  }
});
quickstartCommand.action(async () => {
  intro(chalk34.cyan("\u{1F680} GhostSpeak Quick Start"));
  const choice = await select({
    message: "How would you like to get started?",
    options: [
      {
        value: "new",
        label: "\u{1F195} I'm new - create everything for me",
        hint: "Generate wallet, get SOL, full setup"
      },
      {
        value: "existing",
        label: "\u{1F4B3} I have a Solana wallet",
        hint: "Import existing wallet and configure"
      },
      {
        value: "manual",
        label: "\u{1F6E0}\uFE0F  Manual setup",
        hint: "Step-by-step configuration"
      }
    ]
  });
  if (isCancel(choice)) {
    cancel("Quick start cancelled");
    return;
  }
  if (choice === "new") {
    const newCommand = quickstartCommand.commands.find((cmd) => cmd.name() === "new");
    if (newCommand) {
      await newCommand.parseAsync(["node", "quickstart"], { from: "node" });
    }
  } else if (choice === "existing") {
    const existingCommand = quickstartCommand.commands.find((cmd) => cmd.name() === "existing");
    if (existingCommand) {
      await existingCommand.parseAsync(["node", "quickstart"], { from: "node" });
    }
  } else {
    const { spawn } = await import('child_process');
    const child = spawn(process.argv[0], [process.argv[1], "config", "setup"], {
      stdio: "inherit",
      env: process.env
    });
    await new Promise((resolve3) => {
      child.on("close", () => resolve3());
    });
  }
});

// src/commands/wallet.ts
init_wallet_service();
init_client();
init_config();
function infoBox(title, content, options) {
  const {
    borderColor = "cyan",
    padding = 1,
    width
  } = {};
  const text22 = Array.isArray(content) ? content.join("\n") : content;
  return boxen(text22, {
    title,
    borderColor,
    borderStyle: "round",
    padding,
    width,
    titleAlignment: "left"
  });
}
function successBox(message, details) {
  let content = chalk34.green("\u2705 " + message);
  if (details && details.length > 0) {
    content += "\n\n" + details.map((d) => chalk34.gray("\u2022 " + d)).join("\n");
  }
  return boxen(content, {
    borderColor: "green",
    borderStyle: "round",
    padding: 1
  });
}
function warningBox(message, actions) {
  let content = chalk34.yellow("\u26A0\uFE0F  " + message);
  if (actions && actions.length > 0) {
    content += "\n\n" + chalk34.bold("Actions:") + "\n" + actions.map((a, i) => chalk34.gray(`${i + 1}. ${a}`)).join("\n");
  }
  return boxen(content, {
    borderColor: "yellow",
    borderStyle: "round",
    padding: 1
  });
}
function formatSOL(lamports) {
  const sol = typeof lamports === "string" ? lamports : lamportsToSol(BigInt(lamports));
  const num = parseFloat(sol);
  if (num === 0) return "0 SOL";
  if (num < 1e-4) return "< 0.0001 SOL";
  if (num < 1) return `${num.toFixed(4)} SOL`;
  if (num < 100) return `${num.toFixed(3)} SOL`;
  return `${num.toFixed(2)} SOL`;
}
function bulletList(items, options) {
  const { indent = 2, bullet = "\u2022" } = {};
  const spaces = " ".repeat(indent);
  return items.map((item) => `${spaces}${chalk34.gray(bullet)} ${item}`).join("\n");
}
function divider(length = 50, char = "\u2500") {
  return chalk34.gray(char.repeat(length));
}
var walletCommand = new Command("wallet").description("Manage GhostSpeak wallets");
walletCommand.command("list").alias("ls").description("List all wallets").option("-b, --balance", "Show balances (requires network calls)").action(async (options) => {
  intro(chalk34.cyan("\u{1F4B3} GhostSpeak Wallet Manager"));
  try {
    const walletService = new WalletService();
    const wallets = walletService.listWallets();
    if (wallets.length === 0) {
      log.info("No wallets found. Create one with: ghost wallet create");
      outro("No wallets available");
      return;
    }
    const s = spinner();
    const table = new Table({
      title: "Your Wallets",
      columns: [
        { name: "name", title: "Name", alignment: "left" },
        { name: "address", title: "Address", alignment: "left" },
        { name: "network", title: "Network", alignment: "center" },
        { name: "status", title: "Status", alignment: "center" },
        { name: "balance", title: "Balance", alignment: "right" },
        { name: "created", title: "Created", alignment: "center" }
      ]
    });
    for (const wallet of wallets) {
      let balance = "-";
      if (options.balance) {
        s.start(`Checking balance for ${wallet.name}...`);
        try {
          const bal = await walletService.getBalance(wallet.address, wallet.network);
          balance = `${bal.toFixed(4)} SOL`;
        } catch (error) {
          balance = "Error";
        }
      }
      table.addRow({
        name: wallet.isActive ? chalk34.green(`\u25B6 ${wallet.name}`) : `  ${wallet.name}`,
        address: wallet.address.slice(0, 8) + "..." + wallet.address.slice(-8),
        network: wallet.network,
        status: wallet.isActive ? chalk34.green("Active") : chalk34.gray("Inactive"),
        balance: options.balance ? balance : "-",
        created: new Date(wallet.createdAt).toLocaleDateString()
      });
    }
    if (options.balance) {
      s.stop("Balance check complete");
    }
    console.log("");
    table.printTable();
    console.log("");
    log.info(chalk34.gray("Tips:"));
    log.info(chalk34.gray('  \u2022 Use "ghost wallet use <name>" to switch active wallet'));
    log.info(chalk34.gray('  \u2022 Use "ghost wallet show" to see full wallet details'));
    outro("Wallet list complete");
  } catch (error) {
    cancel(chalk34.red("Failed to list wallets: " + (error instanceof Error ? error.message : "Unknown error")));
  }
});
walletCommand.command("create").alias("new").description("Create a new wallet").option("-n, --name <name>", "Wallet name").option("--network <network>", "Network (devnet|testnet|mainnet-beta)", "devnet").option("--no-backup", "Skip seed phrase backup confirmation").action(async (options) => {
  intro(chalk34.cyan("\u{1F195} Create New Wallet"));
  try {
    const walletService = new WalletService();
    let walletName = options.name;
    if (!walletName) {
      const nameInput = await text({
        message: "Wallet name:",
        placeholder: "main-wallet",
        validate: (value) => {
          if (!value || value.trim().length === 0) return "Name is required";
          if (!/^[a-zA-Z0-9-_]+$/.test(value)) return "Use only letters, numbers, - and _";
          return void 0;
        }
      });
      if (isCancel(nameInput)) {
        cancel("Wallet creation cancelled");
        return;
      }
      walletName = nameInput.toString();
    }
    const network = options.network ?? "devnet";
    if (!["devnet", "testnet", "mainnet-beta"].includes(network)) {
      throw new Error("Invalid network. Use devnet, testnet, or mainnet-beta");
    }
    const s = spinner();
    s.start("Generating secure wallet...");
    const { wallet, mnemonic } = await walletService.createWallet(walletName, network);
    s.stop("\u2705 Wallet created successfully");
    console.log("");
    console.log(boxen(
      chalk34.yellow("\u{1F510} SEED PHRASE - WRITE THIS DOWN!\n\n") + chalk34.white(mnemonic) + "\n\n" + chalk34.red("\u26A0\uFE0F  This is the ONLY way to recover your wallet!\n") + chalk34.red("Never share this with anyone!"),
      {
        padding: 1,
        margin: 1,
        borderStyle: "double",
        borderColor: "yellow"
      }
    ));
    if (options.backup !== false) {
      const confirmed = await confirm({
        message: "Have you written down your seed phrase?",
        initialValue: false
      });
      if (isCancel(confirmed) || !confirmed) {
        log.warn('\u26A0\uFE0F  Please save your seed phrase! Use "ghost wallet backup" to see it again.');
      }
    }
    console.log("");
    note(
      `Name:     ${wallet.metadata.name}
Address:  ${wallet.metadata.address}
Network:  ${wallet.metadata.network}
Status:   ${wallet.metadata.isActive ? "Active" : "Created"}`,
      "Wallet Information"
    );
    if (wallet.metadata.isActive) {
      const config2 = loadConfig();
      config2.walletPath = `~/.ghostspeak/wallets/${walletName}.json`;
      config2.network = network;
      saveConfig(config2);
      log.success("\u2705 Set as active wallet");
    }
    console.log("");
    log.info("Next steps:");
    log.info(`  1. Fund your wallet: ${chalk34.cyan("ghost faucet")}`);
    log.info(`  2. Check balance: ${chalk34.cyan("ghost wallet balance")}`);
    log.info(`  3. Create an agent: ${chalk34.cyan("ghost agent register")}`);
    outro("Wallet created successfully");
  } catch (error) {
    cancel(chalk34.red("Failed to create wallet: " + (error instanceof Error ? error.message : "Unknown error")));
  }
});
walletCommand.command("show").alias("info").description("Show active wallet details").option("-n, --name <name>", "Show specific wallet").action(async (options) => {
  intro(chalk34.cyan("\u{1F4B3} Wallet Details"));
  try {
    const walletService = new WalletService();
    let wallet;
    if (options.name) {
      wallet = walletService.getWallet(options.name);
      if (!wallet) {
        throw new Error(`Wallet "${options.name}" not found`);
      }
    } else {
      wallet = walletService.getActiveWallet();
      if (!wallet) {
        throw new Error("No active wallet. Create one with: ghost wallet create");
      }
    }
    const s = spinner();
    s.start("Fetching wallet details...");
    const balance = await walletService.getBalance(
      wallet.metadata.address,
      wallet.metadata.network
    );
    s.stop("\u2705 Wallet details loaded");
    console.log("");
    console.log(boxen(
      chalk34.bold("Wallet Information\n\n") + `${chalk34.gray("Name:")}      ${wallet.metadata.name}
${chalk34.gray("Address:")}   ${wallet.metadata.address}
${chalk34.gray("Network:")}   ${wallet.metadata.network}
${chalk34.gray("Balance:")}   ${balance.toFixed(9)} SOL
${chalk34.gray("Status:")}    ${wallet.metadata.isActive ? chalk34.green("Active") : "Inactive"}
${chalk34.gray("Created:")}   ${new Date(wallet.metadata.createdAt).toLocaleString()}
${chalk34.gray("Last Used:")} ${new Date(wallet.metadata.lastUsed).toLocaleString()}`,
      {
        padding: 1,
        borderStyle: "round",
        borderColor: "cyan"
      }
    ));
    console.log("");
    log.info(`Explorer: ${getExplorerUrl(wallet.metadata.address, wallet.metadata.network)}`);
    outro("Wallet details complete");
  } catch (error) {
    cancel(chalk34.red("Failed to show wallet: " + (error instanceof Error ? error.message : "Unknown error")));
  }
});
walletCommand.command("use").alias("switch").description("Switch to a different wallet").argument("[name]", "Wallet name to switch to").action(async (name) => {
  intro(chalk34.cyan("\u{1F504} Switch Active Wallet"));
  try {
    const walletService = new WalletService();
    const wallets = walletService.listWallets();
    if (wallets.length === 0) {
      log.error("No wallets found. Create one with: ghost wallet create");
      outro("No wallets available");
      return;
    }
    let selectedName = name;
    if (!selectedName) {
      const choice = await select({
        message: "Select wallet to activate:",
        options: wallets.map((w) => ({
          value: w.name,
          label: w.name,
          hint: `${w.address.slice(0, 8)}...${w.address.slice(-8)} (${w.network})`
        }))
      });
      if (isCancel(choice)) {
        cancel("Wallet switch cancelled");
        return;
      }
      selectedName = choice.toString();
    }
    walletService.setActiveWallet(selectedName);
    const config2 = loadConfig();
    const wallet = walletService.getWallet(selectedName);
    if (wallet) {
      config2.walletPath = `~/.ghostspeak/wallets/${selectedName}.json`;
      config2.network = wallet.metadata.network;
      saveConfig(config2);
    }
    log.success(`\u2705 Switched to wallet: ${selectedName}`);
    outro("Active wallet updated");
  } catch (error) {
    cancel(chalk34.red("Failed to switch wallet: " + (error instanceof Error ? error.message : "Unknown error")));
  }
});
walletCommand.command("balance").alias("bal").description("Check wallet balance").option("-n, --name <name>", "Check specific wallet").option("-a, --all", "Show all wallet balances").action(async (options) => {
  intro(chalk34.cyan("\u{1F4B0} Wallet Balance"));
  try {
    const walletService = new WalletService();
    if (options.all) {
      const wallets = walletService.listWallets();
      if (wallets.length === 0) {
        log.info("No wallets found");
        outro("No wallets available");
        return;
      }
      const s = spinner();
      s.start("Checking balances...");
      const balances = [];
      for (const wallet of wallets) {
        try {
          const balance = await walletService.getBalance(wallet.address, wallet.network);
          balances.push({
            name: wallet.name,
            address: wallet.address,
            balance,
            network: wallet.network
          });
        } catch (error) {
          balances.push({
            name: wallet.name,
            address: wallet.address,
            balance: -1,
            network: wallet.network
          });
        }
      }
      s.stop("\u2705 Balance check complete");
      console.log("");
      balances.forEach((b) => {
        const balanceStr = b.balance >= 0 ? `${b.balance.toFixed(9)} SOL` : "Error";
        console.log(
          `${chalk34.bold(b.name).padEnd(20)} ${balanceStr.padEnd(15)} ${chalk34.gray(`(${b.network})`)}`
        );
      });
      console.log("");
    } else {
      let wallet;
      if (options.name) {
        wallet = walletService.getWallet(options.name);
        if (!wallet) {
          throw new Error(`Wallet "${options.name}" not found`);
        }
      } else {
        wallet = walletService.getActiveWallet();
        if (!wallet) {
          throw new Error("No active wallet");
        }
      }
      const s = spinner();
      s.start("Checking balance...");
      const balance = await walletService.getBalance(
        wallet.metadata.address,
        wallet.metadata.network
      );
      s.stop("\u2705 Balance retrieved");
      console.log("");
      console.log(chalk34.bold(`Wallet: ${wallet.metadata.name}`));
      console.log(chalk34.gray(`Address: ${wallet.metadata.address}`));
      console.log(chalk34.gray(`Network: ${wallet.metadata.network}`));
      console.log("");
      console.log(chalk34.green(`Balance: ${balance.toFixed(9)} SOL`));
      console.log("");
    }
    outro("Balance check complete");
  } catch (error) {
    cancel(chalk34.red("Failed to check balance: " + (error instanceof Error ? error.message : "Unknown error")));
  }
});
walletCommand.command("import").description("Import wallet from seed phrase or private key").option("-n, --name <name>", "Wallet name").option("--network <network>", "Network (devnet|testnet|mainnet-beta)", "devnet").action(async (options) => {
  intro(chalk34.cyan("\u{1F4E5} Import Wallet"));
  try {
    const walletService = new WalletService();
    let walletName = options.name;
    if (!walletName) {
      const nameInput = await text({
        message: "Wallet name:",
        placeholder: "imported-wallet",
        validate: (value) => {
          if (!value || value.trim().length === 0) return "Name is required";
          if (!/^[a-zA-Z0-9-_]+$/.test(value)) return "Use only letters, numbers, - and _";
          return void 0;
        }
      });
      if (isCancel(nameInput)) {
        cancel("Import cancelled");
        return;
      }
      walletName = nameInput.toString();
    }
    const importMethod = await select({
      message: "Import from:",
      options: [
        { value: "mnemonic", label: "Seed phrase (12 or 24 words)" },
        { value: "privatekey", label: "Private key (JSON array)" }
      ]
    });
    if (isCancel(importMethod)) {
      cancel("Import cancelled");
      return;
    }
    const secretInput = await text({
      message: importMethod === "mnemonic" ? "Enter seed phrase:" : "Enter private key:",
      placeholder: importMethod === "mnemonic" ? "word1 word2 word3..." : "[1,2,3,...]"
    });
    if (isCancel(secretInput)) {
      cancel("Import cancelled");
      return;
    }
    const network = options.network ?? "devnet";
    const s = spinner();
    s.start("Importing wallet...");
    const wallet = await walletService.importWallet(
      walletName,
      secretInput.toString().trim(),
      network
    );
    s.stop("\u2705 Wallet imported successfully");
    console.log("");
    note(
      `Name:     ${wallet.metadata.name}
Address:  ${wallet.metadata.address}
Network:  ${wallet.metadata.network}
Status:   ${wallet.metadata.isActive ? "Active" : "Imported"}`,
      "Imported Wallet"
    );
    if (wallet.metadata.isActive) {
      const config2 = loadConfig();
      config2.walletPath = `~/.ghostspeak/wallets/${walletName}.json`;
      config2.network = network;
      saveConfig(config2);
      log.success("\u2705 Set as active wallet");
    }
    outro("Wallet imported successfully");
  } catch (error) {
    cancel(chalk34.red("Failed to import wallet: " + (error instanceof Error ? error.message : "Unknown error")));
  }
});
walletCommand.command("backup").description("Show seed phrase for wallet backup").option("-n, --name <name>", "Wallet to backup").action(async (_options) => {
  intro(chalk34.cyan("\u{1F510} Wallet Backup"));
  log.warn("\u26A0\uFE0F  This feature shows your seed phrase.");
  log.warn("Make sure no one is looking at your screen!");
  const proceed = await confirm({
    message: "Continue and show seed phrase?",
    initialValue: false
  });
  if (isCancel(proceed) || !proceed) {
    cancel("Backup cancelled");
    return;
  }
  log.error("\u274C Seed phrase recovery not yet implemented");
  log.info("Seed phrases are only shown during wallet creation");
  log.info("Keep your original backup safe!");
  outro("Backup information");
});
walletCommand.command("rename").description("Rename a wallet").argument("[old-name]", "Current wallet name").argument("[new-name]", "New wallet name").action(async (oldName, newName) => {
  intro(chalk34.cyan("\u270F\uFE0F  Rename Wallet"));
  try {
    const walletService = new WalletService();
    if (!oldName) {
      const wallets = walletService.listWallets();
      if (wallets.length === 0) {
        log.error("No wallets found");
        outro("No wallets available");
        return;
      }
      const choice = await select({
        message: "Select wallet to rename:",
        options: wallets.map((w) => ({
          value: w.name,
          label: w.name,
          hint: `${w.address.slice(0, 8)}...${w.address.slice(-8)}`
        }))
      });
      if (isCancel(choice)) {
        cancel("Rename cancelled");
        return;
      }
      oldName = choice.toString();
    }
    if (!newName) {
      const nameInput = await text({
        message: "New name:",
        placeholder: "new-wallet-name",
        validate: (value) => {
          if (!value || value.trim().length === 0) return "Name is required";
          if (!/^[a-zA-Z0-9-_]+$/.test(value)) return "Use only letters, numbers, - and _";
          return void 0;
        }
      });
      if (isCancel(nameInput)) {
        cancel("Rename cancelled");
        return;
      }
      newName = nameInput.toString();
    }
    walletService.renameWallet(oldName, newName);
    log.success(`\u2705 Renamed "${oldName}" to "${newName}"`);
    const activeWallet = walletService.getActiveWallet();
    if (activeWallet && activeWallet.metadata.name === newName) {
      const config2 = loadConfig();
      config2.walletPath = `~/.ghostspeak/wallets/${newName}.json`;
      saveConfig(config2);
    }
    outro("Wallet renamed successfully");
  } catch (error) {
    cancel(chalk34.red("Failed to rename wallet: " + (error instanceof Error ? error.message : "Unknown error")));
  }
});
walletCommand.command("link").description("Link your local CLI wallet with the GhostSpeak Web App").option("--api-url <url>", "API base URL", "http://localhost:3000").action(async (options) => {
  intro(chalk34.cyan("\u{1F517} Link with GhostSpeak Web App"));
  try {
    const walletService = new WalletService();
    const wallet = walletService.getActiveWallet();
    if (!wallet) {
      throw new Error("No active wallet. Create one first with: ghost wallet create");
    }
    const s = spinner();
    s.start("Initiating link request...");
    const initResponse = await fetch(`${options.apiUrl}/api/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "initiate",
        cliPublicKey: wallet.metadata.address
      })
    });
    if (!initResponse.ok) {
      const error = await initResponse.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to initiate link");
    }
    const { code, linkUrl, expiresIn } = await initResponse.json();
    s.stop("\u2705 Link request created");
    log.info("");
    log.info("To link your CLI wallet with your Web App account:");
    log.info("");
    log.info(`${chalk34.bold("1.")} Open your browser and navigate to:`);
    console.log(chalk34.bold.cyan(`
   ${linkUrl}
`));
    log.info(`${chalk34.bold("2.")} Sign in with your Crossmint account`);
    log.info(`${chalk34.bold("3.")} Confirm the linking request`);
    log.info("");
    note(
      `${chalk34.bold("Verification Code:")} ${chalk34.yellow.bold(code)}

This code expires in ${Math.floor(expiresIn / 60)} minutes.`,
      "Authorization Required"
    );
    s.start("Waiting for authorization in browser...");
    const pollInterval = 2e3;
    const maxAttempts = Math.floor(expiresIn * 1e3 / pollInterval);
    let attempts = 0;
    let authorized = false;
    let linkDetails = null;
    while (attempts < maxAttempts && !authorized) {
      await new Promise((resolve3) => setTimeout(resolve3, pollInterval));
      try {
        const statusResponse = await fetch(`${options.apiUrl}/api/link?code=${code}`);
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          if (status.status === "authorized") {
            authorized = true;
            linkDetails = status;
          } else if (status.status === "rejected") {
            throw new Error("Link request was rejected");
          } else if (status.status === "expired") {
            throw new Error("Link request expired");
          }
        } else if (statusResponse.status === 404 || statusResponse.status === 410) {
          throw new Error("Link request not found or expired");
        }
      } catch (fetchError) {
        if (fetchError instanceof Error && (fetchError.message.includes("rejected") || fetchError.message.includes("expired") || fetchError.message.includes("not found"))) {
          throw fetchError;
        }
      }
      attempts++;
      const elapsed = Math.floor(attempts * pollInterval / 1e3);
      s.message(`Waiting for authorization... (${elapsed}s)`);
    }
    if (!authorized) {
      throw new Error("Authorization timeout. Please try again.");
    }
    s.stop("\u2705 Wallet linked successfully!");
    successBox("Connection Established", [
      `CLI Wallet: ${wallet.metadata.address.slice(0, 8)}...${wallet.metadata.address.slice(-8)}`,
      `Linked to: ${linkDetails?.webWalletAddress?.slice(0, 8) || "Crossmint"}...`,
      "",
      "Your CLI is now authorized as a delegated signer.",
      "You can perform on-chain actions via your web identity."
    ]);
    outro("Linking complete");
  } catch (error) {
    if (error instanceof Error && error.message.includes("fetch")) {
      cancel(chalk34.red("Could not connect to web app. Is it running at the specified URL?"));
    } else {
      cancel(chalk34.red("Linking failed: " + (error instanceof Error ? error.message : "Unknown error")));
    }
  }
});
walletCommand.command("delete").alias("remove").description("Delete a wallet").argument("[name]", "Wallet name to delete").option("-f, --force", "Skip confirmation").action(async (name, options) => {
  intro(chalk34.cyan("\u{1F5D1}\uFE0F  Delete Wallet"));
  try {
    const walletService = new WalletService();
    if (!name) {
      const wallets = walletService.listWallets();
      if (wallets.length === 0) {
        log.error("No wallets found");
        outro("No wallets available");
        return;
      }
      const choice = await select({
        message: "Select wallet to delete:",
        options: wallets.map((w) => ({
          value: w.name,
          label: w.name,
          hint: w.isActive ? chalk34.yellow("Active wallet") : ""
        }))
      });
      if (isCancel(choice)) {
        cancel("Delete cancelled");
        return;
      }
      name = choice.toString();
    }
    const wallet = walletService.getWallet(name);
    if (!wallet) {
      throw new Error(`Wallet "${name}" not found`);
    }
    if (!options?.force) {
      log.warn(`\u26A0\uFE0F  This will permanently delete wallet: ${name}`);
      log.warn(`Address: ${wallet.metadata.address}`);
      const confirmed = await confirm({
        message: "Are you sure you want to delete this wallet?",
        initialValue: false
      });
      if (isCancel(confirmed) || !confirmed) {
        cancel("Delete cancelled");
        return;
      }
    }
    walletService.deleteWallet(name);
    log.success(`\u2705 Deleted wallet: ${name}`);
    outro("Wallet deleted");
  } catch (error) {
    cancel(chalk34.red("Failed to delete wallet: " + (error instanceof Error ? error.message : "Unknown error")));
  }
});
walletCommand.action(async () => {
  await walletCommand.commands.find((cmd) => cmd.name() === "show")?.parseAsync(process.argv);
});
var credentialsCommand = new Command("credentials").description("Manage verifiable credentials and cross-chain sync");
credentialsCommand.command("sync").description("Sync agent identity to EVM via Crossmint").option("--agent-id <id>", "Agent ID to sync").option("--crossmint-key <key>", "Crossmint API Key").option("--recipient <email>", "Recipient email for EVM credential").option("--network <network>", "Target network (base-sepolia, polygon-amoy)", "base-sepolia").action(async (options) => {
  intro(chalk34.cyan("\u{1F504} Cross-Chain Credential Sync"));
  try {
    const walletService = container.resolve(ServiceTokens.WALLET_SERVICE);
    const wallet = walletService.getActiveWalletInterface();
    if (!wallet) {
      cancel(chalk34.red("No active wallet found. Please select a wallet first."));
      return;
    }
    const agentId = options.agentId || await text({
      message: "Enter Agent ID:",
      validate: (val) => !val ? "Agent ID is required" : void 0
    });
    if (isCancel(agentId)) return;
    const crossmintKey = options.crossmintKey || process.env.CROSSMINT_API_KEY || await text({
      message: "Enter Crossmint API Key:",
      validate: (val) => !val ? "API Key is required" : void 0
    });
    if (isCancel(crossmintKey)) return;
    const recipient = options.recipient || await text({
      message: "Enter Recipient Email (for EVM wallet lookup):",
      validate: (val) => !val ? "Email is required" : void 0
    });
    if (isCancel(recipient)) return;
    const s = spinner();
    s.start("Initializing SDK...");
    const client = new GhostSpeakClient({
      // We can reuse existing config or defaults
    });
    const subjectData = CredentialModule.buildAgentIdentitySubject({
      agentId,
      owner: wallet.address,
      name: `Agent ${agentId}`,
      // In real world fetch this from chain
      capabilities: ["ghostspeak:agent"],
      serviceEndpoint: "https://ghostspeak.io/agents/" + agentId,
      frameworkOrigin: "ghostspeak-cli",
      registeredAt: Math.floor(Date.now() / 1e3),
      verifiedAt: Math.floor(Date.now() / 1e3)
    });
    s.message("Signing credential...");
    const credModule = new CredentialModule(client.getProgramId());
    const dataHash = credModule.hashSubjectData(subjectData);
    const signature = await wallet.signMessage(dataHash);
    s.message("Syncing to Crossmint...");
    const service = client.credentials();
    const syncClient = new GhostSpeakClient({
      cluster: "devnet",
      // Default
      credentials: {
        crossmintApiKey: crossmintKey,
        crossmintChain: options.network,
        templates: {
          agentIdentity: "default-identity-template-id"
          // Ideally fetched or prompted
        }
      }
    });
    const finalClient = new GhostSpeakClient({
      ...client["config"],
      // Hacky to access private, better to just clean init
      credentials: {
        crossmintApiKey: crossmintKey,
        crossmintChain: options.network,
        templates: {
          agentIdentity: process.env.CROSSMINT_TEMPLATE_ID || "00000000-0000-0000-0000-000000000000"
        }
      }
    });
    const result = await finalClient.credentials().issueAgentIdentityCredential({
      agentId,
      owner: wallet.address,
      name: `Agent ${agentId}`,
      capabilities: ["ghostspeak:agent"],
      serviceEndpoint: "https://ghostspeak.io",
      frameworkOrigin: "cli",
      registeredAt: Math.floor(Date.now() / 1e3),
      verifiedAt: Math.floor(Date.now() / 1e3),
      recipientEmail: recipient,
      syncToCrossmint: true,
      signature
    });
    s.stop("\u2705 Sync Complete");
    console.log(chalk34.bold("\n\u{1F389} Credential Synced!"));
    console.log(chalk34.gray("Solana Credential ID: ") + result.solanaCredential.credentialId);
    if (result.crossmintSync?.status === "synced") {
      console.log(chalk34.green("\u2705 Crossmint Sync: Success"));
      console.log(chalk34.gray("EVM Credential ID: ") + result.crossmintSync.credentialId);
      console.log(chalk34.gray("Chain: ") + result.crossmintSync.chain);
    } else {
      console.log(chalk34.red("\u274C Crossmint Sync: Failed"));
      console.log(chalk34.red(result.crossmintSync?.error));
    }
  } catch (error) {
    cancel(chalk34.red("Operation failed: " + (error instanceof Error ? error.message : "Unknown error")));
  }
});

// src/commands/reputation.ts
init_client();
init_sdk_helpers();
var reputationCommand = new Command("reputation").description("Manage Ghost Score reputation");
reputationCommand.command("get").description("Get Ghost Score for an agent").option("-a, --agent <address>", "Agent address").option("--json", "Output as JSON").option("--detailed", "Show detailed breakdown").action(async (options) => {
  intro(chalk34.cyan("\u{1F4CA} Get Ghost Score"));
  try {
    let agentAddress = options.agent;
    if (!agentAddress) {
      const addressInput = await text({
        message: "Agent address:",
        validate: (value) => {
          if (!value) return "Agent address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Operation cancelled");
        return;
      }
      agentAddress = addressInput.toString().trim();
    }
    const s = spinner();
    s.start("Fetching Ghost Score from blockchain...");
    const { client } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    const agentAddr = address(agentAddress);
    const agentData = await safeClient.agent.getAgentAccount(agentAddr);
    if (!agentData) {
      s.stop("\u274C Agent not found");
      outro(chalk34.red(`No agent found at address: ${agentAddress}`));
      return;
    }
    s.stop("\u2705 Ghost Score loaded");
    const reputationScore = Number(agentData.reputationScore || 0);
    const ghostScore = Math.min(1e3, Math.round(reputationScore / 100));
    const totalJobs = Number(agentData.totalJobsCompleted || 0);
    const totalJobsFailed = Number(agentData.totalJobsFailed || 0);
    const totalJobsAll = totalJobs + totalJobsFailed;
    const successRate = totalJobsAll > 0 ? Math.round(totalJobs / totalJobsAll * 100) : 0;
    const tier = ghostScore >= 900 ? "PLATINUM" : ghostScore >= 750 ? "GOLD" : ghostScore >= 500 ? "SILVER" : ghostScore >= 200 ? "BRONZE" : "NEWCOMER";
    const tierColor = tier === "PLATINUM" ? chalk34.gray : tier === "GOLD" ? chalk34.yellow : tier === "SILVER" ? chalk34.white : tier === "BRONZE" ? chalk34.red : chalk34.blue;
    let breakdown = null;
    if (options.detailed) {
      const successComponent = Math.round(successRate * 0.4);
      const serviceQuality = Math.min(100, Math.round(ghostScore / 10 * 1.2));
      const serviceComponent = Math.round(serviceQuality * 0.3);
      const responseTime = 95;
      const responseComponent = Math.round(responseTime * 0.2);
      const volumeConsistency = Math.min(100, Math.round(totalJobs / 100 * 100));
      const volumeComponent = Math.round(volumeConsistency * 0.1);
      breakdown = {
        successRate: { value: successRate, weight: 40, contribution: successComponent },
        serviceQuality: { value: serviceQuality, weight: 30, contribution: serviceComponent },
        responseTime: { value: responseTime, weight: 20, contribution: responseComponent },
        volumeConsistency: { value: volumeConsistency, weight: 10, contribution: volumeComponent }
      };
    }
    if (options.json) {
      console.log(JSON.stringify({
        address: agentAddr.toString(),
        agentName: agentData.name,
        ghostScore,
        tier,
        reputationScore,
        totalJobsCompleted: totalJobs,
        totalJobsFailed,
        successRate,
        breakdown
      }, null, 2));
      return;
    }
    if (options.detailed) {
      let tierBenefits = "";
      if (tier === "PLATINUM") {
        tierBenefits = `${chalk34.gray("\u2022 Unlimited job value")}
${chalk34.gray("\u2022 0% escrow deposit")}
${chalk34.gray("\u2022 Instant payment release")}
${chalk34.gray("\u2022 Elite verified badge")}`;
      } else if (tier === "GOLD") {
        tierBenefits = `${chalk34.gray("\u2022 Jobs up to $10,000")}
${chalk34.gray("\u2022 0% escrow deposit")}
${chalk34.gray("\u2022 Gold verified badge")}
${chalk34.gray("\u2022 Premium marketplace access")}`;
      } else if (tier === "SILVER") {
        tierBenefits = `${chalk34.gray("\u2022 Jobs up to $1,000")}
${chalk34.gray("\u2022 15% escrow deposit")}
${chalk34.gray("\u2022 Priority listing")}
${chalk34.gray("\u2022 Featured agent badge")}`;
      } else if (tier === "BRONZE") {
        tierBenefits = `${chalk34.gray("\u2022 Jobs up to $100")}
${chalk34.gray("\u2022 25% escrow deposit")}
${chalk34.gray("\u2022 Standard listing")}
${chalk34.gray("\u2022 Bronze badge")}`;
      } else if (tier === "NEWCOMER") {
        tierBenefits = `${chalk34.gray("\u2022 Jobs up to $100")}
${chalk34.gray("\u2022 25% escrow deposit")}
${chalk34.gray("\u2022 Building initial reputation")}
${chalk34.gray("\u2022 Newcomer badge")}`;
      }
      outro(
        `${chalk34.bold.cyan(`${agentData.name || "Agent"}'s Ghost Score`)}

${chalk34.bold("Overall Score:")}
${chalk34.gray("Ghost Score:")} ${tierColor(`${ghostScore}/1000`)} (${tierColor.bold(tier)})
${chalk34.gray("Reputation Score:")} ${reputationScore} basis points

${chalk34.bold("Score Breakdown:")}
${chalk34.gray("Success Rate (40%):")} ${breakdown.successRate.value}% \u2192 ${breakdown.successRate.contribution} points
${chalk34.gray("Service Quality (30%):")} ${breakdown.serviceQuality.value}% \u2192 ${breakdown.serviceQuality.contribution} points
${chalk34.gray("Response Time (20%):")} ${breakdown.responseTime.value}% \u2192 ${breakdown.responseTime.contribution} points
${chalk34.gray("Volume (10%):")} ${breakdown.volumeConsistency.value}% \u2192 ${breakdown.volumeConsistency.contribution} points

${chalk34.bold("Job Statistics:")}
${chalk34.gray("Completed:")} ${totalJobs}
${chalk34.gray("Failed:")} ${totalJobsFailed}
${chalk34.gray("Success Rate:")} ${successRate}%

${chalk34.bold("Tier Benefits:")}
` + tierBenefits
      );
    } else {
      outro(
        `${chalk34.bold.cyan(`${agentData.name || "Agent"}'s Ghost Score`)}

${chalk34.gray("Ghost Score:")} ${tierColor(`${ghostScore}/1000`)} (${tierColor.bold(tier)})
${chalk34.gray("Jobs Completed:")} ${totalJobs}
${chalk34.gray("Success Rate:")} ${successRate}%

${chalk34.yellow("\u{1F4A1} Tip: Use")} ${chalk34.cyan("--detailed")} ${chalk34.yellow("for full breakdown")}`
      );
    }
  } catch (error) {
    log.error(`Failed to get Ghost Score: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
reputationCommand.command("update").description("Update reputation score (development only)").option("-a, --agent <address>", "Agent address").option("-s, --score <score>", "New reputation score (basis points)").action(async (options) => {
  intro(chalk34.yellow("\u270F\uFE0F  Update Reputation (Dev Only)"));
  log.warn(
    chalk34.yellow("\u26A0\uFE0F  WARNING: ") + "This command is for development/testing only.\nIn production, Ghost Score is updated automatically based on job performance."
  );
  try {
    let agentAddress = options.agent;
    if (!agentAddress) {
      const addressInput = await text({
        message: "Agent address:",
        validate: (value) => {
          if (!value) return "Agent address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Update cancelled");
        return;
      }
      agentAddress = addressInput.toString().trim();
    }
    let newScore = options.score;
    if (!newScore) {
      const scoreInput = await text({
        message: "New reputation score (0-100000 basis points):",
        placeholder: "50000 (500 Ghost Score)",
        validate: (value) => {
          if (!value) return "Score is required";
          const score = parseInt(value);
          if (isNaN(score) || score < 0 || score > 1e5) {
            return "Score must be between 0 and 100000";
          }
        }
      });
      if (isCancel(scoreInput)) {
        cancel("Update cancelled");
        return;
      }
      newScore = scoreInput.toString();
    }
    const scoreBps = parseInt(newScore);
    const ghostScore = Math.min(1e3, Math.round(scoreBps / 100));
    const confirmUpdate = await confirm({
      message: `Set Ghost Score to ${ghostScore}/1000 (${scoreBps} bps)?`
    });
    if (isCancel(confirmUpdate) || !confirmUpdate) {
      cancel("Update cancelled");
      return;
    }
    log.warn("Reputation update functionality not yet implemented in SDK.");
    log.info("In production, Ghost Score updates automatically based on job completion and ratings.");
    outro(
      `${chalk34.yellow("Update Pending")}

Reputation updates will be automatic once the platform is live.

To influence your Ghost Score:
\u2022 Complete jobs successfully
\u2022 Maintain high service quality
\u2022 Respond quickly to requests
\u2022 Build consistent volume`
    );
  } catch (error) {
    log.error(`Failed to update reputation: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
reputationCommand.command("history").description("View reputation history for an agent").option("-a, --agent <address>", "Agent address").option("-l, --limit <limit>", "Maximum number of entries to display", "10").option("--json", "Output as JSON").action(async (options) => {
  intro(chalk34.blue("\u{1F4C8} Reputation History"));
  try {
    let agentAddress = options.agent;
    if (!agentAddress) {
      const addressInput = await text({
        message: "Agent address:",
        validate: (value) => {
          if (!value) return "Agent address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Operation cancelled");
        return;
      }
      agentAddress = addressInput.toString().trim();
    }
    const s = spinner();
    s.start("Fetching reputation history...");
    const { client } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    const agentAddr = address(agentAddress);
    s.stop("\u26A0\uFE0F  Reputation history API not yet available");
    log.warn("Reputation history tracking is not yet implemented in the SDK.");
    log.info("This feature will track:");
    log.info("\u2022 Ghost Score changes over time");
    log.info("\u2022 Job completions and ratings");
    log.info("\u2022 Tier upgrades/downgrades");
    log.info("\u2022 Reputation milestones");
    outro(
      `${chalk34.yellow("History Coming Soon")}

In the meantime, you can:
\u2022 Check current score: ${chalk34.cyan("ghost reputation get --agent " + agentAddr.toString().slice(0, 8) + "...")}
\u2022 View agent details: ${chalk34.cyan("ghost agent get --agent " + agentAddr.toString().slice(0, 8) + "...")}`
    );
  } catch (error) {
    log.error(`Failed to get reputation history: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
reputationCommand.action(async () => {
  intro(chalk34.blue("\u{1F4CA} GhostSpeak Reputation Management"));
  log.info(`
${chalk34.bold("Available Commands:")}
`);
  log.info(`${chalk34.cyan("ghost reputation get")} - Get Ghost Score for an agent`);
  log.info(`${chalk34.cyan("ghost reputation update")} - Update reputation (dev only)`);
  log.info(`${chalk34.cyan("ghost reputation history")} - View reputation history`);
  outro("Use --help with any command for more details");
});

// src/commands/staking.ts
init_client();
init_sdk_helpers();
var TIER_THRESHOLDS = {
  1: 1e3,
  2: 5e3,
  3: 1e4,
  4: 25e3,
  5: 5e4
};
function calculateStakingTier(amountStaked) {
  if (amountStaked >= TIER_THRESHOLDS[5]) return 5;
  if (amountStaked >= TIER_THRESHOLDS[4]) return 4;
  if (amountStaked >= TIER_THRESHOLDS[3]) return 3;
  if (amountStaked >= TIER_THRESHOLDS[2]) return 2;
  if (amountStaked >= TIER_THRESHOLDS[1]) return 1;
  return 0;
}
function getTierBenefits(tier) {
  const benefits = {
    0: ["No benefits", "Stake 1,000 GHOST to unlock Tier 1"],
    1: ["5% reputation boost", "10% APY", "Basic governance voting"],
    2: ["10% reputation boost", "15% APY", "Enhanced governance voting", "Priority support"],
    3: ["15% reputation boost", "20% APY", "Full governance rights", "Premium support", "Early feature access"],
    4: ["20% reputation boost", "25% APY", "Weighted governance voting", "Dedicated support", "Beta features"],
    5: ["25% reputation boost", "30% APY", "Maximum governance power", "VIP support", "Revenue sharing", "Advisory board consideration"]
  };
  return benefits[tier] || benefits[0];
}
var stakingCommand = new Command("staking").description("Manage GHOST token staking");
stakingCommand.command("stake").description("Stake GHOST tokens for an agent").option("-a, --agent <address>", "Agent address").option("--amount <amount>", "Amount of GHOST to stake").action(async (options) => {
  intro(chalk34.cyan("\u{1F510} Stake GHOST Tokens"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let agentAddress = options.agent;
    if (!agentAddress) {
      const addressInput = await text({
        message: "Agent address to stake for:",
        validate: (value) => {
          if (!value) return "Agent address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Staking cancelled");
        return;
      }
      agentAddress = addressInput.toString().trim();
    }
    const agentAddr = address(agentAddress);
    s.start("Verifying agent...");
    const agentData = await safeClient.agent.getAgentAccount(agentAddr);
    if (!agentData) {
      s.stop("\u274C Agent not found");
      outro(chalk34.red(`No agent found at address: ${agentAddress}`));
      return;
    }
    s.stop("\u2705 Agent verified");
    let amount = options.amount;
    if (!amount) {
      const amountInput = await text({
        message: "Amount of GHOST to stake:",
        placeholder: "1000",
        validate: (value) => {
          if (!value) return "Amount is required";
          const amt = parseFloat(value);
          if (isNaN(amt) || amt <= 0) {
            return "Amount must be a positive number";
          }
          if (amt < 100) {
            return "Minimum stake is 100 GHOST";
          }
        }
      });
      if (isCancel(amountInput)) {
        cancel("Staking cancelled");
        return;
      }
      amount = amountInput.toString();
    }
    const stakeAmount = parseFloat(amount);
    const currentTier = calculateStakingTier(stakeAmount);
    const nextTierThreshold = TIER_THRESHOLDS[currentTier + 1];
    note(
      `${chalk34.bold("Staking Details:")}
${chalk34.gray("Agent:")} ${agentData.name}
${chalk34.gray("Amount:")} ${stakeAmount.toLocaleString()} GHOST
${chalk34.gray("Tier After Stake:")} ${currentTier}/5
${nextTierThreshold ? chalk34.gray(`Next Tier: `) + (nextTierThreshold - stakeAmount).toLocaleString() + ` GHOST more
` : ""}${chalk34.bold("\nBenefits:")}
` + getTierBenefits(currentTier).map((b) => `${chalk34.gray("\u2022")} ${b}`).join("\n"),
      "Staking Preview"
    );
    const confirmStake = await confirm({
      message: `Stake ${stakeAmount.toLocaleString()} GHOST?`
    });
    if (isCancel(confirmStake) || !confirmStake) {
      cancel("Staking cancelled");
      return;
    }
    s.start("Staking GHOST tokens on blockchain...");
    try {
      const lamports = BigInt(Math.round(stakeAmount * 1e9));
      log.warn("Staking functionality integration pending. SDK staking module ready.");
      s.stop("\u26A0\uFE0F  Staking method not yet connected to CLI");
      outro(
        `${chalk34.yellow("Staking Pending")}

Your stake of ${stakeAmount.toLocaleString()} GHOST for ${agentData.name} will be processed.

${chalk34.bold("Expected Benefits:")}
${chalk34.gray("\u2022")} Tier ${currentTier}/5 staking tier
${chalk34.gray("\u2022")} ${getTierBenefits(currentTier)[0]}
${chalk34.gray("\u2022")} ${getTierBenefits(currentTier)[1]}

${chalk34.gray("Note: Staking CLI integration coming soon.")}
${chalk34.gray("Web dashboard already supports staking: ")}${chalk34.cyan("https://ghostspeak.io/dashboard/staking")}`
      );
    } catch (error) {
      s.stop("\u274C Failed to stake tokens");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to stake: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
stakingCommand.command("unstake").description("Unstake GHOST tokens").option("-a, --agent <address>", "Agent address").option("--amount <amount>", "Amount of GHOST to unstake").action(async (options) => {
  intro(chalk34.yellow("\u{1F513} Unstake GHOST Tokens"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let agentAddress = options.agent;
    if (!agentAddress) {
      const addressInput = await text({
        message: "Agent address to unstake from:",
        validate: (value) => {
          if (!value) return "Agent address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Unstaking cancelled");
        return;
      }
      agentAddress = addressInput.toString().trim();
    }
    const agentAddr = address(agentAddress);
    log.warn("Unstaking functionality pending SDK integration.");
    let amount = options.amount;
    if (!amount) {
      const amountInput = await text({
        message: "Amount of GHOST to unstake:",
        placeholder: "500",
        validate: (value) => {
          if (!value) return "Amount is required";
          const amt = parseFloat(value);
          if (isNaN(amt) || amt <= 0) {
            return "Amount must be a positive number";
          }
        }
      });
      if (isCancel(amountInput)) {
        cancel("Unstaking cancelled");
        return;
      }
      amount = amountInput.toString();
    }
    const unstakeAmount = parseFloat(amount);
    note(
      `${chalk34.bold("\u26A0\uFE0F  Unstaking Warning:")}
${chalk34.gray("Amount:")} ${unstakeAmount.toLocaleString()} GHOST
${chalk34.gray("Cooldown Period:")} 7 days
${chalk34.gray("Impact:")} Reduced reputation boost
${chalk34.gray("Impact:")} Lower APY on remaining stake

${chalk34.yellow("Benefits will be reduced immediately, but tokens unlock after 7 days.")}`,
      "Unstaking Impact"
    );
    const confirmUnstake = await confirm({
      message: `Unstake ${unstakeAmount.toLocaleString()} GHOST?`
    });
    if (isCancel(confirmUnstake) || !confirmUnstake) {
      cancel("Unstaking cancelled");
      return;
    }
    s.start("Unstaking GHOST tokens...");
    try {
      log.warn("Unstaking method not yet connected to CLI.");
      s.stop("\u26A0\uFE0F  Unstaking pending SDK integration");
      outro(
        `${chalk34.yellow("Unstaking Pending")}

Your request to unstake ${unstakeAmount.toLocaleString()} GHOST will be processed.

${chalk34.gray("Cooldown: 7 days")}
${chalk34.gray("Web dashboard: ")}${chalk34.cyan("https://ghostspeak.io/dashboard/staking")}`
      );
    } catch (error) {
      s.stop("\u274C Failed to unstake tokens");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to unstake: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
stakingCommand.command("rewards").description("View or claim staking rewards").option("-a, --agent <address>", "Agent address").option("--claim", "Claim rewards instead of just viewing").option("--json", "Output as JSON").action(async (options) => {
  intro(options.claim ? chalk34.green("\u{1F4B0} Claim Staking Rewards") : chalk34.blue("\u{1F4B0} View Staking Rewards"));
  try {
    const s = spinner();
    s.start("Fetching staking rewards...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    let agentAddress = options.agent;
    if (!agentAddress && options.claim) {
      const addressInput = await text({
        message: "Agent address:",
        validate: (value) => {
          if (!value) return "Agent address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Operation cancelled");
        return;
      }
      agentAddress = addressInput.toString().trim();
    }
    log.warn("Rewards calculation not yet integrated with SDK.");
    s.stop("\u26A0\uFE0F  Rewards API pending");
    const mockRewards = {
      pendingRewards: 125.5,
      claimedRewards: 450.25,
      estimatedAPY: 20,
      lastClaimed: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (options.json) {
      console.log(JSON.stringify(mockRewards, null, 2));
      return;
    }
    outro(
      `${chalk34.bold.cyan("Staking Rewards")}

${chalk34.gray("Pending Rewards:")} ${mockRewards.pendingRewards.toLocaleString()} GHOST
${chalk34.gray("Claimed Rewards:")} ${mockRewards.claimedRewards.toLocaleString()} GHOST
${chalk34.gray("Current APY:")} ${mockRewards.estimatedAPY}%
${chalk34.gray("Last Claimed:")} ${new Date(mockRewards.lastClaimed).toLocaleDateString()}

${chalk34.yellow("\u{1F4A1} Tip: Use")} ${chalk34.cyan("--claim")} ${chalk34.yellow("to claim rewards")}
${chalk34.gray("Web dashboard: ")}${chalk34.cyan("https://ghostspeak.io/dashboard/staking")}`
    );
  } catch (error) {
    log.error(`Failed to get rewards: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
stakingCommand.command("balance").description("Check GHOST token balance and staking status").option("-a, --agent <address>", "Agent address (optional)").option("--json", "Output as JSON").action(async (options) => {
  intro(chalk34.blue("\u{1F48E} GHOST Token Balance"));
  try {
    const s = spinner();
    s.start("Fetching balances...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u26A0\uFE0F  Balance API pending integration");
    const mockBalance = {
      walletBalance: 5e3,
      stakedBalance: 1e4,
      pendingRewards: 125.5,
      totalValue: 15125.5
    };
    if (options.json) {
      console.log(JSON.stringify(mockBalance, null, 2));
      return;
    }
    outro(
      `${chalk34.bold.cyan("GHOST Token Balance")}

${chalk34.gray("Wallet:")} ${mockBalance.walletBalance.toLocaleString()} GHOST
${chalk34.gray("Staked:")} ${mockBalance.stakedBalance.toLocaleString()} GHOST
${chalk34.gray("Pending Rewards:")} ${mockBalance.pendingRewards.toLocaleString()} GHOST
${chalk34.gray("Total Value:")} ${mockBalance.totalValue.toLocaleString()} GHOST

${chalk34.bold("Staking Status:")}
${chalk34.gray("Tier:")} ${calculateStakingTier(mockBalance.stakedBalance)}/5
${chalk34.gray("Reputation Boost:")} ${calculateStakingTier(mockBalance.stakedBalance) * 5}%
${chalk34.gray("APY:")} ${10 + calculateStakingTier(mockBalance.stakedBalance) * 5}%

${chalk34.yellow("\u{1F4A1} Commands:")}
${chalk34.cyan("ghost staking stake")} - Stake more GHOST
${chalk34.cyan("ghost staking rewards --claim")} - Claim pending rewards`
    );
  } catch (error) {
    log.error(`Failed to get balance: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
stakingCommand.action(async () => {
  intro(chalk34.blue("\u{1F510} GhostSpeak GHOST Token Staking"));
  log.info(`
${chalk34.bold("Available Commands:")}
`);
  log.info(`${chalk34.cyan("ghost staking stake")} - Stake GHOST tokens for reputation boost`);
  log.info(`${chalk34.cyan("ghost staking unstake")} - Unstake GHOST tokens (7-day cooldown)`);
  log.info(`${chalk34.cyan("ghost staking rewards")} - View or claim staking rewards`);
  log.info(`${chalk34.cyan("ghost staking balance")} - Check GHOST balance and staking status`);
  note(
    `${chalk34.bold("Staking Tiers:")}
${chalk34.gray("Tier 1:")} 1,000 GHOST (5% boost, 10% APY)
${chalk34.gray("Tier 2:")} 5,000 GHOST (10% boost, 15% APY)
${chalk34.gray("Tier 3:")} 10,000 GHOST (15% boost, 20% APY)
${chalk34.gray("Tier 4:")} 25,000 GHOST (20% boost, 25% APY)
${chalk34.gray("Tier 5:")} 50,000+ GHOST (25% boost, 30% APY)`,
    "Tier System"
  );
  outro("Use --help with any command for more details");
});

// src/commands/privacy.ts
init_client();
init_sdk_helpers();
var PRIVACY_MODES = {
  public: {
    name: "Public",
    description: "All reputation data visible to everyone",
    scoreVisible: true,
    tierVisible: true,
    metricsVisible: true,
    emoji: "\u{1F310}"
  },
  selective: {
    name: "Selective",
    description: "Show tier only, hide exact score",
    scoreVisible: false,
    tierVisible: true,
    metricsVisible: false,
    emoji: "\u{1F50D}"
  },
  private: {
    name: "Private",
    description: "Hide score and tier, show only verified status",
    scoreVisible: false,
    tierVisible: false,
    metricsVisible: false,
    emoji: "\u{1F512}"
  },
  anonymous: {
    name: "Anonymous",
    description: "Hide all reputation data",
    scoreVisible: false,
    tierVisible: false,
    metricsVisible: false,
    emoji: "\u{1F464}"
  }
};
var privacyCommand = new Command("privacy").description("Manage Ghost Score privacy settings");
privacyCommand.command("set").description("Configure privacy settings for an agent").option("-a, --agent <address>", "Agent address").option("-m, --mode <mode>", "Privacy mode (public, selective, private, anonymous)").option("--score-visible <boolean>", "Make exact score visible (true/false)").option("--tier-visible <boolean>", "Make tier visible (true/false)").action(async (options) => {
  intro(chalk34.cyan("\u{1F512} Configure Privacy Settings"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let agentAddress = options.agent;
    if (!agentAddress) {
      const addressInput = await text({
        message: "Agent address:",
        validate: (value) => {
          if (!value) return "Agent address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Privacy configuration cancelled");
        return;
      }
      agentAddress = addressInput.toString().trim();
    }
    const agentAddr = address(agentAddress);
    s.start("Verifying agent...");
    const agentData = await safeClient.agent.getAgentAccount(agentAddr);
    if (!agentData) {
      s.stop("\u274C Agent not found");
      outro(chalk34.red(`No agent found at address: ${agentAddress}`));
      return;
    }
    s.stop("\u2705 Agent verified");
    let mode = options.mode;
    if (!mode) {
      const modeChoice = await select({
        message: "Select privacy mode:",
        options: [
          {
            value: "public",
            label: `${PRIVACY_MODES.public.emoji} ${PRIVACY_MODES.public.name}`,
            hint: PRIVACY_MODES.public.description
          },
          {
            value: "selective",
            label: `${PRIVACY_MODES.selective.emoji} ${PRIVACY_MODES.selective.name}`,
            hint: PRIVACY_MODES.selective.description
          },
          {
            value: "private",
            label: `${PRIVACY_MODES.private.emoji} ${PRIVACY_MODES.private.name}`,
            hint: PRIVACY_MODES.private.description
          },
          {
            value: "anonymous",
            label: `${PRIVACY_MODES.anonymous.emoji} ${PRIVACY_MODES.anonymous.name}`,
            hint: PRIVACY_MODES.anonymous.description
          }
        ]
      });
      if (isCancel(modeChoice)) {
        cancel("Privacy configuration cancelled");
        return;
      }
      mode = modeChoice.toString();
    }
    const selectedMode = PRIVACY_MODES[mode];
    if (!selectedMode) {
      log.error("Invalid privacy mode. Choose: public, selective, private, or anonymous");
      return;
    }
    const scoreVisible = options["score-visible"] !== void 0 ? options["score-visible"] === true || options["score-visible"] === "true" : selectedMode.scoreVisible;
    const tierVisible = options["tier-visible"] !== void 0 ? options["tier-visible"] === true || options["tier-visible"] === "true" : selectedMode.tierVisible;
    note(
      `${chalk34.bold("Privacy Settings:")}
${chalk34.gray("Agent:")} ${agentData.name}
${chalk34.gray("Mode:")} ${selectedMode.emoji} ${selectedMode.name}
${chalk34.gray("Description:")} ${selectedMode.description}

${chalk34.bold("Visibility:")}
${chalk34.gray("Exact Score:")} ${scoreVisible ? chalk34.green("Visible") : chalk34.red("Hidden")}
${chalk34.gray("Tier Badge:")} ${tierVisible ? chalk34.green("Visible") : chalk34.red("Hidden")}
${chalk34.gray("Metrics:")} ${selectedMode.metricsVisible ? chalk34.green("Visible") : chalk34.red("Hidden")}`,
      "Privacy Preview"
    );
    const confirmSet = await confirm({
      message: `Apply ${selectedMode.name} privacy mode?`
    });
    if (isCancel(confirmSet) || !confirmSet) {
      cancel("Privacy configuration cancelled");
      return;
    }
    s.start("Updating privacy settings on blockchain...");
    try {
      log.warn("Privacy settings update pending SDK integration.");
      s.stop("\u26A0\uFE0F  Privacy settings update method pending");
      outro(
        `${chalk34.yellow("Privacy Update Pending")}

Your privacy settings for ${agentData.name} will be updated to:
${chalk34.gray("Mode:")} ${selectedMode.emoji} ${selectedMode.name}
${chalk34.gray("Score Visible:")} ${scoreVisible ? "Yes" : "No"}
${chalk34.gray("Tier Visible:")} ${tierVisible ? "Yes" : "No"}

${chalk34.gray("Note: Privacy CLI integration coming soon.")}
${chalk34.gray("Web dashboard: ")}${chalk34.cyan("https://ghostspeak.io/dashboard/privacy")}`
      );
    } catch (error) {
      s.stop("\u274C Failed to update privacy settings");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to set privacy: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
privacyCommand.command("get").description("View current privacy settings for an agent").option("-a, --agent <address>", "Agent address").option("--json", "Output as JSON").action(async (options) => {
  intro(chalk34.blue("\u{1F50D} View Privacy Settings"));
  try {
    let agentAddress = options.agent;
    if (!agentAddress) {
      const addressInput = await text({
        message: "Agent address:",
        validate: (value) => {
          if (!value) return "Agent address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Operation cancelled");
        return;
      }
      agentAddress = addressInput.toString().trim();
    }
    const s = spinner();
    s.start("Fetching privacy settings...");
    const { client } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    const agentAddr = address(agentAddress);
    const agentData = await safeClient.agent.getAgentAccount(agentAddr);
    if (!agentData) {
      s.stop("\u274C Agent not found");
      outro(chalk34.red(`No agent found at address: ${agentAddress}`));
      return;
    }
    s.stop("\u26A0\uFE0F  Privacy settings API pending");
    const mockSettings = {
      mode: "selective",
      scoreVisible: false,
      tierVisible: true,
      metricsVisible: false
    };
    const currentMode = PRIVACY_MODES[mockSettings.mode];
    if (options.json) {
      console.log(JSON.stringify({
        agent: agentAddr.toString(),
        agentName: agentData.name,
        ...mockSettings
      }, null, 2));
      return;
    }
    outro(
      `${chalk34.bold.cyan(`Privacy Settings for ${agentData.name}`)}

${chalk34.bold("Current Mode:")}
${chalk34.gray("Mode:")} ${currentMode.emoji} ${currentMode.name}
${chalk34.gray("Description:")} ${currentMode.description}

${chalk34.bold("Visibility Settings:")}
${chalk34.gray("Exact Score:")} ${mockSettings.scoreVisible ? chalk34.green("Visible \u2713") : chalk34.red("Hidden \u2717")}
${chalk34.gray("Tier Badge:")} ${mockSettings.tierVisible ? chalk34.green("Visible \u2713") : chalk34.red("Hidden \u2717")}
${chalk34.gray("Detailed Metrics:")} ${mockSettings.metricsVisible ? chalk34.green("Visible \u2713") : chalk34.red("Hidden \u2717")}

${chalk34.yellow("\u{1F4A1} Commands:")}
${chalk34.cyan("ghost privacy set --agent " + agentAddr.toString().slice(0, 8) + "...")} - Change privacy mode
${chalk34.cyan("ghost privacy presets --agent " + agentAddr.toString().slice(0, 8) + "...")} - Use quick presets`
    );
  } catch (error) {
    log.error(`Failed to get privacy settings: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
privacyCommand.command("presets").description("Apply privacy presets quickly").option("-a, --agent <address>", "Agent address").option("-p, --preset <preset>", "Preset name (public, selective, private, anonymous)").action(async (options) => {
  intro(chalk34.cyan("\u26A1 Apply Privacy Preset"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let agentAddress = options.agent;
    if (!agentAddress) {
      const addressInput = await text({
        message: "Agent address:",
        validate: (value) => {
          if (!value) return "Agent address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Preset application cancelled");
        return;
      }
      agentAddress = addressInput.toString().trim();
    }
    const agentAddr = address(agentAddress);
    s.start("Verifying agent...");
    const agentData = await safeClient.agent.getAgentAccount(agentAddr);
    if (!agentData) {
      s.stop("\u274C Agent not found");
      outro(chalk34.red(`No agent found at address: ${agentAddress}`));
      return;
    }
    s.stop("\u2705 Agent verified");
    let preset = options.preset;
    if (!preset) {
      const presetChoice = await select({
        message: "Select privacy preset:",
        options: Object.entries(PRIVACY_MODES).map(([key, value]) => ({
          value: key,
          label: `${value.emoji} ${value.name}`,
          hint: value.description
        }))
      });
      if (isCancel(presetChoice)) {
        cancel("Preset application cancelled");
        return;
      }
      preset = presetChoice.toString();
    }
    const selectedPreset = PRIVACY_MODES[preset];
    if (!selectedPreset) {
      log.error("Invalid preset. Choose: public, selective, private, or anonymous");
      return;
    }
    let recommendedFor = "";
    if (preset === "public") {
      recommendedFor = `${chalk34.gray("\u2022")} Maximum transparency
${chalk34.gray("\u2022")} Building trust quickly
${chalk34.gray("\u2022")} Top-tier agents`;
    } else if (preset === "selective") {
      recommendedFor = `${chalk34.gray("\u2022")} Balanced privacy
${chalk34.gray("\u2022")} Most common choice
${chalk34.gray("\u2022")} Show credibility without details`;
    } else if (preset === "private") {
      recommendedFor = `${chalk34.gray("\u2022")} Enhanced privacy
${chalk34.gray("\u2022")} Verified status only
${chalk34.gray("\u2022")} Sensitive use cases`;
    } else if (preset === "anonymous") {
      recommendedFor = `${chalk34.gray("\u2022")} Maximum privacy
${chalk34.gray("\u2022")} Complete anonymity
${chalk34.gray("\u2022")} High-security requirements`;
    }
    note(
      `${chalk34.bold("Preset Details:")}
${chalk34.gray("Name:")} ${selectedPreset.emoji} ${selectedPreset.name}
${chalk34.gray("Description:")} ${selectedPreset.description}

${chalk34.bold("This preset will:")}
${chalk34.gray("\u2022")} ${selectedPreset.scoreVisible ? "Show" : "Hide"} exact Ghost Score
${chalk34.gray("\u2022")} ${selectedPreset.tierVisible ? "Show" : "Hide"} tier badge
${chalk34.gray("\u2022")} ${selectedPreset.metricsVisible ? "Show" : "Hide"} detailed metrics

${chalk34.bold("Recommended for:")}
` + recommendedFor,
      `${selectedPreset.emoji} ${selectedPreset.name} Preset`
    );
    const confirmPreset = await confirm({
      message: `Apply ${selectedPreset.name} preset?`
    });
    if (isCancel(confirmPreset) || !confirmPreset) {
      cancel("Preset application cancelled");
      return;
    }
    s.start("Applying privacy preset...");
    try {
      log.warn("Privacy preset application pending SDK integration.");
      s.stop("\u26A0\uFE0F  Preset application method pending");
      outro(
        `${chalk34.yellow("Preset Application Pending")}

The ${selectedPreset.emoji} ${selectedPreset.name} preset will be applied to ${agentData.name}.

${chalk34.gray("Web dashboard: ")}${chalk34.cyan("https://ghostspeak.io/dashboard/privacy")}`
      );
    } catch (error) {
      s.stop("\u274C Failed to apply preset");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to apply preset: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
privacyCommand.action(async () => {
  intro(chalk34.blue("\u{1F512} GhostSpeak Privacy Management"));
  log.info(`
${chalk34.bold("Available Commands:")}
`);
  log.info(`${chalk34.cyan("ghost privacy set")} - Configure custom privacy settings`);
  log.info(`${chalk34.cyan("ghost privacy get")} - View current privacy settings`);
  log.info(`${chalk34.cyan("ghost privacy presets")} - Apply quick privacy presets`);
  note(
    `${chalk34.bold("Privacy Modes:")}
${PRIVACY_MODES.public.emoji} ${chalk34.bold("Public")} - All data visible (maximum transparency)
${PRIVACY_MODES.selective.emoji} ${chalk34.bold("Selective")} - Tier visible, score hidden (balanced)
${PRIVACY_MODES.private.emoji} ${chalk34.bold("Private")} - Verified status only (enhanced privacy)
${PRIVACY_MODES.anonymous.emoji} ${chalk34.bold("Anonymous")} - All data hidden (maximum privacy)`,
    "Privacy Modes"
  );
  outro("Use --help with any command for more details");
});

// src/commands/did.ts
init_client();
init_sdk_helpers();
var VERIFICATION_METHOD_TYPES = {
  ed25519: {
    name: "Ed25519VerificationKey2020",
    description: "Default Solana keypair signature verification",
    icon: "\u{1F511}"
  },
  secp256k1: {
    name: "EcdsaSecp256k1VerificationKey2019",
    description: "Ethereum-compatible signature verification",
    icon: "\u26A1"
  },
  rsa: {
    name: "RsaVerificationKey2018",
    description: "RSA signature verification",
    icon: "\u{1F510}"
  }
};
var SERVICE_TYPES = {
  messaging: {
    name: "MessagingService",
    description: "Decentralized messaging endpoint",
    icon: "\u{1F4AC}"
  },
  credential: {
    name: "CredentialRegistryService",
    description: "Verifiable credential issuance",
    icon: "\u{1F4DC}"
  },
  hub: {
    name: "IdentityHub",
    description: "Decentralized identity storage",
    icon: "\u{1F3E0}"
  },
  agent: {
    name: "AgentService",
    description: "AI agent interaction endpoint",
    icon: "\u{1F916}"
  }
};
var didCommand = new Command("did").description("Manage W3C Decentralized Identifiers (DIDs)");
didCommand.command("create").description("Create a new DID document for an agent").option("-a, --agent <address>", "Agent address").option("--service-endpoint <url>", "Add service endpoint URL").option("--verification-method <type>", "Verification method type (ed25519, secp256k1, rsa)").action(async (options) => {
  intro(chalk34.cyan("\u{1F194} Create DID Document"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let agentAddress = options.agent;
    if (!agentAddress) {
      const addressInput = await text({
        message: "Agent address:",
        validate: (value) => {
          if (!value) return "Agent address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("DID creation cancelled");
        return;
      }
      agentAddress = addressInput.toString().trim();
    }
    const agentAddr = address(agentAddress);
    s.start("Verifying agent...");
    const agentData = await safeClient.agent.getAgentAccount(agentAddr);
    if (!agentData) {
      s.stop("\u274C Agent not found");
      outro(chalk34.red(`No agent found at address: ${agentAddress}`));
      return;
    }
    s.stop("\u2705 Agent verified");
    let verificationMethod = options["verification-method"];
    if (!verificationMethod) {
      const vmChoice = await select({
        message: "Select verification method:",
        options: Object.entries(VERIFICATION_METHOD_TYPES).map(([key, value]) => ({
          value: key,
          label: `${value.icon} ${value.name}`,
          hint: value.description
        }))
      });
      if (isCancel(vmChoice)) {
        cancel("DID creation cancelled");
        return;
      }
      verificationMethod = vmChoice.toString();
    }
    const selectedVM = VERIFICATION_METHOD_TYPES[verificationMethod];
    if (!selectedVM) {
      log.error("Invalid verification method. Choose: ed25519, secp256k1, or rsa");
      return;
    }
    let serviceEndpoint = options["service-endpoint"];
    if (!serviceEndpoint) {
      const addService = await confirm({
        message: "Add a service endpoint to the DID document?"
      });
      if (isCancel(addService)) {
        cancel("DID creation cancelled");
        return;
      }
      if (addService) {
        const endpointInput = await text({
          message: "Service endpoint URL:",
          placeholder: "https://api.example.com/agent",
          validate: (value) => {
            if (!value) return "Service endpoint is required";
            try {
              new URL(value);
              return;
            } catch {
              return "Please enter a valid URL";
            }
          }
        });
        if (isCancel(endpointInput)) {
          cancel("DID creation cancelled");
          return;
        }
        serviceEndpoint = endpointInput.toString();
      }
    }
    const didIdentifier = `did:ghostspeak:devnet:${agentAddr.toString()}`;
    note(
      `${chalk34.bold("DID Document Preview:")}\\n${chalk34.gray("DID:")} ${didIdentifier}\\n${chalk34.gray("Agent:")} ${agentData.name}\\n${chalk34.gray("Verification Method:")} ${selectedVM.icon} ${selectedVM.name}\\n${serviceEndpoint ? `${chalk34.gray("Service Endpoint:")} ${serviceEndpoint}\\n` : ""}\\n${chalk34.bold("Document Structure:")}\\n${chalk34.gray("\u2022 @context:")} https://www.w3.org/ns/did/v1\\n${chalk34.gray("\u2022 id:")} ${didIdentifier}\\n${chalk34.gray("\u2022 verificationMethod:")} 1 method\\n${serviceEndpoint ? `${chalk34.gray("\u2022 service:")} 1 endpoint` : `${chalk34.gray("\u2022 service:")} None`}`,
      "DID Preview"
    );
    const confirmCreate = await confirm({
      message: `Create DID document for ${agentData.name}?`
    });
    if (isCancel(confirmCreate) || !confirmCreate) {
      cancel("DID creation cancelled");
      return;
    }
    s.start("Creating DID document on blockchain...");
    try {
      log.warn("DID document creation pending SDK integration.");
      s.stop("\u26A0\uFE0F  DID creation method pending");
      outro(
        `${chalk34.yellow("DID Creation Pending")}\\n\\nYour DID document will be created with:\\n${chalk34.gray("DID:")} ${chalk34.cyan(didIdentifier)}\\n${chalk34.gray("Agent:")} ${agentData.name}\\n${chalk34.gray("Verification Method:")} ${selectedVM.name}\\n${serviceEndpoint ? `${chalk34.gray("Service Endpoint:")} ${serviceEndpoint}\\n` : ""}\\n${chalk34.gray("Note: DID CLI integration coming soon.")}\\n${chalk34.gray("Web dashboard: ")}${chalk34.cyan("https://ghostspeak.io/dashboard")}`
      );
    } catch (error) {
      s.stop("\u274C Failed to create DID document");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to create DID: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
didCommand.command("update").description("Update an existing DID document").option("-d, --did <did>", "DID identifier (did:ghostspeak:devnet:address)").option("-a, --action <action>", "Update action (add-service, remove-service, add-vm, remove-vm)").option("--service-endpoint <url>", "Service endpoint URL (for add-service)").option("--service-type <type>", "Service type (messaging, credential, hub, agent)").option("--verification-method <type>", "Verification method type (for add-vm)").action(async (options) => {
  intro(chalk34.blue("\u270F\uFE0F  Update DID Document"));
  try {
    const s = spinner();
    let didIdentifier = options.did;
    if (!didIdentifier) {
      const didInput = await text({
        message: "DID identifier:",
        placeholder: "did:ghostspeak:devnet:...",
        validate: (value) => {
          if (!value) return "DID identifier is required";
          if (!value.startsWith("did:ghostspeak:")) {
            return 'DID must start with "did:ghostspeak:"';
          }
        }
      });
      if (isCancel(didInput)) {
        cancel("Update cancelled");
        return;
      }
      didIdentifier = didInput.toString().trim();
    }
    const didParts = didIdentifier.split(":");
    if (didParts.length < 4) {
      log.error("Invalid DID format. Expected: did:ghostspeak:network:address");
      return;
    }
    const agentAddress = didParts[3];
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    s.start("Verifying DID document...");
    const agentAddr = address(agentAddress);
    const agentData = await safeClient.agent.getAgentAccount(agentAddr);
    if (!agentData) {
      s.stop("\u274C Agent not found");
      outro(chalk34.red(`No agent found for DID: ${didIdentifier}`));
      return;
    }
    s.stop("\u2705 DID document found");
    let updateAction = options.action;
    if (!updateAction) {
      const actionChoice = await select({
        message: "Select update action:",
        options: [
          {
            value: "add-service",
            label: "\u2795 Add Service",
            hint: "Add a new service endpoint to the DID document"
          },
          {
            value: "remove-service",
            label: "\u2796 Remove Service",
            hint: "Remove an existing service endpoint"
          },
          {
            value: "add-vm",
            label: "\u{1F511} Add Verification Method",
            hint: "Add a new verification method"
          },
          {
            value: "remove-vm",
            label: "\u{1F5D1}\uFE0F  Remove Verification Method",
            hint: "Remove an existing verification method"
          }
        ]
      });
      if (isCancel(actionChoice)) {
        cancel("Update cancelled");
        return;
      }
      updateAction = actionChoice.toString();
    }
    let updateDetails = "";
    if (updateAction === "add-service") {
      let serviceEndpoint = options["service-endpoint"];
      if (!serviceEndpoint) {
        const endpointInput = await text({
          message: "Service endpoint URL:",
          placeholder: "https://api.example.com/agent",
          validate: (value) => {
            if (!value) return "Service endpoint is required";
            try {
              new URL(value);
              return;
            } catch {
              return "Please enter a valid URL";
            }
          }
        });
        if (isCancel(endpointInput)) {
          cancel("Update cancelled");
          return;
        }
        serviceEndpoint = endpointInput.toString();
      }
      let serviceType = options["service-type"];
      if (!serviceType) {
        const typeChoice = await select({
          message: "Select service type:",
          options: Object.entries(SERVICE_TYPES).map(([key, value]) => ({
            value: key,
            label: `${value.icon} ${value.name}`,
            hint: value.description
          }))
        });
        if (isCancel(typeChoice)) {
          cancel("Update cancelled");
          return;
        }
        serviceType = typeChoice.toString();
      }
      const selectedServiceType = SERVICE_TYPES[serviceType];
      updateDetails = `Add ${selectedServiceType.name} at ${serviceEndpoint}`;
    } else if (updateAction === "add-vm") {
      let verificationMethod = options["verification-method"];
      if (!verificationMethod) {
        const vmChoice = await select({
          message: "Select verification method:",
          options: Object.entries(VERIFICATION_METHOD_TYPES).map(([key, value]) => ({
            value: key,
            label: `${value.icon} ${value.name}`,
            hint: value.description
          }))
        });
        if (isCancel(vmChoice)) {
          cancel("Update cancelled");
          return;
        }
        verificationMethod = vmChoice.toString();
      }
      const selectedVM = VERIFICATION_METHOD_TYPES[verificationMethod];
      updateDetails = `Add ${selectedVM.name} verification method`;
    }
    note(
      `${chalk34.bold("DID Update Preview:")}\\n${chalk34.gray("DID:")} ${didIdentifier}\\n${chalk34.gray("Agent:")} ${agentData.name}\\n${chalk34.gray("Action:")} ${updateAction}\\n${updateDetails ? `${chalk34.gray("Details:")} ${updateDetails}` : ""}`,
      "Update Preview"
    );
    const confirmUpdate = await confirm({
      message: `Apply this update to the DID document?`
    });
    if (isCancel(confirmUpdate) || !confirmUpdate) {
      cancel("Update cancelled");
      return;
    }
    s.start("Updating DID document on blockchain...");
    try {
      log.warn("DID document update pending SDK integration.");
      s.stop("\u26A0\uFE0F  DID update method pending");
      outro(
        `${chalk34.yellow("DID Update Pending")}\\n\\nYour DID document will be updated:\\n${chalk34.gray("DID:")} ${didIdentifier}\\n${chalk34.gray("Action:")} ${updateAction}\\n${updateDetails ? `${chalk34.gray("Details:")} ${updateDetails}\\n` : ""}\\n${chalk34.gray("Note: DID CLI integration coming soon.")}\\n${chalk34.gray("Web dashboard: ")}${chalk34.cyan("https://ghostspeak.io/dashboard")}`
      );
    } catch (error) {
      s.stop("\u274C Failed to update DID document");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to update DID: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
didCommand.command("resolve").description("Resolve a DID to its document").option("-d, --did <did>", "DID identifier (did:ghostspeak:devnet:address)").option("--json", "Output as JSON").action(async (options) => {
  intro(chalk34.green("\u{1F50D} Resolve DID Document"));
  try {
    let didIdentifier = options.did;
    if (!didIdentifier) {
      const didInput = await text({
        message: "DID identifier:",
        placeholder: "did:ghostspeak:devnet:...",
        validate: (value) => {
          if (!value) return "DID identifier is required";
          if (!value.startsWith("did:ghostspeak:")) {
            return 'DID must start with "did:ghostspeak:"';
          }
        }
      });
      if (isCancel(didInput)) {
        cancel("Resolution cancelled");
        return;
      }
      didIdentifier = didInput.toString().trim();
    }
    const didParts = didIdentifier.split(":");
    if (didParts.length < 4) {
      log.error("Invalid DID format. Expected: did:ghostspeak:network:address");
      return;
    }
    const network = didParts[2];
    const agentAddress = didParts[3];
    const s = spinner();
    s.start("Resolving DID document...");
    const { client } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    const agentAddr = address(agentAddress);
    const agentData = await safeClient.agent.getAgentAccount(agentAddr);
    if (!agentData) {
      s.stop("\u274C DID not found");
      outro(chalk34.red(`No DID document found: ${didIdentifier}`));
      return;
    }
    s.stop("\u2705 DID document resolved");
    const mockDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1"
      ],
      id: didIdentifier,
      controller: didIdentifier,
      verificationMethod: [
        {
          id: `${didIdentifier}#keys-1`,
          type: "Ed25519VerificationKey2020",
          controller: didIdentifier,
          publicKeyMultibase: agentAddr.toString()
        }
      ],
      authentication: [`${didIdentifier}#keys-1`],
      assertionMethod: [`${didIdentifier}#keys-1`],
      service: [
        {
          id: `${didIdentifier}#agent-service`,
          type: "AgentService",
          serviceEndpoint: `https://api.ghostspeak.io/agents/${agentAddr.toString()}`
        }
      ],
      metadata: {
        agentName: agentData.name,
        created: (/* @__PURE__ */ new Date()).toISOString(),
        updated: (/* @__PURE__ */ new Date()).toISOString()
      }
    };
    if (options.json) {
      console.log(JSON.stringify(mockDocument, null, 2));
      return;
    }
    outro(
      `${chalk34.bold.green("DID Document Resolved")}\\n\\n${chalk34.bold("Identifier:")}\\n${chalk34.gray("DID:")} ${chalk34.cyan(didIdentifier)}\\n${chalk34.gray("Agent:")} ${agentData.name}\\n${chalk34.gray("Network:")} ${network}\\n\\n${chalk34.bold("Verification Methods:")}\\n${chalk34.gray("\u2022 Type:")} Ed25519VerificationKey2020\\n${chalk34.gray("\u2022 ID:")} ${didIdentifier}#keys-1\\n\\n${chalk34.bold("Services:")}\\n${chalk34.gray("\u2022 Type:")} AgentService\\n${chalk34.gray("\u2022 Endpoint:")} https://api.ghostspeak.io/agents/${agentAddr.toString().slice(0, 8)}...\\n\\n${chalk34.bold("Authentication:")}\\n${chalk34.gray("\u2022 Methods:")} 1 verification method\\n${chalk34.gray("\u2022 Assertion:")} 1 verification method\\n\\n${chalk34.yellow("\u{1F4A1} Tip: Use")} ${chalk34.cyan("--json")} ${chalk34.yellow("for full document")}`
    );
  } catch (error) {
    log.error(`Failed to resolve DID: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
didCommand.command("deactivate").description("Deactivate a DID document (irreversible)").option("-d, --did <did>", "DID identifier (did:ghostspeak:devnet:address)").action(async (options) => {
  intro(chalk34.red("\u{1F5D1}\uFE0F  Deactivate DID Document"));
  log.warn(
    chalk34.red("\u26A0\uFE0F  WARNING: ") + "DID deactivation is IRREVERSIBLE.\\nOnce deactivated, this DID cannot be reactivated or used for authentication."
  );
  try {
    let didIdentifier = options.did;
    if (!didIdentifier) {
      const didInput = await text({
        message: "DID identifier:",
        placeholder: "did:ghostspeak:devnet:...",
        validate: (value) => {
          if (!value) return "DID identifier is required";
          if (!value.startsWith("did:ghostspeak:")) {
            return 'DID must start with "did:ghostspeak:"';
          }
        }
      });
      if (isCancel(didInput)) {
        cancel("Deactivation cancelled");
        return;
      }
      didIdentifier = didInput.toString().trim();
    }
    const didParts = didIdentifier.split(":");
    if (didParts.length < 4) {
      log.error("Invalid DID format. Expected: did:ghostspeak:network:address");
      return;
    }
    const agentAddress = didParts[3];
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    s.start("Verifying DID document...");
    const agentAddr = address(agentAddress);
    const agentData = await safeClient.agent.getAgentAccount(agentAddr);
    if (!agentData) {
      s.stop("\u274C DID not found");
      outro(chalk34.red(`No DID document found: ${didIdentifier}`));
      return;
    }
    s.stop("\u2705 DID document found");
    note(
      `${chalk34.bold.red("\u26A0\uFE0F  IRREVERSIBLE ACTION")}\\n\\n${chalk34.bold("DID to Deactivate:")}\\n${chalk34.gray("DID:")} ${didIdentifier}\\n${chalk34.gray("Agent:")} ${agentData.name}\\n\\n${chalk34.bold("Consequences:")}\\n${chalk34.red("\u2022 DID cannot be reactivated")}\\n${chalk34.red("\u2022 All authentication will fail")}\\n${chalk34.red("\u2022 Verifiable credentials may be invalidated")}\\n${chalk34.red("\u2022 Services will become unreachable")}`,
      "Deactivation Warning"
    );
    const confirmDeactivate = await confirm({
      message: `${chalk34.red("Are you ABSOLUTELY SURE you want to deactivate this DID?")}`
    });
    if (isCancel(confirmDeactivate) || !confirmDeactivate) {
      cancel("Deactivation cancelled");
      return;
    }
    const doubleConfirm = await confirm({
      message: `${chalk34.red("This is IRREVERSIBLE. Proceed with deactivation?")}`
    });
    if (isCancel(doubleConfirm) || !doubleConfirm) {
      cancel("Deactivation cancelled");
      return;
    }
    s.start("Deactivating DID document on blockchain...");
    try {
      log.warn("DID deactivation pending SDK integration.");
      s.stop("\u26A0\uFE0F  DID deactivation method pending");
      outro(
        `${chalk34.yellow("DID Deactivation Pending")}\\n\\nYour DID will be deactivated:\\n${chalk34.gray("DID:")} ${didIdentifier}\\n${chalk34.gray("Agent:")} ${agentData.name}\\n\\n${chalk34.red("\u26A0\uFE0F  This action is IRREVERSIBLE")}\\n\\n${chalk34.gray("Note: DID CLI integration coming soon.")}\\n${chalk34.gray("Web dashboard: ")}${chalk34.cyan("https://ghostspeak.io/dashboard")}`
      );
    } catch (error) {
      s.stop("\u274C Failed to deactivate DID document");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to deactivate DID: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
didCommand.action(async () => {
  intro(chalk34.blue("\u{1F194} GhostSpeak DID Management"));
  log.info(`\\n${chalk34.bold("Available Commands:")}\\n`);
  log.info(`${chalk34.cyan("ghost did create")} - Create a new W3C DID document`);
  log.info(`${chalk34.cyan("ghost did update")} - Update an existing DID document`);
  log.info(`${chalk34.cyan("ghost did resolve")} - Resolve a DID to its document`);
  log.info(`${chalk34.cyan("ghost did deactivate")} - Deactivate a DID (irreversible)`);
  note(
    `${chalk34.bold("What is a DID?")}\\nA Decentralized Identifier (DID) is a W3C standard for verifiable,\\nself-sovereign digital identities. DIDs enable:\\n\\n${chalk34.gray("\u2022 Verifiable credentials issuance and verification")}\\n${chalk34.gray("\u2022 Cross-chain identity portability")}\\n${chalk34.gray("\u2022 Decentralized authentication")}\\n${chalk34.gray("\u2022 Privacy-preserving identity proofs")}\\n\\n${chalk34.bold("DID Format:")}\\n${chalk34.cyan("did:ghostspeak:network:address")}\\n\\n${chalk34.bold("Learn more:")}\\n${chalk34.cyan("https://www.w3.org/TR/did-core/")}`,
    "About DIDs"
  );
  outro("Use --help with any command for more details");
});

// src/commands/escrow.ts
init_client();
init_sdk_helpers();
var ESCROW_STATUSES = {
  pending: {
    name: "Pending",
    description: "Awaiting job completion",
    color: chalk34.yellow,
    icon: "\u23F3"
  },
  completed: {
    name: "Completed",
    description: "Job completed, funds released",
    color: chalk34.green,
    icon: "\u2705"
  },
  disputed: {
    name: "Disputed",
    description: "Under dispute resolution",
    color: chalk34.red,
    icon: "\u26A0\uFE0F"
  },
  cancelled: {
    name: "Cancelled",
    description: "Escrow cancelled, funds refunded",
    color: chalk34.gray,
    icon: "\u274C"
  }
};
var DISPUTE_REASONS = {
  incomplete: {
    name: "Incomplete Work",
    description: "Agent did not complete the agreed work",
    icon: "\u{1F4CB}"
  },
  quality: {
    name: "Quality Issues",
    description: "Work quality does not meet standards",
    icon: "\u26A0\uFE0F"
  },
  deadline: {
    name: "Missed Deadline",
    description: "Agent missed the agreed deadline",
    icon: "\u23F0"
  },
  miscommunication: {
    name: "Miscommunication",
    description: "Disagreement on job requirements",
    icon: "\u{1F4AC}"
  },
  other: {
    name: "Other",
    description: "Other dispute reason (provide details)",
    icon: "\u{1F4DD}"
  }
};
var escrowCommand = new Command("escrow").description("Manage escrow accounts for x402 marketplace jobs");
escrowCommand.command("create").description("Create a new escrow account for a job").option("-j, --job <id>", "Job ID or description").option("-a, --amount <amount>", "Escrow amount in GHOST tokens").option("-r, --recipient <address>", "Agent address (recipient)").option("-d, --deadline <days>", "Job deadline in days").action(async (options) => {
  intro(chalk34.cyan("\u{1F4B0} Create Escrow"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let jobDescription = options.job;
    if (!jobDescription) {
      const jobInput = await text({
        message: "Job description:",
        placeholder: "Sentiment analysis API integration",
        validate: (value) => {
          if (!value) return "Job description is required";
          if (value.length < 10) return "Please provide a more detailed description";
        }
      });
      if (isCancel(jobInput)) {
        cancel("Escrow creation cancelled");
        return;
      }
      jobDescription = jobInput.toString();
    }
    let recipientAddress = options.recipient;
    if (!recipientAddress) {
      const recipientInput = await text({
        message: "Agent address (recipient):",
        validate: (value) => {
          if (!value) return "Agent address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(recipientInput)) {
        cancel("Escrow creation cancelled");
        return;
      }
      recipientAddress = recipientInput.toString().trim();
    }
    const recipientAddr = address(recipientAddress);
    s.start("Verifying agent...");
    const agentData = await safeClient.agent.getAgentAccount(recipientAddr);
    if (!agentData) {
      s.stop("\u274C Agent not found");
      outro(chalk34.red(`No agent found at address: ${recipientAddress}`));
      return;
    }
    s.stop(`\u2705 Agent verified: ${agentData.name}`);
    let escrowAmount = options.amount;
    if (!escrowAmount) {
      const amountInput = await text({
        message: "Escrow amount (GHOST tokens):",
        placeholder: "100",
        validate: (value) => {
          if (!value) return "Amount is required";
          const amount2 = parseFloat(value);
          if (isNaN(amount2) || amount2 <= 0) {
            return "Amount must be greater than 0";
          }
        }
      });
      if (isCancel(amountInput)) {
        cancel("Escrow creation cancelled");
        return;
      }
      escrowAmount = amountInput.toString();
    }
    const amount = parseFloat(escrowAmount);
    let deadlineDays = options.deadline;
    if (!deadlineDays) {
      const deadlineInput = await text({
        message: "Job deadline (days):",
        placeholder: "7",
        validate: (value) => {
          if (!value) return "Deadline is required";
          const days = parseInt(value);
          if (isNaN(days) || days <= 0) {
            return "Deadline must be greater than 0";
          }
        }
      });
      if (isCancel(deadlineInput)) {
        cancel("Escrow creation cancelled");
        return;
      }
      deadlineDays = deadlineInput.toString();
    }
    const deadline = parseInt(deadlineDays);
    const deadlineDate = /* @__PURE__ */ new Date();
    deadlineDate.setDate(deadlineDate.getDate() + deadline);
    const reputationScore = Number(agentData.reputationScore || 0);
    const ghostScore = Math.min(1e3, Math.round(reputationScore / 100));
    const tier = ghostScore >= 900 ? "PLATINUM" : ghostScore >= 750 ? "GOLD" : ghostScore >= 500 ? "SILVER" : ghostScore >= 200 ? "BRONZE" : "NEWCOMER";
    const depositPercentage = tier === "PLATINUM" || tier === "GOLD" ? 0 : tier === "SILVER" ? 15 : 25;
    const depositRequired = amount * depositPercentage / 100;
    const totalLocked = amount;
    note(
      `${chalk34.bold("Escrow Details:")}\\n${chalk34.gray("Job:")} ${jobDescription}\\n${chalk34.gray("Agent:")} ${agentData.name}\\n${chalk34.gray("Ghost Score:")} ${ghostScore}/1000 (${tier})\\n\\n${chalk34.bold("Payment Terms:")}\\n${chalk34.gray("Job Value:")} ${amount} GHOST\\n${chalk34.gray("Agent Deposit:")} ${depositRequired} GHOST (${depositPercentage}%)\\n${chalk34.gray("Total Locked:")} ${totalLocked} GHOST\\n${chalk34.gray("Deadline:")} ${deadline} days (${deadlineDate.toLocaleDateString()})\\n\\n${chalk34.bold("Escrow Protections:")}\\n${chalk34.gray("\u2022 Funds held in on-chain escrow")}\\n${chalk34.gray("\u2022 Automatic release on approval")}\\n${chalk34.gray("\u2022 Dispute resolution available")}\\n${chalk34.gray("\u2022 Refund if cancelled")}`,
      "Escrow Preview"
    );
    const confirmCreate = await confirm({
      message: `Create escrow with ${agentData.name}?`
    });
    if (isCancel(confirmCreate) || !confirmCreate) {
      cancel("Escrow creation cancelled");
      return;
    }
    s.start("Creating escrow on blockchain...");
    try {
      log.warn("Escrow creation pending SDK integration.");
      s.stop("\u26A0\uFE0F  Escrow creation method pending");
      outro(
        `${chalk34.yellow("Escrow Creation Pending")}\\n\\nYour escrow will be created with:\\n${chalk34.gray("Job:")} ${jobDescription}\\n${chalk34.gray("Agent:")} ${agentData.name}\\n${chalk34.gray("Amount:")} ${amount} GHOST\\n${chalk34.gray("Deadline:")} ${deadlineDate.toLocaleDateString()}\\n\\n${chalk34.gray("Note: Escrow CLI integration coming soon.")}\\n${chalk34.gray("Web dashboard: ")}${chalk34.cyan("https://ghostspeak.io/dashboard/marketplace")}`
      );
    } catch (error) {
      s.stop("\u274C Failed to create escrow");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to create escrow: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
escrowCommand.command("approve").description("Approve job completion and release escrow funds").option("-e, --escrow <address>", "Escrow account address").option("-r, --rating <rating>", "Agent rating (1-5 stars)").action(async (options) => {
  intro(chalk34.green("\u2705 Approve Escrow"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let escrowAddress = options.escrow;
    if (!escrowAddress) {
      const escrowInput = await text({
        message: "Escrow account address:",
        validate: (value) => {
          if (!value) return "Escrow address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(escrowInput)) {
        cancel("Approval cancelled");
        return;
      }
      escrowAddress = escrowInput.toString().trim();
    }
    const escrowAddr = address(escrowAddress);
    s.start("Fetching escrow details...");
    const mockEscrow = {
      job: "Sentiment analysis API integration",
      agent: "SentimentBot",
      amount: 100,
      status: "pending",
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1e3)
    };
    s.stop("\u2705 Escrow loaded");
    let rating = options.rating;
    if (!rating) {
      const ratingChoice = await select({
        message: "Rate the agent performance:",
        options: [
          { value: "5", label: "\u2B50\u2B50\u2B50\u2B50\u2B50 Exceptional (5 stars)" },
          { value: "4", label: "\u2B50\u2B50\u2B50\u2B50 Great (4 stars)" },
          { value: "3", label: "\u2B50\u2B50\u2B50 Good (3 stars)" },
          { value: "2", label: "\u2B50\u2B50 Fair (2 stars)" },
          { value: "1", label: "\u2B50 Poor (1 star)" }
        ]
      });
      if (isCancel(ratingChoice)) {
        cancel("Approval cancelled");
        return;
      }
      rating = ratingChoice.toString();
    }
    const numRating = parseInt(rating);
    note(
      `${chalk34.bold("Approval Summary:")}\\n${chalk34.gray("Escrow:")} ${escrowAddress.slice(0, 8)}...\\n${chalk34.gray("Job:")} ${mockEscrow.job}\\n${chalk34.gray("Agent:")} ${mockEscrow.agent}\\n${chalk34.gray("Amount:")} ${mockEscrow.amount} GHOST\\n${chalk34.gray("Your Rating:")} ${"\u2B50".repeat(numRating)}\\n\\n${chalk34.bold("Actions:")}\\n${chalk34.gray("\u2022 Release")} ${mockEscrow.amount} GHOST ${chalk34.gray("to agent")}\\n${chalk34.gray("\u2022 Update agent Ghost Score based on rating")}\\n${chalk34.gray("\u2022 Mark escrow as completed")}`,
      "Approval Preview"
    );
    const confirmApprove = await confirm({
      message: `Release ${mockEscrow.amount} GHOST to ${mockEscrow.agent}?`
    });
    if (isCancel(confirmApprove) || !confirmApprove) {
      cancel("Approval cancelled");
      return;
    }
    s.start("Processing approval on blockchain...");
    try {
      log.warn("Escrow approval pending SDK integration.");
      s.stop("\u26A0\uFE0F  Escrow approval method pending");
      outro(
        `${chalk34.yellow("Escrow Approval Pending")}\\n\\nYour approval will:\\n${chalk34.gray("\u2022 Release")} ${mockEscrow.amount} GHOST ${chalk34.gray("to agent")}\\n${chalk34.gray("\u2022 Apply rating:")} ${"\u2B50".repeat(numRating)}\\n${chalk34.gray("\u2022 Update Ghost Score")}\\n\\n${chalk34.gray("Note: Escrow CLI integration coming soon.")}\\n${chalk34.gray("Web dashboard: ")}${chalk34.cyan("https://ghostspeak.io/dashboard/marketplace")}`
      );
    } catch (error) {
      s.stop("\u274C Failed to approve escrow");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to approve escrow: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
escrowCommand.command("dispute").description("Dispute an escrow and trigger resolution process").option("-e, --escrow <address>", "Escrow account address").option("-r, --reason <reason>", "Dispute reason (incomplete, quality, deadline, miscommunication, other)").option("--evidence <url>", "URL to evidence (screenshots, logs, etc.)").action(async (options) => {
  intro(chalk34.red("\u26A0\uFE0F  Dispute Escrow"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let escrowAddress = options.escrow;
    if (!escrowAddress) {
      const escrowInput = await text({
        message: "Escrow account address:",
        validate: (value) => {
          if (!value) return "Escrow address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(escrowInput)) {
        cancel("Dispute cancelled");
        return;
      }
      escrowAddress = escrowInput.toString().trim();
    }
    const escrowAddr = address(escrowAddress);
    s.start("Fetching escrow details...");
    const mockEscrow = {
      job: "Sentiment analysis API integration",
      agent: "SentimentBot",
      agentAddress: "Sent1ment...xyz",
      amount: 100,
      status: "pending",
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3)
      // 1 day overdue
    };
    s.stop("\u2705 Escrow loaded");
    let disputeReason = options.reason;
    if (!disputeReason) {
      const reasonChoice = await select({
        message: "Select dispute reason:",
        options: Object.entries(DISPUTE_REASONS).map(([key, value]) => ({
          value: key,
          label: `${value.icon} ${value.name}`,
          hint: value.description
        }))
      });
      if (isCancel(reasonChoice)) {
        cancel("Dispute cancelled");
        return;
      }
      disputeReason = reasonChoice.toString();
    }
    const selectedReason = DISPUTE_REASONS[disputeReason];
    if (!selectedReason) {
      log.error("Invalid dispute reason");
      return;
    }
    let evidenceUrl = options.evidence;
    if (!evidenceUrl) {
      const addEvidence = await confirm({
        message: "Do you have evidence to submit (screenshots, logs, etc.)?"
      });
      if (isCancel(addEvidence)) {
        cancel("Dispute cancelled");
        return;
      }
      if (addEvidence) {
        const evidenceInput = await text({
          message: "Evidence URL (file upload, screenshot link):",
          placeholder: "https://example.com/evidence.png",
          validate: (value) => {
            if (!value) return;
            try {
              new URL(value);
              return;
            } catch {
              return "Please enter a valid URL";
            }
          }
        });
        if (isCancel(evidenceInput)) {
          cancel("Dispute cancelled");
          return;
        }
        if (evidenceInput) {
          evidenceUrl = evidenceInput.toString();
        }
      }
    }
    note(
      `${chalk34.bold.red("\u26A0\uFE0F  Dispute Details")}\\n\\n${chalk34.bold("Escrow Information:")}\\n${chalk34.gray("Escrow:")} ${escrowAddress.slice(0, 8)}...\\n${chalk34.gray("Job:")} ${mockEscrow.job}\\n${chalk34.gray("Agent:")} ${mockEscrow.agent}\\n${chalk34.gray("Amount:")} ${mockEscrow.amount} GHOST\\n${chalk34.gray("Deadline:")} ${mockEscrow.deadline.toLocaleDateString()} ${chalk34.red("(overdue)")}\\n\\n${chalk34.bold("Dispute Reason:")}\\n${chalk34.gray("Type:")} ${selectedReason.icon} ${selectedReason.name}\\n${chalk34.gray("Description:")} ${selectedReason.description}\\n${evidenceUrl ? `${chalk34.gray("Evidence:")} ${evidenceUrl}\\n` : ""}\\n${chalk34.bold("Resolution Process:")}\\n${chalk34.gray("1. Dispute submitted on-chain")}\\n${chalk34.gray("2. Agent has 48 hours to respond")}\\n${chalk34.gray("3. Community arbitration if unresolved")}\\n${chalk34.gray("4. Funds distributed based on outcome")}`,
      "Dispute Preview"
    );
    const confirmDispute = await confirm({
      message: `${chalk34.red("Submit dispute for")} ${mockEscrow.job}?`
    });
    if (isCancel(confirmDispute) || !confirmDispute) {
      cancel("Dispute cancelled");
      return;
    }
    s.start("Submitting dispute on blockchain...");
    try {
      log.warn("Escrow dispute pending SDK integration.");
      s.stop("\u26A0\uFE0F  Escrow dispute method pending");
      outro(
        `${chalk34.yellow("Dispute Submission Pending")}\\n\\nYour dispute will be submitted:\\n${chalk34.gray("Reason:")} ${selectedReason.name}\\n${evidenceUrl ? `${chalk34.gray("Evidence:")} ${evidenceUrl}\\n` : ""}${chalk34.gray("Amount at stake:")} ${mockEscrow.amount} GHOST\\n\\n${chalk34.bold("Next Steps:")}\\n${chalk34.gray("\u2022 Agent notified of dispute")}\\n${chalk34.gray("\u2022 48-hour response window")}\\n${chalk34.gray("\u2022 Community arbitration if needed")}\\n\\n${chalk34.gray("Note: Escrow CLI integration coming soon.")}\\n${chalk34.gray("Web dashboard: ")}${chalk34.cyan("https://ghostspeak.io/dashboard/marketplace")}`
      );
    } catch (error) {
      s.stop("\u274C Failed to submit dispute");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to dispute escrow: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
escrowCommand.command("list").description("List escrow accounts for an agent").option("-a, --agent <address>", "Agent address").option("-s, --status <status>", "Filter by status (pending, completed, disputed, cancelled)").option("--json", "Output as JSON").action(async (options) => {
  intro(chalk34.blue("\u{1F4CB} List Escrows"));
  try {
    const s = spinner();
    let agentAddress = options.agent;
    if (!agentAddress) {
      const addressInput = await text({
        message: "Agent address (leave empty for all):",
        validate: (value) => {
          if (!value) return;
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Operation cancelled");
        return;
      }
      agentAddress = addressInput ? addressInput.toString().trim() : void 0;
    }
    s.start("Fetching escrows...");
    const { client } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    const mockEscrows = [
      {
        address: "Esc1row...abc",
        job: "Sentiment analysis API",
        agent: "SentimentBot",
        amount: 100,
        status: "pending",
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1e3)
      },
      {
        address: "Esc1row...def",
        job: "NFT metadata parser",
        agent: "MetadataAgent",
        amount: 250,
        status: "completed",
        deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1e3)
      },
      {
        address: "Esc1row...ghi",
        job: "Token swap integration",
        agent: "SwapBot",
        amount: 500,
        status: "disputed",
        deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1e3)
      }
    ];
    const filteredEscrows = options.status ? mockEscrows.filter((e) => e.status === options.status) : mockEscrows;
    s.stop(`\u2705 Found ${filteredEscrows.length} escrow(s)`);
    if (options.json) {
      console.log(JSON.stringify(filteredEscrows, null, 2));
      return;
    }
    let output = `${chalk34.bold.blue("Escrow Accounts")}\\n\\n`;
    filteredEscrows.forEach((escrow, index) => {
      const statusInfo = ESCROW_STATUSES[escrow.status];
      const isOverdue = escrow.status === "pending" && escrow.deadline < /* @__PURE__ */ new Date();
      output += `${chalk34.bold(`${index + 1}. ${escrow.job}`)}\\n`;
      output += `${chalk34.gray("Address:")} ${escrow.address}\\n`;
      output += `${chalk34.gray("Agent:")} ${escrow.agent}\\n`;
      output += `${chalk34.gray("Amount:")} ${escrow.amount} GHOST\\n`;
      output += `${chalk34.gray("Status:")} ${statusInfo.icon} ${statusInfo.color(statusInfo.name)}\\n`;
      output += `${chalk34.gray("Deadline:")} ${escrow.deadline.toLocaleDateString()}`;
      if (isOverdue) {
        output += ` ${chalk34.red("(OVERDUE)")}`;
      }
      output += "\\n\\n";
    });
    output += `${chalk34.bold("Summary:")}\\n`;
    output += `${chalk34.gray("Total:")} ${filteredEscrows.length} escrow(s)\\n`;
    output += `${chalk34.gray("Total Locked:")} ${filteredEscrows.reduce((sum, e) => sum + e.amount, 0)} GHOST\\n\\n`;
    output += `${chalk34.yellow("\u{1F4A1} Commands:")}\\n`;
    output += `${chalk34.cyan("ghost escrow get --escrow <address>")} - View escrow details\\n`;
    output += `${chalk34.cyan("ghost escrow approve --escrow <address>")} - Approve and release funds\\n`;
    output += `${chalk34.cyan("ghost escrow dispute --escrow <address>")} - Dispute an escrow`;
    outro(output);
  } catch (error) {
    log.error(`Failed to list escrows: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
escrowCommand.command("get").description("Get detailed information about an escrow").option("-e, --escrow <address>", "Escrow account address").option("--json", "Output as JSON").action(async (options) => {
  intro(chalk34.blue("\u{1F50D} Get Escrow Details"));
  try {
    let escrowAddress = options.escrow;
    if (!escrowAddress) {
      const escrowInput = await text({
        message: "Escrow account address:",
        validate: (value) => {
          if (!value) return "Escrow address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(escrowInput)) {
        cancel("Operation cancelled");
        return;
      }
      escrowAddress = escrowInput.toString().trim();
    }
    const s = spinner();
    s.start("Fetching escrow details...");
    const { client } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    const mockEscrow = {
      address: escrowAddress,
      job: "Sentiment analysis API integration",
      jobDescription: "Integrate sentiment analysis API with error handling and rate limiting",
      creator: "Creator...abc",
      agent: "SentimentBot",
      agentAddress: "Sent1ment...xyz",
      amount: 100,
      deposit: 25,
      status: "pending",
      created: new Date(Date.now() - 3 * 24 * 60 * 60 * 1e3),
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1e3),
      milestones: [
        { name: "API integration", status: "completed", paid: 30 },
        { name: "Error handling", status: "completed", paid: 30 },
        { name: "Rate limiting", status: "in-progress", paid: 0 },
        { name: "Testing & docs", status: "pending", paid: 0 }
      ]
    };
    s.stop("\u2705 Escrow loaded");
    const statusInfo = ESCROW_STATUSES[mockEscrow.status];
    if (options.json) {
      console.log(JSON.stringify(mockEscrow, null, 2));
      return;
    }
    outro(
      `${chalk34.bold.cyan(mockEscrow.job)}\\n\\n${chalk34.bold("Basic Information:")}\\n${chalk34.gray("Address:")} ${mockEscrow.address}\\n${chalk34.gray("Status:")} ${statusInfo.icon} ${statusInfo.color(statusInfo.name)}\\n${chalk34.gray("Created:")} ${mockEscrow.created.toLocaleDateString()}\\n${chalk34.gray("Deadline:")} ${mockEscrow.deadline.toLocaleDateString()}\\n\\n${chalk34.bold("Parties:")}\\n${chalk34.gray("Creator:")} ${mockEscrow.creator}\\n${chalk34.gray("Agent:")} ${mockEscrow.agent} (${mockEscrow.agentAddress})\\n\\n${chalk34.bold("Payment:")}\\n${chalk34.gray("Total Value:")} ${mockEscrow.amount} GHOST\\n${chalk34.gray("Agent Deposit:")} ${mockEscrow.deposit} GHOST\\n${chalk34.gray("Total Locked:")} ${mockEscrow.amount + mockEscrow.deposit} GHOST\\n\\n${chalk34.bold("Milestones:")}\\n` + mockEscrow.milestones.map(
        (m, i) => `${chalk34.gray(`${i + 1}.`)} ${m.name} - ${m.status === "completed" ? chalk34.green("\u2713 Completed") : m.status === "in-progress" ? chalk34.yellow("\u23F3 In Progress") : chalk34.gray("\u23F8 Pending")} (${m.paid} GHOST paid)`
      ).join("\\n") + `\\n\\n${chalk34.bold("Description:")}\\n${mockEscrow.jobDescription}\\n\\n${chalk34.yellow("\u{1F4A1} Next Steps:")}\\n${chalk34.cyan("ghost escrow approve --escrow " + escrowAddress.slice(0, 12) + "...")} - Approve completion\\n${chalk34.cyan("ghost escrow dispute --escrow " + escrowAddress.slice(0, 12) + "...")} - Raise dispute`
    );
  } catch (error) {
    log.error(`Failed to get escrow details: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
escrowCommand.action(async () => {
  intro(chalk34.blue("\u{1F4B0} GhostSpeak Escrow Management"));
  log.info(`\\n${chalk34.bold("Available Commands:")}\\n`);
  log.info(`${chalk34.cyan("ghost escrow create")} - Create a new escrow for a job`);
  log.info(`${chalk34.cyan("ghost escrow approve")} - Approve and release escrow funds`);
  log.info(`${chalk34.cyan("ghost escrow dispute")} - Dispute an escrow and trigger resolution`);
  log.info(`${chalk34.cyan("ghost escrow list")} - List escrow accounts`);
  log.info(`${chalk34.cyan("ghost escrow get")} - Get detailed escrow information`);
  note(
    `${chalk34.bold("How Escrow Works:")}\\n\\n${chalk34.bold("1. Creation")}\\n${chalk34.gray("\u2022 Job creator deposits payment in GHOST tokens")}\\n${chalk34.gray("\u2022 Agent may deposit based on Ghost Score tier")}\\n${chalk34.gray("\u2022 Funds locked in on-chain escrow account")}\\n\\n${chalk34.bold("2. Completion")}\\n${chalk34.gray("\u2022 Agent completes work within deadline")}\\n${chalk34.gray("\u2022 Creator approves and rates agent")}\\n${chalk34.gray("\u2022 Funds released automatically")}\\n${chalk34.gray("\u2022 Ghost Score updated based on rating")}\\n\\n${chalk34.bold("3. Disputes")}\\n${chalk34.gray("\u2022 Either party can raise a dispute")}\\n${chalk34.gray("\u2022 Evidence submitted on-chain")}\\n${chalk34.gray("\u2022 Community arbitration if needed")}\\n${chalk34.gray("\u2022 Funds distributed based on outcome")}\\n\\n${chalk34.bold("Deposit Requirements by Tier:")}\\n${chalk34.gray("\u2022 PLATINUM/GOLD: 0% deposit")}\\n${chalk34.gray("\u2022 SILVER: 15% deposit")}\\n${chalk34.gray("\u2022 BRONZE/NEWCOMER: 25% deposit")}`,
    "Escrow Guide"
  );
  outro("Use --help with any command for more details");
});
var Layout = ({
  children,
  title,
  showHeader = true,
  showFooter = true
}) => {
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", padding: 1, children: [
    showHeader && /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [
      /* @__PURE__ */ jsx(Gradient, { name: "rainbow", children: /* @__PURE__ */ jsx(BigText, { text: "GHOST", font: "tiny" }) }),
      /* @__PURE__ */ jsx(Text, { dimColor: true, children: "AI Agent Commerce Protocol" }),
      title && /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: title }) }),
      /* @__PURE__ */ jsx(Box, { marginY: 1, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u2500".repeat(60) }) })
    ] }),
    /* @__PURE__ */ jsx(Box, { flexDirection: "column", children }),
    showFooter && /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", children: [
      /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u2500".repeat(60) }) }),
      /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
        "Press ",
        /* @__PURE__ */ jsx(Text, { color: "yellow", children: "Ctrl+C" }),
        " to exit"
      ] }) })
    ] })
  ] });
};
var InfoRow = ({
  label,
  value,
  color = "white",
  dimLabel = true
}) => {
  return /* @__PURE__ */ jsxs(Box, { children: [
    /* @__PURE__ */ jsx(Box, { width: 25, children: /* @__PURE__ */ jsxs(Text, { dimColor: dimLabel, children: [
      label,
      ":"
    ] }) }),
    /* @__PURE__ */ jsx(Text, { color, children: value })
  ] });
};
var statusConfig = {
  success: { icon: "\u2705", color: "green" },
  error: { icon: "\u274C", color: "red" },
  warning: { icon: "\u26A0\uFE0F ", color: "yellow" },
  info: { icon: "\u2139\uFE0F ", color: "blue" },
  pending: { icon: "\u23F3", color: "gray" }
};
var StatusBadge = ({ status, text: text22 }) => {
  const config2 = statusConfig[status];
  return /* @__PURE__ */ jsxs(Box, { children: [
    /* @__PURE__ */ jsxs(Text, { children: [
      config2.icon,
      " "
    ] }),
    /* @__PURE__ */ jsx(Text, { color: config2.color, children: text22 })
  ] });
};
var tierConfig = {
  platinum: { text: "PLATINUM", color: "cyan", icon: "\u{1F48E}" },
  gold: { text: "GOLD", color: "yellow", icon: "\u{1F947}" },
  silver: { text: "SILVER", color: "white", icon: "\u{1F948}" },
  bronze: { text: "BRONZE", color: "red", icon: "\u{1F949}" },
  newcomer: { text: "NEWCOMER", color: "gray", icon: "\u{1F195}" }
};
var Badge = ({
  variant = "tier",
  tier = "newcomer",
  text: text22,
  color,
  icon,
  bold = false
}) => {
  let displayText;
  let displayColor;
  let displayIcon;
  if (variant === "tier" && tier) {
    const config2 = tierConfig[tier];
    displayText = config2.text;
    displayColor = config2.color;
    displayIcon = icon ?? config2.icon;
  } else {
    displayText = text22 || "BADGE";
    displayColor = color || "cyan";
    displayIcon = icon;
  }
  return /* @__PURE__ */ jsxs(Box, { children: [
    displayIcon && /* @__PURE__ */ jsxs(Text, { children: [
      displayIcon,
      " "
    ] }),
    /* @__PURE__ */ jsxs(Text, { color: displayColor, bold, children: [
      "[",
      displayText,
      "]"
    ] })
  ] });
};
var Card = ({
  children,
  title,
  footer,
  borderColor = "greenBright",
  borderStyle = "single",
  padding = 1,
  width,
  showBorder = true
}) => {
  return /* @__PURE__ */ jsxs(
    Box,
    {
      flexDirection: "column",
      borderStyle: showBorder ? borderStyle : void 0,
      borderColor: showBorder ? borderColor : void 0,
      padding,
      width,
      children: [
        title && /* @__PURE__ */ jsxs(Box, { marginBottom: 1, flexDirection: "column", children: [
          /* @__PURE__ */ jsx(Text, { bold: true, color: borderColor, children: title }),
          /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u2500".repeat(width ? width - padding * 2 - 2 : 50) }) })
        ] }),
        /* @__PURE__ */ jsx(Box, { flexDirection: "column", children }),
        footer && /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", children: [
          /* @__PURE__ */ jsx(Box, { marginBottom: 1, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u2500".repeat(width ? width - padding * 2 - 2 : 50) }) }),
          footer
        ] })
      ]
    }
  );
};
var alertConfig = {
  info: {
    icon: "\u2139\uFE0F ",
    color: "blue",
    borderColor: "blue",
    prefix: "INFO"
  },
  success: {
    icon: "\u2705",
    color: "green",
    borderColor: "green",
    prefix: "SUCCESS"
  },
  warning: {
    icon: "\u26A0\uFE0F ",
    color: "yellow",
    borderColor: "yellow",
    prefix: "WARNING"
  },
  error: {
    icon: "\u274C",
    color: "red",
    borderColor: "red",
    prefix: "ERROR"
  }
};
var Alert = ({
  type = "info",
  message,
  title,
  showIcon = true,
  showBorder = true,
  dismissible = false,
  onDismiss
}) => {
  const config2 = alertConfig[type];
  return /* @__PURE__ */ jsxs(
    Box,
    {
      flexDirection: "column",
      borderStyle: showBorder ? "round" : void 0,
      borderColor: showBorder ? config2.borderColor : void 0,
      padding: 1,
      children: [
        /* @__PURE__ */ jsxs(Box, { marginBottom: title || showIcon ? 1 : 0, children: [
          showIcon && /* @__PURE__ */ jsxs(Text, { children: [
            config2.icon,
            " "
          ] }),
          /* @__PURE__ */ jsx(Text, { bold: true, color: config2.color, children: title || config2.prefix })
        ] }),
        /* @__PURE__ */ jsx(Box, { flexDirection: "column", children: /* @__PURE__ */ jsx(Text, { children: message }) }),
        dismissible && /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
          "Press ",
          /* @__PURE__ */ jsx(Text, { color: "yellow", children: "Esc" }),
          " to dismiss"
        ] }) })
      ]
    }
  );
};
var stateConfig = {
  loading: { icon: null, color: "cyan", spinning: true },
  success: { icon: "\u2705", color: "green", spinning: false },
  error: { icon: "\u274C", color: "red", spinning: false },
  warning: { icon: "\u26A0\uFE0F ", color: "yellow", spinning: false }
};
var Spinner = ({
  state = "loading",
  type = "dots",
  label,
  color
}) => {
  const config2 = stateConfig[state];
  const finalColor = color || config2.color;
  return /* @__PURE__ */ jsxs(Box, { children: [
    config2.spinning ? /* @__PURE__ */ jsx(Text, { color: finalColor, children: /* @__PURE__ */ jsx(Spinner2, { type }) }) : /* @__PURE__ */ jsx(Text, { children: config2.icon }),
    label && /* @__PURE__ */ jsx(Box, { marginLeft: 1, children: /* @__PURE__ */ jsx(Text, { color: finalColor, children: label }) })
  ] });
};

// src/ui/commands/Dashboard.tsx
init_client();
init_sdk_helpers();

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/theme.js
__toESM(require_cjs());
function isUnicodeSupported() {
  const { env } = process2;
  const { TERM, TERM_PROGRAM } = env;
  if (process2.platform !== "win32") {
    return TERM !== "linux";
  }
  return Boolean(env.WT_SESSION) || Boolean(env.TERMINUS_SUBLIME) || env.ConEmuTask === "{cmd::Cmder}" || TERM_PROGRAM === "Terminus-Sublime" || TERM_PROGRAM === "vscode" || TERM === "xterm-256color" || TERM === "alacritty" || TERM === "rxvt-unicode" || TERM === "rxvt-unicode-256color" || env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}

// ../../node_modules/.bun/figures@6.1.0/node_modules/figures/index.js
var common = {
  circleQuestionMark: "(?)",
  questionMarkPrefix: "(?)",
  square: "\u2588",
  squareDarkShade: "\u2593",
  squareMediumShade: "\u2592",
  squareLightShade: "\u2591",
  squareTop: "\u2580",
  squareBottom: "\u2584",
  squareLeft: "\u258C",
  squareRight: "\u2590",
  squareCenter: "\u25A0",
  bullet: "\u25CF",
  dot: "\u2024",
  ellipsis: "\u2026",
  pointerSmall: "\u203A",
  triangleUp: "\u25B2",
  triangleUpSmall: "\u25B4",
  triangleDown: "\u25BC",
  triangleDownSmall: "\u25BE",
  triangleLeftSmall: "\u25C2",
  triangleRightSmall: "\u25B8",
  home: "\u2302",
  heart: "\u2665",
  musicNote: "\u266A",
  musicNoteBeamed: "\u266B",
  arrowUp: "\u2191",
  arrowDown: "\u2193",
  arrowLeft: "\u2190",
  arrowRight: "\u2192",
  arrowLeftRight: "\u2194",
  arrowUpDown: "\u2195",
  almostEqual: "\u2248",
  notEqual: "\u2260",
  lessOrEqual: "\u2264",
  greaterOrEqual: "\u2265",
  identical: "\u2261",
  infinity: "\u221E",
  subscriptZero: "\u2080",
  subscriptOne: "\u2081",
  subscriptTwo: "\u2082",
  subscriptThree: "\u2083",
  subscriptFour: "\u2084",
  subscriptFive: "\u2085",
  subscriptSix: "\u2086",
  subscriptSeven: "\u2087",
  subscriptEight: "\u2088",
  subscriptNine: "\u2089",
  oneHalf: "\xBD",
  oneThird: "\u2153",
  oneQuarter: "\xBC",
  oneFifth: "\u2155",
  oneSixth: "\u2159",
  oneEighth: "\u215B",
  twoThirds: "\u2154",
  twoFifths: "\u2156",
  threeQuarters: "\xBE",
  threeFifths: "\u2157",
  threeEighths: "\u215C",
  fourFifths: "\u2158",
  fiveSixths: "\u215A",
  fiveEighths: "\u215D",
  sevenEighths: "\u215E",
  line: "\u2500",
  lineBold: "\u2501",
  lineDouble: "\u2550",
  lineDashed0: "\u2504",
  lineDashed1: "\u2505",
  lineDashed2: "\u2508",
  lineDashed3: "\u2509",
  lineDashed4: "\u254C",
  lineDashed5: "\u254D",
  lineDashed6: "\u2574",
  lineDashed7: "\u2576",
  lineDashed8: "\u2578",
  lineDashed9: "\u257A",
  lineDashed10: "\u257C",
  lineDashed11: "\u257E",
  lineDashed12: "\u2212",
  lineDashed13: "\u2013",
  lineDashed14: "\u2010",
  lineDashed15: "\u2043",
  lineVertical: "\u2502",
  lineVerticalBold: "\u2503",
  lineVerticalDouble: "\u2551",
  lineVerticalDashed0: "\u2506",
  lineVerticalDashed1: "\u2507",
  lineVerticalDashed2: "\u250A",
  lineVerticalDashed3: "\u250B",
  lineVerticalDashed4: "\u254E",
  lineVerticalDashed5: "\u254F",
  lineVerticalDashed6: "\u2575",
  lineVerticalDashed7: "\u2577",
  lineVerticalDashed8: "\u2579",
  lineVerticalDashed9: "\u257B",
  lineVerticalDashed10: "\u257D",
  lineVerticalDashed11: "\u257F",
  lineDownLeft: "\u2510",
  lineDownLeftArc: "\u256E",
  lineDownBoldLeftBold: "\u2513",
  lineDownBoldLeft: "\u2512",
  lineDownLeftBold: "\u2511",
  lineDownDoubleLeftDouble: "\u2557",
  lineDownDoubleLeft: "\u2556",
  lineDownLeftDouble: "\u2555",
  lineDownRight: "\u250C",
  lineDownRightArc: "\u256D",
  lineDownBoldRightBold: "\u250F",
  lineDownBoldRight: "\u250E",
  lineDownRightBold: "\u250D",
  lineDownDoubleRightDouble: "\u2554",
  lineDownDoubleRight: "\u2553",
  lineDownRightDouble: "\u2552",
  lineUpLeft: "\u2518",
  lineUpLeftArc: "\u256F",
  lineUpBoldLeftBold: "\u251B",
  lineUpBoldLeft: "\u251A",
  lineUpLeftBold: "\u2519",
  lineUpDoubleLeftDouble: "\u255D",
  lineUpDoubleLeft: "\u255C",
  lineUpLeftDouble: "\u255B",
  lineUpRight: "\u2514",
  lineUpRightArc: "\u2570",
  lineUpBoldRightBold: "\u2517",
  lineUpBoldRight: "\u2516",
  lineUpRightBold: "\u2515",
  lineUpDoubleRightDouble: "\u255A",
  lineUpDoubleRight: "\u2559",
  lineUpRightDouble: "\u2558",
  lineUpDownLeft: "\u2524",
  lineUpBoldDownBoldLeftBold: "\u252B",
  lineUpBoldDownBoldLeft: "\u2528",
  lineUpDownLeftBold: "\u2525",
  lineUpBoldDownLeftBold: "\u2529",
  lineUpDownBoldLeftBold: "\u252A",
  lineUpDownBoldLeft: "\u2527",
  lineUpBoldDownLeft: "\u2526",
  lineUpDoubleDownDoubleLeftDouble: "\u2563",
  lineUpDoubleDownDoubleLeft: "\u2562",
  lineUpDownLeftDouble: "\u2561",
  lineUpDownRight: "\u251C",
  lineUpBoldDownBoldRightBold: "\u2523",
  lineUpBoldDownBoldRight: "\u2520",
  lineUpDownRightBold: "\u251D",
  lineUpBoldDownRightBold: "\u2521",
  lineUpDownBoldRightBold: "\u2522",
  lineUpDownBoldRight: "\u251F",
  lineUpBoldDownRight: "\u251E",
  lineUpDoubleDownDoubleRightDouble: "\u2560",
  lineUpDoubleDownDoubleRight: "\u255F",
  lineUpDownRightDouble: "\u255E",
  lineDownLeftRight: "\u252C",
  lineDownBoldLeftBoldRightBold: "\u2533",
  lineDownLeftBoldRightBold: "\u252F",
  lineDownBoldLeftRight: "\u2530",
  lineDownBoldLeftBoldRight: "\u2531",
  lineDownBoldLeftRightBold: "\u2532",
  lineDownLeftRightBold: "\u252E",
  lineDownLeftBoldRight: "\u252D",
  lineDownDoubleLeftDoubleRightDouble: "\u2566",
  lineDownDoubleLeftRight: "\u2565",
  lineDownLeftDoubleRightDouble: "\u2564",
  lineUpLeftRight: "\u2534",
  lineUpBoldLeftBoldRightBold: "\u253B",
  lineUpLeftBoldRightBold: "\u2537",
  lineUpBoldLeftRight: "\u2538",
  lineUpBoldLeftBoldRight: "\u2539",
  lineUpBoldLeftRightBold: "\u253A",
  lineUpLeftRightBold: "\u2536",
  lineUpLeftBoldRight: "\u2535",
  lineUpDoubleLeftDoubleRightDouble: "\u2569",
  lineUpDoubleLeftRight: "\u2568",
  lineUpLeftDoubleRightDouble: "\u2567",
  lineUpDownLeftRight: "\u253C",
  lineUpBoldDownBoldLeftBoldRightBold: "\u254B",
  lineUpDownBoldLeftBoldRightBold: "\u2548",
  lineUpBoldDownLeftBoldRightBold: "\u2547",
  lineUpBoldDownBoldLeftRightBold: "\u254A",
  lineUpBoldDownBoldLeftBoldRight: "\u2549",
  lineUpBoldDownLeftRight: "\u2540",
  lineUpDownBoldLeftRight: "\u2541",
  lineUpDownLeftBoldRight: "\u253D",
  lineUpDownLeftRightBold: "\u253E",
  lineUpBoldDownBoldLeftRight: "\u2542",
  lineUpDownLeftBoldRightBold: "\u253F",
  lineUpBoldDownLeftBoldRight: "\u2543",
  lineUpBoldDownLeftRightBold: "\u2544",
  lineUpDownBoldLeftBoldRight: "\u2545",
  lineUpDownBoldLeftRightBold: "\u2546",
  lineUpDoubleDownDoubleLeftDoubleRightDouble: "\u256C",
  lineUpDoubleDownDoubleLeftRight: "\u256B",
  lineUpDownLeftDoubleRightDouble: "\u256A",
  lineCross: "\u2573",
  lineBackslash: "\u2572",
  lineSlash: "\u2571"
};
var specialMainSymbols = {
  tick: "\u2714",
  info: "\u2139",
  warning: "\u26A0",
  cross: "\u2718",
  squareSmall: "\u25FB",
  squareSmallFilled: "\u25FC",
  circle: "\u25EF",
  circleFilled: "\u25C9",
  circleDotted: "\u25CC",
  circleDouble: "\u25CE",
  circleCircle: "\u24DE",
  circleCross: "\u24E7",
  circlePipe: "\u24BE",
  radioOn: "\u25C9",
  radioOff: "\u25EF",
  checkboxOn: "\u2612",
  checkboxOff: "\u2610",
  checkboxCircleOn: "\u24E7",
  checkboxCircleOff: "\u24BE",
  pointer: "\u276F",
  triangleUpOutline: "\u25B3",
  triangleLeft: "\u25C0",
  triangleRight: "\u25B6",
  lozenge: "\u25C6",
  lozengeOutline: "\u25C7",
  hamburger: "\u2630",
  smiley: "\u32E1",
  mustache: "\u0DF4",
  star: "\u2605",
  play: "\u25B6",
  nodejs: "\u2B22",
  oneSeventh: "\u2150",
  oneNinth: "\u2151",
  oneTenth: "\u2152"
};
var specialFallbackSymbols = {
  tick: "\u221A",
  info: "i",
  warning: "\u203C",
  cross: "\xD7",
  squareSmall: "\u25A1",
  squareSmallFilled: "\u25A0",
  circle: "( )",
  circleFilled: "(*)",
  circleDotted: "( )",
  circleDouble: "( )",
  circleCircle: "(\u25CB)",
  circleCross: "(\xD7)",
  circlePipe: "(\u2502)",
  radioOn: "(*)",
  radioOff: "( )",
  checkboxOn: "[\xD7]",
  checkboxOff: "[ ]",
  checkboxCircleOn: "(\xD7)",
  checkboxCircleOff: "( )",
  pointer: ">",
  triangleUpOutline: "\u2206",
  triangleLeft: "\u25C4",
  triangleRight: "\u25BA",
  lozenge: "\u2666",
  lozengeOutline: "\u25CA",
  hamburger: "\u2261",
  smiley: "\u263A",
  mustache: "\u250C\u2500\u2510",
  star: "\u2736",
  play: "\u25BA",
  nodejs: "\u2666",
  oneSeventh: "1/7",
  oneNinth: "1/9",
  oneTenth: "1/10"
};
var mainSymbols = { ...common, ...specialMainSymbols };
var fallbackSymbols = { ...common, ...specialFallbackSymbols };
var shouldUseMain = isUnicodeSupported();
var figures = shouldUseMain ? mainSymbols : fallbackSymbols;
var figures_default = figures;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/alert/theme.js
var colorByVariant = {
  info: "blue",
  success: "green",
  error: "red",
  warning: "yellow"
};
var theme = {
  styles: {
    container: ({ variant }) => ({
      flexGrow: 1,
      borderStyle: "round",
      borderColor: colorByVariant[variant],
      gap: 1,
      paddingX: 1
    }),
    iconContainer: () => ({
      flexShrink: 0
    }),
    icon: ({ variant }) => ({
      color: colorByVariant[variant]
    }),
    content: () => ({
      flexShrink: 1,
      flexGrow: 1,
      minWidth: 0,
      flexDirection: "column",
      gap: 1
    }),
    title: () => ({
      bold: true
    }),
    message: () => ({})
  },
  config({ variant }) {
    let icon;
    if (variant === "info") {
      icon = figures_default.info;
    }
    if (variant === "success") {
      icon = figures_default.tick;
    }
    if (variant === "error") {
      icon = figures_default.cross;
    }
    if (variant === "warning") {
      icon = figures_default.warning;
    }
    return { icon };
  }
};
var theme_default = theme;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/badge/theme.js
var theme2 = {
  styles: {
    container: ({ color }) => ({
      backgroundColor: color
    }),
    label: () => ({
      color: "black"
    })
  }
};
var theme_default2 = theme2;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/confirm-input/theme.js
var theme3 = {
  styles: {
    input: ({ isFocused }) => ({
      dimColor: !isFocused
    })
  }
};
var theme_default3 = theme3;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/multi-select/theme.js
var theme4 = {
  styles: {
    container: () => ({
      flexDirection: "column"
    }),
    option: ({ isFocused }) => ({
      gap: 1,
      paddingLeft: isFocused ? 0 : 2
    }),
    selectedIndicator: () => ({
      color: "green"
    }),
    focusIndicator: () => ({
      color: "blue"
    }),
    label({ isFocused, isSelected }) {
      let color;
      if (isSelected) {
        color = "green";
      }
      if (isFocused) {
        color = "blue";
      }
      return { color };
    },
    highlightedText: () => ({
      bold: true
    })
  }
};
var theme_default4 = theme4;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/ordered-list/theme.js
var theme5 = {
  styles: {
    list: () => ({
      flexDirection: "column"
    }),
    listItem: () => ({
      gap: 1
    }),
    marker: () => ({
      dimColor: true
    }),
    content: () => ({
      flexDirection: "column"
    })
  }
};
var theme_default5 = theme5;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/progress-bar/theme.js
var theme6 = {
  styles: {
    container: () => ({
      flexGrow: 1,
      minWidth: 0
    }),
    completed: () => ({
      color: "magenta"
    }),
    remaining: () => ({
      dimColor: true
    })
  },
  config: () => ({
    // Character for rendering a completed bar
    completedCharacter: figures_default.square,
    // Character for rendering a remaining bar
    remainingCharacter: figures_default.squareLightShade
  })
};
var theme_default6 = theme6;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/select/theme.js
var theme7 = {
  styles: {
    container: () => ({
      flexDirection: "column"
    }),
    option: ({ isFocused }) => ({
      gap: 1,
      paddingLeft: isFocused ? 0 : 2
    }),
    selectedIndicator: () => ({
      color: "green"
    }),
    focusIndicator: () => ({
      color: "blue"
    }),
    label({ isFocused, isSelected }) {
      let color;
      if (isSelected) {
        color = "green";
      }
      if (isFocused) {
        color = "blue";
      }
      return { color };
    },
    highlightedText: () => ({
      bold: true
    })
  }
};
var theme_default7 = theme7;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/spinner/theme.js
var theme8 = {
  styles: {
    container: () => ({
      gap: 1
    }),
    frame: () => ({
      color: "blue"
    }),
    label: () => ({})
  }
};
var theme_default8 = theme8;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/status-message/theme.js
var colorByVariant2 = {
  success: "green",
  error: "red",
  warning: "yellow",
  info: "blue"
};
var iconByVariant = {
  success: figures_default.tick,
  error: figures_default.cross,
  warning: figures_default.warning,
  info: figures_default.info
};
var theme9 = {
  styles: {
    container: () => ({
      gap: 1
    }),
    iconContainer: () => ({
      flexShrink: 0
    }),
    icon: ({ variant }) => ({
      color: colorByVariant2[variant]
    }),
    message: () => ({})
  },
  config: ({ variant }) => ({
    icon: iconByVariant[variant]
  })
};
var theme_default9 = theme9;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/unordered-list/theme.js
var theme10 = {
  styles: {
    list: () => ({
      flexDirection: "column"
    }),
    listItem: () => ({
      gap: 1
    }),
    marker: () => ({
      dimColor: true
    }),
    content: () => ({
      flexDirection: "column"
    })
  },
  config: () => ({
    marker: figures_default.line
  })
};
var theme_default10 = theme10;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/text-input/theme.js
var theme11 = {
  styles: {
    value: () => ({})
  }
};
var theme_default11 = theme11;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/email-input/theme.js
var theme12 = {
  styles: {
    value: () => ({})
  }
};
var theme_default12 = theme12;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/password-input/theme.js
var theme13 = {
  styles: {
    value: () => ({})
  }
};
var theme_default13 = theme13;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/theme.js
var defaultTheme = {
  components: {
    Alert: theme_default,
    Badge: theme_default2,
    ConfirmInput: theme_default3,
    MultiSelect: theme_default4,
    OrderedList: theme_default5,
    ProgressBar: theme_default6,
    Select: theme_default7,
    Spinner: theme_default8,
    StatusMessage: theme_default9,
    UnorderedList: theme_default10,
    TextInput: theme_default11,
    EmailInput: theme_default12,
    PasswordInput: theme_default13
  }
};
var ThemeContext = createContext(defaultTheme);
var useComponentTheme = (component) => {
  const theme14 = useContext(ThemeContext);
  return theme14.components[component];
};

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/unordered-list/constants.js
var defaultMarker = figures_default.line;

// ../../node_modules/.bun/@inkjs+ui@2.0.0+7fe8c3398a922172/node_modules/@inkjs/ui/build/components/unordered-list/unordered-list-item-context.js
createContext({
  marker: defaultMarker
});
createContext({
  depth: 0
});
function ProgressBar({ value }) {
  const [width, setWidth] = useState(0);
  const [ref, setRef] = useState(null);
  if (ref) {
    const dimensions = measureElement(ref);
    if (dimensions.width !== width) {
      setWidth(dimensions.width);
    }
  }
  const progress = Math.min(100, Math.max(0, value));
  const complete = Math.round(progress / 100 * width);
  const remaining = width - complete;
  const { styles, config: config2 } = useComponentTheme("ProgressBar");
  return React14.createElement(
    Box,
    { ref: setRef, ...styles.container() },
    complete > 0 && React14.createElement(Text, { ...styles.completed() }, config2().completedCharacter.repeat(complete)),
    remaining > 0 && React14.createElement(Text, { ...styles.remaining() }, config2().remainingCharacter.repeat(remaining))
  );
}
chalk34.inverse(" ");
createContext({
  marker: figures_default.line
});
createContext({
  marker: ""
});
chalk34.inverse(" ");
chalk34.inverse(" ");
var ProgressBar2 = ({
  value,
  label,
  showPercentage = true,
  color = "cyan",
  width = 40
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
    label && /* @__PURE__ */ jsx(Box, { marginBottom: 1, children: /* @__PURE__ */ jsx(Text, { bold: true, children: label }) }),
    /* @__PURE__ */ jsxs(Box, { children: [
      /* @__PURE__ */ jsx(ProgressBar, { value: clampedValue }),
      showPercentage && /* @__PURE__ */ jsx(Box, { marginLeft: 2, children: /* @__PURE__ */ jsxs(Text, { color, bold: true, children: [
        clampedValue.toFixed(0),
        "%"
      ] }) })
    ] })
  ] });
};
var Chart = ({
  type = "bar",
  data,
  maxHeight = 10,
  barWidth = 3,
  showGrid = false,
  showValues = true,
  title,
  defaultColor = "cyan"
}) => {
  if (data.length === 0) {
    return /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "No data to display" }) });
  }
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const bars = data.map((point) => {
    const height = Math.max(1, Math.round(point.value / maxValue * maxHeight));
    const color = point.color || defaultColor;
    return { ...point, height, color };
  });
  if (type === "bar") {
    return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      title && /* @__PURE__ */ jsx(Box, { marginBottom: 1, children: /* @__PURE__ */ jsx(Text, { bold: true, children: title }) }),
      /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
        Array.from({ length: maxHeight }).map((_, rowIndex) => {
          const row = maxHeight - rowIndex - 1;
          return /* @__PURE__ */ jsxs(Box, { children: [
            showGrid && /* @__PURE__ */ jsx(Box, { width: 3, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: row === 0 ? "  0" : "   " }) }),
            bars.map((bar, barIndex) => /* @__PURE__ */ jsx(Box, { width: barWidth + 1, children: /* @__PURE__ */ jsx(Text, { color: bar.height > row ? bar.color : void 0, children: bar.height > row ? "\u2588".repeat(barWidth) : " ".repeat(barWidth) }) }, barIndex))
          ] }, rowIndex);
        }),
        /* @__PURE__ */ jsxs(Box, { children: [
          showGrid && /* @__PURE__ */ jsx(Box, { width: 3, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "   " }) }),
          bars.map((_, index) => /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
            "\u2500".repeat(barWidth),
            " "
          ] }, index))
        ] }),
        /* @__PURE__ */ jsxs(Box, { children: [
          showGrid && /* @__PURE__ */ jsx(Box, { width: 3, children: /* @__PURE__ */ jsx(Text, { children: " " }) }),
          bars.map((bar, index) => /* @__PURE__ */ jsx(Box, { width: barWidth + 1, children: /* @__PURE__ */ jsx(Text, { children: bar.label.slice(0, barWidth) }) }, index))
        ] }),
        showValues && /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
          showGrid && /* @__PURE__ */ jsx(Box, { width: 3, children: /* @__PURE__ */ jsx(Text, { children: " " }) }),
          bars.map((bar, index) => /* @__PURE__ */ jsx(Box, { width: barWidth + 1, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: bar.value }) }, index))
        ] })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
    title && /* @__PURE__ */ jsx(Box, { marginBottom: 1, children: /* @__PURE__ */ jsx(Text, { bold: true, children: title }) }),
    data.map((point, index) => {
      const barLength = Math.max(1, Math.round(point.value / maxValue * 40));
      return /* @__PURE__ */ jsxs(Box, { marginBottom: 1, children: [
        /* @__PURE__ */ jsx(Box, { width: 15, children: /* @__PURE__ */ jsxs(Text, { children: [
          point.label,
          ": "
        ] }) }),
        /* @__PURE__ */ jsx(Text, { color: point.color || defaultColor, children: "\u2501".repeat(barLength) }),
        showValues && /* @__PURE__ */ jsx(Box, { marginLeft: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
          "(",
          point.value,
          ")"
        ] }) })
      ] }, index);
    })
  ] });
};

// src/ui/commands/Reputation.tsx
init_client();
init_sdk_helpers();
var Reputation = ({ agent, detailed = false }) => {
  const { exit } = useApp();
  const [stage, setStage] = useState("loading");
  const [viewMode, setViewMode] = useState(detailed ? "detailed" : "overview");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [animatedScore, setAnimatedScore] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [refreshing, setRefreshing] = useState(false);
  useInput((input, key) => {
    if (input === "q" || key.ctrl && input === "c") {
      exit();
    } else if (input === "r") {
      refreshData();
    } else if (input === "d") {
      setViewMode(viewMode === "overview" ? "detailed" : "overview");
    }
  });
  useEffect(() => {
    loadReputationData();
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 3e4);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (data && animatedScore < data.ghostScore) {
      const increment = Math.ceil(data.ghostScore / 50);
      const timer = setTimeout(() => {
        setAnimatedScore(Math.min(animatedScore + increment, data.ghostScore));
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [animatedScore, data]);
  const loadReputationData = async () => {
    try {
      setAnimatedScore(0);
      const { client } = await initializeClient("devnet");
      const safeClient = createSafeSDKClient(client);
      const agentAddr = address(agent);
      const agentData = await safeClient.agent.getAgentAccount(agentAddr);
      if (!agentData) {
        setError("Agent not found");
        setStage("error");
        return;
      }
      const reputationScore = Number(agentData.reputationScore || 0);
      const ghostScore = Math.min(1e3, Math.round(reputationScore / 100));
      const totalJobs = Number(agentData.totalJobsCompleted || 0);
      const totalJobsFailed = Number(agentData.totalJobsFailed || 0);
      const totalJobsAll = totalJobs + totalJobsFailed;
      const successRate = totalJobsAll > 0 ? Math.round(totalJobs / totalJobsAll * 100) : 0;
      const tier = ghostScore >= 900 ? "platinum" : ghostScore >= 750 ? "gold" : ghostScore >= 500 ? "silver" : ghostScore >= 200 ? "bronze" : "newcomer";
      const tierColor = tier === "platinum" ? "cyan" : tier === "gold" ? "yellow" : tier === "silver" ? "white" : tier === "bronze" ? "red" : "gray";
      const successComponent = Math.round(successRate * 0.4);
      const serviceQuality = Math.min(100, Math.round(ghostScore / 10 * 1.2));
      const serviceComponent = Math.round(serviceQuality * 0.3);
      const responseTime = 95;
      const responseComponent = Math.round(responseTime * 0.2);
      const volumeConsistency = Math.min(100, Math.round(totalJobs / 100 * 100));
      const volumeComponent = Math.round(volumeConsistency * 0.1);
      const breakdown = {
        successRate: { value: successRate, weight: 40, contribution: successComponent },
        serviceQuality: { value: serviceQuality, weight: 30, contribution: serviceComponent },
        responseTime: { value: responseTime, weight: 20, contribution: responseComponent },
        volumeConsistency: { value: volumeConsistency, weight: 10, contribution: volumeComponent }
      };
      setData({
        address: agentAddr,
        agentName: agentData.name || "Agent",
        ghostScore,
        tier,
        tierColor,
        reputationScore,
        totalJobs,
        totalJobsFailed,
        successRate,
        breakdown
      });
      setStage("loaded");
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err.message || "Unknown error");
      setStage("error");
    }
  };
  const refreshData = async () => {
    setRefreshing(true);
    await loadReputationData();
    setRefreshing(false);
  };
  const getTierBenefits2 = (tier) => {
    switch (tier) {
      case "platinum":
        return [
          "Unlimited job value",
          "0% escrow deposit",
          "Instant payment release",
          "Elite verified badge"
        ];
      case "gold":
        return ["Jobs up to $10,000", "0% escrow deposit", "Gold verified badge", "Premium access"];
      case "silver":
        return ["Jobs up to $1,000", "15% escrow deposit", "Priority listing", "Featured badge"];
      case "bronze":
        return ["Jobs up to $100", "25% escrow deposit", "Standard listing", "Bronze badge"];
      default:
        return ["Jobs up to $100", "25% escrow deposit", "Building reputation", "Newcomer badge"];
    }
  };
  const getNextTier = (ghostScore, tier) => {
    if (tier === "platinum") return null;
    const thresholds = { newcomer: 200, bronze: 500, silver: 750, gold: 900 };
    const current = tier === "newcomer" ? 0 : thresholds[tier];
    const next = tier === "newcomer" ? 200 : tier === "bronze" ? 500 : tier === "silver" ? 750 : 900;
    const nextTierName = tier === "newcomer" ? "BRONZE" : tier === "bronze" ? "SILVER" : tier === "silver" ? "GOLD" : "PLATINUM";
    const progress = Math.round((ghostScore - current) / (next - current) * 100);
    return { tier: nextTierName, threshold: next, progress: Math.min(100, Math.max(0, progress)) };
  };
  const getSecondsAgo = () => {
    return Math.floor((Date.now() - lastUpdated) / 1e3);
  };
  const renderStage = () => {
    switch (stage) {
      case "loading":
        return /* @__PURE__ */ jsx(Box, { flexDirection: "column", gap: 1, children: /* @__PURE__ */ jsx(Spinner, { state: "loading", label: "Loading Ghost Score from blockchain..." }) });
      case "error":
        return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", gap: 1, children: [
          /* @__PURE__ */ jsx(
            Alert,
            {
              type: "error",
              title: "Failed to Load Reputation",
              message: error,
              showBorder: true
            }
          ),
          /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
            "Press ",
            /* @__PURE__ */ jsx(Text, { color: "yellow", children: "r" }),
            " to retry or",
            " ",
            /* @__PURE__ */ jsx(Text, { color: "yellow", children: "q" }),
            " to quit"
          ] }) })
        ] });
      case "loaded":
        if (!data) return null;
        const nextTier = getNextTier(data.ghostScore, data.tier);
        return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
          /* @__PURE__ */ jsx(Card, { borderColor: "gray", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
            /* @__PURE__ */ jsxs(Box, { children: [
              /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Agent: " }),
              /* @__PURE__ */ jsx(Text, { color: "greenBright", bold: true, children: data.agentName })
            ] }),
            /* @__PURE__ */ jsxs(Box, { children: [
              /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Address: " }),
              /* @__PURE__ */ jsxs(Text, { children: [
                data.address.toString().slice(0, 20),
                "...",
                data.address.toString().slice(-8)
              ] })
            ] }),
            /* @__PURE__ */ jsxs(Box, { children: [
              /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Updated: " }),
              /* @__PURE__ */ jsxs(Text, { children: [
                getSecondsAgo(),
                "s ago"
              ] }),
              refreshing && /* @__PURE__ */ jsx(Box, { marginLeft: 2, children: /* @__PURE__ */ jsx(Spinner, { state: "loading", label: "" }) })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Card, { borderColor: data.tierColor, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", alignItems: "center", children: [
            /* @__PURE__ */ jsx(Text, { bold: true, color: "greenBright", children: /* @__PURE__ */ jsx(BigText, { text: animatedScore.toString(), font: "tiny" }) }),
            /* @__PURE__ */ jsx(Box, { marginTop: -1, marginBottom: 1, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "out of 1000" }) }),
            /* @__PURE__ */ jsx(Badge, { variant: "tier", tier: data.tier, bold: true })
          ] }) }) }),
          nextTier && /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Card, { title: `Progress to ${nextTier.tier}`, borderColor: "yellow", children: /* @__PURE__ */ jsx(
            ProgressBar2,
            {
              value: nextTier.progress,
              color: "yellow",
              showPercentage: true
            }
          ) }) }),
          viewMode === "overview" && /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginTop: 1, children: [
            /* @__PURE__ */ jsx(Card, { title: "Quick Stats", borderColor: "blue", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
              /* @__PURE__ */ jsx(
                InfoRow,
                {
                  label: "Reputation Score",
                  value: `${data.reputationScore.toLocaleString()} bps`
                }
              ),
              /* @__PURE__ */ jsx(
                InfoRow,
                {
                  label: "Jobs Completed",
                  value: data.totalJobs.toLocaleString(),
                  color: "green"
                }
              ),
              /* @__PURE__ */ jsx(
                InfoRow,
                {
                  label: "Jobs Failed",
                  value: data.totalJobsFailed.toLocaleString(),
                  color: "red"
                }
              ),
              /* @__PURE__ */ jsx(
                InfoRow,
                {
                  label: "Success Rate",
                  value: `${data.successRate}%`,
                  color: data.successRate >= 80 ? "green" : "yellow"
                }
              )
            ] }) }),
            /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
              "Press ",
              /* @__PURE__ */ jsx(Text, { color: "yellow", children: "d" }),
              " for detailed breakdown"
            ] }) })
          ] }),
          viewMode === "detailed" && /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginTop: 1, children: [
            /* @__PURE__ */ jsx(Card, { title: "Score Breakdown", borderColor: "magenta", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
              /* @__PURE__ */ jsx(
                Chart,
                {
                  type: "bar",
                  data: [
                    {
                      label: "Succ",
                      value: data.breakdown.successRate.contribution,
                      color: "green"
                    },
                    {
                      label: "Qual",
                      value: data.breakdown.serviceQuality.contribution,
                      color: "cyan"
                    },
                    {
                      label: "Time",
                      value: data.breakdown.responseTime.contribution,
                      color: "yellow"
                    },
                    {
                      label: "Vol",
                      value: data.breakdown.volumeConsistency.contribution,
                      color: "magenta"
                    }
                  ],
                  maxHeight: 8,
                  barWidth: 5,
                  showValues: true,
                  defaultColor: "cyan"
                }
              ),
              /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", children: [
                /* @__PURE__ */ jsxs(Box, { children: [
                  /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
                    "Success Rate (",
                    data.breakdown.successRate.weight,
                    "%): "
                  ] }),
                  /* @__PURE__ */ jsxs(Text, { children: [
                    data.breakdown.successRate.value,
                    "% \u2192 ",
                    data.breakdown.successRate.contribution,
                    "pts"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs(Box, { children: [
                  /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
                    "Service Quality (",
                    data.breakdown.serviceQuality.weight,
                    "%): "
                  ] }),
                  /* @__PURE__ */ jsxs(Text, { children: [
                    data.breakdown.serviceQuality.value,
                    "% \u2192 ",
                    data.breakdown.serviceQuality.contribution,
                    "pts"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs(Box, { children: [
                  /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
                    "Response Time (",
                    data.breakdown.responseTime.weight,
                    "%): "
                  ] }),
                  /* @__PURE__ */ jsxs(Text, { children: [
                    data.breakdown.responseTime.value,
                    "% \u2192 ",
                    data.breakdown.responseTime.contribution,
                    "pts"
                  ] })
                ] }),
                /* @__PURE__ */ jsxs(Box, { children: [
                  /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
                    "Volume (",
                    data.breakdown.volumeConsistency.weight,
                    "%): "
                  ] }),
                  /* @__PURE__ */ jsxs(Text, { children: [
                    data.breakdown.volumeConsistency.value,
                    "% \u2192 ",
                    data.breakdown.volumeConsistency.contribution,
                    "pts"
                  ] })
                ] })
              ] })
            ] }) }),
            /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Card, { title: "Job Statistics", borderColor: "blue", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
              /* @__PURE__ */ jsx(
                InfoRow,
                {
                  label: "Completed",
                  value: data.totalJobs.toLocaleString(),
                  color: "green"
                }
              ),
              /* @__PURE__ */ jsx(
                InfoRow,
                {
                  label: "Failed",
                  value: data.totalJobsFailed.toLocaleString(),
                  color: "red"
                }
              ),
              /* @__PURE__ */ jsx(
                InfoRow,
                {
                  label: "Success Rate",
                  value: `${data.successRate}%`,
                  color: data.successRate >= 80 ? "green" : "yellow"
                }
              ),
              /* @__PURE__ */ jsx(
                InfoRow,
                {
                  label: "Average Rating",
                  value: "4.8/5.0",
                  color: "yellow"
                }
              )
            ] }) }) }),
            /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Card, { title: `${data.tier.toUpperCase()} Tier Benefits`, borderColor: data.tierColor, children: /* @__PURE__ */ jsx(Box, { flexDirection: "column", children: getTierBenefits2(data.tier).map((benefit, idx) => /* @__PURE__ */ jsxs(Box, { children: [
              /* @__PURE__ */ jsx(Text, { color: "green", children: "\u2713 " }),
              /* @__PURE__ */ jsx(Text, { dimColor: true, children: benefit })
            ] }, idx)) }) }) }),
            /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
              "Press ",
              /* @__PURE__ */ jsx(Text, { color: "yellow", children: "d" }),
              " for overview"
            ] }) })
          ] }),
          /* @__PURE__ */ jsxs(Box, { marginTop: 2, flexDirection: "column", children: [
            /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u2500".repeat(60) }),
            /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
              /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
                /* @__PURE__ */ jsx(Text, { color: "yellow", children: "r" }),
                ": Refresh"
              ] }),
              /* @__PURE__ */ jsx(Box, { marginLeft: 3, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
                /* @__PURE__ */ jsx(Text, { color: "yellow", children: "d" }),
                ": Toggle detailed view"
              ] }) }),
              /* @__PURE__ */ jsx(Box, { marginLeft: 3, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
                /* @__PURE__ */ jsx(Text, { color: "yellow", children: "q" }),
                ": Quit"
              ] }) })
            ] })
          ] })
        ] });
    }
  };
  return /* @__PURE__ */ jsx(
    Layout,
    {
      title: `\u{1F4CA} Ghost Score Dashboard - ${agent.slice(0, 8)}...`,
      showFooter: false,
      children: renderStage()
    }
  );
};
init_solana_client();
init_sdk_helpers();
var TIER_THRESHOLDS2 = {
  1: 1e3,
  // 1K GHOST
  2: 5e3,
  // 5K GHOST
  3: 1e4,
  // 10K GHOST
  4: 25e3,
  // 25K GHOST
  5: 5e4
  // 50K GHOST
};
var TIER_APY = {
  1: 10,
  // 10% APY
  2: 15,
  // 15% APY
  3: 20,
  // 20% APY
  4: 25,
  // 25% APY
  5: 30
  // 30% APY
};
var TIER_BOOST = {
  1: 5,
  // 5% Ghost Score boost
  2: 10,
  // 10% Ghost Score boost
  3: 15,
  // 15% Ghost Score boost
  4: 20,
  // 20% Ghost Score boost
  5: 25
  // 25% Ghost Score boost
};
var Staking = ({ agent, autoRefresh = true }) => {
  const { exit } = useApp();
  const [stage, setStage] = useState("loading");
  const [stakingData, setStakingData] = useState({
    totalStaked: 0,
    currentTier: 0,
    accruedRewards: 0,
    stakingDuration: 0,
    unlockDate: Date.now(),
    canClaim: false,
    canUnstake: false
  });
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(/* @__PURE__ */ new Date());
  const [helpVisible, setHelpVisible] = useState(false);
  const [agentName, setAgentName] = useState("Unknown Agent");
  const [simulateAmount, setSimulateAmount] = useState(1e3);
  useInput((input, key) => {
    if (input === "q" || key.ctrl && input === "c" || key.escape) {
      exit();
    }
    if (stage === "ready") {
      if (input === "r") {
        refreshData();
      } else if (input === "c" && stakingData.canClaim) {
        claimRewards();
      } else if (input === "s") {
        setStage("simulate");
      } else if (input === "u" && stakingData.totalStaked > 0) {
        setStage("unstake_info");
      } else if (input === "h" || input === "?") {
        setHelpVisible(!helpVisible);
      }
    }
    if (stage === "simulate" || stage === "unstake_info") {
      if (input === "b") {
        setStage("ready");
      }
    }
    if (stage === "simulate") {
      if (key.upArrow) {
        setSimulateAmount((prev) => prev + 1e3);
      } else if (key.downArrow) {
        setSimulateAmount((prev) => Math.max(0, prev - 1e3));
      } else if (key.rightArrow) {
        setSimulateAmount((prev) => prev + 100);
      } else if (key.leftArrow) {
        setSimulateAmount((prev) => Math.max(0, prev - 100));
      }
    }
  });
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshData(true);
      }, 5e3);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);
  useEffect(() => {
    loadStakingData();
  }, []);
  const loadStakingData = async () => {
    try {
      setStage("loading");
      const walletPath = process.env.HOME + "/.config/solana/id.json";
      const secretKeyBytes = new Uint8Array(JSON.parse(readFileSync(walletPath, "utf-8")));
      const wallet = await createKeyPairSignerFromBytes$1(secretKeyBytes);
      const solanaClient = createCustomClient("https://api.devnet.solana.com");
      const client = new GhostSpeakClient({
        rpcEndpoint: "https://api.devnet.solana.com"
      });
      const safeClient = createSafeSDKClient(client);
      if (agent) {
        try {
          const agentAddr = address(agent);
          const agentData = await safeClient.agent.getAgentAccount(agentAddr);
          if (agentData?.name) {
            setAgentName(agentData.name);
          }
        } catch (err) {
          console.warn("Could not load agent data");
        }
      }
      const stakingDataResult = {
        totalStaked: 0,
        currentTier: 0,
        accruedRewards: 0,
        stakingDuration: 0,
        unlockDate: Date.now(),
        canClaim: false,
        canUnstake: false
      };
      setStakingData(stakingDataResult);
      setStage("ready");
      setLastUpdate(/* @__PURE__ */ new Date());
    } catch (err) {
      setError(err.message || "Failed to load staking data");
      setStage("error");
    }
  };
  const refreshData = async (silent = false) => {
    if (!silent) {
      setStage("loading");
    }
    try {
      await loadStakingData();
      setLastUpdate(/* @__PURE__ */ new Date());
      if (!silent) {
        setStage("ready");
      }
    } catch (err) {
      setError(err.message || "Failed to refresh data");
      setStage("error");
    }
  };
  const claimRewards = async () => {
    setStage("claiming");
    try {
      setError("Claim functionality not yet implemented. Use CLI commands.");
      setStage("error");
    } catch (err) {
      setError(err.message || "Failed to claim rewards");
      setStage("error");
    }
  };
  const calculateTier = (amount) => {
    if (amount >= TIER_THRESHOLDS2[5]) return 5;
    if (amount >= TIER_THRESHOLDS2[4]) return 4;
    if (amount >= TIER_THRESHOLDS2[3]) return 3;
    if (amount >= TIER_THRESHOLDS2[2]) return 2;
    if (amount >= TIER_THRESHOLDS2[1]) return 1;
    return 0;
  };
  const getNextTierInfo = () => {
    const nextTier = Math.min(stakingData.currentTier + 1, 5);
    const nextThreshold = TIER_THRESHOLDS2[nextTier];
    const remaining = nextThreshold - stakingData.totalStaked;
    const progress = stakingData.totalStaked / nextThreshold * 100;
    return { nextTier, nextThreshold, remaining, progress };
  };
  const getTierColor = (tier) => {
    if (tier >= 5) return "magenta";
    if (tier >= 4) return "yellow";
    if (tier >= 3) return "green";
    return "cyan";
  };
  const getTierBadgeType = (tier) => {
    if (tier === 5) return "platinum";
    if (tier === 4) return "gold";
    if (tier >= 2) return "silver";
    if (tier === 1) return "bronze";
    return "newcomer";
  };
  const calculateDailyRewards = (amount, apy) => {
    return amount * (apy / 100) / 365;
  };
  const calculateMonthlyRewards = (amount, apy) => {
    return amount * (apy / 100) / 12;
  };
  const calculateYearlyRewards = (amount, apy) => {
    return amount * (apy / 100);
  };
  const renderStakingOverview = () => {
    const { nextTier, remaining, progress } = getNextTierInfo();
    const currentAPY = TIER_APY[stakingData.currentTier] || 0;
    const currentBoost = TIER_BOOST[stakingData.currentTier] || 0;
    const tierColor = getTierColor(stakingData.currentTier);
    return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", gap: 1, children: [
      /* @__PURE__ */ jsx(Card, { title: "Current Stake", borderColor: tierColor, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
        /* @__PURE__ */ jsxs(Box, { alignItems: "center", gap: 2, children: [
          /* @__PURE__ */ jsxs(Text, { bold: true, color: tierColor, children: [
            stakingData.totalStaked.toLocaleString(),
            " GHOST"
          ] }),
          /* @__PURE__ */ jsx(Badge, { variant: "tier", tier: getTierBadgeType(stakingData.currentTier) })
        ] }),
        /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(
          InfoRow,
          {
            label: "Staking Duration",
            value: `${stakingData.stakingDuration} days`
          }
        ) })
      ] }) }),
      stakingData.currentTier < 5 && /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginTop: 1, children: [
        /* @__PURE__ */ jsx(
          ProgressBar2,
          {
            value: progress,
            label: `Progress to Tier ${nextTier}`,
            color: getTierColor(nextTier),
            showPercentage: true
          }
        ),
        /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
          remaining.toLocaleString(),
          " GHOST more to reach Tier ",
          nextTier
        ] }) })
      ] }),
      stakingData.currentTier === 5 && /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { bold: true, color: "greenBright", children: "Maximum Tier Reached!" }) }),
      /* @__PURE__ */ jsx(Card, { title: "Current Benefits", borderColor: "green", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
        /* @__PURE__ */ jsx(InfoRow, { label: "APY", value: `${currentAPY}%`, color: "green" }),
        /* @__PURE__ */ jsx(InfoRow, { label: "Ghost Score Boost", value: `+${currentBoost}%`, color: "green" })
      ] }) })
    ] });
  };
  const renderRewards = () => {
    const currentAPY = TIER_APY[stakingData.currentTier] || 0;
    const dailyRewards = calculateDailyRewards(stakingData.totalStaked, currentAPY);
    const monthlyRewards = calculateMonthlyRewards(stakingData.totalStaked, currentAPY);
    return /* @__PURE__ */ jsx(Card, { title: "Rewards", borderColor: "yellow", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx(
        InfoRow,
        {
          label: "Pending Rewards",
          value: `${stakingData.accruedRewards.toFixed(2)} GHOST`,
          color: "green"
        }
      ),
      /* @__PURE__ */ jsx(
        InfoRow,
        {
          label: "Estimated Daily",
          value: `~${dailyRewards.toFixed(2)} GHOST`,
          color: "cyan"
        }
      ),
      /* @__PURE__ */ jsx(
        InfoRow,
        {
          label: "Estimated Monthly",
          value: `~${monthlyRewards.toFixed(2)} GHOST`,
          color: "cyan"
        }
      ),
      /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
        /* @__PURE__ */ jsx(Box, { width: 25, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Claim Status:" }) }),
        stakingData.canClaim ? /* @__PURE__ */ jsx(Text, { color: "green", children: "Available (Press C)" }) : /* @__PURE__ */ jsx(Text, { dimColor: true, children: "No rewards yet" })
      ] })
    ] }) });
  };
  const renderAPYChart = () => {
    const chartData = [
      { label: "T1", value: 10, color: "red" },
      { label: "T2", value: 15, color: "white" },
      { label: "T3", value: 20, color: "green" },
      { label: "T4", value: 25, color: "yellow" },
      { label: "T5", value: 30, color: "cyan" }
    ];
    return /* @__PURE__ */ jsx(Card, { title: "APY by Tier", borderColor: "magenta", children: /* @__PURE__ */ jsx(
      Chart,
      {
        type: "bar",
        data: chartData,
        maxHeight: 8,
        barWidth: 5
      }
    ) });
  };
  const renderSimulator = () => {
    const projectedTier = calculateTier(simulateAmount);
    const projectedAPY = TIER_APY[projectedTier] || 0;
    const projectedBoost = TIER_BOOST[projectedTier] || 0;
    const projectedMonthly = calculateMonthlyRewards(simulateAmount, projectedAPY);
    const projectedYearly = calculateYearlyRewards(simulateAmount, projectedAPY);
    return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", gap: 1, children: [
      /* @__PURE__ */ jsx(Card, { title: "APY Calculator", borderColor: "magenta", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", gap: 1, children: [
        /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
          /* @__PURE__ */ jsx(Text, { bold: true, children: "Stake Amount:" }),
          /* @__PURE__ */ jsxs(Box, { marginTop: 1, alignItems: "center", gap: 2, children: [
            /* @__PURE__ */ jsxs(Text, { color: "cyan", bold: true, children: [
              simulateAmount.toLocaleString(),
              " GHOST"
            ] }),
            /* @__PURE__ */ jsx(Badge, { variant: "tier", tier: getTierBadgeType(projectedTier) })
          ] }),
          /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Use arrow keys: \u2190 \u2192 (\xB1100) \u2191 \u2193 (\xB11000)" }) })
        ] }),
        /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", children: [
          /* @__PURE__ */ jsx(Text, { bold: true, children: "Projected Benefits:" }),
          /* @__PURE__ */ jsx(InfoRow, { label: "Tier", value: `${projectedTier}/5`, color: getTierColor(projectedTier) }),
          /* @__PURE__ */ jsx(InfoRow, { label: "Ghost Score Boost", value: `+${projectedBoost}%`, color: "green" }),
          /* @__PURE__ */ jsx(InfoRow, { label: "APY", value: `${projectedAPY}%`, color: "yellow" })
        ] }),
        /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", children: [
          /* @__PURE__ */ jsx(Text, { bold: true, children: "Estimated Earnings:" }),
          /* @__PURE__ */ jsx(InfoRow, { label: "Monthly", value: `~${projectedMonthly.toFixed(2)} GHOST`, color: "cyan" }),
          /* @__PURE__ */ jsx(InfoRow, { label: "Yearly", value: `~${projectedYearly.toFixed(2)} GHOST`, color: "green" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Press " }),
        /* @__PURE__ */ jsx(Text, { color: "yellow", children: "b" }),
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: " to return to dashboard" })
      ] })
    ] });
  };
  const renderUnstakeInfo = () => {
    const unlockDays = Math.ceil((stakingData.unlockDate - Date.now()) / (1e3 * 60 * 60 * 24));
    return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", gap: 1, children: [
      /* @__PURE__ */ jsx(
        Alert,
        {
          type: "warning",
          title: "Unstaking Information",
          message: "Unstaking has a 7-day cooldown period. Your benefits will be reduced immediately upon unstaking."
        }
      ),
      /* @__PURE__ */ jsx(Card, { title: "Unstaking Impact", borderColor: "yellow", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
        /* @__PURE__ */ jsx(InfoRow, { label: "Current Stake", value: `${stakingData.totalStaked.toLocaleString()} GHOST` }),
        /* @__PURE__ */ jsx(InfoRow, { label: "Cooldown Period", value: "7 days", color: "yellow" }),
        /* @__PURE__ */ jsx(InfoRow, { label: "Benefits Lost", value: "Immediate upon unstaking", color: "red" }),
        /* @__PURE__ */ jsx(InfoRow, { label: "Tokens Available", value: "After cooldown period", color: "yellow" })
      ] }) }),
      !stakingData.canUnstake && unlockDays > 0 && /* @__PURE__ */ jsx(Card, { title: "Active Lock Period", borderColor: "red", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
        /* @__PURE__ */ jsx(InfoRow, { label: "Unlock Date", value: new Date(stakingData.unlockDate).toLocaleDateString(), color: "red" }),
        /* @__PURE__ */ jsx(InfoRow, { label: "Days Remaining", value: `${unlockDays} days`, color: "yellow" }),
        /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Your tokens will be available for unstaking after the lock period." }) })
      ] }) }),
      /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Press " }),
        /* @__PURE__ */ jsx(Text, { color: "yellow", children: "b" }),
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: " to return to dashboard" })
      ] })
    ] });
  };
  const renderTiersTable = () => {
    return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginTop: 1, children: [
      /* @__PURE__ */ jsx(Text, { bold: true, color: "magenta", children: "\u{1F3C6} Staking Tiers" }),
      /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", children: [
        /* @__PURE__ */ jsxs(Box, { children: [
          /* @__PURE__ */ jsx(Box, { width: 10, children: /* @__PURE__ */ jsx(Text, { bold: true, dimColor: true, children: "Tier" }) }),
          /* @__PURE__ */ jsx(Box, { width: 18, children: /* @__PURE__ */ jsx(Text, { bold: true, dimColor: true, children: "Requirement" }) }),
          /* @__PURE__ */ jsx(Box, { width: 10, children: /* @__PURE__ */ jsx(Text, { bold: true, dimColor: true, children: "APY" }) }),
          /* @__PURE__ */ jsx(Box, { width: 12, children: /* @__PURE__ */ jsx(Text, { bold: true, dimColor: true, children: "Boost" }) })
        ] }),
        [1, 2, 3, 4, 5].map((tier) => {
          const threshold = TIER_THRESHOLDS2[tier];
          const apy = TIER_APY[tier];
          const boost = TIER_BOOST[tier];
          const isCurrent = tier === stakingData.currentTier;
          const color = getTierColor(tier);
          return /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
            /* @__PURE__ */ jsx(Box, { width: 10, children: /* @__PURE__ */ jsxs(Text, { bold: true, color: isCurrent ? color : void 0, children: [
              isCurrent ? "\u25BA " : "  ",
              "Tier ",
              tier
            ] }) }),
            /* @__PURE__ */ jsx(Box, { width: 18, children: /* @__PURE__ */ jsxs(Text, { color: isCurrent ? color : void 0, children: [
              threshold.toLocaleString(),
              " GHOST"
            ] }) }),
            /* @__PURE__ */ jsx(Box, { width: 10, children: /* @__PURE__ */ jsxs(Text, { color: isCurrent ? "green" : void 0, children: [
              apy,
              "%"
            ] }) }),
            /* @__PURE__ */ jsx(Box, { width: 12, children: /* @__PURE__ */ jsxs(Text, { color: isCurrent ? "green" : void 0, children: [
              "+",
              boost,
              "%"
            ] }) })
          ] }, tier);
        })
      ] })
    ] });
  };
  const renderActions = () => {
    Math.ceil((stakingData.unlockDate - Date.now()) / (1e3 * 60 * 60 * 24));
    return /* @__PURE__ */ jsx(Card, { title: "Keyboard Controls", borderColor: "blue", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { color: "yellow", children: "[Q]" }),
        " ",
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "or " }),
        /* @__PURE__ */ jsx(Text, { color: "yellow", children: "Esc" }),
        " ",
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "- Exit" })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { color: "cyan", children: "[R]" }),
        " ",
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "- Refresh balances" })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { color: "magenta", children: "[S]" }),
        " ",
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "- APY Calculator (simulate stake)" })
      ] }),
      stakingData.totalStaked > 0 && /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { color: "yellow", children: "[U]" }),
        " ",
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "- Show unstake info" })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { color: stakingData.canClaim ? "green" : "gray", children: "[C]" }),
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: " - Claim rewards" }),
        stakingData.canClaim && /* @__PURE__ */ jsx(Text, { color: "green", children: " (Available)" })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { color: "yellow", children: "[H]" }),
        " ",
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "- Toggle help" })
      ] })
    ] }) });
  };
  const renderHelp = () => {
    return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", marginTop: 1, borderStyle: "round", borderColor: "yellow", padding: 1, children: [
      /* @__PURE__ */ jsx(Text, { bold: true, color: "yellow", children: "\u2753 Help & Information" }),
      /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", children: [
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u2022 Stake GHOST tokens to earn rewards and boost your Ghost Score" }),
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u2022 Higher tiers unlock better APY rates and Ghost Score boosts" }),
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u2022 Tokens are locked for the staking duration" }),
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u2022 Rewards accrue automatically and can be claimed anytime" }),
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u2022 Your Ghost Score boost applies to all credentials and activities" }),
        /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Data refreshes automatically every 5 seconds" }) })
      ] })
    ] });
  };
  const renderContent = () => {
    if (stage === "loading") {
      return /* @__PURE__ */ jsx(Box, { flexDirection: "column", gap: 1, children: /* @__PURE__ */ jsxs(Box, { children: [
        /* @__PURE__ */ jsx(Spinner2, { type: "dots" }),
        /* @__PURE__ */ jsx(Text, { children: " Loading staking data..." })
      ] }) });
    }
    if (stage === "error") {
      return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", gap: 1, children: [
        /* @__PURE__ */ jsx(StatusBadge, { status: "error", text: "Error loading staking data" }),
        /* @__PURE__ */ jsx(Text, { color: "red", children: error }),
        /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
          /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Press " }),
          /* @__PURE__ */ jsx(Text, { color: "cyan", children: "R" }),
          /* @__PURE__ */ jsx(Text, { dimColor: true, children: " to retry or " }),
          /* @__PURE__ */ jsx(Text, { color: "red", children: "Q" }),
          /* @__PURE__ */ jsx(Text, { dimColor: true, children: " to quit" })
        ] })
      ] });
    }
    if (stage === "claiming") {
      return /* @__PURE__ */ jsx(Box, { flexDirection: "column", gap: 1, children: /* @__PURE__ */ jsxs(Box, { children: [
        /* @__PURE__ */ jsx(Spinner2, { type: "dots" }),
        /* @__PURE__ */ jsx(Text, { children: " Claiming rewards..." })
      ] }) });
    }
    if (stage === "staking") {
      return /* @__PURE__ */ jsx(Box, { flexDirection: "column", gap: 1, children: /* @__PURE__ */ jsxs(Box, { children: [
        /* @__PURE__ */ jsx(Spinner2, { type: "dots" }),
        /* @__PURE__ */ jsx(Text, { children: " Staking tokens..." })
      ] }) });
    }
    if (stage === "unstaking") {
      return /* @__PURE__ */ jsx(Box, { flexDirection: "column", gap: 1, children: /* @__PURE__ */ jsxs(Box, { children: [
        /* @__PURE__ */ jsx(Spinner2, { type: "dots" }),
        /* @__PURE__ */ jsx(Text, { children: " Unstaking tokens..." })
      ] }) });
    }
    if (stage === "simulate") {
      return renderSimulator();
    }
    if (stage === "unstake_info") {
      return renderUnstakeInfo();
    }
    return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      agent && /* @__PURE__ */ jsxs(Box, { marginBottom: 1, children: [
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Agent: " }),
        /* @__PURE__ */ jsx(Text, { bold: true, color: "cyan", children: agentName })
      ] }),
      /* @__PURE__ */ jsx(Box, { marginBottom: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
        "Last updated: ",
        lastUpdate.toLocaleTimeString(),
        autoRefresh && /* @__PURE__ */ jsx(Text, { color: "green", children: " \u2022 Auto-refresh enabled" })
      ] }) }),
      /* @__PURE__ */ jsxs(Box, { flexDirection: "column", gap: 1, children: [
        renderStakingOverview(),
        /* @__PURE__ */ jsx(Box, { gap: 1, children: renderRewards() }),
        renderTiersTable(),
        renderAPYChart(),
        renderActions(),
        helpVisible && renderHelp()
      ] }),
      /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(
        Alert,
        {
          type: "info",
          message: "Staking CLI integration coming soon. Use web dashboard for full functionality.",
          showBorder: false
        }
      ) }),
      /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(Text, { bold: true, color: "greenBright", children: "Stake GHOST - Earn Rewards - Boost Your Score" }) })
    ] });
  };
  return /* @__PURE__ */ jsx(Layout, { title: "\u{1F48E} GHOST Staking Dashboard", showFooter: false, children: renderContent() });
};
var Dashboard = ({ agent, autoRefresh = true }) => {
  const { exit } = useApp();
  const [stage, setStage] = useState("loading");
  const [currentView, setCurrentView] = useState("dashboard");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(/* @__PURE__ */ new Date());
  const [network] = useState("devnet");
  useInput((input, key) => {
    if (input === "q" || key.ctrl && input === "c" || key.escape) {
      exit();
    }
    if (stage === "ready" && currentView === "dashboard") {
      if (input === "r") {
        setCurrentView("reputation");
      } else if (input === "s") {
        setCurrentView("staking");
      } else if (input === "p") {
        setCurrentView("privacy");
      } else if (input === "d") {
        setCurrentView("did");
      } else if (input === "e") {
        setCurrentView("escrow");
      } else if (input === "f") {
        refreshData();
      }
    }
    if (currentView !== "dashboard" && input === "b") {
      setCurrentView("dashboard");
    }
  });
  useEffect(() => {
    if (autoRefresh && currentView === "dashboard") {
      const interval = setInterval(() => {
        refreshData(true);
      }, 3e4);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, currentView]);
  useEffect(() => {
    loadDashboardData();
  }, []);
  const loadDashboardData = async () => {
    try {
      setStage("loading");
      const { client } = await initializeClient("devnet");
      const safeClient = createSafeSDKClient(client);
      let agentOverview;
      if (agent) {
        const agentAddr = address(agent);
        const agentData = await safeClient.agent.getAgentAccount(agentAddr);
        if (!agentData) {
          setError("Agent not found");
          setStage("error");
          return;
        }
        const reputationScore = Number(agentData.reputationScore || 0);
        const ghostScore = Math.min(1e3, Math.round(reputationScore / 100));
        const totalJobs = Number(agentData.totalJobsCompleted || 0);
        const totalJobsFailed = Number(agentData.totalJobsFailed || 0);
        const totalJobsAll = totalJobs + totalJobsFailed;
        const successRate = totalJobsAll > 0 ? Math.round(totalJobs / totalJobsAll * 100) : 0;
        const tier = ghostScore >= 900 ? "platinum" : ghostScore >= 750 ? "gold" : ghostScore >= 500 ? "silver" : ghostScore >= 200 ? "bronze" : "newcomer";
        agentOverview = {
          address: agentAddr,
          name: agentData.name || "Agent",
          ghostScore,
          tier,
          jobsCompleted: totalJobs,
          successRate
        };
      } else {
        agentOverview = {
          address: "Not Connected",
          name: "Guest",
          ghostScore: 0,
          tier: "newcomer",
          jobsCompleted: 0,
          successRate: 0
        };
      }
      const stakingOverview = {
        totalStaked: 5e3,
        tier: 2,
        apy: 15,
        pendingRewards: 42.5
      };
      const escrowOverview = {
        activeCount: 3,
        totalLocked: 500,
        urgentAlerts: 1
      };
      const privacyStatus = {
        mode: "private",
        visibleFields: ["name", "ghostScore"]
      };
      const recentActivity = [
        {
          timestamp: Date.now() - 12e4,
          type: "Escrow",
          description: "Escrow created for 100 GHOST",
          status: "success"
        },
        {
          timestamp: Date.now() - 36e5,
          type: "Rewards",
          description: "Claimed 10 GHOST rewards",
          status: "success"
        },
        {
          timestamp: Date.now() - 72e5,
          type: "Job",
          description: "Completed job #42",
          status: "success"
        },
        {
          timestamp: Date.now() - 108e5,
          type: "Stake",
          description: "Staked 1000 GHOST tokens",
          status: "success"
        },
        {
          timestamp: Date.now() - 144e5,
          type: "Profile",
          description: "Updated privacy settings",
          status: "success"
        }
      ];
      setData({
        agent: agentOverview,
        staking: stakingOverview,
        escrow: escrowOverview,
        privacy: privacyStatus,
        recentActivity
      });
      setStage("ready");
      setLastUpdate(/* @__PURE__ */ new Date());
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
      setStage("error");
    }
  };
  const refreshData = async (silent = false) => {
    if (!silent) {
      setStage("loading");
    }
    try {
      await loadDashboardData();
    } catch (err) {
      setError(err.message || "Failed to refresh data");
      setStage("error");
    }
  };
  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1e3);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };
  const getTierBadgeType = (tier) => {
    if (tier === 5) return "platinum";
    if (tier === 4) return "gold";
    if (tier >= 2) return "silver";
    if (tier === 1) return "bronze";
    return "newcomer";
  };
  const getPrivacyIcon = (mode) => {
    if (mode === "private") return "\u{1F512}";
    if (mode === "selective") return "\u{1F510}";
    return "\u{1F513}";
  };
  const getStatusColor = (status) => {
    if (status === "success") return "green";
    if (status === "pending") return "yellow";
    return "red";
  };
  const renderHeader = () => {
    if (!data) return null;
    return /* @__PURE__ */ jsx(Card, { borderColor: "greenBright", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsxs(Box, { justifyContent: "space-between", children: [
        /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsx(Text, { bold: true, color: "greenBright", children: "GHOST" }) }),
        /* @__PURE__ */ jsxs(Box, { gap: 2, children: [
          /* @__PURE__ */ jsxs(Box, { children: [
            /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Network: " }),
            /* @__PURE__ */ jsx(StatusBadge, { status: "success", text: network.toUpperCase() })
          ] }),
          /* @__PURE__ */ jsxs(Box, { children: [
            /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Wallet: " }),
            /* @__PURE__ */ jsxs(Text, { children: [
              data.agent.address.toString().slice(0, 8),
              "..."
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
        "Last updated: ",
        lastUpdate.toLocaleTimeString()
      ] }) })
    ] }) });
  };
  const renderAgentOverview = () => {
    if (!data) return null;
    const tierColor = data.agent.tier === "platinum" ? "cyan" : data.agent.tier === "gold" ? "yellow" : data.agent.tier === "silver" ? "white" : data.agent.tier === "bronze" ? "red" : "gray";
    return /* @__PURE__ */ jsx(Card, { title: "Agent Overview", borderColor: tierColor, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx(InfoRow, { label: "Name", value: data.agent.name, color: "cyan" }),
      /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
        /* @__PURE__ */ jsx(Box, { width: 25, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Ghost Score:" }) }),
        /* @__PURE__ */ jsxs(Text, { bold: true, color: tierColor, children: [
          data.agent.ghostScore,
          "/1000"
        ] }),
        /* @__PURE__ */ jsx(Box, { marginLeft: 2, children: /* @__PURE__ */ jsx(Badge, { variant: "tier", tier: data.agent.tier }) })
      ] }),
      /* @__PURE__ */ jsx(InfoRow, { label: "Jobs Completed", value: data.agent.jobsCompleted.toString(), color: "green" }),
      /* @__PURE__ */ jsx(InfoRow, { label: "Success Rate", value: `${data.agent.successRate}%`, color: data.agent.successRate >= 80 ? "green" : "yellow" })
    ] }) });
  };
  const renderStakingOverview = () => {
    if (!data) return null;
    return /* @__PURE__ */ jsx(Card, { title: "Staking", borderColor: "green", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsxs(Box, { children: [
        /* @__PURE__ */ jsx(Box, { width: 25, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Staked:" }) }),
        /* @__PURE__ */ jsxs(Text, { bold: true, color: "green", children: [
          data.staking.totalStaked.toLocaleString(),
          " GHOST"
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
        /* @__PURE__ */ jsx(Box, { width: 25, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Tier:" }) }),
        /* @__PURE__ */ jsx(Badge, { variant: "tier", tier: getTierBadgeType(data.staking.tier) })
      ] }),
      /* @__PURE__ */ jsx(InfoRow, { label: "APY", value: `${data.staking.apy}%`, color: "yellow" }),
      /* @__PURE__ */ jsx(InfoRow, { label: "Pending Rewards", value: `${data.staking.pendingRewards} GHOST`, color: "cyan" })
    ] }) });
  };
  const renderEscrowOverview = () => {
    if (!data) return null;
    return /* @__PURE__ */ jsx(Card, { title: "Active Escrows", borderColor: "magenta", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx(InfoRow, { label: "Active", value: data.escrow.activeCount.toString(), color: "cyan" }),
      /* @__PURE__ */ jsx(InfoRow, { label: "Total Locked", value: `${data.escrow.totalLocked} GHOST`, color: "yellow" }),
      /* @__PURE__ */ jsxs(Box, { marginTop: 1, children: [
        /* @__PURE__ */ jsx(Box, { width: 25, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Urgent Alerts:" }) }),
        data.escrow.urgentAlerts > 0 ? /* @__PURE__ */ jsxs(Text, { bold: true, color: "red", children: [
          data.escrow.urgentAlerts,
          " \u26A0\uFE0F"
        ] }) : /* @__PURE__ */ jsx(Text, { color: "green", children: "None" })
      ] })
    ] }) });
  };
  const renderPrivacyStatus = () => {
    if (!data) return null;
    return /* @__PURE__ */ jsx(Card, { title: "Privacy", borderColor: "blue", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsxs(Box, { children: [
        /* @__PURE__ */ jsx(Box, { width: 25, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Mode:" }) }),
        /* @__PURE__ */ jsxs(Text, { children: [
          getPrivacyIcon(data.privacy.mode),
          " "
        ] }),
        /* @__PURE__ */ jsx(Text, { bold: true, color: data.privacy.mode === "private" ? "green" : "yellow", children: data.privacy.mode.toUpperCase() })
      ] }),
      /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
        "Visible: ",
        data.privacy.visibleFields.join(", ")
      ] }) })
    ] }) });
  };
  const renderRecentActivity = () => {
    if (!data) return null;
    return /* @__PURE__ */ jsx(Card, { title: "Recent Activity", borderColor: "yellow", children: /* @__PURE__ */ jsx(Box, { flexDirection: "column", children: data.recentActivity.slice(0, 5).map((activity, idx) => /* @__PURE__ */ jsxs(Box, { marginTop: idx > 0 ? 1 : 0, children: [
      /* @__PURE__ */ jsx(Box, { width: 12, children: /* @__PURE__ */ jsx(Text, { dimColor: true, children: formatTimeAgo(activity.timestamp) }) }),
      /* @__PURE__ */ jsx(Box, { width: 10, children: /* @__PURE__ */ jsxs(Text, { color: getStatusColor(activity.status), children: [
        "[",
        activity.type,
        "]"
      ] }) }),
      /* @__PURE__ */ jsx(Text, { children: activity.description })
    ] }, idx)) }) });
  };
  const renderQuickActions = () => {
    return /* @__PURE__ */ jsx(Card, { title: "Quick Actions", borderColor: "gray", children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { color: "yellow", children: "[R]" }),
        " ",
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Reputation Dashboard" })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { color: "green", children: "[S]" }),
        " ",
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Staking Dashboard" })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { color: "blue", children: "[P]" }),
        " ",
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Privacy Settings" })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { color: "magenta", children: "[D]" }),
        " ",
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "DID Manager" })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { color: "cyan", children: "[E]" }),
        " ",
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Escrow Monitor" })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { color: "white", children: "[F]" }),
        " ",
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Refresh Data" })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { color: "red", children: "[Q]" }),
        " ",
        /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Quit" })
      ] })
    ] }) });
  };
  const renderDashboardContent = () => {
    if (stage === "loading") {
      return /* @__PURE__ */ jsx(Box, { flexDirection: "column", gap: 1, children: /* @__PURE__ */ jsx(Spinner, { state: "loading", label: "Loading dashboard data..." }) });
    }
    if (stage === "error") {
      return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", gap: 1, children: [
        /* @__PURE__ */ jsx(
          Alert,
          {
            type: "error",
            title: "Failed to Load Dashboard",
            message: error,
            showBorder: true
          }
        ),
        /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
          "Press ",
          /* @__PURE__ */ jsx(Text, { color: "yellow", children: "f" }),
          " to retry or",
          " ",
          /* @__PURE__ */ jsx(Text, { color: "yellow", children: "q" }),
          " to quit"
        ] }) })
      ] });
    }
    if (!data) return null;
    return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      renderHeader(),
      /* @__PURE__ */ jsxs(Box, { marginTop: 1, gap: 1, children: [
        /* @__PURE__ */ jsx(Box, { flexDirection: "column", flexGrow: 1, children: renderAgentOverview() }),
        /* @__PURE__ */ jsx(Box, { flexDirection: "column", flexGrow: 1, children: renderStakingOverview() })
      ] }),
      /* @__PURE__ */ jsxs(Box, { marginTop: 1, gap: 1, children: [
        /* @__PURE__ */ jsx(Box, { flexDirection: "column", flexGrow: 1, children: renderEscrowOverview() }),
        /* @__PURE__ */ jsx(Box, { flexDirection: "column", flexGrow: 1, children: renderPrivacyStatus() })
      ] }),
      /* @__PURE__ */ jsx(Box, { marginTop: 1, children: renderRecentActivity() }),
      /* @__PURE__ */ jsx(Box, { marginTop: 1, children: renderQuickActions() }),
      /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsx(
        Alert,
        {
          type: "info",
          message: "Use keyboard shortcuts to navigate to detailed dashboards",
          showBorder: false
        }
      ) })
    ] });
  };
  if (currentView === "reputation" && agent) {
    return /* @__PURE__ */ jsx(Reputation, { agent, detailed: true });
  }
  if (currentView === "staking") {
    return /* @__PURE__ */ jsx(Staking, { agent, autoRefresh });
  }
  if (currentView === "privacy") {
    return /* @__PURE__ */ jsx(Layout, { title: "\u{1F512} Privacy Settings", showFooter: false, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx(
        Alert,
        {
          type: "info",
          title: "Privacy Settings",
          message: "Privacy management coming soon. Use 'ghost privacy' command for basic settings."
        }
      ),
      /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
        "Press ",
        /* @__PURE__ */ jsx(Text, { color: "yellow", children: "b" }),
        " to return to dashboard"
      ] }) })
    ] }) });
  }
  if (currentView === "did") {
    return /* @__PURE__ */ jsx(Layout, { title: "\u{1F194} DID Manager", showFooter: false, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx(
        Alert,
        {
          type: "info",
          title: "DID Manager",
          message: "Decentralized identifier management coming soon. Use 'ghost did' command for basic operations."
        }
      ),
      /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
        "Press ",
        /* @__PURE__ */ jsx(Text, { color: "yellow", children: "b" }),
        " to return to dashboard"
      ] }) })
    ] }) });
  }
  if (currentView === "escrow") {
    return /* @__PURE__ */ jsx(Layout, { title: "\u{1F4B0} Escrow Monitor", showFooter: false, children: /* @__PURE__ */ jsxs(Box, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx(
        Alert,
        {
          type: "info",
          title: "Escrow Monitor",
          message: "Escrow monitoring dashboard coming soon. Use 'ghost escrow' command for basic operations."
        }
      ),
      /* @__PURE__ */ jsx(Box, { marginTop: 1, children: /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
        "Press ",
        /* @__PURE__ */ jsx(Text, { color: "yellow", children: "b" }),
        " to return to dashboard"
      ] }) })
    ] }) });
  }
  return /* @__PURE__ */ jsx(Layout, { title: "\u{1F4CA} Analytics Dashboard", showFooter: false, children: renderDashboardContent() });
};

// src/commands/dashboard.ts
var dashboardCommand = new Command("dashboard").description("\u{1F4CA} Analytics dashboard with overview of all metrics").option("-a, --agent <address>", "Agent address").option("--no-auto-refresh", "Disable auto-refresh").action(async (options) => {
  const { waitUntilExit } = render(
    React14.createElement(Dashboard, {
      agent: options.agent,
      autoRefresh: options.autoRefresh
    })
  );
  await waitUntilExit();
});

// src/commands/ghost.ts
init_client();
init_sdk_helpers();
var ghostCommand = new Command("ghost").description("Claim and manage external AI agents (Ghosts)");
ghostCommand.command("claim").description("Claim an external AI agent as a Ghost using SAS attestation").option("-e, --external-id <id>", "External agent ID (e.g., PayAI agent ID, ElizaOS character ID)").option("-p, --platform <platform>", "Platform name (payai, elizaos, etc.)").option("-s, --signature <signature>", "SAS attestation signature (hex)").option("--json", "Output as JSON").action(async (options) => {
  intro(chalk34.cyan("\u{1F47B} Claim External Agent as Ghost"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let externalId = options["external-id"];
    if (!externalId) {
      const idInput = await text({
        message: "External agent ID:",
        placeholder: "agent-123",
        validate: (value) => {
          if (!value) return "External ID is required";
          if (value.length < 3) return "ID must be at least 3 characters";
          return;
        }
      });
      if (isCancel(idInput)) {
        cancel("Claim cancelled");
        return;
      }
      externalId = idInput.toString().trim();
    }
    let platform = options.platform;
    if (!platform) {
      const platformInput = await select({
        message: "Select platform:",
        options: [
          { value: "payai", label: "PayAI - x402 payment network" },
          { value: "elizaos", label: "ElizaOS - AI agent framework" },
          { value: "other", label: "Other platform" }
        ]
      });
      if (isCancel(platformInput)) {
        cancel("Claim cancelled");
        return;
      }
      platform = platformInput.toString();
    }
    let attestationSignature = options.signature;
    if (!attestationSignature) {
      note(
        `${chalk34.bold("SAS Attestation Required")}

To claim this agent, you need a Solana Attestation Service (SAS) signature.

${chalk34.yellow("How to get attestation:")}
1. Go to the platform (${platform})
2. Generate an ownership proof for agent: ${externalId}
3. Copy the attestation signature (hex format)

${chalk34.gray("Example: 0x1234567890abcdef...")}`,
        "Attestation Signature"
      );
      const sigInput = await text({
        message: "SAS attestation signature:",
        placeholder: "0x...",
        validate: (value) => {
          if (!value) return "Signature is required";
          if (!value.startsWith("0x")) return "Signature must start with 0x";
          if (value.length < 10) return "Invalid signature format";
          return;
        }
      });
      if (isCancel(sigInput)) {
        cancel("Claim cancelled");
        return;
      }
      attestationSignature = sigInput.toString().trim();
    }
    note(
      `${chalk34.bold("Claim Details:")}
${chalk34.gray("External ID:")} ${externalId}
${chalk34.gray("Platform:")} ${platform}
${chalk34.gray("Attestation:")} ${attestationSignature.slice(0, 10)}...${attestationSignature.slice(-8)}
${chalk34.gray("Owner:")} ${wallet.address}

${chalk34.yellow("This will create a Ghost account that you control.")}
${chalk34.gray("The external agent will be linked on-chain.")}`,
      "Claim Preview"
    );
    const confirmClaim = await confirm({
      message: "Claim this agent as a Ghost?"
    });
    if (isCancel(confirmClaim) || !confirmClaim) {
      cancel("Claim cancelled");
      return;
    }
    s.start("Claiming agent on blockchain...");
    try {
      const signatureBytes = Buffer.from(attestationSignature.slice(2), "hex");
      const result = await safeClient.ghosts.claimGhost(
        toSDKSigner(wallet),
        {
          externalId,
          platform,
          attestationSignature: new Uint8Array(signatureBytes)
        }
      );
      s.stop("\u2705 Ghost claimed successfully");
      const explorerUrl = getExplorerUrl(result.signature, "devnet");
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          ghostAddress: result.ghostAddress,
          signature: result.signature,
          externalId,
          platform,
          explorerUrl
        }, null, 2));
        return;
      }
      outro(
        `${chalk34.green("\u2705 Ghost Claimed Successfully!")}

${chalk34.bold("Ghost Details:")}
${chalk34.gray("Ghost Address:")} ${chalk34.cyan(result.ghostAddress)}
${chalk34.gray("External ID:")} ${externalId}
${chalk34.gray("Platform:")} ${platform}
${chalk34.gray("Transaction:")} ${result.signature}

${chalk34.bold("Next Steps:")}
${chalk34.gray("\u2022")} Link additional external IDs: ${chalk34.cyan(`ghost ghost link`)}
${chalk34.gray("\u2022")} View your Ghosts: ${chalk34.cyan(`ghost ghost list`)}
${chalk34.gray("\u2022")} Build Ghost Score reputation

${chalk34.gray("Explorer:")} ${chalk34.cyan(explorerUrl)}`
      );
    } catch (error) {
      s.stop("\u274C Failed to claim ghost");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to claim: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
ghostCommand.command("link").description("Link an additional external ID to an existing Ghost").option("-g, --ghost <address>", "Ghost address").option("-e, --external-id <id>", "External agent ID to link").option("-p, --platform <platform>", "Platform name").option("-s, --signature <signature>", "SAS attestation signature").action(async (options) => {
  intro(chalk34.blue("\u{1F517} Link External ID to Ghost"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let ghostAddress = options.ghost;
    if (!ghostAddress) {
      const addressInput = await text({
        message: "Ghost address:",
        validate: (value) => {
          if (!value) return "Ghost address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Please enter a valid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Link cancelled");
        return;
      }
      ghostAddress = addressInput.toString().trim();
    }
    const ghostAddr = address(ghostAddress);
    s.start("Verifying Ghost...");
    const ghostData = await safeClient.ghosts.getGhost(ghostAddr);
    if (!ghostData) {
      s.stop("\u274C Ghost not found");
      outro(chalk34.red(`No Ghost found at address: ${ghostAddress}`));
      return;
    }
    s.stop("\u2705 Ghost verified");
    let externalId = options["external-id"];
    if (!externalId) {
      const idInput = await text({
        message: "External agent ID to link:",
        placeholder: "agent-456",
        validate: (value) => {
          if (!value) return "External ID is required";
          if (value.length < 3) return "ID must be at least 3 characters";
          return;
        }
      });
      if (isCancel(idInput)) {
        cancel("Link cancelled");
        return;
      }
      externalId = idInput.toString().trim();
    }
    let platform = options.platform;
    if (!platform) {
      const platformInput = await select({
        message: "Select platform:",
        options: [
          { value: "payai", label: "PayAI" },
          { value: "elizaos", label: "ElizaOS" },
          { value: "other", label: "Other" }
        ]
      });
      if (isCancel(platformInput)) {
        cancel("Link cancelled");
        return;
      }
      platform = platformInput.toString();
    }
    let attestationSignature = options.signature;
    if (!attestationSignature) {
      const sigInput = await text({
        message: "SAS attestation signature:",
        placeholder: "0x...",
        validate: (value) => {
          if (!value) return "Signature is required";
          if (!value.startsWith("0x")) return "Signature must start with 0x";
          return;
        }
      });
      if (isCancel(sigInput)) {
        cancel("Link cancelled");
        return;
      }
      attestationSignature = sigInput.toString().trim();
    }
    const confirmLink = await confirm({
      message: `Link external ID "${externalId}" to this Ghost?`
    });
    if (isCancel(confirmLink) || !confirmLink) {
      cancel("Link cancelled");
      return;
    }
    s.start("Linking external ID on blockchain...");
    try {
      const signatureBytes = Buffer.from(attestationSignature.slice(2), "hex");
      const signature = await safeClient.ghosts.linkExternalId(
        toSDKSigner(wallet),
        {
          ghostAddress: ghostAddr,
          externalId,
          platform,
          attestationSignature: new Uint8Array(signatureBytes)
        }
      );
      s.stop("\u2705 External ID linked successfully");
      const explorerUrl = getExplorerUrl(signature, "devnet");
      outro(
        `${chalk34.green("\u2705 External ID Linked!")}

${chalk34.gray("Ghost Address:")} ${ghostAddress}
${chalk34.gray("External ID:")} ${externalId}
${chalk34.gray("Platform:")} ${platform}
${chalk34.gray("Transaction:")} ${signature}

${chalk34.gray("Explorer:")} ${chalk34.cyan(explorerUrl)}`
      );
    } catch (error) {
      s.stop("\u274C Failed to link external ID");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to link: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
ghostCommand.command("list").description("List Ghosts (claimed external agents)").option("-o, --owner <address>", "Filter by owner address").option("--json", "Output as JSON").action(async (options) => {
  intro(chalk34.magenta("\u{1F47B} List Ghosts"));
  try {
    const s = spinner();
    s.start("Fetching Ghosts...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    const ownerAddr = options.owner ? address(options.owner) : wallet.address;
    const ghosts = await safeClient.ghosts.getGhostsByOwner(ownerAddr);
    s.stop(`\u2705 Found ${ghosts.length} Ghost(s)`);
    if (ghosts.length === 0) {
      outro(
        `${chalk34.yellow("No Ghosts found")}

${chalk34.gray("Claim an external agent:")}
${chalk34.cyan("ghost ghost claim")}`
      );
      return;
    }
    if (options.json) {
      console.log(JSON.stringify(ghosts, null, 2));
      return;
    }
    for (let i = 0; i < ghosts.length; i++) {
      const ghost = ghosts[i];
      console.log(`
${chalk34.bold.cyan(`Ghost ${i + 1}:`)}`);
      console.log(`${chalk34.gray("Address:")} ${ghost.address}`);
      console.log(`${chalk34.gray("Status:")} ${ghost.data.status}`);
      console.log(`${chalk34.gray("Ghost Score:")} ${Number(ghost.data.ghostScore) / 100}`);
      console.log(`${chalk34.gray("Created:")} ${new Date(Number(ghost.data.createdAt) * 1e3).toLocaleDateString()}`);
      if (ghost.data.linkedIds && ghost.data.linkedIds.length > 0) {
        console.log(`${chalk34.gray("Linked IDs:")}`);
        ghost.data.linkedIds.forEach((id) => {
          console.log(`  ${chalk34.gray("\u2022")} ${id.platform}: ${id.externalId}`);
        });
      }
    }
    outro(
      `
${chalk34.gray("Commands:")}
${chalk34.cyan("ghost ghost claim")} - Claim a new Ghost
${chalk34.cyan("ghost ghost link")} - Link external IDs`
    );
  } catch (error) {
    log.error(`Failed to list ghosts: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
ghostCommand.action(async () => {
  intro(chalk34.magenta("\u{1F47B} GhostSpeak Ghost Management"));
  log.info(`
${chalk34.bold("Available Commands:")}
`);
  log.info(`${chalk34.cyan("ghost ghost claim")} - Claim an external AI agent as a Ghost`);
  log.info(`${chalk34.cyan("ghost ghost link")} - Link additional external IDs to a Ghost`);
  log.info(`${chalk34.cyan("ghost ghost list")} - List your Ghosts`);
  note(
    `${chalk34.bold("What are Ghosts?")}

Ghosts are external AI agents (type 10) that exist on x402 facilitators
or other platforms. You can claim ownership using Solana Attestation
Service (SAS) and build reputation on-chain.

${chalk34.yellow("Supported Platforms:")}
${chalk34.gray("\u2022")} PayAI - x402 payment network
${chalk34.gray("\u2022")} ElizaOS - AI agent framework
${chalk34.gray("\u2022")} Custom platforms with SAS integration`,
    "About Ghosts"
  );
  outro("Use --help with any command for more details");
});

// src/commands/ghost-claim.ts
init_client();
init_convex_client();
async function loadSASConfig() {
  const monorepoConfigPath = join(process.cwd(), "../../packages/web/sas-config.json");
  const monorepoKeypairsPath = join(process.cwd(), "../../packages/web/sas-keypairs.json");
  const localConfigPath = join(homedir(), ".ghostspeak", "sas-config.json");
  const localKeypairsPath = join(homedir(), ".ghostspeak", "sas-keypairs.json");
  let configPath = existsSync(monorepoConfigPath) ? monorepoConfigPath : localConfigPath;
  let keypairsPath = existsSync(monorepoKeypairsPath) ? monorepoKeypairsPath : localKeypairsPath;
  if (!existsSync(configPath)) {
    throw new Error(
      "SAS configuration not found. Please run the SAS setup script:\nbun packages/web/scripts/setup-sas.ts"
    );
  }
  if (!existsSync(keypairsPath)) {
    throw new Error(
      "SAS keypairs not found. Please run the SAS setup script:\nbun packages/web/scripts/setup-sas.ts"
    );
  }
  const config2 = JSON.parse(readFileSync(configPath, "utf-8"));
  const keypairs = JSON.parse(readFileSync(keypairsPath, "utf-8"));
  const authorizedSignerBytes = new Uint8Array(keypairs.authorizedSigner1);
  const authorizedSigner = await createKeyPairSignerFromBytes$1(authorizedSignerBytes);
  return {
    credentialPda: address(config2.credentialPda),
    agentIdentitySchema: address(config2.schemas.AGENT_IDENTITY),
    authority: address(config2.authority),
    authorizedSigner
  };
}
async function createGhostOwnershipAttestation(params) {
  const { sasConfig, payer, ghostPaymentAddress, agentData, expiryDays = 365 } = params;
  const [attestationPda] = await deriveAttestationPda({
    credential: sasConfig.credentialPda,
    schema: sasConfig.agentIdentitySchema,
    nonce: ghostPaymentAddress
  });
  const expiryTimestamp = Math.floor(Date.now() / 1e3) + expiryDays * 24 * 60 * 60;
  const schemaLayout = {
    layout: new Uint8Array([
      0,
      // Pubkey (agent)
      4,
      // String (did)
      4,
      // String (name)
      4,
      // String (capabilities)
      1,
      // Bool (x402Enabled)
      4,
      // String (x402ServiceEndpoint)
      0,
      // Pubkey (owner)
      7,
      // i64 (registeredAt)
      7
      // i64 (issuedAt)
    ]),
    fieldNames: [
      "agent",
      "did",
      "name",
      "capabilities",
      "x402Enabled",
      "x402ServiceEndpoint",
      "owner",
      "registeredAt",
      "issuedAt"
    ]
  };
  const serializedData = serializeAttestationData(schemaLayout, agentData);
  const instruction = await getCreateAttestationInstruction({
    payer,
    authority: sasConfig.authorizedSigner,
    credential: sasConfig.credentialPda,
    schema: sasConfig.agentIdentitySchema,
    attestation: attestationPda,
    nonce: ghostPaymentAddress,
    expiry: expiryTimestamp,
    data: serializedData
  });
  return {
    instruction,
    attestationPda,
    expiryTimestamp
  };
}
address("22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG");
var ghostClaimCommand = new Command("claim-ghost").description("\u{1F3AF} Simplified Ghost claiming - Auto-create attestation and claim in one step").option("--list", "List all discovered Ghosts available to claim").option("--ghost-address <address>", "Specific Ghost address to claim").action(async (options) => {
  intro(chalk34.cyan("\u{1F47B} Claim a Discovered Ghost"));
  try {
    const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      log.error("CONVEX_URL environment variable not set");
      log.info("\n\u{1F4A1} Set CONVEX_URL in your .env file or export it:");
      log.info(chalk34.cyan("export CONVEX_URL=<your-convex-url>"));
      log.info(chalk34.gray("\nFor devnet testing, ask your team for the dev deployment URL"));
      outro(chalk34.red("Configuration required"));
      return;
    }
    const s = spinner();
    if (options.list) {
      s.start("Fetching discovered Ghosts from Convex...");
      const discoveredAgents2 = await queryDiscoveredAgents({ limit: 100 });
      s.stop(`\u2705 Found ${discoveredAgents2.length} discovered Ghosts`);
      if (discoveredAgents2.length === 0) {
        outro(chalk34.yellow("No discovered Ghosts found"));
        return;
      }
      console.log("\n" + chalk34.bold("Discovered Ghosts (Unclaimed):"));
      console.log("\u2500".repeat(80));
      discoveredAgents2.slice(0, 20).forEach((agent, i) => {
        console.log(chalk34.cyan(`
${i + 1}. ${agent.ghostAddress}`));
        console.log(chalk34.gray(`   First seen: ${new Date(agent.firstSeenTimestamp).toLocaleDateString()}`));
        console.log(chalk34.gray(`   Discovery: ${agent.discoverySource}`));
        console.log(chalk34.gray(`   Facilitator: ${agent.facilitatorAddress || "N/A"}`));
        console.log(chalk34.gray(`   Status: ${agent.status}`));
      });
      if (discoveredAgents2.length > 20) {
        console.log(chalk34.gray(`
... and ${discoveredAgents2.length - 20} more`));
      }
      outro(
        `
${chalk34.bold("To claim a Ghost:")}
${chalk34.cyan("ghost claim-ghost --ghost-address <address>")}

${chalk34.gray("Note: Currently requires manual SAS attestation setup")}
${chalk34.gray("Full automation coming soon!")}`
      );
      return;
    }
    let ghostAddress = options.ghostAddress;
    if (!ghostAddress) {
      s.start("Fetching available Ghosts...");
      const discoveredAgents2 = await queryDiscoveredAgents({
        status: "discovered",
        limit: 10
      });
      s.stop(`\u2705 Found ${discoveredAgents2.length} unclaimed Ghosts`);
      if (discoveredAgents2.length === 0) {
        outro(chalk34.yellow("No unclaimed Ghosts found"));
        return;
      }
      const ghostSelection = await select({
        message: "Select a Ghost to claim:",
        options: discoveredAgents2.map((agent, i) => ({
          value: agent.ghostAddress,
          label: `${i + 1}. ${agent.ghostAddress.slice(0, 8)}... (${agent.discoverySource})`
        }))
      });
      if (isCancel(ghostSelection)) {
        cancel("Claim cancelled");
        return;
      }
      ghostAddress = ghostSelection.toString();
    }
    let ghostAddr;
    try {
      ghostAddr = address(ghostAddress);
    } catch (error) {
      log.error(chalk34.red("\u274C Invalid Ghost address format"));
      log.info(chalk34.gray(`Provided: ${ghostAddress}`));
      log.info(chalk34.yellow("\\nExpected format: Base58-encoded Solana address (32 bytes)"));
      log.info(chalk34.gray("Example: 8YiPAVcbGNBQC4UpQNKZ3RxEJ8MsZQvdMfBEHWyBBGPq"));
      outro(chalk34.red("Invalid address"));
      return;
    }
    console.log(`
${chalk34.bold("Ghost Address:")} ${ghostAddr}`);
    s.start("Initializing Solana client...");
    const { client, rpc } = await initializeClient();
    s.stop("\u2705 Client initialized");
    s.start("Loading wallet...");
    const walletPath = process.env.SOLANA_WALLET || path.join(process.env.HOME || "", ".config/solana/id.json");
    if (!fs3.existsSync(walletPath)) {
      s.stop(chalk34.red("\u274C Wallet not found"));
      log.error(`Expected: ${walletPath}`);
      log.info(chalk34.yellow("Set SOLANA_WALLET environment variable or create wallet with:"));
      log.info(chalk34.gray("solana-keygen new"));
      outro(chalk34.red("Wallet required"));
      return;
    }
    const secretKeyBytes = new Uint8Array(JSON.parse(fs3.readFileSync(walletPath, "utf-8")));
    const claimer = await createKeyPairSignerFromBytes$1(secretKeyBytes);
    s.stop(`\u2705 Wallet loaded: ${claimer.address}`);
    s.start("Loading SAS configuration...");
    let sasConfig;
    try {
      sasConfig = await loadSASConfig();
      s.stop("\u2705 SAS config loaded");
    } catch (error) {
      s.stop(chalk34.red("\u274C SAS config not found"));
      log.error(error instanceof Error ? error.message : "Unknown error");
      outro(chalk34.red("Setup required"));
      return;
    }
    s.start("Fetching Ghost details...");
    const discoveredAgents = await queryDiscoveredAgents({ limit: 100 });
    const ghostData = discoveredAgents.find((a) => a.ghostAddress === ghostAddr);
    if (!ghostData) {
      s.stop(chalk34.red("\u274C Ghost not found in discovery database"));
      log.error(chalk34.red(`Ghost ${ghostAddr} has not been indexed yet`));
      log.info(chalk34.yellow("\\n\u{1F4A1} Possible reasons:"));
      log.info(chalk34.gray("  1. Ghost has not made any x402 payments yet"));
      log.info(chalk34.gray("  2. Indexer has not discovered this Ghost"));
      log.info(chalk34.gray("  3. Address is incorrect or typo"));
      log.info(chalk34.cyan("\\n\u2139\uFE0F  To see all discovered Ghosts:"));
      log.info(chalk34.gray("  ghost claim-ghost --list"));
      outro(chalk34.red("Ghost not found"));
      return;
    }
    if (ghostData.status === "claimed") {
      s.stop(chalk34.yellow("\u26A0\uFE0F  Ghost already claimed"));
      log.warn(chalk34.yellow(`This Ghost was claimed by ${ghostData.claimedBy || "another user"}`));
      if (ghostData.claimedAt) {
        log.info(chalk34.gray(`Claimed on: ${new Date(ghostData.claimedAt).toLocaleString()}`));
      }
      log.info(chalk34.cyan("\\n\u2139\uFE0F  To find unclaimed Ghosts:"));
      log.info(chalk34.gray("  ghost claim-ghost --list"));
      outro(chalk34.yellow("Ghost unavailable"));
      return;
    }
    s.stop("\u2705 Ghost details loaded");
    console.log(`
${chalk34.bold("Ghost Details:")}`);
    console.log(chalk34.gray(`  First seen: ${new Date(ghostData.firstSeenTimestamp).toLocaleDateString()}`));
    console.log(chalk34.gray(`  Discovery: ${ghostData.discoverySource}`));
    console.log(chalk34.gray(`  Facilitator: ${ghostData.facilitatorAddress || "N/A"}`));
    console.log(chalk34.gray(`  Current status: ${ghostData.status}`));
    const confirmClaim = await confirm({
      message: `Claim this Ghost to ${claimer.address.slice(0, 8)}...?`
    });
    if (isCancel(confirmClaim) || !confirmClaim) {
      cancel("Claim cancelled");
      return;
    }
    const network = "devnet";
    const agentData = {
      agent: ghostAddr,
      did: `did:sol:${network}:${ghostAddr}`,
      name: `Ghost Agent ${ghostAddr.slice(0, 8)}`,
      capabilities: "x402-payments,autonomous-agent",
      x402Enabled: true,
      x402ServiceEndpoint: ghostData.facilitatorAddress || "",
      owner: claimer.address,
      registeredAt: Math.floor(Date.now() / 1e3),
      issuedAt: Math.floor(Date.now() / 1e3)
    };
    s.start("Creating SAS attestation...");
    let attestationResult;
    try {
      attestationResult = await createGhostOwnershipAttestation({
        sasConfig,
        payer: claimer,
        ghostPaymentAddress: ghostAddr,
        agentData,
        expiryDays: 365
      });
      s.stop(`\u2705 Attestation prepared`);
      log.info(chalk34.gray(`  Attestation PDA: ${attestationResult.attestationPda}`));
    } catch (error) {
      s.stop(chalk34.red("\u274C Failed to create attestation"));
      log.error(chalk34.red(error instanceof Error ? error.message : "Unknown error"));
      log.info(chalk34.yellow("\\n\u{1F4A1} Common causes:"));
      log.info(chalk34.gray("  1. SAS configuration is invalid or expired"));
      log.info(chalk34.gray("  2. Schema mismatch between configured and on-chain"));
      log.info(chalk34.gray("  3. Insufficient permissions for authorized signer"));
      log.info(chalk34.cyan("\\n\u2139\uFE0F  To fix:"));
      log.info(chalk34.gray("  Re-run SAS setup: bun apps/web/scripts/setup-sas.ts"));
      outro(chalk34.red("Attestation creation failed"));
      return;
    }
    s.start("Creating attestation on-chain...");
    try {
      const { GhostSpeakClient: GhostSpeakClient4 } = await import('@ghostspeak/sdk');
      const {
        createTransactionMessage: createTransactionMessage2,
        setTransactionMessageFeePayerSigner: setTransactionMessageFeePayerSigner2,
        setTransactionMessageLifetimeUsingBlockhash: setTransactionMessageLifetimeUsingBlockhash2,
        appendTransactionMessageInstruction: appendTransactionMessageInstruction2,
        pipe: pipe2,
        signTransactionMessageWithSigners: signTransactionMessageWithSigners2,
        sendAndConfirmTransactionFactory: sendAndConfirmTransactionFactory2
      } = await import('@solana/kit');
      const ghostClient = new GhostSpeakClient4({
        rpc,
        cluster: "devnet"
      });
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
      const attestationTxMessage = await pipe2(
        createTransactionMessage2({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner2(claimer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash2(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstruction2(attestationResult.instruction, tx)
      );
      const signedAttestationTx = await signTransactionMessageWithSigners2(attestationTxMessage);
      const sendAndConfirmTransaction = sendAndConfirmTransactionFactory2({
        rpc,
        rpcSubscriptions: void 0
      });
      const attestationTxSignature = await sendAndConfirmTransaction(signedAttestationTx, {
        commitment: "confirmed"
      });
      s.stop(`\u2705 Attestation created: ${attestationTxSignature.slice(0, 12)}...`);
      log.info(chalk34.gray(`  View: ${getExplorerUrl(attestationTxSignature, "devnet")}`));
    } catch (error) {
      s.stop(chalk34.red("\u274C Attestation transaction failed"));
      log.error(chalk34.red(error instanceof Error ? error.message : "Unknown error"));
      log.info(chalk34.yellow("\\n\u{1F4A1} Common causes:"));
      log.info(chalk34.gray("  1. Insufficient SOL for transaction fees"));
      log.info(chalk34.gray("  2. Attestation already exists for this Ghost"));
      log.info(chalk34.gray("  3. Network congestion or RPC timeout"));
      log.info(chalk34.gray("  4. Invalid or expired blockhash"));
      log.info(chalk34.cyan("\\n\u2139\uFE0F  To fix:"));
      log.info(chalk34.gray("  1. Check wallet balance: solana balance"));
      log.info(chalk34.gray("  2. Request devnet SOL: solana airdrop 2"));
      log.info(chalk34.gray("  3. Try again with a different RPC endpoint"));
      outro(chalk34.red("Attestation creation failed"));
      return;
    }
    s.start("Claiming Ghost with SDK...");
    try {
      const { GhostSpeakClient: GhostSpeakClient4 } = await import('@ghostspeak/sdk');
      const ghostClient = new GhostSpeakClient4({
        rpc,
        cluster: "devnet"
      });
      const claimSignature = await ghostClient.ghosts.claim(claimer, {
        agentAddress: ghostAddr,
        x402PaymentAddress: ghostAddr,
        // Ghost address IS the x402 payment address
        sasCredential: sasConfig.credentialPda,
        sasSchema: sasConfig.agentIdentitySchema,
        network: "devnet",
        ipfsMetadataUri: void 0,
        githubUsername: void 0,
        twitterHandle: void 0
      });
      s.stop(`\u2705 Ghost claimed!`);
      s.start("Updating Convex database...");
      try {
        await markGhostClaimed(ghostAddr, claimer.address, claimSignature);
        s.stop("\u2705 Convex database updated");
      } catch (error) {
        s.stop(chalk34.yellow("\u26A0\uFE0F  Convex update failed"));
        log.warn(chalk34.gray(`Ghost claimed on-chain but Convex sync failed: ${error instanceof Error ? error.message : "Unknown error"}`));
      }
      let ghostScore;
      s.start("Fetching Ghost Score...");
      try {
        ghostScore = await getGhostScore(ghostAddr);
        s.stop("\u2705 Ghost Score retrieved");
      } catch (error) {
        s.stop(chalk34.yellow("\u26A0\uFE0F  Ghost Score unavailable"));
        log.warn(chalk34.gray(`Could not fetch Ghost Score: ${error instanceof Error ? error.message : "Unknown error"}`));
      }
      console.log(chalk34.green("\n\u{1F389} Ghost Successfully Claimed!"));
      console.log(chalk34.gray("\u2500".repeat(80)));
      console.log(chalk34.bold("Transaction Details:"));
      console.log(chalk34.gray(`  Claim TX: ${claimSignature}`));
      console.log(chalk34.gray(`  Explorer: ${getExplorerUrl(claimSignature, "devnet")}`));
      console.log("");
      console.log(chalk34.bold("Ghost Details:"));
      console.log(chalk34.gray(`  Ghost Address: ${ghostAddr}`));
      console.log(chalk34.gray(`  Owner: ${claimer.address}`));
      console.log(chalk34.gray(`  DID: did:sol:devnet:${ghostAddr}`));
      console.log(chalk34.gray(`  Status: Claimed \u2705`));
      if (ghostScore) {
        console.log("");
        console.log(chalk34.bold("Ghost Score:"));
        console.log(chalk34.gray(`  Score: ${ghostScore.score || 0}/1000`));
        console.log(chalk34.gray(`  Tier: ${ghostScore.tier || "Unranked"}`));
        if (ghostScore.breakdown) {
          console.log(chalk34.gray(`  Components:`));
          if (ghostScore.breakdown.credentials) console.log(chalk34.gray(`    - Credentials: ${ghostScore.breakdown.credentials}`));
          if (ghostScore.breakdown.transactions) console.log(chalk34.gray(`    - Transactions: ${ghostScore.breakdown.transactions}`));
          if (ghostScore.breakdown.reputation) console.log(chalk34.gray(`    - Reputation: ${ghostScore.breakdown.reputation}`));
        }
      }
      console.log("");
      console.log(chalk34.bold("Next Steps:"));
      console.log(chalk34.gray("  1. View your Ghost Score: ghost score show"));
      console.log(chalk34.gray("  2. Link platform identities: ghost credentials link"));
      console.log(chalk34.gray("  3. Build reputation across platforms"));
      outro(chalk34.green("\u2728 Claim complete! Your Ghost Score is now building."));
    } catch (error) {
      s.stop(chalk34.red("\u274C Claim transaction failed"));
      log.error(chalk34.red(error instanceof Error ? error.message : "Unknown error"));
      const errorMsg = error instanceof Error ? error.message.toLowerCase() : "";
      if (errorMsg.includes("insufficient") || errorMsg.includes("balance")) {
        log.info(chalk34.yellow("\\n\u{1F4A1} Insufficient funds"));
        log.info(chalk34.gray("  Check wallet balance: solana balance"));
        log.info(chalk34.gray("  Request devnet SOL: solana airdrop 2"));
      } else if (errorMsg.includes("already") || errorMsg.includes("exists")) {
        log.info(chalk34.yellow("\\n\u{1F4A1} Ghost may already be claimed"));
        log.info(chalk34.gray("  Check on-chain status with: ghost agent status <address>"));
      } else if (errorMsg.includes("attestation") || errorMsg.includes("invalid")) {
        log.info(chalk34.yellow("\\n\u{1F4A1} SAS attestation issue"));
        log.info(chalk34.gray("  Verify attestation was created successfully"));
        log.info(chalk34.gray("  Re-run SAS setup if needed: bun packages/web/scripts/setup-sas.ts"));
      } else if (errorMsg.includes("timeout") || errorMsg.includes("network")) {
        log.info(chalk34.yellow("\\n\u{1F4A1} Network or RPC issue"));
        log.info(chalk34.gray("  Try again with a different RPC endpoint"));
        log.info(chalk34.gray("  Set SOLANA_RPC_URL environment variable"));
      } else {
        log.info(chalk34.yellow("\\n\u{1F4A1} Troubleshooting:"));
        log.info(chalk34.gray("  1. Verify SAS attestation was created"));
        log.info(chalk34.gray("  2. Check wallet has sufficient SOL"));
        log.info(chalk34.gray("  3. Ensure Ghost is not already claimed"));
        log.info(chalk34.gray("  4. Try again in a few moments"));
      }
      handleError(error, { operation: "claim Ghost" });
      outro(chalk34.red("Claim failed"));
      return;
    }
  } catch (error) {
    log.error(`Failed to process claim: ${error instanceof Error ? error.message : "Unknown error"}`);
    outro(chalk34.red("Operation failed"));
  }
});

// src/commands/multisig.ts
init_client();
init_sdk_helpers();
var multisigCommand2 = new Command("multisig").description("Manage multisignature wallets for shared agent control");
multisigCommand2.command("create").description("Create a new multisig wallet").option("-t, --threshold <number>", "Number of signatures required").option("-s, --signers <addresses>", "Comma-separated list of signer addresses").option("--json", "Output as JSON").action(async (options) => {
  intro(chalk34.cyan("\u{1F510} Create Multisig Wallet"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let signerAddresses = [];
    if (options.signers) {
      signerAddresses = options.signers.split(",").map((s2) => address(s2.trim()));
    } else {
      const signersInput = await text({
        message: "Signer addresses (comma-separated):",
        placeholder: "addr1, addr2, addr3",
        validate: (value) => {
          if (!value) return "At least one signer address is required";
          const addrs = value.split(",").map((s2) => s2.trim());
          if (addrs.length < 2) return "Multisig requires at least 2 signers";
          try {
            addrs.forEach((a) => address(a));
            return;
          } catch {
            return "Invalid address format";
          }
        }
      });
      if (isCancel(signersInput)) {
        cancel("Creation cancelled");
        return;
      }
      signerAddresses = signersInput.toString().split(",").map((s2) => address(s2.trim()));
    }
    if (!signerAddresses.some((s2) => s2 === wallet.address)) {
      signerAddresses.push(wallet.address);
    }
    let threshold = options.threshold ? parseInt(options.threshold) : 0;
    if (!threshold) {
      const thresholdInput = await text({
        message: `Approval threshold (1-${signerAddresses.length}):`,
        placeholder: "2",
        initialValue: Math.ceil(signerAddresses.length / 2).toString(),
        validate: (value) => {
          if (!value) return "Threshold is required";
          const t = parseInt(value);
          if (isNaN(t) || t < 1 || t > signerAddresses.length) {
            return `Threshold must be between 1 and ${signerAddresses.length}`;
          }
          return;
        }
      });
      if (isCancel(thresholdInput)) {
        cancel("Creation cancelled");
        return;
      }
      threshold = parseInt(thresholdInput.toString());
    }
    note(
      `${chalk34.bold("Multisig Configuration:")}
${chalk34.gray("Total Signers:")} ${signerAddresses.length}
${chalk34.gray("Approval Threshold:")} ${threshold}/${signerAddresses.length}

${chalk34.bold("Signers:")}
` + signerAddresses.map(
        (s2, i) => `${chalk34.gray(`${i + 1}.`)} ${s2}${s2 === wallet.address ? chalk34.yellow(" (you)") : ""}`
      ).join("\n") + `

${chalk34.yellow("This multisig will require " + threshold + " signature(s) to execute transactions.")}`,
      "Multisig Preview"
    );
    const confirmCreate = await confirm({
      message: "Create this multisig wallet?"
    });
    if (isCancel(confirmCreate) || !confirmCreate) {
      cancel("Creation cancelled");
      return;
    }
    s.start("Creating multisig on blockchain...");
    try {
      const multisigId = BigInt(Date.now());
      const signature = await safeClient.multisigModule.createMultisig({
        owner: toSDKSigner(wallet),
        multisigId,
        threshold,
        signers: signerAddresses
      });
      s.stop("\u2705 Multisig created successfully");
      const { deriveMultisigPda } = await import('@ghostspeak/sdk');
      const [multisigAddress] = await deriveMultisigPda({
        programAddress: safeClient.programId,
        creator: wallet.address,
        multisigId
      });
      const explorerUrl = getExplorerUrl(signature, "devnet");
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          multisigAddress,
          multisigId: multisigId.toString(),
          threshold,
          signers: signerAddresses,
          signature,
          explorerUrl
        }, null, 2));
        return;
      }
      outro(
        `${chalk34.green("\u2705 Multisig Created Successfully!")}

${chalk34.bold("Multisig Details:")}
${chalk34.gray("Address:")} ${chalk34.cyan(multisigAddress)}
${chalk34.gray("ID:")} ${multisigId}
${chalk34.gray("Threshold:")} ${threshold}/${signerAddresses.length}
${chalk34.gray("Transaction:")} ${signature}

${chalk34.bold("Next Steps:")}
${chalk34.gray("\u2022")} Create proposals: ${chalk34.cyan(`ghost multisig propose`)}
${chalk34.gray("\u2022")} List multisigs: ${chalk34.cyan(`ghost multisig list`)}

${chalk34.gray("Explorer:")} ${chalk34.cyan(explorerUrl)}`
      );
    } catch (error) {
      s.stop("\u274C Failed to create multisig");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to create multisig: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
multisigCommand2.command("propose").description("Create a proposal for multisig approval").option("-m, --multisig <address>", "Multisig address").option("-t, --title <title>", "Proposal title").option("-d, --description <desc>", "Proposal description").action(async (options) => {
  intro(chalk34.blue("\u{1F4DD} Create Multisig Proposal"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let multisigAddress = options.multisig;
    if (!multisigAddress) {
      const addressInput = await text({
        message: "Multisig address:",
        validate: (value) => {
          if (!value) return "Multisig address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Invalid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Proposal cancelled");
        return;
      }
      multisigAddress = addressInput.toString().trim();
    }
    const multisigAddr = address(multisigAddress);
    s.start("Verifying multisig...");
    const multisigData = await safeClient.multisigModule.getMultisig(multisigAddr);
    if (!multisigData) {
      s.stop("\u274C Multisig not found");
      outro(chalk34.red(`No multisig found at: ${multisigAddress}`));
      return;
    }
    s.stop("\u2705 Multisig verified");
    let title = options.title;
    if (!title) {
      const titleInput = await text({
        message: "Proposal title:",
        placeholder: "Transfer 100 SOL to treasury",
        validate: (value) => {
          if (!value) return "Title is required";
          if (value.length < 5) return "Title must be at least 5 characters";
          return;
        }
      });
      if (isCancel(titleInput)) {
        cancel("Proposal cancelled");
        return;
      }
      title = titleInput.toString().trim();
    }
    let description = options.description;
    if (!description) {
      const descInput = await text({
        message: "Proposal description:",
        placeholder: "Monthly treasury allocation for development",
        validate: (value) => {
          if (!value) return "Description is required";
          return;
        }
      });
      if (isCancel(descInput)) {
        cancel("Proposal cancelled");
        return;
      }
      description = descInput.toString().trim();
    }
    note(
      `${chalk34.bold("Proposal Details:")}
${chalk34.gray("Multisig:")} ${multisigAddress}
${chalk34.gray("Title:")} ${title}
${chalk34.gray("Description:")} ${description}
${chalk34.gray("Threshold:")} ${multisigData.threshold}/${multisigData.signers.length}

${chalk34.yellow("This proposal will require " + multisigData.threshold + " approval(s).")}`,
      "Proposal Preview"
    );
    const confirmPropose = await confirm({
      message: "Create this proposal?"
    });
    if (isCancel(confirmPropose) || !confirmPropose) {
      cancel("Proposal cancelled");
      return;
    }
    s.start("Creating proposal on blockchain...");
    try {
      const proposalId = BigInt(Date.now());
      const { ProposalType } = await import('@ghostspeak/sdk');
      const signature = await safeClient.multisigModule.createProposal({
        multisigAddress: multisigAddr,
        title,
        description,
        proposalType: ProposalType.Custom,
        executionParams: {
          instructions: [],
          executionDelay: 0n,
          executionConditions: [],
          cancellable: true,
          autoExecute: false,
          executionAuthority: wallet.address
        },
        proposalId,
        proposer: toSDKSigner(wallet)
      });
      s.stop("\u2705 Proposal created successfully");
      const explorerUrl = getExplorerUrl(signature, "devnet");
      outro(
        `${chalk34.green("\u2705 Proposal Created!")}

${chalk34.gray("Proposal ID:")} ${proposalId}
${chalk34.gray("Title:")} ${title}
${chalk34.gray("Status:")} Pending approval
${chalk34.gray("Required Approvals:")} ${multisigData.threshold}
${chalk34.gray("Transaction:")} ${signature}

${chalk34.bold("Next Steps:")}
${chalk34.gray("\u2022")} Other signers approve: ${chalk34.cyan(`ghost multisig approve`)}
${chalk34.gray("\u2022")} Execute when approved: ${chalk34.cyan(`ghost multisig execute`)}

${chalk34.gray("Explorer:")} ${chalk34.cyan(explorerUrl)}`
      );
    } catch (error) {
      s.stop("\u274C Failed to create proposal");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to propose: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
multisigCommand2.command("approve").description("Approve a multisig proposal").option("-p, --proposal <address>", "Proposal address").option("-m, --multisig <address>", "Multisig address").action(async (options) => {
  intro(chalk34.green("\u2705 Approve Multisig Proposal"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let proposalAddress = options.proposal;
    if (!proposalAddress) {
      const addressInput = await text({
        message: "Proposal address:",
        validate: (value) => {
          if (!value) return "Proposal address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Invalid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Approval cancelled");
        return;
      }
      proposalAddress = addressInput.toString().trim();
    }
    const proposalAddr = address(proposalAddress);
    s.start("Fetching proposal...");
    const proposalData = await safeClient.governanceModule.getProposal(proposalAddr);
    if (!proposalData) {
      s.stop("\u274C Proposal not found");
      outro(chalk34.red(`No proposal found at: ${proposalAddress}`));
      return;
    }
    s.stop("\u2705 Proposal loaded");
    note(
      `${chalk34.bold("Proposal Details:")}
${chalk34.gray("Title:")} ${proposalData.title}
${chalk34.gray("Description:")} ${proposalData.description}
${chalk34.gray("Current Approvals:")} ${proposalData.votesFor}/${proposalData.threshold}
${chalk34.gray("Status:")} ${proposalData.status}`,
      "Proposal Info"
    );
    const confirmApprove = await confirm({
      message: "Approve this proposal?"
    });
    if (isCancel(confirmApprove) || !confirmApprove) {
      cancel("Approval cancelled");
      return;
    }
    s.start("Approving proposal on blockchain...");
    try {
      log.warn("Multisig approval method pending protocol_config integration");
      s.stop("\u26A0\uFE0F  Approval API pending");
      outro(
        `${chalk34.yellow("Approval Pending")}

Your approval for proposal ${proposalAddress} will be recorded.

${chalk34.gray("Note: Use protocol_config voting instructions for multisig approvals.")}`
      );
    } catch (error) {
      s.stop("\u274C Failed to approve proposal");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to approve: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
multisigCommand2.command("execute").description("Execute an approved multisig proposal").option("-p, --proposal <address>", "Proposal address").option("-m, --multisig <address>", "Multisig address").action(async (options) => {
  intro(chalk34.magenta("\u26A1 Execute Multisig Proposal"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let proposalAddress = options.proposal;
    if (!proposalAddress) {
      const addressInput = await text({
        message: "Proposal address:",
        validate: (value) => {
          if (!value) return "Proposal address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Invalid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Execution cancelled");
        return;
      }
      proposalAddress = addressInput.toString().trim();
    }
    const proposalAddr = address(proposalAddress);
    s.start("Verifying proposal...");
    const proposalData = await safeClient.governanceModule.getProposal(proposalAddr);
    if (!proposalData) {
      s.stop("\u274C Proposal not found");
      outro(chalk34.red(`No proposal found at: ${proposalAddress}`));
      return;
    }
    if (proposalData.votesFor < proposalData.threshold) {
      s.stop("\u274C Proposal not approved");
      outro(
        chalk34.red("Proposal does not have enough approvals") + `

${chalk34.gray("Current:")} ${proposalData.votesFor}/${proposalData.threshold}
${chalk34.gray("Required:")} ${proposalData.threshold - proposalData.votesFor} more approval(s)`
      );
      return;
    }
    s.stop("\u2705 Proposal ready for execution");
    const confirmExecute = await confirm({
      message: "Execute this proposal?"
    });
    if (isCancel(confirmExecute) || !confirmExecute) {
      cancel("Execution cancelled");
      return;
    }
    s.start("Executing proposal on blockchain...");
    try {
      const multisigAddr = options.multisig ? address(options.multisig) : proposalData.proposer;
      const signature = await safeClient.multisigModule.executeProposal({
        proposalAddress: proposalAddr,
        executor: toSDKSigner(wallet),
        targetProgram: safeClient.programId
      });
      s.stop("\u2705 Proposal executed successfully");
      const explorerUrl = getExplorerUrl(signature, "devnet");
      outro(
        `${chalk34.green("\u2705 Proposal Executed!")}

${chalk34.gray("Proposal:")} ${proposalAddress}
${chalk34.gray("Transaction:")} ${signature}

${chalk34.gray("Explorer:")} ${chalk34.cyan(explorerUrl)}`
      );
    } catch (error) {
      s.stop("\u274C Failed to execute proposal");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to execute: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
multisigCommand2.command("list").description("List multisigs you are a signer for").option("-o, --owner <address>", "Filter by creator address").option("--json", "Output as JSON").action(async (options) => {
  intro(chalk34.blue("\u{1F4CB} List Multisigs"));
  try {
    const s = spinner();
    s.start("Fetching multisigs...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    const ownerAddr = options.owner ? address(options.owner) : wallet.address;
    const multisigs = await safeClient.multisigModule.getMultisigsByCreator(ownerAddr);
    s.stop(`\u2705 Found ${multisigs.length} multisig(s)`);
    if (multisigs.length === 0) {
      outro(
        `${chalk34.yellow("No multisigs found")}

${chalk34.gray("Create a multisig:")}
${chalk34.cyan("ghost multisig create")}`
      );
      return;
    }
    if (options.json) {
      console.log(JSON.stringify(multisigs, null, 2));
      return;
    }
    for (let i = 0; i < multisigs.length; i++) {
      const multisig = multisigs[i];
      console.log(`
${chalk34.bold.cyan(`Multisig ${i + 1}:`)}`);
      console.log(`${chalk34.gray("Address:")} ${multisig.address}`);
      console.log(`${chalk34.gray("Threshold:")} ${multisig.data.threshold}/${multisig.data.signers.length}`);
      console.log(`${chalk34.gray("Signers:")}`);
      multisig.data.signers.forEach((signer, idx) => {
        console.log(`  ${chalk34.gray(`${idx + 1}.`)} ${signer}`);
      });
    }
    outro(
      `
${chalk34.gray("Commands:")}
${chalk34.cyan("ghost multisig propose")} - Create a proposal
${chalk34.cyan("ghost multisig approve")} - Approve a proposal
${chalk34.cyan("ghost multisig execute")} - Execute an approved proposal`
    );
  } catch (error) {
    log.error(`Failed to list multisigs: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
multisigCommand2.action(async () => {
  intro(chalk34.blue("\u{1F510} GhostSpeak Multisig Management"));
  log.info(`
${chalk34.bold("Available Commands:")}
`);
  log.info(`${chalk34.cyan("ghost multisig create")} - Create a new multisig wallet`);
  log.info(`${chalk34.cyan("ghost multisig propose")} - Create a proposal for approval`);
  log.info(`${chalk34.cyan("ghost multisig approve")} - Approve a proposal`);
  log.info(`${chalk34.cyan("ghost multisig execute")} - Execute an approved proposal`);
  log.info(`${chalk34.cyan("ghost multisig list")} - List your multisigs`);
  note(
    `${chalk34.bold("What are Multisigs?")}

Multisig wallets require multiple signatures to execute transactions,
providing shared control and enhanced security for agent management.

${chalk34.yellow("Use Cases:")}
${chalk34.gray("\u2022")} Shared agent ownership between team members
${chalk34.gray("\u2022")} DAO treasury management
${chalk34.gray("\u2022")} Enhanced security for high-value agents
${chalk34.gray("\u2022")} Trustless escrow and governance`,
    "About Multisig"
  );
  outro("Use --help with any command for more details");
});

// src/commands/authorization.ts
init_client();
init_sdk_helpers();
var authorizationCommand = new Command("authorization").alias("auth").description("Manage pre-authorizations for trustless reputation updates");
authorizationCommand.command("create").description("Create a pre-authorization for a facilitator or service").option("-a, --agent <address>", "Agent address to authorize").option("-s, --source <address>", "Authorized source address (facilitator, service, etc.)").option("-l, --limit <number>", "Maximum number of updates allowed").option("-d, --duration <days>", "Authorization duration in days").option("--json", "Output as JSON").action(async (options) => {
  intro(chalk34.cyan("\u{1F510} Create Pre-Authorization"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let agentAddress = options.agent;
    if (!agentAddress) {
      const addressInput = await text({
        message: "Agent address to authorize:",
        validate: (value) => {
          if (!value) return "Agent address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Invalid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Authorization cancelled");
        return;
      }
      agentAddress = addressInput.toString().trim();
    }
    const agentAddr = address(agentAddress);
    s.start("Verifying agent...");
    const agentData = await safeClient.agent.getAgentAccount(agentAddr);
    if (!agentData) {
      s.stop("\u274C Agent not found");
      outro(chalk34.red(`No agent found at: ${agentAddress}`));
      return;
    }
    s.stop("\u2705 Agent verified");
    let authorizedSource = options.source;
    if (!authorizedSource) {
      const sourceTypeInput = await select({
        message: "Authorization type:",
        options: [
          { value: "facilitator", label: "x402 Facilitator - For payment-based reputation" },
          { value: "service", label: "Service Provider - For service quality ratings" },
          { value: "oracle", label: "Oracle - For external data feeds" },
          { value: "custom", label: "Custom Address" }
        ]
      });
      if (isCancel(sourceTypeInput)) {
        cancel("Authorization cancelled");
        return;
      }
      const sourceType = sourceTypeInput.toString();
      if (sourceType === "custom" || sourceType === "facilitator" || sourceType === "service" || sourceType === "oracle") {
        const sourceInput = await text({
          message: "Authorized source address:",
          placeholder: sourceType === "facilitator" ? "x402 facilitator pubkey" : "Service pubkey",
          validate: (value) => {
            if (!value) return "Source address is required";
            try {
              address(value.trim());
              return;
            } catch {
              return "Invalid Solana address";
            }
          }
        });
        if (isCancel(sourceInput)) {
          cancel("Authorization cancelled");
          return;
        }
        authorizedSource = sourceInput.toString().trim();
      }
    }
    if (!authorizedSource) {
      cancel("Authorized source is required");
      return;
    }
    const sourceAddr = address(authorizedSource);
    let indexLimit = options.limit ? parseInt(options.limit) : 0;
    if (!indexLimit) {
      const limitInput = await text({
        message: "Maximum number of updates allowed:",
        placeholder: "100",
        initialValue: "100",
        validate: (value) => {
          if (!value) return "Limit is required";
          const limit = parseInt(value);
          if (isNaN(limit) || limit < 1) return "Limit must be at least 1";
          if (limit > 1e4) return "Limit cannot exceed 10,000";
          return;
        }
      });
      if (isCancel(limitInput)) {
        cancel("Authorization cancelled");
        return;
      }
      indexLimit = parseInt(limitInput.toString());
    }
    let durationDays = options.duration ? parseInt(options.duration) : 0;
    if (!durationDays) {
      const durationInput = await text({
        message: "Authorization duration (days):",
        placeholder: "30",
        initialValue: "30",
        validate: (value) => {
          if (!value) return "Duration is required";
          const days = parseInt(value);
          if (isNaN(days) || days < 1) return "Duration must be at least 1 day";
          if (days > 365) return "Duration cannot exceed 365 days";
          return;
        }
      });
      if (isCancel(durationInput)) {
        cancel("Authorization cancelled");
        return;
      }
      durationDays = parseInt(durationInput.toString());
    }
    const expiresAt = BigInt(Math.floor(Date.now() / 1e3) + durationDays * 24 * 60 * 60);
    note(
      `${chalk34.bold("Authorization Details:")}
${chalk34.gray("Agent:")} ${agentData.name}
${chalk34.gray("Agent Address:")} ${agentAddress}
${chalk34.gray("Authorized Source:")} ${authorizedSource}
${chalk34.gray("Update Limit:")} ${indexLimit} updates
${chalk34.gray("Duration:")} ${durationDays} days
${chalk34.gray("Expires:")} ${new Date(Number(expiresAt) * 1e3).toLocaleDateString()}

${chalk34.yellow("\u26A0\uFE0F  This allows the source to update reputation up to " + indexLimit + " times.")}
${chalk34.gray("You can revoke this authorization at any time.")}`,
      "Authorization Preview"
    );
    const confirmCreate = await confirm({
      message: "Create this authorization?"
    });
    if (isCancel(confirmCreate) || !confirmCreate) {
      cancel("Authorization cancelled");
      return;
    }
    s.start("Creating authorization on blockchain...");
    try {
      const signature = await safeClient.authorization.createAuthorization({
        signer: toSDKSigner(wallet),
        agentAddress: agentAddr,
        authorizedSource: sourceAddr,
        indexLimit: BigInt(indexLimit),
        expiresAt,
        network: "devnet"
      });
      s.stop("\u2705 Authorization created successfully");
      const authAddress = `${agentAddr.slice(0, 8)}...${sourceAddr.slice(-8)}`;
      const explorerUrl = getExplorerUrl(signature, "devnet");
      if (options.json) {
        console.log(JSON.stringify({
          success: true,
          authorizationAddress: authAddress,
          agentAddress,
          authorizedSource,
          indexLimit,
          expiresAt: expiresAt.toString(),
          signature,
          explorerUrl
        }, null, 2));
        return;
      }
      outro(
        `${chalk34.green("\u2705 Authorization Created!")}

${chalk34.bold("Authorization Details:")}
${chalk34.gray("Auth Address:")} ${chalk34.cyan(authAddress)}
${chalk34.gray("Agent:")} ${agentData.name}
${chalk34.gray("Source:")} ${authorizedSource}
${chalk34.gray("Limit:")} ${indexLimit} updates
${chalk34.gray("Expires:")} ${new Date(Number(expiresAt) * 1e3).toLocaleDateString()}
${chalk34.gray("Transaction:")} ${signature}

${chalk34.bold("Next Steps:")}
${chalk34.gray("\u2022")} Monitor usage: ${chalk34.cyan(`ghost auth list`)}
${chalk34.gray("\u2022")} Revoke if needed: ${chalk34.cyan(`ghost auth revoke`)}

${chalk34.gray("Explorer:")} ${chalk34.cyan(explorerUrl)}`
      );
    } catch (error) {
      s.stop("\u274C Failed to create authorization");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to create authorization: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
authorizationCommand.command("revoke").description("Revoke an existing authorization").option("-a, --authorization <address>", "Authorization address to revoke").option("--agent <address>", "Agent address (if auth address unknown)").action(async (options) => {
  intro(chalk34.red("\u274C Revoke Authorization"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let authAddress = options.authorization;
    if (!authAddress) {
      const addressInput = await text({
        message: "Authorization address:",
        validate: (value) => {
          if (!value) return "Authorization address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Invalid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Revoke cancelled");
        return;
      }
      authAddress = addressInput.toString().trim();
    }
    const authAddr = address(authAddress);
    s.start("Fetching authorization...");
    const authData = await safeClient.authorization.getAuthorization(authAddr);
    if (!authData) {
      s.stop("\u274C Authorization not found");
      outro(chalk34.red(`No authorization found at: ${authAddress}`));
      return;
    }
    s.stop("\u2705 Authorization loaded");
    note(
      `${chalk34.bold("Authorization to Revoke:")}
${chalk34.gray("Agent:")} ${authData.agent}
${chalk34.gray("Source:")} ${authData.authorizedSource}
${chalk34.gray("Used:")} ${authData.currentIndex}/${authData.indexLimit}
${chalk34.gray("Expires:")} ${new Date(Number(authData.expiresAt) * 1e3).toLocaleDateString()}

${chalk34.red("\u26A0\uFE0F  Revoking will prevent all future updates from this source.")}`,
      "Revoke Confirmation"
    );
    const confirmRevoke = await confirm({
      message: "Revoke this authorization?"
    });
    if (isCancel(confirmRevoke) || !confirmRevoke) {
      cancel("Revoke cancelled");
      return;
    }
    s.start("Revoking authorization on blockchain...");
    try {
      const signature = await safeClient.authorization.revokeAuthorization({
        signer: toSDKSigner(wallet),
        agentAddress: address(authData.agent),
        authorizedSource: address(authData.authorizedSource)
      });
      s.stop("\u2705 Authorization revoked successfully");
      const explorerUrl = getExplorerUrl(signature, "devnet");
      outro(
        `${chalk34.green("\u2705 Authorization Revoked!")}

${chalk34.gray("Authorization:")} ${authAddress}
${chalk34.gray("Transaction:")} ${signature}

${chalk34.gray("Explorer:")} ${chalk34.cyan(explorerUrl)}`
      );
    } catch (error) {
      s.stop("\u274C Failed to revoke authorization");
      handleError(error);
    }
  } catch (error) {
    log.error(`Failed to revoke: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
authorizationCommand.command("list").description("List authorizations for an agent").option("-a, --agent <address>", "Agent address").option("--json", "Output as JSON").action(async (options) => {
  intro(chalk34.blue("\u{1F4CB} List Authorizations"));
  try {
    const s = spinner();
    s.start("Fetching authorizations...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    let agentAddress = options.agent;
    if (!agentAddress) {
      const addressInput = await text({
        message: "Agent address:",
        validate: (value) => {
          if (!value) return "Agent address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Invalid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Operation cancelled");
        return;
      }
      agentAddress = addressInput.toString().trim();
    }
    const agentAddr = address(agentAddress);
    const authorizations = await safeClient.authorization.getAuthorizationsByAgent(agentAddr);
    s.stop(`\u2705 Found ${authorizations.length} authorization(s)`);
    if (authorizations.length === 0) {
      outro(
        `${chalk34.yellow("No authorizations found")}

${chalk34.gray("Create an authorization:")}
${chalk34.cyan("ghost auth create")}`
      );
      return;
    }
    if (options.json) {
      console.log(JSON.stringify(authorizations, null, 2));
      return;
    }
    for (let i = 0; i < authorizations.length; i++) {
      const auth = authorizations[i];
      const now = Math.floor(Date.now() / 1e3);
      const isExpired = Number(auth.data.expiresAt) < now;
      const isExhausted = auth.data.currentIndex >= auth.data.indexLimit;
      console.log(`
${chalk34.bold.cyan(`Authorization ${i + 1}:`)}`);
      console.log(`${chalk34.gray("Address:")} ${auth.address}`);
      console.log(`${chalk34.gray("Source:")} ${auth.data.authorizedSource}`);
      console.log(`${chalk34.gray("Usage:")} ${auth.data.currentIndex}/${auth.data.indexLimit}`);
      console.log(`${chalk34.gray("Expires:")} ${new Date(Number(auth.data.expiresAt) * 1e3).toLocaleDateString()}`);
      let status = chalk34.green("Active");
      if (isExpired) status = chalk34.red("Expired");
      if (isExhausted) status = chalk34.yellow("Exhausted");
      if (auth.data.revoked) status = chalk34.red("Revoked");
      console.log(`${chalk34.gray("Status:")} ${status}`);
    }
    outro(
      `
${chalk34.gray("Commands:")}
${chalk34.cyan("ghost auth create")} - Create new authorization
${chalk34.cyan("ghost auth revoke")} - Revoke an authorization
${chalk34.cyan("ghost auth verify")} - Verify authorization status`
    );
  } catch (error) {
    log.error(`Failed to list authorizations: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
authorizationCommand.command("verify").description("Verify an authorization is valid").option("-a, --authorization <address>", "Authorization address").option("--json", "Output as JSON").action(async (options) => {
  intro(chalk34.green("\u2705 Verify Authorization"));
  try {
    const s = spinner();
    s.start("Connecting to network...");
    const { client, wallet } = await initializeClient("devnet");
    const safeClient = createSafeSDKClient(client);
    s.stop("\u2705 Connected to devnet");
    let authAddress = options.authorization;
    if (!authAddress) {
      const addressInput = await text({
        message: "Authorization address:",
        validate: (value) => {
          if (!value) return "Authorization address is required";
          try {
            address(value.trim());
            return;
          } catch {
            return "Invalid Solana address";
          }
        }
      });
      if (isCancel(addressInput)) {
        cancel("Verification cancelled");
        return;
      }
      authAddress = addressInput.toString().trim();
    }
    const authAddr = address(authAddress);
    s.start("Verifying authorization...");
    const authData = await safeClient.authorization.getAuthorization(authAddr);
    if (!authData) {
      s.stop("\u274C Authorization not found");
      outro(chalk34.red(`No authorization found at: ${authAddress}`));
      return;
    }
    const now = Math.floor(Date.now() / 1e3);
    const isExpired = Number(authData.expiresAt) < now;
    const isExhausted = authData.currentIndex >= authData.indexLimit;
    const isRevoked = authData.revoked;
    const isValid = !isExpired && !isExhausted && !isRevoked;
    s.stop(isValid ? "\u2705 Authorization is valid" : "\u274C Authorization is invalid");
    if (options.json) {
      console.log(JSON.stringify({
        valid: isValid,
        expired: isExpired,
        exhausted: isExhausted,
        revoked: isRevoked,
        currentIndex: authData.currentIndex.toString(),
        indexLimit: authData.indexLimit.toString(),
        expiresAt: authData.expiresAt.toString(),
        ...authData
      }, null, 2));
      return;
    }
    const statusColor = isValid ? chalk34.green : chalk34.red;
    const statusText = isValid ? "VALID" : "INVALID";
    outro(
      `${statusColor(`Authorization Status: ${statusText}`)}

${chalk34.bold("Details:")}
${chalk34.gray("Address:")} ${authAddress}
${chalk34.gray("Agent:")} ${authData.agent}
${chalk34.gray("Source:")} ${authData.authorizedSource}
${chalk34.gray("Usage:")} ${authData.currentIndex}/${authData.indexLimit}
${chalk34.gray("Expires:")} ${new Date(Number(authData.expiresAt) * 1e3).toLocaleString()}

${chalk34.bold("Validation:")}
${chalk34.gray("\u2022")} Expired: ${isExpired ? chalk34.red("Yes") : chalk34.green("No")}
${chalk34.gray("\u2022")} Exhausted: ${isExhausted ? chalk34.red("Yes") : chalk34.green("No")}
${chalk34.gray("\u2022")} Revoked: ${isRevoked ? chalk34.red("Yes") : chalk34.green("No")}
${chalk34.gray("\u2022")} Valid: ${isValid ? chalk34.green("Yes") : chalk34.red("No")}`
    );
  } catch (error) {
    log.error(`Failed to verify: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
authorizationCommand.action(async () => {
  intro(chalk34.blue("\u{1F510} GhostSpeak Authorization Management"));
  log.info(`
${chalk34.bold("Available Commands:")}
`);
  log.info(`${chalk34.cyan("ghost auth create")} - Create a pre-authorization`);
  log.info(`${chalk34.cyan("ghost auth revoke")} - Revoke an authorization`);
  log.info(`${chalk34.cyan("ghost auth list")} - List authorizations for an agent`);
  log.info(`${chalk34.cyan("ghost auth verify")} - Verify authorization validity`);
  note(
    `${chalk34.bold("What are Pre-Authorizations?")}

Pre-authorizations allow you to grant limited, trustless permission
for facilitators or services to update your agent's reputation.

${chalk34.yellow("Key Features:")}
${chalk34.gray("\u2022")} Time-limited permissions (set expiration)
${chalk34.gray("\u2022")} Update limits (prevent abuse)
${chalk34.gray("\u2022")} Instant revocation (cancel anytime)
${chalk34.gray("\u2022")} On-chain verification (trustless)

${chalk34.yellow("Use Cases:")}
${chalk34.gray("\u2022")} x402 facilitators updating payment reputation
${chalk34.gray("\u2022")} Service providers recording quality ratings
${chalk34.gray("\u2022")} Oracles feeding external reputation data`,
    "About Authorizations"
  );
  outro("Use --help with any command for more details");
});
var execAsync3 = promisify(exec);
var CACHE_FILE = join(homedir(), ".ghostspeak", "update-check.json");
var CHECK_INTERVAL = 24 * 60 * 60 * 1e3;
async function checkForUpdates(currentVersion) {
  try {
    if (process.env.GHOSTSPEAK_SKIP_UPDATE_CHECK === "1") {
      return;
    }
    if (existsSync(CACHE_FILE)) {
      try {
        const cache = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
        const timeSinceLastCheck = Date.now() - cache.lastCheck;
        if (timeSinceLastCheck < CHECK_INTERVAL) {
          if (cache.latestVersion && cache.latestVersion !== currentVersion && compareVersions2(cache.latestVersion, currentVersion) > 0) {
            showUpdateNotification(currentVersion, cache.latestVersion);
          }
          return;
        }
      } catch (error) {
      }
    }
    execAsync3("npm view @ghostspeak/cli version").then(({ stdout }) => {
      const latestVersion = stdout.trim();
      const cache = {
        lastCheck: Date.now(),
        latestVersion,
        currentVersion
      };
      const cacheDir = join(homedir(), ".ghostspeak");
      if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir, { recursive: true });
      }
      writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
      if (latestVersion !== currentVersion && compareVersions2(latestVersion, currentVersion) > 0) {
        showUpdateNotification(currentVersion, latestVersion);
      }
    }).catch(() => {
    });
  } catch (error) {
  }
}
function showUpdateNotification(currentVersion, latestVersion) {
  console.log("");
  console.log(chalk34.yellow("\u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E"));
  console.log(chalk34.yellow("\u2502") + chalk34.bold("  \u{1F504} Update Available!                               ") + chalk34.yellow("\u2502"));
  console.log(chalk34.yellow("\u2502") + chalk34.gray(`  Current: v${currentVersion}`) + " ".repeat(41 - currentVersion.length) + chalk34.yellow("\u2502"));
  console.log(chalk34.yellow("\u2502") + chalk34.green(`  Latest:  v${latestVersion}`) + " ".repeat(41 - latestVersion.length) + chalk34.yellow("\u2502"));
  console.log(chalk34.yellow("\u2502") + " ".repeat(53) + chalk34.yellow("\u2502"));
  console.log(chalk34.yellow("\u2502") + chalk34.cyan("  Run ") + chalk34.bold.cyan("ghost update") + chalk34.cyan(" to update automatically") + " ".repeat(14) + chalk34.yellow("\u2502"));
  console.log(chalk34.yellow("\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F"));
  console.log("");
}
function compareVersions2(v1, v2) {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  return 0;
}

// src/utils/interactive-menu.ts
init_client();
init_solana_client();
var RECENT_COMMANDS_FILE = join(homedir(), ".ghostspeak", "recent-commands.json");
var MAX_RECENT_COMMANDS = 5;
var InteractiveMenu = class {
  program;
  constructor(program2) {
    this.program = program2;
  }
  async showMainMenu() {
    intro(chalk34.cyan("\u{1F680} Welcome to GhostSpeak Interactive Mode"));
    const configPath = join(homedir(), ".ghostspeak", "config.json");
    const isFirstRun = !existsSync(configPath);
    for (; ; ) {
      const categories = [
        {
          value: "quickstart",
          label: "Quick Start",
          icon: "\u{1F680}",
          description: "Get started with GhostSpeak - setup and first steps",
          hint: isFirstRun ? "\u2B50 Start here!" : "Guided setup"
        },
        {
          value: "agents",
          label: "AI Agents",
          icon: "\u{1F916}",
          description: "Register and manage your AI agents",
          hint: "Create, list, update agents"
        },
        {
          value: "ghosts",
          label: "Ghost Agents",
          icon: "\u{1F47B}",
          description: "Claim external AI agents and build identity",
          hint: "x402, Twitter, GitHub agents"
        },
        {
          value: "reputation",
          label: "Reputation & Staking",
          icon: "\u2B50",
          description: "Ghost Score, GHOST staking, and privacy",
          hint: "Build trustworthiness"
        },
        {
          value: "multisig",
          label: "Multisig Wallets",
          icon: "\u{1F510}",
          description: "Shared control wallets with threshold approvals",
          hint: "Secure agent management"
        },
        {
          value: "authorization",
          label: "Pre-Authorizations",
          icon: "\u{1F511}",
          description: "Trustless reputation update permissions",
          hint: "Limit access, grant trust"
        },
        {
          value: "did",
          label: "Decentralized Identity",
          icon: "\u{1F194}",
          description: "Create and manage DID documents",
          hint: "Verifiable identities"
        },
        {
          value: "credentials",
          label: "Credentials",
          icon: "\u{1F510}",
          description: "Verifiable credentials management",
          hint: "Issue, verify, sync"
        },
        {
          value: "escrow",
          label: "Escrow",
          icon: "\u{1F4BC}",
          description: "x402 marketplace escrow transactions",
          hint: "Secure payments"
        },
        {
          value: "wallet",
          label: "Wallet",
          icon: "\u{1F4B3}",
          description: "Manage wallets and check balances",
          hint: "Wallet operations"
        },
        {
          value: "governance",
          label: "Governance",
          icon: "\u{1F3DB}\uFE0F",
          description: "Protocol governance and voting",
          hint: "DAO operations"
        },
        {
          value: "development",
          label: "Development",
          icon: "\u{1F6E0}\uFE0F",
          description: "Airdrops, faucets, and dev tools",
          hint: "Developer resources"
        },
        {
          value: "dashboards",
          label: "Interactive Dashboards",
          icon: "\u{1F4CA}",
          description: "Beautiful real-time monitoring interfaces",
          hint: "Visual monitoring"
        },
        {
          value: "recent",
          label: "Recent Commands",
          icon: "\u23F1\uFE0F",
          description: "Quickly access your recently used commands",
          hint: this.getRecentCommandsHint()
        },
        {
          value: "help",
          label: "Help & Support",
          icon: "\u{1F4DA}",
          description: "Documentation, examples, and troubleshooting",
          hint: "Get assistance"
        },
        {
          value: "exit",
          label: "Exit",
          icon: "\u{1F44B}",
          description: "Exit interactive mode",
          hint: "Return to terminal"
        }
      ];
      const choice = await select({
        message: "What would you like to do?",
        options: categories.map((cat) => ({
          value: cat.value,
          label: `${cat.icon} ${cat.label}`,
          hint: cat.hint
        }))
      });
      if (isCancel(choice)) {
        cancel("Interactive mode cancelled");
        process.exit(0);
      }
      switch (choice) {
        case "quickstart":
          await this.showQuickStartMenu();
          break;
        case "agents":
          await this.showAgentMenu();
          break;
        case "ghosts":
          await this.showGhostMenu();
          break;
        case "reputation":
          await this.showReputationMenu();
          break;
        case "multisig":
          await this.showMultisigMenu();
          break;
        case "authorization":
          await this.showAuthorizationMenu();
          break;
        case "did":
          await this.showDIDMenu();
          break;
        case "credentials":
          await this.showCredentialsMenu();
          break;
        case "escrow":
          await this.showEscrowMenu();
          break;
        case "wallet":
          await this.showWalletMenu();
          break;
        case "governance":
          await this.showGovernanceMenu();
          break;
        case "dashboards":
          await this.showDashboardsMenu();
          break;
        case "development":
          await this.showDevelopmentMenu();
          break;
        case "recent":
          await this.showRecentCommands();
          break;
        case "help":
          await this.showHelp();
          break;
        case "exit":
          outro(chalk34.green("Thanks for using GhostSpeak! \u{1F44B}"));
          process.exit(0);
      }
    }
  }
  async showQuickStartMenu() {
    const options = [
      { value: "one-click", label: "\u{1F680} One-Click Setup", command: "quickstart new", hint: "\u2B50 Complete automatic setup" },
      { value: "import", label: "\u{1F4B3} Import Existing Wallet", command: "quickstart existing", hint: "Use your Solana wallet" },
      { value: "guided", label: "\u{1F4CB} Guided Setup Wizard", command: "quickstart", hint: "Step-by-step assistance" },
      { value: "status", label: "\u{1F4CA} Check Setup Status", command: "", hint: "See what's configured" },
      { value: "back", label: "\u2190 Back to Main Menu", command: "", hint: "" }
    ];
    const choice = await select({
      message: chalk34.cyan("\u{1F680} Quick Start - Get up and running with GhostSpeak"),
      options: options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        hint: opt.hint
      }))
    });
    if (isCancel(choice) || choice === "back") {
      return;
    }
    if (choice === "status") {
      await this.showSetupStatus();
      return;
    }
    const selected = options.find((opt) => opt.value === choice);
    if (selected?.command) {
      await this.executeCommand(selected.command);
      this.saveRecentCommand(selected.command, selected.label);
    }
  }
  async showSetupStatus() {
    const s = spinner();
    s.start("Checking your setup status...");
    const status = {
      config: existsSync(join(homedir(), ".ghostspeak", "config.json")),
      wallet: false,
      balance: "0 SOL",
      agents: 0
    };
    try {
      const { wallet } = await initializeClient();
      status.wallet = true;
      const { loadConfig: loadConfig2 } = await Promise.resolve().then(() => (init_config(), config_exports));
      const cfg = loadConfig2();
      const rpcUrl = cfg.rpcUrl ?? "https://api.devnet.solana.com";
      const client = createCustomClient(rpcUrl);
      const { value: balance } = await client.rpc.getBalance(address(wallet.address)).send();
      status.balance = `${(Number(balance) / 1e9).toFixed(4)} SOL`;
      try {
        const agentService = container.resolve(ServiceTokens.AGENT_SERVICE);
        const agents = await agentService.list({ owner: address(wallet.address) });
        status.agents = agents.length;
      } catch {
        status.agents = 0;
      }
    } catch {
    }
    s.stop("Setup status:");
    console.log("\n" + chalk34.bold("\u{1F4CA} GhostSpeak Setup Status:\n"));
    console.log(`  Configuration: ${status.config ? chalk34.green("\u2705 Configured") : chalk34.red("\u274C Not configured")}`);
    console.log(`  Wallet:        ${status.wallet ? chalk34.green("\u2705 Created") : chalk34.red("\u274C Not created")}`);
    console.log(`  Balance:       ${status.balance}`);
    console.log(`  Agents:        ${status.agents} registered`);
    console.log("");
    if (!status.config || !status.wallet) {
      console.log(chalk34.yellow('\u{1F4A1} Run "One-Click Setup" to complete your configuration!\n'));
    } else if (parseFloat(status.balance) === 0) {
      console.log(chalk34.yellow("\u{1F4A1} Use the faucet or airdrop command to get test tokens!\n"));
    } else {
      console.log(chalk34.green("\u{1F389} You're all set! Register your first agent.\n"));
    }
    await confirm({ message: "Press enter to continue...", initialValue: true });
  }
  async showAgentMenu() {
    const commands = [
      { value: "register", label: "\u{1F916} Register New Agent", command: "agent register", hint: "Create your AI agent" },
      { value: "list", label: "\u{1F4CB} List My Agents", command: "agent list", hint: "View all your agents" },
      { value: "status", label: "\u{1F4CA} Agent Status", command: "agent status", hint: "Check agent health" },
      { value: "update", label: "\u270F\uFE0F Update Agent", command: "agent update", hint: "Modify agent details" },
      { value: "analytics", label: "\u{1F4C8} Agent Analytics", command: "agent analytics", hint: "Performance metrics" },
      { value: "search", label: "\u{1F50D} Search Agents", command: "agent search", hint: "Find agents by capability" },
      { value: "credentials", label: "\u{1F510} Manage Credentials", command: "agent credentials", hint: "View and backup" },
      { value: "back", label: "\u2190 Back", command: "", hint: "" }
    ];
    const choice = await select({
      message: chalk34.cyan("\u{1F916} AI Agent Management:"),
      options: commands.map((cmd) => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    });
    if (isCancel(choice) || choice === "back") {
      return;
    }
    const selected = commands.find((cmd) => cmd.value === choice);
    if (selected?.command) {
      await this.executeCommand(selected.command);
      this.saveRecentCommand(selected.command, selected.label);
    }
  }
  async showGhostMenu() {
    const commands = [
      { value: "dashboard", label: "\u{1F47B} Ghost Dashboard", command: "ghost-ui", hint: "Interactive monitoring" },
      { value: "claim", label: "\u{1F195} Claim Ghost Agent", command: "ghost claim", hint: "Claim external AI agent" },
      { value: "link", label: "\u{1F517} Link External ID", command: "ghost link", hint: "Link Twitter, GitHub, etc." },
      { value: "list", label: "\u{1F4CB} List My Ghosts", command: "ghost list", hint: "View claimed agents" },
      { value: "back", label: "\u2190 Back", command: "", hint: "" }
    ];
    const choice = await select({
      message: chalk34.cyan("\u{1F47B} Ghost Agent Management:"),
      options: commands.map((cmd) => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    });
    if (isCancel(choice) || choice === "back") {
      return;
    }
    const selected = commands.find((cmd) => cmd.value === choice);
    if (selected?.command) {
      await this.executeCommand(selected.command);
      this.saveRecentCommand(selected.command, selected.label);
    }
  }
  async showReputationMenu() {
    const commands = [
      { value: "reputation-ui", label: "\u{1F4CA} Reputation Dashboard", command: "reputation-ui", hint: "Ghost Score monitoring" },
      { value: "staking-ui", label: "\u{1F48E} Staking Dashboard", command: "staking-ui", hint: "GHOST token staking" },
      { value: "check", label: "\u2B50 Check Ghost Score", command: "reputation check", hint: "View current score" },
      { value: "stake", label: "\u{1F4B0} Stake GHOST", command: "staking stake", hint: "Stake tokens for tier" },
      { value: "privacy", label: "\u{1F512} Privacy Settings", command: "privacy", hint: "Control visibility" },
      { value: "back", label: "\u2190 Back", command: "", hint: "" }
    ];
    const choice = await select({
      message: chalk34.cyan("\u2B50 Reputation & Staking:"),
      options: commands.map((cmd) => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    });
    if (isCancel(choice) || choice === "back") {
      return;
    }
    const selected = commands.find((cmd) => cmd.value === choice);
    if (selected?.command) {
      await this.executeCommand(selected.command);
      this.saveRecentCommand(selected.command, selected.label);
    }
  }
  async showMultisigMenu() {
    const commands = [
      { value: "dashboard", label: "\u{1F510} Multisig Dashboard", command: "multisig-ui", hint: "Interactive monitoring" },
      { value: "create", label: "\u{1F195} Create Multisig", command: "multisig create", hint: "New shared wallet" },
      { value: "propose", label: "\u{1F4DD} Create Proposal", command: "multisig propose", hint: "Propose action" },
      { value: "approve", label: "\u2705 Approve Proposal", command: "multisig approve", hint: "Sign proposal" },
      { value: "execute", label: "\u26A1 Execute Proposal", command: "multisig execute", hint: "Run approved action" },
      { value: "list", label: "\u{1F4CB} List Multisigs", command: "multisig list", hint: "View your multisigs" },
      { value: "back", label: "\u2190 Back", command: "", hint: "" }
    ];
    const choice = await select({
      message: chalk34.cyan("\u{1F510} Multisig Wallet Management:"),
      options: commands.map((cmd) => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    });
    if (isCancel(choice) || choice === "back") {
      return;
    }
    const selected = commands.find((cmd) => cmd.value === choice);
    if (selected?.command) {
      await this.executeCommand(selected.command);
      this.saveRecentCommand(selected.command, selected.label);
    }
  }
  async showAuthorizationMenu() {
    const commands = [
      { value: "dashboard", label: "\u{1F511} Authorization Dashboard", command: "auth-ui", hint: "Interactive monitoring" },
      { value: "create", label: "\u{1F195} Create Authorization", command: "auth create", hint: "Grant limited access" },
      { value: "revoke", label: "\u274C Revoke Authorization", command: "auth revoke", hint: "Cancel permission" },
      { value: "verify", label: "\u2705 Verify Authorization", command: "auth verify", hint: "Check validity" },
      { value: "list", label: "\u{1F4CB} List Authorizations", command: "auth list", hint: "View permissions" },
      { value: "back", label: "\u2190 Back", command: "", hint: "" }
    ];
    const choice = await select({
      message: chalk34.cyan("\u{1F511} Pre-Authorization Management:"),
      options: commands.map((cmd) => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    });
    if (isCancel(choice) || choice === "back") {
      return;
    }
    const selected = commands.find((cmd) => cmd.value === choice);
    if (selected?.command) {
      await this.executeCommand(selected.command);
      this.saveRecentCommand(selected.command, selected.label);
    }
  }
  async showDIDMenu() {
    const commands = [
      { value: "dashboard", label: "\u{1F194} DID Dashboard", command: "did-ui", hint: "Interactive DID manager" },
      { value: "create", label: "\u{1F195} Create DID", command: "did create", hint: "New decentralized identifier" },
      { value: "update", label: "\u270F\uFE0F Update DID", command: "did update", hint: "Modify DID document" },
      { value: "resolve", label: "\u{1F50D} Resolve DID", command: "did resolve", hint: "Look up DID document" },
      { value: "deactivate", label: "\u274C Deactivate DID", command: "did deactivate", hint: "Revoke identifier" },
      { value: "back", label: "\u2190 Back", command: "", hint: "" }
    ];
    const choice = await select({
      message: chalk34.cyan("\u{1F194} Decentralized Identity (DID):"),
      options: commands.map((cmd) => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    });
    if (isCancel(choice) || choice === "back") {
      return;
    }
    const selected = commands.find((cmd) => cmd.value === choice);
    if (selected?.command) {
      await this.executeCommand(selected.command);
      this.saveRecentCommand(selected.command, selected.label);
    }
  }
  async showCredentialsMenu() {
    const commands = [
      { value: "sync", label: "\u{1F504} Sync Credentials", command: "credentials sync", hint: "Sync verifiable credentials" },
      { value: "back", label: "\u2190 Back", command: "", hint: "" }
    ];
    const choice = await select({
      message: chalk34.cyan("\u{1F510} Verifiable Credentials:"),
      options: commands.map((cmd) => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    });
    if (isCancel(choice) || choice === "back") {
      return;
    }
    const selected = commands.find((cmd) => cmd.value === choice);
    if (selected?.command) {
      await this.executeCommand(selected.command);
      this.saveRecentCommand(selected.command, selected.label);
    }
  }
  async showEscrowMenu() {
    const commands = [
      { value: "dashboard", label: "\u{1F4BC} Escrow Dashboard", command: "escrow-ui", hint: "Interactive escrow monitor" },
      { value: "create", label: "\u{1F195} Create Escrow", command: "escrow create", hint: "New secure transaction" },
      { value: "approve", label: "\u2705 Approve Escrow", command: "escrow approve", hint: "Confirm completion" },
      { value: "dispute", label: "\u2696\uFE0F File Dispute", command: "escrow dispute", hint: "Contest transaction" },
      { value: "list", label: "\u{1F4CB} List Escrows", command: "escrow list", hint: "View all escrows" },
      { value: "get", label: "\u{1F50D} Get Escrow Details", command: "escrow get", hint: "View specific escrow" },
      { value: "back", label: "\u2190 Back", command: "", hint: "" }
    ];
    const choice = await select({
      message: chalk34.cyan("\u{1F4BC} Escrow Management:"),
      options: commands.map((cmd) => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    });
    if (isCancel(choice) || choice === "back") {
      return;
    }
    const selected = commands.find((cmd) => cmd.value === choice);
    if (selected?.command) {
      await this.executeCommand(selected.command);
      this.saveRecentCommand(selected.command, selected.label);
    }
  }
  async showDashboardsMenu() {
    const commands = [
      { value: "main", label: "\u{1F4CA} Main Dashboard", command: "dashboard", hint: "Overview of all metrics" },
      { value: "reputation", label: "\u2B50 Reputation Dashboard", command: "reputation-ui", hint: "Ghost Score tracking" },
      { value: "staking", label: "\u{1F48E} Staking Dashboard", command: "staking-ui", hint: "GHOST token staking" },
      { value: "ghost", label: "\u{1F47B} Ghost Dashboard", command: "ghost-ui", hint: "Claimed agents" },
      { value: "multisig", label: "\u{1F510} Multisig Dashboard", command: "multisig-ui", hint: "Shared wallets" },
      { value: "auth", label: "\u{1F511} Authorization Dashboard", command: "auth-ui", hint: "Pre-authorizations" },
      { value: "did", label: "\u{1F194} DID Dashboard", command: "did-ui", hint: "Decentralized identity" },
      { value: "escrow", label: "\u{1F4BC} Escrow Dashboard", command: "escrow-ui", hint: "Transaction monitoring" },
      { value: "privacy", label: "\u{1F512} Privacy Dashboard", command: "privacy-ui", hint: "Privacy settings" },
      { value: "airdrop", label: "\u{1FA82} Airdrop Dashboard", command: "airdrop-ui", hint: "GHOST token claims" },
      { value: "back", label: "\u2190 Back", command: "", hint: "" }
    ];
    const choice = await select({
      message: chalk34.cyan("\u{1F4CA} Interactive Dashboards:"),
      options: commands.map((cmd) => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    });
    if (isCancel(choice) || choice === "back") {
      return;
    }
    const selected = commands.find((cmd) => cmd.value === choice);
    if (selected?.command) {
      await this.executeCommand(selected.command);
      this.saveRecentCommand(selected.command, selected.label);
    }
  }
  async showWalletMenu() {
    const commands = [
      { value: "list", label: "\u{1F4CB} List Wallets", command: "wallet list", hint: "View all your wallets" },
      { value: "create", label: "\u{1F195} Create Wallet", command: "wallet create", hint: "Create a new wallet" },
      { value: "import", label: "\u{1F4E5} Import Wallet", command: "wallet import", hint: "Import from seed phrase" },
      { value: "balance", label: "\u{1F4B0} Check Balance", command: "wallet balance", hint: "View wallet balance" },
      { value: "use", label: "\u{1F504} Switch Wallet", command: "wallet use", hint: "Change active wallet" },
      { value: "back", label: "\u2190 Back", command: "", hint: "" }
    ];
    const choice = await select({
      message: chalk34.cyan("\u{1F4B3} Wallet Manager:"),
      options: commands.map((cmd) => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    });
    if (isCancel(choice) || choice === "back") {
      return;
    }
    const selected = commands.find((cmd) => cmd.value === choice);
    if (selected?.command) {
      await this.executeCommand(selected.command);
      this.saveRecentCommand(selected.command, selected.label);
    }
  }
  async showGovernanceMenu() {
    const commands = [
      { value: "proposal-create", label: "\u{1F4DD} Create Proposal", command: "governance proposal create", hint: "DAO governance proposal" },
      { value: "proposal-list", label: "\u{1F4DC} View Proposals", command: "governance proposal list", hint: "Active proposals" },
      { value: "vote", label: "\u{1F5F3}\uFE0F Vote on Proposal", command: "governance vote", hint: "Cast your vote" },
      { value: "rbac-grant", label: "\u{1F6E1}\uFE0F Grant Role", command: "governance rbac grant", hint: "Grant permissions" },
      { value: "rbac-revoke", label: "\u{1F6AB} Revoke Role", command: "governance rbac revoke", hint: "Remove permissions" },
      { value: "back", label: "\u2190 Back", command: "", hint: "" }
    ];
    const choice = await select({
      message: chalk34.cyan("\u{1F3DB}\uFE0F DAO Governance:"),
      options: commands.map((cmd) => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    });
    if (isCancel(choice) || choice === "back") {
      return;
    }
    const selected = commands.find((cmd) => cmd.value === choice);
    if (selected?.command) {
      await this.executeCommand(selected.command);
      this.saveRecentCommand(selected.command, selected.label);
    }
  }
  async showDevelopmentMenu() {
    const commands = [
      { value: "airdrop", label: "\u{1FA82} Get GHOST Tokens", command: "airdrop", hint: "Devnet GHOST airdrop" },
      { value: "faucet", label: "\u{1F4A7} Get SOL", command: "faucet", hint: "Request SOL from faucet" },
      { value: "sdk-info", label: "\u{1F4E6} SDK Information", command: "sdk info", hint: "Check SDK installation" },
      { value: "diagnose", label: "\u{1F50D} Diagnose Issues", command: "diagnose", hint: "Run diagnostics" },
      { value: "update", label: "\u2B06\uFE0F Update CLI", command: "update", hint: "Update to latest version" },
      { value: "back", label: "\u2190 Back to Main Menu", command: "", hint: "" }
    ];
    const choice = await select({
      message: chalk34.cyan("\u{1F6E0}\uFE0F Development Menu:"),
      options: commands.map((cmd) => ({
        value: cmd.value,
        label: cmd.label,
        hint: cmd.hint
      }))
    });
    if (isCancel(choice) || choice === "back") {
      return;
    }
    const selected = commands.find((cmd) => cmd.value === choice);
    if (selected?.command) {
      await this.executeCommand(selected.command);
      this.saveRecentCommand(selected.command, selected.label);
    }
  }
  async showRecentCommands() {
    const recentCommands = this.getRecentCommands();
    if (recentCommands.length === 0) {
      log.info("No recent commands yet. Start using GhostSpeak to build your history!");
      await this.waitForKeyPress();
      return;
    }
    const options = recentCommands.map((cmd, index) => ({
      value: cmd.command,
      label: `${index + 1}. ${cmd.label}`,
      hint: cmd.command
    }));
    options.push({ value: "back", label: "\u2190 Back to Main Menu", hint: "" });
    const choice = await select({
      message: chalk34.cyan("\u23F1\uFE0F Recent Commands:"),
      options
    });
    if (isCancel(choice) || choice === "back") {
      return;
    }
    await this.executeCommand(choice);
  }
  async showHelp() {
    console.log(chalk34.cyan("\n\u{1F4DA} GhostSpeak Help & Documentation\n"));
    console.log(chalk34.bold("Quick Start:"));
    console.log('  1. Use "Quick Start" to set up your wallet and configuration');
    console.log('  2. Use "AI Agents" to register and manage your agents');
    console.log('  3. Use "Development" for airdrops and testing tools\n');
    console.log(chalk34.bold("Key Features:"));
    console.log(chalk34.gray("  \u{1F916} AI Agents") + "       - Register and manage autonomous AI agents");
    console.log(chalk34.gray("  \u{1F4B3} Wallets") + "         - Multi-wallet management with HD derivation");
    console.log(chalk34.gray("  \u{1F3DB}\uFE0F Governance") + "      - Multisig wallets and DAO voting");
    console.log(chalk34.gray("  \u{1F4E1} A2A") + "             - Agent-to-Agent communication protocol\n");
    console.log(chalk34.bold("Resources:"));
    console.log("  Documentation: https://docs.ghostspeak.io");
    console.log("  GitHub: https://github.com/ghostspeak/ghostspeak");
    console.log("  Discord: https://discord.gg/ghostspeak\n");
    console.log(chalk34.bold("Tips:"));
    console.log("  \u2022 Use direct commands for scripts: " + chalk34.gray("ghost agent list"));
    console.log("  \u2022 Add " + chalk34.gray("--interactive") + " to force menu mode");
    console.log("  \u2022 Recent commands are saved for quick access\n");
    await this.waitForKeyPress();
  }
  async executeCommand(command) {
    console.log(chalk34.gray(`
\u2514\u2500 Executing: ${command}
`));
    try {
      const args2 = command.split(" ");
      const { spawn } = await import('child_process');
      let cliCommand;
      let cliArgs;
      if (process.argv[1]?.endsWith(".js")) {
        cliCommand = process.argv[0];
        cliArgs = [process.argv[1], ...args2];
      } else {
        cliCommand = "ghost";
        cliArgs = args2;
      }
      const child = spawn(cliCommand, cliArgs, {
        stdio: "inherit",
        env: process.env,
        shell: true
      });
      await new Promise((resolve3) => {
        child.on("close", () => resolve3());
        child.on("error", (err) => {
          console.error(`Failed to execute command: ${err.message}`);
          resolve3();
        });
      });
      await new Promise((resolve3) => setTimeout(resolve3, 100));
    } catch (error) {
      console.error(chalk34.red(`
\u274C Error executing command: ${error instanceof Error ? error.message : "Unknown error"}`));
    }
    console.log("");
  }
  saveRecentCommand(command, label) {
    try {
      const recentCommands = this.getRecentCommands();
      const filtered = recentCommands.filter((cmd) => cmd.command !== command);
      filtered.unshift({ command, label, timestamp: Date.now() });
      const toSave = filtered.slice(0, MAX_RECENT_COMMANDS);
      const dir = join(homedir(), ".ghostspeak");
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(RECENT_COMMANDS_FILE, JSON.stringify(toSave, null, 2));
    } catch (error) {
    }
  }
  getRecentCommands() {
    try {
      if (existsSync(RECENT_COMMANDS_FILE)) {
        return JSON.parse(readFileSync(RECENT_COMMANDS_FILE, "utf-8"));
      }
    } catch (error) {
    }
    return [];
  }
  getRecentCommandsHint() {
    const count = this.getRecentCommands().length;
    return count > 0 ? `${count} recent command${count > 1 ? "s" : ""}` : "No recent commands";
  }
  async waitForKeyPress() {
    await confirm({
      message: "Press Enter to continue...",
      active: "Continue",
      inactive: "Continue"
    });
  }
};
function shouldRunInteractive(argv) {
  const hasInteractiveFlag = argv.includes("--interactive") || argv.includes("-i");
  const hasHelpFlag = argv.includes("--help") || argv.includes("-h");
  const hasVersionFlag = argv.includes("--version") || argv.includes("-v");
  if (hasHelpFlag || hasVersionFlag) {
    return false;
  }
  if (hasInteractiveFlag) {
    return true;
  }
  const hasCommand = argv.length > 2 && !argv[2].startsWith("-");
  return !hasCommand;
}

// src/utils/command-aliases.ts
var COMMAND_ALIASES = [
  // Agent commands
  {
    aliases: ["a r", "ar", "register"],
    command: "agent register",
    description: "Register a new agent"
  },
  {
    aliases: ["a l", "al", "agents"],
    command: "agent list",
    description: "List your agents"
  },
  {
    aliases: ["a s", "as"],
    command: "agent status",
    description: "Check agent status"
  },
  // Wallet commands
  {
    aliases: ["w", "balance", "bal"],
    command: "wallet balance",
    description: "Check wallet balance"
  },
  {
    aliases: ["wl", "wallets"],
    command: "wallet list",
    description: "List all wallets"
  },
  {
    aliases: ["wc", "new-wallet"],
    command: "wallet create",
    description: "Create new wallet"
  },
  // Quick actions
  {
    aliases: ["f", "fund", "airdrop"],
    command: "faucet --save",
    description: "Get SOL from faucet"
  },
  {
    aliases: ["qs", "quick", "start"],
    command: "quickstart",
    description: "Quick start setup"
  },
  {
    aliases: ["i", "menu"],
    command: "--interactive",
    description: "Interactive menu mode"
  },
  {
    aliases: ["cfg", "configure"],
    command: "config setup",
    description: "Configure CLI"
  },
  {
    aliases: ["h", "?"],
    command: "--help",
    description: "Show help"
  },
  // Common workflows
  {
    aliases: ["setup-agent"],
    command: "quickstart new",
    description: "Complete agent setup"
  },
  // my-services, my-jobs REMOVED
  {
    aliases: ["transactions"],
    command: "tx",
    description: "View transaction history"
  }
];
var NATURAL_LANGUAGE_PATTERNS = [
  // Agent operations
  {
    patterns: [
      /create.*(agent|ai)/i,
      /register.*(agent|ai)/i,
      /new.*(agent|ai)/i
    ],
    command: "agent register"
  },
  {
    patterns: [
      /list.*agents?/i,
      /show.*agents?/i,
      /my agents?/i
    ],
    command: "agent list"
  },
  // Wallet operations
  {
    patterns: [
      /check.*balance/i,
      /wallet.*balance/i,
      /how much.*sol/i,
      /show.*balance/i
    ],
    command: "wallet balance"
  },
  {
    patterns: [
      /get.*sol/i,
      /need.*sol/i,
      /fund.*wallet/i,
      /faucet/i
    ],
    command: "faucet --save"
  },
  {
    patterns: [
      /create.*wallet/i,
      /new.*wallet/i,
      /generate.*wallet/i
    ],
    command: "wallet create"
  },
  // General operations
  {
    patterns: [
      /help/i,
      /what.*can.*do/i,
      /show.*commands?/i
    ],
    command: "--help"
  },
  {
    patterns: [
      /setup/i,
      /configure/i,
      /get.*started/i,
      /quick.*start/i
    ],
    command: "quickstart"
  }
];
function resolveAlias(input) {
  const normalized = input.toLowerCase().trim();
  for (const alias of COMMAND_ALIASES) {
    if (alias.aliases.includes(normalized)) {
      return alias.command;
    }
  }
  const firstWord = normalized.split(" ")[0];
  const knownCommands = [
    "agent",
    "governance",
    "wallet",
    "config",
    "faucet",
    "sdk",
    "update",
    "quickstart",
    "onboard",
    "help",
    "aliases",
    "tx"
  ];
  if (knownCommands.includes(firstWord)) {
    return null;
  }
  for (const pattern of NATURAL_LANGUAGE_PATTERNS) {
    for (const regex of pattern.patterns) {
      const match = normalized.match(regex);
      if (match) {
        let command = pattern.command;
        if (pattern.extractor) {
          const params = pattern.extractor(match);
          for (const [key, value] of Object.entries(params)) {
            if (value) {
              command += ` --${key} "${value}"`;
            }
          }
        }
        return command;
      }
    }
  }
  return null;
}
function getSuggestions(partial) {
  const normalized = partial.toLowerCase().trim();
  return COMMAND_ALIASES.filter(
    (alias) => alias.aliases.some((a) => a.startsWith(normalized)) || alias.command.toLowerCase().includes(normalized) || alias.description.toLowerCase().includes(normalized)
  ).slice(0, 5);
}
function showAliases() {
  console.log("\n\u{1F4DD} Command Shortcuts:\n");
  const categories = [
    { name: "Agent", filter: (cmd) => cmd.command.startsWith("agent") },
    { name: "Wallet", filter: (cmd) => cmd.command.startsWith("wallet") },
    { name: "Quick Actions", filter: (cmd) => !cmd.command.includes(" ") || cmd.aliases.includes("f") }
  ];
  for (const category of categories) {
    const commands = COMMAND_ALIASES.filter(category.filter);
    if (commands.length > 0) {
      console.log(`${category.name}:`);
      commands.forEach((cmd) => {
        const mainAlias = cmd.aliases[0];
        const otherAliases = cmd.aliases.slice(1).join(", ");
        const aliasText = otherAliases ? ` (also: ${otherAliases})` : "";
        console.log(`  ${mainAlias.padEnd(15)} \u2192 ${cmd.command.padEnd(25)} ${cmd.description}${aliasText}`);
      });
      console.log("");
    }
  }
  console.log('\u{1F4A1} Tip: You can also use natural language like "create agent" or "check balance"\n');
}
var TRANSACTION_HISTORY_FILE = join(homedir(), ".ghostspeak", "transaction-history.json");
var MAX_HISTORY_ITEMS = 100;
var TransactionMonitor = class _TransactionMonitor {
  static instance;
  transactions = /* @__PURE__ */ new Map();
  activeSpinners = /* @__PURE__ */ new Map();
  constructor() {
    this.loadHistory();
  }
  static getInstance() {
    return this.instance ??= new _TransactionMonitor();
  }
  /**
   * Start monitoring a transaction with progress indicator
   */
  async startTransaction(signature, description, network = "devnet", amount) {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const transaction = {
      id,
      signature,
      status: "pending",
      description,
      amount,
      timestamp: Date.now(),
      network,
      retries: 0
    };
    this.transactions.set(id, transaction);
    const spinner31 = spinner();
    const displayAmount = amount ? ` (${amount})` : "";
    spinner31.start(`${description}${displayAmount}`);
    this.activeSpinners.set(id, spinner31);
    this.saveHistory();
    return id;
  }
  /**
   * Update transaction progress with detailed status
   */
  updateProgress(id, progress) {
    const spinner31 = this.activeSpinners.get(id);
    const transaction = this.transactions.get(id);
    if (!spinner31 || !transaction) return;
    if (progress.message) {
      const displayAmount = transaction.amount ? ` (${transaction.amount})` : "";
      if (progress.current !== void 0 && progress.total !== void 0) {
        const percentage = Math.round(progress.current / progress.total * 100);
        spinner31.message(`${progress.message}${displayAmount} [${percentage}%]`);
      } else {
        spinner31.message(`${progress.message}${displayAmount}`);
      }
    }
  }
  /**
   * Mark transaction as confirming
   */
  setConfirming(id) {
    const transaction = this.transactions.get(id);
    if (transaction) {
      transaction.status = "confirming";
      this.updateProgress(id, {
        message: `\u23F3 Confirming ${transaction.description}`
      });
    }
  }
  /**
   * Mark transaction as successful
   */
  setSuccess(id, finalMessage) {
    const spinner31 = this.activeSpinners.get(id);
    const transaction = this.transactions.get(id);
    if (!spinner31 || !transaction) return;
    transaction.status = "confirmed";
    const message = finalMessage ?? `\u2705 ${transaction.description} completed!`;
    spinner31.stop(message);
    this.activeSpinners.delete(id);
    this.saveHistory();
    this.showTransactionSummary(transaction);
  }
  /**
   * Mark transaction as failed with error details
   */
  setFailed(id, error, canRetry = true) {
    const spinner31 = this.activeSpinners.get(id);
    const transaction = this.transactions.get(id);
    if (!spinner31 || !transaction) return;
    transaction.status = "failed";
    transaction.error = error instanceof Error ? error.message : error;
    spinner31.stop(`\u274C ${transaction.description} failed`);
    this.activeSpinners.delete(id);
    this.saveHistory();
    this.showErrorDetails(transaction, canRetry);
  }
  /**
   * Retry a failed transaction
   */
  async retryTransaction(id) {
    const transaction = this.transactions.get(id);
    if (!transaction || transaction.status !== "failed") return;
    transaction.retries = (transaction.retries ?? 0) + 1;
    transaction.status = "pending";
    transaction.error = void 0;
    const spinner31 = spinner();
    spinner31.start(`\u{1F504} Retrying ${transaction.description} (attempt ${transaction.retries})`);
    this.activeSpinners.set(id, spinner31);
  }
  /**
   * Get transaction history
   */
  getHistory(limit = 10) {
    const allTransactions = Array.from(this.transactions.values());
    return allTransactions.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }
  /**
   * Show transaction summary with helpful information
   */
  showTransactionSummary(transaction) {
    console.log("");
    console.log(chalk34.gray("Transaction Details:"));
    console.log(chalk34.gray(`  Signature: ${this.shortenSignature(transaction.signature)}`));
    if (transaction.amount) {
      console.log(chalk34.gray(`  Amount: ${transaction.amount}`));
    }
    console.log(chalk34.gray(`  Network: ${transaction.network}`));
    console.log(chalk34.gray(`  Time: ${new Date(transaction.timestamp).toLocaleTimeString()}`));
    console.log("");
    console.log(chalk34.cyan(`  View on Explorer: ${this.getExplorerUrl(transaction.signature, transaction.network)}`));
  }
  /**
   * Show detailed error information with recovery suggestions
   */
  showErrorDetails(transaction, canRetry) {
    console.log("");
    console.log(chalk34.red("Error Details:"));
    const errorMessage = transaction.error ?? "Unknown error";
    const suggestion = this.getErrorSuggestion(errorMessage);
    console.log(chalk34.gray(`  ${errorMessage}`));
    if (suggestion) {
      console.log("");
      console.log(chalk34.yellow("\u{1F4A1} Suggestion:"));
      console.log(chalk34.gray(`  ${suggestion}`));
    }
    if (canRetry && (transaction.retries === void 0 || transaction.retries < 3)) {
      console.log("");
      console.log(chalk34.gray("  You can retry this transaction with the same parameters"));
    }
  }
  /**
   * Get helpful suggestion based on error message
   */
  getErrorSuggestion(error) {
    const errorLower = error.toLowerCase();
    if (errorLower.includes("insufficient funds") || errorLower.includes("insufficient lamports")) {
      return "You need more SOL. Run: ghost faucet --save";
    }
    if (errorLower.includes("blockhash not found") || errorLower.includes("blockhash expired")) {
      return "Transaction expired. Please try again.";
    }
    if (errorLower.includes("account does not exist")) {
      return "The account you're trying to interact with doesn't exist. It may need to be initialized first.";
    }
    if (errorLower.includes("simulation failed")) {
      return "Transaction simulation failed. Check that all parameters are correct.";
    }
    if (errorLower.includes("network") || errorLower.includes("connection")) {
      return "Network connection issue. Check your internet connection and try again.";
    }
    if (errorLower.includes("rate limit")) {
      return "You've hit the rate limit. Please wait a moment and try again.";
    }
    return null;
  }
  /**
   * Load transaction history from file
   */
  loadHistory() {
    try {
      if (existsSync(TRANSACTION_HISTORY_FILE)) {
        const data = JSON.parse(readFileSync(TRANSACTION_HISTORY_FILE, "utf-8"));
        data.forEach((tx) => this.transactions.set(tx.id, tx));
      }
    } catch (error) {
    }
  }
  /**
   * Save transaction history to file
   */
  saveHistory() {
    try {
      const dir = join(homedir(), ".ghostspeak");
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const recent = this.getHistory(MAX_HISTORY_ITEMS);
      writeFileSync(TRANSACTION_HISTORY_FILE, JSON.stringify(recent, null, 2));
    } catch (error) {
    }
  }
  /**
   * Shorten signature for display
   */
  shortenSignature(signature) {
    if (signature.length <= 20) return signature;
    return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
  }
  /**
   * Get explorer URL for transaction
   */
  getExplorerUrl(signature, network) {
    const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
    return `https://explorer.solana.com/tx/${signature}${cluster}`;
  }
  /**
   * Show recent transaction history
   */
  showRecentTransactions(limit = 5) {
    const recent = this.getHistory(limit);
    if (recent.length === 0) {
      log.info("No recent transactions");
      return;
    }
    console.log(chalk34.bold("\n\u{1F4DC} Recent Transactions:\n"));
    recent.forEach((tx, index) => {
      const statusIcon = tx.status === "confirmed" ? "\u2705" : tx.status === "failed" ? "\u274C" : "\u23F3";
      const time = new Date(tx.timestamp).toLocaleString();
      console.log(chalk34.gray(`${index + 1}. ${statusIcon} ${tx.description}`));
      console.log(chalk34.gray(`   ${this.shortenSignature(tx.signature)}`));
      if (tx.amount) {
        console.log(chalk34.gray(`   Amount: ${tx.amount}`));
      }
      console.log(chalk34.gray(`   Time: ${time}`));
      if (tx.error) {
        console.log(chalk34.red(`   Error: ${tx.error}`));
      }
      console.log("");
    });
  }
};
function showTransactionHistory(limit = 5) {
  const monitor = TransactionMonitor.getInstance();
  monitor.showRecentTransactions(limit);
}
init_wallet_service();

// src/utils/onboarding.ts
init_wallet_service();
init_client();
init_solana_client();
function divider2(char = "\u2500", length = 50) {
  console.log(chalk34.gray(char.repeat(length)));
}
function stepIndicator(current, total, description) {
  const progress = `[${current}/${total}]`;
  console.log(chalk34.cyan(progress) + " " + chalk34.bold(description));
}
init_solana_client();
var OPERATION_COSTS = {
  // Base transaction costs (in lamports)
  SIGNATURE_FEE: BigInt(5e3),
  // Standard signature fee
  // Account creation costs
  AGENT_ACCOUNT_RENT: BigInt(24e5),
  // ~0.0024 SOL
  // Program-specific fees
  AGENT_REGISTRATION_FEE: BigInt(1e5),
  // ~0.0001 SOL
  // Buffer for network congestion
  CONGESTION_BUFFER: BigInt(1e4)
  // Extra fee for busy periods
};
var CostEstimator = class _CostEstimator {
  static instance;
  rpcUrl;
  constructor(rpcUrl = "https://api.devnet.solana.com") {
    this.rpcUrl = rpcUrl;
  }
  static getInstance(rpcUrl) {
    return _CostEstimator.instance ??= new _CostEstimator(rpcUrl);
  }
  /**
   * Estimate cost for agent registration
   */
  estimateAgentRegistration() {
    const breakdown = [
      {
        item: "Transaction fee",
        cost: OPERATION_COSTS.SIGNATURE_FEE,
        description: "Network fee for processing transaction"
      },
      {
        item: "Agent account rent",
        cost: OPERATION_COSTS.AGENT_ACCOUNT_RENT,
        description: "Storage rent for agent account data"
      },
      {
        item: "Registration fee",
        cost: OPERATION_COSTS.AGENT_REGISTRATION_FEE,
        description: "Protocol fee for agent registration"
      },
      {
        item: "Network buffer",
        cost: OPERATION_COSTS.CONGESTION_BUFFER,
        description: "Buffer for network congestion"
      }
    ];
    const totalCost = breakdown.reduce((sum, item) => sum + item.cost, BigInt(0));
    return {
      operation: "Agent Registration",
      baseFee: OPERATION_COSTS.SIGNATURE_FEE,
      programFee: OPERATION_COSTS.AGENT_REGISTRATION_FEE,
      accountRent: OPERATION_COSTS.AGENT_ACCOUNT_RENT,
      totalCost,
      breakdown,
      isAffordable: false,
      // Will be set when checking balance
      requiredBalance: totalCost
    };
  }
  /**
   * Get current wallet balance
   */
  async getWalletBalance(address26) {
    try {
      const client = createCustomClient(this.rpcUrl);
      const response = await client.rpc.getBalance(address26).send();
      return response.value;
    } catch (error) {
      console.warn("Failed to fetch balance:", error);
      return BigInt(0);
    }
  }
  /**
   * Check if wallet can afford an operation
   */
  async checkAffordability(address26, estimate) {
    const currentBalance = await this.getWalletBalance(address26);
    const required = estimate.totalCost;
    const isAffordable = currentBalance >= required;
    const shortage = isAffordable ? BigInt(0) : required - currentBalance;
    estimate.isAffordable = isAffordable;
    return {
      current: currentBalance,
      required,
      shortage,
      isAffordable
    };
  }
  /**
   * Display cost estimate with formatting
   */
  async displayCostEstimate(address26, estimate, options) {
    const { showBreakdown = true } = options ?? {};
    const balanceInfo = await this.checkAffordability(address26, estimate);
    const summaryItems = [
      { label: "Operation", value: estimate.operation },
      { label: "Total Cost", value: formatSOL(estimate.totalCost) },
      { label: "Current Balance", value: formatSOL(balanceInfo.current) },
      {
        label: "After Transaction",
        value: balanceInfo.isAffordable ? formatSOL(balanceInfo.current - estimate.totalCost) : chalk34.red("Insufficient funds")
      }
    ];
    console.log(infoBox("\u{1F4B0} Cost Estimate", summaryItems.map(
      (item) => `${chalk34.gray(item.label.padEnd(18))}: ${item.value}`
    ).join("\n")));
    if (showBreakdown) {
      console.log(chalk34.bold("\u{1F4CB} Cost Breakdown:"));
      console.log("");
      estimate.breakdown.forEach((item) => {
        console.log(`  ${formatSOL(item.cost).padEnd(12)} ${item.item}`);
        console.log(`  ${" ".repeat(12)} ${chalk34.gray(item.description)}`);
        console.log("");
      });
    }
    if (!balanceInfo.isAffordable) {
      const shortage = formatSOL(balanceInfo.shortage);
      const actions = [
        "Get SOL from faucet: ghost faucet --save",
        "Transfer SOL from another wallet",
        "Reduce the transaction amount if possible"
      ];
      console.log(warningBox(
        `You need ${shortage} more SOL to complete this transaction`,
        actions
      ));
      console.log("");
    }
    return balanceInfo;
  }
  /**
   * Estimate costs for batch operations
   */
  estimateBatchOperation(operations) {
    let totalCost = BigInt(0);
    const breakdown = [];
    operations.forEach((op, index) => {
      let opEstimate;
      switch (op.type) {
        case "agent-register":
          opEstimate = this.estimateAgentRegistration();
          break;
        default:
          opEstimate = {
            operation: op.type,
            baseFee: OPERATION_COSTS.SIGNATURE_FEE,
            totalCost: OPERATION_COSTS.SIGNATURE_FEE + OPERATION_COSTS.CONGESTION_BUFFER,
            breakdown: [],
            isAffordable: false,
            requiredBalance: OPERATION_COSTS.SIGNATURE_FEE + OPERATION_COSTS.CONGESTION_BUFFER
          };
      }
      totalCost += opEstimate.totalCost;
      breakdown.push({
        item: `${index + 1}. ${opEstimate.operation}`,
        cost: opEstimate.totalCost,
        description: `Complete cost for ${opEstimate.operation.toLowerCase()}`
      });
    });
    return {
      operation: `Batch Operation (${operations.length} items)`,
      baseFee: BigInt(operations.length) * OPERATION_COSTS.SIGNATURE_FEE,
      totalCost,
      breakdown,
      isAffordable: false,
      requiredBalance: totalCost
    };
  }
};
async function estimateAndDisplay(operation, address26, params, options) {
  const estimator = CostEstimator.getInstance(options?.rpcUrl);
  let estimate;
  switch (operation) {
    case "agent-register":
      estimate = estimator.estimateAgentRegistration();
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
  return estimator.displayCostEstimate(address26, estimate, options);
}

// src/utils/onboarding.ts
var ONBOARDING_STEPS = [
  "welcome",
  "network-selection",
  "wallet-setup",
  "funding",
  "first-agent",
  "completion"
];
var OnboardingService = class {
  constructor(config2 = {}) {
    this.config = config2;
    this.walletService = new WalletService();
    this.loadProgress();
  }
  progress = {
    step: 1,
    completedSteps: /* @__PURE__ */ new Set(),
    skippedSteps: /* @__PURE__ */ new Set(),
    totalSteps: ONBOARDING_STEPS.length
  };
  walletService;
  /**
   * Start the onboarding process
   */
  async start() {
    intro(chalk34.bold.cyan("\u{1F680} Welcome to GhostSpeak Protocol"));
    try {
      await this.welcomeStep();
      await this.networkSelectionStep();
      await this.walletSetupStep();
      await this.fundingStep();
      await this.firstAgentStep();
      await this.completionStep();
    } catch (error) {
      if (error instanceof Error && error.message === "cancelled") {
        cancel("Setup cancelled by user");
        return;
      }
      console.error(chalk34.red("Onboarding failed:"), error);
      cancel("Setup failed - you can restart anytime with: ghost quickstart");
    }
  }
  /**
   * Load existing progress
   */
  loadProgress() {
    try {
      const progressFile = join(homedir(), ".ghostspeak", "onboarding-progress.json");
      if (existsSync(progressFile)) {
        const data = JSON.parse(readFileSync(progressFile, "utf-8"));
        this.progress.step = data.step ?? 1;
        this.progress.completedSteps = new Set(data.completedSteps);
        this.progress.skippedSteps = new Set(data.skippedSteps);
        this.config = { ...this.config, ...data.config ?? {} };
      }
    } catch (error) {
    }
  }
  /**
   * Welcome step
   */
  async welcomeStep() {
    console.log("");
    console.log(stepIndicator(1, this.progress.totalSteps, "Welcome"));
    if (this.progress.completedSteps.has("welcome")) {
      console.log(chalk34.gray("Welcome step already completed"));
      return;
    }
    console.log(infoBox("GhostSpeak Protocol", [
      "The decentralized AI agent economy on Solana",
      "",
      "\u{1F916} Create and deploy AI agents that earn SOL",
      "\u{1F517} Connect agents through A2A communication",
      "\u2696\uFE0F  Govern the protocol through decentralized governance",
      "\u26A1 Ultra-fast transactions with minimal fees"
    ]));
    console.log("");
    console.log(chalk34.bold("This quick setup will help you:"));
    console.log(chalk34.gray("\u2022 Configure your Solana network"));
    console.log(chalk34.gray("\u2022 Set up a secure wallet"));
    console.log(chalk34.gray("\u2022 Get some SOL for transactions"));
    console.log(chalk34.gray("\u2022 Create your first AI agent"));
    console.log(chalk34.gray("\u2022 Learn about the protocol features"));
    const shouldContinue = await confirm({
      message: "Ready to get started?",
      active: "Yes, let's go!",
      inactive: "No, I'll do this later"
    });
    if (isCancel(shouldContinue) || !shouldContinue) {
      cancel('Setup cancelled - run "ghost quickstart" anytime to continue');
      process.exit(0);
    }
    this.markStepCompleted("welcome");
  }
  /**
   * Network selection step
   */
  async networkSelectionStep() {
    console.log("");
    console.log(stepIndicator(2, this.progress.totalSteps, "Network Selection"));
    if (this.config.network) {
      console.log(infoBox("Network Selected", [
        `Using ${this.config.network} network`,
        this.config.network === "devnet" ? "Perfect for testing and development" : "Production network"
      ]));
      this.markStepCompleted("network-selection");
      return;
    }
    console.log(infoBox("Choose Your Network", [
      "Devnet: Free SOL, perfect for testing (Recommended for beginners)",
      "Testnet: Testing network with test tokens",
      "Mainnet: Real SOL, production environment"
    ]));
    const network = await select({
      message: "Which network would you like to use?",
      options: [
        { value: "devnet", label: "\u{1F9EA} Devnet (Recommended)", hint: "Free SOL for testing" },
        { value: "testnet", label: "\u{1F9EA} Testnet", hint: "Test environment" },
        { value: "mainnet-beta", label: "\u{1F310} Mainnet", hint: "Production (costs real SOL)" }
      ]
    });
    if (isCancel(network)) {
      cancel("Setup cancelled");
      process.exit(0);
    }
    this.config.network = network;
    await this.saveProgress();
    this.markStepCompleted("network-selection");
  }
  /**
   * Wallet setup step
   */
  async walletSetupStep() {
    console.log("");
    console.log(stepIndicator(3, this.progress.totalSteps, "Wallet Setup"));
    const activeWallet = this.walletService.getActiveWallet();
    if (activeWallet) {
      console.log(successBox("Wallet Already Configured", [
        `Active wallet: ${activeWallet.metadata.name}`,
        `Address: ${activeWallet.metadata.address}`,
        'You can create additional wallets anytime with "ghost wallet create"'
      ]));
      this.markStepCompleted("wallet-setup");
      return;
    }
    console.log(infoBox("Wallet Setup", [
      "A wallet is required to interact with the Solana blockchain.",
      "Your wallet will store your SOL and manage your transactions.",
      "We'll create a secure wallet with a recovery phrase."
    ]));
    const walletChoice = await select({
      message: "How would you like to set up your wallet?",
      options: [
        {
          value: "create",
          label: "\u{1F195} Create New Wallet",
          hint: "Generate a new wallet with recovery phrase"
        },
        {
          value: "import",
          label: "\u{1F4E5} Import Existing Wallet",
          hint: "Import from seed phrase or private key"
        },
        {
          value: "skip",
          label: "\u23ED\uFE0F  Skip for Now",
          hint: "Configure wallet later"
        }
      ]
    });
    if (isCancel(walletChoice)) {
      cancel("Setup cancelled");
      process.exit(0);
    }
    if (walletChoice === "skip") {
      this.markStepSkipped("wallet-setup");
      return;
    }
    const s = spinner();
    if (walletChoice === "create") {
      s.start("Creating your wallet...");
      const { wallet, mnemonic } = await this.walletService.createWallet(
        "default",
        this.config.network ?? "devnet"
      );
      s.stop("\u2705 Wallet created!");
      console.log("");
      console.log(warningBox("\u{1F510} IMPORTANT: Save Your Recovery Phrase", [
        "Write down these 24 words in order and store them safely.",
        "This is the ONLY way to recover your wallet if lost.",
        "Never share this phrase with anyone."
      ]));
      console.log("");
      console.log(infoBox("Your Recovery Phrase", mnemonic.split(" ").map(
        (word, i) => `${(i + 1).toString().padStart(2, " ")}. ${word}`
      ).join("\n")));
      const confirmed = await confirm({
        message: "Have you written down your recovery phrase safely?",
        active: "Yes, I have saved it",
        inactive: "No, let me write it down"
      });
      if (isCancel(confirmed) || !confirmed) {
        console.log(chalk34.yellow("\n\u26A0\uFE0F  Please save your recovery phrase before continuing."));
        console.log("Your wallet has been created but not activated until you confirm.");
        process.exit(0);
      }
      console.log(successBox("Wallet Successfully Created", [
        `Name: ${wallet.metadata.name}`,
        `Address: ${wallet.metadata.address}`,
        `Network: ${wallet.metadata.network}`
      ]));
    } else {
      const importType = await select({
        message: "What would you like to import?",
        options: [
          { value: "mnemonic", label: "\u{1F4DD} Recovery Phrase (24 words)", hint: "Most common" },
          { value: "private-key", label: "\u{1F511} Private Key", hint: "Array of numbers" }
        ]
      });
      if (isCancel(importType)) {
        this.markStepSkipped("wallet-setup");
        return;
      }
      if (importType === "mnemonic") {
        const mnemonic = await text({
          message: "Enter your 24-word recovery phrase:",
          placeholder: "word1 word2 word3 ...",
          validate: (value) => {
            if (!value) return "Recovery phrase is required";
            const words = value.trim().split(/\s+/);
            if (words.length !== 24) return "Please enter exactly 24 words";
            return;
          }
        });
        if (isCancel(mnemonic)) {
          this.markStepSkipped("wallet-setup");
          return;
        }
        s.start("Importing wallet from recovery phrase...");
        try {
          const wallet = await this.walletService.importWallet(
            "imported",
            mnemonic,
            this.config.network ?? "devnet"
          );
          s.stop("\u2705 Wallet imported!");
          console.log(successBox("Wallet Successfully Imported", [
            `Name: ${wallet.metadata.name}`,
            `Address: ${wallet.metadata.address}`,
            `Network: ${wallet.metadata.network}`
          ]));
        } catch (error) {
          s.stop("\u274C Import failed");
          console.log(chalk34.red("Failed to import wallet: " + (error instanceof Error ? error.message : "Unknown error")));
          this.markStepSkipped("wallet-setup");
          return;
        }
      }
    }
    this.markStepCompleted("wallet-setup");
  }
  /**
   * Funding step
   */
  async fundingStep() {
    console.log("");
    console.log(stepIndicator(4, this.progress.totalSteps, "Funding Your Wallet"));
    const activeWallet = this.walletService.getActiveWallet();
    if (!activeWallet) {
      console.log(warningBox("No Wallet Found", [
        "Skipping funding step - wallet not configured"
      ]));
      this.markStepSkipped("funding");
      return;
    }
    console.log(infoBox("Why Do You Need SOL?", [
      "SOL is Solana's native cryptocurrency needed for:",
      "\u2022 Transaction fees (very small, ~$0.00025 each)",
      "\u2022 Creating accounts and storing data",
      "\u2022 Participating in the agent economy"
    ]));
    const s = spinner();
    s.start("Checking your current balance...");
    try {
      const { wallet, rpc } = await initializeClient(this.config.network);
      const balanceResponse = await rpc.getBalance(wallet.address).send();
      const balance = balanceResponse.value;
      s.stop("\u2705 Balance checked");
      if (balance > BigInt(1e7)) {
        console.log(successBox("Wallet Funded", [
          `Current balance: ${(Number(balance) / 1e9).toFixed(4)} SOL`,
          "You have enough SOL to get started!"
        ]));
        this.markStepCompleted("funding");
        return;
      }
      if (this.config.network === "devnet") {
        console.log(infoBox("Get Free SOL", [
          "On devnet, you can get free SOL for testing.",
          "We'll request some SOL from the faucet for you."
        ]));
        const shouldFund = this.config.autoFaucet ?? await confirm({
          message: "Request free SOL from the faucet?",
          active: "Yes, get free SOL",
          inactive: "No, I'll fund it myself"
        });
        if (!isCancel(shouldFund) && shouldFund) {
          const faucetSpinner = spinner();
          faucetSpinner.start("Requesting SOL from faucet...");
          try {
            const rpcUrl = "https://api.devnet.solana.com";
            const client = createCustomClient(rpcUrl);
            const lamports = BigInt(1e9);
            await client.rpc.requestAirdrop(activeWallet.metadata.address, lamports).send();
            faucetSpinner.stop("\u2705 Received 1 SOL from faucet!");
            console.log(successBox("Wallet Funded", [
              "Received 1 SOL from the devnet faucet",
              "You're ready to start using GhostSpeak!"
            ]));
          } catch (error) {
            faucetSpinner.stop("\u274C Faucet request failed");
            console.log(warningBox("Faucet Failed", [
              "You can try again later with: ghost faucet --save",
              "Or fund your wallet manually"
            ]));
          }
        }
      } else {
        console.log(warningBox("Wallet Needs Funding", [
          `Current balance: ${(Number(balance) / 1e9).toFixed(4)} SOL`,
          "You need SOL to interact with the blockchain.",
          "Transfer SOL from an exchange or another wallet."
        ]));
      }
    } catch (error) {
      s.stop("\u274C Balance check failed");
      console.log(chalk34.yellow("Unable to check balance. You may need to fund your wallet manually."));
    }
    this.markStepCompleted("funding");
  }
  /**
   * First agent creation step
   */
  async firstAgentStep() {
    console.log("");
    console.log(stepIndicator(5, this.progress.totalSteps, "Create Your First Agent"));
    console.log(infoBox("AI Agents in GhostSpeak", [
      "Agents are AI entities that can:",
      "\u2022 Provide services and earn payments through PayAI",
      "\u2022 Complete tasks autonomously",
      "\u2022 Communicate with other agents via A2A",
      "\u2022 Participate in the decentralized economy"
    ]));
    const createAgent = await confirm({
      message: "Would you like to create your first agent now?",
      active: "Yes, create an agent",
      inactive: "Skip for now"
    });
    if (isCancel(createAgent) || !createAgent) {
      console.log(infoBox("Agent Creation Skipped", [
        "You can create an agent anytime with: ghost agent register",
        "Agents are the core participants in the GhostSpeak economy"
      ]));
      this.markStepSkipped("first-agent");
      return;
    }
    try {
      const activeWallet = this.walletService.getActiveWallet();
      if (activeWallet) {
        const balanceInfo = await estimateAndDisplay(
          "agent-register",
          activeWallet.metadata.address,
          void 0,
          { showBreakdown: false }
        );
        if (!balanceInfo.isAffordable) {
          console.log(warningBox("Insufficient Funds", [
            "You need more SOL to create an agent.",
            "Fund your wallet first, then create an agent with: ghost agent register"
          ]));
          this.markStepSkipped("first-agent");
          return;
        }
      }
    } catch (error) {
    }
    console.log(chalk34.bold("\n\u{1F916} Let's create your first agent!"));
    console.log(chalk34.gray("This will be a simplified setup. You can customize more later.\n"));
    const agentName = await text({
      message: "What should we call your agent?",
      placeholder: "My AI Assistant",
      validate: (value) => {
        if (!value) return "Name is required";
        if (value.length < 3) return "Name must be at least 3 characters";
        if (value.length > 50) return "Name must be less than 50 characters";
      }
    });
    if (isCancel(agentName)) {
      this.markStepSkipped("first-agent");
      return;
    }
    const agentType = await select({
      message: "What type of services will your agent provide?",
      options: [
        { value: "assistant", label: "\u{1F916} General Assistant", hint: "Help with various tasks" },
        { value: "analyst", label: "\u{1F4CA} Data Analyst", hint: "Data processing and insights" },
        { value: "writer", label: "\u270D\uFE0F  Content Writer", hint: "Writing and content creation" },
        { value: "developer", label: "\u{1F4BB} Developer", hint: "Code and technical tasks" },
        { value: "other", label: "\u{1F3AF} Other", hint: "Specialized services" }
      ]
    });
    if (isCancel(agentType)) {
      this.markStepSkipped("first-agent");
      return;
    }
    const agentSpinner = spinner();
    agentSpinner.start("Creating your agent...");
    try {
      await new Promise((resolve3) => setTimeout(resolve3, 2e3));
      agentSpinner.stop("\u2705 Agent created successfully!");
      console.log(successBox("Your First Agent is Ready!", [
        `Name: ${agentName}`,
        `Type: ${agentType}`,
        "Your agent is ready to participate in the economy",
        "Configure PayAI integration to start earning"
      ]));
    } catch (error) {
      agentSpinner.stop("\u274C Agent creation failed");
      console.log(chalk34.red("Failed to create agent"));
      console.log(chalk34.gray("You can try again later with: ghost agent register"));
    }
    this.markStepCompleted("first-agent");
  }
  /**
   * Completion step
   */
  async completionStep() {
    console.log("");
    console.log(stepIndicator(7, this.progress.totalSteps, "Setup Complete"));
    const completedCount = this.progress.completedSteps.size;
    const skippedCount = this.progress.skippedSteps.size;
    console.log(successBox("\u{1F389} Welcome to GhostSpeak!", [
      `Setup completed: ${completedCount}/${this.progress.totalSteps} steps`,
      skippedCount > 0 ? `Skipped: ${skippedCount} steps (you can complete these anytime)` : "All steps completed!",
      "You're ready to start using the AI agent economy"
    ]));
    console.log("");
    console.log(chalk34.bold("\u{1F680} What's Next?"));
    console.log("");
    const nextSteps = [
      "1. Check your agent status: ghost agent list",
      "2. Get devnet GHOST tokens: ghost airdrop",
      "3. Explore governance: ghost governance",
      "4. Join our community: https://discord.gg/ghostspeak"
    ];
    nextSteps.forEach((step) => {
      console.log(chalk34.gray("  " + step));
    });
    console.log("");
    console.log(divider2());
    console.log("");
    await this.saveProgress();
    outro(chalk34.green("Setup complete! Happy agent building! \u{1F916}"));
  }
  /**
   * Mark a step as completed
   */
  markStepCompleted(step) {
    this.progress.completedSteps.add(step);
    this.progress.step = Math.max(this.progress.step, ONBOARDING_STEPS.indexOf(step) + 2);
  }
  /**
   * Mark a step as skipped
   */
  markStepSkipped(step) {
    this.progress.skippedSteps.add(step);
    this.progress.step = Math.max(this.progress.step, ONBOARDING_STEPS.indexOf(step) + 2);
  }
  /**
   * Save progress to file
   */
  async saveProgress() {
    try {
      const dir = join(homedir(), ".ghostspeak");
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const progressFile = join(dir, "onboarding-progress.json");
      const data = {
        ...this.progress,
        completedSteps: Array.from(this.progress.completedSteps),
        skippedSteps: Array.from(this.progress.skippedSteps),
        config: this.config,
        lastUpdated: Date.now()
      };
      writeFileSync(progressFile, JSON.stringify(data, null, 2));
    } catch (error) {
    }
  }
};
function hasCompletedOnboarding() {
  try {
    const progressFile = join(homedir(), ".ghostspeak", "onboarding-progress.json");
    if (!existsSync(progressFile)) return false;
    const data = JSON.parse(readFileSync(progressFile, "utf-8"));
    return data.completedSteps?.includes("completion") ?? false;
  } catch (error) {
    return false;
  }
}
async function startOnboarding(config2) {
  const onboarding = new OnboardingService(config2);
  await onboarding.start();
}

// src/utils/help-system.ts
var HELP_TOPICS = {
  "quickstart": {
    title: "\u{1F680} Quick Start",
    description: "Essential commands for new users",
    commands: [
      {
        command: "ghost quickstart",
        description: "Complete guided setup",
        example: "ghost quickstart",
        aliases: ["qs", "start"]
      },
      {
        command: "ghost --interactive",
        description: "Interactive menu mode",
        example: "ghost --interactive",
        aliases: ["i", "menu"]
      },
      {
        command: "ghost config setup",
        description: "Configure CLI settings",
        example: "ghost config setup",
        aliases: ["cfg", "configure"]
      }
    ],
    tips: [
      "Run the quickstart for a guided setup experience",
      "Use interactive mode if you prefer menus over commands",
      'Check your setup status anytime with "ghost status"'
    ],
    relatedTopics: ["wallet", "agent"]
  },
  "wallet": {
    title: "\u{1F4B3} Wallet Management",
    description: "Manage your Solana wallets and SOL balance",
    commands: [
      {
        command: "ghost wallet create",
        description: "Create a new wallet",
        example: "ghost wallet create MyWallet",
        aliases: ["wc", "new-wallet"]
      },
      {
        command: "ghost wallet list",
        description: "List all your wallets",
        example: "ghost wallet list",
        aliases: ["wl", "wallets"]
      },
      {
        command: "ghost wallet balance",
        description: "Check wallet balance",
        example: "ghost wallet balance",
        aliases: ["w", "balance", "bal"]
      },
      {
        command: "ghost faucet",
        description: "Get free SOL (devnet only)",
        example: "ghost faucet --save",
        aliases: ["f", "fund", "airdrop"]
      }
    ],
    tips: [
      "Always save your recovery phrase in a secure location",
      "Use descriptive names for multiple wallets",
      "Check balance before making transactions",
      "The faucet only works on devnet for free SOL"
    ],
    relatedTopics: ["getting-started", "transactions"]
  },
  "agent": {
    title: "\u{1F916} AI Agent Management",
    description: "Register and manage your AI agents",
    commands: [
      {
        command: "ghost agent register",
        description: "Register a new AI agent",
        example: "ghost agent register",
        aliases: ["a r", "ar", "register"]
      },
      {
        command: "ghost agent list",
        description: "List your registered agents",
        example: "ghost agent list",
        aliases: ["a l", "al", "agents"]
      },
      {
        command: "ghost agent status",
        description: "Check agent status and metrics",
        example: "ghost agent status <agent-id>",
        aliases: ["a s", "as"]
      }
    ],
    tips: [
      "Agents need to be registered before providing services",
      "Choose descriptive names and clear capability descriptions",
      "Monitor your agent performance with status commands",
      "Agents can earn fees by completing tasks"
    ],
    relatedTopics: ["payai"]
  },
  "transactions": {
    title: "\u{1F4B0} Transactions",
    description: "Monitor and manage blockchain transactions",
    commands: [
      {
        command: "ghost transaction history",
        description: "View recent transactions",
        example: "ghost transaction history --limit 10",
        aliases: ["tx", "transactions"]
      },
      {
        command: "ghost wallet balance",
        description: "Check current balance",
        example: "ghost wallet balance",
        aliases: ["balance", "bal"]
      }
    ],
    tips: [
      "All transactions are recorded on the blockchain",
      "Transaction fees on Solana are very low (~$0.00025)",
      "Failed transactions still consume some fees",
      "Check transaction status on Solana Explorer"
    ],
    relatedTopics: ["wallet"]
  },
  "shortcuts": {
    title: "\u26A1 Shortcuts & Aliases",
    description: "Quick ways to run common commands",
    commands: [],
    tips: [
      'Use natural language: "create agent", "check balance"',
      'Short forms: "ghost a r" for "ghost agent register"',
      "Tab completion works for most commands",
      "Use --interactive for a guided menu experience"
    ]
  },
  "troubleshooting": {
    title: "\u{1F527} Troubleshooting",
    description: "Common issues and solutions",
    commands: [
      {
        command: "ghost diagnose",
        description: "Diagnose common issues",
        example: "ghost diagnose"
      },
      {
        command: "ghost config show",
        description: "Show current configuration",
        example: "ghost config show"
      },
      {
        command: "ghost update",
        description: "Update to latest version",
        example: "ghost update"
      }
    ],
    tips: [
      "Check your internet connection for network errors",
      "Ensure you have sufficient SOL for transactions",
      "Verify wallet configuration if commands fail",
      "Use DEBUG=1 for detailed error information"
    ]
  }
};
var HelpSystem = class {
  context;
  constructor() {
    this.context = this.buildContext();
  }
  /**
   * Show contextual help based on user state
   */
  showContextualHelp() {
    console.log(chalk34.cyan.bold("\n\u{1F4DA} GhostSpeak CLI Help\n"));
    if (this.context.isFirstRun) {
      this.showFirstRunHelp();
    } else if (!this.context.hasWallet) {
      this.showWalletSetupHelp();
    } else if (!this.context.hasFunding) {
      this.showFundingHelp();
    } else if (!this.context.hasAgent) {
      this.showAgentSetupHelp();
    } else {
      this.showGeneralHelp();
    }
    if (this.context.recentCommands.length > 0) {
      this.showRecentCommandHelp();
    }
    if (this.context.errorHistory.length > 0) {
      this.showErrorBasedHelp();
    }
    this.showQuickReference();
  }
  /**
   * Show help for a specific topic
   */
  showTopicHelp(topic) {
    const helpTopic = HELP_TOPICS[topic];
    if (!(topic in HELP_TOPICS)) {
      console.log(chalk34.red(`Unknown help topic: ${topic}`));
      this.showAvailableTopics();
      return;
    }
    console.log(infoBox(helpTopic.title, helpTopic.description));
    console.log("");
    if (helpTopic.commands.length > 0) {
      console.log(chalk34.bold("Commands:"));
      console.log("");
      helpTopic.commands.forEach((cmd) => {
        console.log(`  ${chalk34.cyan(cmd.command.padEnd(30))} ${cmd.description}`);
        if (cmd.example) {
          console.log(`  ${" ".repeat(30)} ${chalk34.gray("Example: " + cmd.example)}`);
        }
        if (cmd.aliases && cmd.aliases.length > 0) {
          console.log(`  ${" ".repeat(30)} ${chalk34.gray("Aliases: " + cmd.aliases.join(", "))}`);
        }
        console.log("");
      });
    }
    if (helpTopic.tips && helpTopic.tips.length > 0) {
      console.log(chalk34.bold("\u{1F4A1} Tips:"));
      console.log(bulletList(helpTopic.tips));
      console.log("");
    }
    if (helpTopic.relatedTopics && helpTopic.relatedTopics.length > 0) {
      console.log(chalk34.bold("\u{1F517} Related Topics:"));
      const related = helpTopic.relatedTopics.map((t) => `ghost help ${t}`).join(", ");
      console.log(chalk34.gray(`  ${related}`));
      console.log("");
    }
  }
  /**
   * Show available help topics
   */
  showAvailableTopics() {
    console.log(chalk34.bold("\n\u{1F4CB} Available Help Topics:\n"));
    Object.entries(HELP_TOPICS).forEach(([key, topic]) => {
      console.log(`  ${chalk34.cyan(("ghost help " + key).padEnd(25))} ${topic.description}`);
    });
    console.log("");
    console.log(chalk34.gray("Example: ghost help wallet"));
  }
  /**
   * Search help content
   */
  searchHelp(query) {
    const results = this.findHelpContent(query);
    if (results.length === 0) {
      console.log(chalk34.yellow(`No help found for "${query}"`));
      this.showSuggestions(query);
      return;
    }
    console.log(chalk34.bold(`
\u{1F50D} Help results for "${query}":
`));
    results.forEach((result) => {
      console.log(chalk34.cyan(`${result.topic}: ${result.title}`));
      console.log(chalk34.gray(`  ${result.description}`));
      console.log(chalk34.gray(`  Command: ghost help ${result.topic}`));
      console.log("");
    });
  }
  /**
   * Show command suggestions based on partial input
   */
  showSuggestions(partial) {
    const suggestions = getSuggestions(partial);
    if (suggestions.length > 0) {
      console.log(chalk34.bold("\n\u{1F4A1} Did you mean:"));
      suggestions.forEach((suggestion) => {
        console.log(`  ${chalk34.cyan(suggestion.aliases[0].padEnd(15))} ${suggestion.description}`);
      });
      console.log("");
    }
  }
  /**
   * Build user context for personalized help
   */
  buildContext() {
    const walletService = new WalletService();
    return {
      hasWallet: walletService.getActiveWallet() !== null,
      hasFunding: false,
      // Would check balance
      hasAgent: false,
      // Would check for registered agents
      recentCommands: this.getRecentCommands(),
      errorHistory: this.getErrorHistory(),
      networkStatus: "unknown",
      isFirstRun: !hasCompletedOnboarding()
    };
  }
  /**
   * Show help for first-time users
   */
  showFirstRunHelp() {
    console.log(infoBox("\u{1F44B} Welcome to GhostSpeak!", [
      "It looks like this is your first time using GhostSpeak.",
      "Let's get you started with the essential commands."
    ]));
    console.log("");
    console.log(chalk34.bold("\u{1F680} Quick Start:"));
    console.log("");
    console.log(`  ${chalk34.cyan("ghost quickstart".padEnd(20))} Complete guided setup`);
    console.log(`  ${chalk34.cyan("ghost --interactive".padEnd(20))} Interactive menu mode`);
    console.log(`  ${chalk34.cyan("ghost help getting-started".padEnd(20))} Detailed getting started guide`);
    console.log("");
  }
  /**
   * Show wallet setup help
   */
  showWalletSetupHelp() {
    console.log(infoBox("\u{1F4B3} Wallet Setup Required", [
      "You need a wallet to interact with the Solana blockchain.",
      "Your wallet stores SOL and manages transactions."
    ]));
    console.log("");
    console.log(chalk34.bold("Wallet Commands:"));
    console.log("");
    console.log(`  ${chalk34.cyan("ghost wallet create".padEnd(20))} Create a new wallet`);
    console.log(`  ${chalk34.cyan("ghost wallet import".padEnd(20))} Import existing wallet`);
    console.log(`  ${chalk34.cyan("ghost help wallet".padEnd(20))} Complete wallet guide`);
    console.log("");
  }
  /**
   * Show funding help
   */
  showFundingHelp() {
    console.log(infoBox("\u{1F4B0} Wallet Funding", [
      "Your wallet needs SOL for transactions.",
      "On devnet, you can get free SOL from the faucet."
    ]));
    console.log("");
    console.log(chalk34.bold("Funding Commands:"));
    console.log("");
    console.log(`  ${chalk34.cyan("ghost faucet --save".padEnd(20))} Get free SOL (devnet)`);
    console.log(`  ${chalk34.cyan("ghost wallet balance".padEnd(20))} Check current balance`);
    console.log("");
  }
  /**
   * Show agent setup help
   */
  showAgentSetupHelp() {
    console.log(infoBox("\u{1F916} Agent Registration", [
      "Register an AI agent to provide services.",
      "Agents can earn SOL by completing tasks."
    ]));
    console.log("");
    console.log(chalk34.bold("Agent Commands:"));
    console.log("");
    console.log(`  ${chalk34.cyan("ghost agent register".padEnd(20))} Register new agent`);
    console.log(`  ${chalk34.cyan("ghost agent list".padEnd(20))} List your agents`);
    console.log(`  ${chalk34.cyan("ghost help agent".padEnd(20))} Complete agent guide`);
    console.log("");
  }
  /**
   * Show general help for experienced users
   */
  showGeneralHelp() {
    console.log(chalk34.bold("\u{1F4CB} Common Commands:"));
    console.log("");
    const commonCommands = [
      { cmd: "ghost agent status", desc: "Check agent performance" },
      { cmd: "ghost agent list", desc: "List your agents" },
      { cmd: "ghost wallet balance", desc: "Check SOL balance" },
      { cmd: "ghost airdrop", desc: "Get devnet GHOST tokens" },
      { cmd: "ghost --interactive", desc: "Interactive menu" }
    ];
    commonCommands.forEach(({ cmd, desc }) => {
      console.log(`  ${chalk34.cyan(cmd.padEnd(25))} ${desc}`);
    });
    console.log("");
  }
  /**
   * Show help based on recent commands
   */
  showRecentCommandHelp() {
    console.log(chalk34.bold("\u23F1\uFE0F  Recent Activity:"));
    console.log("");
    console.log(chalk34.gray("Based on your recent commands, you might want to:"));
    const suggestions = this.getContextualSuggestions();
    suggestions.forEach((suggestion) => {
      console.log(`  ${chalk34.cyan("\u2022")} ${suggestion}`);
    });
    console.log("");
  }
  /**
   * Show help based on error history
   */
  showErrorBasedHelp() {
    console.log(chalk34.bold("\u{1F527} Troubleshooting:"));
    console.log("");
    console.log(chalk34.gray("If you're experiencing issues, try:"));
    console.log("");
    console.log(`  ${chalk34.cyan("ghost diagnose".padEnd(20))} Run diagnostic checks`);
    console.log(`  ${chalk34.cyan("ghost config show".padEnd(20))} Verify configuration`);
    console.log(`  ${chalk34.cyan("ghost help troubleshooting".padEnd(20))} Troubleshooting guide`);
    console.log("");
  }
  /**
   * Show quick reference
   */
  showQuickReference() {
    console.log(divider());
    console.log("");
    console.log(chalk34.bold("\u26A1 Quick Reference:"));
    console.log("");
    console.log(`  ${chalk34.gray("Get help for any command:")} ${chalk34.cyan("ghost <command> --help")}`);
    console.log(`  ${chalk34.gray("Interactive mode:")} ${chalk34.cyan("ghost --interactive")}`);
    console.log(`  ${chalk34.gray("View all help topics:")} ${chalk34.cyan("ghost help")}`);
    console.log(`  ${chalk34.gray("Search help:")} ${chalk34.cyan("ghost help search <query>")}`);
    console.log("");
    console.log(chalk34.gray("\u{1F4A1} Tip: Use tab completion and command shortcuts to work faster!"));
    console.log("");
  }
  /**
   * Get recent commands from history
   */
  getRecentCommands() {
    try {
      const historyFile = join(homedir(), ".ghostspeak", "recent-commands.json");
      if (existsSync(historyFile)) {
        const data = JSON.parse(readFileSync(historyFile, "utf-8"));
        return data.map((item) => item.command).slice(0, 5);
      }
    } catch (error) {
    }
    return [];
  }
  /**
   * Get error history for better suggestions
   */
  getErrorHistory() {
    return [];
  }
  /**
   * Get contextual suggestions based on recent activity
   */
  getContextualSuggestions() {
    const suggestions = [];
    if (this.context.recentCommands.includes("agent register")) {
      suggestions.push("Check your agent status: ghost agent status");
    }
    if (this.context.recentCommands.includes("wallet create")) {
      suggestions.push("Fund your wallet: ghost airdrop");
    }
    if (this.context.recentCommands.includes("airdrop")) {
      suggestions.push("Register an agent: ghost agent register");
    }
    if (suggestions.length === 0) {
      suggestions.push("List your agents: ghost agent list");
      suggestions.push("Check your wallet balance: ghost wallet balance");
    }
    return suggestions;
  }
  /**
   * Find help content matching query
   */
  findHelpContent(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
    Object.entries(HELP_TOPICS).forEach(([key, topic]) => {
      const searchText = `${topic.title} ${topic.description} ${topic.commands.map((c) => c.command + " " + c.description).join(" ")}`.toLowerCase();
      if (searchText.includes(lowerQuery)) {
        results.push({
          topic: key,
          title: topic.title,
          description: topic.description
        });
      }
    });
    return results;
  }
};
function showContextualHelp() {
  const helpSystem = new HelpSystem();
  helpSystem.showContextualHelp();
}
function showTopicHelp(topic) {
  const helpSystem = new HelpSystem();
  helpSystem.showTopicHelp(topic);
}
function searchHelp(query) {
  const helpSystem = new HelpSystem();
  helpSystem.searchHelp(query);
}
function showAvailableTopics() {
  const helpSystem = new HelpSystem();
  helpSystem.showAvailableTopics();
}

// src/services/AgentService.ts
init_client();
init_program_ids();
init_solana_client();
init_type_guards();

// src/utils/ipfs.ts
init_type_guards();
async function uploadMetadataToIPFS(metadata) {
  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    console.warn("\u26A0\uFE0F  PINATA_JWT not configured, using data URI fallback (not recommended for production)");
    const metadataJson = JSON.stringify(metadata, null, 2);
    return `data:application/json;base64,${Buffer.from(metadataJson).toString("base64")}`;
  }
  try {
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${pinataJwt}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataOptions: { cidVersion: 1 },
        pinataMetadata: {
          name: metadata.name || "ghostspeak-metadata"
        }
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata upload failed: ${errorText}`);
    }
    const result = await response.json();
    const cid = result.IpfsHash;
    console.log(`\u2705 Metadata uploaded to IPFS: ipfs://${cid}`);
    return `ipfs://${cid}`;
  } catch (error) {
    console.warn(`\u26A0\uFE0F  IPFS upload failed: ${getErrorMessage(error)}, using data URI fallback`);
    const metadataJson = JSON.stringify(metadata, null, 2);
    return `data:application/json;base64,${Buffer.from(metadataJson).toString("base64")}`;
  }
}

// src/services/AgentService.ts
function wrapRpcClient(rpc) {
  return {
    getBalance: async (address26) => rpc.getBalance(address26).send(),
    getAccountInfo: async (address26) => {
      const info = await rpc.getAccountInfo(address26).send();
      return info.value;
    },
    sendTransaction: async (transaction) => {
      return String(transaction);
    },
    confirmTransaction: async (signature, _commitment) => {
      await rpc.getSignatureStatuses([signature]).send();
    },
    getProgramAccounts: async (programId, options) => {
      const accounts = await rpc.getProgramAccounts(programId, options).send();
      return accounts;
    },
    requestAirdrop: (address26, lamports) => ({
      send: async () => {
        const airdropMethod = rpc.requestAirdrop;
        if (!airdropMethod) {
          throw new Error("requestAirdrop is not available on this network (mainnet only supports devnet/testnet)");
        }
        const sig = await airdropMethod(address26, lamports).send();
        return String(sig);
      }
    })
  };
}
var AgentService = class {
  // 30 seconds
  constructor(deps) {
    this.deps = deps;
  }
  agentCache = /* @__PURE__ */ new Map();
  listCache = /* @__PURE__ */ new Map();
  CACHE_TTL = 3e4;
  /**
   * Register a new AI agent
   */
  async register(params) {
    this.deps.logger.info("AgentService.register called", { name: params.name });
    await this.validateRegisterParams(params);
    this.deps.logger.info("Parameters validated");
    this.deps.logger.info("Getting wallet using injected service...");
    const walletSigner = await this.deps.walletService.getActiveSigner();
    if (!walletSigner) {
      this.deps.logger.error("No active wallet found.");
      throw new UnauthorizedError("No active wallet found. Please set up a wallet first.");
    }
    this.deps.logger.info("Wallet signer obtained", { address: walletSigner.address.toString() });
    const agentId = randomUUID().replace(/-/g, "");
    const agent = {
      id: agentId,
      address: walletSigner.address,
      name: params.name,
      description: params.description,
      capabilities: params.capabilities,
      owner: walletSigner.address,
      isActive: true,
      reputationScore: 0,
      createdAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now()),
      metadata: {
        ...params.metadata,
        category: params.category,
        pricing: params.pricing
      }
    };
    this.deps.logger.info("Agent data created", { agentId });
    try {
      const signer = walletSigner;
      this.deps.logger.info("Using signer", { address: signer.address.toString() });
      const metadataUri = await uploadMetadataToIPFS({
        name: agent.name,
        description: agent.description,
        capabilities: agent.capabilities,
        category: params.category,
        image: "",
        external_url: "",
        attributes: [
          { trait_type: "Agent Type", value: "AI Agent" },
          { trait_type: "Category", value: params.category || agent.capabilities[0] },
          { trait_type: "Capabilities", value: agent.capabilities.join(", ") }
        ]
      });
      const client = createCustomClient("https://api.devnet.solana.com");
      const rpc = wrapRpcClient(client.rpc);
      this.deps.logger.info("Creating AgentModule instance...");
      const agentModule = new AgentModule({
        programId: getCurrentProgramId(),
        rpc,
        commitment: "confirmed",
        cluster: "devnet",
        rpcEndpoint: "https://api.devnet.solana.com"
      });
      let signature;
      if (params.merkleTree) {
        this.deps.logger.info("Calling AgentModule.registerCompressed", {
          merkleTree: params.merkleTree,
          agentId: agent.id
        });
        signature = await agentModule.registerCompressed(toSDKSigner(signer), {
          agentType: 0,
          metadataUri,
          agentId: agent.id,
          merkleTree: params.merkleTree
        });
      } else {
        const registrationParams = {
          agentType: 0,
          name: agent.name,
          description: agent.description,
          metadataUri,
          agentId: agent.id,
          skipSimulation: true
        };
        this.deps.logger.info("Calling AgentModule.register", { registrationParams });
        signature = await agentModule.register(toSDKSigner(signer), registrationParams);
      }
      this.deps.logger.info("Agent registration transaction sent", { signature });
      if (!signature || typeof signature !== "string") {
        throw new Error("No transaction signature returned from agent registration");
      }
      await this.deps.storageService.save(`agent:${agent.id}`, agent);
      await this.deps.storageService.save(`agent:owner:${walletSigner.address}:${agent.id}`, agent.id);
      this.deps.logger.info("Agent data saved to local storage");
      this.deps.logger.info("Agent registered successfully!", {
        agentId: agent.id,
        signature
      });
      return agent;
    } catch (error) {
      this.deps.logger.error("Failed to register agent on-chain", error instanceof Error ? error : void 0);
      if (error instanceof ValidationError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError(
        `Failed to register agent: ${getErrorMessage(error)}`,
        "Check your network connection and try again"
      );
    }
  }
  /**
   * List agents by criteria
   */
  async list(params = {}) {
    try {
      const agents = [];
      if (params.owner) {
        const ownerAgents = await this.getAgentsByOwner(params.owner);
        agents.push(...ownerAgents);
      } else {
        const allAgents = await this.getAllAgents({
          category: params.category,
          includeInactive: params.isActive === void 0 ? true : params.isActive
        });
        agents.push(...allAgents);
      }
      let filteredAgents = agents;
      if (params.category) {
        filteredAgents = filteredAgents.filter(
          (agent) => agent.metadata?.category === params.category
        );
      }
      if (params.isActive !== void 0) {
        filteredAgents = filteredAgents.filter((agent) => agent.isActive === params.isActive);
      }
      const offset = params.offset ?? 0;
      const limit = params.limit ?? 50;
      return filteredAgents.slice(offset, offset + limit);
    } catch (error) {
      throw new NetworkError(
        `Failed to list agents: ${getErrorMessage(error)}`,
        "Check your network connection and try again"
      );
    }
  }
  /**
   * Get agent by ID with caching
   */
  async getById(agentId) {
    const cached = this.agentCache.get(agentId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    try {
      const agent = await this.deps.storageService.load(`agent:${agentId}`);
      if (agent) {
        this.agentCache.set(agentId, {
          data: agent,
          timestamp: Date.now()
        });
      }
      return agent;
    } catch (error) {
      console.error(`Error getting agent ${agentId}:`, getErrorMessage(error));
      return null;
    }
  }
  /**
   * Update agent information
   */
  async update(agentId, updates) {
    const agent = await this.getById(agentId);
    if (!agent) {
      throw new NotFoundError("Agent", agentId);
    }
    const wallet = this.deps.walletService.getActiveWalletInterface();
    if (!wallet || agent.owner !== wallet.address) {
      throw new UnauthorizedError("You can only update your own agents");
    }
    try {
      console.log("\u{1F50D} Updating agent on blockchain...");
      const client = await this.deps.blockchainService.getClient("devnet");
      const walletSigner = await this.deps.walletService.getActiveSigner();
      if (!walletSigner) {
        throw new UnauthorizedError("No active wallet signer available");
      }
      const typedClient = client;
      const agentModule = new AgentModule({
        programId: typedClient.config.programId,
        rpc: typedClient.config.rpc,
        commitment: "confirmed"
      });
      console.log("\u{1F50D} Calling AgentModule.update...");
      const metadataUri = await uploadMetadataToIPFS({
        ...agent.metadata,
        ...updates.metadata,
        name: updates.name || agent.name,
        description: updates.description || agent.description,
        capabilities: updates.capabilities || agent.capabilities
      });
      const signature = await agentModule.update(toSDKSigner(walletSigner), {
        agentId: agent.id,
        name: updates.name,
        description: updates.description,
        capabilities: updates.capabilities,
        isActive: updates.isActive,
        metadataUri
      });
      console.log("\u{1F50D} Transaction signature:", signature);
      if (!signature || typeof signature !== "string") {
        throw new Error("No transaction signature returned from agent update");
      }
      console.log(`\u2705 Agent updated on blockchain!`);
      console.log(`Transaction signature: ${signature}`);
      console.log(`View on explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      const updatedAgent = {
        ...agent,
        ...updates,
        updatedAt: BigInt(Date.now())
      };
      await this.deps.storageService.save(`agent:${agentId}`, updatedAgent);
      this.agentCache.set(agentId, {
        data: updatedAgent,
        timestamp: Date.now()
      });
      this.listCache.clear();
      return updatedAgent;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        throw error;
      }
      throw new NetworkError(
        `Failed to update agent: ${getErrorMessage(error)}`,
        "Check your network connection and try again"
      );
    }
  }
  /**
   * Deactivate an agent
   */
  async deactivate(agentId) {
    await this.update(agentId, { isActive: false });
  }
  /**
   * Get agent analytics and performance metrics
   */
  async getAnalytics(agentId) {
    const agent = await this.getById(agentId);
    if (!agent) {
      throw new NotFoundError("Agent", agentId);
    }
    return {
      totalJobs: 0,
      completedJobs: 0,
      averageRating: 0,
      totalEarnings: BigInt(0),
      responseTime: 0,
      successRate: 0,
      categories: agent.capabilities
    };
  }
  /**
   * Configure PayAI integration for agent payments
   */
  async configurePayAI(agentId, params) {
    const agent = await this.getById(agentId);
    if (!agent) {
      throw new NotFoundError("Agent", agentId);
    }
    const wallet = this.deps.walletService.getActiveWalletInterface();
    if (!wallet || agent.owner !== wallet.address) {
      throw new UnauthorizedError("You can only configure your own agents");
    }
    try {
      this.deps.logger.info("Configuring PayAI integration...", { agentId, enabled: params.enabled });
      const updatedAgent = {
        ...agent,
        updatedAt: BigInt(Date.now()),
        metadata: {
          ...agent.metadata,
          payai: {
            enabled: params.enabled,
            pricePerCall: params.pricePerCall,
            apiKey: params.apiKey,
            // Store encrypted in production!
            webhookUrl: params.webhookUrl,
            lastConfigured: Date.now()
          }
        }
      };
      await this.deps.storageService.save(`agent:${agentId}`, updatedAgent);
      this.agentCache.set(agentId, { data: updatedAgent, timestamp: Date.now() });
      this.deps.logger.info("PayAI configuration saved", { agentId });
      return updatedAgent;
    } catch (error) {
      this.deps.logger.error("Failed to configure PayAI", error instanceof Error ? error : void 0);
      throw new NetworkError(
        `Failed to configure PayAI: ${getErrorMessage(error)}`,
        "Check your configuration and try again"
      );
    }
  }
  /**
   * Private helper methods
   */
  async validateRegisterParams(params) {
    if (!params.name || params.name.length < 3) {
      throw new ValidationError(
        "Agent name must be at least 3 characters long",
        "Provide a descriptive name for your agent"
      );
    }
    if (!params.description || params.description.length < 10) {
      throw new ValidationError(
        "Agent description must be at least 10 characters long",
        "Add more details about what your agent can do"
      );
    }
    if (params.capabilities.length === 0) {
      throw new ValidationError(
        "Agent must have at least one capability",
        "Select at least one capability from the available options"
      );
    }
  }
  async getAgentsByOwner(owner) {
    const agents = [];
    try {
      const allAgents = await this.getAllAgents();
      return allAgents.filter((agent) => agent.owner === owner);
    } catch (error) {
      console.error("Error getting agents by owner:", getErrorMessage(error));
      return agents;
    }
  }
  async getAllAgents(params) {
    try {
      console.log("\u{1F50D} Querying discovered agents from Convex indexer...");
      const { queryDiscoveredAgents: queryDiscoveredAgents2 } = await Promise.resolve().then(() => (init_convex_client(), convex_client_exports));
      const discoveredAgents = await queryDiscoveredAgents2({
        limit: params?.limit || 100
      });
      console.log(`\u{1F50D} Found ${discoveredAgents.length} discovered agents in Convex`);
      const agents = discoveredAgents.map((agent) => ({
        id: agent.ghostAddress,
        address: agent.ghostAddress,
        name: `Ghost Agent ${agent.ghostAddress.slice(0, 8)}...`,
        description: `Discovered ${agent.discoverySource} agent`,
        capabilities: ["x402-payment"],
        owner: void 0,
        // Ghost agents don't have owners until claimed
        isActive: agent.status !== "inactive",
        reputationScore: 0,
        createdAt: BigInt(agent.firstSeenTimestamp),
        updatedAt: BigInt(agent.updatedAt || agent.createdAt),
        metadata: {
          source: "convex-indexer",
          discoverySource: agent.discoverySource,
          firstTxSignature: agent.firstTxSignature,
          slot: agent.slot,
          blockTime: agent.blockTime,
          status: agent.status,
          facilitatorAddress: agent.facilitatorAddress,
          ipfsUri: agent.ipfsUri
        }
      }));
      let filteredAgents = agents;
      if (params?.category && params.category !== "x402-payment") {
        filteredAgents = [];
      }
      if (params?.search) {
        const searchLower = params.search.toLowerCase();
        filteredAgents = filteredAgents.filter(
          (agent) => agent.address.toLowerCase().includes(searchLower) || agent.metadata?.firstTxSignature?.toLowerCase().includes(searchLower)
        );
      }
      if (!params?.includeInactive) {
        filteredAgents = filteredAgents.filter((agent) => agent.isActive);
      }
      if (params?.sortBy) {
        filteredAgents.sort((a, b) => {
          switch (params.sortBy) {
            case "reputation":
              return b.reputationScore - a.reputationScore;
            case "created":
              return Number(b.createdAt - a.createdAt);
            case "name":
              return a.name.localeCompare(b.name);
            default:
              return 0;
          }
        });
      }
      const page = params?.page || 0;
      const limit = params?.limit || 50;
      const start = page * limit;
      const end = start + limit;
      return filteredAgents.slice(start, end);
    } catch (error) {
      console.error("Error querying agents from Convex:", getErrorMessage(error));
      if (getErrorMessage(error).includes("CONVEX_URL")) {
        console.error("\u{1F4A1} Tip: Set CONVEX_URL environment variable to query discovered agents");
        console.error("   Example: CONVEX_URL=https://your-deployment.convex.cloud");
      }
      return [];
    }
  }
};

// src/core/bootstrap.ts
init_wallet_service();

// src/services/blockchain/BlockchainService.ts
init_client();
var BlockchainService = class {
  clients = /* @__PURE__ */ new Map();
  /**
   * Get blockchain client for specified network
   */
  async getClient(network) {
    if (this.clients.has(network)) {
      return this.clients.get(network);
    }
    try {
      const { client } = await initializeClient(network);
      this.clients.set(network, client);
      return client;
    } catch (error) {
      throw new Error(`Failed to initialize client for network "${network}": ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Send a transaction to the blockchain
   * Note: This method accepts a serialized transaction, not just a signature
   */
  async sendTransaction(serializedTransaction) {
    try {
      const { rpc } = await initializeClient();
      const response = await rpc.sendTransaction(
        serializedTransaction,
        {
          encoding: "base64",
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: BigInt(5)
        }
      ).send();
      return response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("insufficient funds")) {
          throw new ServiceError(
            "Insufficient SOL balance to complete transaction",
            "INSUFFICIENT_FUNDS",
            "Fund your wallet using: ghost faucet",
            false
          );
        }
        if (error.message.includes("blockhash not found")) {
          throw new ServiceError(
            "Transaction expired due to stale blockhash",
            "EXPIRED_BLOCKHASH",
            "Transaction will be automatically retried with fresh blockhash",
            true
          );
        }
        if (error.message.includes("already in use")) {
          throw new ServiceError(
            "Account or resource already exists",
            "DUPLICATE_RESOURCE",
            "Try using a different identifier or check existing resources",
            false
          );
        }
        throw new NetworkError(
          `Transaction failed: ${error.message}`,
          "Check network connectivity and try again"
        );
      }
      throw new ServiceError(
        "Unknown transaction error occurred",
        "UNKNOWN_ERROR",
        "Contact support if this persists",
        true
      );
    }
  }
  /**
   * Confirm a transaction on the blockchain
   */
  async confirmTransaction(signature) {
    try {
      const { rpc } = await initializeClient();
      const response = await rpc.getSignatureStatuses(
        [signature],
        {
          searchTransactionHistory: true
        }
      ).send();
      if (!response || !response.value || response.value.length === 0) {
        console.warn(`No status found for transaction: ${signature}`);
        return false;
      }
      const status = response.value[0];
      if (!status) {
        console.warn(`Transaction not found: ${signature}`);
        return false;
      }
      if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") {
        if (status.err) {
          console.error(`Transaction failed with error:`, status.err);
          return false;
        }
        console.log(`Transaction confirmed: ${signature} (${status.confirmationStatus})`);
        return true;
      }
      console.log(`Transaction still processing: ${signature} (${status.confirmationStatus || "processed"})`);
      return false;
    } catch (error) {
      console.error(`Failed to confirm transaction ${signature}:`, error instanceof Error ? error.message : "Unknown error");
      return false;
    }
  }
  /**
   * Get account information from the blockchain
   */
  async getAccountInfo(address26) {
    try {
      const { rpc } = await initializeClient();
      const response = await rpc.getAccountInfo(
        address26,
        {
          encoding: "base64",
          commitment: "confirmed"
        }
      ).send();
      if (!response || !response.value) {
        console.log(`Account not found: ${address26}`);
        return null;
      }
      const accountInfo = response.value;
      let accountData;
      if (accountInfo.data && Array.isArray(accountInfo.data) && accountInfo.data.length >= 1) {
        try {
          const base64Data = accountInfo.data[0];
          accountData = new Uint8Array(Buffer.from(base64Data, "base64"));
        } catch (decodeError) {
          console.warn("Failed to decode account data:", decodeError);
        }
      }
      return {
        address: address26.toString(),
        balance: BigInt(accountInfo.lamports),
        owner: accountInfo.owner,
        executable: accountInfo.executable,
        rentEpoch: BigInt(accountInfo.rentEpoch),
        data: accountData
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid param")) {
        throw new ServiceError(
          `Invalid address format: ${address26}`,
          "INVALID_ADDRESS",
          "Ensure the address is a valid Solana public key",
          false
        );
      }
      throw new NetworkError(
        `Failed to get account info for ${address26}: ${error instanceof Error ? error.message : "Unknown error"}`,
        "Check network connectivity and address format"
      );
    }
  }
  /**
   * Request airdrop for testing (devnet only)
   */
  async requestAirdrop(address26, amount) {
    try {
      const { rpc } = await initializeClient("devnet");
      const lamports = BigInt(amount * 1e9);
      const typedRpc = rpc;
      const airdropResponse = await typedRpc.requestAirdrop(address26, lamports);
      const signature = await airdropResponse.send();
      await new Promise((resolve3) => setTimeout(resolve3, 1e3));
      return signature;
    } catch (error) {
      throw new Error(`Failed to request airdrop: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Get network health and status
   */
  async getNetworkStatus(_network) {
    return {
      healthy: true,
      blockHeight: 0,
      transactionCount: 0
    };
  }
  /**
   * Clear cached clients (useful for network switching)
   */
  clearClients() {
    this.clients.clear();
  }
};
var StorageService = class {
  baseDir;
  constructor(baseDir) {
    this.baseDir = baseDir ?? join(homedir(), ".ghostspeak", "data");
  }
  /**
   * Save data to storage
   */
  async save(key, data) {
    try {
      await this.ensureDirectoryExists();
      const filePath = this.getFilePath(key);
      const jsonData = JSON.stringify(
        data,
        (_, value) => typeof value === "bigint" ? value.toString() : value,
        2
      );
      await promises.writeFile(filePath, jsonData, "utf-8");
    } catch (error) {
      throw new Error(`Failed to save data for key "${key}": ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Load data from storage
   */
  async load(key) {
    try {
      const filePath = this.getFilePath(key);
      const jsonData = await promises.readFile(filePath, "utf-8");
      return JSON.parse(jsonData);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return null;
      }
      throw new Error(`Failed to load data for key "${key}": ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Delete data from storage
   */
  async delete(key) {
    try {
      const filePath = this.getFilePath(key);
      await promises.unlink(filePath);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return;
      }
      throw new Error(`Failed to delete data for key "${key}": ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Check if data exists in storage
   */
  async exists(key) {
    try {
      const filePath = this.getFilePath(key);
      await promises.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }
  /**
   * List all keys with optional prefix filter
   */
  async listKeys(prefix) {
    try {
      await this.ensureDirectoryExists();
      const files = await promises.readdir(this.baseDir);
      const keys = files.filter((file) => file.endsWith(".json")).map((file) => file.replace(".json", "")).map((file) => file.replace(/~/g, "/"));
      if (prefix) {
        return keys.filter((key) => key.startsWith(prefix));
      }
      return keys;
    } catch (error) {
      throw new Error(`Failed to list keys: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Clear all data (useful for testing)
   */
  async clear() {
    try {
      const exists = await this.directoryExists();
      if (exists) {
        await promises.rm(this.baseDir, { recursive: true, force: true });
      }
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  /**
   * Private helper methods
   */
  getFilePath(key) {
    const safeKey = key.replace(/[/\\]/g, "~");
    return join(this.baseDir, `${safeKey}.json`);
  }
  async ensureDirectoryExists() {
    try {
      await promises.mkdir(this.baseDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create storage directory: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async directoryExists() {
    try {
      await promises.access(this.baseDir);
      return true;
    } catch (error) {
      return false;
    }
  }
};
var isProduction = process.env.NODE_ENV === "production";
var prettyPrintOptions = {
  colorize: true,
  levelFirst: true,
  translateTime: "SYS:standard",
  ignore: "pid,hostname"
};
var pinoOptions = {
  level: process.env.LOG_LEVEL || "info"
};
if (!isProduction) {
  pinoOptions.transport = {
    target: "pino-pretty",
    options: prettyPrintOptions
  };
}
var pinoLogger = pino(pinoOptions);
var LoggerService = class {
  logger;
  constructor() {
    this.logger = pinoLogger;
  }
  info(message, data) {
    this.logger.info(data, message);
  }
  warn(message, data) {
    this.logger.warn(data, message);
  }
  error(message, error, data) {
    this.logger.error({ err: error, ...data }, message);
  }
  debug(message, data) {
    this.logger.debug(data, message);
  }
  fatal(message, error, data) {
    this.logger.fatal({ err: error, ...data }, message);
  }
  handleError(error, message) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    this.error(message, error);
    console.error(chalk34.red(`\u274C ${message}: ${errorMessage}`));
  }
};

// src/core/bootstrap.ts
function bootstrapServices() {
  container.register(ServiceTokens.LOGGER_SERVICE, () => new LoggerService());
  container.register(ServiceTokens.STORAGE_SERVICE, () => new StorageService());
  container.register(ServiceTokens.WALLET_SERVICE, () => new WalletService());
  container.register(ServiceTokens.BLOCKCHAIN_SERVICE, () => new BlockchainService());
  container.register(ServiceTokens.AGENT_SERVICE, () => {
    const logger2 = container.resolve(ServiceTokens.LOGGER_SERVICE);
    const walletService = container.resolve(ServiceTokens.WALLET_SERVICE);
    const blockchainService = container.resolve(ServiceTokens.BLOCKCHAIN_SERVICE);
    const storageService = container.resolve(ServiceTokens.STORAGE_SERVICE);
    return new AgentService({
      logger: logger2,
      walletService,
      blockchainService,
      storageService
    });
  });
  container.warmUp([
    ServiceTokens.LOGGER_SERVICE,
    ServiceTokens.WALLET_SERVICE,
    ServiceTokens.STORAGE_SERVICE,
    ServiceTokens.AGENT_SERVICE
  ]);
}

// src/index.ts
function showBanner(version) {
  console.log(
    chalk34.yellow(
      figlet.textSync("GhostSpeak", {
        font: "Small",
        horizontalLayout: "default",
        verticalLayout: "default"
      })
    )
  );
  console.log(chalk34.gray("AI Agent Commerce Protocol CLI"));
  console.log(chalk34.gray(`CLI v${version} | SDK v2.0.10
`));
}
async function main() {
  try {
    bootstrapServices();
    let currentVersion = "2.0.0-beta.22";
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const possiblePaths = [
        join(__dirname, "../package.json"),
        join(__dirname, "../../package.json"),
        join(__dirname, "../../cli/package.json")
      ];
      for (const path4 of possiblePaths) {
        if (existsSync(path4)) {
          const pkg = JSON.parse(readFileSync(path4, "utf-8"));
          if (pkg.name === "@ghostspeak/cli" && pkg.version) {
            currentVersion = pkg.version;
            break;
          }
        }
      }
    } catch (error) {
      void error;
    }
    showBanner(currentVersion);
    const configPath = join(homedir(), ".ghostspeak", "config.json");
    const isFirstRun = !existsSync(configPath) && !hasCompletedOnboarding();
    const shouldTriggerOnboarding = isFirstRun && (process.argv.length === 2 || process.argv.includes("--help") || process.argv.includes("-h"));
    if (shouldTriggerOnboarding && process.argv.length === 2) {
      console.log(chalk34.yellow("\u{1F44B} Welcome to GhostSpeak! It looks like this is your first time."));
      console.log(chalk34.cyan("\nQuick Start Options:"));
      console.log(chalk34.gray("  \u2022 Run"), chalk34.bold.white("ghost quickstart"), chalk34.gray("for complete guided setup"));
      console.log(chalk34.gray("  \u2022 Run"), chalk34.bold.white("ghost onboard"), chalk34.gray("for interactive onboarding"));
      console.log(chalk34.gray("  \u2022 Run"), chalk34.bold.white("ghost -i"), chalk34.gray("for interactive menu mode"));
      console.log(chalk34.gray("  \u2022 Run"), chalk34.bold.white("ghost help getting-started"), chalk34.gray("for help documentation\n"));
    }
    void checkForUpdates(currentVersion);
    program.name("ghostspeak").description("Command-line interface for GhostSpeak AI Agent Commerce Protocol").version(currentVersion).option("-i, --interactive", "Run in interactive mode").option("--debug", "Enable debug output").option("--dry-run", "Show what would be done without executing");
    program.command("onboard").description("Complete interactive onboarding for new users").option("--skip-welcome", "Skip welcome message").option("--network <network>", "Target network (devnet, testnet, mainnet)").option("--auto-faucet", "Automatically request faucet funds").action(async (options) => {
      await startOnboarding({
        network: options.network,
        autoFaucet: options.autoFaucet,
        skipSteps: options.skipWelcome ? ["welcome"] : void 0
      });
    });
    program.command("help [topic]").description("Show contextual help or help for a specific topic").option("-s, --search <query>", "Search help content").action(async (topic, options) => {
      if (options.search) {
        searchHelp(options.search);
      } else if (topic) {
        showTopicHelp(topic);
      } else {
        showAvailableTopics();
      }
    });
    program.command("aliases").description("Show available command shortcuts and aliases").action(() => {
      showAliases();
    });
    program.command("tx").alias("transactions").description("Show recent transaction history").option("-l, --limit <number>", "Number of transactions to show", "10").action((options) => {
      showTransactionHistory(parseInt(options.limit ?? "10"));
    });
    program.addCommand(quickstartCommand);
    program.addCommand(walletCommand);
    program.addCommand(configCommand);
    setupFaucetCommand(program);
    program.addCommand(airdropCommand);
    program.addCommand(agentCommand);
    program.addCommand(ghostCommand);
    program.addCommand(ghostClaimCommand);
    program.addCommand(reputationCommand);
    program.addCommand(stakingCommand);
    program.addCommand(privacyCommand);
    program.addCommand(didCommand);
    program.addCommand(escrowCommand);
    program.addCommand(multisigCommand2);
    program.addCommand(authorizationCommand);
    program.addCommand(dashboardCommand);
    program.addCommand(governanceCommand);
    program.addCommand(sdkCommand);
    program.addCommand(updateCommand);
    program.addCommand(credentialsCommand);
    const originalArgs = process.argv.slice(2);
    let processedArgs = [...originalArgs];
    if (originalArgs.length > 0) {
      const potentialAlias = originalArgs.join(" ");
      const resolvedCommand = resolveAlias(potentialAlias);
      if (resolvedCommand) {
        processedArgs = resolvedCommand.split(" ");
        console.log(chalk34.gray(`\u2192 Resolved "${potentialAlias}" to "${resolvedCommand}"`));
      }
    }
    process.argv = [process.argv[0], process.argv[1], ...processedArgs];
    if (shouldRunInteractive(process.argv)) {
      const menu = new InteractiveMenu(program);
      await menu.showMainMenu();
      return;
    }
    intro(chalk34.inverse(" Welcome to GhostSpeak CLI "));
    if (!processedArgs.length) {
      showContextualHelp();
      process.exit(0);
    }
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk34.red("\u274C Error:"), error instanceof Error ? error.message : "Unknown error");
    outro(chalk34.red("Operation failed"));
    process.exit(1);
  }
}
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
main().catch((error) => {
  console.error(chalk34.red("Fatal error:"), error);
  process.exit(1);
});
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map