import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { DeliveryAgent, Zone } from "../types";

export default function AdminAgents() {
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", homeZoneId: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [a, z] = await Promise.all([api.get("/agents"), api.get("/zones")]);
    setAgents(a.data.agents);
    setZones(z.data.zones);
    if (!form.homeZoneId && z.data.zones[0]) setForm((f) => ({ ...f, homeZoneId: z.data.zones[0].id }));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAgent(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/agents", form);
      setForm({ ...form, name: "", email: "", password: "", phone: "" });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Could not create agent");
    }
  }

  async function setStatus(id: string, status: string) {
    await api.put(`/agents/${id}/status`, { status });
    await load();
  }

  return (
    <div className="container">
      {error && <p className="error-text">{error}</p>}
      <div className="card">
        <h2>Delivery agents</h2>
        <table>
          <thead><tr><th>Name</th><th>Home zone</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td>{a.user?.name} ({a.user?.email})</td>
                <td>{a.homeZone?.name}</td>
                <td><span className="badge">{a.status}</span></td>
                <td>
                  <select value={a.status} onChange={(e) => setStatus(a.id, e.target.value)}>
                    <option value="AVAILABLE">Available</option>
                    <option value="BUSY">Busy</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form onSubmit={createAgent} style={{ marginTop: 16 }}>
          <h3>Add agent</h3>
          <div className="grid-2">
            <div className="form-row">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-row">
              <label>Temporary password</label>
              <input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div className="form-row">
              <label>Phone (optional)</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <label>Home zone</label>
            <select value={form.homeZoneId} onChange={(e) => setForm({ ...form, homeZoneId: e.target.value })}>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <button type="submit">Add agent</button>
        </form>
      </div>
    </div>
  );
}
