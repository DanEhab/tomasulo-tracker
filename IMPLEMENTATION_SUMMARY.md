# Tomasulo Simulator - Load/Store Implementation Summary

## Changes Made

### 1. Enhanced LoadStoreBuffer Type (`src/types/simulator.ts`)
Added new fields to track execution stages and dependencies:
- `baseRegisterTag`: Tracks dependency on base register for address calculation
- `storeValueTag`: Tracks dependency on value to be stored (for STORE instructions)
- `stage`: Current execution stage ('ADDRESS_CALC' | 'MEMORY_ACCESS' | 'COMPLETED')

### 2. New Helper Functions (`src/lib/tomasuloEngine.ts`)

#### `checkMemoryConflicts()`
- Detects RAW, WAR, and WAW hazards between memory operations
- Checks if two operations access the same memory address
- Enforces program order (only older instructions can block newer ones)
- Returns `true` if the operation should be blocked

#### `accessCache()`
- Simulates cache access with hit/miss detection
- Calculates cache block index based on address and block size
- Returns latency (hit or miss + hit) and updates cache state
- Fetches entire cache block on miss

#### `getLoadSize()` / `getStoreSize()`
- Returns access size in bytes (4 for word, 8 for double)
- Used for accurate cache block calculations

### 3. Refactored Execution Phases

#### `issuePhase()`
**For Load Instructions:**
- Issues to Load Buffer
- Calculates address if base register is ready, otherwise tracks dependency
- Performs register renaming (destination register points to buffer tag)

**For Store Instructions:**
- Issues to Store Buffer
- Tracks dependencies on both base register and store value
- Waits for both to be ready before proceeding

#### `executePhase()`
**Stage 1: Address Calculation**
- Waits for base register value (via CDB)
- Waits for store value (STORE only, via CDB)
- Calculates effective address once dependencies are resolved

**Stage 2: Memory Conflict Detection**
- Checks for conflicts with other memory operations
- Blocks if there's a hazard with an older operation on the same address

**Stage 3: Cache Access**
- Determines hit or miss
- Sets appropriate latency
- Decrements time remaining each cycle
- On completion:
  - **LOADs**: Fetch value from memory, mark as COMPLETED
  - **STOREs**: Write to memory and cache, mark as COMPLETED

#### `writeResultPhase()`
**For Loads:**
- Broadcasts value on CDB when stage is COMPLETED
- Updates all waiting registers and reservation stations
- Updates Load/Store buffers waiting for base register or store value

