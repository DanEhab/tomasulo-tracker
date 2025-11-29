import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface MemoryTableProps {
  memory: Map<number, number>;
  isEditable: boolean;
  onMemoryChange?: (address: number, value: number) => void;
  onMemoryDelete?: (address: number) => void;
  onMemoryAdd?: (address: number, value: number) => void;
}

export const MemoryTable = ({ memory, isEditable, onMemoryChange, onMemoryDelete, onMemoryAdd }: MemoryTableProps) => {
  const [newAddress, setNewAddress] = useState<string>("");
  const [newValue, setNewValue] = useState<string>("");

  // Convert Map to sorted array
  const memoryEntries = Array.from(memory.entries()).sort((a, b) => a[0] - b[0]);

  const handleValueChange = (address: number, inputValue: string) => {
    if (!onMemoryChange) return;
    
    const value = parseFloat(inputValue);
    if (!isNaN(value)) {
      onMemoryChange(address, value);
    } else if (inputValue === '' || inputValue === '-') {
      onMemoryChange(address, 0);
    }
  };

  const handleAddMemory = () => {
    if (!onMemoryAdd) return;
    
    const address = parseInt(newAddress);
    const value = parseFloat(newValue);
    
    if (!isNaN(address) && !isNaN(value)) {
      onMemoryAdd(address, value);
      setNewAddress("");
      setNewValue("");
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-primary">Memory</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Add new memory entry (only when editable) */}
          {isEditable && (
            <div className="flex gap-2 p-3 bg-secondary/50 rounded-md border border-border">
              <Input
                type="number"
                placeholder="Address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === '.' || e.key === ',') e.preventDefault();
                }}
                className="h-8 text-xs font-mono bg-input border-border"
              />
              <Input
                type="number"
                step="0.1"
                placeholder="Value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="h-8 text-xs font-mono bg-input border-border"
              />
              <Button
                onClick={handleAddMemory}
                size="sm"
                className="h-8 px-3"
                disabled={!newAddress || !newValue}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          )}

          {/* Memory entries table */}
          <div className="rounded-md border border-border overflow-hidden max-h-96 overflow-y-auto">
            {memoryEntries.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <p>No memory initialized</p>
                {isEditable && (
                  <p className="text-xs mt-2">Add memory entries above</p>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-secondary">
                  <TableRow className="bg-secondary border-border hover:bg-secondary">
                    <TableHead className="text-xs font-semibold text-foreground w-32">Address</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground text-center">Value</TableHead>
                    {isEditable && (
                      <TableHead className="text-xs font-semibold text-foreground text-center w-20">Action</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memoryEntries.map(([address, value]) => (
                    <TableRow key={address} className="border-border">
                      <TableCell className="font-mono text-xs font-semibold">
                        0x{address.toString(16).toUpperCase().padStart(4, '0')}
                        <span className="text-muted-foreground ml-2">({address})</span>
                      </TableCell>
                      <TableCell className="text-xs text-center font-mono px-1">
                        {isEditable ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={value}
                            onChange={(e) => handleValueChange(address, e.target.value)}
                            className="h-7 text-xs text-center font-mono bg-input border-border"
                          />
                        ) : (
                          <span>{value.toFixed(2)}</span>
                        )}
                      </TableCell>
                      {isEditable && (
                        <TableCell className="text-center">
                          <Button
                            onClick={() => onMemoryDelete?.(address)}
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {isEditable && memoryEntries.length > 0 && (
            <p className="text-[10px] text-muted-foreground/70 text-center">
              💡 Memory is editable only at cycle 0. Values will be locked after execution starts.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
