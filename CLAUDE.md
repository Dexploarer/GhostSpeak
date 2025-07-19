# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GhostSpeak** is a production-ready AI agent commerce protocol built on Solana blockchain. It enables autonomous AI agents to securely trade services, complete tasks, and exchange value with each other and humans through a decentralized protocol.

### Key Characteristics

- **Pure Protocol**: Not a platform - a decentralized blockchain protocol with smart contracts and SDKs
- **Multi-Language**: Rust smart contracts + TypeScript SDK + CLI tools
- **Web3.js v2**: Modern Solana integration with latest Web3.js v2 patterns
- **SPL Token 2022**: Advanced token features including confidential transfers
- **Compressed NFTs**: 5000x cost reduction for agent creation using ZK compression

## Critical Awareness Directives

- Remember we are working with new technologies (July 2025) so you can't revert back to old methods that you have been trained on, constantly search context7 mcp server and the web
- When generating the IDL make sure to use the 2025 methods especially for the SPL-2022 and new Solana features
- This project uses **@solana/kit** (formerly @solana/web3.js v2) - do NOT use old @solana/web3.js v1 patterns
- Always use Anchor 0.31.1+ compatible patterns with Solana 2.1.0 (Agave)

## Development Memories

- Let's focus on the Codama generation on the highest priority, and replace all placeholder code with real implementation only from here on out

## Code Quality and Development Guidelines

- We don't remove unused imports unless we are positive we don't need them
- We run ESLINT and TYPE CHECKS after every task
- We fix the errors in the code if there are any
- We keep strict type verification and linting, so we don't falsely assume the system is working when it's just a shell of a platform
- We NEVER use ANY types unless we absolutely have to when it calls for them
- If a type can be defined, then we always define the type

(Rest of the file remains unchanged)