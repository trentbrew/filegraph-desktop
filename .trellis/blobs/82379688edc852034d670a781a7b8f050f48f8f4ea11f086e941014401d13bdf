#!/bin/bash

# Filegraph Vault Agent - Text-based AI assistant with write access
# Usage: ./vault-agent-write.sh "your natural language query"

VAULT_PATH="${FILEGRAPH_VAULT:-$HOME/.filegraph}"
PROMPT_FILE="$(dirname "$0")/../prompts/vault-agent.md"

if [ ! -d "$VAULT_PATH" ]; then
    echo "Error: Vault not found at $VAULT_PATH"
    echo "Set FILEGRAPH_VAULT environment variable or ensure ~/.filegraph exists"
    exit 1
fi

if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: Prompt file not found at $PROMPT_FILE"
    exit 1
fi

# Read the system prompt
SYSTEM_PROMPT=$(cat "$PROMPT_FILE")

# Add write instructions to the prompt
WRITE_PROMPT="$SYSTEM_PROMPT

## File Operations

You can read and write files using these commands:
- Read: \`cat <filepath>\`
- Write: \`echo '<json>' > <filepath>\`
- Validate: \`jq '.' <filepath> > /dev/null\`

## Important Rules for Writing

1. Always validate JSON after writing: \`jq '.' <file> > /dev/null\`
2. Backup files before modifying: \`cp <file> <file>.bak\`
3. Use proper JSON escaping for quotes and newlines
4. Update the 'modified' timestamp: \`date -u +%Y-%m-%dT%H:%M:%SZ\`

## Writing Files

When you need to modify a file, show the exact shell commands to run.
Example:
\`\`\`bash
# Backup original
cp ~/.filegraph/@entities/tasks.data ~/.filegraph/@entities/tasks.data.bak

# Read current content
CURRENT=\$(cat ~/.filegraph/@entities/tasks.data)

# Remove closing bracket and add new entity
NEW_CONTENT=\"\${CURRENT%]}}, {
  \\\"@context\\\": \\\"https://filegraph.dev/context.jsonld\\\",
  \\\"@id\\\": \\\"fg:task:new-task:001\\\",
  \\\"@type\\\": [\\\"Entity\\\", \\\"Task\\\"],
  \\\"id\\\": \\\"task:new-task:001\\\",
  \\\"slug\\\": \\\"new-task\\\",
  \\\"name\\\": \\\"New Task\\\",
  \\\"status\\\": \\\"todo\\\",
  \\\"created\\\": \\\"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\\\",
  \\\"modified\\\": \\\"\$(date -u +%Y-%m-%dT%H:%M:%SZ)\\\"
}]\"

# Write back
echo "\$NEW_CONTENT" > ~/.filegraph/@entities/tasks.data

# Validate
jq '.' ~/.filegraph/@entities/tasks.data > /dev/null && echo "✅ Valid JSON" || echo "❌ Invalid JSON"
\`\`\`

Current vault location: $VAULT_PATH

Available entity files:
$(find "$VAULT_PATH" -name "*.data" -type f | sort | sed 's|.*/||' | sed 's/^/- /')

Your task: $1

Please read the relevant files and provide the exact shell commands needed to accomplish this task. Show the commands in a code block that can be copied and pasted."

# Call Gemini CLI
echo "$WRITE_PROMPT" | gemini
