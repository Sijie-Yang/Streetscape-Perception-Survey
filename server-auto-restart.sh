#!/bin/bash

# Backend Server Auto-Restart Script
# This script automatically restarts the backend server if it crashes

echo "🚀 Starting backend server with auto-restart..."
echo "Press Ctrl+C to stop"
echo ""

# Trap Ctrl+C to gracefully exit
trap 'echo ""; echo "👋 Stopping server..."; exit 0' INT

# Infinite loop to auto-restart
while true; do
  echo "▶️  Starting server at $(date)"
  node server.js
  
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Server exited normally (code $EXIT_CODE)"
    echo "🔄 Restarting in 2 seconds..."
    sleep 2
  else
    echo "❌ Server crashed with exit code $EXIT_CODE"
    echo "🔄 Auto-restarting in 3 seconds..."
    sleep 3
  fi
  
  echo ""
done

