import { AgentStatus } from "@prisma/client";
import { AgentCandidate, haversineDistanceKm, pickBestAgent } from "../src/modules/orders/assignment-engine";

function agent(overrides: Partial<AgentCandidate>): AgentCandidate {
  return {
    id: "agent-default",
    homeZoneId: "zone-a",
    status: AgentStatus.AVAILABLE,
    currentLat: null,
    currentLng: null,
    activeOrderCount: 0,
    ...overrides,
  };
}

describe("haversineDistanceKm", () => {
  it("returns ~0 for identical coordinates", () => {
    const d = haversineDistanceKm({ lat: 28.6, lng: 77.2 }, { lat: 28.6, lng: 77.2 });
    expect(d).toBeCloseTo(0, 5);
  });

  it("returns a sensible distance between two known points", () => {
    // Delhi (28.6139, 77.2090) to Mumbai (19.0760, 72.8777) is ~1150km
    const d = haversineDistanceKm({ lat: 28.6139, lng: 77.209 }, { lat: 19.076, lng: 72.8777 });
    expect(d).toBeGreaterThan(1000);
    expect(d).toBeLessThan(1300);
  });
});

describe("pickBestAgent", () => {
  it("returns null when there are no available agents", () => {
    const candidates = [agent({ id: "a1", status: AgentStatus.OFFLINE }), agent({ id: "a2", status: AgentStatus.BUSY })];
    expect(pickBestAgent(candidates, { pickupZoneId: "zone-a" })).toBeNull();
  });

  it("prefers an agent whose home zone matches the pickup zone", () => {
    const candidates = [
      agent({ id: "far-zone", homeZoneId: "zone-b" }),
      agent({ id: "same-zone", homeZoneId: "zone-a" }),
    ];
    const best = pickBestAgent(candidates, { pickupZoneId: "zone-a" });
    expect(best?.id).toBe("same-zone");
  });

  it("falls back to all available agents when none match the pickup zone", () => {
    const candidates = [agent({ id: "a1", homeZoneId: "zone-b" }), agent({ id: "a2", homeZoneId: "zone-c" })];
    const best = pickBestAgent(candidates, { pickupZoneId: "zone-a" });
    expect(best).not.toBeNull();
  });

  it("picks the geographically nearest agent when coordinates are available", () => {
    const candidates = [
      agent({ id: "near", homeZoneId: "zone-a", currentLat: 28.61, currentLng: 77.21 }),
      agent({ id: "far", homeZoneId: "zone-a", currentLat: 19.07, currentLng: 72.87 }),
    ];
    const best = pickBestAgent(candidates, { pickupZoneId: "zone-a", pickupLat: 28.6139, pickupLng: 77.209 });
    expect(best?.id).toBe("near");
  });

  it("prefers agents with coordinates over agents without when ranking by distance", () => {
    const candidates = [
      agent({ id: "no-coords", homeZoneId: "zone-a", currentLat: null, currentLng: null }),
      agent({ id: "has-coords", homeZoneId: "zone-a", currentLat: 28.61, currentLng: 77.21 }),
    ];
    const best = pickBestAgent(candidates, { pickupZoneId: "zone-a", pickupLat: 28.6139, pickupLng: 77.209 });
    expect(best?.id).toBe("has-coords");
  });

  it("breaks ties by lowest active order count", () => {
    const candidates = [
      agent({ id: "busy", homeZoneId: "zone-a", activeOrderCount: 5 }),
      agent({ id: "idle", homeZoneId: "zone-a", activeOrderCount: 0 }),
    ];
    const best = pickBestAgent(candidates, { pickupZoneId: "zone-a" });
    expect(best?.id).toBe("idle");
  });
});
