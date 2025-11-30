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
  stage: 'ADDRESS_CALC' | 'MEMORY_ACCESS' | 'COMPLETED'; // Execution stage
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
    LOAD: number;
    STORE: number;
  };
  reservationStations: {
    adders: number;
    multipliers: number;
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
}

export interface SimulatorState {
  cycle: number;
  instructions: Instruction[];
  reservationStations: {
    add: ReservationStation[];
    mul: ReservationStation[];
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
}
