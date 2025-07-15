#!/bin/bash

echo "🧪 Testing CLI escrow creation with funded wallet..."

echo "Testing escrow creation with automated inputs..."

# Test escrow creation
{
  echo "1.0"
  echo "5mMhsW6dP6RCXv73CdBtzfAV9CJkXKYv3SqPDiccf5aK"
  echo "Test escrow payment for verification"
} | timeout 60 npx @ghostspeak/cli@latest escrow create

echo "Exit code: $?"