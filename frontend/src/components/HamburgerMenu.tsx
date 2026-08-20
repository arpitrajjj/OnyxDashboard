import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  LayoutDashboard,
  MessageSquare,
  Smartphone,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TabId } from "@/types";

type NavItem = {
  id: TabId;
  label: string;
  icon: LucideIcon;
};

const items: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "devices",  label: "Devices",  icon: Smartphone },
  { id: "sms",      label: "SMS",      icon: MessageSquare },
  { id: "api",      label: "API",      icon: Code2 },
];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

/**
 * Mobile hamburger slide-in menu — mirrors the desktop sidebar's tab list.
 */
export function HamburgerMenu({ open, onOpenChange, activeTab, onTabChange }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="absolute left-0 top-0 bottom-0 w-72 border-r border-border bg-card/95 backdrop-blur-xl shadow-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/30">
                  <span className="text-sm font-bold">◆</span>
                </div>
                <div>
                  <div className="text-sm font-semibold leading-tight">OnyxDashboard</div>
                  <div className="text-[11px] text-muted-foreground">Device Fleet Console</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <nav className="flex flex-col gap-1 p-3">
              {items.map((it) => {
                const Icon = it.icon;
                const active = it.id === activeTab;
                return (
                  <button
                    key={it.id}
                    onClick={() => {
                      onTabChange(it.id);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {it.label}
                  </button>
                );
              })}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
              <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/0 p-3">
                <div className="text-xs font-semibold text-foreground">OnyxBridge</div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Pair this dashboard with the OnyxBridge Android library for live heartbeats
                  and real-time SMS.
                </p>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
