import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, PackagePlus, Box } from "lucide-react";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { Order, OrderStatus } from "../types";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { tableClasses, tdClasses, theadClasses, thClasses, trClasses } from "../components/ui/table";
import { Button, buttonClasses } from "../components/ui/Button";
import { Field, Select } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

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

const AGENT_NEXT_STATUS: Record<string, OrderStatus[]> = {
  ASSIGNED: ["PICKED_UP", "FAILED"],
  PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
};

export default function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 20 };
    if (status) params.status = status;
    try {
      const res = await api.get("/orders", { params });
      setOrders(res.data.orders);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  async function updateStatus(orderId: string, newStatus: OrderStatus) {
    setBusy(true);
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const isAgent = user?.role === "AGENT";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader 
        title={isAgent ? "My queue" : "My orders"} 
        subtitle={isAgent ? `You have ${total} assigned order${total !== 1 ? 's' : ''}` : "Manage and track your deliveries"}
      />

      <Card className="p-0 sm:p-0 flex flex-col">
        <div className="p-4 sm:px-6 border-b border-border bg-muted/20 flex flex-wrap gap-4 items-end">
          <Field label="Filter by status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-48">
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : orders.length === 0 && page === 1 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Box size={32} className="text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                {status ? "No matching orders" : "No orders yet"}
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {status 
                  ? "Try changing your status filter." 
                  : isAgent 
                    ? "You don't have any assigned orders right now." 
                    : "Place your first delivery order to get started."}
              </p>
            </div>
            {!isAgent && !status && (
              <Link to="/orders/new" className={buttonClasses("primary", "mt-2")}>
                <PackagePlus size={16} />
                Place your first order
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className={tableClasses}>
                <thead className={theadClasses}>
                  <tr>
                    <th className={thClasses}>Order</th>
                    <th className={thClasses}>Route</th>
                    <th className={thClasses}>Type</th>
                    <th className={thClasses}>Total</th>
                    <th className={thClasses}>Status</th>
                    <th className={thClasses}></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const agentActions = isAgent ? AGENT_NEXT_STATUS[o.status] ?? [] : [];
                    return (
                      <tr key={o.id} className={trClasses}>
                        <td className={tdClasses}>{o.id.slice(0, 8)}</td>
                        <td className={tdClasses}>{o.pickupArea?.pincode} → {o.dropArea?.pincode}</td>
                        <td className={tdClasses}>{o.orderType} / {o.paymentType}</td>
                        <td className={tdClasses}>₹{o.totalCharge.toFixed(2)}</td>
                        <td className={tdClasses}><StatusBadge status={o.status} /></td>
                        <td className={tdClasses}>
                          <div className="flex items-center gap-3 justify-end">
                            {agentActions.map((s) => (
                              <Button 
                                key={s} 
                                disabled={busy} 
                                onClick={() => updateStatus(o.id, s)} 
                                variant={s === "FAILED" ? "danger" : "secondary"}
                                className="!px-2.5 !py-1 text-xs"
                              >
                                {s === "FAILED" ? "Fail" : s.replace(/_/g, " ")}
                              </Button>
                            ))}
                            <Link to={`/orders/${o.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                              View <ArrowRight size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  {total} order{total !== 1 ? "s" : ""} · page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" className="!px-2 !py-1" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft size={16} />
                  </Button>
                  <Button variant="ghost" className="!px-2 !py-1" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
