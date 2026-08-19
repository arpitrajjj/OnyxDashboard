import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useSSE } from "./useSSE";
import type { ConnectionStatus, Device, RefreshInterval } from "@/types";

/** Orchestrates the device list: initial fetch, SSE updates, polling fallback. */
export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [online, setOnline] = useState(0);
  const [offline, setOffline] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refresh, setRefresh] = useState<RefreshInterval>(10);
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

  return {
    devices, total, online, offline,
    loading, error, lastUpdated,
    refresh, setRefresh,
    refreshNow,
    removeDevice,
    connectionStatus: status as ConnectionStatus,
    reconnect,
  };
}
