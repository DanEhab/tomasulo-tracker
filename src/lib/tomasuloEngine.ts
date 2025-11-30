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
  
  return lines.map((line, index) => {
    const cleaned = line.trim().replace(/,/g, ' ').replace(/\(/g, ' ').replace(/\)/g, ' ');
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
  writeResultPhase(newState);
  
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

function writeResultPhase(state: SimulatorState): void {
  console.log("PHASE 1: Write Result");
  
  const allStations = [
    ...state.reservationStations.add,
    ...state.reservationStations.mul
  ];
  
  // Find stations that finished execution
  const finishedStations = allStations.filter(
    rs => rs.busy && rs.timeRemaining === 0
  );
  
  // Also check load buffers that completed
  const finishedLoads = state.loadStoreBuffers.load.filter(
    buf => buf.busy && buf.stage === 'COMPLETED'
  );
  
  // CDB can only broadcast one result per cycle (first come first serve)
  const allFinished = [...finishedStations, ...finishedLoads];
  
  if (allFinished.length > 0) {
    const broadcasting = allFinished[0];
    const tag = broadcasting.tag;
    const value = 'value' in broadcasting ? broadcasting.value : 
                  (broadcasting.vj !== null ? broadcasting.vj : 0);
    
    console.log(`  CDB Broadcasting: ${tag} = ${value}`);
    
    // Update instruction status
    const inst = state.instructions.find(i => 
      i.issueCycle !== undefined && i.writeResultCycle === undefined &&
      (state.registers.float.find(r => r.name === i.dest && r.qi === tag) ||
       state.registers.int.find(r => r.name === i.dest && r.qi === tag))
    );
    if (inst) {
      inst.writeResultCycle = state.cycle;
      console.log(`  Instruction ${inst.id} (${inst.raw}) completed`);
    }
    
    // Update all registers waiting for this tag
    [...state.registers.float, ...state.registers.int].forEach(reg => {
      if (reg.qi === tag) {
        reg.value = value || 0;
        reg.qi = null;
        console.log(`  Register ${reg.name} updated to ${reg.value}`);
      }
    });
    
    // Update all RS waiting for this tag
    allStations.forEach(rs => {
      if (rs.qj === tag) {
        rs.vj = value || 0;
        rs.qj = null;
      }
      if (rs.qk === tag) {
        rs.vk = value || 0;
        rs.qk = null;
      }
      // Mark when operands became ready (if both are now ready)
      if (rs.busy && rs.qj === null && rs.qk === null && rs.operandsReadyCycle === undefined) {
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
    if ('stage' in broadcasting) {
      broadcasting.stage = 'ADDRESS_CALC';
    }
  }
}

function executePhase(state: SimulatorState, config: SimulatorConfig): void {
  console.log("PHASE 2: Execute");
  
  const allStations = [
    ...state.reservationStations.add,
    ...state.reservationStations.mul
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
      const inst = state.instructions.find(i => {
        const destReg = [...state.registers.float, ...state.registers.int]
          .find(r => r.name === i.dest);
        return destReg && destReg.qi === rs.tag && i.execStartCycle === undefined;
      });
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
      
      // Address is ready, move to memory access
      if (buf.address !== null) {
        console.log(`  ${buf.tag} address calculated: ${buf.address}`);
        
        // Check for memory conflicts with older stores
        if (checkMemoryConflicts(buf, state.loadStoreBuffers.store, state.instructions, true)) {
          console.log(`  ${buf.tag} blocked by memory conflict (RAW hazard)`);
          return;
        }
        
        // Start cache access
        const { latency, hit } = accessCache(buf.address, config, state, getLoadSize(inst?.type));
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
      
      if (buf.timeRemaining === 0 && buf.address !== null) {
        // Load completes - fetch from memory
        buf.value = state.memory.get(buf.address) || 0;
        buf.stage = 'COMPLETED';
        
        if (inst) {
          inst.execEndCycle = state.cycle;
        }
        
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
        // Store completes - write to memory and cache
        state.memory.set(buf.address, buf.value);
        
        // Update cache with new value
        const blockSize = config.cache.blockSize;
        const blockIndex = Math.floor(buf.address / blockSize);
        const cacheBlock = state.cache.get(blockIndex);
        if (cacheBlock && cacheBlock.valid) {
          const offsetInBlock = buf.address % blockSize;
          cacheBlock.data[offsetInBlock] = buf.value;
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
  if (type.includes('ADD') || type.includes('SUB') || type === 'DADDI' || type === 'DSUBI') {
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
    buf.timeRemaining = 0;
    buf.value = null;
    buf.address = null;
    buf.baseRegisterTag = null;
    buf.storeValueTag = null;
    
    // Get base register for address calculation
    const allRegs = [...state.registers.int, ...state.registers.float];
    const baseReg = allRegs.find(r => r.name === nextInst.src1);
    const offset = nextInst.immediate || 0;
    
    if (baseReg) {
      if (baseReg.qi === null) {
        // Base register ready, calculate address immediately
        buf.address = baseReg.value + offset;
        console.log(`    Address calculated: ${baseReg.name}(${baseReg.value}) + ${offset} = ${buf.address}`);
      } else {
        // Base register not ready, wait for it
        buf.baseRegisterTag = baseReg.qi;
        console.log(`    Waiting for base register ${baseReg.name} from ${baseReg.qi}`);
      }
    } else {
      // No base register (should not happen in valid code)
      buf.address = offset;
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
    
    if (nextInst.src2) {
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
 * Simulate cache access and return latency
 * @param address - Memory address to access
 * @param config - Simulator configuration
 * @param state - Current simulator state
 * @param accessSize - Size in bytes (4 for word, 8 for double)
 * @returns Object with latency and hit/miss status
 */
function accessCache(
  address: number,
  config: SimulatorConfig,
  state: SimulatorState,
  accessSize: number
): { latency: number; hit: boolean } {
  const blockSize = config.cache.blockSize;
  const blockIndex = Math.floor(address / blockSize);
  const blockTag = blockIndex;
  
  // Check if block is in cache
  const cacheBlock = state.cache.get(blockIndex);
  
  if (cacheBlock && cacheBlock.valid && cacheBlock.tag === blockTag) {
    // Cache hit
    console.log(`    Cache HIT at address ${address} (block ${blockIndex})`);
    return { latency: config.cache.hitLatency, hit: true };
  } else {
    // Cache miss - need to fetch block from memory
    console.log(`    Cache MISS at address ${address} (block ${blockIndex})`);
    
    // Allocate/update cache block
    const blockStartAddr = blockIndex * blockSize;
    const blockData: number[] = [];
    for (let i = 0; i < blockSize; i++) {
      blockData.push(state.memory.get(blockStartAddr + i) || 0);
    }
    
    state.cache.set(blockIndex, {
      tag: blockTag,
      data: blockData,
      valid: true
    });
    
    return { latency: config.cache.missLatency + config.cache.hitLatency, hit: false };
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
  if (type.includes('ADD') || type.includes('SUB') || type.includes('DADDI') || type.includes('DSUBI')) {
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
