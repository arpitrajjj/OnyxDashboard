import { DeviceTable } from "@/components/DeviceTable";
import { RefreshControl } from "@/components/RefreshControl";
import type { Device, RefreshInterval } from "@/types";

type Props = {
  devices: Device[];
  loading: boolean;
  lastUpdated: Date | null;
  interval: RefreshInterval;
  onIntervalChange: (v: RefreshInterval) => void;
  onRefresh: () => void;
  onDelete: (id: string) => Promise<void>;
  onSelectDevice: (device: Device) => void;
};

export function DevicesView(props: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Devices</h2>
          <p className="text-sm text-muted-foreground">
            Live table — click any row to view that device's real-time SMS.
          </p>
        </div>
        <RefreshControl
          lastUpdated={props.lastUpdated}
          interval={props.interval}
          onIntervalChange={props.onIntervalChange}
        />
      </div>
      <DeviceTable
        devices={props.devices}
        loading={props.loading}
        onRefresh={props.onRefresh}
        onDelete={props.onDelete}
        onSelectDevice={props.onSelectDevice}
      />
    </div>
  );
}
