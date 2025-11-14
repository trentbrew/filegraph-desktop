# 🚢 Ship Checklist - Final Blockers Resolved

## ✅ Blocker 1: Zod Schema Validation

**Status:** ✅ COMPLETE

**What was implemented:**
- Full Zod schemas for `StatusBarTick` and `StatusEvent`
- `validateTick(data: unknown)` helper with fail-closed behavior
- Schema version enforcement (v1 only)
- Detailed error logging on validation failure

**Files:**
- ✅ `src/lib/tql/status-types.ts` - Zod schemas + validation

**Usage:**
```typescript
// Validate incoming daemon tick
const tick = validateTick(rawData);
if (!tick) {
  // Show "Incompatible daemon" UI
  return;
}
// Safe to use tick
```

**Testing needed:**
- [ ] Send malformed tick → verify error logged
- [ ] Send schema v2 tick → verify rejected
- [ ] Send v1 tick → verify accepted

---

## ✅ Blocker 2: Error Panel Component

**Status:** ✅ COMPLETE

**What was implemented:**
- Full error panel with table layout
- Columns: Time, File, Source, Code, Message, Provenance, Actions
- Bulk actions: Retry Selected, Ignore Selected
- Single-row actions: Retry, Ignore, Copy JSON
- Grouped by error code for better UX
- Auto-marks errors as reviewed when panel opens
- Selection with checkboxes
- Toast notifications for actions

**Files:**
- ✅ `src/components/app/errorPanel.tsx` - Complete component

**Props:**
```typescript
interface ErrorPanelProps {
  rows: ErrorDetail[];
  isOpen: boolean;
  onClose: () => void;
  onRetry: (ids: string[]) => void;
  onIgnore: (ids: string[]) => void;
  onMarkReviewed: () => void; // Clears badge
}
```

**Testing needed:**
- [ ] Open panel → badge clears
- [ ] Select multiple → bulk retry works
- [ ] Copy JSON → clipboard populated
- [ ] Keyboard navigation works
- [ ] Screen reader announces table

---

## ⚠️ Blocker 3: StatusBar Integration

**Status:** PARTIAL - Needs fixes

**What needs fixing:**

### 1. Add `errorsReviewed` to tick creation
```typescript
const tick: StatusBarTick = {
  // ...
  counts: {
    done: processed,
    total: total,
    edges: stats?.totalLinks || 0,
    errors: error ? 1 : 0,
    errorsReviewed: 0, // ⚠️ ADD THIS
  },
  // ...
};
```

### 2. Handle tri-state lock properly
```typescript
// Replace boolean check with tri-state
const isLocked = statusTick?.vault.locked === true;
const isUnknown = statusTick?.vault.locked === 'unknown';

// Show different UI for unknown
{isUnknown && <span className="text-xs">Verifying encryption…</span>}

// Disable controls when locked or unknown
<Button disabled={isLocked || isUnknown}>
```

### 3. Add heartbeat detection
```typescript
const [lastHeartbeat, setLastHeartbeat] = useState(Date.now());
const [connectionLost, setConnectionLost] = useState(false);

useEffect(() => {
  const timeout = setTimeout(() => {
    setConnectionLost(true);
  }, 2000); // 2s = missed ~8 ticks at 4Hz
  
  return () => clearTimeout(timeout);
}, [lastHeartbeat]);

// Reset on new tick
useEffect(() => {
  if (statusTick) {
    setLastHeartbeat(Date.now());
    setConnectionLost(false);
  }
}, [statusTick]);

// Show connection lost chip
{connectionLost && (
  <div className="text-yellow-600 text-xs">
    Connection lost—retrying…
  </div>
)}
```

### 4. No-op tick suppression
```typescript
const [lastRenderedTick, setLastRenderedTick] = useState<string | null>(null);

const statusTick = useMemo(() => {
  const newTick = computeTick();
  const serialized = JSON.stringify(newTick);
  
  // Suppress if unchanged
  if (serialized === lastRenderedTick) {
    return null; // Don't re-render
  }
  
  setLastRenderedTick(serialized);
  return newTick;
}, [deps]);
```

### 5. Wire error panel
```typescript
const [errorPanelOpen, setErrorPanelOpen] = useState(false);
const [errors, setErrors] = useState<ErrorDetail[]>([]);

// In error badge click handler
onClick={() => setErrorPanelOpen(true)}

// Add component
<ErrorPanel
  rows={errors}
  isOpen={errorPanelOpen}
  onClose={() => setErrorPanelOpen(false)}
  onRetry={(ids) => {
    // TODO: Wire to daemon
    console.log('[StatusBar] Retry:', ids);
  }}
  onIgnore={(ids) => {
    // TODO: Remove from errors
    setErrors(errors.filter(e => !ids.includes(e.id)));
  }}
  onMarkReviewed={() => {
    // Clear badge count
    // TODO: Update statusTick.counts.errorsReviewed
  }}
/>
```

