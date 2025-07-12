/**
 * Enhanced Progress Indicator Tests
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  EnhancedProgressIndicator,
  createEnhancedProgress,
  withEnhancedProgress,
  OPERATION_ESTIMATES
} from './enhanced-progress.js';

// Mock console methods
const mockWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('EnhancedProgressIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    test('should create with string message', () => {
      const progress = new EnhancedProgressIndicator('Testing...');
      expect(progress).toBeDefined();
    });

    test('should create with options object', () => {
      const progress = new EnhancedProgressIndicator({
        message: 'Testing...',
        estimatedDuration: 5000,
        showElapsed: true,
        showRemaining: true
      });
      expect(progress).toBeDefined();
    });

    test('should start and stop', () => {
      const progress = new EnhancedProgressIndicator('Testing...');
      progress.start();
      expect(mockWrite).toHaveBeenCalled();
      
      progress.stop();
      expect(mockWrite).toHaveBeenCalledWith('\r\x1b[K');
    });

    test('should show success message', () => {
      const progress = new EnhancedProgressIndicator('Testing...');
      progress.start();
      progress.succeed('Test completed!');
      
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('✓'),
        expect.stringContaining('Test completed!')
      );
    });

    test('should show failure message', () => {
      const progress = new EnhancedProgressIndicator('Testing...');
      progress.start();
      progress.fail('Test failed!');
      
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('✗'),
        expect.stringContaining('Test failed!')
      );
    });
  });

  describe('Status tracking', () => {
    test('should track elapsed time', async () => {
      const progress = new EnhancedProgressIndicator('Testing...');
      progress.start();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = progress.getStatus();
      expect(status.elapsed).toBeGreaterThan(90);
      expect(status.elapsed).toBeLessThan(200);
      
      progress.stop();
    });

    test('should calculate percentage', () => {
      const progress = new EnhancedProgressIndicator({
        message: 'Testing...',
        steps: [
          { name: 'Step 1', weight: 1 },
          { name: 'Step 2', weight: 1 },
          { name: 'Step 3', weight: 1 }
        ]
      });
      
      progress.start();
      progress.startStep(0);
      progress.completeStep();
      
      const status = progress.getStatus();
      expect(status.percentage).toBeCloseTo(33.33, 1);
      
      progress.stop();
    });

    test('should track retry count', () => {
      const progress = new EnhancedProgressIndicator('Testing...');
      progress.start();
      
      progress.retry();
      progress.retry();
      
      const status = progress.getStatus();
      expect(status.retryCount).toBe(2);
      
      progress.stop();
    });
  });

  describe('Step management', () => {
    test('should handle steps correctly', () => {
      const progress = new EnhancedProgressIndicator({
        message: 'Testing...',
        steps: [
          { name: 'Step 1', weight: 2 },
          { name: 'Step 2', weight: 3 },
          { name: 'Step 3', weight: 1 }
        ]
      });
      
      progress.start();
      
      // Start first step
      progress.startStep(0);
      let status = progress.getStatus();
      expect(status.currentStep).toBe('Step 1');
      expect(status.percentage).toBe(0);
      
      // Complete first step
      progress.completeStep();
      status = progress.getStatus();
      expect(status.percentage).toBeCloseTo(33.33, 1); // 2/6 weights
      
      // Start and complete second step
      progress.startStep(1);
      progress.completeStep();
      status = progress.getStatus();
      expect(status.percentage).toBeCloseTo(83.33, 1); // 5/6 weights
      
      progress.stop();
    });
  });

  describe('Event handling', () => {
    test('should emit warning event', async () => {
      const warningHandler = vi.fn();
      
      const progress = new EnhancedProgressIndicator({
        message: 'Testing...',
        estimatedDuration: 100, // 100ms
        timeoutWarningThreshold: 0.5 // Warn at 50%
      });
      
      progress.on('warning', warningHandler);
      progress.start();
      
      // Wait for warning threshold
      await new Promise(resolve => setTimeout(resolve, 60));
      
      expect(warningHandler).toHaveBeenCalled();
      
      progress.stop();
    });

    test('should emit success event', () => {
      const successHandler = vi.fn();
      
      const progress = new EnhancedProgressIndicator('Testing...');
      progress.on('success', successHandler);
      
      progress.start();
      progress.succeed();
      
      expect(successHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          elapsed: expect.any(Number),
          percentage: expect.any(Number)
        })
      );
    });

    test('should emit failure event', () => {
      const failureHandler = vi.fn();
      
      const progress = new EnhancedProgressIndicator('Testing...');
      progress.on('failure', failureHandler);
      
      progress.start();
      progress.fail();
      
      expect(failureHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          elapsed: expect.any(Number),
          percentage: expect.any(Number)
        })
      );
    });
  });

  describe('Helper functions', () => {
    test('createEnhancedProgress should use operation estimates', () => {
      const progress = createEnhancedProgress(
        'Creating channel...',
        'CREATE_CHANNEL'
      );
      
      progress.start();
      const status = progress.getStatus();
      expect(status.estimated).toBe(OPERATION_ESTIMATES.CREATE_CHANNEL);
      
      progress.stop();
    });

    test('withEnhancedProgress should handle success', async () => {
      const result = await withEnhancedProgress(
        'Processing...',
        async (progress) => {
          progress.updateStatus('Working...');
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'success';
        }
      );
      
      expect(result).toBe('success');
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('✓'),
        expect.stringContaining('Processing...')
      );
    });

    test('withEnhancedProgress should handle failure', async () => {
      await expect(
        withEnhancedProgress(
          'Processing...',
          async (progress) => {
            progress.updateStatus('Working...');
            throw new Error('Test error');
          }
        )
      ).rejects.toThrow('Test error');
      
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('✗'),
        expect.stringContaining('Processing...')
      );
    });
  });

  describe('Pause and resume', () => {
    test('should pause and resume spinner', async () => {
      const progress = new EnhancedProgressIndicator('Testing...');
      progress.start();
      
      const initialCalls = mockWrite.mock.calls.length;
      
      progress.pause();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const pausedCalls = mockWrite.mock.calls.length;
      
      progress.resume();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const resumedCalls = mockWrite.mock.calls.length;
      
      // Should not update while paused
      expect(pausedCalls - initialCalls).toBeLessThan(5);
      // Should update after resume
      expect(resumedCalls - pausedCalls).toBeGreaterThan(5);
      
      progress.stop();
    });
  });

  describe('Update methods', () => {
    test('should update main message', () => {
      const progress = new EnhancedProgressIndicator('Initial message...');
      progress.start();
      
      progress.update('Updated message...');
      
      expect(mockWrite).toHaveBeenCalledWith(
        expect.stringContaining('Updated message...')
      );
      
      progress.stop();
    });

    test('should update status message', () => {
      const progress = new EnhancedProgressIndicator({
        message: 'Testing...',
        showStatus: true
      });
      progress.start();
      
      progress.updateStatus('Loading data...');
      
      expect(mockWrite).toHaveBeenCalledWith(
        expect.stringContaining('Loading data...')
      );
      
      progress.stop();
    });

    test('should update estimated duration', () => {
      const progress = new EnhancedProgressIndicator({
        message: 'Testing...',
        estimatedDuration: 5000
      });
      progress.start();
      
      progress.updateEstimate(10000);
      
      const status = progress.getStatus();
      expect(status.estimated).toBeGreaterThan(5000);
      
      progress.stop();
    });
  });
});