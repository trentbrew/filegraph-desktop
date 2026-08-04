# Filegraph — task runner
# https://github.com/casey/just

# Run the Tauri desktop app (default)
default: dev

# Show available recipes
list:
    @just --list

# Install JS dependencies (pnpm enforced)
install:
    pnpm install

# Run the Tauri desktop app with hot reload (auto-picks a free Vite port)
dev:
    pnpm dev:tauri

# Alias for dev
run: dev

# Frontend dev server only (no Tauri shell)
web:
    pnpm dev

# Build the desktop app for distribution
build:
    pnpm tauri build

# Pass-through to the Tauri CLI (e.g. `just tauri info`)
tauri *args:
    pnpm tauri {{ args }}

# Typecheck
typecheck:
    pnpm typecheck

# Run tests
test:
    pnpm test

# Reset onboarding state — demo files re-copy on next launch
reset:
    ./scripts/reset-onboarding.sh

# Reset onboarding and remove the vault backup folder
reset-hard:
    ./scripts/reset-onboarding.sh --hard

# Validate demo vault entity references
data-validate:
    pnpm data:validate
