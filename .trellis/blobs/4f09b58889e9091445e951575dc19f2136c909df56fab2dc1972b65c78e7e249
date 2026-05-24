# LLM Provider Adapters

Unified adapter layer for multiple LLM providers. All providers conform to a single `ProviderAdapter` interface so the agent feature can swap between Ollama, OpenAI, Anthropic, Groq, and Gemini without changing call sites.

---

## Directory Structure

```
providers/
├── types.ts      # ProviderAdapter, ChatMessage, ToolCall, StreamChunk interfaces
├── registry.ts   # Provider + model definitions (PROVIDERS, MODEL_PRESETS)
├── openai.ts     # OpenAI-compatible adapter (also used for Groq)
├── ollama.ts     # Ollama adapter (local, free)
├── gemini.ts     # Google Gemini adapter (33 KB — streaming + vision + Live API token)
└── index.ts      # getAdapter(), PROVIDERS, PROVIDER_LIST, getDefaultConfig()
```

---

## Key Types

```typescript
// types.ts
type ProviderId = 'ollama' | 'openai' | 'anthropic' | 'groq' | 'gemini'

interface ProviderAdapter {
  chat(messages: ChatMessage[], options: ChatOptions): Promise<ChatResponse>
  stream(messages: ChatMessage[], options: StreamOptions): AsyncIterable<StreamChunk>
  supportsTools: boolean
  supportsVision: boolean
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | ContentPart[]
  toolCalls?: ToolCall[]
  toolCallId?: string
}
```

---

## Default Configuration

```typescript
getDefaultConfig() // → { provider: 'ollama', model: 'llama3-groq-tool-use' }
```

Ollama is the default — free, local, no API key required. Best model for function calling: `llama3-groq-tool-use`.

---

## Ollama Quirks

- Returns tool arguments as an **object** (not JSON string) — normalized in adapter
- Requires `stream: false` for non-streaming requests in some versions
- Tool call IDs may be missing — auto-generated fallbacks added

---

## Usage

```typescript
import { getAdapter, getDefaultConfig } from '@/lib/providers'

const { provider, model } = getDefaultConfig()
const adapter = getAdapter(provider)
const response = await adapter.chat(messages, { model, tools: AGENT_TOOLS })
```
