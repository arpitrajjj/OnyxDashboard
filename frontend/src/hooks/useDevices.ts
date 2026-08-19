import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useSSE } from "./useSSE";
import type { ConnectionStatus, Device, RefreshInterval, SMSMessage } from "@/types";

type OnlineToast = {
  id: string;
  device_id: string;
  name: string;
  ts: number;
};

/**
 * Orchestrates the device list: initial fetch, SSE updates, polling fallback.
 * Also exposes:
 *   - `incomingSms` — every SMS pushed via SSE (drawer consumes)
 *   - `onlineToasts` — pulses for devices that just came online
 *   - `dismissToast(id)` — to dismiss after the user has seen it
 */
export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [online, setOnline] = useState(0);
  const [offline, setOffline] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refresh, setRefresh] = useState<RefreshInterval>(10);
  const [incomingSms, setIncomingSms] = useState<SMSMessage[]>([]);
  const [onlineToasts, setOnlineToasts] = useState<OnlineToast[]>([]);
  const pollRef = useRef<number | null>(null);

  const { status, subscribe, reconnect } = useSSE();

  const refreshNow = useCallback(async () => {
    try {
      const r = await api.listDevices();
      setDevices(r.devices);
      setTotal(r.count);
      setOnline(r.online);
      setOffline(r.offline);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshNow();
  }, [refreshNow]);

  // SSE subscriptions — apply delta updates immediately for instant feedback
  useEffect(() => {
    const off = subscribe((e) => {
      switch (e.type) {
        case "device_registered":
        case "device_updated":
        case "heartbeat": {
          const d = e.data as Device;
          if (!d?.device_id) return;
          setDevices((prev) => {
            const next = [...prev];
            const idx = next.findIndex((x) => x.device_id === d.device_id);
            if (idx >= 0) next[idx] = d;
            else next.unshift(d);
            return next;
          });
          // Recompute counts locally — they're cheap.
          setDevices((prev) => {
            const o = prev.filter((x) => x.online).length;
            setOnline(o);
            setOffline(prev.length - o);
            setTotal(prev.length);
            return prev;
          });
          setLastUpdated(new Date());
          break;
        }
        case "device_online": {
          const d = e.data as Device;
          if (!d?.device_id) return;
          // Push a toast for the dashboard UI.
          const t: OnlineToast = {
            id: `${d.device_id}-${Date.now()}`,
            device_id: d.device_id,
            name: d.name || d.device_id,
            ts: Date.now(),
          };
          setOnlineToasts((prev) => [...prev.slice(-4), t]);
          // Auto-dismiss after 4s.
          window.setTimeout(() => {
            setOnlineToasts((prev) => prev.filter((x) => x.id !== t.id));
          }, 4000);
          break;
        }
        case "device_offline":
          break;
        case "sms_received": {
          const m = e.data as SMSMessage;
          if (!m?.device_id) return;
          setIncomingSms((prev) => [...prev.slice(-50), m]);
          break;
        }
        case "device_deleted": {
          const id = (e.data as { device_id?: string }).device_id;
          if (!id) return;
          setDevices((prev) => {
            const next = prev.filter((x) => x.device_id !== id);
            const o = next.filter((x) => x.online).length;
            setOnline(o);
            setOffline(next.length - o);
            setTotal(next.length);
            return next;
          });
          setLastUpdated(new Date());
          break;
        }
        case "hello":
          break;
      }
    });
    return off;
  }, [subscribe]);

  // Polling fallback — when SSE is not live, poll at the user's chosen interval.
  useEffect(() => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (refresh === 0) return;
    pollRef.current = window.setInterval(
      () => {
        // If SSE is live, polling is redundant; only poll when not live.
        if (status === "live") return;
        refreshNow();
      },
      refresh * 1000
    );
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [refresh, status, refreshNow]);

  // When SSE reconnects, do a fresh full fetch to reconcile state.
  useEffect(() => {
    if (status === "live") refreshNow();
  }, [status, refreshNow]);

  // Recompute online/offline status every 1 second.
  //
  // Why: a device's `online` flag is derived from `last_seen` vs the
  // backend's heartbeat timeout (5s). If the device stops sending
  // heartbeats, the existing in-memory device record stays "online"
  // until the next SSE event arrives — but no event arrives when a
  // device goes silent. This 1s tick recomputes the flag locally so
  // the UI flips to "offline" within ~1s of the timeout expiring,
  // without needing a server round-trip.
  useEffect(() => {
    const id = window.setInterval(() => {
      setDevices((prev) => {
        let changed = false;
        const now = Date.now();
        const timeoutMs = 5_000;  // matches the backend's HEARTBEAT_TIMEOUT_SECONDS
        const next = prev.map((d) => {
          const ts = new Date(d.last_seen.endsWith("Z") ? d.last_seen : d.last_seen + "Z").getTime();
          const isOnline = !Number.isNaN(ts) && now - ts < timeoutMs;
          if (isOnline !== d.online) {
            changed = true;
            return { ...d, online: isOnline };
          }
          return d;
        });
        if (!changed) return prev;
        // Recompute counts if anything flipped
        const o = next.filter((x) => x.online).length;
        setOnline(o);
        setOffline(next.length - o);
        setTotal(next.length);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const removeDevice = useCallback(async (id: string) => {
    await api.delete(id);
    setDevices((prev) => {
      const next = prev.filter((x) => x.device_id !== id);
      const o = next.filter((x) => x.online).length;
      setOnline(o);
      setOffline(next.length - o);
      setTotal(next.length);
      return next;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setOnlineToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return {
    devices, total, online, offline,
    loading, error, lastUpdated,
    refresh, setRefresh,
    refreshNow,
    removeDevice,
    connectionStatus: status as ConnectionStatus,
    reconnect,
    incomingSms,
    onlineToasts,
    dismissToast,
  };
}
