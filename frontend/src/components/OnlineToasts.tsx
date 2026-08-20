import { motion, AnimatePresence } from "framer-motion";
import { Radio, X } from "lucide-react";

type Toast = {
  id: string;
  device_id: string;
  name: string;
  ts: number;
};

type Props = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

/**
 * Top-center toast notifications that fire when a device comes online via SSE.
 * Stacks up to 5 toasts; auto-dismissed by useDevices after 4s, but the user
 * can also tap the ✕ to clear one early.
 */
export function OnlineToasts({ toasts, onDismiss }: Props) {
  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-50 -translate-x-1/2 flex flex-col gap-2 w-[min(92vw,420px)]">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            className="pointer-events-auto flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 px-4 py-2.5 shadow-lg backdrop-blur-md"
          >
            <span className="relative inline-flex h-2.5 w-2.5">
              <motion.span
                className="absolute inline-flex h-full w-full rounded-full bg-success/50"
                animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            <Radio className="h-4 w-4 text-success" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">
                {t.name} came online
              </div>
              <code className="text-[10px] font-mono text-muted-foreground">
                {t.device_id}
              </code>
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
