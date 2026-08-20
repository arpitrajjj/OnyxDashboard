import { motion } from "framer-motion";
import { Code2, LayoutDashboard, MessageSquare, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabId } from "@/types";

type NavItem = {
  id: TabId;
  label: string;
  icon: LucideIcon;
};

const items: NavItem[] = [
  { id: "overview", label: "Home",    icon: LayoutDashboard },
  { id: "devices",  label: "Devices",  icon: Smartphone },
  { id: "sms",      label: "SMS",      icon: MessageSquare },
  { id: "api",      label: "API",      icon: Code2 },
];

type Props = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

/**
 * Mobile bottom tab bar — visible only on screens narrower than `lg`.
 * Mirrors the desktop sidebar's tab list.
 */
export function BottomTabs({ activeTab, onTabChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-border bg-card/90 backdrop-blur-xl lg:hidden">
      {items.map((it) => {
        const Icon = it.icon;
        const active = it.id === activeTab;
        return (
          <button
            key={it.id}
            onClick={() => onTabChange(it.id)}
            className={cn(
              "relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="bottom-tab-active"
                className="absolute -top-px h-0.5 w-12 rounded-full bg-primary"
              />
            )}
            <Icon className="h-5 w-5" />
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
