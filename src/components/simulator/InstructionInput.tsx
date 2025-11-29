import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InstructionInputProps {
  code: string;
  onCodeChange: (code: string) => void;
}

export const InstructionInput = ({ code, onCodeChange }: InstructionInputProps) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-primary">Assembly Code</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder="Enter MIPS assembly code...&#10;Example:&#10;L.D F0, 0(R1)&#10;MUL.D F4, F0, F2&#10;S.D F4, 0(R1)"
          className="font-mono text-xs h-48 bg-code-bg text-foreground border-border resize-none"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Supported: DADDI, DSUBI, ADD.D, SUB.D, MUL.D, DIV.D, L.D, S.D, BNE, BEQ
        </p>
      </CardContent>
    </Card>
  );
};
