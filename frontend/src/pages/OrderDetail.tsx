import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Orbit } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { Order, OrderStatus } from "../types";
import { Card } from "../components/ui/Card";
import { Field, Input, Select } from "../components/ui/Input";
import { Button, buttonClasses } from "../components/ui/Button";

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

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Order {order.id.slice(0, 8)}</h2>
            <StatusBadge status={order.status} />
          </div>
          <Link to={`/track/${order.id}`} className={buttonClasses("secondary")}>
            <Orbit size={15} />
            Live 3D track
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Pickup</p>
            <p className="text-sm text-foreground">{order.pickupAddress} ({order.pickupArea?.pincode})</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Drop</p>
            <p className="text-sm text-foreground">{order.dropAddress} ({order.dropArea?.pincode})</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dimensions / weight</p>
            <p className="text-sm text-foreground">
              {order.length}×{order.breadth}×{order.height} cm, {order.actualWeight}kg actual / {order.billableWeight.toFixed(2)}kg billable
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Charge</p>
            <p className="text-sm text-foreground">
              ₹{order.totalCharge.toFixed(2)} ({order.orderType}, {order.paymentType}, {order.rateCategory.replace("_", " ")})
            </p>
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
