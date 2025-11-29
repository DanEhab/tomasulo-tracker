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
    const parts = line.trim().replace(/,/g, ' ').split(/\s+/);
    const type = parts[0].toUpperCase() as InstructionType;
    
    return {
      id: index,
      raw: line.trim(),
      type,
      dest: parts[1],
      src1: parts[2],
      src2: parts[3],
      immediate: parts[2] ? parseFloat(parts[2]) : undefined,
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
  const newState = { ...state, cycle: state.cycle + 1 };
  
  // Simplified simulation step - this is a placeholder
  // Full implementation would handle:
  // 1. Write Result stage (CDB broadcast)
  // 2. Execute stage (decrement time remaining)
  // 3. Issue stage (assign to RS if available)
  
  // Check if all instructions are complete
  const allComplete = state.instructions.every(
    inst => inst.writeResultCycle !== undefined && inst.writeResultCycle <= state.cycle
  );
  
  if (allComplete && state.instructions.length > 0) {
    newState.isComplete = true;
    newState.isRunning = false;
  }
  
  return newState;
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
