import { OrderStatus } from "@prisma/client";

const STATUS_COPY: Record<OrderStatus, string> = {
  CREATED: "Your order has been created and is awaiting agent assignment.",
  ASSIGNED: "A delivery agent has been assigned to your order.",
  PICKED_UP: "Your package has been picked up.",
  IN_TRANSIT: "Your package is in transit.",
  OUT_FOR_DELIVERY: "Your package is out for delivery.",
  DELIVERED: "Your package has been delivered. Thank you!",
  FAILED: "We were unable to deliver your package. You can reschedule from your order page.",
  RESCHEDULED: "Your delivery has been rescheduled and a new attempt will be made.",
};

export function statusChangeTemplate(orderId: string, status: OrderStatus, notes?: string | null) {
  const subject = `Order ${orderId.slice(0, 8)} — ${status.replace(/_/g, " ")}`;
  const lines = [STATUS_COPY[status]];
  if (notes) lines.push(`Note: ${notes}`);
  lines.push(`Order ID: ${orderId}`);
  return { subject, body: lines.join("\n") };
}
