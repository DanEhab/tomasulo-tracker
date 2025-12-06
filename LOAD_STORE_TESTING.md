# Load/Store Implementation - Testing Guide

## Overview
This document explains the updated Load/Store handling in the Tomasulo simulator and provides test cases to verify correct behavior.

## What Was Fixed

### 1. **Separate Load and Store Buffers**
- LOAD instructions (`LW`, `LD`, `L.S`, `L.D`) now use dedicated Load Buffers
- STORE instructions (`SW`, `SD`, `S.S`, `S.D`) now use dedicated Store Buffers
- Each buffer tracks its execution stage, dependencies, and address

### 2. **Three-Stage Execution for Memory Operations**

#### Stage 1: Address Calculation
- Computes effective address: `Address = Base Register Value + Immediate Offset`
- Waits for base register to be ready (if it has a pending dependency)
- For STOREs: Also waits for the value to be stored (if it has a pending dependency)

#### Stage 2: Memory Disambiguation (Conflict Detection)
- **For LOADs**: Blocked if there's an older STORE to the same address that hasn't completed (RAW hazard)
- **For STOREs**: Blocked if there's an older LOAD or STORE to the same address that hasn't completed (WAR/WAW hazards)

#### Stage 3: Cache Access
- **Cache Hit**: Takes `hitLatency` cycles
- **Cache Miss**: Takes `missLatency + hitLatency` cycles and fetches the block into cache
- After completion:
  - **LOADs**: Broadcast value on CDB to update dependent instructions
  - **STOREs**: Write to memory/cache and complete (no CDB broadcast)

### 3. **Byte Addressing and Cache**
- Memory is byte-addressable
- `LW`/`L.S` access 4 bytes (word/single-precision)
- `LD`/`L.D` access 8 bytes (double word/double-precision)
- Cache blocks are determined by `blockSize` configuration
- Block Index = `floor(address / blockSize)`

### 4. **Memory Conflict Detection**
The simulator now properly detects and prevents:
- **RAW (Read After Write)**: LOAD waits for older STORE to same address
- **WAR (Write After Read)**: STORE waits for older LOAD to same address
- **WAW (Write After Write)**: STORE waits for older STORE to same address

## Test Cases

### Test Case 1: Basic Load/Store with Cache Hit
```assembly
L.D F0, 0(R2)    # Load from address R2+0
S.D F0, 8(R2)    # Store to address R2+8
```

**Configuration:**
- Initial Memory: `0:10.5`
- Initial Registers: `R2: 0`
- Cache Hit Latency: 1
- Cache Miss Latency: 10
- Block Size: 16

**Expected Behavior:**
1. `L.D F0, 0(R2)`: 
   - Cycle 1: Issue, address = 0
   - Cycle 2: Cache miss, starts memory access (11 cycles)
   - Cycle 12: Complete, F0 = 10.5, broadcast on CDB
2. `S.D F0, 8(R2)`:
   - Cycle 2: Issue, address = 8, waits for F0
   - Cycle 13: Address and value ready, cache hit (1 cycle)
   - Cycle 14: Complete, memory[8] = 10.5

### Test Case 2: RAW Hazard (Load After Store)
```assembly
S.D F2, 0(R1)    # Store F2 to address 0
L.D F4, 0(R1)    # Load from same address
ADD.D F6, F4, F2 # Use loaded value
```

**Configuration:**
- Initial Registers: `R1: 0, F2: 5.0`
- Cache Hit Latency: 1
- Block Size: 8

**Expected Behavior:**
1. Store issues first, calculates address 0
2. Load issues second, calculates address 0
3. Load BLOCKS at stage 2 (conflict detection) until Store completes
4. After Store completes, Load proceeds with memory access
5. ADD waits for Load to complete and broadcast

### Test Case 3: WAR Hazard (Store After Load)
```assembly
L.D F0, 0(R2)    # Load from address 0
S.D F4, 0(R2)    # Store to same address
```

