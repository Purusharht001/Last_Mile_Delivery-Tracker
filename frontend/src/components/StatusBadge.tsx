import { OrderStatus } from "../types";
import { cn } from "../lib/cn";

const STATUS_CLASSES: Record<OrderStatus, string> = {
  CREATED: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  RESCHEDULED: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  ASSIGNED: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  PICKED_UP: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  IN_TRANSIT: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  OUT_FOR_DELIVERY: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  DELIVERED: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  FAILED: "bg-red-500/15 text-red-300 border-red-400/30",
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
