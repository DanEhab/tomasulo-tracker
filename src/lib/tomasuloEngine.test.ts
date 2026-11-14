import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { executeSimulationStep, initializeSimulatorState, parseInstructions } from "./tomasuloEngine";
import type { Instruction, SimulatorConfig, SimulatorState } from "../types/simulator";

const baseConfig: SimulatorConfig = {
  latencies: { ADD: 2, MUL: 10, DIV: 40, INT_ADD: 1, LOAD: 2, STORE: 2 },
  reservationStations: { adders: 3, multipliers: 2, intAdders: 2, loadBuffers: 3, storeBuffers: 3 },
  cache: { blockSize: 8, cacheSize: 64, hitLatency: 1, missLatency: 10 },
};

// The engine logs every phase; keep the test output readable.
beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => vi.restoreAllMocks());

function run(code: string, overrides: Partial<SimulatorConfig> = {}): SimulatorState {
  const config = { ...baseConfig, ...overrides };
  let state = initializeSimulatorState(parseInstructions(code), config);
  for (let i = 0; i < 1000 && !state.isComplete; i++) {
    state = executeSimulationStep(state, config);
  }
  expect(state.isComplete).toBe(true);
  return state;
}

function reg(state: SimulatorState, name: string): number {
  const all = [...state.registers.int, ...state.registers.float];
  return all.find((r) => r.name === name)!.value;
}

function byText(state: SimulatorState, text: string): Instruction {
  return state.instructions.find((i) => i.raw.endsWith(text))!;
}

describe("results", () => {
  it("computes integer immediates", () => {
    const s = run("DADDI R1, R0, 5\nDADDI R2, R1, 7\nDSUBI R3, R2, 2");
    expect([reg(s, "R1"), reg(s, "R2"), reg(s, "R3")]).toEqual([5, 12, 10]);
  });

  it("computes floating-point arithmetic", () => {
    const s = run("ADD.D F6, F2, F4\nMUL.D F8, F6, F4\nSUB.D F10, F8, F2\nDIV.D F12, F8, F4", {
      initialRegisters: { F2: 1.5, F4: 2 },
    });
    expect([reg(s, "F6"), reg(s, "F8"), reg(s, "F10"), reg(s, "F12")]).toEqual([3.5, 7, 5.5, 3.5]);
  });

  it("loads the value a store just wrote to the same address", () => {
    const s = run("S.D F2, 0(R1)\nL.D F4, 0(R1)\nADD.D F6, F4, F2", { initialRegisters: { F2: 5, R1: 0 } });
    expect(reg(s, "F4")).toBe(5);
    expect(reg(s, "F6")).toBe(10);
    expect(byText(s, "L.D F4, 0(R1)").writeResultCycle!).toBeGreaterThan(byText(s, "S.D F2, 0(R1)").writeResultCycle!);
  });
});

describe("register renaming", () => {
  it("lets an earlier instruction keep the old value of a register a later one overwrites (WAR)", () => {
    // MUL.D is slow; SUB.D overwrites F2 long before MUL.D finishes.
    const s = run("MUL.D F0, F2, F4\nSUB.D F2, F4, F4", { initialRegisters: { F2: 3, F4: 2 } });
    expect(reg(s, "F0")).toBe(6);
    expect(reg(s, "F2")).toBe(0);
  });

  it("keeps the value of the last writer when an older instruction finishes later (WAW)", () => {
    // DIV.D takes 40 cycles, ADD.D 2; F0 must end with ADD.D's result.
    const s = run("DIV.D F0, F2, F4\nADD.D F0, F2, F4", { initialRegisters: { F2: 3, F4: 2 } });
    expect(byText(s, "DIV.D F0, F2, F4").writeResultCycle!).toBeGreaterThan(byText(s, "ADD.D F0, F2, F4").writeResultCycle!);
    expect(reg(s, "F0")).toBe(5);
  });

  it("starts a dependent instruction only after its operand is broadcast (RAW)", () => {
    const s = run("ADD.D F6, F2, F4\nMUL.D F8, F6, F4\nSUB.D F10, F8, F2", { initialRegisters: { F2: 1, F4: 2 } });
    const [add, mul, sub] = s.instructions;
    expect(mul.execStartCycle!).toBeGreaterThan(add.writeResultCycle!);
    expect(sub.execStartCycle!).toBeGreaterThan(mul.writeResultCycle!);
  });
});

