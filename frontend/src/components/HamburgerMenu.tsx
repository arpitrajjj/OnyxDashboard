import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  LayoutDashboard,
  Radio,
  Server,
  Smartphone,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type NavItem = {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const items: NavItem[] = [
  { id: "stats", label: "Home", icon: LayoutDashboard },
  { id: "devices", label: "Devices", icon: Smartphone },
  { id: "api", label: "API Reference", icon: Code2 },
];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onJumpTo: (anchor: string) => void;
};

/**
 * Mobile hamburger slide-in menu. Slides in from the left with a backdrop.
 * Visible only on screens narrower than `lg` — desktop uses the Sidebar.
 */
export function HamburgerMenu({ open, onOpenChange, onJumpTo }: Props) {
  // Close on Escape (better UX + works for accessibility)
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
                return (
                  <button
                    key={it.id}
                    onClick={() => {
                      onJumpTo(it.id);
                      onOpenChange(false);
                    }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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

export { Radio, Server };
