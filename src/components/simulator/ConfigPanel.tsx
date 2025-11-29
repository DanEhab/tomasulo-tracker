import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimulatorConfig } from "@/types/simulator";

interface ConfigPanelProps {
  config: SimulatorConfig;
  onConfigChange: (config: SimulatorConfig) => void;
}

export const ConfigPanel = ({ config, onConfigChange }: ConfigPanelProps) => {
  const updateLatency = (key: keyof SimulatorConfig['latencies'], value: number) => {
    onConfigChange({
      ...config,
      latencies: { ...config.latencies, [key]: value }
    });
  };

  const updateRS = (key: keyof SimulatorConfig['reservationStations'], value: number) => {
    onConfigChange({
      ...config,
      reservationStations: { ...config.reservationStations, [key]: value }
    });
  };

  const updateCache = (key: keyof SimulatorConfig['cache'], value: number) => {
    onConfigChange({
      ...config,
      cache: { ...config.cache, [key]: value }
    });
  };

  const updateInitialMemory = (text: string) => {
    // Expect CSV pairs: "addr:value, addr:value"
    const entries = text
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length)
      .map(pair => {
        const [a, v] = pair.split(':').map(x => x.trim());
        const address = parseInt(a);
        const value = parseFloat(v);
        return isNaN(address) || isNaN(value) ? null : { address, value };
      })
      .filter((x): x is { address: number; value: number } => x !== null);

    onConfigChange({
      ...config,
      initialMemory: entries
    });
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-primary">Latencies (Cycles)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">ADD</Label>
            <Input
              type="number"
              value={config.latencies.ADD}
              onChange={(e) => updateLatency('ADD', parseInt(e.target.value))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">MUL</Label>
            <Input
              type="number"
              value={config.latencies.MUL}
              onChange={(e) => updateLatency('MUL', parseInt(e.target.value))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">DIV</Label>
            <Input
              type="number"
              value={config.latencies.DIV}
              onChange={(e) => updateLatency('DIV', parseInt(e.target.value))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">LOAD</Label>
            <Input
              type="number"
              value={config.latencies.LOAD}
              onChange={(e) => updateLatency('LOAD', parseInt(e.target.value))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">STORE</Label>
            <Input
              type="number"
              value={config.latencies.STORE}
              onChange={(e) => updateLatency('STORE', parseInt(e.target.value))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-primary">Reservation Stations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Adders</Label>
            <Input
              type="number"
              value={config.reservationStations.adders}
              onChange={(e) => updateRS('adders', parseInt(e.target.value))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Multipliers</Label>
            <Input
              type="number"
              value={config.reservationStations.multipliers}
              onChange={(e) => updateRS('multipliers', parseInt(e.target.value))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Load Buffers</Label>
            <Input
              type="number"
              value={config.reservationStations.loadBuffers}
              onChange={(e) => updateRS('loadBuffers', parseInt(e.target.value))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Store Buffers</Label>
            <Input
              type="number"
              value={config.reservationStations.storeBuffers}
              onChange={(e) => updateRS('storeBuffers', parseInt(e.target.value))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-primary">Cache Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Block Size (B)</Label>
            <Input
              type="number"
              value={config.cache.blockSize}
              onChange={(e) => updateCache('blockSize', parseInt(e.target.value))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Cache Size (B)</Label>
            <Input
              type="number"
              value={config.cache.cacheSize}
              onChange={(e) => updateCache('cacheSize', parseInt(e.target.value))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Hit Latency</Label>
            <Input
              type="number"
              value={config.cache.hitLatency}
              onChange={(e) => updateCache('hitLatency', parseInt(e.target.value))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Miss Penalty</Label>
            <Input
              type="number"
              value={config.cache.missLatency}
              onChange={(e) => updateCache('missLatency', parseInt(e.target.value))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-primary">Initial Memory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Memory Values (addr:value)
          </Label>
          <Input
            type="text"
            value={(config.initialMemory || []).map(m => `${m.address}:${m.value}`).join(', ')}
            onChange={(e) => updateInitialMemory(e.target.value)}
            placeholder="0:10.5, 8:20.5, 16:30.5"
            className="h-7 text-xs bg-input border-border font-mono"
          />
          <p className="text-[10px] text-muted-foreground/70">
            Example: 0:10, 8:20, 16:30 (address:value pairs)
          </p>
          <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-2">
            💡 Edit register values directly in the register tables after loading the program
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
