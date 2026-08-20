import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { CodConfig, OrderType, RateCard, RateCategory, SurchargeType } from "../types";

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
    <div className="container">
      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h2>Rate cards</h2>
        <table>
          <thead><tr><th>Order type</th><th>Category</th><th>Base fare</th><th>Rate/kg</th><th>Min charge</th></tr></thead>
          <tbody>
            {rateCards.map((r) => (
              <tr key={r.id}>
                <td>{r.orderType}</td><td>{r.category.replace("_", " ")}</td>
                <td>₹{r.baseFare}</td><td>₹{r.ratePerKg}</td><td>₹{r.minCharge}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={saveRateCard} style={{ marginTop: 16 }}>
          <div className="grid-2">
            <div className="form-row">
              <label>Order type</label>
              <select value={rc.orderType} onChange={(e) => setRc({ ...rc, orderType: e.target.value as OrderType })}>
                <option value="B2C">B2C</option><option value="B2B">B2B</option>
              </select>
            </div>
            <div className="form-row">
              <label>Category</label>
              <select value={rc.category} onChange={(e) => setRc({ ...rc, category: e.target.value as RateCategory })}>
                <option value="INTRA_ZONE">Intra-zone</option><option value="INTER_ZONE">Inter-zone</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-row">
              <label>Base fare</label>
              <input type="number" min="0" step="0.01" value={rc.baseFare} onChange={(e) => setRc({ ...rc, baseFare: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Rate per kg</label>
              <input type="number" min="0" step="0.01" value={rc.ratePerKg} onChange={(e) => setRc({ ...rc, ratePerKg: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <label>Minimum charge</label>
            <input type="number" min="0" step="0.01" value={rc.minCharge} onChange={(e) => setRc({ ...rc, minCharge: e.target.value })} required />
          </div>
          <button type="submit">Save rate card</button>
        </form>
      </div>

      <div className="card">
        <h2>COD surcharge</h2>
        <table>
          <thead><tr><th>Order type</th><th>Type</th><th>Value</th></tr></thead>
          <tbody>
            {codConfigs.map((c) => (
              <tr key={c.id}>
                <td>{c.orderType}</td><td>{c.surchargeType}</td>
                <td>{c.surchargeType === "FLAT" ? `₹${c.value}` : `${c.value}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={saveCodConfig} style={{ marginTop: 16 }}>
          <div className="grid-2">
            <div className="form-row">
              <label>Order type</label>
              <select value={cod.orderType} onChange={(e) => setCod({ ...cod, orderType: e.target.value as OrderType })}>
                <option value="B2C">B2C</option><option value="B2B">B2B</option>
              </select>
            </div>
            <div className="form-row">
              <label>Surcharge type</label>
              <select value={cod.surchargeType} onChange={(e) => setCod({ ...cod, surchargeType: e.target.value as SurchargeType })}>
                <option value="FLAT">Flat</option><option value="PERCENTAGE">Percentage</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <label>Value</label>
            <input type="number" min="0" step="0.01" value={cod.value} onChange={(e) => setCod({ ...cod, value: e.target.value })} required />
          </div>
          <button type="submit">Save COD config</button>
        </form>
      </div>
    </div>
  );
}
