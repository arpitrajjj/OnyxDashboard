import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Inbox, Search, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import type { Device, SMSMessage } from "@/types";

type Props = {
  /** Live SMS stream from SSE — appended to the displayed list. */
  incomingSms: SMSMessage[];
  devices: Device[];
};

/**
 * Global SMS feed — shows all SMS across all devices, newest first.
 *
 * Polls /api/sms every 1s AND merges any `sms_received` SSE events.
 * Filter by direction (inbox / sent / all) and search across body + address.
 */
export function SmsView({ incomingSms, devices }: Props) {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [direction, setDirection] = useState<"all" | "inbox" | "sent">("all");
  const [search, setSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const pollRef = useRef<number | null>(null);
  const seenIds = useRef<Set<number>>(new Set());

  const deviceName = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of devices) {
      map.set(d.device_id, d.name || d.device_id);
    }
    return (id: string) => map.get(id) || id;
  }, [devices]);

  // Initial fetch + 1s polling
  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.listAllSms(200);
        setMessages(r.messages);
        for (const m of r.messages) seenIds.current.add(m.id);
        setLoadingLocal(false);
      } catch (e) {
        setLoadingLocal(false);
      }
    };
    load();
    pollRef.current = window.setInterval(load, 1000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  // Merge SSE events
  useEffect(() => {
    if (incomingSms.length === 0) return;
    setMessages((prev) => {
      let changed = false;
      const next = [...prev];
      for (const m of incomingSms) {
        if (seenIds.current.has(m.id)) continue;
        seenIds.current.add(m.id);
        if (next.length === 0 || next[0].id !== m.id) {
          next.unshift(m);
          changed = true;
        }
      }
      return changed ? next.slice(0, 200) : prev;
    });
  }, [incomingSms]);

  const filtered = useMemo(() => {
    let list = messages;
    if (direction !== "all") list = list.filter((m) => m.direction === direction);
    if (deviceFilter !== "all") list = list.filter((m) => m.device_id === deviceFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (m) =>
          (m.body || "").toLowerCase().includes(q) ||
          (m.address || "").toLowerCase().includes(q) ||
          (m.device_id || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [messages, direction, deviceFilter, search]);

  const inboxCount = messages.filter((m) => m.direction === "inbox").length;
  const sentCount = messages.filter((m) => m.direction === "sent").length;

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">SMS Activity</h2>
          <p className="text-sm text-muted-foreground">
            Global feed — every SMS across all devices, live.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="default" className="gap-1.5">
            <Inbox className="h-3 w-3" /> {inboxCount} inbox
          </Badge>
          <Badge variant="success" className="gap-1.5">
            <Send className="h-3 w-3" /> {sentCount} sent
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by body, address, or device ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <Select value={deviceFilter} onValueChange={setDeviceFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All devices" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All devices</SelectItem>
            {devices.map((d) => (
              <SelectItem key={d.device_id} value={d.device_id}>
                {d.name || d.device_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="inbox">Inbox</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feed */}
      <div className="space-y-2 min-w-0">
        {loadingLocal && messages.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center gap-2 py-16 text-sm text-muted-foreground">
            <Inbox className="h-8 w-8 opacity-40" />
            No SMS activity matches your filters.
            <p className="max-w-sm text-center text-xs">
              When any device sends or receives a text, it will appear here within ~1 second.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((m) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
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
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {m.direction === "inbox" ? (
                      <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-success" />
                    )}
                    <span className={cn("font-medium truncate", m.direction === "inbox" ? "text-primary" : "text-success")}>
                      {m.direction === "inbox" ? m.address || "Unknown sender" : `To: ${m.address || "—"}`}
                    </span>
                  </div>
                  <span className="font-mono text-muted-foreground shrink-0">{timeAgo(m.received_at)}</span>
                </div>
                <p className="mt-1.5 text-sm text-foreground whitespace-pre-wrap break-words">
                  {m.body}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <code className="font-mono truncate">{deviceName(m.device_id)}</code>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
