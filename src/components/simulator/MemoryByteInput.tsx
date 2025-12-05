import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";

interface MemoryByteInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  allowDecimal?: boolean; // Allow decimal format for float/double
}

export const MemoryByteInput = ({ value, onChange, disabled, allowDecimal = false }: MemoryByteInputProps) => {
  const [inputMode, setInputMode] = useState<'hex' | 'binary' | 'decimal'>(allowDecimal ? 'decimal' : 'hex');
  
  // Convert value (0-255) to 8-bit binary string
  const toBinaryString = (val: number): string => {
    return (val & 0xFF).toString(2).padStart(8, '0');
  };
  
  // Convert value (0-255) to 2-digit hex string
  const toHexString = (val: number): string => {
    return (val & 0xFF).toString(16).toUpperCase().padStart(2, '0');
  };
  
  const binaryString = toBinaryString(value);
  const hexString = toHexString(value);
  
  const handleBitChange = (bitIndex: number, bitValue: '0' | '1') => {
    const binaryArray = binaryString.split('');
    binaryArray[bitIndex] = bitValue;
    const newValue = parseInt(binaryArray.join(''), 2);
    onChange(newValue);
  };
  
  const handleHexDigitChange = (digitIndex: 0 | 1, newDigit: string) => {
    const upperDigit = newDigit.toUpperCase();
    
    // Validate hex digit
    if (!/^[0-9A-F]$/.test(upperDigit)) return;
    
    const hexArray = hexString.split('');
    hexArray[digitIndex] = upperDigit;
    const newValue = parseInt(hexArray.join(''), 16);
    onChange(newValue);
  };
  
  return (
    <div className="space-y-3">
      <RadioGroup 
        value={inputMode} 
        onValueChange={(v) => setInputMode(v as 'hex' | 'binary' | 'decimal')}
        className="flex gap-4"
        disabled={disabled}
      >
        {allowDecimal && (
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="decimal" id="decimal" disabled={disabled} />
            <Label htmlFor="decimal" className="text-xs font-medium cursor-pointer">
              Decimal
            </Label>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="hex" id="hex" disabled={disabled} />
          <Label htmlFor="hex" className="text-xs font-medium cursor-pointer">
            Hexadecimal
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="binary" id="binary" disabled={disabled} />
          <Label htmlFor="binary" className="text-xs font-medium cursor-pointer">
            Binary
          </Label>
        </div>
      </RadioGroup>
      
      {inputMode === 'decimal' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="any"
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              className="w-full h-10 text-center text-lg font-mono font-bold bg-background border-2 border-primary/50"
              disabled={disabled}
              placeholder="Enter decimal value"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Enter any decimal number (integer or floating-point)
          </p>
        </div>
      ) : inputMode === 'hex' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Input
                type="text"
                maxLength={1}
                value={hexString[0]}
                onChange={(e) => handleHexDigitChange(0, e.target.value)}
                className="w-10 h-10 text-center text-lg font-mono font-bold uppercase bg-background border-2 border-primary/50"
                disabled={disabled}
                onKeyDown={(e) => {
                  // Allow only hex digits and control keys
                  if (!/^[0-9a-fA-F]$/.test(e.key) && 
                      !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
              <Input
                type="text"
                maxLength={1}
                value={hexString[1]}
                onChange={(e) => handleHexDigitChange(1, e.target.value)}
                className="w-10 h-10 text-center text-lg font-mono font-bold uppercase bg-background border-2 border-primary/50"
                disabled={disabled}
                onKeyDown={(e) => {
                  if (!/^[0-9a-fA-F]$/.test(e.key) && 
                      !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
            </div>
            <span className="text-sm font-mono text-muted-foreground">
              = 0x{hexString} = {value} decimal
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Enter values from <span className="font-mono font-semibold">00</span> to <span className="font-mono font-semibold">FF</span> (0-9, A-F)
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex gap-1 flex-wrap">
              {binaryString.split('').map((bit, index) => (
                <Input
                  key={index}
                  type="text"
                  maxLength={1}
                  value={bit}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '0' || val === '1') {
                      handleBitChange(index, val as '0' | '1');
                    }
                  }}
                  className={`w-9 h-9 text-center text-sm font-mono font-bold ${
                    index === 0 ? 'bg-primary/10 border-primary' : 'bg-background'
                  } border-2 ${index < 4 ? 'border-primary/50' : 'border-muted-foreground/30'} flex-shrink-0`}
                  disabled={disabled}
                  onKeyDown={(e) => {
                    if (!/^[01]$/.test(e.key) && 
                        !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
              <span>MSB</span>
              <span>LSB</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            = 0x{hexString} = {value} decimal
          </p>
          <p className="text-[10px] text-muted-foreground">
            Enter only <span className="font-mono font-semibold">0</span> or <span className="font-mono font-semibold">1</span>
          </p>
        </div>
      )}
    </div>
  );
};
