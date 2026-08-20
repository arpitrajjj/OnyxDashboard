import { ApiReference } from "@/components/ApiReference";

export function ApiView() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">API Reference</h2>
        <p className="text-sm text-muted-foreground">
          Endpoints the OnyxBridge Android library calls.
        </p>
      </div>
      <ApiReference />
    </div>
  );
}
