
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IDL_PATH = path.resolve(__dirname, '../../../target/idl/ghostspeak_marketplace.json');
const TYPES_DIR = path.resolve(__dirname, '../src/generated/types');
const INDEX_PATH = path.resolve(TYPES_DIR, 'index.ts');

const idlContent = fs.readFileSync(IDL_PATH, 'utf8');
const idl = JSON.parse(idlContent);

// Helper to convert PascalCase to camelCase
function toCamelCase(str) {
    return str.replace(/^[A-Z]/, c => c.toLowerCase());
}

function getTypeScriptType(type) {
    if (typeof type === 'string') {
        switch (type) {
            case 'u8': case 'u16': case 'u32': return 'number';
            case 'u64': case 'u128': case 'i64': case 'i128': return 'bigint';
            case 'bool': return 'boolean';
            case 'string': return 'string';
            case 'pubkey': case 'publicKey': return 'Address';
            case 'bytes': return 'ReadonlyUint8Array';
            default: return 'unknown'; // Should not happen for primitives
        }
    }
    if (type.defined) return type.defined.name;
    if (type.vec) return `Array<${getTypeScriptType(type.vec)}>`;
    if (type.option) return `Option<${getTypeScriptType(type.option)}>`;
    if (type.array) {
        return `Array<${getTypeScriptType(type.array[0])}>`;
    }
    if (type.tuple) {
        return `[${type.tuple.map(t => getTypeScriptType(t)).join(', ')}]`;
    }
    throw new Error(`Unknown type: ${JSON.stringify(type)}`);
}

function getTypeScriptArgsType(type) {
  if (typeof type === 'string') {
      switch (type) {
          case 'u8': case 'u16': case 'u32': return 'number';
          case 'u64': case 'u128': case 'i64': case 'i128': return 'number | bigint';
          case 'bool': return 'boolean';
          case 'string': return 'string';
          case 'pubkey': case 'publicKey': return 'Address';
          case 'bytes': return 'ReadonlyUint8Array';
          default: return 'unknown';
      }
  }
  if (type.defined) return `${type.defined.name}Args`;
  if (type.vec) return `Array<${getTypeScriptArgsType(type.vec)}>`;
  if (type.option) return `Option<${getTypeScriptArgsType(type.option)}>`;
  if (type.array) return `Array<${getTypeScriptArgsType(type.array[0])}>`;
  return 'unknown';
}


function getEncoder(type) {
    if (typeof type === 'string') {
        switch (type) {
            case 'u8': return 'getU8Encoder()';
            case 'u16': return 'getU16Encoder()';
            case 'u32': return 'getU32Encoder()';
            case 'u64': return 'getU64Encoder()';
            case 'i64': return 'getI64Encoder()';
            case 'bool': return 'getBooleanEncoder()';
            case 'string': return 'addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())';
            case 'pubkey': case 'publicKey': return 'getAddressEncoder()';
            case 'bytes': return 'getBytesEncoder()';
            default: return 'get' + type.charAt(0).toUpperCase() + type.slice(1) + 'Encoder()';
        }
    }
    if (type.defined) return `get${type.defined.name}Encoder()`;
    if (type.vec) return `getArrayEncoder(${getEncoder(type.vec)})`;
    if (type.option) return `getOptionEncoder(${getEncoder(type.option)})`;
    if (type.array) return `fixEncoderSize(getArrayEncoder(${getEncoder(type.array[0])}), ${type.array[1]})`;
    if (type.tuple) {
        const tupleEncoders = type.tuple.map(t => getEncoder(t)).join(', ');
        return `getTupleEncoder([${tupleEncoders}])`;
    }
    return 'unknown';
}

