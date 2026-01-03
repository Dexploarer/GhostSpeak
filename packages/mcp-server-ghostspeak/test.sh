#!/bin/bash

# Test MCP Server Startup
echo "🧪 Testing GhostSpeak MCP Server..."
echo ""

# Set environment
export NEXT_PUBLIC_CONVEX_URL=https://lovely-cobra-639.convex.cloud

# Start server in background
bun run dev > /tmp/mcp-test.log 2>&1 &
PID=$!

# Wait a moment for startup
sleep 2

# Check if running
if ps -p $PID > /dev/null; then
  echo "✅ Server started successfully (PID: $PID)"
  echo ""
  echo "📋 Server logs:"
  cat /tmp/mcp-test.log
  echo ""

  # Kill server
  kill $PID
  echo "🛑 Server stopped"
else
  echo "❌ Server failed to start"
  echo ""
  echo "📋 Error logs:"
  cat /tmp/mcp-test.log
  exit 1
fi
