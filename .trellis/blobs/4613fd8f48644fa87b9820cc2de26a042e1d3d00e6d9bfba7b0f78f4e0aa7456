#!/bin/bash

# Execute vault changes after permission is granted
# Usage: ./execute-vault-change.sh <file> <json_patch>

VAULT_PATH="${FILEGRAPH_VAULT:-$HOME/.filegraph}"
FILE_PATH="$1"
JSON_PATCH="$2"

if [ -z "$FILE_PATH" ] || [ -z "$JSON_PATCH" ]; then
    echo "Usage: $0 <file_path> <json_patch>"
    echo "Example: $0 ~/.filegraph/@entities/tasks.data '{\"add\": {...}}'"
    exit 1
fi

FULL_PATH="$FILE_PATH"
if [[ "$FILE_PATH" != /* ]]; then
    FULL_PATH="$VAULT_PATH/$FILE_PATH"
fi

if [ ! -f "$FULL_PATH" ]; then
    echo "Error: File not found: $FULL_PATH"
    exit 1
fi

echo "🔄 Executing change on $FULL_PATH"
echo "📋 Patch: $JSON_PATCH"

# Create backup
BACKUP_PATH="${FULL_PATH}.bak.$(date +%s)"
cp "$FULL_PATH" "$BACKUP_PATH"
echo "💾 Backup created: $BACKUP_PATH"

# Apply the change (simple JSON manipulation with jq)
case "$JSON_PATCH" in
    *"add"*)
        # For adding items to arrays
        if [[ "$FULL_PATH" == *"tasks.data" ]]; then
            # Special handling for tasks.data collection format
            TEMP_FILE=$(mktemp)
            jq ".items += [$JSON_PATCH | .add]" "$FULL_PATH" > "$TEMP_FILE" && mv "$TEMP_FILE" "$FULL_PATH"
        else
            # For array format files
            TEMP_FILE=$(mktemp)
            jq ". += [$JSON_PATCH | .add]" "$FULL_PATH" > "$TEMP_FILE" && mv "$TEMP_FILE" "$FULL_PATH"
        fi
        ;;
    *"update"*)
        # For updating existing items
        TEMP_FILE=$(mktemp)
        jq "$JSON_PATCH" "$FULL_PATH" > "$TEMP_FILE" && mv "$TEMP_FILE" "$FULL_PATH"
        ;;
    *)
        echo "❌ Unsupported patch format"
        exit 1
        ;;
esac

# Validate JSON
if jq '.' "$FULL_PATH" > /dev/null 2>&1; then
    echo "✅ JSON validation passed"
    echo "✅ Change applied successfully"
else
    echo "❌ JSON validation failed - restoring backup"
    mv "$BACKUP_PATH" "$FULL_PATH"
    exit 1
fi

# Show summary
echo "📊 File summary:"
if [[ "$FULL_PATH" == *"tasks.data" ]]; then
    echo "   Total tasks: $(jq '.items | length' "$FULL_PATH")"
    echo "   Todo tasks: $(jq '.items | map(select(.status == "todo")) | length' "$FULL_PATH")"
    echo "   Done tasks: $(jq '.items | map(select(.status == "done")) | length' "$FULL_PATH")"
fi
