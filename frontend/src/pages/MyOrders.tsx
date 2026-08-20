import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { Order } from "../types";

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/orders").then((res) => setOrders(res.data.orders)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <div className="card">
        <h2>My orders</h2>
        {orders.length === 0 && <p className="muted">No orders yet.</p>}
        {orders.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Route</th>
                <th>Type</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id.slice(0, 8)}</td>
                  <td>{o.pickupArea?.pincode} → {o.dropArea?.pincode}</td>
                  <td>{o.orderType} / {o.paymentType}</td>
                  <td>₹{o.totalCharge.toFixed(2)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td><Link to={`/orders/${o.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
