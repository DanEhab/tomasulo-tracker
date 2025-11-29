import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterEntry } from "@/types/simulator";

interface RegisterFileTableProps {
  title: string;
  registers: RegisterEntry[];
}

export const RegisterFileTable = ({ title, registers }: RegisterFileTableProps) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden max-h-96 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-secondary">
              <TableRow className="bg-secondary border-border hover:bg-secondary">
                <TableHead className="text-xs font-semibold text-foreground">Register</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Value</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Qi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registers.map((reg) => (
                <TableRow 
                  key={reg.name} 
                  className={`border-border ${reg.qi ? "bg-status-stalled/20 text-status-stalled" : ""}`}
                >
                  <TableCell className="font-mono text-xs font-semibold">{reg.name}</TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    {reg.value.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    {reg.qi || "-"}
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
