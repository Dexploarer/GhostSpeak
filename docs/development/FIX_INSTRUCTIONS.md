# Fix Instructions for GhostSpeak CLI

## The Issue
You're experiencing the "NaN cannot be converted to BigInt" error because the CLI was not properly calling the SDK's agent registration method.

## Solution

### Option 1: Update Global Installation (Recommended)
```bash
# Uninstall the old version
npm uninstall -g @ghostspeak/cli

# Install the latest version
npm install -g @ghostspeak/cli@latest

# Verify the version (should be 1.4.3 or higher)
gs --version
```

### Option 2: Use npx (Immediate)
```bash
# Use npx to run the latest version directly
npx @ghostspeak/cli@latest agent register
```

### Option 3: Force Cache Clear
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm install -g @ghostspeak/cli@latest
```

## What Was Fixed

### v1.4.3 - Agent Registration Complete Fix
- **Critical Fix**: Agent registration now properly calls SDK with all required parameters
- The SDK's `agent.register()` requires: signer, agentAddress, userRegistryAddress, and params
- CLI now properly generates PDAs before calling the SDK method
- Fixed the "NaN cannot be converted to BigInt" error completely

### v1.4.2 - Escrow PDA Fix
- Fixed PDA generation for escrow creation
- Properly converts wallet address to bytes for seed generation

### v1.4.1 - Initial Agent Registration Attempt
- Changed from using non-existent `pricePerTask` field
- Updated to use correct parameters: `agentType`, `metadataUri`, `agentId`
- This was incomplete - the full fix came in v1.4.3

## Verify The Fix Works

After updating, test with:
```bash
# Check version
gs --version
# Should show 1.4.3

# Try registering an agent
gs agent register

# Try creating an escrow
gs escrow create
```

## Important Note
The global `gs` command might be cached. If you still see errors after updating:
1. Close and reopen your terminal
2. Run `which gs` to see where it's installed
3. Make sure it's using the latest version

## Alternative: Use Local Development Version
If you want to test the fixes immediately without waiting for npm:
```bash
# From the ghostspeak-1 directory
cd packages/cli
npm link

# Now gs will use your local version
gs agent register
```