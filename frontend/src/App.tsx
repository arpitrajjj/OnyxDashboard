import { motion } from "framer-motion";
import { LayoutDashboard, Menu, RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";
import { ApiReference } from "@/components/ApiReference";
import { DeviceSmsDrawer } from "@/components/DeviceSmsDrawer";
import { DeviceTable } from "@/components/DeviceTable";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { LiveIndicator } from "@/components/LiveIndicator";
import { OnlineToasts } from "@/components/OnlineToasts";
import { RefreshControl } from "@/components/RefreshControl";
import { RegisterDeviceModal } from "@/components/RegisterDeviceModal";
import { Sidebar } from "@/components/Sidebar";
import { StatGrid } from "@/components/StatGrid";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToastViewport, toast } from "@/components/Toast";
import { useDevices } from "@/hooks/useDevices";
import { Button } from "@/components/ui/button";
import type { Device } from "@/types";

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
    incomingSms,
    onlineToasts,
    dismissToast,
  } = useDevices();

  const [registerOpen, setRegisterOpen] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  async function handleDelete(id: string) {
    try {
      await removeDevice(id);
      toast(`Removed device ${id}`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  }

  const jumpTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 space-y-6 px-4 py-6 pb-24 sm:px-8 sm:py-8 lg:px-10 lg:py-10 lg:pb-10">
        {/* Top bar */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setHamburgerOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary lg:hidden" />
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Real-time device fleet overview · tap any device to view its SMS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LiveIndicator status={connectionStatus} />
            <RegisterDeviceModal
              open={registerOpen}
              onOpenChange={setRegisterOpen}
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
        <section id="stats">
          <StatGrid total={total} online={online} offline={offline} loading={loading} />
        </section>

        {/* Devices panel */}
        <motion.section
          id="devices"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Devices</h2>
              <p className="text-sm text-muted-foreground">
                Live table — click any row to view that device's real-time SMS.
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
            onSelectDevice={setSelectedDevice}
          />
        </motion.section>

        {/* API Reference */}
        <section id="api">
          <ApiReference />
        </section>

        <footer className="pt-6 text-center text-xs text-muted-foreground">
          OnyxDashboard · powered by Flask + React + Vite + Tailwind · SSE-driven real-time
        </footer>
      </main>

      {/* Mobile slide-in hamburger menu */}
      <HamburgerMenu
        open={hamburgerOpen}
        onOpenChange={setHamburgerOpen}
        onJumpTo={jumpTo}
      />

      {/* Online toast notifications (driven by SSE device_online events) */}
      <OnlineToasts toasts={onlineToasts} onDismiss={dismissToast} />

      {/* Device SMS drawer — opens when a device row is tapped */}
      <DeviceSmsDrawer
        device={selectedDevice}
        onClose={() => setSelectedDevice(null)}
        incomingSms={incomingSms}
      />

      <ToastViewport />
    </div>
  );
}
