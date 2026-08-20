import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PackagePlus } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { OrderType, PaymentType, Quote } from "../types";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { Field, Input, Select } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader title="Place an order" subtitle="Charges are calculated automatically before you confirm." />

      <Card>
        <div className="mb-5 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-electric-blue/20 text-blue-400">
            <PackagePlus size={18} />
          </span>
          <h2 className="text-base font-semibold text-zinc-50">Order details</h2>
        </div>

        <form onSubmit={getQuote} className="space-y-4">
          {user?.role === "ADMIN" && (
            <Field label="Customer ID (leave blank to order for yourself)">
              <Input value={form.customerId} onChange={(e) => update("customerId", e.target.value)} />
            </Field>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Pickup address">
              <Input value={form.pickupAddress} onChange={(e) => update("pickupAddress", e.target.value)} required />
            </Field>
            <Field label="Pickup pincode">
              <Input value={form.pickupPincode} onChange={(e) => update("pickupPincode", e.target.value)} required />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Drop address">
              <Input value={form.dropAddress} onChange={(e) => update("dropAddress", e.target.value)} required />
            </Field>
            <Field label="Drop pincode">
              <Input value={form.dropPincode} onChange={(e) => update("dropPincode", e.target.value)} required />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Length (cm)">
              <Input type="number" min="0" step="0.1" value={form.length} onChange={(e) => update("length", e.target.value)} required />
            </Field>
            <Field label="Breadth (cm)">
              <Input type="number" min="0" step="0.1" value={form.breadth} onChange={(e) => update("breadth", e.target.value)} required />
            </Field>
            <Field label="Height (cm)">
              <Input type="number" min="0" step="0.1" value={form.height} onChange={(e) => update("height", e.target.value)} required />
            </Field>
            <Field label="Weight (kg)">
              <Input type="number" min="0" step="0.01" value={form.actualWeight} onChange={(e) => update("actualWeight", e.target.value)} required />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Order type">
              <Select value={form.orderType} onChange={(e) => update("orderType", e.target.value as OrderType)}>
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
              </Select>
            </Field>
            <Field label="Payment type">
              <Select value={form.paymentType} onChange={(e) => update("paymentType", e.target.value as PaymentType)}>
                <option value="PREPAID">Prepaid</option>
                <option value="COD">Cash on Delivery</option>
              </Select>
            </Field>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Calculating…" : "Get quote"}</Button>
        </form>
      </Card>

      {quote && (
        <Card className="mt-6">
          <h3 className="mb-4 text-base font-semibold text-zinc-50">Charge breakdown</h3>
          <dl className="divide-y divide-white/10 text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-zinc-400">Category</dt>
              <dd className="text-zinc-100">{quote.category.replace("_", " ")}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-zinc-400">Volumetric weight</dt>
              <dd className="text-zinc-100">{quote.volumetricWeight.toFixed(2)} kg</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-zinc-400">Billable weight</dt>
              <dd className="text-zinc-100">{quote.billableWeight.toFixed(2)} kg</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-zinc-400">Base charge</dt>
              <dd className="text-zinc-100">₹{quote.baseCharge.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-zinc-400">COD surcharge</dt>
              <dd className="text-zinc-100">₹{quote.codSurcharge.toFixed(2)}</dd>
            </div>
          </dl>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-electric-blue/10 px-4 py-3">
            <span className="text-sm font-medium text-blue-200">Total charge</span>
            <span className="text-2xl font-bold text-blue-100">₹{quote.totalCharge.toFixed(2)}</span>
          </div>
          <Button onClick={confirmOrder} disabled={busy} className="mt-5 w-full">
            {busy ? "Placing…" : "Confirm & place order"}
          </Button>
        </Card>
      )}
    </div>
  );
}
