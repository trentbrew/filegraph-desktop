# Production Readiness Checklist - Status Bar

## 🎯 Critical Path to Ship (Must-Have)

### **1. Data Contract Hardening** ✅ DONE
- [x] Schema versioning (`schemaVersion: 1`)
- [x] Tri-state lock (`LockState = true | false | 'unknown'`)
- [x] Add `errorsReviewed` count
- [x] Add `phaseProgress` (0–1) for long-running phases
- [x] Add `pauseReason` enum
- [x] Use `daemonTimestamp` (not UI clock)
- [x] Redaction helper for locked vaults
- [x] Event log foundation (append-only)

**Files:**
- ✅ `src/lib/tql/status-types.ts` - Complete with helpers

---

### **2. Schema Validation** ⚠️ TODO
- [ ] Add Zod schema for `StatusBarTick`
- [ ] Validate incoming ticks (reject malformed)
- [ ] Show non-fatal UI state on validation failure
- [ ] Graceful degradation: "Incompatible daemon, please update"

**Implementation:**
```typescript
import { z } from 'zod';

const StatusBarTickSchema = z.object({
  schemaVersion: z.literal(1),
  vault: z.object({
    name: z.string(),
    path: z.string(),
    locked: z.union([z.boolean(), z.literal('unknown')]),
  }),
  state: z.enum(['idle', 'discovering', 'fts', 'embedding', 'paused', 'error']),
  counts: z.object({
    done: z.number(),
    total: z.number(),
    edges: z.number(),
    errors: z.number(),
    errorsReviewed: z.number(),
  }),
  // ... rest of schema
});

// Usage:
function validateTick(data: unknown): StatusBarTick | null {
  const result = StatusBarTickSchema.safeParse(data);
  if (!result.success) {
    console.error('[StatusBar] Invalid tick:', result.error);
    return null;
  }
  return result.data;
}
```

**Package needed:**
```bash
npm install zod
```

---

### **3. Error Panel Component** ⚠️ CRITICAL
Must implement before ship. Users need actionable error drill-through.

**Requirements:**
- Filtered table of errors (newest first)
- Columns: File, Error Code, Message, Time
- Actions: Retry, Ignore, Copy Details
- Group by error code (collapsible)
- Show provenance on expand
- Clear badge when panel opens

**Data structure:**
```typescript
interface ErrorRow {
  id: string;
  source: string;      // File path
  code: string;        // "PARSE_FAILED", "IO_ERROR"
  message: string;     // Human-readable
  timestamp: number;   // Daemon timestamp
  provenance?: string; // Stack trace
  reviewed: boolean;   // User acknowledged
}
```

**UI mockup:**
```
┌──────────────────────────────────────────────────────────────────┐
│ Errors (3) ⚠                                    [Clear All] [X]   │
├──────────────────────────────────────────────────────────────────┤
│ ▼ PARSE_FAILED (2)                                               │
│   • /docs/broken.md                          [Retry] [Ignore]    │
│     "Invalid frontmatter: expected YAML"                         │
│     2 minutes ago                                                │
│                                                                  │
│   • /notes/corrupted.txt                     [Retry] [Ignore]    │
│     "UTF-8 decode error at byte 142"                            │
│     5 minutes ago                                                │
│                                                                  │
│ ▼ IO_ERROR (1)                                                   │
│   • /large/file.bin                          [Retry] [Ignore]    │
│     "Permission denied"                                          │
│     1 minute ago                                                 │
└──────────────────────────────────────────────────────────────────┘
```

**Component skeleton:**
```typescript
// src/components/app/errorPanel.tsx
export function ErrorPanel({ 
  errors, 
  onRetry, 
  onIgnore, 
  onClearAll, 
  onClose 
}: ErrorPanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const groupedErrors = groupByCode(errors);
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[600px]">
        <DialogHeader>
          <DialogTitle>Indexing Errors ({errors.length})</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[500px]">
          {groupedErrors.map(group => (
            <ErrorGroup 
              key={group.code}
              code={group.code}
              errors={group.errors}
              expanded={expanded.has(group.code)}
              onToggle={() => toggleExpand(group.code)}
              onRetry={onRetry}
              onIgnore={onIgnore}
            />
          ))}
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClearAll}>
            Clear All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### **4. Performance & Stability** ⚠️ TODO

#### **No-op Tick Suppression**
```typescript
const [lastTick, setLastTick] = useState<StatusBarTick | null>(null);