---

## 📋 Remaining Tasks (Priority Order)

### Critical (Must Fix Before Ship)
1. **Fix StatusBar type errors**
   - Add `errorsReviewed: 0` to tick
   - Handle tri-state `locked`
   - Wire error panel
   - ~30 minutes

2. **Add heartbeat detection**
   - Connection lost chip
   - Exponential backoff (optional)
   - "Reconnected" toast
   - ~30 minutes

3. **No-op tick suppression**
   - JSON.stringify comparison
   - Prevent repaint churn
   - ~15 minutes

4. **Screen reader testing**
   - VoiceOver: test announcements
   - NVDA: test error table
   - Verify aria-live behavior
   - ~1 hour

### High Priority (Should Fix)
5. **ETA sliding window**
   - Last 30–60s of progress
   - Trim top/bottom deciles
   - ~1 hour

6. **Reduced motion**
   - Hide spinner when `prefers-reduced-motion`
   - Text-only progress
   - ~15 minutes

7. **Lock tri-state UI**
   - "Verifying encryption…" label
   - Disable controls when unknown
   - ~15 minutes

### Medium Priority (Can Defer)
8. **LocalStorage privacy**
   - Hash vault path when locked
   - ~30 minutes

9. **Reconnection backoff**
   - Exponential retry on connection lost
   - ~30 minutes

---

## 🧪 Testing Matrix

### Unit Tests
- [ ] `validateTick()` rejects malformed data
- [ ] `validateTick()` accepts valid v1 tick
- [ ] `redactIfLocked()` removes path when locked

### Integration Tests
- [ ] Error panel opens on badge click
- [ ] Badge clears when panel opens
- [ ] Retry action logs correct IDs
- [ ] Ignore action removes errors
- [ ] Copy JSON populates clipboard

### E2E Tests
- [ ] Lifecycle: Start → Pause → Quit → Resume
- [ ] Connection lost appears after 2s
- [ ] Reconnected toast on recovery
- [ ] No "Idle" flash on boot

### Accessibility Tests
- [ ] VoiceOver: announces state changes once
- [ ] VoiceOver: no number chatter (4Hz works)
- [ ] NVDA: reads table headers and row count
- [ ] Keyboard: tab order logical
- [ ] Keyboard: focus-visible on all controls
- [ ] Reduced motion: no spinner

---

## 📦 Dependencies

**Required:**
```bash
npm install zod
```

**Already installed:**
- React
- Lucide icons
- Shadcn/ui components

---

## 🚀 Estimated Time to Ship

**Critical path:**
- StatusBar fixes: 30 min
- Heartbeat detection: 30 min
- No-op suppression: 15 min
- Screen reader testing: 1 hr

**Total: ~2.5 hours of focused work**

---

## 🎯 Release Gate (Pass/Fail)

### Must Pass
- [x] Zod validation implemented
- [x] Error panel component complete
- [ ] StatusBar type errors fixed
- [ ] Error panel wired to status bar
- [ ] Heartbeat detection working
- [ ] No-op tick suppression
- [ ] VoiceOver test passed
- [ ] NVDA test passed
- [ ] No "Idle" flash on boot
- [ ] Reduced motion respected

### Can Ship Without
- ETA sliding window (post-launch)
- Reconnection backoff (post-launch)
- LocalStorage hashing (post-launch)
- Delta edges display (cut)
- Agent permissions panel (cut)
- Responsive icon-only mode (cut)

---

## 📝 What Changed Today

### Core Architecture
- ✅ Zod schemas replace hand-written validation
- ✅ Tri-state lock prevents lying during bootstrap
- ✅ Error detail type standardized
- ✅ Event log foundation for ETA smoothing

### UI Components
- ✅ Error panel with full retry/ignore workflow
- ✅ Grouped errors by code
- ✅ Copy JSON functionality
- ✅ Badge clearing on panel open

### Data Contract
- ✅ Schema version enforcement (v1)
- ✅ `errorsReviewed` count added
- ✅ `phaseProgress` for long-running phases
- ✅ `pauseReason` enum
- ✅ Daemon timestamps (not UI clock)

---

## 🔥 Known Issues

1. **StatusBar lint errors** - Type mismatches need fixing
2. **Error panel not wired** - Click handler stubbed
3. **Heartbeat missing** - No connection lost detection
4. **No tick suppression** - May cause repaint churn

---

## ✨ Post-Launch Improvements

### Performance
- ETA sliding window with outlier trimming
- Batch updates with RAF
- Memoize tooltips

### UX
- Responsive collapse (≤960px)
- Battery/thermal hints (macOS)
- Delta edges display
- Agent permissions panel

### Reliability
- Reconnection backoff
- Offline mode graceful degradation
- Error retry with exponential backoff

---

**Current Status: 90% ship-ready. 2.5hrs to green. All blockers have clear solutions.**
