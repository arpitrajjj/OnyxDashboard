import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Inbox,
  MessageSquare,
  Send,
  Smartphone,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import type { Device, SMSMessage } from "@/types";

type Props = {
  device: Device | null;
  onClose: () => void;
  /** Live SMS stream pushed via SSE — appended to the displayed list. */
  incomingSms: SMSMessage[];
};

/**
 * Slide-in drawer showing real-time SMS for a single device.
 *
 * Polls /api/devices/{id}/sms every 1s for fresh messages AND appends any
 * `sms_received` events from SSE that match this device's ID, so updates
 * appear instantly when a device sends or receives a text.
 */
export function DeviceSmsDrawer({ device, onClose, incomingSms }: Props) {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const incomingSeenIds = useRef<Set<number>>(new Set());

  // Initial fetch + 1s polling for the device's SMS list.
  useEffect(() => {
    if (!device) return;
    const deviceId = device.device_id;
    setLoading(true);
    setError(null);
    setMessages([]);
    incomingSeenIds.current = new Set();

    const load = async () => {
      try {
        const r = await api.listSms(deviceId, 100);
        setMessages(r.messages);
        for (const m of r.messages) incomingSeenIds.current.add(m.id);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load SMS");
      } finally {
        setLoading(false);
      }
    };
    load();
    pollRef.current = window.setInterval(load, 1000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [device]);

  // Apply incoming SSE sms events that belong to this device.
  useEffect(() => {
    if (!device || incomingSms.length === 0) return;
    const mine = incomingSms.filter((m) => m.device_id === device.device_id);
    if (mine.length === 0) return;
    setMessages((prev) => {
      const next = [...prev];
      for (const m of mine) {
        if (incomingSeenIds.current.has(m.id)) continue;
        incomingSeenIds.current.add(m.id);
        // Only insert if not already at the top.
        if (next.length === 0 || next[0].id !== m.id) {
          next.unshift(m);
        }
      }
      // Trim to the last 100 messages
      return next.slice(0, 100);
    });
  }, [incomingSms, device]);

  const inboxCount = messages.filter((m) => m.direction === "inbox").length;
  const sentCount = messages.filter((m) => m.direction === "sent").length;

  return (
    <AnimatePresence>
      {device && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-md border-l border-border bg-card shadow-2xl flex flex-col"
          >
            {/* Header */}
            <header className="flex items-start justify-between gap-3 border-b border-border p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Smartphone className="h-3.5 w-3.5" />
                  Device
                </div>
                <h2 className="mt-1 truncate text-lg font-bold tracking-tight">
                  {device.name || device.device_id}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={device.online ? "success" : "muted"} className="gap-1.5">
                    <span className="relative inline-flex h-1.5 w-1.5">
                      {device.online && (
                        <motion.span
                          className="absolute inline-flex h-full w-full rounded-full bg-success/60"
                          animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                        />
                      )}
                      <span
                        className={cn(
                          "relative inline-flex h-1.5 w-1.5 rounded-full",
                          device.online ? "bg-success" : "bg-muted-foreground"
                        )}
                      />
                    </span>
                    {device.online ? "Online" : "Offline"}
                  </Badge>
                  <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {device.device_id}
                  </code>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </header>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 border-b border-border px-5 py-4">
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <Inbox className="mx-auto h-4 w-4 text-primary" />
                <div className="mt-1 text-lg font-bold text-foreground">{inboxCount}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Inbox</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <Send className="mx-auto h-4 w-4 text-success" />
                <div className="mt-1 text-lg font-bold text-foreground">{sentCount}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sent</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <MessageSquare className="mx-auto h-4 w-4 text-muted-foreground" />
                <div className="mt-1 text-lg font-bold text-foreground">{messages.length}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</div>
              </div>
            </div>

            {/* Meta */}
            <div className="border-b border-border px-5 py-3 text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Model</span>
                <span className="text-foreground">{device.model || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>OS</span>
                <span className="text-foreground">{device.os_version || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>App version</span>
                <span className="text-foreground font-mono">{device.app_version || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Last heartbeat</span>
                <span className="text-foreground font-mono">{timeAgo(device.last_seen)}</span>
              </div>
            </div>

            {/* SMS list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>SMS activity</span>
                <span>Updates every 1s · SSE</span>
              </div>
              {loading && messages.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))
              ) : error ? (
                <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                  {error}
                </div>
              ) : messages.length === 0 ? (
                <div className="grid place-items-center gap-2 py-12 text-sm text-muted-foreground">
                  <Inbox className="h-8 w-8 opacity-40" />
                  No SMS activity yet.
                  <p className="max-w-xs text-center text-xs">
                    When this device sends or receives an SMS, it will appear here in real time.
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      layout
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "rounded-lg border p-3",
                        m.direction === "inbox"
                          ? "border-primary/30 bg-primary/5"
                          : "border-success/30 bg-success/5"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          {m.direction === "inbox" ? (
                            <>
                              <ArrowDownLeft className="h-3 w-3 text-primary" />
                              <span className="text-primary">{m.address || "Unknown sender"}</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-3 w-3 text-success" />
                              <span className="text-success">To: {m.address || "—"}</span>
                            </>
                          )}
                        </span>
                        <span className="font-mono">{timeAgo(m.received_at)}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-foreground whitespace-pre-wrap break-words">
                        {m.body}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
