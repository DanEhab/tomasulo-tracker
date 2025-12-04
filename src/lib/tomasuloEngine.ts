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
    
    // Handle split opcode tokens like "L. D" or "ADD. D" by merging
    let opcode = parts[0].toUpperCase();
    if (opcode.endsWith('.') && parts.length > 1 && parts[1].length === 1) {
      opcode = (opcode + parts[1].toUpperCase());
      parts.splice(1, 1);
    }
    const type = opcode as InstructionType;
    
    // Handle different instruction formats
    let dest, src1, src2, immediate;
    
    if (type.startsWith('L') || type.startsWith('S')) {
      // Load/Store: L.D F6, 0(R2) -> dest=F6, immediate=0, src1=R2
      dest = parts[1];
      immediate = parseFloat(parts[2]) || 0;
      src1 = parts[3];
    } else if (type === 'DADDI' || type === 'DSUBI') {
      dest = parts[1];
      src1 = parts[2];
      immediate = parseFloat(parts[3]);
    } else if (type === 'BNE' || type === 'BEQ') {
      src1 = parts[1];
      src2 = parts[2];
      dest = parts[3];
    } else {
      // Arithmetic: MUL.D F0, F2, F4
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

  // Apply initial registers
  if (config.initialRegisters) {
    Object.entries(config.initialRegisters).forEach(([name, value]) => {
      const reg = [...baseState.registers.int, ...baseState.registers.float]
        .find(r => r.name.toUpperCase() === name.toUpperCase());
      if (reg) {
        reg.value = value;
      }
    });
  }

  // Apply initial memory
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
  const newState = JSON.parse(JSON.stringify(state));
  newState.cycle = state.cycle + 1;
  
  // PHASE 1: Write Result (CDB Broadcast)
  writeResultPhase(newState);
  
  // PHASE 2: Execute
  executePhase(newState, config);
  
  // PHASE 3: Issue
  issuePhase(newState, config);
  
  // Check completion
  const allComplete = newState.instructions.every(
    inst => inst.writeResultCycle !== undefined
  );
  
  if (allComplete && newState.instructions.length > 0) {
    newState.isComplete = true;
    newState.isRunning = false;
  }
  
  return newState;
}

function writeResultPhase(state: SimulatorState): void {
  const allStations = [
    ...state.reservationStations.add,
    ...state.reservationStations.mul
  ];
  
  // Find finished stations and loads
  const finishedStations = allStations.filter(rs => rs.busy && rs.timeRemaining === 0);
  const finishedLoads = state.loadStoreBuffers.load.filter(buf => buf.busy && buf.timeRemaining === 0);
  
  const allFinished = [...finishedStations, ...finishedLoads];
  
  if (allFinished.length > 0) {
    const broadcasting = allFinished[0];
    const tag = broadcasting.tag;
    const value = 'value' in broadcasting ? (broadcasting.value ?? 0) : (broadcasting.vj ?? 0);
    
    // Mark instruction complete
    let inst: Instruction | undefined;
    if ('instructionId' in broadcasting && broadcasting.instructionId !== undefined) {
      inst = state.instructions.find(i => i.id === broadcasting.instructionId);
    }
    if (!inst) {
      inst = state.instructions.find(i => 
        i.issueCycle !== undefined && i.writeResultCycle === undefined &&
        (state.registers.float.find(r => r.name === i.dest && r.qi === tag) ||
         state.registers.int.find(r => r.name === i.dest && r.qi === tag))
      );
    }
    if (inst) {
      inst.writeResultCycle = state.cycle;
    }
    
    // Update registers
    [...state.registers.float, ...state.registers.int].forEach(reg => {
      if (reg.qi === tag) {
        reg.value = value;
        reg.qi = null;
      }
    });
    
    // Update reservation stations
    allStations.forEach(rs => {
      if (rs.qj === tag) {
        rs.vj = value;
        rs.qj = null;
      }
      if (rs.qk === tag) {
        rs.vk = value;
        rs.qk = null;
      }
    });
    
    // Update store buffers waiting for value
    state.loadStoreBuffers.store.forEach(buf => {
      if (buf.busy && buf.value === null && buf.instructionId !== undefined) {
        const storeInst = state.instructions.find(i => i.id === buf.instructionId);
        if (storeInst) {
          const srcReg = [...state.registers.float, ...state.registers.int]
            .find(r => r.name === storeInst.dest);
          if (srcReg && srcReg.qi === null) {
            buf.value = srcReg.value;
          }
        }
      }
    });
    
    // Free the broadcasting unit
    broadcasting.busy = false;
    broadcasting.timeRemaining = 0;
    if ('instructionId' in broadcasting) {
      broadcasting.instructionId = undefined;
    }
    if ('address' in broadcasting) {
      broadcasting.address = null;
      broadcasting.value = null;
    }
  }
}

