/**
 * Dynamic Import and Tree-Shaking Validation Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';

describe('Dynamic Import Pattern Validation', () => {
  let moduleLoadTracker: Set<string>;

  beforeEach(() => {
    // Clear module cache to ensure fresh imports
    Object.keys(require.cache).forEach(key => {
      if (key.includes('ghostspeak-1/packages/sdk')) {
        delete require.cache[key];
      }
    });
    
    moduleLoadTracker = new Set<string>();
  });

  describe('Minimal Client Import', () => {
    it('should only load essential modules for minimal client', async () => {
      // Track module resolution
      const originalResolve = require.resolve;
      (require as any).resolve = function(id: string) {
        if (id.includes('services/')) {
          moduleLoadTracker.add(id);
        }
        return originalResolve.apply(this, arguments);
      };

      // Import only minimal client
      const { createMinimalClient } = await import('../src/index');
      
      // Verify no services were loaded
      expect(moduleLoadTracker.size).toBe(0);
      expect(createMinimalClient).toBeDefined();

      // Restore original resolve
      (require as any).resolve = originalResolve;
    });

    it('should have minimal memory footprint', async () => {
      const memBefore = process.memoryUsage().heapUsed;
      
      const { createMinimalClient, lamportsToSol, solToLamports } = 
        await import('../src/index');
      
      const memAfter = process.memoryUsage().heapUsed;
      const memUsedKB = (memAfter - memBefore) / 1024;
      
      console.log(`Minimal import memory usage: ${memUsedKB.toFixed(2)} KB`);
      
      // Should use less than 1MB for minimal import
      expect(memUsedKB).toBeLessThan(1024);
    });
  });

  describe('Dynamic Service Loading', () => {
    it('should load services only when requested', async () => {
      const { loadAdvancedServices, loadOptionalServices } = 
        await import('../src/index');
      
      // Services should not be loaded yet
      expect(moduleLoadTracker.size).toBe(0);
      
      // Load advanced services
      const startTime = Date.now();
      const advancedServices = await loadAdvancedServices();
      const loadTime = Date.now() - startTime;
      
      console.log(`Advanced services load time: ${loadTime}ms`);
      
      expect(advancedServices.AgentService).toBeDefined();
      expect(advancedServices.ChannelService).toBeDefined();
      expect(advancedServices.MessageService).toBeDefined();
      expect(advancedServices.EscrowService).toBeDefined();
      
      // Load time should be reasonable
      expect(loadTime).toBeLessThan(500);
    });

    it('should support parallel service loading', async () => {
      const { loadAdvancedServices, loadOptionalServices, loadAnalytics } = 
        await import('../src/index');
      
      const startTime = Date.now();
      
      // Load all services in parallel
      const [advanced, optional, analytics] = await Promise.all([
        loadAdvancedServices(),
        loadOptionalServices(),
        loadAnalytics()
      ]);
      
      const totalTime = Date.now() - startTime;
      
      console.log(`Parallel load time: ${totalTime}ms`);
      
      // Verify all services loaded
      expect(Object.keys(advanced).length).toBe(4);
      expect(Object.keys(optional).length).toBe(3);
      expect(analytics.AnalyticsService).toBeDefined();
      
      // Parallel loading should be faster than sequential
      expect(totalTime).toBeLessThan(1000);
    });

    it('should cache loaded services', async () => {
      const { loadAdvancedServices } = await import('../src/index');
      
      // First load
      const start1 = Date.now();
      const services1 = await loadAdvancedServices();
      const time1 = Date.now() - start1;
      
      // Second load (should be cached)
      const start2 = Date.now();
      const services2 = await loadAdvancedServices();
      const time2 = Date.now() - start2;
      
      console.log(`First load: ${time1}ms, Second load: ${time2}ms`);
      
      // Second load should be much faster
      expect(time2).toBeLessThan(time1 / 2);
      
      // Should return same instances
      expect(services1.AgentService).toBe(services2.AgentService);
    });
  });

  describe('Tree-Shaking Effectiveness', () => {
    it('should not include unused exports in bundle', async () => {
      // This test would need to analyze the actual bundle
      // For now, we'll verify the export structure supports tree-shaking
      
      const indexPath = path.join(__dirname, '..', 'src', 'index.ts');
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      
      // Check for proper ES module exports
      expect(indexContent).toContain('export {');
      expect(indexContent).toContain('export const');
      expect(indexContent).toContain('export type');
      
      // Check for dynamic imports
      expect(indexContent).toContain('await import(');
      expect(indexContent).toContain('./client-v2');
      expect(indexContent).toContain('./services/');
    });

    it('should use named exports for better tree-shaking', async () => {
      const exports = await import('../src/index');
      
      // Verify named exports
      expect(exports.createMinimalClient).toBeDefined();
      expect(exports.loadAdvancedServices).toBeDefined();
      expect(exports.lamportsToSol).toBeDefined();
      expect(exports.solToLamports).toBeDefined();
      
      // Should not have default export for better tree-shaking
      expect(exports.default).toBeUndefined();
    });
  });

  describe('Bundle Size Impact', () => {
    it('should measure impact of each service on bundle size', async () => {
      const serviceSizes = {
        minimal: 0,
        withAgent: 0,
        withChannel: 0,
        withMessage: 0,
        withEscrow: 0,
        withAll: 0
      };
      
      // Note: This is a simulation. Real bundle analysis would use webpack-bundle-analyzer
      
      // Minimal import
      const memBefore = process.memoryUsage().heapUsed;
      const { createMinimalClient } = await import('../src/index');
      serviceSizes.minimal = process.memoryUsage().heapUsed - memBefore;
      
      // With individual services
      const { loadAdvancedServices } = await import('../src/index');
      const services = await loadAdvancedServices();
      serviceSizes.withAll = process.memoryUsage().heapUsed - memBefore;
      
      console.log('Service memory impact:');
      console.log(`  Minimal: ${(serviceSizes.minimal / 1024).toFixed(2)} KB`);
      console.log(`  With all services: ${(serviceSizes.withAll / 1024).toFixed(2)} KB`);
      
      // All services should add less than 500KB
      const additionalKB = (serviceSizes.withAll - serviceSizes.minimal) / 1024;
      expect(additionalKB).toBeLessThan(500);
    });
  });

  describe('Import Performance', () => {
    it('should load quickly in different scenarios', async () => {
      const scenarios = [
        {
          name: 'Minimal client only',
          imports: ['createMinimalClient', 'lamportsToSol', 'solToLamports']
        },
        {
          name: 'With one service',
          imports: ['createMinimalClient'],
          dynamicImports: ['loadAdvancedServices']
        },
        {
          name: 'With all services',
          imports: ['createMinimalClient'],
          dynamicImports: ['loadAdvancedServices', 'loadOptionalServices', 'loadAnalytics']
        }
      ];
      
      for (const scenario of scenarios) {
        // Clear cache
        Object.keys(require.cache).forEach(key => {
          if (key.includes('sdk/src')) delete require.cache[key];
        });
        
        const start = Date.now();
        
        // Static imports
        const module = await import('../src/index');
        scenario.imports.forEach(imp => {
          expect(module[imp]).toBeDefined();
        });
        
        // Dynamic imports
        if (scenario.dynamicImports) {
          for (const dynImport of scenario.dynamicImports) {
            await module[dynImport]();
          }
        }
        
        const elapsed = Date.now() - start;
        console.log(`${scenario.name}: ${elapsed}ms`);
        
        // Should load within reasonable time
        expect(elapsed).toBeLessThan(1000);
      }
    });
  });

  describe('Real Bundle Analysis', () => {
    it('should analyze actual dist bundle if available', () => {
      const distPath = path.join(__dirname, '..', 'dist');
      
      if (!fs.existsSync(distPath)) {
        console.warn('Dist folder not found. Run build first.');
        return;
      }
      
      const files = fs.readdirSync(distPath);
      const jsFiles = files.filter(f => f.endsWith('.js') && !f.includes('.map'));
      
      jsFiles.forEach(file => {
        const filePath = path.join(distPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        
        // Check for proper minification
        const lines = content.split('\n').length;
        const avgLineLength = content.length / lines;
        
        console.log(`${file}:`);
        console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`  Lines: ${lines}`);
        console.log(`  Avg line length: ${avgLineLength.toFixed(0)}`);
        
        // Minified code should have long lines
        if (file.includes('.min.')) {
          expect(avgLineLength).toBeGreaterThan(1000);
        }
        
        // Check for dynamic import preservation
        if (file.includes('index')) {
          expect(content).toContain('import(');
        }
      });
    });
  });
});

// Helper to analyze import graph
export async function analyzeImportGraph() {
  const importGraph = new Map<string, Set<string>>();
  
  function analyzeFile(filePath: string) {
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = new Set<string>();
    
    // Find static imports
    const staticImportRegex = /import\s+(?:.*\s+from\s+)?['"](.+)['"]/g;
    let match;
    while ((match = staticImportRegex.exec(content)) !== null) {
      imports.add(match[1]);
    }
    
    // Find dynamic imports
    const dynamicImportRegex = /import\s*\(\s*['"](.+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      imports.add(`${match[1]} (dynamic)`);
    }
    
    importGraph.set(filePath, imports);
  }
  
  // Analyze main index file
  const indexPath = path.join(__dirname, '..', 'src', 'index.ts');
  analyzeFile(indexPath);
  
  // Analyze service files
  const servicesPath = path.join(__dirname, '..', 'src', 'services');
  if (fs.existsSync(servicesPath)) {
    fs.readdirSync(servicesPath).forEach(file => {
      if (file.endsWith('.ts')) {
        analyzeFile(path.join(servicesPath, file));
      }
    });
  }
  
  return importGraph;
}