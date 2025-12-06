import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info } from "lucide-react";
import { MemoryByteInput } from "./MemoryByteInput";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
  const [memoryFormat, setMemoryFormat] = useState<'byte' | 'float' | 'double'>('byte');
  const [editFormat, setEditFormat] = useState<'byte' | 'float' | 'double'>('byte');
  const [addressError, setAddressError] = useState<string>("");

  // Convert Map to sorted array
  const memoryEntries = Array.from(memory.entries()).sort((a, b) => a[0] - b[0]);

  const handleValueChange = (address: number, value: number) => {
    if (!onMemoryChange) return;
    onMemoryChange(address, value);
  };

  const validateAddress = (address: number): string => {
    if (memoryFormat === 'float' && address % 4 !== 0) {
      return "Float addresses must be divisible by 4 bytes";
    }
    if (memoryFormat === 'double' && address % 8 !== 0) {
      return "Double addresses must be divisible by 8 bytes";
    }
    return "";
  };

  const handleAddMemory = () => {
    if (!onMemoryAdd) return;
    
    const address = parseInt(newAddress);
    
    if (isNaN(address) || address < 0) return;
    
    const error = validateAddress(address);
    if (error) {
      setAddressError(error);
      return;
    }
    
    onMemoryAdd(address, newValue);
    setNewAddress("");
    setNewValue(0);
    setAddressError("");
    setIsAddDialogOpen(false);
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
              <strong>Memory supports multiple formats:</strong>
              <br />
              • <strong>Byte (8-bit):</strong> 0-255, any address
              <br />
              • <strong>Float (32-bit):</strong> 4 bytes, address divisible by 4
              <br />
              • <strong>Double (64-bit):</strong> 8 bytes, address divisible by 8
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
                    Set a value at a specific memory address.
                    Choose the data format and input method below.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data Format</label>
                    <RadioGroup 
                      value={memoryFormat} 
                      onValueChange={(v) => {
                        setMemoryFormat(v as 'byte' | 'float' | 'double');
                        setAddressError("");
                      }}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="byte" id="format-byte" />
                        <Label htmlFor="format-byte" className="text-xs font-medium cursor-pointer">
                          Byte (8-bit)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="float" id="format-float" />
                        <Label htmlFor="format-float" className="text-xs font-medium cursor-pointer">
                          Float (4 bytes)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="double" id="format-double" />
                        <Label htmlFor="format-double" className="text-xs font-medium cursor-pointer">
                          Double (8 bytes)
                        </Label>
                      </div>
                    </RadioGroup>
                    <p className="text-[10px] text-muted-foreground">
                      {memoryFormat === 'byte' && "Stores 1 byte (0-255) at any address"}
                      {memoryFormat === 'float' && "Stores 4 bytes - address must be divisible by 4"}
                      {memoryFormat === 'double' && "Stores 8 bytes - address must be divisible by 8"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Memory Address</label>
                    <Input
                      type="number"
                      placeholder={memoryFormat === 'float' ? "e.g., 0, 4, 8, 12..." : memoryFormat === 'double' ? "e.g., 0, 8, 16, 24..." : "e.g., 20"}
                      value={newAddress}
                      onChange={(e) => {
                        setNewAddress(e.target.value);
                        setAddressError("");
                        const addr = parseInt(e.target.value);
                        if (!isNaN(addr)) {
                          const error = validateAddress(addr);
                          setAddressError(error);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === '.' || e.key === ',') e.preventDefault();
                      }}
                      className={`font-mono ${addressError ? 'border-destructive' : ''}`}
                      min="0"
                    />
                    {addressError ? (
                      <p className="text-[10px] text-destructive font-medium">⚠️ {addressError}</p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">
                        {memoryFormat === 'float' && "Must be divisible by 4 (e.g., 0, 4, 8, 12, 16...)"}
                        {memoryFormat === 'double' && "Must be divisible by 8 (e.g., 0, 8, 16, 24, 32...)"}
                        {memoryFormat === 'byte' && "Enter the decimal address (e.g., 20 for address 0x14)"}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {memoryFormat === 'byte' ? 'Byte Value (0-255)' : 'Decimal Value'}
                    </label>
                    <MemoryByteInput
                      value={newValue}
                      onChange={setNewValue}
                      allowDecimal={memoryFormat !== 'byte'}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddMemory} 
                    className="flex-1"
                    disabled={!newAddress || newAddress === '' || parseInt(newAddress) < 0 || addressError !== ""}
                  >
                    Add to Memory
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setAddressError("");
                    }} 
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
                          <Dialog open={editingAddress === address} onOpenChange={(open) => {
                            setEditingAddress(open ? address : null);
                            if (open) setEditFormat('byte');
                          }}>
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
                                  <label className="text-sm font-medium">Data Format</label>
                                  <RadioGroup 
                                    value={editFormat} 
                                    onValueChange={(v) => setEditFormat(v as 'byte' | 'float' | 'double')}
                                    className="flex gap-4"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="byte" id="edit-format-byte" />
                                      <Label htmlFor="edit-format-byte" className="text-xs font-medium cursor-pointer">
                                        Byte
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="float" id="edit-format-float" />
                                      <Label htmlFor="edit-format-float" className="text-xs font-medium cursor-pointer">
                                        Float
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="double" id="edit-format-double" />
                                      <Label htmlFor="edit-format-double" className="text-xs font-medium cursor-pointer">
                                        Double
                                      </Label>
                                    </div>
                                  </RadioGroup>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">
                                    {editFormat === 'byte' ? 'Byte Value (0-255)' : 'Decimal Value'}
                                  </label>
                                  <MemoryByteInput
                                    value={value & 0xFF}
                                    onChange={(newVal) => handleValueChange(address, newVal)}
                                    allowDecimal={editFormat !== 'byte'}
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
