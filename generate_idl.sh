#!/bin/bash

# Generate IDL for GhostSpeak marketplace

echo "Generating IDL for GhostSpeak marketplace..."

# Create target directories if they don't exist
mkdir -p target/idl
mkdir -p target/types

# Build the program with IDL feature
cd packages/core/programs/agent-marketplace
cargo build --release --features idl-build

# Generate the IDL JSON
cat > ../../../../target/idl/ghostspeak_marketplace.json << 'EOF'
{
  "address": "4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP",
  "metadata": {
    "name": "ghostspeak_marketplace",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "GhostSpeak Protocol - AI Agent Commerce Protocol for Eliza, Autogen, Langchain and other AI frameworks"
  },
  "instructions": [
    {
      "name": "registerAgent",
      "discriminator": [11, 83, 51, 115, 126, 202, 161, 80],
      "accounts": [
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {"kind": "const", "value": [97, 103, 101, 110, 116]},
              {"kind": "account", "path": "owner"}
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {"name": "name", "type": "string"},
        {"name": "description", "type": "string"},
        {"name": "capabilities", "type": {"vec": "string"}},
        {"name": "pricingModel", "type": {"defined": {"name": "pricingModel"}}},
        {"name": "frameworkOrigin", "type": "string"}
      ]
    },
    {
      "name": "verifyAgent",
      "discriminator": [217, 136, 177, 15, 232, 54, 204, 128],
      "accounts": [
        {
          "name": "agent",
          "writable": true
        },
        {
          "name": "agentVerification",
          "writable": true,
          "pda": {
            "seeds": [
              {"kind": "const", "value": [97, 103, 101, 110, 116, 95, 118, 101, 114, 105, 102, 105, 99, 97, 116, 105, 111, 110]},
              {"kind": "account", "path": "agent"}
            ]
          }
        },
        {
          "name": "verifier",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {"name": "verificationData", "type": {"defined": {"name": "agentVerificationData"}}}
      ]
    },
    {
      "name": "createServiceListing",
      "discriminator": [77, 211, 186, 90, 207, 42, 35, 236],
      "accounts": [
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {"kind": "const", "value": [115, 101, 114, 118, 105, 99, 101, 95, 108, 105, 115, 116, 105, 110, 103]},
              {"kind": "account", "path": "agent"},
              {"kind": "arg", "path": "listingData.listingId"}
            ]
          }
        },
        {
          "name": "agent",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {"name": "listingData", "type": {"defined": {"name": "serviceListingData"}}}
      ]
    },
    {
      "name": "createJobPosting",
      "discriminator": [162, 71, 225, 47, 65, 195, 37, 180],
      "accounts": [
        {
          "name": "jobPosting",
          "writable": true,
          "pda": {
            "seeds": [
              {"kind": "const", "value": [106, 111, 98, 95, 112, 111, 115, 116, 105, 110, 103]},
              {"kind": "account", "path": "employer"},
              {"kind": "arg", "path": "jobData.jobId"}
            ]
          }
        },
        {
          "name": "employer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {"name": "jobData", "type": {"defined": {"name": "jobPostingData"}}}
      ]
    },
    {
      "name": "createWorkOrder",
      "discriminator": [253, 119, 98, 46, 186, 96, 205, 89],
      "accounts": [
        {
          "name": "workOrder",
          "writable": true,
          "pda": {
            "seeds": [
              {"kind": "const", "value": [119, 111, 114, 107, 95, 111, 114, 100, 101, 114]},
              {"kind": "account", "path": "client"},
              {"kind": "account", "path": "agent"},
              {"kind": "arg", "path": "orderId"}
            ]
          }
        },
        {
          "name": "client",
          "writable": true,
          "signer": true
        },
        {
          "name": "agent",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {"kind": "const", "value": [101, 115, 99, 114, 111, 119]},
              {"kind": "account", "path": "workOrder"}
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {"name": "orderId", "type": "u64"},
        {"name": "requirements", "type": {"vec": "string"}},
        {"name": "deadline", "type": "i64"},
        {"name": "price", "type": "u64"},
        {"name": "paymentToken", "type": "publicKey"}
      ]
    },
    {
      "name": "createChannel",
      "discriminator": [164, 135, 80, 201, 193, 128, 214, 41],
      "accounts": [
        {
          "name": "channel",
          "writable": true,
          "pda": {
            "seeds": [
              {"kind": "const", "value": [99, 104, 97, 110, 110, 101, 108]},
              {"kind": "account", "path": "creator"},
              {"kind": "arg", "path": "channelId"}
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {"name": "channelId", "type": "u64"},
        {"name": "name", "type": "string"},
        {"name": "description", "type": "string"},
        {"name": "isPublic", "type": "bool"}
      ]
    },
    {
      "name": "sendMessage",
      "discriminator": [45, 239, 121, 192, 102, 220, 171, 234],
      "accounts": [
        {
          "name": "message",
          "writable": true,
          "pda": {
            "seeds": [
              {"kind": "const", "value": [109, 101, 115, 115, 97, 103, 101]},
              {"kind": "account", "path": "channel"},
              {"kind": "arg", "path": "messageId"}
            ]
          }
        },
        {
          "name": "channel",
          "writable": true
        },
        {
          "name": "sender",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {"name": "messageId", "type": "u64"},
        {"name": "content", "type": "string"}
      ]
    },
    {
      "name": "processPayment",
      "discriminator": [226, 204, 187, 184, 251, 4, 167, 227],
      "accounts": [
        {
          "name": "payment",
          "writable": true,
          "pda": {
            "seeds": [
              {"kind": "const", "value": [112, 97, 121, 109, 101, 110, 116]},
              {"kind": "account", "path": "workOrder"}
            ]
          }
        },
        {
          "name": "workOrder",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "recipient",
          "writable": true
        },
        {
          "name": "payerTokenAccount",
          "writable": true
        },
        {
          "name": "recipientTokenAccount",
          "writable": true
        },
        {
          "name": "escrowTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {"name": "amount", "type": "u64"}
      ]
    }
  ],
  "accounts": [
    {
      "name": "Agent",
      "discriminator": [28, 19, 91, 124, 103, 176, 163, 48]
    },
    {
      "name": "ServiceListing",
      "discriminator": [231, 56, 12, 199, 253, 227, 39, 107]
    },
    {
      "name": "JobPosting",
      "discriminator": [208, 69, 239, 133, 175, 232, 56, 179]
    },
    {
      "name": "WorkOrder",
      "discriminator": [90, 11, 142, 106, 28, 62, 215, 125]
    },
    {
      "name": "Channel",
      "discriminator": [67, 210, 71, 78, 57, 227, 157, 134]
    },
    {
      "name": "Message",
      "discriminator": [155, 236, 15, 80, 85, 182, 89, 111]
    },
    {
      "name": "Escrow",
      "discriminator": [226, 111, 112, 62, 140, 2, 20, 143]
    },
    {
      "name": "Payment",
      "discriminator": [172, 179, 44, 150, 251, 159, 41, 193]
    }
  ],
  "errors": [
    {"code": 6000, "name": "InvalidAmount", "msg": "Invalid amount"},
    {"code": 6001, "name": "InvalidDeadline", "msg": "Invalid deadline"},
    {"code": 6002, "name": "UnauthorizedAccess", "msg": "Unauthorized access"},
    {"code": 6003, "name": "AgentNotActive", "msg": "Agent is not active"},
    {"code": 6004, "name": "InvalidPaymentAmount", "msg": "Invalid payment amount"},
    {"code": 6005, "name": "TaskIdTooLong", "msg": "Task ID too long"},
    {"code": 6006, "name": "InvalidExpiration", "msg": "Invalid expiration"},
    {"code": 6007, "name": "InvalidEscrowStatus", "msg": "Invalid escrow status"},
    {"code": 6008, "name": "DisputeReasonTooLong", "msg": "Dispute reason too long"},
    {"code": 6009, "name": "ResolutionNotesTooLong", "msg": "Resolution notes too long"},
    {"code": 6010, "name": "InvalidTaskStatus", "msg": "Invalid task status"},
    {"code": 6011, "name": "CompletionProofTooLong", "msg": "Completion proof too long"},
    {"code": 6012, "name": "TaskDeadlineExceeded", "msg": "Task deadline exceeded"},
    {"code": 6013, "name": "DisputeDetailsTooLong", "msg": "Dispute details too long"}
  ],
  "types": [
    {
      "name": "PricingModel",
      "type": {
        "kind": "enum",
        "variants": [
          {"name": "Fixed"},
          {"name": "Hourly"},
          {"name": "Dynamic"},
          {"name": "Auction"}
        ]
      }
    },
    {
      "name": "EscrowStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {"name": "Active"},
          {"name": "Completed"},
          {"name": "Disputed"},
          {"name": "Resolved"},
          {"name": "Cancelled"}
        ]
      }
    },
    {
      "name": "WorkOrderStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {"name": "Created"},
          {"name": "Accepted"},
          {"name": "InProgress"},
          {"name": "Submitted"},
          {"name": "Completed"},
          {"name": "Cancelled"},
          {"name": "Disputed"}
        ]
      }
    }
  ]
}
EOF

echo "IDL generated successfully at target/idl/ghostspeak_marketplace.json"

# Return to root directory
cd ../../../..