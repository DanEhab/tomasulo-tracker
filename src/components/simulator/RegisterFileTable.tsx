import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RegisterEntry } from "@/types/simulator";
import { getRegisterBigIntValue } from "@/lib/tomasuloEngine";

interface RegisterFileTableProps {
  title: string;
  registers: RegisterEntry[];
  isEditable: boolean;
  onValueChange?: (registerName: string, newValue: number) => void;
}

export const RegisterFileTable = ({ title, registers, isEditable, onValueChange }: RegisterFileTableProps) => {
  const isFloatRegister = title.toLowerCase().includes("float");
  
  const handleValueChange = (regName: string, inputValue: string) => {
    if (!onValueChange) return;
    
    // For integer registers, prevent decimal points
    if (!isFloatRegister && inputValue.includes('.')) {
      return;
    }
    
    const value = parseFloat(inputValue);
    if (!isNaN(value)) {
      onValueChange(regName, value);
    } else if (inputValue === '' || inputValue === '-') {
      onValueChange(regName, 0);
    }
  };

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
              {registers.map((reg) => {
                const isR0 = reg.name === 'R0';
                const canEdit = isEditable && !isR0;
                
                return (
                  <TableRow 
                    key={reg.name} 
                    className={`border-border ${reg.qi ? "bg-status-stalled/20 text-status-stalled" : ""}`}
                  >
                    <TableCell className="font-mono text-xs font-semibold">{reg.name}</TableCell>
                    <TableCell className="text-xs text-center font-mono px-1">
                      {canEdit ? (
                        <Input
                          type="number"
                          step={isFloatRegister ? "0.1" : "1"}
                          value={reg.value}
                          onChange={(e) => handleValueChange(reg.name, e.target.value)}
                          onKeyDown={(e) => {
                            // Prevent decimal point for integer registers
                            if (!isFloatRegister && (e.key === '.' || e.key === ',')) {
                              e.preventDefault();
                            }
                          }}
                          className="h-6 text-xs text-center font-mono bg-input border-border"
                        />
                      ) : (
                        <span className={isR0 ? "text-muted-foreground" : ""}>
                          {(() => {
                            if (isFloatRegister) {
                              // Check if this is a raw 32-bit single-precision pattern
                              // (values that fit in 32-bit unsigned range might be single-precision)
                              if (Number.isInteger(reg.value) && reg.value >= 0 && reg.value <= 0xFFFFFFFF) {
                                // Try to interpret as single-precision float
                                const buffer = new ArrayBuffer(4);
                                const view = new DataView(buffer);
                                view.setUint32(0, reg.value, true);
                                const floatValue = view.getFloat32(0, true);
                                
                                // If it looks like a reasonable float value, display it
                                if (isFinite(floatValue)) {
                                  return floatValue.toFixed(6);
                                }
                              }
                              return reg.value.toFixed(2);
                            }
                            // For integer registers, check if BigInt value exists and if precision was lost
                            const bigIntVal = getRegisterBigIntValue(reg.name);
                            if (bigIntVal !== undefined) {
                              // Check if converting BigInt to Number loses precision
                              const numValue = Number(bigIntVal);
                              if (numValue !== reg.value || !Number.isSafeInteger(numValue)) {
                                // Precision loss detected - show hex
                                return `0x${bigIntVal.toString(16).toUpperCase()}`;
                              }
                            }
                            // No precision loss or no BigInt - show decimal
                            return reg.value;
                          })()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-center font-mono">
                      {reg.qi || "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
