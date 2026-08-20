import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { Order, OrderStatus } from "../types";

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

  if (!order) return <div className="container">Loading…</div>;

  const isAssignedAgent = user?.role === "AGENT" && order.assignedAgent?.userId === user.id;
  const agentActions = isAssignedAgent ? AGENT_NEXT_STATUS[order.status] ?? [] : [];

  return (
    <div className="container">
      <div className="card">
        <h2>Order {order.id.slice(0, 8)} <StatusBadge status={order.status} /></h2>
        <div className="grid-2">
          <div>
            <p className="muted">Pickup</p>
            <p>{order.pickupAddress} ({order.pickupArea?.pincode})</p>
          </div>
          <div>
            <p className="muted">Drop</p>
            <p>{order.dropAddress} ({order.dropArea?.pincode})</p>
          </div>
        </div>
        <div className="grid-2">
          <div>
            <p className="muted">Dimensions / weight</p>
            <p>{order.length}×{order.breadth}×{order.height} cm, {order.actualWeight}kg actual / {order.billableWeight.toFixed(2)}kg billable</p>
          </div>
          <div>
            <p className="muted">Charge</p>
            <p>₹{order.totalCharge.toFixed(2)} ({order.orderType}, {order.paymentType}, {order.rateCategory.replace("_", " ")})</p>
          </div>
        </div>
        {order.assignedAgent && (
          <p className="muted">Assigned agent: {order.assignedAgent.user?.name}</p>
        )}
        {error && <p className="error-text">{error}</p>}
      </div>

      {agentActions.length > 0 && (
        <div className="card">
          <h3>Update status</h3>
          <div className="form-row">
            <label>Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. reason for failure" />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {agentActions.map((s) => (
              <button key={s} disabled={busy} onClick={() => setStatus(s)} className={s === "FAILED" ? "danger" : ""}>
                Mark {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      )}

      {user?.role === "ADMIN" && (
        <div className="card">
          <h3>Admin actions</h3>
          {["CREATED", "RESCHEDULED"].includes(order.status) && (
            <div style={{ marginBottom: 12 }}>
              <button disabled={busy} onClick={autoAssign}>Auto-assign nearest agent</button>
            </div>
          )}
          <div className="form-row">
            <label>Override status</label>
            <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value as OrderStatus)}>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button disabled={busy} onClick={() => setStatus(overrideStatus)}>Apply override</button>
        </div>
      )}

      {order.status === "FAILED" && (user?.role === "CUSTOMER" || user?.role === "ADMIN") && (
        <div className="card">
          <h3>Reschedule delivery</h3>
          <div className="form-row">
            <label>New delivery date</label>
            <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
          </div>
          <button disabled={busy || !rescheduleDate} onClick={reschedule}>Reschedule</button>
        </div>
      )}

      <div className="card">
        <h3>Tracking timeline</h3>
        <ul className="timeline">
          {order.statusHistory?.map((h) => (
            <li key={h.id}>
              <strong>{h.status.replace(/_/g, " ")}</strong>
              <div className="muted">{new Date(h.createdAt).toLocaleString()} — by {h.actor?.name ?? h.actorRole}</div>
              {h.notes && <div className="muted">{h.notes}</div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
