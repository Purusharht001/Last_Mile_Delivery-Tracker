import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, PackageSearch } from "lucide-react";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { Order } from "../types";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { tableClasses, tdClasses, theadClasses, thClasses, trClasses } from "../components/ui/table";

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/orders").then((res) => setOrders(res.data.orders)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader title="My orders" />

      <Card className="p-0 sm:p-0">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-zinc-400">
            <PackageSearch size={28} className="text-zinc-600" />
            <p>No orders yet.</p>
          </div>
        ) : (
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
                {orders.map((o) => (
                  <tr key={o.id} className={trClasses}>
                    <td className={tdClasses}>{o.id.slice(0, 8)}</td>
                    <td className={tdClasses}>{o.pickupArea?.pincode} → {o.dropArea?.pincode}</td>
                    <td className={tdClasses}>{o.orderType} / {o.paymentType}</td>
                    <td className={tdClasses}>₹{o.totalCharge.toFixed(2)}</td>
                    <td className={tdClasses}><StatusBadge status={o.status} /></td>
                    <td className={tdClasses}>
                      <Link to={`/orders/${o.id}`} className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
                        View <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
