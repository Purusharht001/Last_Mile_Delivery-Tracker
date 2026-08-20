import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { DeliveryAgent, Order, OrderStatus, Zone } from "../types";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { Field, Select } from "../components/ui/Input";
import { buttonClasses } from "../components/ui/Button";
import { tableClasses, tdClasses, theadClasses, thClasses, trClasses } from "../components/ui/table";

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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader title="All orders" subtitle="Filter by status, zone, or agent." />

      <Card className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Zone">
            <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              <option value="">All</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </Select>
          </Field>
          <Field label="Agent">
            <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              <option value="">All</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.user?.name}</option>)}
            </Select>
          </Field>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className={tableClasses}>
            <thead className={theadClasses}>
              <tr>
                <th className={thClasses}>Order</th>
                <th className={thClasses}>Route</th>
                <th className={thClasses}>Status</th>
                <th className={thClasses}>Agent</th>
                <th className={thClasses}>Total</th>
                <th className={thClasses}></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className={trClasses}>
                  <td className={tdClasses}>{o.id.slice(0, 8)}</td>
                  <td className={tdClasses}>{o.pickupArea?.pincode} → {o.dropArea?.pincode}</td>
                  <td className={tdClasses}><StatusBadge status={o.status} /></td>
                  <td className={tdClasses}>{o.assignedAgent?.user?.name ?? "—"}</td>
                  <td className={tdClasses}>₹{o.totalCharge.toFixed(2)}</td>
                  <td className={tdClasses}>
                    <div className="flex items-center gap-3">
                      <Link to={`/orders/${o.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        View <ArrowRight size={14} />
                      </Link>
                      {["CREATED", "RESCHEDULED"].includes(o.status) && (
                        <button className={buttonClasses("secondary", "!px-2.5 !py-1 text-xs")} onClick={() => autoAssign(o.id)}>
                          Auto-assign
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
