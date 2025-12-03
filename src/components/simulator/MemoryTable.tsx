import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info } from "lucide-react";
import { MemoryByteInput } from "./MemoryByteInput";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MemoryTableProps {
  memory: Map<number, number>;
  isEditable: boolean;
  onMemoryChange?: (address: number, value: number) => void;
  onMemoryDelete?: (address: number) => void;
  onMemoryAdd?: (address: number, value: number) => void;
}

export const MemoryTable = ({ memory, isEditable, onMemoryChange, onMemoryDelete, onMemoryAdd }: MemoryTableProps) => {
  const [newAddress, setNewAddress] = useState<string>("");
  const [newValue, setNewValue] = useState<number>(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<number | null>(null);

  // Convert Map to sorted array
  const memoryEntries = Array.from(memory.entries()).sort((a, b) => a[0] - b[0]);

  const handleValueChange = (address: number, value: number) => {
    if (!onMemoryChange) return;
    onMemoryChange(address, value);
  };

  const handleAddMemory = () => {
    if (!onMemoryAdd) return;
    
    const address = parseInt(newAddress);
    
    if (!isNaN(address) && address >= 0) {
      onMemoryAdd(address, newValue);
      setNewAddress("");
      setNewValue(0);
      setIsAddDialogOpen(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
          Memory
          <span className="text-[10px] font-normal text-muted-foreground">(Byte-Addressable)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Information banner */}
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-xs text-muted-foreground">
              <strong>Memory is byte-addressable:</strong> Each address stores exactly <strong>1 byte (8 bits)</strong> of data.
              Values range from <span className="font-mono">0x00</span> to <span className="font-mono">0xFF</span> (0-255 decimal).
            </AlertDescription>
          </Alert>

          {/* Add new memory entry (only when editable) */}
          {isEditable && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Memory Location
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Memory Location</DialogTitle>
                  <DialogDescription className="text-xs">
                    Set the value for a single byte at a specific memory address.
                    You can input in binary or hexadecimal format.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Memory Address</label>
                    <Input
                      type="number"
                      placeholder="e.g., 20"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === '.' || e.key === ',') e.preventDefault();
                      }}
                      className="font-mono"
                      min="0"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Enter the decimal address (e.g., 20 for address 0x14)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Byte Value (0-255)</label>
                    <MemoryByteInput
                      value={newValue}
                      onChange={setNewValue}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddMemory} 
                    className="flex-1"
                    disabled={!newAddress || newAddress === '' || parseInt(newAddress) < 0}
                  >
                    Add to Memory
                  </Button>
                  <Button 
                    onClick={() => setIsAddDialogOpen(false)} 
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                      <TableCell className="text-xs text-center font-mono px-2">
                        {isEditable ? (
                          <Dialog open={editingAddress === address} onOpenChange={(open) => setEditingAddress(open ? address : null)}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 font-mono text-xs w-full hover:bg-primary/5"
                              >
                                0x{(value & 0xFF).toString(16).toUpperCase().padStart(2, '0')}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit Memory Location</DialogTitle>
                                <DialogDescription className="text-xs">
                                  Address: <span className="font-mono font-semibold">0x{address.toString(16).toUpperCase().padStart(4, '0')}</span> ({address} decimal)
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Byte Value (0-255)</label>
                                  <MemoryByteInput
                                    value={value & 0xFF}
                                    onChange={(newVal) => handleValueChange(address, newVal)}
                                  />
                                </div>
                              </div>
                              <Button onClick={() => setEditingAddress(null)} className="w-full">
                                Done
                              </Button>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="font-semibold">
                            0x{(value & 0xFF).toString(16).toUpperCase().padStart(2, '0')}
                            <span className="text-muted-foreground ml-2">({value & 0xFF})</span>
                          </span>
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
