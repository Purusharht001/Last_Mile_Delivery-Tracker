import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { OrderType, PaymentType, Quote } from "../types";

interface FormState {
  pickupAddress: string;
  pickupPincode: string;
  dropAddress: string;
  dropPincode: string;
  length: string;
  breadth: string;
  height: string;
  actualWeight: string;
  orderType: OrderType;
  paymentType: PaymentType;
  customerId: string;
}

const initial: FormState = {
  pickupAddress: "",
  pickupPincode: "",
  dropAddress: "",
  dropPincode: "",
  length: "",
  breadth: "",
  height: "",
  actualWeight: "",
  orderType: "B2C",
  paymentType: "PREPAID",
  customerId: "",
};

export default function PlaceOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initial);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setQuote(null);
  }

  function quotePayload() {
    return {
      pickupPincode: form.pickupPincode,
      dropPincode: form.dropPincode,
      length: Number(form.length),
      breadth: Number(form.breadth),
      height: Number(form.height),
      actualWeight: Number(form.actualWeight),
      orderType: form.orderType,
      paymentType: form.paymentType,
    };
  }

  async function getQuote(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.post("/orders/quote", quotePayload());
      setQuote(res.data.quote);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Could not calculate a quote");
    } finally {
      setBusy(false);
    }
  }

  async function confirmOrder() {
    setError(null);
    setBusy(true);
    try {
      const res = await api.post("/orders", {
        ...quotePayload(),
        pickupAddress: form.pickupAddress,
        dropAddress: form.dropAddress,
        customerId: user?.role === "ADMIN" && form.customerId ? form.customerId : undefined,
      });
      navigate(`/orders/${res.data.order.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Could not create order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <div className="card">
        <h2>Place an order</h2>
        <form onSubmit={getQuote}>
          {user?.role === "ADMIN" && (
            <div className="form-row">
              <label>Customer ID (leave blank to order for yourself)</label>
              <input value={form.customerId} onChange={(e) => update("customerId", e.target.value)} />
            </div>
          )}
          <div className="grid-2">
            <div className="form-row">
              <label>Pickup address</label>
              <input value={form.pickupAddress} onChange={(e) => update("pickupAddress", e.target.value)} required />
            </div>
            <div className="form-row">
              <label>Pickup pincode</label>
              <input value={form.pickupPincode} onChange={(e) => update("pickupPincode", e.target.value)} required />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-row">
              <label>Drop address</label>
              <input value={form.dropAddress} onChange={(e) => update("dropAddress", e.target.value)} required />
            </div>
            <div className="form-row">
              <label>Drop pincode</label>
              <input value={form.dropPincode} onChange={(e) => update("dropPincode", e.target.value)} required />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-row">
              <label>Length (cm)</label>
              <input type="number" min="0" step="0.1" value={form.length} onChange={(e) => update("length", e.target.value)} required />
            </div>
            <div className="form-row">
              <label>Breadth (cm)</label>
              <input type="number" min="0" step="0.1" value={form.breadth} onChange={(e) => update("breadth", e.target.value)} required />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-row">
              <label>Height (cm)</label>
              <input type="number" min="0" step="0.1" value={form.height} onChange={(e) => update("height", e.target.value)} required />
            </div>
            <div className="form-row">
              <label>Actual weight (kg)</label>
              <input type="number" min="0" step="0.01" value={form.actualWeight} onChange={(e) => update("actualWeight", e.target.value)} required />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-row">
              <label>Order type</label>
              <select value={form.orderType} onChange={(e) => update("orderType", e.target.value as OrderType)}>
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
              </select>
            </div>
            <div className="form-row">
              <label>Payment type</label>
              <select value={form.paymentType} onChange={(e) => update("paymentType", e.target.value as PaymentType)}>
                <option value="PREPAID">Prepaid</option>
                <option value="COD">Cash on Delivery</option>
              </select>
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? "Calculating…" : "Get quote"}</button>
        </form>
      </div>

      {quote && (
        <div className="card">
          <h3>Charge breakdown</h3>
          <table>
            <tbody>
              <tr><td>Category</td><td>{quote.category.replace("_", " ")}</td></tr>
              <tr><td>Volumetric weight</td><td>{quote.volumetricWeight.toFixed(2)} kg</td></tr>
              <tr><td>Billable weight</td><td>{quote.billableWeight.toFixed(2)} kg</td></tr>
              <tr><td>Base charge</td><td>₹{quote.baseCharge.toFixed(2)}</td></tr>
              <tr><td>COD surcharge</td><td>₹{quote.codSurcharge.toFixed(2)}</td></tr>
              <tr><td><strong>Total charge</strong></td><td><strong>₹{quote.totalCharge.toFixed(2)}</strong></td></tr>
            </tbody>
          </table>
          <div style={{ marginTop: 16 }}>
            <button onClick={confirmOrder} disabled={busy}>{busy ? "Placing…" : "Confirm & place order"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
