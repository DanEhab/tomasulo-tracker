# Quick Test Examples

Copy and paste these into the simulator to test different scenarios.

## Test 1: Basic Load/Store
```assembly
L.D F0, 0(R2)
S.D F0, 8(R2)
```
**Config:** R2=0, Memory[0]=10.5  
**Tests:** Basic load, store with dependency

---

## Test 2: RAW Hazard (Store-Load)
```assembly
S.D F2, 0(R1)
L.D F4, 0(R1)
ADD.D F6, F4, F2
```
**Config:** R1=0, F2=5.0  
**Tests:** Load waits for store to same address

---

## Test 3: WAR Hazard (Load-Store)
```assembly
L.D F0, 0(R2)
S.D F4, 0(R2)
```
**Config:** R2=0, F4=20.0, Memory[0]=10.0  
**Tests:** Store waits for load to same address

---

## Test 4: Cache Miss and Hit
```assembly
L.D F0, 0(R1)
L.D F2, 8(R1)
L.D F4, 0(R1)
```
**Config:** R1=0, BlockSize=16  
**Tests:** First load misses, others hit same block

---

## Test 5: Dependent Address Calculation
```assembly
DADDI R3, R2, 100
L.D F0, 0(R3)
S.D F2, 16(R3)
```
**Config:** R2=50, F2=7.5  
**Tests:** Load/store wait for address calculation

---

## Test 6: Multiple Memory Operations
```assembly
L.D F0, 0(R1)
L.D F2, 16(R1)
S.D F0, 32(R1)
S.D F2, 48(R1)
ADD.D F4, F0, F2
```
**Config:** R1=0, Memory[0]=1.0, Memory[16]=2.0  
**Tests:** Multiple ops, different addresses (no conflicts)

---

## Test 7: Chain of Dependencies
```assembly
DADDI R3, R2, 8
L.D F0, 0(R3)
MUL.D F2, F0, F0
S.D F2, 0(R3)
```
**Config:** R2=0, Memory[8]=3.0  
**Tests:** Address calc → load → compute → store

---

## Test 8: Same Address Multiple Times
```assembly
S.D F0, 0(R1)
L.D F2, 0(R1)
S.D F4, 0(R1)
L.D F6, 0(R1)
```
**Config:** R1=0, F0=1.0, F4=2.0  
**Tests:** All operations block correctly in order

---

## Recommended Configuration

For realistic testing:
```
Latencies:
- ADD: 2
- MUL: 10
- DIV: 40
- LOAD: 1 (will be overridden by cache)
- STORE: 1 (will be overridden by cache)

Reservation Stations:
- Adders: 3
- Multipliers: 2
- Load Buffers: 2
- Store Buffers: 2

Cache:
- Block Size: 16
- Cache Size: 256
- Hit Latency: 1
- Miss Latency: 50

Initial Memory (format: addr:value, addr:value):
0:10.5, 8:20.5, 16:30.5, 24:40.5

Initial Registers:
Edit directly in register tables after loading program!
- Integer registers: No decimal points allowed
- Float registers: Decimals allowed (e.g., 1.5, 3.14)
```

---

## What to Watch For

✅ **Stage Column** in Load/Store tables shows:
   - "Addr Calc" when calculating address
   - "Wait Load1" when waiting for dependency
   - "Mem Access" when accessing cache
   - "Complete" when done

✅ **Console logs** show:
   - "Address calculated: R2(16) + 8 = 24"
   - "Cache HIT/MISS at address X"
   - "RAW/WAR/WAW hazard: blocked by..."
   - "CDB Broadcasting: Load1 = 10.5"

✅ **Timing** is correct:
   - First load to address: miss latency
   - Subsequent loads to same block: hit latency
   - Operations respect program order for conflicts

---

## Common Mistakes to Avoid

❌ Forgetting to set initial memory values  
❌ Setting R1/R2 to large values without corresponding memory  
❌ Using the same buffer for too many operations (increase buffer count)  
❌ Expecting stores to broadcast on CDB (they don't!)  

---

## Debug Checklist

If something seems wrong:

1. **Check Console**: Open browser DevTools → Console tab
2. **Verify Initial State**: Registers and memory set correctly?
3. **Watch Stage Column**: Is instruction stuck? What stage?
4. **Check Address**: Are two operations really accessing same address?
5. **Verify Block Size**: Addresses in same block?

---

## Step-by-Step Test Procedure

1. **Configure** cache and latency settings in the config panel
2. **Set initial memory** values (e.g., `0:10.5, 8:20.5`)
3. **Paste test code** into instruction input
4. **Click "Load Program"**
5. **Edit register values** directly in the register tables (before stepping!)
   - Click on any value cell in Integer or Floating Point register tables
   - Integer registers: Only whole numbers (no decimals)
   - Float registers: Decimals allowed (e.g., 1.5, 3.14)
6. **Open Console** (F12 in browser) to see detailed logs
7. **Step through** cycle by cycle or run all
8. **Observe** stage changes in tables (registers become read-only after first step)
9. **Verify** final register and memory values

**Note:** Register values are editable ONLY at cycle 0 (before execution). Once you step or run, they become read-only.