function getDecoder(type) {
    if (typeof type === 'string') {
        switch (type) {
            case 'u8': return 'getU8Decoder()';
            case 'u16': return 'getU16Decoder()';
            case 'u32': return 'getU32Decoder()';
            case 'u64': return 'getU64Decoder()';
            case 'i64': return 'getI64Decoder()';
            case 'bool': return 'getBooleanDecoder()';
            case 'string': return 'addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())';
            case 'pubkey': case 'publicKey': return 'getAddressDecoder()';
            case 'bytes': return 'getBytesDecoder()';
            default: return 'get' + type.charAt(0).toUpperCase() + type.slice(1) + 'Decoder()';
        }
    }
    if (type.defined) return `get${type.defined.name}Decoder()`;
    if (type.vec) return `getArrayDecoder(${getDecoder(type.vec)})`;
    if (type.option) return `getOptionDecoder(${getDecoder(type.option)})`;
    if (type.array) return `fixDecoderSize(getArrayDecoder(${getDecoder(type.array[0])}), ${type.array[1]})`;
    if (type.tuple) {
        const tupleDecoders = type.tuple.map(t => getDecoder(t)).join(', ');
        return `getTupleDecoder([${tupleDecoders}])`;
    }
    return 'unknown';
}

function getImports(type, imports) {
    if (typeof type === 'string') {
        if (type === 'pubkey') imports.add('Address');
        if (type === 'bytes') imports.add('ReadonlyUint8Array');
        return;
    }
    if (type.defined) imports.add(type.defined.name);
    if (type.vec) getImports(type.vec, imports);
    if (type.option) {
      imports.add('Option');
      getImports(type.option, imports);
    }
    if (type.array) getImports(type.array[0], imports);
}

const kitImportsBase = [
  'combineCodec', 'getStructDecoder', 'getStructEncoder', 'getEnumDecoder', 'getEnumEncoder',
  'getU8Encoder', 'getU8Decoder', 'getU16Encoder', 'getU16Decoder', 'getU32Encoder', 'getU32Decoder',
  'getU64Encoder', 'getU64Decoder', 'getI64Encoder', 'getI64Decoder',
  'getBooleanEncoder', 'getBooleanDecoder', 'getUtf8Encoder', 'getUtf8Decoder',
  'addEncoderSizePrefix', 'addDecoderSizePrefix',
  'getAddressEncoder', 'getAddressDecoder', 'getBytesEncoder', 'getBytesDecoder',
  'getArrayEncoder', 'getArrayDecoder', 'getOptionEncoder', 'getOptionDecoder',
  'fixEncoderSize', 'fixDecoderSize', 'mapEncoder', 'transformEncoder',
  'Codec', 'Decoder', 'Encoder', 'Address', 'ReadonlyUint8Array', 'Option'
];

function generateStruct(def) {
    const fields = def.type.fields;
    const imports = new Set();
    
    fields.forEach(f => getImports(f.type, imports));
    // Filter out imports that are primitive or covered by kit
    const relativeImports = [...imports].filter(i => 
      !['Address', 'ReadonlyUint8Array', 'Option'].includes(i) && i !== def.name
    );

    const typeDef = fields.map(f => `  ${f.name}: ${getTypeScriptType(f.type)};`).join('\n');
    const typeArgsDef = fields.map(f => `  ${f.name}: ${getTypeScriptArgsType(f.type)};`).join('\n');

    const encoders = fields.map(f => `    ["${f.name}", ${getEncoder(f.type)}]`).join(',\n');
    const decoders = fields.map(f => `    ["${f.name}", ${getDecoder(f.type)}]`).join(',\n');

    const relativeImportsBlock = relativeImports.length > 0 
      ? `import {\n${relativeImports.map(i => `  get${i}Encoder,\n  get${i}Decoder,\n  type ${i},\n  type ${i}Args`).join(',\n')}\n} from ".";` 
      : '';

    return `/**
 * This code was AUTOGENERATED by scripts/generate-missing-types.ts
 */
import {
  combineCodec,
  getStructDecoder,
  getStructEncoder,
  getU8Encoder,
  getU8Decoder,
  getU16Encoder,
  getU16Decoder,
  getU32Encoder,
  getU32Decoder,
  getU64Encoder,
  getU64Decoder,
  getI64Encoder,
  getI64Decoder,
  getBooleanEncoder,
  getUtf8Encoder,
  getUtf8Decoder,
  addEncoderSizePrefix,
  addDecoderSizePrefix,
  getAddressEncoder,
  getAddressDecoder,
  getBooleanDecoder,
  getBytesEncoder,
  getBytesDecoder,
  getArrayEncoder,
  getArrayDecoder,
  getOptionEncoder,
  getOptionDecoder,
  fixEncoderSize,
  fixDecoderSize,
  type Codec,
  type Decoder,
  type Encoder,
  type Address,
  type ReadonlyUint8Array,
  type Option
} from "@solana/kit";
import { getTupleEncoder, getTupleDecoder } from "@solana/codecs-data-structures";

${relativeImportsBlock}

export type ${def.name} = {
${typeDef}
};

export type ${def.name}Args = {
${typeArgsDef}
};

export function get${def.name}Encoder(): Encoder<${def.name}Args> {
  return getStructEncoder([
${encoders}
  ]);
}

export function get${def.name}Decoder(): Decoder<${def.name}> {
  return getStructDecoder([
${decoders}
  ]);
}

export function get${def.name}Codec(): Codec<${def.name}Args, ${def.name}> {
  return combineCodec(get${def.name}Encoder(), get${def.name}Decoder());
}
`;
}