describe("timing", () => {
  const program = "L.D F6, 0(R2)\nL.D F2, 8(R3)\nMUL.D F0, F2, F4\nSUB.D F8, F2, F6\nDIV.D F10, F0, F6\nADD.D F6, F8, F2\nDADDI R1, R1, 4";

  it("issues one instruction per cycle in program order", () => {
    const s = run(program);
    const issued = s.instructions.map((i) => i.issueCycle!);
    issued.slice(1).forEach((cycle, i) => expect(cycle).toBeGreaterThan(issued[i]));
  });

  it("broadcasts at most one result per cycle on the common data bus", () => {
    const s = run(program);
    const writes = s.instructions.map((i) => i.writeResultCycle!);
    expect(new Set(writes).size).toBe(writes.length);
  });

  it("goes through issue, execute and write result in that order", () => {
    const s = run(program);
    for (const i of s.instructions) {
      expect(i.execStartCycle!).toBeGreaterThan(i.issueCycle!);
      expect(i.execEndCycle!).toBeGreaterThanOrEqual(i.execStartCycle!);
      expect(i.writeResultCycle!).toBeGreaterThan(i.execEndCycle!);
    }
  });

  it("uses the configured latencies", () => {
    const s = run("ADD.D F2, F0, F0\nMUL.D F4, F0, F0\nDIV.D F6, F8, F8\nDADDI R1, R0, 1", {
      initialRegisters: { F8: 1 },
    });
    const length = (text: string) => byText(s, text).execEndCycle! - byText(s, text).execStartCycle! + 1;
    expect(length("ADD.D F2, F0, F0")).toBe(2);
    expect(length("MUL.D F4, F0, F0")).toBe(10);
    expect(length("DIV.D F6, F8, F8")).toBe(40);
    expect(length("DADDI R1, R0, 1")).toBe(1);
  });

  it("stalls issue when every reservation station of a type is busy", () => {
    const s = run("ADD.D F2, F0, F0\nADD.D F4, F0, F0", {
      reservationStations: { ...baseConfig.reservationStations, adders: 1 },
    });
    const [first, second] = s.instructions;
    expect(second.issueCycle!).toBeGreaterThanOrEqual(first.writeResultCycle!);
  });
});

describe("branches", () => {
  const loop = "DADDI R1, R0, 3\nLOOP: DSUBI R1, R1, 1\nBNE R1, R0, LOOP\nDADDI R5, R5, 1";

  it("repeats the loop body until the branch falls through", () => {
    const s = run(loop);
    expect(reg(s, "R1")).toBe(0);
    expect(s.instructions.filter((i) => i.type === "DSUBI")).toHaveLength(3);
  });

  it("runs the instruction after the loop exactly once", () => {
    const s = run(loop);
    expect(reg(s, "R5")).toBe(1);
  });

  it("issues nothing while a branch is unresolved", () => {
    const s = run(loop);
    s.instructions.forEach((inst, i) => {
      if (inst.type === "BNE" && i + 1 < s.instructions.length) {
        expect(s.instructions[i + 1].issueCycle!).toBeGreaterThanOrEqual(inst.writeResultCycle!);
      }
    });
  });

  it("takes a BEQ only when the registers are equal", () => {
    const s = run("DADDI R1, R0, 2\nDADDI R2, R0, 2\nBEQ R1, R2, SKIP\nDADDI R3, R0, 7\nSKIP: DADDI R4, R0, 9");
    expect(reg(s, "R3")).toBe(0);
    expect(reg(s, "R4")).toBe(9);
  });
});
