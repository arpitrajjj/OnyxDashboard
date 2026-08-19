import { Clock, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RefreshInterval } from "@/types";

type Props = {
  lastUpdated: Date | null;
  interval: RefreshInterval;
  onIntervalChange: (v: RefreshInterval) => void;
};

export function RefreshControl({ lastUpdated, interval, onIntervalChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        {lastUpdated ? (
          <>
            Updated <span className="font-medium text-foreground">{lastUpdated.toLocaleTimeString()}</span>
          </>
        ) : (
          "Awaiting first sync…"
        )}
      </span>
      <span className="text-muted-foreground/40">·</span>
      <div className="inline-flex items-center gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        <Label htmlFor="refresh-interval" className="sr-only">Refresh interval</Label>
        <Select
          value={String(interval)}
          onValueChange={(v) => onIntervalChange(Number(v) as RefreshInterval)}
        >
          <SelectTrigger id="refresh-interval" className="h-7 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Manual only</SelectItem>
            <SelectItem value="5">Every 5s</SelectItem>
            <SelectItem value="10">Every 10s</SelectItem>
            <SelectItem value="30">Every 30s</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