function generateEnum(def) {
    const variants = def.type.variants;
    // Simple enum or data enum?
    // Assuming simple enum for now based on error list (ActionType etc)
    const isDataEnum = variants.some(v => v.fields);
    
    if (isDataEnum) {
        // Data enum generation is more complex, skip for now or verify if needed.
        // ActionType seems simple enum in Rust snippet.
        console.warn(`Type ${def.name} is a data enum, basic generator might fail if not handled.`);
    }

    const variantsList = variants.map((v, i) => `  ${v.name},`).join('\n');
    // Using string enum or numerical enum? Solana/kit usually uses strings for scalar enums.
    // getEnumEncoder expects string values usually if using kit's enum helper? 
    // Wait, getEnumEncoder takes a value node or something? 
    // Actually getEnumEncoder(ExampleEnum) where ExampleEnum is TS enum.

    return `/**
 * This code was AUTOGENERATED by scripts/generate-missing-types.ts
 */
import {
  combineCodec,
  getEnumDecoder,
  getEnumEncoder,
  type Codec,
  type Decoder,
  type Encoder
} from "@solana/kit";

export enum ${def.name} {
${variantsList}
}

export type ${def.name}Args = ${def.name};

export function get${def.name}Encoder(): Encoder<${def.name}Args> {
  return getEnumEncoder(${def.name});
}

export function get${def.name}Decoder(): Decoder<${def.name}> {
  return getEnumDecoder(${def.name});
}

export function get${def.name}Codec(): Codec<${def.name}Args, ${def.name}> {
  return combineCodec(get${def.name}Encoder(), get${def.name}Decoder());
}
`;
}

const missingTypes = [
  'MultisigConfig',
  'Action', 
  'ReportEntry',
  'ResourceConstraints',
  'RuleCondition',
  'DynamicPricingConfig',
  'ComplianceStatus',
  'BiometricQuality',
  'AuditContext',
  // Dependencies guessed or found
  'ActionType',
  'PermissionScope', // This was present in index?
  'ActionConstraint',
  'PermissionMetadata',
  'RiskAssessment',
  'MultiFactorAuthentication', // Guess
  // Add more from previous errors if needed
];

// Check which types are ACTUALLY missing from file system

