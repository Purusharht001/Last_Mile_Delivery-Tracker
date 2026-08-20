import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Area, Zone } from "../types";

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
    <div className="container">
      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h2>Zones</h2>
        <table>
          <thead><tr><th>Name</th><th>Code</th></tr></thead>
          <tbody>
            {zones.map((z) => <tr key={z.id}><td>{z.name}</td><td>{z.code}</td></tr>)}
          </tbody>
        </table>
        <form onSubmit={createZone} style={{ marginTop: 16 }}>
          <div className="grid-2">
            <div className="form-row">
              <label>Zone name</label>
              <input value={zoneName} onChange={(e) => setZoneName(e.target.value)} required />
            </div>
            <div className="form-row">
              <label>Zone code</label>
              <input value={zoneCode} onChange={(e) => setZoneCode(e.target.value)} required />
            </div>
          </div>
          <button type="submit">Add zone</button>
        </form>
      </div>

      <div className="card">
        <h2>Areas (pincode → zone)</h2>
        <table>
          <thead><tr><th>Name</th><th>Pincode</th><th>Zone</th></tr></thead>
          <tbody>
            {areas.map((a) => <tr key={a.id}><td>{a.name}</td><td>{a.pincode}</td><td>{a.zone?.name}</td></tr>)}
          </tbody>
        </table>
        <form onSubmit={createArea} style={{ marginTop: 16 }}>
          <div className="grid-2">
            <div className="form-row">
              <label>Area name</label>
              <input value={areaName} onChange={(e) => setAreaName(e.target.value)} required />
            </div>
            <div className="form-row">
              <label>Pincode</label>
              <input value={areaPincode} onChange={(e) => setAreaPincode(e.target.value)} required />
            </div>
          </div>
          <div className="form-row">
            <label>Zone</label>
            <select value={areaZoneId} onChange={(e) => setAreaZoneId(e.target.value)}>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <button type="submit">Add area</button>
        </form>
      </div>
    </div>
  );
}