function executePhase(state: SimulatorState, config: SimulatorConfig): void {
  const allStations = [
    ...state.reservationStations.add,
    ...state.reservationStations.mul
  ];
  
  // Execute in reservation stations
  allStations.forEach(rs => {
    if (rs.busy && rs.qj === null && rs.qk === null && rs.timeRemaining > 0) {
      const inst = state.instructions.find(i => {
        const destReg = [...state.registers.float, ...state.registers.int]
          .find(r => r.name === i.dest);
        return destReg && destReg.qi === rs.tag && i.execStartCycle === undefined;
      });
      if (inst && inst.execStartCycle === undefined) {
        inst.execStartCycle = state.cycle;
        inst.execEndCycle = state.cycle + rs.timeRemaining - 1;
      }
      rs.timeRemaining--;
    }
  });
  
  // Execute in load buffers
  state.loadStoreBuffers.load.forEach(buf => {
    if (buf.busy && buf.timeRemaining > 0) {
      const inst = state.instructions.find(i => i.id === buf.instructionId);
      if (inst && inst.execStartCycle === undefined) {
        inst.execStartCycle = state.cycle;
        inst.execEndCycle = state.cycle + buf.timeRemaining - 1;
      }
      buf.timeRemaining--;
    }
  });
  
  // Execute in store buffers
  state.loadStoreBuffers.store.forEach(buf => {
    if (buf.busy && buf.value !== null && buf.address !== null && buf.timeRemaining > 0) {
      buf.timeRemaining--;
      
      if (buf.timeRemaining === 0) {
        state.memory.set(buf.address, buf.value);
        const inst = state.instructions.find(i => i.id === buf.instructionId);
        if (inst && inst.writeResultCycle === undefined) {
          inst.execEndCycle = state.cycle;
          inst.writeResultCycle = state.cycle;
        }
        buf.busy = false;
        buf.instructionId = undefined;
        buf.address = null;
        buf.value = null;
      }
    }
  });
}

function issuePhase(state: SimulatorState, config: SimulatorConfig): void {
  const nextInst = state.instructions.find(i => i.issueCycle === undefined);
  if (!nextInst) return;
  
  const type = nextInst.type;
  let targetStations: ReservationStation[] | LoadStoreBuffer[] = [];
  let isLoadStore = false;
  
  // Determine target
  if (type.includes('ADD') || type.includes('SUB') || type === 'DADDI' || type === 'DSUBI') {
    targetStations = state.reservationStations.add;
  } else if (type.includes('MUL') || type.includes('DIV')) {
    targetStations = state.reservationStations.mul;
  } else if (type.startsWith('L')) {
    targetStations = state.loadStoreBuffers.load;
    isLoadStore = true;
  } else if (type.startsWith('S')) {
    targetStations = state.loadStoreBuffers.store;
    isLoadStore = true;
  }
  
  const freeStation = targetStations.find(s => !s.busy);
  if (!freeStation) return; // Structural hazard
  
  // Issue
  nextInst.issueCycle = state.cycle;
  freeStation.busy = true;
  
  if (isLoadStore) {
    const buf = freeStation as LoadStoreBuffer;
    buf.instructionId = nextInst.id;
    
    // Calculate address
    const baseReg = [...state.registers.int, ...state.registers.float]
      .find(r => r.name === nextInst.src1);
    buf.address = (baseReg?.value || 0) + (nextInst.immediate || 0);
    buf.timeRemaining = getInstructionLatency(type, config);
    
    if (type.startsWith('L')) {
      // Load: fetch from memory and rename dest register
      buf.value = state.memory.get(buf.address) || 0;
      const destReg = [...state.registers.float, ...state.registers.int]
        .find(r => r.name === nextInst.dest);
      if (destReg) {
        destReg.qi = buf.tag;
      }
    } else if (type.startsWith('S')) {
      // Store: get value from source register
      const srcReg = [...state.registers.float, ...state.registers.int]
        .find(r => r.name === nextInst.dest);
      if (srcReg) {
        buf.value = srcReg.qi === null ? srcReg.value : null;
      }
    }
  } else {
    const rs = freeStation as ReservationStation;
    rs.op = type;
    rs.a = nextInst.immediate || null;
    rs.timeRemaining = getInstructionLatency(type, config);
    
    const allRegs = [...state.registers.float, ...state.registers.int];
    
    // Get source operands
    if (nextInst.src1) {
      const src1Reg = allRegs.find(r => r.name === nextInst.src1);
      if (src1Reg) {
        if (src1Reg.qi === null) {
          rs.vj = src1Reg.value;
          rs.qj = null;
        } else {
          rs.vj = null;
          rs.qj = src1Reg.qi;
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
        }
      }
    }
    
    // Register renaming
    if (nextInst.dest) {
      const destReg = allRegs.find(r => r.name === nextInst.dest);
      if (destReg) {
        destReg.qi = rs.tag;
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
