#!/bin/bash
set -e

SERVER="ubuntu@<your-oracle-server-ip>"
REMOTE_DIR="/home/ubuntu/life-os"

echo "→ Building..."
npm run build

echo "→ Syncing .next to server..."
ssh $SERVER "rm -rf $REMOTE_DIR/.next"
rsync -az --delete .next $SERVER:$REMOTE_DIR/

echo "→ Syncing ecosystem config..."
rsync -az ecosystem.config.js $SERVER:$REMOTE_DIR/

echo "→ Restarting app..."
ssh $SERVER "cd $REMOTE_DIR && pm2 startOrRestart ecosystem.config.js --env production && pm2 save"

echo "✓ Deploy done. Checking status..."
ssh $SERVER "pm2 status"
