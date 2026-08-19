import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Search,
  RefreshCw,
  Trash2,
  Smartphone,
  Monitor,
  Tablet,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, timeAgo } from "@/lib/utils";
import type { Device, SortDirection, SortKey } from "@/types";

type Props = {
  devices: Device[];
  loading: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => Promise<void>;
  onSelectDevice?: (device: Device) => void;
};

const sortKeys: { key: SortKey; label: string; hideOnMobile?: boolean }[] = [
  { key: "name",       label: "Name" },
  { key: "device_id",  label: "Device ID", hideOnMobile: true },
  { key: "model",      label: "Model",     hideOnMobile: true },
  { key: "os_version", label: "OS",        hideOnMobile: true },
  { key: "app_version",label: "App",       hideOnMobile: true },
  { key: "ip_address", label: "IP",        hideOnMobile: true },
  { key: "last_seen",  label: "Last seen" },
  { key: "online",     label: "Status" },
];

function getSortValue(d: Device, key: SortKey): string | number {
  if (key === "online") return d.online ? 1 : 0;
  return String(d[key] ?? "").toLowerCase();
}

function deviceIcon(d: Device) {
  // crude heuristic — phone by default, tablet for "fold/tab", monitor for "tv"
  const name = (d.name + " " + d.model).toLowerCase();
  if (name.includes("fold") || name.includes("tab") || name.includes("pad"))
    return <Tablet className="h-3.5 w-3.5" />;
  if (name.includes("tv") || name.includes("hub"))
    return <Monitor className="h-3.5 w-3.5" />;
  return <Smartphone className="h-3.5 w-3.5" />;
}

export function DeviceTable({ devices, loading, onRefresh, onDelete, onSelectDevice }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");
  const [sortKey, setSortKey] = useState<SortKey>("last_seen");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const filtered = useMemo(() => {
    let list = devices;
    if (filter === "online") list = list.filter((d) => d.online);
    if (filter === "offline") list = list.filter((d) => !d.online);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          (d.name || "").toLowerCase().includes(q) ||
          (d.device_id || "").toLowerCase().includes(q) ||
          (d.model || "").toLowerCase().includes(q) ||
          (d.os_version || "").toLowerCase().includes(q) ||
          (d.app_version || "").toLowerCase().includes(q) ||
          (d.ip_address || "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [devices, filter, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortHeader({ k, label, hideOnMobile }: { k: SortKey; label: string; hideOnMobile?: boolean }) {
    const active = k === sortKey;
    return (
      <TableHead
        className={cn(
          "cursor-pointer select-none",
          active && "text-foreground",
          hideOnMobile && "hidden md:table-cell"
        )}
        onClick={() => toggleSort(k)}
      >
        <span className="inline-flex items-center gap-1 hover:text-foreground">
          {label}
          {active ? (
            sortDir === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          )}
        </span>
      </TableHead>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, model, OS, IP…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="online">Online only</SelectItem>
            <SelectItem value="offline">Offline only</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={onRefresh} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[120px]">Status</TableHead>
              {sortKeys.map((c) => (
                <SortHeader key={c.key} k={c.key} label={c.label} />
              ))}
              <TableHead className="w-12 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                  No devices match your filters.
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence>
                {filtered.map((d) => (
                  <motion.tr
                    key={d.device_id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => onSelectDevice?.(d)}
                    className={cn(
                      "border-b border-border transition-colors hover:bg-muted/40",
                      onSelectDevice && "cursor-pointer"
                    )}
                  >
                    <TableCell>
                      <Badge
                        variant={d.online ? "success" : "muted"}
                        className="gap-1.5"
                      >
                        {d.online ? (
                          <span className="relative inline-flex h-1.5 w-1.5">
                            <motion.span
                              className="absolute inline-flex h-full w-full rounded-full bg-success/60"
                              animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                            />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                          </span>
                        ) : (
                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        )}
                        {d.online ? "Online" : "Offline"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{deviceIcon(d)}</span>
                        {d.name || d.device_id}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {d.device_id}
                      </code>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{d.model || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{d.os_version || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                      {d.app_version || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                      {d.ip_address || "—"}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {timeAgo(d.last_seen)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <span className="font-mono">{d.last_seen}</span>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-danger"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                onDelete(d.device_id);
                              }}
                              aria-label="Delete device"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove device</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Showing <strong className="text-foreground">{filtered.length}</strong> of{" "}
          <strong className="text-foreground">{devices.length}</strong> devices
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wifi className="h-3 w-3 text-success" />
          {devices.filter((d) => d.online).length} online
          <span className="mx-1 text-muted-foreground/40">·</span>
          <WifiOff className="h-3 w-3 text-muted-foreground" />
          {devices.filter((d) => !d.online).length} offline
        </span>
      </div>
    </div>
  );
}
