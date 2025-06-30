#!/usr/bin/env node

/**
 * Codama Generation Script
 * Generates Web3.js v2 compatible TypeScript clients from our pod_com IDL
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFromRoot } from 'codama';
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import { renderVisitor } from '@codama/renderers-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Starting Codama client generation...');

try {
  // Create a proper Anchor IDL structure from our TypeScript IDL
  console.log('🔧 Constructing IDL from TypeScript module...');
  
  const anchorIdl = {
    address: "HEpGLgYsE1kP8aoYKyLFc3JVVrofS7T4zEA6fWBJsZps",
    metadata: {
      name: "pod_com",
      version: "0.1.0",
      spec: "0.1.0",
      description: "PoD Protocol (Prompt or Die): AI Agent Communication Protocol"
    },
    instructions: [
      {
        name: "register_agent",
        discriminator: [135, 157, 66, 195, 2, 113, 175, 30],
        accounts: [
          {
            name: "agent_account",
            writable: true,
            pda: {
              seeds: [
                { kind: "const", value: [97, 103, 101, 110, 116] }, // "agent"
                { kind: "account", path: "signer" }
              ]
            }
          },
          {
            name: "signer",
            writable: true,
            signer: true
          },
          {
            name: "system_program",
            address: "11111111111111111111111111111111"
          }
        ],
        args: [
          { name: "capabilities", type: "u64" },
          { name: "metadata_uri", type: "string" }
        ]
      },
      {
        name: "create_channel",
        discriminator: [142, 179, 25, 199, 84, 243, 69, 80],
        accounts: [
          {
            name: "channel_account",
            writable: true,
            pda: {
              seeds: [
                { kind: "const", value: [99, 104, 97, 110, 110, 101, 108] }, // "channel"
                { kind: "account", path: "creator" },
                { kind: "arg", path: "channel_id" }
              ]
            }
          },
          {
            name: "creator",
            writable: true,
            signer: true
          },
          {
            name: "system_program",
            address: "11111111111111111111111111111111"
          }
        ],
        args: [
          { name: "channel_id", type: "string" },
          { name: "name", type: "string" },
          { name: "description", type: "string" },
          { name: "visibility", type: "u8" },
          { name: "max_participants", type: "u32" },
          { name: "fee_per_message", type: "u64" }
        ]
      },
      {
        name: "send_message",
        discriminator: [15, 40, 235, 178, 191, 96, 190, 12],
        accounts: [
          {
            name: "message_account",
            writable: true,
            pda: {
              seeds: [
                { kind: "const", value: [109, 101, 115, 115, 97, 103, 101] }, // "message"
                { kind: "account", path: "sender" },
                { kind: "account", path: "recipient" },
                { kind: "arg", path: "message_id" }
              ]
            }
          },
          {
            name: "sender",
            writable: true,
            signer: true
          },
          {
            name: "recipient",
            writable: false
          },
          {
            name: "system_program",
            address: "11111111111111111111111111111111"
          }
        ],
        args: [
          { name: "message_id", type: "string" },
          { name: "payload", type: "string" },
          { name: "message_type", type: "u8" },
          { name: "expiration_days", type: "u32" }
        ]
      },
      {
        name: "broadcast_message",
        discriminator: [82, 156, 47, 199, 117, 203, 24, 91],
        accounts: [
          {
            name: "message_account",
            writable: true,
            pda: {
              seeds: [
                { kind: "const", value: [98, 114, 111, 97, 100, 99, 97, 115, 116] }, // "broadcast"
                { kind: "account", path: "channel_account" },
                { kind: "account", path: "sender" },
                { kind: "arg", path: "message_id" }
              ]
            }
          },
          {
            name: "channel_account",
            writable: true
          },
          {
            name: "sender",
            writable: true,
            signer: true
          },
          {
            name: "system_program",
            address: "11111111111111111111111111111111"
          }
        ],
        args: [
          { name: "message_id", type: "string" },
          { name: "content", type: "string" },
          { name: "message_type", type: "u8" }
        ]
      },
      {
        name: "add_participant",
        discriminator: [201, 23, 89, 155, 12, 47, 199, 233],
        accounts: [
          {
            name: "channel_account",
            writable: true
          },
          {
            name: "admin",
            writable: true,
            signer: true
          },
          {
            name: "new_participant",
            writable: false
          },
          {
            name: "system_program",
            address: "11111111111111111111111111111111"
          }
        ],
        args: []
      }
    ],
    accounts: [
      {
        name: "AgentAccount",
        discriminator: [241, 119, 69, 140, 233, 9, 112, 50]
      },
      {
        name: "ChannelAccount", 
        discriminator: [89, 117, 191, 67, 201, 23, 89, 155]
      },
      {
        name: "MessageAccount",
        discriminator: [15, 40, 235, 178, 191, 96, 190, 12]
      }
    ],
    types: [
      {
        name: "AgentAccount",
        type: {
          kind: "struct",
          fields: [
            { name: "pubkey", type: "pubkey" },
            { name: "capabilities", type: "u64" },
            { name: "metadata_uri", type: "string" },
            { name: "reputation", type: "u64" },
            { name: "last_updated", type: "i64" },
            { name: "bump", type: "u8" },
            { name: "reserved", type: { array: ["u8", 7] } }
          ]
        }
      },
      {
        name: "ChannelAccount",
        type: {
          kind: "struct",
          fields: [
            { name: "creator", type: "pubkey" },
            { name: "channel_id", type: "string" },
            { name: "name", type: "string" },
            { name: "description", type: "string" },
            { name: "visibility", type: "u8" },
            { name: "max_participants", type: "u32" },
            { name: "participant_count", type: "u32" },
            { name: "fee_per_message", type: "u64" },
            { name: "created_at", type: "i64" },
            { name: "is_active", type: "bool" },
            { name: "bump", type: "u8" }
          ]
        }
      },
      {
        name: "MessageAccount",
        type: {
          kind: "struct",
          fields: [
            { name: "sender", type: "pubkey" },
            { name: "recipient", type: "pubkey" },
            { name: "message_id", type: "string" },
            { name: "payload_hash", type: { array: ["u8", 32] } },
            { name: "message_type", type: "u8" },
            { name: "timestamp", type: "i64" },
            { name: "expires_at", type: "i64" },
            { name: "status", type: "u8" },
            { name: "bump", type: "u8" }
          ]
        }
      },
      {
        name: "MessageType",
        type: {
          kind: "enum",
          variants: [
            { name: "Text" },
            { name: "Image" },
            { name: "Code" },
            { name: "File" }
          ]
        }
      },
      {
        name: "ChannelVisibility",
        type: {
          kind: "enum",
          variants: [
            { name: "Public" },
            { name: "Private" },
            { name: "Restricted" }
          ]
        }
      },
      {
        name: "MessageStatus",
        type: {
          kind: "enum",
          variants: [
            { name: "Pending" },
            { name: "Delivered" },
            { name: "Read" },
            { name: "Expired" }
          ]
        }
      }
    ]
  };

  console.log('✅ IDL constructed successfully');
  console.log(`📍 Program Address: ${anchorIdl.address}`);
  console.log(`📋 Instructions: ${anchorIdl.instructions?.length || 0}`);
  console.log(`🏗️ Account Types: ${anchorIdl.accounts?.length || 0}`);

  // Convert Anchor IDL to Codama IDL
  console.log('🔄 Converting Anchor IDL to Codama IDL...');
  const codama = createFromRoot(rootNodeFromAnchor(anchorIdl));

  // Output directory for generated files
  const outputDir = path.join(__dirname, '../src/generated-v2');
  console.log(`📁 Output directory: ${outputDir}`);

  // Generate TypeScript clients with Web3.js v2 support
  console.log('🏭 Generating Web3.js v2 compatible TypeScript clients...');
  
  const renderOptions = {
    // Use granular imports for better tree-shaking
    useGranularImports: true,
    // Don't render parent instructions to focus on leaves
    renderParentInstructions: false
  };

  codama.accept(renderVisitor(outputDir, renderOptions));

  console.log('✅ Codama client generation completed successfully!');

} catch (error) {
  console.error('❌ Error generating Codama clients:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
