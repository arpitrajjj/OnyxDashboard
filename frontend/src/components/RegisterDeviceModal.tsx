import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

type Props = {
  onRegistered?: () => void;
  /** External open state — when set, the modal is controlled. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function RegisterDeviceModal({ onRegistered, open, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    if (open === undefined) setInternalOpen(v);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries()) as {
      device_id: string;
      name?: string;
      model?: string;
      os_version?: string;
      app_version?: string;
    };
    if (!payload.name) payload.name = payload.device_id;
    try {
      await api.register(payload);
      setOpen(false);
      onRegistered?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="shrink-0">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Register device</span>
        <span className="sm:hidden">Register</span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", damping: 22, stiffness: 320 }}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mb-5">
                <h2 className="text-lg font-semibold">Register a new device</h2>
                <p className="text-sm text-muted-foreground">
                  Simulates a registration call the OnyxBridge Android library would make
                  on first launch.
                </p>
              </div>
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <Label htmlFor="device_id">Device ID</Label>
                  <Input
                    id="device_id"
                    name="device_id"
                    required
                    placeholder="pixel-7-pro-001"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" name="name" placeholder="Pixel 7 Pro" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" name="model" placeholder="Pixel 7 Pro" />
                  </div>
                  <div>
                    <Label htmlFor="os_version">OS version</Label>
                    <Input id="os_version" name="os_version" placeholder="Android 14" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="app_version">App version</Label>
                  <Input id="app_version" name="app_version" placeholder="1.0.4" />
                </div>
                {error && (
                  <p className="text-xs text-danger">{error}</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Registering…" : "Register"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
