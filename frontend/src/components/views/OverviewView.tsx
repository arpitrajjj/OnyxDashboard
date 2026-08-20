import { motion } from "framer-motion";
import { ArrowRight, Activity, Radio, ShieldCheck, Smartphone } from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Card } from "@/components/ui/card";
import { cn, timeAgo } from "@/lib/utils";
import type { Device } from "@/types";

type Props = {
  total: number;
  online: number;
  offline: number;
  loading: boolean;
  devices: Device[];
  onJumpToDevices: () => void;
};

const accentMap = {
  primary: { icon: "text-primary bg-primary/10", bar: "from-primary to-primary/40", glow: "shadow-primary/20" },
  success: { icon: "text-success bg-success/10", bar: "from-success to-success/40", glow: "shadow-success/20" },
  danger: { icon: "text-danger bg-danger/10", bar: "from-danger/60 to-danger/10", glow: "shadow-danger/20" },
  muted: { icon: "text-muted-foreground bg-muted", bar: "from-muted-foreground to-muted", glow: "shadow-transparent" },
};

export function OverviewView({ total, online, offline, loading, devices, onJumpToDevices }: Props) {
  const uptime = total > 0 ? (online / total) * 100 : 0;
  const recent = [...devices].slice(0, 5);
  const cards = [
    { label: "Total devices", value: total, sub: "registered in fleet", icon: Smartphone, accent: "primary" as const },
    { label: "Online now", value: online, sub: "heartbeat within 5s", icon: Radio, accent: "success" as const, pulse: true },
    { label: "Offline", value: offline, sub: "no recent heartbeat", icon: Activity, accent: "danger" as const },
    { label: "Uptime", value: uptime, decimals: 1, sub: "live fleet uptime", icon: ShieldCheck, accent: "muted" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const a = accentMap[c.accent];
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              whileHover={{ y: -2 }}
            >
              <Card className={cn("relative overflow-hidden border-border bg-card/60 backdrop-blur-sm", a.glow)}>
                <div className={cn("absolute left-0 top-0 h-full w-1 bg-gradient-to-b", a.bar)} />
                <div className="flex items-start justify-between p-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</p>
                    {loading ? (
                      <div className="mt-2 h-9 w-20 animate-shimmer rounded bg-muted/60" />
                    ) : (
                      <div className="mt-1 flex items-baseline gap-2">
                        <AnimatedCounter value={c.value} decimals={c.decimals ?? 0}
                          className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground" />
                        {c.pulse && c.value > 0 && (
                          <span className="relative inline-flex h-2 w-2">
                            <motion.span
                              className="absolute inline-flex h-full w-full rounded-full bg-success/40"
                              animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
                              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                            />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                          </span>
                        )}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
                  </div>
                  <div className={cn("grid h-10 w-10 place-items-center rounded-lg", a.icon)}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Recent devices</h2>
            <p className="text-xs text-muted-foreground">Top 5 by last heartbeat</p>
          </div>
          <button onClick={onJumpToDevices}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <ul className="divide-y divide-border">
          {loading && recent.length === 0 ? (
            <li className="px-5 py-6 text-sm text-muted-foreground">Loading…</li>
          ) : recent.length === 0 ? (
            <li className="px-5 py-6 text-sm text-muted-foreground">No devices registered yet.</li>
          ) : (
            recent.map((d) => (
              <li key={d.device_id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{d.name || d.device_id}</div>
                  <code className="text-[10px] font-mono text-muted-foreground">{d.device_id}</code>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs", d.online ? "text-success" : "text-muted-foreground")}>
                    {d.online ? "Online" : "Offline"}
                  </span>
                  <span className="text-xs text-muted-foreground">{timeAgo(d.last_seen)}</span>
                </div>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}
