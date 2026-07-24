#!/bin/sh
# Auto-initialize / migrate the SQLite database on every start
echo "🔧 Syncing database schema..."
node /app/node_modules/prisma/build/index.js db push --skip-generate 2>&1
echo "✅ Database ready"

# Start the Next.js server
exec node server.js
