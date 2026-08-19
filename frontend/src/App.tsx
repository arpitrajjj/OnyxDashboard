import { motion } from "framer-motion";
import { LayoutDashboard, RefreshCw } from "lucide-react";
import { ApiReference } from "@/components/ApiReference";
import { DeviceTable } from "@/components/DeviceTable";
import { LiveIndicator } from "@/components/LiveIndicator";
import { RefreshControl } from "@/components/RefreshControl";
import { RegisterDeviceModal } from "@/components/RegisterDeviceModal";
import { Sidebar } from "@/components/Sidebar";
import { StatGrid } from "@/components/StatGrid";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToastViewport, toast } from "@/components/Toast";
import { useDevices } from "@/hooks/useDevices";
import { Button } from "@/components/ui/button";

export default function App() {
  const {
    devices,
    total,
    online,
    offline,
    loading,
    error,
    lastUpdated,
    refresh: interval,
    setRefresh,
    refreshNow,
    removeDevice,
    connectionStatus,
  } = useDevices();

  async function handleDelete(id: string) {
    try {
      await removeDevice(id);
      toast(`Removed device ${id}`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 space-y-6 px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        {/* Top bar */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-primary lg:hidden" />
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Real-time device fleet overview with live heartbeat tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LiveIndicator status={connectionStatus} />
            <RegisterDeviceModal
              onRegistered={() => {
                toast("Device registered", "success");
                refreshNow();
              }}
            />
            <Button variant="outline" size="icon" onClick={() => refreshNow()} aria-label="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            <strong>Backend error:</strong> {error}
          </div>
        )}

        {/* Stats */}
        <StatGrid total={total} online={online} offline={offline} loading={loading} />

        {/* Devices panel */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Devices</h2>
              <p className="text-sm text-muted-foreground">
                Live table with online/offline status badges — click any column to sort.
              </p>
            </div>
            <RefreshControl
              lastUpdated={lastUpdated}
              interval={interval}
              onIntervalChange={setRefresh}
            />
          </div>

          <DeviceTable
            devices={devices}
            loading={loading}
            onRefresh={() => refreshNow()}
            onDelete={handleDelete}
          />
        </motion.section>

        {/* API Reference */}
        <ApiReference />

        <footer className="pt-6 text-center text-xs text-muted-foreground">
          OnyxDashboard · powered by Flask + React + Vite + Tailwind · SSE-driven real-time
        </footer>
      </main>

      <ToastViewport />
    </div>
  );
}
