import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { AgentStatus, DeliveryAgent, Zone } from "../types";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { Field, Input, Select } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { cn } from "../lib/cn";
import { tableClasses, tdClasses, theadClasses, thClasses, trClasses } from "../components/ui/table";

const AGENT_STATUS_CLASSES: Record<AgentStatus, string> = {
  AVAILABLE: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  BUSY: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  OFFLINE: "bg-zinc-500/15 text-muted-foreground border-zinc-400/30",
};

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
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader title="Delivery agents" subtitle="Manage agent availability and home zones." />
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className={tableClasses}>
            <thead className={theadClasses}>
              <tr><th className={thClasses}>Name</th><th className={thClasses}>Home zone</th><th className={thClasses}>Status</th><th className={thClasses}></th></tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className={trClasses}>
                  <td className={tdClasses}>{a.user?.name} <span className="text-muted-foreground">({a.user?.email})</span></td>
                  <td className={tdClasses}>{a.homeZone?.name}</td>
                  <td className={tdClasses}>
                    <span className={cn("inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium", AGENT_STATUS_CLASSES[a.status])}>
                      {a.status}
                    </span>
                  </td>
                  <td className={tdClasses}>
                    <Select value={a.status} onChange={(e) => setStatus(a.id, e.target.value)} className="w-auto py-1.5">
                      <option value="AVAILABLE">Available</option>
                      <option value="BUSY">Busy</option>
                      <option value="OFFLINE">Offline</option>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={createAgent} className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Add agent</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Temporary password">
              <Input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </Field>
            <Field label="Phone (optional)">
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <Field label="Home zone">
            <Select value={form.homeZoneId} onChange={(e) => setForm({ ...form, homeZoneId: e.target.value })} className="max-w-xs">
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </Select>
          </Field>
          <Button type="submit">Add agent</Button>
        </form>
      </Card>
    </div>
  );
}
