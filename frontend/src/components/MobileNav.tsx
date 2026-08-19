import { motion } from "framer-motion";
import { LayoutDashboard, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onRefresh: () => void;
  onRegister: () => void;
  onJumpTo: (anchor: string) => void;
};

const navItems = [
  { id: "stats", label: "Stats", icon: LayoutDashboard },
  { id: "devices", label: "Devices", icon: LayoutDashboard },
  { id: "api", label: "API", icon: LayoutDashboard },
];

/**
 * Mobile-only bottom navigation. Hidden on lg+ screens where the sidebar
 * provides the primary navigation. Touch-friendly 56px height.
 */
export function MobileNav({ onRefresh, onRegister, onJumpTo }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-border bg-card/90 backdrop-blur-xl lg:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onJumpTo(item.id)}
            className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </button>
        );
      })}
      <button
        onClick={onRefresh}
        className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <RefreshCw className="h-5 w-5" />
        Refresh
      </button>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onRegister}
        className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-primary"
      >
        <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-md shadow-primary/30">
          <Plus className="h-4 w-4" />
        </div>
        Register
      </motion.button>
    </nav>
  );
}

export { Button };
