import { motion } from "framer-motion";
import { LucideIcon, type LucideProps } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number;
  decimals?: number;
  sublabel?: string;
  icon: LucideIcon;
  iconProps?: LucideProps;
  accent?: "primary" | "success" | "danger" | "muted";
  pulse?: boolean;
  loading?: boolean;
};

const accentMap = {
  primary: {
    icon: "text-primary bg-primary/10",
    bar: "from-primary to-primary/40",
    glow: "shadow-primary/20",
  },
  success: {
    icon: "text-success bg-success/10",
    bar: "from-success to-success/40",
    glow: "shadow-success/20",
  },
  danger: {
    icon: "text-danger bg-danger/10",
    bar: "from-danger to-danger/40",
    glow: "shadow-danger/20",
  },
  muted: {
    icon: "text-muted-foreground bg-muted",
    bar: "from-muted-foreground to-muted",
    glow: "shadow-transparent",
  },
};

export function StatCard({
  label,
  value,
  decimals = 0,
  sublabel,
  icon: Icon,
  iconProps,
  accent = "primary",
  pulse = false,
  loading = false,
}: Props) {
  const a = accentMap[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -2 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-shadow hover:shadow-lg",
          a.glow
        )}
      >
        {/* Accent bar */}
        <div className={cn("absolute left-0 top-0 h-full w-1 bg-gradient-to-b", a.bar)} />
        <div className="flex items-start justify-between p-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            {loading ? (
              <div className="mt-2 h-8 w-20 animate-shimmer rounded bg-muted/60" />
            ) : (
              <div className="mt-1 flex items-baseline gap-2">
                <AnimatedCounter
                  value={value}
                  decimals={decimals}
                  className="text-3xl font-bold tracking-tight text-foreground"
                />
                {pulse && value > 0 && (
                  <span className="relative inline-flex h-2 w-2">
                    <motion.span
                      className="absolute inline-flex h-full w-full rounded-full bg-success/40"
                      animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                    />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                )}
              </div>
            )}
            {sublabel && (
              <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
            )}
          </div>
          <div className={cn("grid h-10 w-10 place-items-center rounded-lg", a.icon)}>
            <Icon className="h-5 w-5" {...iconProps} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
