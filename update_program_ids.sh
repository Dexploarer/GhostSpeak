#!/bin/bash

# Script to update all program ID references from old to new deployed ID

OLD_ID="4nusKGxuNwK7XggWQHCMEE1Ht7taWrSJMhhNfTqswVFP"
NEW_ID="367WUUpQTxXYUZqFyo9rDpgfJtH7mfGxX9twahdUmaEK"

echo "Updating program ID references from $OLD_ID to $NEW_ID..."

# Find all files (excluding node_modules and .git) and replace the old ID
find /Users/michelleeidschun/ghostspeak-1 -type f \
  \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" -o -name "*.tsx" -o -name "*.jsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/dist/*" \
  -not -path "*/target/*" \
  -exec sed -i '' "s/$OLD_ID/$NEW_ID/g" {} \;

echo "Program ID update complete!"
echo "Updated from: $OLD_ID"
echo "Updated to:   $NEW_ID"