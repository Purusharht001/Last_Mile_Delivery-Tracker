import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { CodConfig, OrderType, RateCard, RateCategory, SurchargeType } from "../types";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { Field, Input, Select } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { tableClasses, tdClasses, theadClasses, thClasses, trClasses } from "../components/ui/table";

export default function AdminRateCards() {
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [codConfigs, setCodConfigs] = useState<CodConfig[]>([]);
  const [rc, setRc] = useState({ orderType: "B2C" as OrderType, category: "INTRA_ZONE" as RateCategory, baseFare: "", ratePerKg: "", minCharge: "" });
  const [cod, setCod] = useState({ orderType: "B2C" as OrderType, surchargeType: "FLAT" as SurchargeType, value: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [r, c] = await Promise.all([api.get("/rate-cards"), api.get("/rate-cards/cod-surcharge")]);
    setRateCards(r.data.rateCards);
    setCodConfigs(c.data.configs);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveRateCard(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.put("/rate-cards", {
        orderType: rc.orderType,
        category: rc.category,
        baseFare: Number(rc.baseFare),
        ratePerKg: Number(rc.ratePerKg),
        minCharge: Number(rc.minCharge),
      });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Could not save rate card");
    }
  }

  async function saveCodConfig(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.put("/rate-cards/cod-surcharge", {
        orderType: cod.orderType,
        surchargeType: cod.surchargeType,
        value: Number(cod.value),
      });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Could not save COD config");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader title="Rate cards" subtitle="Configure B2B/B2C rates and COD surcharges — no hardcoded pricing." />
      {error && <p className="text-sm text-red-400">{error}</p>}

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-zinc-50">Rate cards</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className={tableClasses}>
            <thead className={theadClasses}>
              <tr>
                <th className={thClasses}>Order type</th>
                <th className={thClasses}>Category</th>
                <th className={thClasses}>Base fare</th>
                <th className={thClasses}>Rate/kg</th>
                <th className={thClasses}>Min charge</th>
              </tr>
            </thead>
            <tbody>
              {rateCards.map((r) => (
                <tr key={r.id} className={trClasses}>
                  <td className={tdClasses}>{r.orderType}</td>
                  <td className={tdClasses}>{r.category.replace("_", " ")}</td>
                  <td className={tdClasses}>₹{r.baseFare}</td>
                  <td className={tdClasses}>₹{r.ratePerKg}</td>
                  <td className={tdClasses}>₹{r.minCharge}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={saveRateCard} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Order type">
              <Select value={rc.orderType} onChange={(e) => setRc({ ...rc, orderType: e.target.value as OrderType })}>
                <option value="B2C">B2C</option><option value="B2B">B2B</option>
              </Select>
            </Field>
            <Field label="Category">
              <Select value={rc.category} onChange={(e) => setRc({ ...rc, category: e.target.value as RateCategory })}>
                <option value="INTRA_ZONE">Intra-zone</option><option value="INTER_ZONE">Inter-zone</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Base fare">
              <Input type="number" min="0" step="0.01" value={rc.baseFare} onChange={(e) => setRc({ ...rc, baseFare: e.target.value })} required />
            </Field>
            <Field label="Rate per kg">
              <Input type="number" min="0" step="0.01" value={rc.ratePerKg} onChange={(e) => setRc({ ...rc, ratePerKg: e.target.value })} required />
            </Field>
          </div>
          <Field label="Minimum charge">
            <Input type="number" min="0" step="0.01" value={rc.minCharge} onChange={(e) => setRc({ ...rc, minCharge: e.target.value })} required className="max-w-xs" />
          </Field>
          <Button type="submit">Save rate card</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-zinc-50">COD surcharge</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className={tableClasses}>
            <thead className={theadClasses}>
              <tr><th className={thClasses}>Order type</th><th className={thClasses}>Type</th><th className={thClasses}>Value</th></tr>
            </thead>
            <tbody>
              {codConfigs.map((c) => (
                <tr key={c.id} className={trClasses}>
                  <td className={tdClasses}>{c.orderType}</td>
                  <td className={tdClasses}>{c.surchargeType}</td>
                  <td className={tdClasses}>{c.surchargeType === "FLAT" ? `₹${c.value}` : `${c.value}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={saveCodConfig} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Order type">
              <Select value={cod.orderType} onChange={(e) => setCod({ ...cod, orderType: e.target.value as OrderType })}>
                <option value="B2C">B2C</option><option value="B2B">B2B</option>
              </Select>
            </Field>
            <Field label="Surcharge type">
              <Select value={cod.surchargeType} onChange={(e) => setCod({ ...cod, surchargeType: e.target.value as SurchargeType })}>
                <option value="FLAT">Flat</option><option value="PERCENTAGE">Percentage</option>
              </Select>
            </Field>
          </div>
          <Field label="Value">
            <Input type="number" min="0" step="0.01" value={cod.value} onChange={(e) => setCod({ ...cod, value: e.target.value })} required className="max-w-xs" />
          </Field>
          <Button type="submit">Save COD config</Button>
        </form>
      </Card>
    </div>
  );
}
