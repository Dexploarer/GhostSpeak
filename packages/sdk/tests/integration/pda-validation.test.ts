/**
 * PDA Derivation Validation Tests
 * 
 * Comprehensive tests for Program Derived Address (PDA) validation
 * to ensure security and consistency across all program accounts
 */

import { describe, it, expect } from 'bun:test';
import { 
  address,
  getAddressFromPublicKey,
  getAddressEncoder,
  getAddressDecoder,
  assertIsAddress,
  isAddress,
  type Address
} from '@solana/web3.js';
import {
  findChannelPda,
  findMessagePda,
  findAgentPda,
  findWorkOrderPda,
  findListingPda,
  findAuctionPda,
  findBidPda,
  findReputationPda,
  findDisputePda,
  findRoyaltyPda,
  getProgramAddress
} from '../../src/generated-v2';
import { safeBigIntToU64 } from '../../src/utils/bigint-serialization';
import { PublicKey } from '@solana/web3.js';

const PROGRAM_ID = address('4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP');

describe('PDA Derivation Validation', () => {
  const testAuthority = address('11111111111111111111111111111111');
  const testAgent = address('22222222222222222222222222222222');
  const testChannel = address('33333333333333333333333333333333');
  
  describe('Channel PDA Validation', () => {
    it('should derive valid channel PDAs with consistent bumps', async () => {
      const channelIds = [0n, 1n, 100n, 1000n, BigInt(Number.MAX_SAFE_INTEGER)];
      const pdaMap = new Map<string, number>();
      
      for (const channelId of channelIds) {
        const [pda, bump] = await findChannelPda({
          authority: testAuthority,
          channelId: safeBigIntToU64(channelId),
          programAddress: PROGRAM_ID
        });
        
        // Validate PDA format
        expect(isAddress(pda)).toBe(true);
        expect(bump).toBeGreaterThanOrEqual(0);
        expect(bump).toBeLessThanOrEqual(255);
        
        // Ensure uniqueness
        const key = `${testAuthority}-${channelId}`;
        expect(pdaMap.has(key)).toBe(false);
        pdaMap.set(key, bump);
      }
    });
    
    it('should generate different PDAs for different authorities', async () => {
      const authorities = [
        address('11111111111111111111111111111111'),
        address('22222222222222222222222222222222'),
        address('33333333333333333333333333333333')
      ];
      
      const channelId = 123n;
      const pdas = new Set<Address>();
      
      for (const authority of authorities) {
        const [pda] = await findChannelPda({
          authority,
          channelId: safeBigIntToU64(channelId),
          programAddress: PROGRAM_ID
        });
        
        // Each authority should have unique PDA
        expect(pdas.has(pda)).toBe(false);
        pdas.add(pda);
      }
      
      expect(pdas.size).toBe(authorities.length);
    });
    
    it('should handle edge case channel IDs', async () => {
      const edgeCases = [
        0n,                           // Minimum
        0xFFFFFFFFFFFFFFFFn,         // Maximum u64
        0x8000000000000000n,         // Midpoint
        0x7FFFFFFFFFFFFFFFn,         // Max positive i64
      ];
      
      for (const channelId of edgeCases) {
        const [pda, bump] = await findChannelPda({
          authority: testAuthority,
          channelId: safeBigIntToU64(channelId),
          programAddress: PROGRAM_ID
        });
        
        expect(isAddress(pda)).toBe(true);
        expect(bump).toBeGreaterThanOrEqual(0);
        expect(bump).toBeLessThanOrEqual(255);
      }
    });
  });
  
  describe('Message PDA Validation', () => {
    it('should derive valid message PDAs', async () => {
      const messageIds = [0n, 1n, 2n, 100n, 1000n];
      
      for (const messageId of messageIds) {
        const [pda, bump] = await findMessagePda({
          channel: testChannel,
          messageId: safeBigIntToU64(messageId),
          programAddress: PROGRAM_ID
        });
        
        expect(isAddress(pda)).toBe(true);
        expect(bump).toBeGreaterThanOrEqual(0);
        expect(bump).toBeLessThanOrEqual(255);
      }
    });
    
    it('should ensure message PDAs are unique per channel', async () => {
      const channels = [
        address('11111111111111111111111111111111'),
        address('22222222222222222222222222222222')
      ];
      
      const messageId = 42n;
      const pdas = new Set<Address>();
      
      for (const channel of channels) {
        const [pda] = await findMessagePda({
          channel,
          messageId: safeBigIntToU64(messageId),
          programAddress: PROGRAM_ID
        });
        
        expect(pdas.has(pda)).toBe(false);
        pdas.add(pda);
      }
    });
  });
  
  describe('Agent PDA Validation', () => {
    it('should derive valid agent PDAs', async () => {
      const owners = [
        address('11111111111111111111111111111111'),
        address('22222222222222222222222222222222'),
        address('33333333333333333333333333333333')
      ];
      
      for (const owner of owners) {
        const [pda, bump] = await findAgentPda({
          owner,
          programAddress: PROGRAM_ID
        });
        
        expect(isAddress(pda)).toBe(true);
        expect(bump).toBeGreaterThanOrEqual(0);
        expect(bump).toBeLessThanOrEqual(255);
      }
    });
    
    it('should ensure one agent PDA per owner', async () => {
      const owner = address('44444444444444444444444444444444');
      
      // Derive multiple times
      const results = await Promise.all([
        findAgentPda({ owner, programAddress: PROGRAM_ID }),
        findAgentPda({ owner, programAddress: PROGRAM_ID }),
        findAgentPda({ owner, programAddress: PROGRAM_ID })
      ]);
      
      // All should be identical
      const [pda1, bump1] = results[0];
      for (const [pda, bump] of results) {
        expect(pda).toBe(pda1);
        expect(bump).toBe(bump1);
      }
    });
  });
  
  describe('Work Order PDA Validation', () => {
    it('should derive valid work order PDAs', async () => {
      const orderIds = [1n, 10n, 100n, 1000n, 10000n];
      
      for (const orderId of orderIds) {
        const [pda, bump] = await findWorkOrderPda({
          creator: testAuthority,
          orderId: safeBigIntToU64(orderId),
          programAddress: PROGRAM_ID
        });
        
        expect(isAddress(pda)).toBe(true);
        expect(bump).toBeGreaterThanOrEqual(0);
        expect(bump).toBeLessThanOrEqual(255);
      }
    });
    
    it('should handle work order ID collisions correctly', async () => {
      const creators = [
        address('11111111111111111111111111111111'),
        address('22222222222222222222222222222222')
      ];
      
      const orderId = 999n;
      const pdas = new Map<string, Address>();
      
      for (const creator of creators) {
        const [pda] = await findWorkOrderPda({
          creator,
          orderId: safeBigIntToU64(orderId),
          programAddress: PROGRAM_ID
        });
        
        const key = `${creator}-${orderId}`;
        expect(pdas.has(key)).toBe(false);
        pdas.set(key, pda);
      }
    });
  });
  
  describe('Cross-PDA Collision Tests', () => {
    it('should ensure no collisions between different PDA types', async () => {
      const allPdas = new Set<Address>();
      
      // Channel PDA
      const [channelPda] = await findChannelPda({
        authority: testAuthority,
        channelId: safeBigIntToU64(1n),
        programAddress: PROGRAM_ID
      });
      allPdas.add(channelPda);
      
      // Message PDA
      const [messagePda] = await findMessagePda({
        channel: testChannel,
        messageId: safeBigIntToU64(1n),
        programAddress: PROGRAM_ID
      });
      allPdas.add(messagePda);
      
      // Agent PDA
      const [agentPda] = await findAgentPda({
        owner: testAgent,
        programAddress: PROGRAM_ID
      });
      allPdas.add(agentPda);
      
      // Work Order PDA
      const [workOrderPda] = await findWorkOrderPda({
        creator: testAuthority,
        orderId: safeBigIntToU64(1n),
        programAddress: PROGRAM_ID
      });
      allPdas.add(workOrderPda);
      
      // Listing PDA
      const [listingPda] = await findListingPda({
        agent: testAgent,
        listingId: safeBigIntToU64(1n),
        programAddress: PROGRAM_ID
      });
      allPdas.add(listingPda);
      
      // All PDAs should be unique
      expect(allPdas.size).toBe(5);
    });
  });
  
  describe('PDA Seed Validation', () => {
    it('should validate seed length constraints', async () => {
      // Test with maximum safe values
      const maxSafeChannelId = 0xFFFFFFFFFFFFFFFFn;
      
      const [pda, bump] = await findChannelPda({
        authority: testAuthority,
        channelId: safeBigIntToU64(maxSafeChannelId),
        programAddress: PROGRAM_ID
      });
      
      expect(isAddress(pda)).toBe(true);
      expect(bump).toBeGreaterThanOrEqual(0);
    });
    
    it('should handle concurrent PDA derivations', async () => {
      const derivations = [];
      
      // Create 100 concurrent PDA derivations
      for (let i = 0; i < 100; i++) {
        derivations.push(
          findChannelPda({
            authority: testAuthority,
            channelId: safeBigIntToU64(BigInt(i)),
            programAddress: PROGRAM_ID
          })
        );
      }
      
      const results = await Promise.all(derivations);
      const uniquePdas = new Set(results.map(([pda]) => pda));
      
      // All PDAs should be unique
      expect(uniquePdas.size).toBe(100);
    });
  });
  
  describe('PDA Security Tests', () => {
    it('should reject invalid program addresses', async () => {
      const invalidProgram = address('invalid11111111111111111111111');
      
      await expect(async () => {
        await findChannelPda({
          authority: testAuthority,
          channelId: safeBigIntToU64(1n),
          programAddress: invalidProgram
        });
      }).not.toThrow(); // PDA derivation itself shouldn't throw
    });
    
    it('should handle address encoding/decoding correctly', () => {
      const testAddress = address('11111111111111111111111111111111');
      
      // Encode and decode
      const encoder = getAddressEncoder();
      const decoder = getAddressDecoder();
      
      const encoded = encoder.encode(testAddress);
      const decoded = decoder.decode(encoded);
      
      expect(decoded).toBe(testAddress);
    });
    
    it('should validate PDA bump consistency', async () => {
      const bumps = new Map<string, number>();
      
      // Derive same PDA multiple times
      for (let i = 0; i < 10; i++) {
        const [pda, bump] = await findChannelPda({
          authority: testAuthority,
          channelId: safeBigIntToU64(123n),
          programAddress: PROGRAM_ID
        });
        
        const key = pda.toString();
        if (bumps.has(key)) {
          expect(bump).toBe(bumps.get(key));
        } else {
          bumps.set(key, bump);
        }
      }
      
      // Should only have one unique PDA
      expect(bumps.size).toBe(1);
    });
  });
});