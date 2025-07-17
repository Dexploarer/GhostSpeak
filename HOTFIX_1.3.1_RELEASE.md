# Hotfix Release - v1.3.1 (SDK) / v1.5.1 (CLI)

## Issue Fixed
- **Error**: "The number NaN cannot be converted to a BigInt because it is not an integer"
- **Root Cause**: The `agentType` parameter was not being properly validated before being encoded

## Changes Made

### @ghostspeak/sdk v1.3.1
1. Added validation in `AgentInstructions.register()` to ensure `agentType` is a valid number
2. Added validation in the instruction encoder to throw a clear error if `agentType` is invalid
3. Added debug logging to help diagnose registration issues

### @ghostspeak/cli v1.5.1
1. Updated dependency to use @ghostspeak/sdk v1.3.1
2. No other changes required

## Files Modified
- `/packages/sdk-typescript/src/client/instructions/AgentInstructions.ts`
  - Added validation for `agentType` parameter
  - Added debug logging
  
- `/packages/sdk-typescript/src/generated/instructions/registerAgent.ts`
  - Added validation in the encoder to catch invalid values early

## Testing
The fix ensures that:
1. If `agentType` is NaN or invalid, it defaults to 1
2. The encoder validates the value and throws a clear error message
3. Debug logs help identify any remaining issues

## How to Update
```bash
# Update global CLI
npm update -g @ghostspeak/cli

# Or reinstall
npm install -g @ghostspeak/cli@latest

# For SDK users
npm update @ghostspeak/sdk
```

## Verification
After updating, agent registration should work correctly:
```bash
npx ghostspeak agent register
```

---
Published: January 17, 2025
By: dexploarer