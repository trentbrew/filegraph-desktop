# Agent Feature

AI assistant system for Filegraph. Provides text chat, voice (Live Mode), tool execution, memory, and rich response rendering.

---

## Directory Structure

```
agent/
├── components/         # All UI components
│   ├── AgentSidebar.tsx        # Right-panel assistant (toggle via ⌘/)
│   ├── AgentApp.tsx            # Full-screen agent with channels/threads
│   ├── ChatInput.tsx           # Message input with attachments + mentions
│   ├── MessageBubble.tsx       # Single message renderer
│   ├── MessageContent.tsx      # Smart renderer: Trellis JSON vs Markdown
│   ├── LiveMode.tsx            # Voice conversation UI (orb + transcript)
│   ├── AudioVisualizer.tsx     # Animated orb for Live Mode
│   └── ...
├── hooks/
│   ├── useChatStore.ts         # Chat messages, personality config, model selection
│   ├── useModelProvider.ts     # Streaming chat for AgentSidebar
│   ├── useAgentAppModelProvider.ts  # Streaming chat for AgentApp (channels)
│   ├── useAttachments.ts       # File attachment state
│   └── useFileContext.ts       # Active file context injection
├── live/               # Gemini Live API (real-time voice)
│   ├── audioEngine.ts          # Mic capture + PCM playback (AudioWorklet)
│   ├── liveSession.ts          # WebSocket session wrapper (@google/genai)
│   ├── toolBridge.ts           # Converts AGENT_TOOLS → Gemini function declarations
│   ├── useLiveAgent.ts         # React hook orchestrating audio + session + tools
│   └── types.ts                # LiveSessionState, AudioEngineState, etc.
├── tools/
│   ├── index.ts                # ALL tool definitions + handlers (251 KB — pending domain split)
│   └── index.test.ts           # Registry integrity: no duplicates, handler↔definition parity
├── trellis/            # Trellis Document Format (rich structured responses)
│   ├── types.ts                # TDF block types
│   ├── TrellisRenderer.tsx     # Block renderers (text, code, mermaid, chart, table, ...)
│   └── index.ts
├── context/            # Agent context construction
│   ├── systemContext.ts        # Static system context (vault path, platform, etc.)
│   ├── workingContext.ts       # Dynamic context (active file, canvas state, etc.)
│   └── processRegistry.ts     # Running process tracking
├── actions/            # Side-effect actions called by tool handlers
│   ├── uiActions.ts            # App switching, layout, theme, panel control
│   └── widgetActions.ts        # Widget enable/disable
├── stores/
│   └── useAgentAppStore.ts     # Channels, threads, messages for AgentApp
├── evals/              # Eval framework for testing agent behavior
├── telemetry/          # Usage telemetry (opt-in)
├── utils/              # detectQuickReply, textRendering
└── index.ts            # Barrel: exports AgentSidebar
```

---

## Key Types

```typescript
// useChatStore.ts
interface AgentPersonalityConfig {
  warmth: number       // 0-100 (Clinical ↔ Encouraging)
  verbosity: number    // 0-100 (Terse ↔ Detailed)
  formality: number    // 0-100 (Casual ↔ Formal)
  enthusiasm: number   // 0-100 (Reserved ↔ Enthusiastic)
  voice: LiveVoice     // 'Kore' | 'Aoede' | ... (8 Gemini voices)
  customInstructions: string
}

// tools/index.ts
interface ToolDefinition { type: 'function'; name: string; description: string; parameters: ... }
type ToolHandler = (args: Record<string, unknown>) => Promise<string>
```

---

## Invariants

1. **Tool registry integrity** — `AGENT_TOOLS` array and `TOOL_HANDLERS` map must always be in sync. `index.test.ts` enforces this.
2. **`useModelProvider` vs `useAgentAppModelProvider`** — Former is for AgentSidebar; latter is for AgentApp (full-screen, channels/threads). Both do streaming + tool calls but have different system prompts and context.
3. **Live Mode API key order** — (1) stored Gemini key, (2) `VITE_GEMINI_API_KEY`, (3) Tauri ephemeral token.
4. **Tools return strings** — All tool handlers return `Promise<string>`. Complex return values are `JSON.stringify()`-ed.
5. **Trellis responses** — Agent may return a JSON block with `{ "trellis": true, "blocks": [...] }`. `MessageContent.tsx` auto-detects and routes to `TrellisRenderer`.

---

## How to Add a Tool

1. Add definition object to `AGENT_TOOLS` array in `tools/index.ts`
2. Add handler function to `TOOL_HANDLERS` map in `tools/index.ts`
3. Run `pnpm test` — `index.test.ts` will catch any mismatch
4. Add a line to `shouldEnableTools()` keyword list if the tool should be triggered by specific phrases