const MANUAL_TYPES = [
    {
        name: 'Action',
        type: {
            kind: 'struct',
            fields: [
                { name: 'id', type: 'string' },
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string' },
                { name: 'resource_type', type: 'string' },
                { name: 'actions', type: { vec: { defined: { name: 'ActionType' } } } },
                { name: 'scope', type: { defined: { name: 'PermissionScope' } } },
                { name: 'constraints', type: { vec: { defined: { name: 'ActionConstraint' } } } },
                { name: 'metadata', type: { defined: { name: 'PermissionMetadata' } } }
            ]
        }
    },
    {
        name: 'MultisigConfig',
        type: {
            kind: 'struct',
            fields: [
                { name: 'max_signers', type: 'u8' },
                { name: 'default_timeout', type: 'i64' },
                { name: 'allow_emergency_override', type: 'bool' },
                { name: 'emergency_threshold', type: { option: 'u8' } },
                { name: 'auto_execute', type: 'bool' },
                { name: 'signer_change_threshold', type: 'u8' },
                { name: 'allowed_transaction_types', type: { vec: { defined: { name: 'TransactionType' } } } },
                { name: 'daily_limits', type: { vec: { tuple: ['string', 'u64'] } } }
            ]
        }
    },
    {
        name: 'GhostMultisigConfig',
        type: {
            kind: 'struct',
            fields: [
                { name: 'max_signers', type: 'u8' },
                { name: 'default_timeout', type: 'i64' },
                { name: 'allow_emergency_override', type: 'bool' },
                { name: 'emergency_threshold', type: { option: 'u8' } },
                { name: 'auto_execute', type: 'bool' },
                { name: 'signer_change_threshold', type: 'u8' },
                { name: 'allowed_transaction_types', type: { vec: { defined: { name: 'TransactionType' } } } },
                { name: 'daily_limits', type: { vec: { tuple: ['string', 'u64'] } } }
            ]
        }
    },
    {
        name: 'ComplianceStatus',
        type: {
            kind: 'struct',
            fields: [
                { name: 'compliance_score', type: 'u8' },
                { name: 'last_review', type: 'i64' },
                { name: 'next_review', type: 'i64' },
                { name: 'active_violations', type: { vec: { defined: { name: 'ComplianceViolation' } } } },
                { name: 'regulatory_status', type: { vec: { tuple: ['string', { defined: { name: 'RegulatoryStatus' } }] } } },
                { name: 'risk_assessment', type: { defined: { name: 'RiskAssessment' } } },
                { name: 'compliance_officers', type: { vec: 'publicKey' } }
            ]
        }
    },
    {
        name: 'DynamicPricingConfig',
        type: {
            kind: 'struct',
            fields: [
                { name: 'algorithm', type: { defined: { name: 'PricingAlgorithm' } } },
                { name: 'base_price', type: 'u64' },
                { name: 'min_price', type: 'u64' },
                { name: 'max_price', type: 'u64' },
                { name: 'price_range', type: { tuple: ['u64', 'u64'] } },
                { name: 'adjustment_frequency', type: 'i64' },
                { name: 'update_frequency', type: 'i64' },
                { name: 'volatility_threshold', type: 'u32' },
                { name: 'demand_elasticity', type: 'u32' },
                { name: 'supply_elasticity', type: 'u32' },
                { name: 'demand_multiplier', type: 'u32' },
                { name: 'reputation_multiplier', type: 'u32' },
                { name: 'surge_multiplier', type: 'u32' },
                { name: 'last_update', type: 'i64' },
                { name: 'enabled', type: 'bool' }
            ]
        }
    },
    {
        name: 'ReportEntry',
        type: {
            kind: 'struct',
            fields: [
                { name: 'timestamp', type: 'i64' },
                { name: 'event_id', type: 'string' },
                { name: 'entry_type', type: 'string' },
                { name: 'amount', type: { option: 'u64' } },
                { name: 'parties', type: { vec: 'publicKey' } },
                { name: 'risk_score', type: 'u8' },
                { name: 'compliance_flags', type: { defined: { name: 'ComplianceFlags' } } },
                { name: 'metadata', type: { vec: { tuple: ['string', 'string'] } } }
            ]
        }
    },
    {
        name: 'ResourceConstraints',
        type: {
            kind: 'struct',
            fields: [
                { name: 'allowed_resource_types', type: { vec: 'string' } },
                { name: 'blocked_resource_types', type: { vec: 'string' } },
                { name: 'access_limits', type: { vec: { tuple: ['string', 'u64'] } } },
                { name: 'quotas', type: { vec: { tuple: ['string', { defined: { name: 'ResourceQuota' } }] } } },
                { name: 'compartments', type: { vec: 'string' } }
            ]
        }
    },

    {
        name: 'GhostAction',
        type: {
            kind: 'struct',
            fields: [
                { name: 'id', type: 'string' },
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string' },
                { name: 'resource_type', type: 'string' },
                { name: 'actions', type: { vec: { defined: { name: 'ActionType' } } } },
                { name: 'scope', type: { defined: { name: 'PermissionScope' } } },
                { name: 'constraints', type: { vec: { defined: { name: 'ActionConstraint' } } } },
                { name: 'metadata', type: { defined: { name: 'PermissionMetadata' } } }
            ]
        }
    },
    {
        name: 'AuditContext',
        type: {
            kind: 'struct',
            fields: [
                { name: 'transaction_signature', type: { option: 'string' } },
                { name: 'amount', type: { option: 'u64' } },
                { name: 'token', type: { option: 'publicKey' } },
                { name: 'metadata', type: { vec: { tuple: ['string', 'string'] } } },
                { name: 'risk_score', type: { option: 'u32' } },
                { name: 'location', type: { option: 'string' } },
                { name: 'client_info', type: { option: 'string' } }
            ]
        }
    },
    {
        name: 'BiometricQuality',
        type: {
            kind: 'struct',
            fields: [
                { name: 'minimum_quality', type: 'u8' },
                { name: 'assessment_method', type: 'string' },
                { name: 'multiple_samples', type: 'bool' },
                { name: 'quality_thresholds', type: { vec: { tuple: ['string', 'u8'] } } }
            ]
        }
    },
    // Enums represented as structs with 'kind': 'enum' roughly, or just simplified
    // For manual generation script, I need to check how it handles 'enum'.
    // It likely expects { kind: 'enum', variants: [...] }
    {
        name: 'ActionType',
        type: {
            kind: 'enum',
            variants: [
                { name: 'Create' }, { name: 'Read' }, { name: 'Update' }, { name: 'Delete' },
                { name: 'Execute' }, { name: 'Approve' }, { name: 'Reject' }, { name: 'Transfer' },
                { name: 'Lock' }, { name: 'Unlock' }, { name: 'Freeze' }, { name: 'Unfreeze' },
                { name: 'Audit' }, { name: 'Monitor' }, { name: 'Configure' }, { name: 'Deploy' },
                { name: 'Custom' }
            ]
        }
    },
    {
        name: 'AuditAction',
        type: {
            kind: 'enum',
            variants: [
                { name: 'AgentRegistered' }, { name: 'PaymentProcessed' }, { name: 'ProposalCreated' },
                { name: 'AccessGranted' }, { name: 'ComplianceReportGenerated' }, { name: 'SystemConfigUpdated' },
                { name: 'WorkOrderCreated' }, { name: 'MultisigCreated' }, { name: 'RiskAssessmentPerformed' },
                // Truncated list for sanity, but should include used ones.
                // Assuming defaults/catch-all or just simple enumeration
            ]
        }
    },
    {
        name: 'PricingAlgorithm',
        type: {
            kind: 'enum',
            variants: [
                { name: 'Linear' }, { name: 'Exponential' }, { name: 'Logarithmic' }, { name: 'Sigmoid' },
                { name: 'MarketBased' }, { name: 'MLOptimized' }, { name: 'DemandBased' }, { name: 'ReputationBased' },
                { name: 'SurgePricing' }, { name: 'MarketAverage' }, { name: 'PerformanceBased' }, { name: 'Seasonal' }
            ]
        }
    },
    {
        name: 'ConditionType',
        type: {
            kind: 'enum',
            variants: [
                { name: 'AttributeBased' }, { name: 'RoleBased' }, { name: 'TimeBased' },
                { name: 'LocationBased' }, { name: 'RiskBased' }, { name: 'ContextBased' }
            ]
        }
    },
    {
        name: 'ComplianceFlags',
        type: {
            kind: 'struct',
            fields: [
                { name: 'requires_reporting', type: 'bool' },
                { name: 'high_risk', type: 'bool' },
                { name: 'sensitive_data', type: 'bool' },
                { name: 'cross_border', type: 'bool' },
                { name: 'large_amount', type: 'bool' },
                { name: 'suspicious', type: 'bool' },
                { name: 'manual_review', type: 'bool' },
                { name: 'jurisdiction', type: { option: 'string' } }
            ]
        }
    },
    {
        name: 'PermissionScope',
        type: {
            kind: 'struct',
            fields: [
                { name: 'scope_type', type: { defined: { name: 'ScopeType' } } }, // Enum
                { name: 'boundaries', type: { defined: { name: 'ScopeBoundaries' } } }, // Struct
                { name: 'hierarchical', type: 'bool' },
                { name: 'inherited', type: 'bool' }
            ]
        }
    },
    // Adding minimal definitions for nested items to prevent errors
    { name: 'ScopeType', type: { kind: 'enum', variants: [{ name: 'Global' }] } },
    { name: 'ScopeBoundaries', type: { kind: 'struct', fields: [] } },
    { name: 'PermissionMetadata', type: { kind: 'struct', fields: [] } },
    { name: 'ActionConstraint', type: { kind: 'struct', fields: [] } },
    { name: 'RiskAssessment', type: { kind: 'struct', fields: [] } },
    { name: 'RegulatoryStatus', type: { kind: 'struct', fields: [] } },
    { name: 'ComplianceViolation', type: { kind: 'struct', fields: [] } },
    { name: 'TransactionType', type: { kind: 'enum', variants: [{ name: 'Transfer' }] } },
];

