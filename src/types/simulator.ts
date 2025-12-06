// Tomasulo Simulator Types

export type InstructionType = 
  | 'DADDI' | 'DSUBI'
  | 'ADD.D' | 'ADD.S' | 'SUB.D' | 'SUB.S'
  | 'MUL.D' | 'MUL.S' | 'DIV.D' | 'DIV.S'
  | 'LW' | 'LD' | 'L.S' | 'L.D'
  | 'SW' | 'SD' | 'S.S' | 'S.D'
  | 'BNE' | 'BEQ';

export type RegisterType = 'INT' | 'FLOAT';

export interface Instruction {
  id: number;
  raw: string;
  type: InstructionType;
  dest?: string;
  src1?: string;
  src2?: string;
  immediate?: number;
  label?: string; // Optional label for this instruction (e.g., "TARGET:")
  issueCycle?: number;
  execStartCycle?: number;
  execEndCycle?: number;
  writeResultCycle?: number;
}

export interface ReservationStation {
  tag: string;
  busy: boolean;
  op: string;
  vj: number | null;
  vk: number | null;
  qj: string | null;
  qk: string | null;
  a: number | null; // Address or immediate
  timeRemaining: number;
  operandsReadyCycle?: number; // Track when operands became ready
  instructionId?: number; // Track which instruction occupies this station
}

export interface RegisterEntry {
  name: string;
  value: number;
  qi: string | null; // Reservation station tag
  type: RegisterType;
}

export interface LoadStoreBuffer {
  tag: string;
  busy: boolean;
  address: number | null;
  value: number | null;
  timeRemaining: number;
  instructionId?: number; // Track which instruction occupies this buffer
  baseRegisterTag: string | null; // Tag of RS producing base register value
  storeValueTag: string | null; // For stores: tag of RS producing value to store
  stage: 'ADDRESS_CALC' | 'EXECUTING' | 'MEMORY_ACCESS' | 'CACHE_ACCESS' | 'WRITE_BACK' | 'COMPLETED'; // Execution stage
  operandsReadyCycle?: number; // Track when operands became ready (for stores waiting on value)
}

export interface CacheBlock {
  tag: number;
  data: number[];
  valid: boolean;
}

export interface SimulatorConfig {
  latencies: {
    ADD: number;
    MUL: number;
    DIV: number;
    INT_ADD: number;
    LOAD: number;
    STORE: number;
  };
  reservationStations: {
    adders: number;
    multipliers: number;
    intAdders: number;
    loadBuffers: number;
    storeBuffers: number;
  };
  cache: {
    blockSize: number;
    cacheSize: number;
    hitLatency: number;
    missLatency: number;
  };
  // Optional initial state to avoid zero-only runs
  initialRegisters?: {
    [name: string]: number; // e.g., { R2: 16, F0: 1 }
  };
  initialMemory?: Array<{ address: number; value: number }>; // e.g., [{address:0,value:10},{address:8,value:20}]
  // Optimization mode for advanced CDB arbitration
  isOptimizationMode?: boolean;
}

export interface SimulatorState {
  cycle: number;
  instructions: Instruction[]; // Dynamically issued instructions (grows as instructions are issued/re-issued)
  programInstructions: Instruction[]; // Original program instructions (static template)
  nextInstructionIndex: number; // Index in programInstructions to issue next
  reservationStations: {
    add: ReservationStation[];
    mul: ReservationStation[];
    intAdd: ReservationStation[];
  };
  loadStoreBuffers: {
    load: LoadStoreBuffer[];
    store: LoadStoreBuffer[];
  };
  registers: {
    int: RegisterEntry[];
    float: RegisterEntry[];
  };
  memory: Map<number, number>;
  cache: Map<number, CacheBlock>;
  isRunning: boolean;
  isComplete: boolean;
  memoryWrites?: Map<number, { value: number; cycle: number }>; // Track store instruction writes
}
