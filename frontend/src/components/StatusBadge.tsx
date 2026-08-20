import { OrderStatus } from "../types";
import { cn } from "../lib/cn";

const STATUS_CLASSES: Record<OrderStatus, string> = {
  CREATED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  RESCHEDULED: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ASSIGNED: "bg-primary/15 text-primary border-primary/30",
  PICKED_UP: "bg-primary/15 text-primary border-primary/30",
  IN_TRANSIT: "bg-primary/15 text-primary border-primary/30",
  OUT_FOR_DELIVERY: "bg-primary/15 text-primary border-primary/30",
  DELIVERED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  FAILED: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
