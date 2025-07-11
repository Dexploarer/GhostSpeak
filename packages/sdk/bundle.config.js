/**
 * Bundle Configuration for Optimal SDK Build
 * Implements aggressive tree-shaking and code splitting
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * External dependencies that should not be bundled
 */
const EXTERNALS = [
  // Solana Web3.js v2 packages
  '@solana/addresses',
  '@solana/codecs',
  '@solana/rpc',
  '@solana/rpc-types',
  '@solana/rpc-subscriptions',
  '@solana/signers',
  '@solana/functional',
  '@solana/transaction-messages',
  '@solana/transactions',
  '@solana/keys',
  '@solana/accounts',
  
  // Optional dependencies
  '@solana/spl-token',
  '@solana/spl-token-metadata',
  '@solana-program/token-2022',
  'borsh',
  'pino',
  'pino-pretty',
  
  // Node.js built-ins
  'crypto',
  'fs',
  'path',
  'url',
  'stream',
  'buffer',
  'http',
  
  // Other common externals
  'bs58',
];

/**
 * Bundle configurations for different output formats
 */
const configs = {
  // Minimal core bundle (ESM)
  core: {
    entryPoints: ['src/index-optimized.ts'],
    outdir: 'dist/optimized',
    format: 'esm',
    target: ['es2022'],
    bundle: true,
    minify: true,
    sourcemap: true,
    splitting: true,
    treeShaking: true,
    external: EXTERNALS,
    chunkNames: '[name]-[hash]',
    define: {
      'process.env.NODE_ENV': '"production"',
      '__DEV__': 'false',
    },
    banner: {
      js: '// GhostSpeak SDK - Optimized Bundle',
    },
    metafile: true,
  },

  // Full bundle with all features (ESM)
  full: {
    entryPoints: ['src/index.ts'],
    outdir: 'dist/full',
    format: 'esm',
    target: ['es2022'],
    bundle: true,
    minify: true,
    sourcemap: true,
    splitting: true,
    treeShaking: true,
    external: EXTERNALS,
    chunkNames: '[name]-[hash]',
    define: {
      'process.env.NODE_ENV': '"production"',
      '__DEV__': 'false',
    },
    metafile: true,
  },

  // CommonJS bundle for Node.js compatibility
  cjs: {
    entryPoints: ['src/index-optimized.ts'],
    outdir: 'dist/cjs',
    format: 'cjs',
    target: ['node18'],
    bundle: true,
    minify: true,
    sourcemap: true,
    external: EXTERNALS,
    define: {
      'process.env.NODE_ENV': '"production"',
      '__DEV__': 'false',
    },
    metafile: true,
  },

  // Browser-optimized bundle
  browser: {
    entryPoints: ['src/index-optimized.ts'],
    outdir: 'dist/browser',
    format: 'esm',
    target: ['chrome90', 'firefox88', 'safari14'],
    bundle: true,
    minify: true,
    sourcemap: true,
    splitting: true,
    treeShaking: true,
    external: EXTERNALS,
    chunkNames: '[name]-[hash]',
    define: {
      'process.env.NODE_ENV': '"production"',
      '__DEV__': 'false',
      'global': 'globalThis',
    },
    metafile: true,
  },

  // Development bundle (unminified)
  dev: {
    entryPoints: ['src/index.ts'],
    outdir: 'dist/dev',
    format: 'esm',
    target: ['es2022'],
    bundle: true,
    minify: false,
    sourcemap: true,
    splitting: true,
    external: EXTERNALS,
    define: {
      'process.env.NODE_ENV': '"development"',
      '__DEV__': 'true',
    },
    metafile: true,
  },
};

/**
 * Tree-shaking optimization configuration
 */
const treeShakeConfig = {
  // Mark side-effect free modules
  sideEffects: false,
  
  // Aggressive dead code elimination
  deadCodeElimination: true,
  
  // Remove unused exports
  removeUnusedExports: true,
  
  // Optimize imports
  optimizeImports: true,
  
  // Bundle analysis
  analyzeBundle: true,
};

/**
 * Build optimization plugins
 */
