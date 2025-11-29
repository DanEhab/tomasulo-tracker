import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Instruction } from "@/types/simulator";

interface InstructionStatusTableProps {
  instructions: Instruction[];
  currentCycle: number;
}

export const InstructionStatusTable = ({ instructions, currentCycle }: InstructionStatusTableProps) => {
  const getRowStatus = (inst: Instruction) => {
    if (inst.writeResultCycle && inst.writeResultCycle <= currentCycle) {
      return "bg-status-completed/20 text-status-completed";
    }
    if (inst.execStartCycle && inst.execStartCycle <= currentCycle && 
        (!inst.execEndCycle || inst.execEndCycle > currentCycle)) {
      return "bg-status-executing/20 text-status-executing";
    }
    if (inst.issueCycle && inst.issueCycle <= currentCycle) {
      return "bg-status-stalled/20 text-status-stalled";
    }
    return "text-muted-foreground";
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-primary">Instruction Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary border-border hover:bg-secondary">
                <TableHead className="text-xs font-semibold text-foreground">Instruction</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Issue</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Exec Start</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Exec End</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Write Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                    No instructions loaded
                  </TableCell>
                </TableRow>
              ) : (
                instructions.map((inst) => (
                  <TableRow key={inst.id} className={`border-border ${getRowStatus(inst)}`}>
                    <TableCell className="font-mono text-xs">{inst.raw}</TableCell>
                    <TableCell className="text-xs text-center">
                      {inst.issueCycle ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      {inst.execStartCycle ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      {inst.execEndCycle ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs text-center">
                      {inst.writeResultCycle ?? "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
