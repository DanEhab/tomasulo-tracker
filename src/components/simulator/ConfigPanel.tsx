import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
              min="1"
              step="1"
              value={config.latencies.ADD}
              onChange={(e) => updateLatency('ADD', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">MUL</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={config.latencies.MUL}
              onChange={(e) => updateLatency('MUL', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">DIV</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={config.latencies.DIV}
              onChange={(e) => updateLatency('DIV', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">INT_ADD</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={config.latencies.INT_ADD}
              onChange={(e) => updateLatency('INT_ADD', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">LOAD</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={config.latencies.LOAD}
              onChange={(e) => updateLatency('LOAD', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">STORE</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={config.latencies.STORE}
              onChange={(e) => updateLatency('STORE', Math.max(1, parseInt(e.target.value) || 1))}
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
              min="1"
              step="1"
              value={config.reservationStations.adders}
              onChange={(e) => updateRS('adders', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Multipliers</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={config.reservationStations.multipliers}
              onChange={(e) => updateRS('multipliers', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Integer Adders</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={config.reservationStations.intAdders}
              onChange={(e) => updateRS('intAdders', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Load Buffers</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={config.reservationStations.loadBuffers}
              onChange={(e) => updateRS('loadBuffers', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Store Buffers</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={config.reservationStations.storeBuffers}
              onChange={(e) => updateRS('storeBuffers', Math.max(1, parseInt(e.target.value) || 1))}
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
              min="1"
              step="1"
              value={config.cache.blockSize}
              onChange={(e) => updateCache('blockSize', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Cache Size (B)</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={config.cache.cacheSize}
              onChange={(e) => updateCache('cacheSize', Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Hit Latency</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={config.cache.hitLatency}
              onChange={(e) => updateCache('hitLatency', Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Miss Penalty</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={config.cache.missLatency}
              onChange={(e) => updateCache('missLatency', Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 h-7 text-xs bg-input border-border"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-primary">Advanced Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-medium text-foreground">Optimization Mode</Label>
              <p className="text-xs text-muted-foreground">Heuristic CDB arbitration</p>
            </div>
            <Switch
              checked={config.isOptimizationMode || false}
              onCheckedChange={(checked) => onConfigChange({ ...config, isOptimizationMode: checked })}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
