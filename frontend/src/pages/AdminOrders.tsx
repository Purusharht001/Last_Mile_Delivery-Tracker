import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { DeliveryAgent, Order, OrderStatus, Zone } from "../types";

const STATUSES: OrderStatus[] = [
  "CREATED",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "RESCHEDULED",
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [status, setStatus] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (zoneId) params.zoneId = zoneId;
    if (agentId) params.agentId = agentId;
    const [o, z, a] = await Promise.all([
      api.get("/orders", { params }),
      api.get("/zones"),
      api.get("/agents"),
    ]);
    setOrders(o.data.orders);
    setZones(z.data.zones);
    setAgents(a.data.agents);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, zoneId, agentId]);

  async function autoAssign(orderId: string) {
    setError(null);
    try {
      await api.post(`/orders/${orderId}/auto-assign`);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Could not auto-assign");
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2>All orders</h2>
        <div className="grid-2" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="form-row">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Zone</label>
            <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              <option value="">All</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Agent</label>
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              <option value="">All</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.user?.name}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <table>
          <thead>
            <tr><th>Order</th><th>Route</th><th>Status</th><th>Agent</th><th>Total</th><th></th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id.slice(0, 8)}</td>
                <td>{o.pickupArea?.pincode} → {o.dropArea?.pincode}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>{o.assignedAgent?.user?.name ?? "—"}</td>
                <td>₹{o.totalCharge.toFixed(2)}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <Link to={`/orders/${o.id}`}>View</Link>
                  {["CREATED", "RESCHEDULED"].includes(o.status) && (
                    <button className="secondary" onClick={() => autoAssign(o.id)}>Auto-assign</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
