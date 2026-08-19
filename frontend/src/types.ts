export type Device = {
  device_id: string;
  name: string;
  model: string;
  os_version: string;
  app_version: string;
  ip_address: string;
  registered_at: string;
  last_seen: string;
  online: boolean;
};

export type DeviceListResponse = {
  ok: boolean;
  count: number;
  online: number;
  offline: number;
  devices: Device[];
};

export type SMSMessage = {
  id: number;
  device_id: string;
  direction: "inbox" | "sent";
  address: string;
  body: string;
  received_at: string;
};

export type SMSListResponse = {
  ok: boolean;
  count: number;
  device_id: string;
  messages: SMSMessage[];
};

export type SSEEvent<T = unknown> = {
  type:
    | "hello"
    | "device_updated"
    | "device_registered"
    | "device_deleted"
    | "heartbeat"
    | "device_online"
    | "device_offline"
    | "sms_received";
  data: T;
  ts?: string;
};

export type ConnectionStatus = "connecting" | "live" | "polling" | "error";

export type Theme = "dark" | "light";

export type RefreshInterval = 0 | 5 | 10 | 30;

export type SortKey = "name" | "device_id" | "model" | "os_version" | "app_version" | "ip_address" | "last_seen" | "online";

export type SortDirection = "asc" | "desc";