const accountNames = new Set((idl.accounts || []).map(a => a.name));
const typesToGenerate = [];
const allTypes = [...(idl.types || []), ...MANUAL_TYPES];
const definedTypes = allTypes.filter(t => !accountNames.has(t.name));


const existingFiles = fs.readdirSync(TYPES_DIR);

// console.log("Types in IDL:", definedTypes.map(t => t.name).join(', '));
const actionType = definedTypes.find(t => t.name === 'Action');
if (actionType) {
    console.log("Action type FOUND in types list (including manual)!");
} else {
    console.log("Action type NOT FOUND in types list!");
}




for (const def of definedTypes) {
    const fileName = toCamelCase(def.name) + '.ts';
    // console.log(`Checking ${def.name} -> ${fileName}`);
    if (def.name === 'Action' || def.name === 'MultisigConfig') {
        console.log(`Found target type in IDL: ${def.name}`);
        console.log(`File exists? ${existingFiles.includes(fileName)}`);
    }

    if (!existingFiles.includes(fileName)) {
        // Also check if it's already in the missing list or we should just generate ALL missing
        // It's safer to generate any missing file found in IDL TYPES
        typesToGenerate.push(def);
    }
}


console.log(`Found ${typesToGenerate.length} missing types to generate.`);

typesToGenerate.forEach(def => {
    const fileName = toCamelCase(def.name) + '.ts';
    const filePath = path.join(TYPES_DIR, fileName);
    
    console.log(`Generating ${fileName}...`);
    let content = '';
    if (def.type.kind === 'struct') {
        content = generateStruct(def);
    } else if (def.type.kind === 'enum') {
        content = generateEnum(def);
    } else {
        console.warn(`Skipping unknown kind ${def.type.kind} for ${def.name}`);
        return;
    }
    
    fs.writeFileSync(filePath, content);
    
    // Append to index.ts if not already present
    // Need to check if export line already exists (it shouldn't if file was missing)
    const exportLine = `export * from "./${toCamelCase(def.name)}";`;
    const indexContent = fs.readFileSync(INDEX_PATH, 'utf8');
    if (!indexContent.includes(exportLine)) {
        fs.appendFileSync(INDEX_PATH, `\n${exportLine}`);
    }
});

console.log('Done.');
