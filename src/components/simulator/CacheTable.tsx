import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CacheBlock } from "@/types/simulator";

interface CacheTableProps {
  cache: Map<number, CacheBlock>;
  blockSize: number;
  cacheSize: number;
}

export const CacheTable = ({ cache, blockSize, cacheSize }: CacheTableProps) => {
  const numBlocks = cacheSize / blockSize;
  
  // Create array of cache entries
  const cacheEntries = Array.from({ length: numBlocks }, (_, index) => {
    const cacheBlock = cache.get(index);
    return {
      cacheIndex: index,
      valid: cacheBlock?.valid || false,
      tag: cacheBlock?.tag,
      data: cacheBlock?.data || [],
    };
  });

  const formatData = (data: number[], blockSize: number) => {
    if (data.length === 0) return '-';
    const values = Array.from({ length: blockSize }, (_, i) => 
      data[i] !== undefined ? data[i] : 0
    );
    return values.map(v => v.toString()).join(', ');
  };

  const getMemoryRange = (tag: number | undefined, blockSize: number) => {
    if (tag === undefined) return '-';
    const startAddr = tag * blockSize;
    const endAddr = startAddr + blockSize - 1;
    return `[${startAddr}-${endAddr}]`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-primary">
          Cache ({numBlocks} blocks × {blockSize} bytes)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary border-border hover:bg-secondary">
                <TableHead className="text-xs font-semibold text-foreground">Index</TableHead>
                <TableHead className="text-xs font-semibold text-foreground text-center">Valid</TableHead>
                <TableHead className="text-xs font-semibold text-foreground">Block Tag</TableHead>
                <TableHead className="text-xs font-semibold text-foreground">Memory Range</TableHead>
                <TableHead className="text-xs font-semibold text-foreground">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cacheEntries.map((entry) => (
                <TableRow 
                  key={entry.cacheIndex} 
                  className={`border-border ${entry.valid ? 'bg-status-ready/10' : 'text-muted-foreground'}`}
                >
                  <TableCell className="font-mono text-xs font-semibold">
                    {entry.cacheIndex}
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    {entry.valid ? (
                      <span className="text-status-ready font-semibold">✓</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {entry.tag !== undefined ? entry.tag : '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {getMemoryRange(entry.tag, blockSize)}
                  </TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-[200px]">
                    {formatData(entry.data, blockSize)}
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
