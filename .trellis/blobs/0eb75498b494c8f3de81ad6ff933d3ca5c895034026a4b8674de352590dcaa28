#!/bin/bash
# reset-onboarding.sh
# Resets the Filegraph app state for testing onboarding flow
#
# Usage: ./scripts/reset-onboarding.sh [--hard]
#   --hard: Also removes the backup folder

set -e

VAULT_PATH="$HOME/.filegraph"
BACKUP_PATH="$HOME/.filegraph.backup"
APP_DATA_PATH="$HOME/Library/Application Support/com.filegraph.app"
WEBVIEW_CACHE="$HOME/Library/WebKit/com.filegraph.app"

echo "🧹 Filegraph Onboarding Reset"
echo "=============================="

# Kill any process on port 1997 (Vite dev server)
if lsof -ti:1997 > /dev/null 2>&1; then
    kill -9 $(lsof -ti:1997) 2>/dev/null
    echo "   ✓ Killed process on port 1997"
else
    echo "   ℹ Port 1997 not in use"
fi

# Handle --hard flag
if [[ "$1" == "--hard" ]]; then
    echo "⚠️  Hard reset: removing backup folder too"
    if [[ -d "$BACKUP_PATH" ]]; then
        rm -rf "$BACKUP_PATH"
        echo "   ✓ Removed $BACKUP_PATH"
    fi
fi

# Backup current vault if it exists
if [[ -d "$VAULT_PATH" ]]; then
    # Remove old backup if exists
    if [[ -d "$BACKUP_PATH" ]]; then
        rm -rf "$BACKUP_PATH"
        echo "   ✓ Removed old backup"
    fi

    mv "$VAULT_PATH" "$BACKUP_PATH"
    echo "   ✓ Backed up vault to $BACKUP_PATH"
else
    echo "   ℹ No vault found at $VAULT_PATH"
fi

# Clear app data (localStorage persisted state)
if [[ -d "$APP_DATA_PATH" ]]; then
    rm -rf "$APP_DATA_PATH"
    echo "   ✓ Cleared app data"
else
    echo "   ℹ No app data found"
fi

# Clear WebKit cache (optional, helps with stale state)
if [[ -d "$WEBVIEW_CACHE" ]]; then
    rm -rf "$WEBVIEW_CACHE"
    echo "   ✓ Cleared WebKit cache"
fi

# Force Tauri rebuild to pick up new demo files
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LIB_RS="$PROJECT_ROOT/src-tauri/src/lib.rs"

# Refresh demo-files in Tauri target (critical for dev mode)
DEMO_CACHE="$PROJECT_ROOT/src-tauri/target/debug/demo-files"
DEMO_SOURCE="$PROJECT_ROOT/src/data/demo-files"
if [[ -d "$DEMO_CACHE" ]]; then
    rm -rf "$DEMO_CACHE"
fi
if [[ -d "$DEMO_SOURCE" ]]; then
    cp -r "$DEMO_SOURCE" "$DEMO_CACHE"
    echo "   ✓ Refreshed demo-files cache"
fi

if [[ -f "$LIB_RS" ]]; then
    touch "$LIB_RS"
    echo "   ✓ Touched lib.rs to force Tauri rebuild"
fi

echo ""
echo "✅ Reset complete!"
echo ""
echo "Next steps:"
echo "  1. Restart the Filegraph app (or run: pnpm tauri dev)"
echo "  2. You should see the onboarding flow"
echo ""
echo "To restore your backup:"
echo "  mv ~/.filegraph.backup ~/.filegraph"
