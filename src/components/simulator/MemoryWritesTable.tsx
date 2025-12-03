import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface MemoryWritesTableProps {
  memoryWrites: Map<number, { value: number; cycle: number }>;
}

export const MemoryWritesTable = ({ memoryWrites }: MemoryWritesTableProps) => {
  // Convert Map to sorted array
  const writes = Array.from(memoryWrites.entries())
    .map(([address, data]) => ({ address, ...data }))
    .sort((a, b) => a.address - b.address);

  if (writes.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-primary">Memory Writes</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              No memory writes have been performed yet. Store instructions (SW, SD, S.S, S.D) will appear here.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-primary">
          Memory Writes ({writes.length} addresses modified)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Addresses modified by store instructions (SW, SD, S.S, S.D). Shows the final value at each byte address.
          </AlertDescription>
        </Alert>
        <div className="rounded-md border border-border overflow-hidden max-h-96 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-secondary">
              <TableRow className="bg-secondary border-border hover:bg-secondary">
                <TableHead className="text-xs font-semibold text-foreground">Address</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Value (Hex)</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Value (Dec)</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Written at Cycle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {writes.map((write) => (
                <TableRow key={write.address} className="border-border">
                  <TableCell className="font-mono text-xs font-semibold">{write.address}</TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    0x{write.value.toString(16).padStart(2, '0').toUpperCase()}
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    {write.value}
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono text-muted-foreground">
                    {write.cycle}
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
