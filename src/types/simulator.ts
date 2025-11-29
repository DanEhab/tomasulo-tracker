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
