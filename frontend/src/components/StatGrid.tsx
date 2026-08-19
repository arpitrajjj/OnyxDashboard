import { motion } from "framer-motion";
import { Activity, Radio, ShieldCheck, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/AnimatedCounter";

type Props = {
  total: number;
  online: number;
  offline: number;
  loading: boolean;
};

export function StatGrid({ total, online, offline, loading }: Props) {
  const uptime = total > 0 ? (online / total) * 100 : 0;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0 }}
        whileHover={{ y: -2 }}
      >
        <Card className="relative overflow-hidden border-border bg-card/60 backdrop-blur-sm">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-primary/40" />
          <div className="flex items-start justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total devices
              </p>
              {loading ? (
                <div className="mt-2 h-9 w-20 animate-shimmer rounded bg-muted/60" />
              ) : (
                <AnimatedCounter
                  value={total}
                  className="mt-1 block text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
                />
              )}
              <p className="mt-1 text-xs text-muted-foreground">registered in fleet</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Online */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        whileHover={{ y: -2 }}
      >
        <Card className="relative overflow-hidden border-border bg-card/60 backdrop-blur-sm shadow-sm shadow-success/10">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-success to-success/40" />
          <div className="flex items-start justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Online now
              </p>
              {loading ? (
                <div className="mt-2 h-9 w-20 animate-shimmer rounded bg-muted/60" />
              ) : (
                <div className="mt-1 flex items-baseline gap-2">
                  <AnimatedCounter
                    value={online}
                    className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
                  />
                  {online > 0 && (
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
              <p className="mt-1 text-xs text-muted-foreground">heartbeat within 60s</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-success/10 text-success">
              <Radio className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Offline */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        whileHover={{ y: -2 }}
      >
        <Card className="relative overflow-hidden border-border bg-card/60 backdrop-blur-sm">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-danger/60 to-danger/10" />
          <div className="flex items-start justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Offline
              </p>
              {loading ? (
                <div className="mt-2 h-9 w-20 animate-shimmer rounded bg-muted/60" />
              ) : (
                <AnimatedCounter
                  value={offline}
                  className="mt-1 block text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
                />
              )}
              <p className="mt-1 text-xs text-muted-foreground">no recent heartbeat</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-danger/10 text-danger">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Uptime */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        whileHover={{ y: -2 }}
      >
        <Card className="relative overflow-hidden border-border bg-card/60 backdrop-blur-sm">
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-sky-500 to-sky-500/40" />
          <div className="flex items-start justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Uptime
              </p>
              {loading ? (
                <div className="mt-2 h-9 w-20 animate-shimmer rounded bg-muted/60" />
              ) : (
                <div className="mt-1 flex items-baseline gap-1">
                  <AnimatedCounter
                    value={uptime}
                    decimals={1}
                    className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
                  />
                  <span className="text-xl font-semibold text-muted-foreground">%</span>
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">live fleet uptime</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
