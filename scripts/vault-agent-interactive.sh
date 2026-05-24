#!/bin/bash

# Filegraph Vault Agent - Interactive version with permission prompts
# Usage: ./vault-agent-interactive.sh "your natural language query"

# Use demo files by default (within workspace) to avoid Gemini CLI access restrictions
SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VAULT_PATH="${FILEGRAPH_VAULT:-$PROJECT_ROOT/src/data/demo-files}"
PROMPT_FILE="$PROJECT_ROOT/prompts/vault-agent.md"

if [ ! -d "$VAULT_PATH" ]; then
    echo "Error: Vault not found at $VAULT_PATH"
    echo "Set FILEGRAPH_VAULT environment variable or using default demo files"
    exit 1
fi

if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: Prompt file not found at $PROMPT_FILE"
    exit 1
fi

# Read the system prompt
SYSTEM_PROMPT=$(cat "$PROMPT_FILE")

# Interactive prompt with permission system
INTERACTIVE_PROMPT="$SYSTEM_PROMPT

## Interactive File Operations

When you need to modify files, follow this workflow:

1. **Propose Changes**: Show exactly what you want to change
2. **Ask Permission**: Use the format: 📝 **PERMISSION NEEDED**: [brief description]
3. **Wait for Confirmation**: User will respond with 'yes', 'no', or 'details'
4. **Execute**: Only proceed after explicit 'yes' confirmation

## File Modification Format

When proposing changes, use this format:

\`\`\`diff
--- a:/$VAULT_PATH/@entities/tasks.data
+++ b:/$VAULT_PATH/@entities/tasks.data
@@ -122,6 +122,16 @@
     }
+  , {
+    \"@context\": \"https://filegraph.dev/context.jsonld\",
+    \"@id\": \"fg:task:new-task:001\",
+    \"@type\": [\"Entity\", \"Task\"],
+    \"id\": \"task:new-task:001\",
+    \"slug\": \"new-task\",
+    \"name\": \"New Task\",
+    \"status\": \"todo\",
+    \"created\": \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
+    \"modified\": \"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
+  }
 ]
 \`\`\`

## Response Templates

**For read operations**: Provide the answer directly

**For write operations**:
1. Show the proposed changes (diff format)
2. End with: 📝 **PERMISSION NEEDED**: Add new task 'New Task' to tasks.data
3. Wait for user response

## Safety Rules

- NEVER modify files without explicit permission
- Always show diff format for changes
- Include JSON validation in your proposal
- Backup files automatically before changes

Current vault location: $VAULT_PATH

Available entity files:
$(find "$VAULT_PATH" -name "*.data" -type f | sort | sed 's|.*/||' | sed 's/^/- /')

Your task: $1

Please analyze the request and either provide the answer directly, or propose changes with a permission request."

# Call Gemini CLI
echo "$INTERACTIVE_PROMPT" | gemini
