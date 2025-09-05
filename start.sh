#!/bin/bash
# Production start script that runs the server in development mode
# This allows Vite to work properly in production as requested

echo "Starting EventConnect server in production..."
NODE_ENV=development tsx server/index.ts