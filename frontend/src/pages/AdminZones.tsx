import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Area, Zone } from "../types";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { Field, Input, Select } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { tableClasses, tdClasses, theadClasses, thClasses, trClasses } from "../components/ui/table";

export default function AdminZones() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [zoneName, setZoneName] = useState("");
  const [zoneCode, setZoneCode] = useState("");
  const [areaName, setAreaName] = useState("");
  const [areaPincode, setAreaPincode] = useState("");
  const [areaZoneId, setAreaZoneId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [z, a] = await Promise.all([api.get("/zones"), api.get("/zones/areas")]);
    setZones(z.data.zones);
    setAreas(a.data.areas);
    if (!areaZoneId && z.data.zones[0]) setAreaZoneId(z.data.zones[0].id);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createZone(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/zones", { name: zoneName, code: zoneCode });
      setZoneName("");
      setZoneCode("");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Could not create zone");
    }
  }

  async function createArea(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/zones/areas", { name: areaName, pincode: areaPincode, zoneId: areaZoneId });
      setAreaName("");
      setAreaPincode("");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Could not create area");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader title="Zones" subtitle="Manage delivery zones and the pincodes assigned to them." />
      {error && <p className="text-sm text-red-400">{error}</p>}

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-zinc-50">Zones</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className={tableClasses}>
            <thead className={theadClasses}>
              <tr><th className={thClasses}>Name</th><th className={thClasses}>Code</th></tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id} className={trClasses}>
                  <td className={tdClasses}>{z.name}</td>
                  <td className={tdClasses}>{z.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={createZone} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Zone name">
              <Input value={zoneName} onChange={(e) => setZoneName(e.target.value)} required />
            </Field>
            <Field label="Zone code">
              <Input value={zoneCode} onChange={(e) => setZoneCode(e.target.value)} required />
            </Field>
          </div>
          <Button type="submit">Add zone</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-zinc-50">Areas (pincode → zone)</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className={tableClasses}>
            <thead className={theadClasses}>
              <tr><th className={thClasses}>Name</th><th className={thClasses}>Pincode</th><th className={thClasses}>Zone</th></tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.id} className={trClasses}>
                  <td className={tdClasses}>{a.name}</td>
                  <td className={tdClasses}>{a.pincode}</td>
                  <td className={tdClasses}>{a.zone?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={createArea} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Area name">
              <Input value={areaName} onChange={(e) => setAreaName(e.target.value)} required />
            </Field>
            <Field label="Pincode">
              <Input value={areaPincode} onChange={(e) => setAreaPincode(e.target.value)} required />
            </Field>
          </div>
          <Field label="Zone">
            <Select value={areaZoneId} onChange={(e) => setAreaZoneId(e.target.value)}>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </Select>
          </Field>
          <Button type="submit">Add area</Button>
        </form>
      </Card>
    </div>
  );
}
