import { useState, useEffect } from "react";
import { Cpu } from "lucide-react";
import { SimulatorConfig, SimulatorState } from "@/types/simulator";
import { ConfigPanel } from "@/components/simulator/ConfigPanel";
import { InstructionInput } from "@/components/simulator/InstructionInput";
import { ControlPanel } from "@/components/simulator/ControlPanel";
import { InstructionStatusTable } from "@/components/simulator/InstructionStatusTable";
import { ReservationStationTable } from "@/components/simulator/ReservationStationTable";
import { RegisterFileTable } from "@/components/simulator/RegisterFileTable";
import { LoadStoreBufferTable } from "@/components/simulator/LoadStoreBufferTable";
import { parseInstructions, initializeSimulatorState, executeSimulationStep } from "@/lib/tomasuloEngine";
import { useToast } from "@/hooks/use-toast";

const defaultConfig: SimulatorConfig = {
  latencies: {
    ADD: 2,
    MUL: 10,
    DIV: 40,
    LOAD: 2,
    STORE: 2,
  },
  reservationStations: {
    adders: 3,
    multipliers: 2,
    loadBuffers: 3,
    storeBuffers: 3,
  },
  cache: {
    blockSize: 8,
    cacheSize: 64,
    hitLatency: 1,
    missLatency: 10,
  },
  initialMemory: [
    { address: 0, value: 10 },
    { address: 8, value: 20 },
  ],
};

const Index = () => {
  const [config, setConfig] = useState<SimulatorConfig>(defaultConfig);
  const [code, setCode] = useState<string>("");
  const [state, setState] = useState<SimulatorState | null>(null);
  const { toast } = useToast();

  const handleLoadProgram = () => {
    try {
      const instructions = parseInstructions(code);
      if (instructions.length === 0) {
        toast({
          title: "No Instructions",
          description: "Please enter assembly code first.",
          variant: "destructive",
        });
        return;
      }
      
      const newState = initializeSimulatorState(instructions, config);
      setState(newState);
      
      toast({
        title: "Program Loaded",
        description: `${instructions.length} instruction(s) loaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Parse Error",
        description: "Failed to parse assembly code. Check syntax.",
        variant: "destructive",
      });
    }
  };

  const handleStepForward = () => {
    if (!state) return;
    const newState = executeSimulationStep(state, config);
    setState(newState);
  };

  const handleRunAll = () => {
    if (!state) return;
    
    if (state.isRunning) {
      // Stop running
      setState({ ...state, isRunning: false });
    } else {
      // Start running
      setState({ ...state, isRunning: true });
    }
  };

  const handleReset = () => {
    setState(null);
    toast({
      title: "Simulator Reset",
      description: "All state has been cleared.",
    });
  };

  const handleRegisterValueChange = (registerName: string, newValue: number) => {
    if (!state || state.cycle > 0) return; // Only allow editing before execution starts
    
    const newState = { ...state };
    
    // Find and update the register in either int or float arrays
    const intReg = newState.registers.int.find(r => r.name === registerName);
    const floatReg = newState.registers.float.find(r => r.name === registerName);
    
    if (intReg) {
      intReg.value = Math.floor(newValue); // Integer registers should be whole numbers
    } else if (floatReg) {
      floatReg.value = newValue;
    }
    
    setState(newState);
  };

  // Auto-run effect
  useEffect(() => {
    if (!state?.isRunning || state?.isComplete) return;
    
    const interval = setInterval(() => {
      setState(currentState => {
        if (!currentState || currentState.isComplete || !currentState.isRunning) {
          return currentState;
        }
        return executeSimulationStep(currentState, config);
      });
    }, 500); // 500ms per cycle
    
    return () => clearInterval(interval);
  }, [state?.isRunning, state?.isComplete, config]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Cpu className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Tomasulo Algorithm Simulator</h1>
                <p className="text-xs text-muted-foreground">Dynamic Instruction Scheduling Visualization</p>
              </div>
            </div>
            
            {state && (
              <div className="px-6 py-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Current Cycle</p>
                  <p className="text-3xl font-bold text-primary font-mono">{state.cycle}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Configuration */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <InstructionInput code={code} onCodeChange={setCode} />
            <ConfigPanel config={config} onConfigChange={setConfig} />
          </div>

          {/* Main Dashboard */}
          <div className="col-span-12 lg:col-span-9 space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
              <ControlPanel
                isRunning={state?.isRunning || false}
                isComplete={state?.isComplete || false}
                onStepForward={handleStepForward}
                onRunAll={handleRunAll}
                onReset={handleReset}
                onLoadProgram={handleLoadProgram}
              />
              
              {state?.isComplete && (
                <div className="px-4 py-2 bg-status-completed/20 border border-status-completed rounded-md">
                  <p className="text-sm font-semibold text-status-completed">✓ Execution Complete</p>
                </div>
              )}
            </div>

            {/* Tables */}
            {state ? (
              <>
                <InstructionStatusTable 
                  instructions={state.instructions} 
                  currentCycle={state.cycle}
                />
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <ReservationStationTable 
                    title="Add/Sub Reservation Stations"
                    stations={state.reservationStations.add}
                  />
                  <ReservationStationTable 
                    title="Mul/Div Reservation Stations"
                    stations={state.reservationStations.mul}
                  />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <LoadStoreBufferTable 
                    title="Load Buffers"
                    buffers={state.loadStoreBuffers.load}
                  />
                  <LoadStoreBufferTable 
                    title="Store Buffers"
                    buffers={state.loadStoreBuffers.store}
                  />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <RegisterFileTable 
                    title="Floating Point Registers"
                    registers={state.registers.float}
                    isEditable={state.cycle === 0}
                    onValueChange={handleRegisterValueChange}
                  />
                  <RegisterFileTable 
                    title="Integer Registers"
                    registers={state.registers.int}
                    isEditable={state.cycle === 0}
                    onValueChange={handleRegisterValueChange}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-32 border border-border border-dashed rounded-lg bg-card/50">
                <div className="text-center">
                  <Cpu className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Program Loaded</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enter assembly code and click "Load Program" to begin
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
