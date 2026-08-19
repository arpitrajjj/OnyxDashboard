import type { DeviceListResponse, Device } from "@/types";

/**
 * API base URL — defaults to same-origin (so the React SPA served by Flask
 * talks to its own /api endpoints). In local dev, Vite proxies /api to
 * localhost:5000. Override at runtime with VITE_API_BASE if needed.
 */
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "";

const json = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const j = await r.json();
      if (j?.error) msg = j.error;
    } catch {
      /* swallow */
    }
    throw new Error(msg);
  }
  return r.status === 204 ? (undefined as T) : ((await r.json()) as T);
};

export const api = {
  listDevices: (params: { status?: string; q?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.q) qs.set("q", params.q);
    const suffix = qs.toString() ? `?${qs}` : "";
    return json<DeviceListResponse>(`${API_BASE}/api/devices${suffix}`);
  },
  register: (payload: Partial<Device> & { device_id: string }) =>
    json<{ ok: boolean; device_id: string }>(`${API_BASE}/api/register`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  heartbeat: (device_id: string) =>
    json<{ ok: boolean; last_seen: string }>(`${API_BASE}/api/heartbeat`, {
      method: "POST",
      body: JSON.stringify({ device_id }),
    }),
  delete: (device_id: string) =>
    json<{ ok: boolean; device_id: string }>(
      `${API_BASE}/api/devices/${encodeURIComponent(device_id)}`,
      { method: "DELETE" }
    ),
  health: () => json<{ ok: boolean; service: string; time: string }>(`${API_BASE}/healthz`),
};

/** SSE endpoint URL. Same origin in production. */
export const SSE_URL = `${API_BASE}/api/events`;
