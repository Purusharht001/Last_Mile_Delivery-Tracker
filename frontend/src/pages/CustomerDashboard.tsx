import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Clock,
  Orbit,
  PackagePlus,
  Truck,
  XCircle,
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { Order } from "../types";
import { Card } from "../components/ui/Card";
import { buttonClasses } from "../components/ui/Button";

const ACTIVE_STATUSES = ["CREATED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "RESCHEDULED"];

interface Stats {
  total: number;
  active: number;
  delivered: number;
  failed: number;
}

function computeStats(orders: Order[]): Stats {
  let active = 0, delivered = 0, failed = 0;
  for (const o of orders) {
    if (o.status === "DELIVERED") delivered++;
    else if (o.status === "FAILED") failed++;
    else if (ACTIVE_STATUSES.includes(o.status)) active++;
  }
  return { total: orders.length, active, delivered, failed };
}

const STAT_CARDS = [
  { key: "total" as const, label: "Total Orders", icon: Box, accent: "text-primary", bg: "bg-primary/10" },
  { key: "active" as const, label: "Active", icon: Truck, accent: "text-amber-400", bg: "bg-amber-400/10" },
  { key: "delivered" as const, label: "Delivered", icon: CheckCircle2, accent: "text-emerald-400", bg: "bg-emerald-400/10" },
  { key: "failed" as const, label: "Failed", icon: XCircle, accent: "text-red-400", bg: "bg-red-400/10" },
];

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/orders", { params: { limit: 100 } })
      .then((res) => setOrders(res.data.orders))
      .finally(() => setLoading(false));
  }, []);

  const stats = computeStats(orders);
  const recent = orders.slice(0, 5);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="p-16 text-center text-sm text-muted-foreground">Loading your dashboard…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, <span className="text-primary">{user?.name?.split(" ")[0]}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's a snapshot of your deliveries.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, accent, bg }) => (
          <Card key={key} className="flex items-center gap-4 p-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
              <Icon size={20} className={accent} />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-foreground">{stats[key]}</p>
              <p className="truncate text-xs text-muted-foreground">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/orders/new" className={buttonClasses("primary")}>
          <PackagePlus size={16} />
          Place new order
        </Link>
        <Link to="/orders" className={buttonClasses("secondary")}>
          <Box size={16} />
          View all orders
        </Link>
      </div>

      {/* Recent orders */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Recent orders</h2>
          {orders.length > 5 && (
            <Link to="/orders" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <PackagePlus size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No orders yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Place your first delivery order to get started.</p>
            </div>
            <Link to="/orders/new" className={buttonClasses("primary", "mt-2")}>
              <PackagePlus size={16} />
              Place your first order
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((o) => (
              <Card key={o.id} className="relative flex flex-col gap-3 p-5 transition-colors hover:border-primary/30">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</span>
                  <StatusBadge status={o.status} />
                </div>

                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Clock size={14} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {o.pickupArea?.pincode ?? "—"} → {o.dropArea?.pincode ?? "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-lg font-bold text-foreground">₹{o.totalCharge.toFixed(2)}</span>
                  <div className="flex items-center gap-2">
                    <Link to={`/track/${o.id}`} className={buttonClasses("ghost", "!px-2 !py-1 text-xs")}>
                      <Orbit size={13} />
                    </Link>
                    <Link to={`/orders/${o.id}`} className={buttonClasses("secondary", "!px-2.5 !py-1 text-xs")}>
                      Details <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
