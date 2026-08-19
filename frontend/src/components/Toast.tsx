import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastKind = "success" | "error" | "info";

export type ToastState = {
  id: number;
  kind: ToastKind;
  message: string;
};

let counter = 0;
const listeners = new Set<(t: ToastState) => void>();

export function toast(message: string, kind: ToastKind = "info") {
  counter += 1;
  const t: ToastState = { id: counter, kind, message };
  listeners.forEach((fn) => fn(t));
}

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  useEffect(() => {
    const fn = (t: ToastState) => {
      setToasts((prev) => [...prev, t]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 3500);
    };
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon =
            t.kind === "success" ? CheckCircle2 : t.kind === "error" ? XCircle : CheckCircle2;
          const accent =
            t.kind === "success"
              ? "border-success/40 text-success"
              : t.kind === "error"
              ? "border-danger/40 text-danger"
              : "border-primary/40 text-primary";
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className={`pointer-events-auto flex items-center gap-2 rounded-lg border ${accent} bg-card/95 px-4 py-2.5 text-sm shadow-lg backdrop-blur`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
