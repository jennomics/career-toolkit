#!/bin/bash
# Watches for remote changes and auto-updates the local app.
# Run this once alongside `npm run dev` — it handles the rest.

BRANCH=$(git rev-parse --abbrev-ref HEAD)
REMOTE="origin"

echo "Watching $REMOTE/$BRANCH for changes..."
echo "Press Ctrl+C to stop."
echo ""

while true; do
  # Fetch latest from remote (quietly)
  git fetch $REMOTE $BRANCH --quiet 2>/dev/null

  # Check if remote is ahead of local
  LOCAL=$(git rev-parse HEAD)
  REMOTE_HEAD=$(git rev-parse $REMOTE/$BRANCH 2>/dev/null)

  if [ "$LOCAL" != "$REMOTE_HEAD" ] && [ -n "$REMOTE_HEAD" ]; then
    echo ""
    echo "$(date '+%H:%M:%S') — New changes detected. Updating..."

    # Pull latest
    git pull $REMOTE $BRANCH --quiet

    # Run migrations if there are new ones
    if git diff --name-only $LOCAL $REMOTE_HEAD | grep -q "prisma/migrations"; then
      echo "  Running database migrations..."
      npx prisma migrate dev --skip-generate 2>/dev/null
    fi

    # Regenerate Prisma client if schema changed
    if git diff --name-only $LOCAL $REMOTE_HEAD | grep -q "prisma/schema.prisma"; then
      echo "  Regenerating Prisma client..."
      npx prisma generate 2>/dev/null
    fi

    # Install new dependencies if package.json changed
    if git diff --name-only $LOCAL $REMOTE_HEAD | grep -q "package.json"; then
      echo "  Installing new dependencies..."
      npm install --quiet 2>/dev/null
    fi

    echo "  Done. Next.js dev server will auto-reload."
    echo ""
  fi

  # Check every 30 seconds
  sleep 30
done
