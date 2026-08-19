import { motion } from "framer-motion";
import { Code2 } from "lucide-react";
import { Card } from "@/components/ui/card";

type Endpoint = {
  method: "POST" | "GET" | "DELETE";
  path: string;
  desc: string;
  sample: string;
};

const endpoints: Endpoint[] = [
  {
    method: "POST",
    path: "/api/register",
    desc: "Register a new device or update an existing one. The OnyxBridge Android library should call this on app launch.",
    sample: `{
  "device_id": "pixel-7-pro-001",
  "name": "Pixel 7 Pro",
  "model": "Pixel 7 Pro",
  "os_version": "Android 14",
  "app_version": "1.0.4"
}`,
  },
  {
    method: "POST",
    path: "/api/heartbeat",
    desc: "Refresh the device's last_seen timestamp. A device is considered online if a heartbeat was received within 60 seconds.",
    sample: `{
  "device_id": "pixel-7-pro-001"
}`,
  },
  {
    method: "GET",
    path: "/api/events",
    desc: "Server-Sent Events stream. Pushes device_registered / device_updated / heartbeat / device_deleted events as they happen.",
    sample: `event: heartbeat
data: {"device_id":"pixel-7-pro-001","online":true}`,
  },
  {
    method: "GET",
    path: "/api/devices",
    desc: "List all devices with online/offline status. Supports ?status=online|offline and ?q=keyword for filtering.",
    sample: `{
  "ok": true,
  "count": 12,
  "online": 8,
  "offline": 4,
  "devices": [ ... ]
}`,
  },
];

const methodColor: Record<Endpoint["method"], string> = {
  POST: "text-primary bg-primary/10",
  GET: "text-success bg-success/10",
  DELETE: "text-danger bg-danger/10",
};

export function ApiReference() {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Code2 className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">API Reference</h2>
        <p className="text-sm text-muted-foreground">— endpoints the OnyxBridge Android library calls</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {endpoints.map((e, i) => (
          <motion.div
            key={e.path}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            <Card className="h-full overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
                <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${methodColor[e.method]}`}>
                  {e.method}
                </span>
                <code className="font-mono text-sm font-medium">{e.path}</code>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">{e.desc}</p>
                <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-xs leading-relaxed">
                  <code className="font-mono">{e.sample}</code>
                </pre>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
