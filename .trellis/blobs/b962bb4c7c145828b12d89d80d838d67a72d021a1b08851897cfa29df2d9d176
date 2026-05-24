#!/bin/bash

# Filegraph Vault Agent - Text-based AI assistant
# Usage: ./vault-agent.sh "your natural language query"

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

# Build the full prompt
FULL_PROMPT="$SYSTEM_PROMPT

Current vault location: $VAULT_PATH

Available entity files:
$(find "$VAULT_PATH" -name "*.data" -type f | sort | sed 's|.*/||' | sed 's/^/- /')

Your task: $1

Please read the relevant files and provide your response. If you need to modify files, show the exact changes you would make."

# Call Gemini CLI
echo "$FULL_PROMPT" | gemini
