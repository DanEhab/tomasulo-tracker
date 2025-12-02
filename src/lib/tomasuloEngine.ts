import { 
  Instruction, 
  SimulatorState, 
  SimulatorConfig, 
  ReservationStation,
  LoadStoreBuffer,
  InstructionType 
} from "@/types/simulator";

export function parseInstructions(code: string): Instruction[] {
  const lines = code.trim().split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
  
  const instructions = lines.map((line, index) => {
    const cleaned = line.trim().replace(/,/g, ' ').replace(/\(/g, ' ').replace(/\)/g, ' ').replace(/#/g, '');
    const parts = cleaned.split(/\s+/).filter(p => p);
    console.log(`Parsing line ${index}: "${line}" -> parts:`, parts);
    // Handle split opcode tokens like "L. D" or "ADD. D" by merging
    let opcode = parts[0].toUpperCase();
    if (opcode.endsWith('.') && parts.length > 1 && parts[1].length === 1) {
      opcode = (opcode + parts[1].toUpperCase());
      parts[0] = opcode; // update the opcode in place
      parts.splice(1, 1); // remove the next token as it's merged into opcode
      console.log(`  After merge: parts:`, parts);
    }
    const type = opcode as InstructionType;
    
    // Handle different instruction formats
    let dest, src1, src2, immediate;
    
    const isLoadStore = (type.startsWith('L') || type.startsWith('S')) && 
                        !type.includes('SUB') && !type.includes('ADD');
    
    if (isLoadStore) {
      // Load/Store: L.D F0, 32(R2) -> dest=F0, immediate=32, src1=R2
      // Match: L.D, LD, S.D, SD, SW, S.S, but NOT SUB.D, ADD.D, etc.
      // After potential opcode merge, format is: [OPCODE, DEST, IMM, BASE]
      dest = parts[1];
      immediate = parseFloat(parts[2]) || 0;
      src1 = parts[3];
    } else if (type === 'DADDI' || type === 'DSUBI') {
      // Immediate: DADDI R1, R2, 100 -> dest=R1, src1=R2, immediate=100
      dest = parts[1];
      src1 = parts[2];
      immediate = parseFloat(parts[3]);
    } else if (type === 'BNE' || type === 'BEQ') {
      // Branch: BNE R1, R2, label -> src1=R1, src2=R2
      src1 = parts[1];
      src2 = parts[2];
      dest = parts[3]; // label
    } else {
      // Regular FP ops: ADD.D F0, F2, F4 -> dest=F0, src1=F2, src2=F4
      dest = parts[1];
      src1 = parts[2];
      src2 = parts[3];
    }
    
    return {
      id: index,
      raw: line.trim(),
      type,
      dest,
      src1,
      src2,
      immediate,
    };
  });
  
  // Validate: Check if any instruction tries to write to R0
  const r0WriteInstructions = instructions.filter(inst => 
    inst.dest && inst.dest.toUpperCase() === 'R0'
  );
  
  if (r0WriteInstructions.length > 0) {
    const errorLines = r0WriteInstructions.map(inst => `Line ${inst.id + 1}: ${inst.raw}`).join('\n');
    throw new Error(`Cannot write to R0 register (always 0):\n${errorLines}`);
  }
  
  return instructions;
}

export function initializeSimulatorState(
  instructions: Instruction[],
  config: SimulatorConfig
): SimulatorState {
  const addStations: ReservationStation[] = Array.from({ length: config.reservationStations.adders }, (_, i) => ({
    tag: `Add${i + 1}`,
    busy: false,
    op: "",
    vj: null,
    vk: null,
    qj: null,
    qk: null,
    a: null,
    timeRemaining: 0,
  }));

  const mulStations: ReservationStation[] = Array.from({ length: config.reservationStations.multipliers }, (_, i) => ({
    tag: `Mul${i + 1}`,
    busy: false,
    op: "",
    vj: null,
    vk: null,
    qj: null,
    qk: null,
    a: null,
    timeRemaining: 0,
  }));

  const intAddStations: ReservationStation[] = Array.from({ length: config.reservationStations.intAdders }, (_, i) => ({
    tag: `IntAdd${i + 1}`,
    busy: false,
    op: "",
    vj: null,
    vk: null,
    qj: null,
    qk: null,
    a: null,
    timeRemaining: 0,
  }));

  const loadBuffers: LoadStoreBuffer[] = Array.from({ length: config.reservationStations.loadBuffers }, (_, i) => ({
    tag: `Load${i + 1}`,
    busy: false,
    address: null,
    value: null,
    timeRemaining: 0,
    baseRegisterTag: null,
    storeValueTag: null,
    stage: 'ADDRESS_CALC' as const,
  }));

  const storeBuffers: LoadStoreBuffer[] = Array.from({ length: config.reservationStations.storeBuffers }, (_, i) => ({
    tag: `Store${i + 1}`,
    busy: false,
    address: null,
    value: null,
    timeRemaining: 0,
    baseRegisterTag: null,
    storeValueTag: null,
    stage: 'ADDRESS_CALC' as const,
  }));

  const intRegisters = Array.from({ length: 32 }, (_, i) => ({
    name: `R${i}`,
    value: 0,
    qi: null,
    type: 'INT' as const,
  }));

  const floatRegisters = Array.from({ length: 32 }, (_, i) => ({
    name: `F${i}`,
    value: 0,
    qi: null,
    type: 'FLOAT' as const,
  }));

  const baseState: SimulatorState = {
    cycle: 0,
    instructions,
    reservationStations: {
      add: addStations,
      mul: mulStations,
      intAdd: intAddStations,
    },
    loadStoreBuffers: {
      load: loadBuffers,
      store: storeBuffers,
    },
    registers: {
      int: intRegisters,
      float: floatRegisters,
    },
    memory: new Map(),
    cache: new Map(),
    isRunning: false,
    isComplete: false,
  };

  // Apply optional initial registers
  if (config.initialRegisters) {
    Object.entries(config.initialRegisters).forEach(([name, value]) => {
      const reg = [...baseState.registers.int, ...baseState.registers.float]
        .find(r => r.name.toUpperCase() === name.toUpperCase());
      if (reg) {
        reg.value = value;
      }
    });
  }

  // Apply optional initial memory
  if (config.initialMemory) {
    config.initialMemory.forEach(({ address, value }) => {
      baseState.memory.set(address, value);
    });
  }

  return baseState;
}

export function executeSimulationStep(
  state: SimulatorState,
  config: SimulatorConfig
): SimulatorState {
  // Deep clone with proper Map handling
  const newState = JSON.parse(JSON.stringify(state));
  
  // Restore Map objects (JSON.stringify converts Maps to empty objects)
  newState.memory = new Map(state.memory);
  newState.cache = new Map(state.cache);
  
  newState.cycle = state.cycle + 1;
  
  console.log(`\n=== CYCLE ${newState.cycle} ===`);
  
  // PHASE 1: Write Result (CDB Broadcast)
  writeResultPhase(newState, config);
  
  // PHASE 2: Execute (Decrement time for ready operations)
  executePhase(newState, config);
  
  // PHASE 3: Issue (Try to issue next instruction)
  issuePhase(newState, config);
  
  // Check completion
  const allComplete = newState.instructions.every(
    inst => inst.writeResultCycle !== undefined
  );
  
  if (allComplete && newState.instructions.length > 0) {
    newState.isComplete = true;
    newState.isRunning = false;
    console.log("✓ SIMULATION COMPLETE");
  }
  
  return newState;
}

/**
 * Compute the result of an arithmetic operation
 */
function computeResult(rs: ReservationStation): number {
  let vj = rs.vj !== null ? rs.vj : 0;
  let vk = rs.vk !== null ? rs.vk : 0;
  const op = rs.op;
  
  // For single-precision operations, treat operands as 32-bit floats
  const isSinglePrecision = op.includes('.S');
  if (isSinglePrecision) {
    vj = Math.fround(vj);
    vk = Math.fround(vk);
  }
  
  console.log(`    Computing: ${op} with Vj=${vj}, Vk=${vk}`);
  
  let result: number;
  
  // Floating-point operations
  if (op.includes('ADD')) {
    result = vj + vk;
    // Single-precision: round result to 32-bit float precision
    if (isSinglePrecision) {
      result = Math.fround(result);
    }
    return result;
  } else if (op.includes('SUB')) {
    result = vj - vk;
    // Single-precision: round result to 32-bit float precision
    if (isSinglePrecision) {
      result = Math.fround(result);
    }
    return result;
  } else if (op.includes('MUL')) {
    result = vj * vk;
    // Single-precision: round result to 32-bit float precision
    if (isSinglePrecision) {
      result = Math.fround(result);
    }
    return result;
  } else if (op.includes('DIV')) {
    if (vk === 0) {
      console.warn(`    Division by zero! Returning 0`);
      return 0;
    }
    result = vj / vk;
    // Single-precision: round result to 32-bit float precision
    if (isSinglePrecision) {
      result = Math.fround(result);
    }
    return result;
  } else if (op === 'DADDI') {
    // Integer add immediate: Vj + Vk (immediate is in Vk)
    return vj + vk;
  } else if (op === 'DSUBI') {
    // Integer subtract immediate: Vj - Vk (immediate is in Vk)
    return vj - vk;
  }
  
  console.warn(`    Unknown operation ${op}, returning Vj`);
  return vj;
}

/**
 * Count how many reservation stations are waiting for this tag
 */
function countFanOut(
  tag: string,
  allStations: ReservationStation[],
  loadStoreBuffers: { load: LoadStoreBuffer[]; store: LoadStoreBuffer[] }
): number {
  let count = 0;
  
  // Check reservation stations
  allStations.forEach(rs => {
    if (rs.busy && (rs.qj === tag || rs.qk === tag)) {
      count++;
    }
  });
  
  // Check load/store buffers
  [...loadStoreBuffers.load, ...loadStoreBuffers.store].forEach(buf => {
    if (buf.busy && (buf.baseRegisterTag === tag || buf.storeValueTag === tag)) {
      count++;
    }
  });
  
  return count;
}

/**
 * Get the longest latency of instructions waiting for this tag
 */
function getCriticalPath(
  tag: string,
  allStations: ReservationStation[],
  config: SimulatorConfig
): number {
  let maxLatency = 0;
  
  allStations.forEach(rs => {
    if (rs.busy && (rs.qj === tag || rs.qk === tag)) {
      const latency = getInstructionLatency(rs.op as InstructionType, config);
      if (latency > maxLatency) {
        maxLatency = latency;
      }
    }
  });
  
  return maxLatency;
}

function writeResultPhase(state: SimulatorState, config: SimulatorConfig): void {
  console.log("PHASE 1: Write Result");
  
  const allStations = [
    ...state.reservationStations.add,
    ...state.reservationStations.mul,
    ...state.reservationStations.intAdd
  ];
  
  // Find stations that finished execution
  const finishedStations = allStations.filter(
    rs => rs.busy && rs.timeRemaining === 0
  );
  
  // Also check load buffers that completed
  const finishedLoads = state.loadStoreBuffers.load.filter(
    buf => buf.busy && buf.stage === 'COMPLETED'
  );
  
  // CDB can only broadcast one result per cycle
  const allFinished = [...finishedStations, ...finishedLoads];
  
  if (allFinished.length > 0) {
    // Select winner based on mode
    if (config.isOptimizationMode) {
      // Heuristic arbitration: fan-out, critical path, then oldest
      allFinished.sort((a, b) => {
        const tagA = a.tag;
        const tagB = b.tag;
        
        // 1. Calculate fan-out (how many RS are waiting for this tag)
        const fanOutA = countFanOut(tagA, allStations, state.loadStoreBuffers);
        const fanOutB = countFanOut(tagB, allStations, state.loadStoreBuffers);
        
        if (fanOutA !== fanOutB) {
          return fanOutB - fanOutA; // Higher fan-out first
        }
        
        // 2. Critical path (longest latency of dependent instructions)
        const criticalPathA = getCriticalPath(tagA, allStations, config);
        const criticalPathB = getCriticalPath(tagB, allStations, config);
        
        if (criticalPathA !== criticalPathB) {
          return criticalPathB - criticalPathA; // Longer critical path first
        }
        
        // 3. Tie-breaker: oldest instruction
        const instIdA = ('instructionId' in a && a.instructionId !== undefined) 
          ? a.instructionId 
          : (a as LoadStoreBuffer).instructionId;
        const instIdB = ('instructionId' in b && b.instructionId !== undefined) 
          ? b.instructionId 
          : (b as LoadStoreBuffer).instructionId;
        
        const instA = state.instructions.find(i => i.id === instIdA);
        const instB = state.instructions.find(i => i.id === instIdB);
        
        const issueA = instA?.issueCycle ?? Infinity;
        const issueB = instB?.issueCycle ?? Infinity;
        return issueA - issueB;
      });
    } else {
      // Default: oldest instruction first
      allFinished.sort((a, b) => {
        const instIdA = ('instructionId' in a && a.instructionId !== undefined) 
          ? a.instructionId 
          : (a as LoadStoreBuffer).instructionId;
        const instIdB = ('instructionId' in b && b.instructionId !== undefined) 
          ? b.instructionId 
          : (b as LoadStoreBuffer).instructionId;
        
        const instA = state.instructions.find(i => i.id === instIdA);
        const instB = state.instructions.find(i => i.id === instIdB);
        
        const issueA = instA?.issueCycle ?? Infinity;
        const issueB = instB?.issueCycle ?? Infinity;
        return issueA - issueB;
      });
    }
    
    const broadcasting = allFinished[0];
    const tag = broadcasting.tag;
    
    // Calculate the actual result based on operation
    let value: number;
    if ('value' in broadcasting) {
      // Load buffer - value already computed
      value = broadcasting.value !== null ? broadcasting.value : 0;
    } else {
      // Reservation station - compute result
      const rs = broadcasting as ReservationStation;
      value = computeResult(rs);
    }
    
    console.log(`  CDB Broadcasting: ${tag} = ${value}`);
    
    // Update instruction status using instructionId
    let inst: typeof state.instructions[0] | undefined;
    if ('instructionId' in broadcasting && broadcasting.instructionId !== undefined) {
      inst = state.instructions.find(i => i.id === broadcasting.instructionId);
    } else {
      // Fallback for load buffers
      inst = state.instructions.find(i => i.id === (broadcasting as LoadStoreBuffer).instructionId);
    }
    
    if (inst && inst.writeResultCycle === undefined) {
      inst.writeResultCycle = state.cycle;
      console.log(`  Instruction ${inst.id} (${inst.raw}) completed`);
    }
    
    // Update all registers waiting for this tag
    [...state.registers.float, ...state.registers.int].forEach(reg => {
      if (reg.qi === tag) {
        reg.value = value || 0;
        reg.qi = null;
        console.log(`  Register ${reg.name} updated to ${reg.value}`);
      } else if (inst && reg.name === inst.dest && reg.qi !== null && reg.qi !== tag) {
        // WAW hazard: This instruction writes to this register, but register was renamed by a later instruction
        // Update the value but keep the qi pointing to the later instruction
        reg.value = value || 0;
        console.log(`  Register ${reg.name} value updated to ${reg.value} (WAW: qi still ${reg.qi})`);
      }
    });
    
    // Update all RS waiting for this tag
    allStations.forEach(rs => {
      let wasWaitingForThis = false;
      if (rs.qj === tag) {
        rs.vj = value || 0;
        rs.qj = null;
        wasWaitingForThis = true;
      }
      if (rs.qk === tag) {
        rs.vk = value || 0;
        rs.qk = null;
        wasWaitingForThis = true;
      }
      // Mark when operands became ready (only if THIS broadcast made both operands ready)
      if (wasWaitingForThis && rs.busy && rs.qj === null && rs.qk === null && rs.operandsReadyCycle === undefined) {
        rs.operandsReadyCycle = state.cycle;
      }
    });
    
    // Update load/store buffers waiting for base register or store value
    [...state.loadStoreBuffers.load, ...state.loadStoreBuffers.store].forEach(buf => {
      if (buf.busy) {
        // Update base register dependency
        if (buf.baseRegisterTag === tag) {
          const inst = state.instructions.find(i => i.id === buf.instructionId);
          const offset = inst?.immediate || 0;
          buf.address = (value || 0) + offset;
          buf.baseRegisterTag = null;
          console.log(`  ${buf.tag} base register resolved, address: ${buf.address}`);
        }
        
        // Update store value dependency
        if (buf.storeValueTag === tag) {
          buf.value = value || 0;
          buf.storeValueTag = null;
          console.log(`  ${buf.tag} store value resolved: ${buf.value}`);
        }
      }
    });
    
    // Free the broadcasting unit
    broadcasting.busy = false;
    broadcasting.timeRemaining = 0;
    if ('instructionId' in broadcasting) {
      broadcasting.instructionId = undefined;
    }
    if ('stage' in broadcasting) {
      broadcasting.stage = 'ADDRESS_CALC';
    }
  }
}

function executePhase(state: SimulatorState, config: SimulatorConfig): void {
  console.log("PHASE 2: Execute");
  
  const allStations = [
    ...state.reservationStations.add,
    ...state.reservationStations.mul,
    ...state.reservationStations.intAdd
  ];
  
  // Execute in reservation stations
  allStations.forEach(rs => {
    if (rs.busy && rs.qj === null && rs.qk === null && rs.timeRemaining > 0) {
      // Don't execute in the same cycle operands became ready
      if (rs.operandsReadyCycle !== undefined && rs.operandsReadyCycle === state.cycle) {
        console.log(`  ${rs.tag} operands just became ready, waiting until next cycle to execute`);
        return;
      }
      
      rs.timeRemaining--;
      console.log(`  ${rs.tag} executing: ${rs.timeRemaining} cycles remaining`);
      
      // Update instruction exec timing
      const inst = state.instructions.find(i => i.id === rs.instructionId);
      if (inst && inst.execStartCycle === undefined) {
        inst.execStartCycle = state.cycle;
        inst.execEndCycle = state.cycle + rs.timeRemaining;
      }
    }
  });
  
  // Execute LOAD buffers with proper stages
  state.loadStoreBuffers.load.forEach(buf => {
    if (!buf.busy) return;
    
    const inst = state.instructions.find(i => i.id === buf.instructionId);
    
    // STAGE 1: Address Calculation
    if (buf.stage === 'ADDRESS_CALC') {
      // Wait for base register if needed
      if (buf.baseRegisterTag !== null) {
        console.log(`  ${buf.tag} waiting for base register from ${buf.baseRegisterTag}`);
        return;
      }
      
      // Execute address calculation (takes LOAD latency cycles)
      if (buf.timeRemaining > 0) {
        buf.timeRemaining--;
        console.log(`  ${buf.tag} calculating address: ${buf.timeRemaining} cycles remaining`);
        
        // Set exec start cycle on first execution
        if (inst && inst.execStartCycle === undefined) {
          inst.execStartCycle = state.cycle;
        }
        
        // Address calculation completes
        if (buf.timeRemaining === 0) {
          // Calculate the address now
          const allRegs = [...state.registers.int, ...state.registers.float];
          const baseReg = allRegs.find(r => r.name === inst?.src1);
          const offset = inst?.immediate || 0;
          
          if (baseReg) {
            buf.address = baseReg.value + offset;
          } else {
            buf.address = offset;
          }
          
          console.log(`  ${buf.tag} address calculation complete: ${buf.address}`);
          
          // Set exec end cycle - execution (address calculation) is complete
          if (inst) {
            inst.execEndCycle = state.cycle;
          }
          
          // Check for memory conflicts with older stores
          if (checkMemoryConflicts(buf, state.loadStoreBuffers.store, state.instructions, true)) {
            console.log(`  ${buf.tag} blocked by memory conflict (RAW hazard)`);
            return;
          }
          
          // Check cache (but don't load block yet)
          const { latency, hit } = accessCache(buf.address, config, state, getLoadSize(inst?.type));
          buf.timeRemaining = latency;
          buf.stage = 'MEMORY_ACCESS';
          
          // Store whether this was a hit or miss, and when to load the block
          (buf as any).cacheHit = hit;
          // For cache miss, block should appear after miss penalty (not including hit latency)
          (buf as any).cyclesUntilBlockLoaded = hit ? 0 : config.cache.missLatency;
          
          console.log(`  ${buf.tag} starting memory access (${hit ? 'HIT' : 'MISS'}): ${latency} cycles`);
          
          // If latency is 0, complete immediately
          if (latency === 0) {
            if (!hit) {
              loadBlockIntoCache(buf.address, config, state);
            }
            buf.value = loadValueFromMemory(buf.address, inst?.type, state.memory);
            buf.stage = 'COMPLETED';
            console.log(`  ${buf.tag} loaded value ${buf.value} from address ${buf.address} (instant)`);
          }
          
          // Return here - don't decrement in the same cycle we transition
          return;
        }
        return;
      }
    }
    
    // STAGE 2: Memory Access (cache access after execution completes)
    if (buf.stage === 'MEMORY_ACCESS' && buf.timeRemaining > 0) {
      buf.timeRemaining--;
      
      // Check if we should load the block into cache (after miss penalty only, not hit latency)
      const wasCacheHit = (buf as any).cacheHit;
      let cyclesUntilBlockLoaded = (buf as any).cyclesUntilBlockLoaded;
      
      if (!wasCacheHit && cyclesUntilBlockLoaded !== undefined) {
        cyclesUntilBlockLoaded--;
        (buf as any).cyclesUntilBlockLoaded = cyclesUntilBlockLoaded;
        
        if (cyclesUntilBlockLoaded === 0 && buf.address !== null) {
          // Miss penalty complete - load block into cache now
          loadBlockIntoCache(buf.address, config, state);
        }
      }
      
      console.log(`  ${buf.tag} memory access: ${buf.timeRemaining} cycles remaining`);
      
      if (buf.timeRemaining === 0 && buf.address !== null) {
        // Cache access completes (miss penalty + hit latency)
        // Fetch value from memory
        buf.value = loadValueFromMemory(buf.address, inst?.type, state.memory);
        buf.stage = 'COMPLETED';
        
        console.log(`  ${buf.tag} loaded value ${buf.value} from address ${buf.address}`);
      }
    }
  });
  
  // Execute STORE buffers with proper stages
  state.loadStoreBuffers.store.forEach(buf => {
    if (!buf.busy) return;
    
    const inst = state.instructions.find(i => i.id === buf.instructionId);
    
    // STAGE 1: Address Calculation
    if (buf.stage === 'ADDRESS_CALC') {
      // Wait for base register if needed
      if (buf.baseRegisterTag !== null) {
        console.log(`  ${buf.tag} waiting for base register from ${buf.baseRegisterTag}`);
        return;
      }
      
      // Wait for store value if needed
      if (buf.storeValueTag !== null) {
        console.log(`  ${buf.tag} waiting for store value from ${buf.storeValueTag}`);
        return;
      }
      
      // Address and value are ready, move to memory access
      if (buf.address !== null && buf.value !== null) {
        console.log(`  ${buf.tag} address calculated: ${buf.address}, value: ${buf.value}`);
        
        // Check for memory conflicts with older loads/stores
        if (checkMemoryConflicts(buf, state.loadStoreBuffers.load, state.instructions, false)) {
          console.log(`  ${buf.tag} blocked by memory conflict (WAR/WAW hazard)`);
          return;
        }
        
        if (checkMemoryConflicts(buf, state.loadStoreBuffers.store, state.instructions, false)) {
          console.log(`  ${buf.tag} blocked by memory conflict (WAW hazard)`);
          return;
        }
        
        // Start cache access
        const { latency, hit } = accessCache(buf.address, config, state, getStoreSize(inst?.type));
        buf.timeRemaining = latency;
        buf.stage = 'MEMORY_ACCESS';
        
        if (inst && inst.execStartCycle === undefined) {
          inst.execStartCycle = state.cycle;
        }
        
        console.log(`  ${buf.tag} starting memory access (${hit ? 'HIT' : 'MISS'}): ${latency} cycles`);
        // Don't decrement in the same cycle we start - return here
        return;
      }
    }
    
    // STAGE 2: Memory Access
    if (buf.stage === 'MEMORY_ACCESS' && buf.timeRemaining > 0) {
      buf.timeRemaining--;
      console.log(`  ${buf.tag} memory access: ${buf.timeRemaining} cycles remaining`);
      
      if (buf.timeRemaining === 0 && buf.address !== null && buf.value !== null) {
        // Store completes - write to memory with proper byte ordering
        storeValueToMemory(buf.address, buf.value, inst?.type, state.memory);
        
        // Update cache with new value (using same block calculation as accessCache)
        const blockSize = config.cache.blockSize;
        const cacheSize = config.cache.cacheSize;
        const numCacheBlocks = cacheSize / blockSize;
        const memoryBlockNum = Math.floor(buf.address / blockSize);
        const cacheIndex = memoryBlockNum % numCacheBlocks;
        
        const cacheBlock = state.cache.get(cacheIndex);
        if (cacheBlock && cacheBlock.valid && cacheBlock.tag === memoryBlockNum) {
          // Update all bytes in cache that were written
          const numBytes = getStoreSize(inst?.type);
          for (let i = 0; i < numBytes; i++) {
            const offsetInBlock = (buf.address + i) % blockSize;
            const byte = (buf.value >> (i * 8)) & 0xFF;
            cacheBlock.data[offsetInBlock] = byte;
          }
          console.log(`    Updated cache block ${cacheIndex} with ${numBytes} bytes`);
        }
        
        buf.stage = 'COMPLETED';
        buf.busy = false;
        
        if (inst) {
          inst.execEndCycle = state.cycle;
          inst.writeResultCycle = state.cycle; // Stores complete without CDB
        }
        
        console.log(`  ${buf.tag} stored value ${buf.value} to address ${buf.address}`);
      }
    }
  });
}

function issuePhase(state: SimulatorState, config: SimulatorConfig): void {
  console.log("PHASE 3: Issue");
  
  // Find next instruction to issue
  const nextInst = state.instructions.find(i => i.issueCycle === undefined);
  if (!nextInst) {
    console.log("  No more instructions to issue");
    return;
  }
  
  const type = nextInst.type;
  let targetStations: ReservationStation[] | LoadStoreBuffer[] = [];
  let isLoadStore = false;
  
  // Determine which RS/Buffer to use
  if (type === 'DADDI' || type === 'DSUBI') {
    targetStations = state.reservationStations.intAdd;
  } else if (type.includes('ADD') || type.includes('SUB')) {
    targetStations = state.reservationStations.add;
  } else if (type.includes('MUL') || type.includes('DIV')) {
    targetStations = state.reservationStations.mul;
  } else if (type.startsWith('L') || (type.includes('.') && type.startsWith('L'))) {
    targetStations = state.loadStoreBuffers.load;
    isLoadStore = true;
  } else if (type.startsWith('S')) {
    targetStations = state.loadStoreBuffers.store;
    isLoadStore = true;
  }
  
  // Find free station
  const freeStation = targetStations.find(s => !s.busy);
  if (!freeStation) {
    console.log(`  Structural hazard: No free ${type} station`);
    return;
  }
  
  // Issue instruction
  console.log(`  Issuing instruction ${nextInst.id}: ${nextInst.raw} to ${freeStation.tag}`);
  nextInst.issueCycle = state.cycle;
  freeStation.busy = true;
  
  if (isLoadStore) {
    const buf = freeStation as LoadStoreBuffer;
    buf.instructionId = nextInst.id;
    buf.stage = 'ADDRESS_CALC';
    buf.value = null;
    buf.address = null;
    buf.baseRegisterTag = null;
    buf.storeValueTag = null;
    
    // Get base register for address calculation
    const allRegs = [...state.registers.int, ...state.registers.float];
    const baseReg = allRegs.find(r => r.name === nextInst.src1);
    const offset = nextInst.immediate || 0;
    
    if (type.startsWith('L')) {
      // LOAD: Will calculate address over LOAD latency cycles
      if (baseReg) {
        if (baseReg.qi === null) {
          // Base register ready, will calculate address during execution
          buf.timeRemaining = getInstructionLatency(type as InstructionType, config);
          console.log(`    Base register ${baseReg.name} ready, will compute address over ${buf.timeRemaining} cycles`);
        } else {
          // Base register not ready, wait for it
          buf.baseRegisterTag = baseReg.qi;
          buf.timeRemaining = 0;
          console.log(`    Waiting for base register ${baseReg.name} from ${baseReg.qi}`);
        }
      } else {
        // No base register (should not happen in valid code)
        buf.timeRemaining = getInstructionLatency(type as InstructionType, config);
      }
    } else {
      // STORE: Calculate address immediately (stores work differently)
      buf.timeRemaining = 0;
      if (baseReg) {
        if (baseReg.qi === null) {
          buf.address = baseReg.value + offset;
          console.log(`    Address calculated: ${baseReg.name}(${baseReg.value}) + ${offset} = ${buf.address}`);
        } else {
          buf.baseRegisterTag = baseReg.qi;
          console.log(`    Waiting for base register ${baseReg.name} from ${baseReg.qi}`);
        }
      } else {
        buf.address = offset;
      }
    }
    
    if (type.startsWith('S')) {
      // STORE: need to get value from source register (dest field contains the source)
      const srcReg = allRegs.find(r => r.name === nextInst.dest);
      if (srcReg) {
        if (srcReg.qi === null) {
          buf.value = srcReg.value;
          console.log(`    Store value ready: ${srcReg.name} = ${buf.value}`);
        } else {
          buf.storeValueTag = srcReg.qi;
          console.log(`    Waiting for store value ${srcReg.name} from ${srcReg.qi}`);
        }
      }
    } else if (type.startsWith('L')) {
      // LOAD: register renaming for destination
      const destReg = allRegs.find(r => r.name === nextInst.dest);
      if (destReg) {
        destReg.qi = buf.tag;
        console.log(`    Register ${destReg.name} renamed to ${buf.tag}`);
      }
    }
  } else {
    const rs = freeStation as ReservationStation;
    rs.op = type;
    rs.a = nextInst.immediate || null;
    rs.timeRemaining = getInstructionLatency(type, config);
    rs.operandsReadyCycle = undefined; // Reset for new instruction
    rs.instructionId = nextInst.id; // Track which instruction this is
    
    // Get source operands
    const allRegs = [...state.registers.float, ...state.registers.int];
    
    console.log(`    Operands: src1=${nextInst.src1}, src2=${nextInst.src2}, dest=${nextInst.dest}`);
    
    if (nextInst.src1) {
      const src1Reg = allRegs.find(r => r.name === nextInst.src1);
      console.log(`    src1Reg found: ${src1Reg ? `${src1Reg.name}=${src1Reg.value}, qi=${src1Reg.qi}` : 'NOT FOUND'}`);
      if (src1Reg) {
        if (src1Reg.qi === null) {
          rs.vj = src1Reg.value;
          rs.qj = null;
          console.log(`    Set Vj=${rs.vj}, Qj=${rs.qj}`);
        } else {
          rs.vj = null;
          rs.qj = src1Reg.qi;
          console.log(`    RAW hazard: waiting for ${src1Reg.qi}, set Vj=${rs.vj}, Qj=${rs.qj}`);
        }
      }
    }
    
    // For DADDI/DSUBI, immediate goes into Vk, otherwise use src2 register
    if (type === 'DADDI' || type === 'DSUBI') {
      // Immediate value goes directly into Vk
      rs.vk = nextInst.immediate !== undefined ? nextInst.immediate : 0;
      rs.qk = null;
      console.log(`    Immediate set: Vk=${rs.vk}, Qk=${rs.qk}`);
    } else if (nextInst.src2) {
      const src2Reg = allRegs.find(r => r.name === nextInst.src2);
      console.log(`    src2Reg found: ${src2Reg ? `${src2Reg.name}=${src2Reg.value}, qi=${src2Reg.qi}` : 'NOT FOUND'}`);
      if (src2Reg) {
        if (src2Reg.qi === null) {
          rs.vk = src2Reg.value;
          rs.qk = null;
          console.log(`    Set Vk=${rs.vk}, Qk=${rs.qk}`);
        } else {
          rs.vk = null;
          rs.qk = src2Reg.qi;
          console.log(`    RAW hazard: waiting for ${src2Reg.qi}, set Vk=${rs.vk}, Qk=${rs.qk}`);
        }
      }
    }
    
    // Register renaming (WAR/WAW handling)
    if (nextInst.dest) {
      const destReg = allRegs.find(r => r.name === nextInst.dest);
      if (destReg) {
        destReg.qi = rs.tag;
        console.log(`    Register ${destReg.name} renamed to ${rs.tag}`);
      }
    }
  }
}

/**
 * Check for memory conflicts (RAW, WAR, WAW) between memory operations
 * @param currentBuf - The current buffer checking for conflicts
 * @param otherBuffers - Other buffers to check against
 * @param instructions - All instructions for ordering
 * @param isLoad - True if checking for a LOAD, false for STORE
 * @returns True if there's a conflict (should block), false otherwise
 */
function checkMemoryConflicts(
  currentBuf: LoadStoreBuffer,
  otherBuffers: LoadStoreBuffer[],
  instructions: Instruction[],
  isLoad: boolean
): boolean {
  const currentInst = instructions.find(i => i.id === currentBuf.instructionId);
  if (!currentInst || currentBuf.address === null) return false;
  
  for (const otherBuf of otherBuffers) {
    if (!otherBuf.busy || otherBuf.address === null) continue;
    if (otherBuf.tag === currentBuf.tag) continue;
    
    const otherInst = instructions.find(i => i.id === otherBuf.instructionId);
    if (!otherInst) continue;
    
    // Check if addresses conflict (same block)
    if (currentBuf.address !== otherBuf.address) continue;
    
    // Check program order: only block if the other instruction is older
    const isOlder = otherInst.id < currentInst.id;
    if (!isOlder) continue;
    
    // Check if the other instruction is still in progress
    const otherComplete = otherBuf.stage === 'COMPLETED' || !otherBuf.busy;
    if (otherComplete) continue;
    
    // Conflict found
    if (isLoad) {
      // LOAD blocked by older STORE with same address (RAW hazard)
      console.log(`    RAW hazard: ${currentBuf.tag} blocked by older ${otherBuf.tag} at address ${currentBuf.address}`);
    } else {
      // STORE blocked by older LOAD or STORE (WAR/WAW hazard)
      console.log(`    WAR/WAW hazard: ${currentBuf.tag} blocked by older ${otherBuf.tag} at address ${currentBuf.address}`);
    }
    return true;
  }
  
  return false;
}

/**
 * Check cache for hit/miss and return latency (does NOT update cache)
 * Cache is direct-mapped: cache_index = block_number % num_cache_blocks
 * Block number = address / block_size
 * @param address - Memory address to access
 * @param config - Simulator configuration
 * @param state - Current simulator state
 * @param accessSize - Size in bytes (4 for word, 8 for double)
 * @returns Object with latency, hit/miss status, and cache location info
 */
function accessCache(
  address: number,
  config: SimulatorConfig,
  state: SimulatorState,
  accessSize: number
): { latency: number; hit: boolean; cacheIndex: number; memoryBlockNum: number } {
  const blockSize = config.cache.blockSize;
  const cacheSize = config.cache.cacheSize;
  const numCacheBlocks = cacheSize / blockSize;
  
  // Calculate which memory block this address belongs to
  const memoryBlockNum = Math.floor(address / blockSize);
  
  // Calculate cache index (direct-mapped)
  const cacheIndex = memoryBlockNum % numCacheBlocks;
  
  // Check if block is in cache
  const cacheBlock = state.cache.get(cacheIndex);
  
  if (cacheBlock && cacheBlock.valid && cacheBlock.tag === memoryBlockNum) {
    // Cache hit
    console.log(`    Cache HIT at address ${address} (mem block ${memoryBlockNum} -> cache index ${cacheIndex})`);
    return { latency: config.cache.hitLatency, hit: true, cacheIndex, memoryBlockNum };
  } else {
    // Cache miss - will need to fetch block from memory
    // Total latency = miss penalty + hit latency, but block appears after miss penalty only
    console.log(`    Cache MISS at address ${address} (mem block ${memoryBlockNum} -> cache index ${cacheIndex})`);
    return { latency: config.cache.missLatency + config.cache.hitLatency, hit: false, cacheIndex, memoryBlockNum };
  }
}

/**
 * Load a block into the cache (called after miss penalty completes)
 */
function loadBlockIntoCache(
  address: number,
  config: SimulatorConfig,
  state: SimulatorState
): void {
  const blockSize = config.cache.blockSize;
  const cacheSize = config.cache.cacheSize;
  const numCacheBlocks = cacheSize / blockSize;
  
  const memoryBlockNum = Math.floor(address / blockSize);
  const cacheIndex = memoryBlockNum % numCacheBlocks;
  
  // Fetch entire block from memory
  const blockStartAddr = memoryBlockNum * blockSize;
  const blockData: number[] = [];
  for (let i = 0; i < blockSize; i++) {
    blockData.push(state.memory.get(blockStartAddr + i) || 0);
  }
  
  // Update cache with new block
  state.cache.set(cacheIndex, {
    tag: memoryBlockNum,
    data: blockData,
    valid: true
  });
  
  console.log(`    Block ${memoryBlockNum} loaded into cache index ${cacheIndex}`);
}

/**
 * Load value from memory with proper byte ordering and sign extension
 * @param address - Starting memory address
 * @param type - Instruction type (L.S, L.D, etc.)
 * @param memory - Memory map
 * @returns The loaded value (sign-extended for single-precision)
 */
function loadValueFromMemory(
  address: number,
  type: InstructionType | undefined,
  memory: Map<number, number>
): number {
  if (!type) return memory.get(address) || 0;
  
  // Determine how many bytes to load
  const isDoublePrecision = type === 'LD' || type === 'L.D';
  const numBytes = isDoublePrecision ? 8 : 4;
  
  // Load bytes from memory (little-endian: LSB at lowest address)
  // For address 20: M20 (LSB), M21, M22, M23 (MSB for 4 bytes)
  const bytes: number[] = [];
  for (let i = 0; i < numBytes; i++) {
    bytes.push(memory.get(address + i) || 0);
  }
  
  console.log(`    Loading ${numBytes} bytes from address ${address}: [${bytes.join(', ')}]`);
  
  if (isDoublePrecision) {
    // For double-precision (64-bit), use BigInt to avoid 32-bit truncation
    // Read lower 32-bit word (bytes 0-3)
    let lowerWord = 0;
    for (let i = 0; i < 4; i++) {
      lowerWord |= (bytes[i] & 0xFF) << (i * 8);
    }
    // Ensure it's treated as unsigned 32-bit
    lowerWord = lowerWord >>> 0;
    
    // Read upper 32-bit word (bytes 4-7)
    let upperWord = 0;
    for (let i = 0; i < 4; i++) {
      upperWord |= (bytes[4 + i] & 0xFF) << (i * 8);
    }
    // Ensure it's treated as unsigned 32-bit
    upperWord = upperWord >>> 0;
    
    // Combine using BigInt: FinalResult = BigInt(LowerWord) | (BigInt(UpperWord) << 32n)
    const lowerBigInt = BigInt(lowerWord);
    const upperBigInt = BigInt(upperWord);
    const combined = lowerBigInt | (upperBigInt << 32n);
    
    // Convert back to JavaScript number (as 64-bit float)
    const value = Number(combined);
    
    console.log(`    Double-precision: Lower=0x${lowerWord.toString(16).padStart(8, '0')}, Upper=0x${upperWord.toString(16).padStart(8, '0')}`);
    console.log(`    Combined value: 0x${combined.toString(16).padStart(16, '0')} = ${value}`);
    
    return value;
  } else {
    // For single-precision (32-bit), combine bytes normally
    let value = 0;
    for (let i = 0; i < 4; i++) {
      value |= (bytes[i] & 0xFF) << (i * 8);
    }
    
    // Check if the MSB (bit 31) is set for sign extension
    const isNegative = (value & 0x80000000) !== 0;
    if (isNegative) {
      // Sign extend to 64-bit by filling upper 32 bits with 1s
      // Convert to signed 32-bit integer first
      value = value | 0; // Force to signed 32-bit
    }
    
    console.log(`    Single-precision value (sign-extended): ${value}`);
    return value;
  }
}

/**
 * Store value to memory with proper byte ordering
 * @param address - Starting memory address
 * @param value - Value to store
 * @param type - Instruction type (S.S, S.D, etc.)
 * @param memory - Memory map
 */
function storeValueToMemory(
  address: number,
  value: number,
  type: InstructionType | undefined,
  memory: Map<number, number>
): void {
  if (!type) {
    memory.set(address, value);
    return;
  }
  
  // Determine how many bytes to store
  const isDoublePrecision = type === 'SD' || type === 'S.D';
  const numBytes = isDoublePrecision ? 8 : 4;
  
  // For single-precision, mask to 32 bits (ignore sign extension)
  let valueToStore = value;
  if (!isDoublePrecision) {
    valueToStore = value & 0xFFFFFFFF;
  }
  
  console.log(`    Storing ${numBytes} bytes to address ${address}, value: ${valueToStore}`);
  
  // Store bytes to memory (little-endian: LSB at lowest address)
  // For value 0x12345678 at address 20: M20=0x78, M21=0x56, M22=0x34, M23=0x12
  for (let i = 0; i < numBytes; i++) {
    const byte = (valueToStore >> (i * 8)) & 0xFF;
    memory.set(address + i, byte);
    console.log(`      M[${address + i}] = ${byte}`);
  }
}

/**
 * Get the size in bytes for a LOAD instruction
 */
function getLoadSize(type?: InstructionType): number {
  if (!type) return 4;
  
  // LW, L.S = 4 bytes (word/single-precision float)
  // LD, L.D = 8 bytes (double word/double-precision float)
  if (type === 'LD' || type === 'L.D') return 8;
  return 4;
}

/**
 * Get the size in bytes for a STORE instruction
 */
function getStoreSize(type?: InstructionType): number {
  if (!type) return 4;
  
  // SW, S.S = 4 bytes (word/single-precision float)
  // SD, S.D = 8 bytes (double word/double-precision float)
  if (type === 'SD' || type === 'S.D') return 8;
  return 4;
}

export function getInstructionLatency(type: InstructionType, config: SimulatorConfig): number {
  if (type === 'DADDI' || type === 'DSUBI') {
    return config.latencies.INT_ADD;
  }
  if (type.includes('ADD') || type.includes('SUB')) {
    return config.latencies.ADD;
  }
  if (type.includes('MUL')) {
    return config.latencies.MUL;
  }
  if (type.includes('DIV')) {
    return config.latencies.DIV;
  }
  // Only treat explicit load mnemonics as LOAD latency
  if (type.startsWith('L')) {
    return config.latencies.LOAD;
  }
  // Stores use STORE latency
  if (type.startsWith('S')) {
    return config.latencies.STORE;
  }
  return 1;
}