const plugins = [
  // Bundle analyzer plugin
  {
    name: 'bundle-analyzer',
    setup(build) {
      build.onEnd(async (result) => {
        if (result.metafile) {
          try {
            const analyzeBundle = await import('esbuild-analyze');
            console.log('\n📊 Bundle Analysis:');
            console.log(await analyzeBundle.default.analyzeMetafile(result.metafile));
          } catch (error) {
            console.log('\n📊 Bundle analysis package not available, skipping...');
          }
        }
      });
    },
  },

  // Size reporter plugin
  {
    name: 'size-reporter',
    setup(build) {
      build.onEnd((result) => {
        if (result.outputFiles) {
          const totalSize = result.outputFiles.reduce((sum, file) => sum + file.contents.length, 0);
          console.log(`\n📦 Bundle size: ${(totalSize / 1024).toFixed(2)} KB`);
          
          result.outputFiles.forEach(file => {
            const size = (file.contents.length / 1024).toFixed(2);
            const filename = path.basename(file.path);
            console.log(`  ${filename}: ${size} KB`);
          });
        }
      });
    },
  },

  // Tree-shaking reporter
  {
    name: 'tree-shake-reporter',
    setup(build) {
      let importCount = 0;
      let exportCount = 0;
      
      build.onResolve({ filter: /.*/ }, (args) => {
        importCount++;
        return null;
      });
      
      build.onEnd(() => {
        console.log(`\n🌳 Tree-shaking stats:`);
        console.log(`  Imports processed: ${importCount}`);
        console.log(`  Exports optimized: ${exportCount}`);
      });
    },
  },
];

/**
 * Build all configurations
 */
async function buildAll() {
  const esbuild = await import('esbuild');
  
  console.log('🚀 Building GhostSpeak SDK with optimizations...\n');
  
  for (const [name, config] of Object.entries(configs)) {
    console.log(`📦 Building ${name} bundle...`);
    
    try {
      // Extract analyze flag if present (not a valid esbuild option)
      const { analyze, ...buildConfig } = config;
      
      const result = await esbuild.default.build({
        ...buildConfig,
        plugins: analyze ? plugins : plugins.slice(1), // Skip analyzer for non-analyzed builds
      });
      
      console.log(`✅ ${name} bundle built successfully`);
      
      // Save metafile for analysis
      if (result.metafile) {
        const fs = await import('fs');
        const metaPath = path.join(config.outdir, 'meta.json');
        fs.default.writeFileSync(metaPath, JSON.stringify(result.metafile, null, 2));
      }
      
    } catch (error) {
      console.error(`❌ Failed to build ${name} bundle:`, error);
      process.exit(1);
    }
    
    console.log('');
  }
  
  console.log('🎉 All bundles built successfully!');
  
  // Generate bundle report
  await generateBundleReport();
}

/**
 * Generate bundle size report
 */
async function generateBundleReport() {
  try {
    const fs = await import('fs');
    
    const report = {
      timestamp: new Date().toISOString(),
      bundles: {},
      recommendations: [],
    };
    
    // Analyze each bundle
    for (const [name, config] of Object.entries(configs)) {
      const distPath = path.join(__dirname, config.outdir);
      
      if (fs.default.existsSync(distPath)) {
        const files = fs.default.readdirSync(distPath, { recursive: true })
          .filter(file => file.endsWith('.js') || file.endsWith('.css'))
          .map(file => typeof file === 'string' ? file : file.name);
        
        let totalSize = 0;
        const fileDetails = [];
        
        files.forEach(file => {
          const filePath = path.join(distPath, file);
          const stats = fs.default.statSync(filePath);
          if (stats.isFile()) {
            const size = stats.size;
            totalSize += size;
            
            fileDetails.push({
              name: file,
              size,
              sizeKB: (size / 1024).toFixed(2),
            });
          }
        });
        
        report.bundles[name] = {
          totalSize,
          totalSizeKB: (totalSize / 1024).toFixed(2),
          files: fileDetails,
        };
        
        // Add recommendations
        if (totalSize > 100 * 1024) { // > 100KB
          report.recommendations.push(`Consider code splitting for ${name} bundle (${(totalSize / 1024).toFixed(2)} KB)`);
        }
      }
    }
    
    // Write report
    const reportPath = path.join(__dirname, 'dist/bundle-report.json');
    fs.default.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('📊 Bundle report generated: dist/bundle-report.json');
    
    // Print summary
    console.log('\n📈 Bundle Summary:');
    Object.entries(report.bundles).forEach(([name, info]) => {
      console.log(`  ${name}: ${info.totalSizeKB} KB`);
    });
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
  } catch (error) {
    console.log('📊 Bundle report generation skipped (optional dependency missing)');
  }
}

// Export configurations
export {
  configs,
  treeShakeConfig,
  plugins,
  buildAll,
  EXTERNALS,
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildAll().catch(console.error);
}