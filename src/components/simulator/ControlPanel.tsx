import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, SkipForward, Upload } from "lucide-react";

interface ControlPanelProps {
  isRunning: boolean;
  isComplete: boolean;
  onStepForward: () => void;
  onRunAll: () => void;
  onReset: () => void;
  onLoadProgram: () => void;
}

export const ControlPanel = ({
  isRunning,
  isComplete,
  onStepForward,
  onRunAll,
  onReset,
  onLoadProgram,
}: ControlPanelProps) => {
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={onLoadProgram}
        variant="secondary"
        size="sm"
        className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
      >
        <Upload className="w-4 h-4 mr-2" />
        Load Program
      </Button>
      
      <Button
        onClick={onStepForward}
        disabled={isRunning || isComplete}
        size="sm"
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <SkipForward className="w-4 h-4 mr-2" />
        Step Forward
      </Button>
      
      <Button
        onClick={onRunAll}
        disabled={isComplete}
        variant="secondary"
        size="sm"
        className="bg-status-executing hover:bg-status-executing/90 text-primary-foreground"
      >
        {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
        {isRunning ? "Pause" : "Run All"}
      </Button>
      
      <Button
        onClick={onReset}
        variant="secondary"
        size="sm"
        className="bg-destructive/20 hover:bg-destructive/30 text-destructive"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset
      </Button>
    </div>
  );
};
