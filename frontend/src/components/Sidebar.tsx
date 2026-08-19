import { Code2, LayoutDashboard, Radio, Server } from "lucide-react";

export function Sidebar() {
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
        <NavItem icon={LayoutDashboard} label="Dashboard" active />
        <NavItem icon={Radio} label="Live activity" />
        <NavItem icon={Server} label="Devices" />
        <NavItem icon={Code2} label="API reference" />
      </nav>
      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/0 p-3">
          <div className="text-xs font-semibold text-foreground">OnyxBridge</div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Pair this dashboard with the OnyxBridge Android library to receive heartbeats
            directly from your app.
          </p>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href="#"
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}
