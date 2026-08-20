import { motion } from "framer-motion";
import {
  Code2,
  LayoutDashboard,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

/**
 * Desktop sidebar — acts as vertical tab navigation. Visible on lg+ screens.
 * On mobile, the same items are available via the hamburger menu.
 */
export function Sidebar({ activeTab, onTabChange }: Props) {
  return (
    <aside className="hidden lg:flex h-screen w-60 flex-col border-r border-border bg-card/40 backdrop-blur-xl sticky top-0">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/30">
          <span className="text-sm font-bold">◆</span>
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">OnyxDashboard</div>
          <div className="text-[11px] text-muted-foreground">Device Fleet Console</div>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          const active = it.id === activeTab;
          return (
            <button
              key={it.id}
              onClick={() => onTabChange(it.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {it.label}
              {active && (
                <motion.span
                  layoutId="sidebar-active-dot"
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/0 p-3">
          <div className="text-xs font-semibold text-foreground">OnyxBridge</div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Pair this dashboard with the OnyxBridge Android library for live heartbeats
            and real-time SMS.
          </p>
        </div>
      </div>
    </aside>
  );
}

export { items as sidebarItems };
