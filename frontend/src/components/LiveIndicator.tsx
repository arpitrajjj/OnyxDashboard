import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ConnectionStatus } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  status: ConnectionStatus;
  className?: string;
};

const config: Record<
  ConnectionStatus,
  { label: string; dot: string; ring: string; pulse: boolean }
> = {
  live: {
    label: "Live",
    dot: "bg-success",
    ring: "bg-success/20",
    pulse: true,
  },
  connecting: {
    label: "Connecting",
    dot: "bg-amber-500",
    ring: "bg-amber-500/20",
    pulse: true,
  },
  polling: {
    label: "Polling",
    dot: "bg-sky-500",
    ring: "bg-sky-500/20",
    pulse: false,
  },
  error: {
    label: "Disconnected",
    dot: "bg-danger",
    ring: "bg-danger/20",
    pulse: false,
  },
};

export function LiveIndicator({ status, className }: Props) {
  const c = config[status];
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-semibold shadow-sm",
              className
            )}
          >
            <span className="relative inline-flex h-2 w-2">
              {c.pulse && (
                <motion.span
                  className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", c.ring)}
                  animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <span className={cn("relative inline-flex h-2 w-2 rounded-full", c.dot)} />
            </span>
            <span className="text-foreground/80">{c.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">
            {status === "live" && "Real-time SSE stream connected — device updates appear instantly."}
            {status === "connecting" && "Establishing SSE connection to backend…"}
            {status === "polling" && "SSE unavailable, polling the API on a timer."}
            {status === "error" && "SSE connection lost. Retrying with backoff."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
