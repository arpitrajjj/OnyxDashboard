import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Menu, RefreshCw } from "lucide-react";
import { useState } from "react";
import { BottomTabs } from "@/components/BottomTabs";
import { DeviceSmsDrawer } from "@/components/DeviceSmsDrawer";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { LiveIndicator } from "@/components/LiveIndicator";
import { OnlineToasts } from "@/components/OnlineToasts";
import { RegisterDeviceModal } from "@/components/RegisterDeviceModal";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToastViewport, toast } from "@/components/Toast";
import { ApiView } from "@/components/views/ApiView";
import { DevicesView } from "@/components/views/DevicesView";
import { OverviewView } from "@/components/views/OverviewView";
import { SmsView } from "@/components/views/SmsView";
import { useDevices } from "@/hooks/useDevices";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Device, TabId } from "@/types";

const tabTitles: Record<TabId, { title: string; sub: string }> = {
  overview: { title: "Dashboard",       sub: "Real-time device fleet overview" },
  devices:  { title: "Devices",          sub: "All registered devices — tap any row to view its SMS" },
  sms:      { title: "SMS Activity",     sub: "Live SMS feed across all devices" },
  api:      { title: "API Reference",    sub: "Endpoints the OnyxBridge Android library calls" },
};

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
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  async function handleDelete(id: string) {
    try {
      await removeDevice(id);
      toast(`Removed device ${id}`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  }

  const meta = tabTitles[activeTab];

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 min-w-0 space-y-6 px-4 py-6 pb-24 sm:px-8 sm:py-8 lg:px-10 lg:py-10 lg:pb-10">
        {/* Top bar — title + subtitle change with the active tab */}
        <header className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => setHamburgerOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary lg:hidden shrink-0" />
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{meta.title}</h1>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{meta.sub}</p>
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

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={cn("min-w-0")}
          >
            {activeTab === "overview" && (
              <OverviewView
                total={total}
                online={online}
                offline={offline}
                loading={loading}
                devices={devices}
                onJumpToDevices={() => setActiveTab("devices")}
              />
            )}
            {activeTab === "devices" && (
              <DevicesView
                devices={devices}
                loading={loading}
                lastUpdated={lastUpdated}
                interval={interval}
                onIntervalChange={setRefresh}
                onRefresh={() => refreshNow()}
                onDelete={handleDelete}
                onSelectDevice={setSelectedDevice}
              />
            )}
            {activeTab === "sms" && (
              <SmsView
                incomingSms={incomingSms}
                devices={devices}
              />
            )}
            {activeTab === "api" && <ApiView />}
          </motion.div>
        </AnimatePresence>

        <footer className="pt-6 text-center text-xs text-muted-foreground">
          OnyxDashboard · powered by Flask + React + Vite + Tailwind · SSE-driven real-time
        </footer>
      </main>

      {/* Mobile slide-in hamburger menu (mirrors sidebar's tab list) */}
      <HamburgerMenu
        open={hamburgerOpen}
        onOpenChange={setHamburgerOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Mobile bottom tab bar */}
      <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Online toast notifications (SSE device_online events) */}
      <OnlineToasts toasts={onlineToasts} onDismiss={dismissToast} />

      {/* Device SMS drawer (opens when a device row is tapped) */}
      <DeviceSmsDrawer
        device={selectedDevice}
        onClose={() => setSelectedDevice(null)}
        incomingSms={incomingSms}
      />

      <ToastViewport />
    </div>
  );
}