**Configuration:**
- Initial Memory: `0:10.0`
- Initial Registers: `R2: 0, F4: 20.0`

**Expected Behavior:**
1. Load issues, starts memory access
2. Store issues, calculates address
3. Store BLOCKS until Load completes (WAR hazard)
4. After Load completes, Store proceeds

### Test Case 4: Dependent Base Register
```assembly
DADDI R3, R2, 100  # R3 = R2 + 100
L.D F0, 0(R3)      # Load using computed address
```

**Configuration:**
- Initial Registers: `R2: 50`
- ADD Latency: 2

**Expected Behavior:**
1. DADDI issues, R3 renamed
2. Load issues but address cannot be calculated yet (waits for R3)
3. DADDI completes, broadcasts R3 = 150
4. Load receives R3, calculates address = 150, proceeds to memory access

### Test Case 5: Cache Miss Penalty
```assembly
L.D F0, 0(R1)    # First access - miss
L.D F2, 0(R1)    # Second access - hit (same block)
```

**Configuration:**
- Initial Registers: `R1: 0`
- Cache Hit Latency: 1
- Cache Miss Latency: 10
- Block Size: 16

**Expected Behavior:**
1. First Load: Cache miss, takes 11 cycles (miss + hit)
2. Second Load: Must wait for first Load (RAW), then cache hit, takes 1 cycle

## UI Enhancements

The Load/Store Buffer table now shows:
- **Stage Column**: Current execution stage or waiting dependency
  - "Addr Calc": Calculating address
  - "Wait Load1": Waiting for Load1 to provide base register
  - "Mem Access": Accessing cache/memory
  - "Complete": Finished execution
- **Color Coding**:
  - Gray: Not busy
  - Yellow: Waiting for dependency
  - Blue: Executing memory access
  - Green: Completed

## Configuration Tips

For realistic simulation:
- **Cache Hit**: 1-2 cycles
- **Cache Miss**: 50-100 cycles (memory is much slower)
- **Block Size**: 16-64 bytes (common cache line sizes)
- **Load Latency**: Determined by cache (use hit latency as minimum)
- **Store Latency**: Same as load latency

## Common Issues and Solutions

### Issue: Store never completes
**Solution**: Check if the store value register has a dependency. The store must wait for both the base register AND the source value.

### Issue: Load doesn't see stored value
**Solution**: Ensure memory disambiguation is working. The load should wait for older stores to the same address.

### Issue: Cache always misses
**Solution**: Check block size configuration. Addresses in the same block should hit after the first miss.

## Code Structure

Key functions in `tomasuloEngine.ts`:

1. **`checkMemoryConflicts()`**: Detects RAW/WAR/WAW hazards between memory operations
2. **`accessCache()`**: Simulates cache access, returns latency and updates cache state
3. **`getLoadSize()` / `getStoreSize()`**: Returns access size in bytes
4. **`executePhase()`**: Handles three-stage execution for loads/stores
5. **`issuePhase()`**: Issues loads/stores with proper dependency tracking
6. **`writeResultPhase()`**: Broadcasts load results on CDB, updates dependencies

## Debugging Tips

Enable console logging to see:
- Address calculations
- Cache hit/miss status
- Memory conflict detection
- Stage transitions
- CDB broadcasts

Look for messages like:
- `"Address calculated: R2(16) + 8 = 24"`
- `"Cache HIT at address 24 (block 1)"`
- `"RAW hazard: Load1 blocked by older Store1 at address 24"`
- `"Wait Load1"` (in Stage column)

## Summary

The Load/Store implementation now correctly:
✅ Uses separate Load and Store buffers  
✅ Calculates effective addresses with dependency tracking  
✅ Detects and prevents memory conflicts (RAW/WAR/WAW)  
✅ Simulates cache with hit/miss latencies  
✅ Updates cache state on misses  
✅ Broadcasts load results on CDB  
✅ Writes store results to memory without CDB  
✅ Handles byte addressing with correct access sizes  
