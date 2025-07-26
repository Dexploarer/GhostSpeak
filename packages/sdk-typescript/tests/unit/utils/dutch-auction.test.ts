/**
 * Dutch Auction Unit Tests
 * 
 * Tests for Dutch auction functionality including price calculation,
 * validation, and time-based decay mechanisms.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DutchAuctionUtils, AuctionTimeUtils } from '../../src/utils/auction-helpers.js'
import { AuctionType } from '../../src/generated/index.js'

describe('Dutch Auction Utils', () => {
  describe('Price Calculation', () => {
    it('should calculate linear price decay correctly', () => {
      const startingPrice = 1000n
      const reservePrice = 100n
      const startTime = 1000n
      const endTime = 2000n // 1000 second auction
      const currentTime = 1500n // 50% through auction
      
      const currentPrice = DutchAuctionUtils.calculateCurrentPrice(
        startingPrice,
        reservePrice,
        startTime,
        endTime,
        currentTime,
        'linear'
      )
      
      // At 50% through, price should be 550 (100 + (900 * 0.5))
      expect(currentPrice).toBe(550n)
    })
    
    it('should not go below reserve price', () => {
      const startingPrice = 1000n
      const reservePrice = 100n
      const startTime = 1000n
      const endTime = 2000n
      const currentTime = 3000n // Past auction end
      
      const currentPrice = DutchAuctionUtils.calculateCurrentPrice(
        startingPrice,
        reservePrice,
        startTime,
        endTime,
        currentTime,
        'linear'
      )
      
      expect(currentPrice).toBe(reservePrice)
    })
    
    it('should start at starting price before auction begins', () => {
      const startingPrice = 1000n
      const reservePrice = 100n
      const startTime = 2000n
      const endTime = 3000n
      const currentTime = 1000n // Before auction starts
      
      const currentPrice = DutchAuctionUtils.calculateCurrentPrice(
        startingPrice,
        reservePrice,
        startTime,
        endTime,
        currentTime,
        'linear'
      )
      
      expect(currentPrice).toBe(startingPrice)
    })
    
    it('should calculate exponential decay correctly', () => {
      const startingPrice = 1000n
      const reservePrice = 100n
      const startTime = 1000n
      const endTime = 2000n
      const currentTime = 1800n // 80% through auction
      
      const currentPrice = DutchAuctionUtils.calculateCurrentPrice(
        startingPrice,
        reservePrice,
        startTime,
        endTime,
        currentTime,
        'exponential'
      )
      
      // Exponential decay should result in different price progression than linear
      // At 80% through with cubic curve: 0.8^3 = 0.512, so price reduction is 0.512 * 900 = 460.8
      // Current price should be 1000 - 460.8 = 539.2
      expect(currentPrice).toBeGreaterThan(500n) // Should be around 540 with cubic curve
      expect(currentPrice).toBeLessThan(600n)
      expect(currentPrice).toBeGreaterThanOrEqual(reservePrice)
    })
  })
  
  describe('Parameter Validation', () => {
    it('should validate valid Dutch auction parameters', () => {
      const params = {
        startingPrice: 1000n,
        reservePrice: 100n,
        startTime: AuctionTimeUtils.now(),
        endTime: AuctionTimeUtils.now() + 3600n, // 1 hour
        decayType: 'linear' as const
      }
      
      const result = DutchAuctionUtils.validateDutchAuctionParams(params)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
    
    it('should reject starting price below reserve price', () => {
      const params = {
        startingPrice: 100n,
        reservePrice: 1000n, // Higher than starting price
        startTime: AuctionTimeUtils.now(),
        endTime: AuctionTimeUtils.now() + 3600n,
        decayType: 'linear' as const
      }
      
      const result = DutchAuctionUtils.validateDutchAuctionParams(params)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Starting price must be greater than reserve price for Dutch auction')
    })
    
    it('should reject auction duration that is too short', () => {
      const now = AuctionTimeUtils.now()
      const params = {
        startingPrice: 1000n,
        reservePrice: 100n,
        startTime: now,
        endTime: now + 60n, // Only 1 minute
        decayType: 'linear' as const
      }
      
      const result = DutchAuctionUtils.validateDutchAuctionParams(params)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Dutch auction duration must be at least 5 minutes')
    })
    
    it('should reject auction duration that is too long', () => {
      const now = AuctionTimeUtils.now()
      const params = {
        startingPrice: 1000n,
        reservePrice: 100n,
        startTime: now,
        endTime: now + (86400n * 8n), // 8 days
        decayType: 'linear' as const
      }
      
      const result = DutchAuctionUtils.validateDutchAuctionParams(params)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Dutch auction duration cannot exceed 7 days')
    })
    
    it('should reject price range that is too small', () => {
      const params = {
        startingPrice: 1000n,
        reservePrice: 990n, // Only 1% difference
        startTime: AuctionTimeUtils.now(),
        endTime: AuctionTimeUtils.now() + 3600n,
        decayType: 'linear' as const
      }
      
      const result = DutchAuctionUtils.validateDutchAuctionParams(params)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Price range (starting - reserve) must be at least 5% of starting price')
    })
  })
  
  describe('Auction Information', () => {
    it('should calculate Dutch auction information correctly', () => {
      const startingPrice = 1000n
      const reservePrice = 100n
      const startTime = AuctionTimeUtils.now()
      const endTime = startTime + 3600n // 1 hour
      const currentTime = startTime + 1800n // 30 minutes in
      
      const info = DutchAuctionUtils.getDutchAuctionInfo(
        startingPrice,
        reservePrice,
        startTime,
        endTime,
        currentTime,
        'linear'
      )
      
      expect(info.startingPrice).toBe(startingPrice)
      expect(info.reservePrice).toBe(reservePrice)
      expect(info.startTime).toBe(startTime)
      expect(info.endTime).toBe(endTime)
      expect(info.decayType).toBe('linear')
      expect(info.currentCalculatedPrice).toBe(550n) // 50% through = 550
      expect(info.priceReductionTotal).toBe(450n) // 1000 - 550
      expect(info.priceReductionPercentage).toBe(50) // 50% of the way
      expect(info.timeToReachReserve).toBe(1800n) // 30 minutes remaining
    })
    
    it('should handle auction that has ended', () => {
      const startingPrice = 1000n
      const reservePrice = 100n
      const startTime = AuctionTimeUtils.now() - 7200n // Started 2 hours ago
      const endTime = startTime + 3600n // Ended 1 hour ago
      const currentTime = AuctionTimeUtils.now()
      
      const info = DutchAuctionUtils.getDutchAuctionInfo(
        startingPrice,
        reservePrice,
        startTime,
        endTime,
        currentTime,
        'linear'
      )
      
      expect(info.currentCalculatedPrice).toBe(reservePrice)
      expect(info.priceReductionTotal).toBe(900n) // Full reduction
      expect(info.priceReductionPercentage).toBe(100)
      expect(info.timeToReachReserve).toBe(0n) // Already reached
    })
  })
  
  describe('Bidding Logic', () => {
    it('should accept bid at current calculated price', () => {
      const startingPrice = 1000n
      const reservePrice = 100n
      const currentPrice = 600n
      
      const isValid = DutchAuctionUtils.isValidBid(
        currentPrice, // Bid exactly at current price
        currentPrice,
        reservePrice
      )
      
      expect(isValid).toBe(true)
    })
    
    it('should accept bid above current calculated price', () => {
      const startingPrice = 1000n
      const reservePrice = 100n
      const currentPrice = 600n
      const bidAmount = 700n // Above current price
      
      const isValid = DutchAuctionUtils.isValidBid(
        bidAmount,
        currentPrice,
        reservePrice
      )
      
      expect(isValid).toBe(true)
    })
    
    it('should reject bid below current calculated price', () => {
      const startingPrice = 1000n
      const reservePrice = 100n
      const currentPrice = 600n
      const bidAmount = 500n // Below current price
      
      const isValid = DutchAuctionUtils.isValidBid(
        bidAmount,
        currentPrice,
        reservePrice
      )
      
      expect(isValid).toBe(false)
    })
    
    it('should reject bid below reserve price even if above current calculated price', () => {
      // Edge case: current price has fallen below reserve due to calculation
      const startingPrice = 1000n
      const reservePrice = 400n
      const currentPrice = 300n // Below reserve (shouldn't happen in practice)
      const bidAmount = 350n // Above current but below reserve
      
      const isValid = DutchAuctionUtils.isValidBid(
        bidAmount,
        currentPrice,
        reservePrice
      )
      
      expect(isValid).toBe(false)
    })
  })
  
  describe('Price Decay Rate Calculation', () => {
    it('should calculate linear decay rate correctly', () => {
      const startingPrice = 1000n
      const reservePrice = 100n
      const duration = 3600n // 1 hour
      
      const decayRate = DutchAuctionUtils.calculatePriceDecayRate(
        startingPrice,
        reservePrice,
        duration,
        'linear'
      )
      
      // Linear decay: 900 price units over 3600 seconds = 0.25 units per second
      expect(decayRate).toBe(0.25)
    })
    
    it('should handle exponential decay rate calculation', () => {
      const startingPrice = 1000n
      const reservePrice = 100n
      const duration = 3600n
      
      const decayRate = DutchAuctionUtils.calculatePriceDecayRate(
        startingPrice,
        reservePrice,
        duration,
        'exponential'
      )
      
      // Exponential decay rate should be positive
      expect(decayRate).toBeGreaterThan(0)
      expect(decayRate).toBeLessThan(1) // Should be a reasonable coefficient
    })
  })
  
  describe('Integration with Other Auction Types', () => {
    it('should distinguish Dutch auctions from other types', () => {
      expect(DutchAuctionUtils.isDutchAuction(AuctionType.Dutch)).toBe(true)
      expect(DutchAuctionUtils.isDutchAuction(AuctionType.English)).toBe(false)
      expect(DutchAuctionUtils.isDutchAuction(AuctionType.SealedBid)).toBe(false)
      expect(DutchAuctionUtils.isDutchAuction(AuctionType.Vickrey)).toBe(false)
    })
    
    it('should provide Dutch auction specific features', () => {
      const features = DutchAuctionUtils.getDutchAuctionFeatures()
      
      expect(features).toContain('Time-based price decay')
      expect(features).toContain('First bid wins')
      expect(features).toContain('Multiple decay curves (linear, exponential, stepped)')
      expect(features).toContain('Automatic auction end on bid')
      expect(features).toContain('Reserve price protection')
    })
  })
})