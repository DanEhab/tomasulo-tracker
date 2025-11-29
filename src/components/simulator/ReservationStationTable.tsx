import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReservationStation } from "@/types/simulator";

interface ReservationStationTableProps {
  title: string;
  stations: ReservationStation[];
}

export const ReservationStationTable = ({ title, stations }: ReservationStationTableProps) => {
  const getRowStatus = (rs: ReservationStation) => {
    if (!rs.busy) return "text-muted-foreground";
    if (rs.qj || rs.qk) return "bg-status-stalled/20 text-status-stalled";
    if (rs.timeRemaining > 0) return "bg-status-executing/20 text-status-executing";
    return "bg-status-ready/20 text-status-ready";
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
                <TableHead className="text-xs font-semibold text-foreground">Op</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Vj</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Vk</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Qj</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Qk</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">A</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stations.map((rs) => (
                <TableRow key={rs.tag} className={`border-border ${getRowStatus(rs)}`}>
                  <TableCell className="font-mono text-xs font-semibold">{rs.tag}</TableCell>
                  <TableCell className="text-xs text-center">
                    {rs.busy ? "✓" : "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{rs.op || "-"}</TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    {rs.vj !== null ? rs.vj.toFixed(2) : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    {rs.vk !== null ? rs.vk.toFixed(2) : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    {rs.qj || "-"}
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    {rs.qk || "-"}
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    {rs.a !== null ? rs.a : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-center font-mono">
                    {rs.timeRemaining || "-"}
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