**For Stores:**
- No CDB broadcast (stores don't produce values for other instructions)
- Completes and frees buffer immediately after writing

### 4. UI Enhancements (`src/components/simulator/LoadStoreBufferTable.tsx`)

Added **Stage column** that shows:
- Current execution stage
- Dependencies being waited on (e.g., "Wait Load1")
- Clear visual feedback with color coding

Color scheme:
- **Yellow**: Waiting for dependency
- **Blue**: Actively executing memory access
- **Green**: Completed
- **Gray**: Not busy

## How It Works - Example Walkthrough

### Example: RAW Hazard Detection
```assembly
S.D F2, 0(R1)    # Store F2 to address 0
L.D F4, 0(R1)    # Load from same address
```

**Cycle-by-Cycle Execution:**

1. **Cycle 1: Issue Store**
   - Store1 allocated in Store Buffer
   - Address calculated: R1(0) + 0 = 0
   - Value: F2 = 5.0 (ready)
   - Stage: ADDRESS_CALC → MEMORY_ACCESS
   - Time: 2 cycles (cache hit)

2. **Cycle 2: Issue Load**
   - Load1 allocated in Load Buffer
   - Address calculated: R1(0) + 0 = 0
   - Stage: ADDRESS_CALC
   - F4 renamed to Load1

3. **Cycle 2: Load Checks Conflicts**
   - Finds Store1 at address 0, not completed
   - **BLOCKED** (RAW hazard detected)
   - Remains in ADDRESS_CALC stage

4. **Cycle 3: Store Completes**
   - Store1 writes value 5.0 to memory[0]
   - Stage: COMPLETED
   - Buffer freed

5. **Cycle 4: Load Proceeds**
   - No more conflicts at address 0
   - Starts cache access (hit, 1 cycle)
   - Stage: MEMORY_ACCESS

6. **Cycle 5: Load Completes**
   - Fetches value 5.0 from memory[0]
   - Stage: COMPLETED
   - Broadcasts F4 = 5.0 on CDB

## Testing the Implementation

### Quick Test
1. Start the development server: `npm run dev`
2. Open the simulator at `http://localhost:8081`
3. Configure:
   - Cache Hit: 1 cycle
   - Cache Miss: 10 cycles
   - Block Size: 16 bytes
   - Initial Memory: `0:10.5`
   - Initial R2: 0

4. Enter test code:
```assembly
L.D F0, 0(R2)
S.D F0, 8(R2)
L.D F2, 0(R2)
```

5. Step through and observe:
   - First L.D: Cache miss (11 cycles)
   - S.D: Waits for F0, then cache hit
   - Second L.D: Cache hit (same block), waits for first L.D

### What to Look For
✅ Load/Store buffers show correct Stage  
✅ Dependencies tracked (e.g., "Wait Load1")  
✅ Memory conflicts detected and blocked  
✅ Cache hits/misses logged in console  
✅ Correct timing based on latencies  
✅ Loads broadcast on CDB  
✅ Stores write without CDB  

## Architecture Decisions

### Why Three Stages?
1. **Address Calculation**: Separates dependency resolution from memory access
2. **Conflict Detection**: Ensures memory consistency (prevents hazards)
3. **Cache Access**: Realistic memory hierarchy simulation

### Why Track Dependencies Separately?
- Allows instructions to issue even if operands aren't ready
- Follows true Tomasulo spirit (dynamic scheduling)
- Makes debugging easier (can see what's blocking an instruction)

### Why Separate Load/Store Buffers?
- Matches real hardware implementations
- Different conflict detection logic for loads vs stores
- Clearer separation of concerns

## Common Pitfalls Fixed

### ❌ Before: Incorrect Address Calculation
```typescript
buf.address = offset; // Wrong! Ignores base register
```

### ✅ After: Correct with Dependency Tracking
```typescript
if (baseReg.qi === null) {
  buf.address = baseReg.value + offset;
} else {
  buf.baseRegisterTag = baseReg.qi; // Wait for it
}
```

### ❌ Before: No Memory Conflict Detection
Loads and stores could execute in wrong order, violating memory semantics.

### ✅ After: Proper Hazard Detection
```typescript
if (checkMemoryConflicts(buf, otherBuffers, instructions, isLoad)) {
  return; // Block until safe
}
```

### ❌ Before: Fixed Latency for All Memory Ops
All loads/stores took the same time regardless of cache.

### ✅ After: Dynamic Cache Simulation
```typescript
const { latency, hit } = accessCache(address, config, state, size);
buf.timeRemaining = latency; // Varies based on hit/miss
```

## Future Enhancements

Possible improvements (not implemented):
- [ ] Multi-level cache (L1, L2, L3)
- [ ] Cache replacement policies (LRU, FIFO)
- [ ] Write-through vs write-back cache
- [ ] Memory banking for parallel access
- [ ] Branch prediction and speculative loads
- [ ] Load bypassing (relaxed memory ordering)

## Files Modified

1. `src/types/simulator.ts` - Enhanced LoadStoreBuffer interface
2. `src/lib/tomasuloEngine.ts` - Complete Load/Store execution logic
3. `src/components/simulator/LoadStoreBufferTable.tsx` - UI enhancements
4. `README.md` - Added documentation link
5. `LOAD_STORE_TESTING.md` - Comprehensive testing guide (new)
6. `IMPLEMENTATION_SUMMARY.md` - This file (new)

## References

- Tomasulo, R.M. (1967). "An efficient algorithm for exploiting multiple arithmetic units"
- Hennessy & Patterson, "Computer Architecture: A Quantitative Approach"
- Modern processor implementations (Intel, AMD, ARM)