const statusTick = useMemo(() => {
  const newTick = computeTick();
  
  // Suppress if nothing changed
  if (lastTick && isTickEqual(lastTick, newTick)) {
    return lastTick; // Prevent repaint churn
  }
  
  setLastTick(newTick);
  return newTick;
}, [deps]);

function isTickEqual(a: StatusBarTick, b: StatusBarTick): boolean {
  return (
    a.state === b.state &&
    a.counts.done === b.counts.done &&
    a.counts.errors === b.counts.errors &&
    a.perf.etaSec === b.perf.etaSec
  );
}
```

#### **Backpressure Handling**
```typescript
const [missedTicks, setMissedTicks] = useState(0);
const TICK_TIMEOUT = 1000; // 1 second = 4 missed ticks

useEffect(() => {
  const timeout = setTimeout(() => {
    setMissedTicks((n) => n + 1);
  }, TICK_TIMEOUT);
  
  return () => clearTimeout(timeout);
}, [lastUpdate]);

// Show "Connection lost" if ≥4 missed ticks
{missedTicks >= 4 && (
  <div className="flex items-center gap-1 text-yellow-600">
    <AlertTriangle className="h-3 w-3" />
    <span className="text-xs">Connection lost</span>
  </div>
)}
```

#### **Batch Updates with RAF**
```typescript
const pendingUpdatesRef = useRef<Partial<StatusBarTick>>({});
const rafIdRef = useRef<number | null>(null);

function scheduleBatchUpdate(updates: Partial<StatusBarTick>) {
  Object.assign(pendingUpdatesRef.current, updates);
  
  if (rafIdRef.current === null) {
    rafIdRef.current = requestAnimationFrame(() => {
      applyUpdates(pendingUpdatesRef.current);
      pendingUpdatesRef.current = {};
      rafIdRef.current = null;
    });
  }
}
```

---

### **5. Accessibility Enhancements** ⚠️ TODO

#### **Dynamic aria-live**
```typescript
const [ariaLive, setAriaLive] = useState<'polite' | 'assertive'>('polite');

useEffect(() => {
  // Flip to assertive on state transitions
  if (prevState && prevState.state !== fsmState) {
    setAriaLive('assertive');
    setTimeout(() => setAriaLive('polite'), 2000);
  }
}, [fsmState]);

<div role="status" aria-live={ariaLive} aria-atomic="true">
```

#### **Skip Target**
```html
<a href="#status-bar" className="sr-only focus:not-sr-only">
  Jump to indexing status
</a>

<div id="status-bar" tabIndex={-1}>
  <!-- Status bar content -->
</div>
```

#### **prefers-contrast for Colors**
```typescript
const getPausedColor = () => {
  const prefersContrast = window.matchMedia('(prefers-contrast: more)').matches;
  if (prefersContrast) {
    return 'text-yellow-700 dark:text-yellow-300'; // Higher contrast
  }
  return 'text-amber-600 dark:text-amber-400';
};
```

---

### **6. Microcopy & Formatting** ⚠️ Partial

#### **Intl.NumberFormat**
```typescript
const numberFormatter = new Intl.NumberFormat(navigator.language, {
  notation: 'compact',
  compactDisplay: 'short',
});

// Usage:
{numberFormatter.format(stats.totalFacts)} facts
// → "3.9K facts" or "3,891 facts" depending on locale
```

#### **Pause Reason**
```typescript
if (fsmState === 'paused' && statusTick.pauseReason) {
  return `Paused ${getPauseReasonText(statusTick.pauseReason)} — queries use current snapshot`;
}
```

---

### **7. Security/Privacy** ⚠️ Partial

#### **Path Redaction**
✅ Implemented in `status-types.ts` via `redactIfLocked()`

#### **Hard Disable When Locked**
```typescript
const isLocked = statusTick?.vault.locked === true;

<Button disabled={isLocked} ...>
  {isLocked ? 'Unlock to Resume' : 'Resume'}
