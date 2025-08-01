#!/usr/bin/env node

import crypto from 'crypto';

function calculateAnchorDiscriminator(namespace, instructionName) {
  const preimage = `${namespace}:${instructionName}`;
  const hash = crypto.createHash('sha256').update(preimage).digest();
  return Array.from(hash.slice(0, 8));
}

// Calculate expected discriminator for register_agent
const expectedDiscriminator = calculateAnchorDiscriminator('global', 'register_agent');
console.log('Expected discriminator (from Anchor):', expectedDiscriminator);
console.log('Expected discriminator (hex):', expectedDiscriminator.map(b => b.toString(16).padStart(2, '0')).join(' '));

// SDK discriminator from the generated code
const sdkDiscriminator = [135, 157, 66, 195, 2, 113, 175, 30];
console.log('SDK discriminator:', sdkDiscriminator);
console.log('SDK discriminator (hex):', sdkDiscriminator.map(b => b.toString(16).padStart(2, '0')).join(' '));

// Compare
const match = expectedDiscriminator.every((byte, index) => byte === sdkDiscriminator[index]);
console.log('Discriminators match:', match);

if (!match) {
  console.log('❌ DISCRIMINATOR MISMATCH! This is likely the cause of the transaction simulation failure.');
} else {
  console.log('✅ Discriminators match. Issue is elsewhere.');
}