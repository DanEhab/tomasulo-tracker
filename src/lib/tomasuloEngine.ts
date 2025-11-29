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
    const type = parts[0].toUpperCase() as InstructionType;
    
    // Handle different instruction formats
    let dest, src1, src2, immediate;
    
    if (type.startsWith('L') || type.startsWith('S')) {
      // Load/Store: L.D F0, 32(R2) -> dest=F0, immediate=32, src1=R2
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
      // Regular: ADD.D F0, F2, F4 -> dest=F0, src1=F2, src2=F4
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
  }));

  const storeBuffers: LoadStoreBuffer[] = Array.from({ length: config.reservationStations.storeBuffers }, (_, i) => ({
    tag: `Store${i + 1}`,
    busy: false,
    address: null,
    value: null,
    timeRemaining: 0,
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

  return {
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
}

export function executeSimulationStep(
  state: SimulatorState,
  config: SimulatorConfig
): SimulatorState {
  const newState = JSON.parse(JSON.stringify(state)); // Deep clone
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
  
  // Also check load buffers
  const finishedLoads = state.loadStoreBuffers.load.filter(
    buf => buf.busy && buf.timeRemaining === 0
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
      (i.dest === tag || state.registers.float.find(r => r.name === i.dest && r.qi === tag) ||
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
    });
    
    // Update store buffers waiting for value
    state.loadStoreBuffers.store.forEach(buf => {
      if (buf.busy && buf.value === null) {
        const srcReg = state.instructions.find(i => 
          buf.tag.includes('Store') && i.dest && 
          [...state.registers.float, ...state.registers.int].find(r => r.qi === tag)
        );
        if (srcReg) {
          buf.value = value || 0;
        }
      }
    });
    
    // Free the broadcasting unit
    broadcasting.busy = false;
    broadcasting.timeRemaining = 0;
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
  
  // Execute in load buffers
  state.loadStoreBuffers.load.forEach(buf => {
    if (buf.busy && buf.timeRemaining > 0) {
      buf.timeRemaining--;
      console.log(`  ${buf.tag} executing: ${buf.timeRemaining} cycles remaining`);
      
      if (buf.timeRemaining === 0 && buf.address !== null) {
        // Load completes - fetch from memory
        buf.value = state.memory.get(buf.address) || 0;
      }
    }
  });
  
  // Execute in store buffers
  state.loadStoreBuffers.store.forEach(buf => {
    if (buf.busy && buf.value !== null && buf.address !== null && buf.timeRemaining > 0) {
      buf.timeRemaining--;
      console.log(`  ${buf.tag} executing: ${buf.timeRemaining} cycles remaining`);
      
      if (buf.timeRemaining === 0) {
        // Store completes - write to memory
        state.memory.set(buf.address, buf.value);
        buf.busy = false;
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
  } else if (type.startsWith('L') || type.includes('.D') && type.startsWith('L')) {
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
    // Calculate address
    const baseReg = [...state.registers.int, ...state.registers.float]
      .find(r => r.name === nextInst.src1);
    const offset = nextInst.immediate || 0;
    buf.address = (baseReg?.value || 0) + offset;
    buf.timeRemaining = getInstructionLatency(type, config);
    
    if (type.startsWith('S')) {
      // Store: need to get value from source register
      const srcReg = [...state.registers.float, ...state.registers.int]
        .find(r => r.name === nextInst.dest);
      if (srcReg) {
        if (srcReg.qi === null) {
          buf.value = srcReg.value;
        } else {
          buf.value = null; // Wait for CDB
        }
      }
    }
  } else {
    const rs = freeStation as ReservationStation;
    rs.op = type;
    rs.a = nextInst.immediate || null;
    rs.timeRemaining = getInstructionLatency(type, config);
    
    // Get source operands
    const allRegs = [...state.registers.float, ...state.registers.int];
    
    if (nextInst.src1) {
      const src1Reg = allRegs.find(r => r.name === nextInst.src1);
      if (src1Reg) {
        if (src1Reg.qi === null) {
          rs.vj = src1Reg.value;
          rs.qj = null;
        } else {
          rs.vj = null;
          rs.qj = src1Reg.qi;
          console.log(`    RAW hazard: waiting for ${src1Reg.qi}`);
        }
      }
    }
    
    if (nextInst.src2) {
      const src2Reg = allRegs.find(r => r.name === nextInst.src2);
      if (src2Reg) {
        if (src2Reg.qi === null) {
          rs.vk = src2Reg.value;
          rs.qk = null;
        } else {
          rs.vk = null;
          rs.qk = src2Reg.qi;
          console.log(`    RAW hazard: waiting for ${src2Reg.qi}`);
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
  if (type.startsWith('L') || type.includes('.D') || type.includes('.S')) {
    return config.latencies.LOAD;
  }
  if (type.startsWith('S')) {
    return config.latencies.STORE;
  }
  return 1;
}