</Button>
```

---

## 🧪 Testing Requirements

### **Lifecycle Tests**
- [ ] Start → Index → Pause → Quit → Restart → Resume
- [ ] No "Idle" flash on boot (show restored state)
- [ ] LocalStorage persists across sessions
- [ ] Schema validation rejects old versions

### **Performance Tests**
- [ ] 10k+ file changes (high churn)
- [ ] Verify bar doesn't lag input
- [ ] No memory leaks over 24h indexing
- [ ] Slow disk / high CPU: throttle behaves

### **Accessibility Tests**
- [ ] VoiceOver (macOS): announces state changes once
- [ ] NVDA (Windows): reads progress updates
- [ ] Keyboard: Tab order logical, focus visible
- [ ] Reduced motion: no spinner, text-only feedback
- [ ] High contrast: colors pass WCAG AA

### **Security Tests**
- [ ] Locked vault: paths redacted in LocalStorage
- [ ] Locked vault: Resume/Pause disabled
- [ ] Locked vault: Agent grayed out
- [ ] No absolute paths leak in error messages

### **Error Handling Tests**
- [ ] 1k+ errors: panel doesn't freeze
- [ ] Malformed tick: shows "Incompatible daemon"
- [ ] Network offline: "Connection lost" appears
- [ ] Resume after connection lost

---

## 📦 Dependencies to Add

```bash
npm install zod
```

---

## 🚀 Ship Criteria (80% → 100%)

### **Blockers** (Must Fix)
- [ ] Zod schema validation
- [ ] Error panel component
- [ ] StatusBar: Fix `errorsReviewed` + tri-state lock
- [ ] No-op tick suppression
- [ ] Backpressure handling (connection lost)
- [ ] Screen reader testing (NVDA + VoiceOver)

### **High Priority** (Should Fix)
- [ ] Dynamic aria-live
- [ ] Intl.NumberFormat for locale-aware numbers
- [ ] Pause reason display
- [ ] Hard disable controls when locked
- [ ] Batch updates with RAF

### **Medium Priority** (Can Defer)
- [ ] Responsive collapse (≤960px)
- [ ] Skip target for keyboard users
- [ ] prefers-contrast color selection
- [ ] ETA sliding window (30–60s)
- [ ] Battery/thermal hints (macOS)

### **Low Priority** (Post-Launch)
- [ ] Connection lost → reconnection backoff
- [ ] Memoize tooltips
- [ ] Event log visualization
- [ ] Telemetry dashboard

---

## 📝 Implementation Checklist

### **Phase 1: Foundation** (Now)
1. [x] Update data contract with schema versioning
2. [x] Add tri-state lock, pause reason, errorsReviewed
3. [x] Implement redaction helpers
4. [ ] Add Zod schema validation
5. [ ] Update StatusBar to use new contract
6. [ ] Fix lint errors (errorsReviewed, tri-state)

### **Phase 2: Error Handling** (Next)
7. [ ] Create ErrorPanel component
8. [ ] Wire to StatusBar error badge
9. [ ] Implement retry/ignore actions
10. [ ] Group errors by code

### **Phase 3: Performance** (Next)
11. [ ] No-op tick suppression
12. [ ] Backpressure handling
13. [ ] RAF batching

### **Phase 4: Polish** (Final)
14. [ ] Dynamic aria-live
15. [ ] Intl formatting
16. [ ] Screen reader testing
17. [ ] Lifecycle testing

---

## 💡 Key Insights from Feedback

**What pushes it from 80% to ship-ready:**

1. **Never lie** - Schema validation ensures UI can't drift from daemon
2. **Make errors actionable** - Drill-through panel with retry is non-negotiable
3. **Respect the clock** - Use daemon timestamps, not UI clock
4. **Fail closed** - Incompatible schema → visible error, not silent corruption
5. **Privacy by default** - Redact paths when locked
6. **Accessibility isn't optional** - Screen reader testing is a ship blocker
7. **Performance under load** - 10k files shouldn't freeze the bar

**Testing philosophy:**
- Lifecycle survival > feature completeness
- Screen reader announcements > visual polish
- Connection resilience > optimistic UI

**What can wait:**
- Responsive collapse
- Advanced ETA smoothing
- Battery/thermal hints
- Telemetry

---

**Current status: ~85% ready. Critical path clear. Error panel + schema validation are the gatekeepers.**
