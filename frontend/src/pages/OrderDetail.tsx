import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Orbit, Truck, Box, Banknote, MapPin, Ruler } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { Order, OrderStatus } from "../types";
import { Card } from "../components/ui/Card";
import { Field, Input, Select } from "../components/ui/Input";
import { Button, buttonClasses } from "../components/ui/Button";
import { cn } from "../lib/cn";

const AGENT_NEXT_STATUS: Record<string, OrderStatus[]> = {
  ASSIGNED: ["PICKED_UP", "FAILED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
};

const ALL_STATUSES: OrderStatus[] = [
  "CREATED",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "RESCHEDULED",
];

const PROGRESS_STEPS: OrderStatus[] = [
  "CREATED",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [overrideStatus, setOverrideStatus] = useState<OrderStatus>("CREATED");
  const [notes, setNotes] = useState("");

  async function load() {
    const res = await api.get(`/orders/${id}`);
    setOrder(res.data.order);
    setOverrideStatus(res.data.order.status);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setStatus(status: OrderStatus) {
    setError(null);
    setBusy(true);
    try {
      await api.put(`/orders/${id}/status`, { status, notes: notes || undefined });
      setNotes("");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Could not update status");
    } finally {
      setBusy(false);
    }
  }

  async function reschedule() {
    if (!rescheduleDate) return;
    setError(null);
    setBusy(true);
    try {
      await api.post(`/orders/${id}/reschedule`, { newDeliveryDate: rescheduleDate });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Could not reschedule");
    } finally {
      setBusy(false);
    }
  }

  async function autoAssign() {
    setError(null);
    setBusy(true);
    try {
      await api.post(`/orders/${id}/auto-assign`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Could not auto-assign");
    } finally {
      setBusy(false);
    }
  }

  if (!order) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-muted-foreground sm:px-6">Loading…</div>;
  }

  const isAssignedAgent = user?.role === "AGENT" && order.assignedAgent?.userId === user.id;
  const agentActions = isAssignedAgent ? AGENT_NEXT_STATUS[order.status] ?? [] : [];

  // Determine current step index for the progress bar
  // If FAILED or RESCHEDULED, we stop at whatever step it was before, or just grey out.
  // For simplicity, we just find the highest PROGRESS_STEPS index present in history,
  // or use the current status if it's in the steps array.
  let currentStepIndex = PROGRESS_STEPS.indexOf(order.status);
  if (currentStepIndex === -1) {
    // FAILED or RESCHEDULED. Let's find the last known good step from history
    const historyStatuses = order.statusHistory?.map(h => h.status) || [];
    for (let i = PROGRESS_STEPS.length - 1; i >= 0; i--) {
      if (historyStatuses.includes(PROGRESS_STEPS[i])) {
        currentStepIndex = i;
        break;
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Order {order.id.slice(0, 8)}</h2>
            <StatusBadge status={order.status} />
          </div>
          <Link to={`/track/${order.id}`} className={buttonClasses("secondary")}>
            <Orbit size={15} />
            Live 3D track
          </Link>
        </div>

        {/* Visual Progress Stepper */}
        <div className="mb-8 hidden sm:block">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 w-full h-0.5 bg-border -z-10 -translate-y-1/2"></div>
            {PROGRESS_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex && !["FAILED", "RESCHEDULED"].includes(order.status);
              const isFailedStep = idx === currentStepIndex && order.status === "FAILED";
              
              return (
                <div key={step} className="flex flex-col items-center gap-2 relative bg-card px-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                    isCurrent ? "border-primary bg-primary text-primary-foreground" :
                    isCompleted ? "border-primary bg-primary text-primary-foreground" :
                    "border-border bg-card text-muted-foreground"
                  )}>
                    {isCompleted ? <Check size={12} /> : idx + 1}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium absolute top-8 whitespace-nowrap",
                    isCurrent ? "text-primary" :
                    isCompleted ? "text-foreground" :
                    "text-muted-foreground"
                  )}>
                    {step.replace(/_/g, " ")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6 mt-8 sm:mt-12">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={12} /> Pickup</p>
            <p className="text-sm text-foreground font-medium mt-1">{order.pickupAddress} ({order.pickupArea?.pincode})</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={12} /> Drop</p>
            <p className="text-sm text-foreground font-medium mt-1">{order.dropAddress} ({order.dropArea?.pincode})</p>
          </div>
        </div>

        {/* Summary Stat Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-muted/20 border border-border p-3 rounded-lg">
          <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-md border border-border shadow-sm">
            <Ruler size={14} className="text-primary" />
            <span className="text-xs font-medium text-foreground">
              {order.billableWeight.toFixed(2)}kg billable
            </span>
          </div>
          <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-md border border-border shadow-sm">
            <Truck size={14} className="text-emerald-500" />
            <span className="text-xs font-medium text-foreground">
              {order.rateCategory.replace("_", " ")}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-md border border-border shadow-sm">
            <Banknote size={14} className="text-amber-500" />
            <span className="text-xs font-medium text-foreground">
              ₹{order.totalCharge.toFixed(2)} ({order.orderType}, {order.paymentType})
            </span>
          </div>
        </div>

        {order.assignedAgent && (
          <p className="mt-4 text-sm text-muted-foreground">Assigned agent: <span className="text-foreground">{order.assignedAgent.user?.name}</span></p>
        )}
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </Card>

      {agentActions.length > 0 && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Update status</h3>
          <Field label="Notes (optional)">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. reason for failure" />
          </Field>
          <div className="mt-4 flex flex-wrap gap-2">
            {agentActions.map((s) => (
              <Button key={s} disabled={busy} onClick={() => setStatus(s)} variant={s === "FAILED" ? "danger" : "primary"}>
                Mark {s.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {user?.role === "ADMIN" && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Admin actions</h3>
          {["CREATED", "RESCHEDULED"].includes(order.status) && (
            <Button disabled={busy} onClick={autoAssign} variant="secondary" className="mb-4">
              Auto-assign nearest agent
            </Button>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Override status">
              <Select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value as OrderStatus)}>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
          <Button disabled={busy} onClick={() => setStatus(overrideStatus)} className="mt-4">
            Apply override
          </Button>
        </Card>
      )}

      {order.status === "FAILED" && (user?.role === "CUSTOMER" || user?.role === "ADMIN") && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Reschedule delivery</h3>
          <Field label="New delivery date">
            <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="max-w-xs" />
          </Field>
          <Button disabled={busy || !rescheduleDate} onClick={reschedule} className="mt-4">
            Reschedule
          </Button>
        </Card>
      )}

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-foreground">Tracking timeline</h3>
        <ul className="list-none space-y-5">
          {order.statusHistory?.map((h) => (
            <li key={h.id} className="relative border-l-2 border-border pl-5">
              <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm font-medium text-foreground">{h.status.replace(/_/g, " ")}</p>
              <p className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()} — by {h.actor?.name ?? h.actorRole}</p>
              {h.notes && <p className="mt-0.5 text-xs text-muted-foreground">{h.notes}</p>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
