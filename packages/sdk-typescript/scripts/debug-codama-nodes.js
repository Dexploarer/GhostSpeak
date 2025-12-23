
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IDL_PATH = path.resolve(__dirname, '../../../target/idl/ghostspeak_marketplace.json');
const idlContent = fs.readFileSync(IDL_PATH, 'utf8');
const idl = JSON.parse(idlContent);

const rootNode = rootNodeFromAnchor(idl);

console.log('--- Debugging Codama Nodes ---');

function searchNode(node, name) {
    if (node.name === name) return node;
    if (node.kind === 'program' || node.kind === 'root') {
        // definedTypes are standard
        if (node.definedTypes) {
            const found = node.definedTypes.find(t => t.name === name);
            if (found) return found;
        }
        // accounts
        if (node.accounts) {
             const found = node.accounts.find(t => t.name === name);
             if (found) return found;
        }
    }
    return null;
}


if (rootNode.program.definedTypes) {
    console.log('Defined Types found:', rootNode.program.definedTypes.length);
    rootNode.program.definedTypes.forEach(t => console.log(`- ${t.name}`));
} else {
    console.log('No defined types found in program node');
}

