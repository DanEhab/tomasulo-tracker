import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadStoreBuffer } from "@/types/simulator";

interface LoadStoreBufferTableProps {
  title: string;
  buffers: LoadStoreBuffer[];
}

export const LoadStoreBufferTable = ({ title, buffers }: LoadStoreBufferTableProps) => {
  const getRowStatus = (buffer: LoadStoreBuffer) => {
    if (!buffer.busy) return "text-muted-foreground";
    if (buffer.stage === 'COMPLETED') return "bg-green-500/20 text-green-700 dark:text-green-300";
    if (buffer.stage === 'MEMORY_ACCESS' && buffer.timeRemaining > 0) return "bg-status-executing/20 text-status-executing";
    if (buffer.stage === 'ADDRESS_CALC' && (buffer.baseRegisterTag || buffer.storeValueTag)) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
    return "bg-status-ready/20 text-status-ready";
  };

  const getStageDisplay = (buffer: LoadStoreBuffer) => {
    if (!buffer.busy) return "-";
    if (buffer.baseRegisterTag) return `Wait ${buffer.baseRegisterTag}`;
    if (buffer.storeValueTag) return `Wait ${buffer.storeValueTag}`;
    if (buffer.stage === 'ADDRESS_CALC') return "Addr Calc";
    if (buffer.stage === 'MEMORY_ACCESS') return "Mem Access";
    if (buffer.stage === 'COMPLETED') return "Complete";
    return "-";
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary border-border hover:bg-secondary">
                <TableHead className="text-xs font-semibold text-foreground">Tag</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Busy</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Stage</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Address</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Value</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buffers.map((buffer) => (
                <TableRow key={buffer.tag} className={`border-border ${getRowStatus(buffer)}`}>
                  <TableCell className="font-mono text-xs font-semibold">{buffer.tag}</TableCell>
                  <TableCell className="text-xs text-center">
                    {buffer.busy ? "✓" : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    {getStageDisplay(buffer)}
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    {buffer.address !== null ? `0x${buffer.address.toString(16).toUpperCase()}` : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    {buffer.value !== null ? buffer.value.toFixed(2) : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    {buffer.timeRemaining || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
