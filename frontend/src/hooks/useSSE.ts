import { useCallback, useEffect, useRef, useState } from "react";
import { SSE_URL } from "@/lib/api";
import type { ConnectionStatus, SSEEvent } from "@/types";

type Listener = (event: SSEEvent) => void;

/**
 * SSE hook. Connects to /api/events, falls back to polling if the
 * EventSource errors out (Render cold-start, network blips, etc.).
 *
 * Returns the connection status and a subscribe() function the consumer
 * uses to register per-event-type handlers.
 */
export function useSSE() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const listenersRef = useRef<Set<Listener>>(new Set());
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef<number>(1500);
  const pollTimerRef = useRef<number | null>(null);

  const dispatch = useCallback((e: SSEEvent) => {
    listenersRef.current.forEach((fn) => {
      try { fn(e); } catch { /* swallow listener errors */ }
    });
  }, []);

  const connect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
    try {
      const src = new EventSource(SSE_URL);
      sourceRef.current = src;

      src.addEventListener("open", () => {
        setStatus("live");
        retryRef.current = 1500;
      });

      src.addEventListener("hello", (ev) => {
        try {
          dispatch({ type: "hello", data: JSON.parse((ev as MessageEvent).data) });
        } catch { /* ignore */ }
      });

      src.addEventListener("device_registered", (ev) => {
        try {
          dispatch({ type: "device_registered", data: JSON.parse((ev as MessageEvent).data) });
        } catch { /* ignore */ }
      });

      src.addEventListener("device_updated", (ev) => {
        try {
          dispatch({ type: "device_updated", data: JSON.parse((ev as MessageEvent).data) });
        } catch { /* ignore */ }
      });

      src.addEventListener("device_deleted", (ev) => {
        try {
          dispatch({ type: "device_deleted", data: JSON.parse((ev as MessageEvent).data) });
        } catch { /* ignore */ }
      });

      src.addEventListener("heartbeat", (ev) => {
        try {
          dispatch({ type: "heartbeat", data: JSON.parse((ev as MessageEvent).data) });
        } catch { /* ignore */ }
      });

      src.addEventListener("device_online", (ev) => {
        try {
          dispatch({ type: "device_online", data: JSON.parse((ev as MessageEvent).data) });
        } catch { /* ignore */ }
      });

      src.addEventListener("device_offline", (ev) => {
        try {
          dispatch({ type: "device_offline", data: JSON.parse((ev as MessageEvent).data) });
        } catch { /* ignore */ }
      });

      src.addEventListener("sms_received", (ev) => {
        try {
          dispatch({ type: "sms_received", data: JSON.parse((ev as MessageEvent).data) });
        } catch { /* ignore */ }
      });

      src.addEventListener("error", () => {
        setStatus("error");
        src.close();
        sourceRef.current = null;
        const wait = Math.min(retryRef.current * 2, 15000);
        retryRef.current = wait;
        window.setTimeout(connect, wait);
      });
    } catch {
      setStatus("error");
    }
  }, [dispatch]);

  // Subscribe / unsubscribe
  const subscribe = useCallback((fn: Listener) => {
    listenersRef.current.add(fn);
    return () => { listenersRef.current.delete(fn); };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (sourceRef.current) sourceRef.current.close();
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, [connect]);

  return { status, subscribe, reconnect: connect };
}
