#!/usr/bin/env node
/**
 * Bulk fix Convex client initialization in all API routes
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const getAllFiles = (dir, files = []) => {
  const items = readdirSync(dir);
  for (const item of items) {
    const path = join(dir, item);
    if (statSync(path).isDirectory()) {
      getAllFiles(path, files);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      files.push(path);
    }
  }
  return files;
};

const files = getAllFiles('app/api');
let fixedCount = 0;

for (const file of files) {
  try {
    let content = readFileSync(file, 'utf-8');

    // Skip if already using getConvexClient
    if (content.includes('getConvexClient')) {
      continue;
    }

    // Skip if doesn't use ConvexHttpClient
    if (!content.includes('new ConvexHttpClient')) {
      continue;
    }

    console.log(`Fixing: ${file}`);
    let modified = false;

    // Remove ConvexHttpClient import
    content = content.replace(/import { ConvexHttpClient } from 'convex\/browser'\n?/g, '');

    // Remove module-level instantiation
    content = content.replace(/const convex = new ConvexHttpClient\(process\.env\.NEXT_PUBLIC_CONVEX_URL!?\)\n?/g, '');

    // Add getConvexClient import after other imports
    const lines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^import .+ from .+$/)) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex >= 0 && !content.includes("from '@/lib/convex-client'")) {
      lines.splice(lastImportIndex + 1, 0, "import { getConvexClient } from '@/lib/convex-client'");
      content = lines.join('\n');
      modified = true;
    }

    // Replace convex.query/mutation/action with getConvexClient().
    content = content.replace(/(\s+)convex\.(query|mutation|action)/g, '$1getConvexClient().$2');

    // Clean up excessive newlines
    content = content.replace(/\n\n\n+/g, '\n\n');

    writeFileSync(file, content, 'utf-8');
    console.log(`✅ Fixed: ${file}`);
    fixedCount++;

  } catch (error) {
    console.error(`❌ Error in ${file}:`, error.message);
  }
}

console.log(`\n📊 Fixed ${fixedCount} files`);
