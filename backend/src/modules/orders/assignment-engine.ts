import { AgentStatus } from "@prisma/client";

export interface AgentCandidate {
  id: string;
  homeZoneId: string;
  status: AgentStatus;
  currentLat: number | null;
  currentLng: number | null;
  activeOrderCount: number;
}

export interface AssignmentTarget {
  pickupZoneId: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Picks the best available agent for a pickup, preferring (in order):
 * 1. Agents in the pickup's zone
 * 2. Among zone matches (or all candidates if none match the zone), the
 *    geographically nearest by Haversine distance, when coordinates exist
 * 3. Lowest current active-order load, as the final tie-break
 *
 * Pure function — no DB access. Returns null when no AVAILABLE agent exists,
 * which the caller surfaces as an "unassigned" order rather than failing.
 */
export function pickBestAgent(
  candidates: AgentCandidate[],
  target: AssignmentTarget,
): AgentCandidate | null {
  const available = candidates.filter((c) => c.status === AgentStatus.AVAILABLE);
  if (available.length === 0) return null;

  const zoneMatches = available.filter((c) => c.homeZoneId === target.pickupZoneId);
  const pool = zoneMatches.length > 0 ? zoneMatches : available;

  const hasTargetCoords = target.pickupLat != null && target.pickupLng != null;

  const ranked = [...pool].sort((a, b) => {
    if (hasTargetCoords) {
      const distA = agentDistance(a, target);
      const distB = agentDistance(b, target);
      if (distA !== distB) {
        // agents with no coordinates sort after ones with coordinates
        if (distA === null) return 1;
        if (distB === null) return -1;
        return distA - distB;
      }
    }
    return a.activeOrderCount - b.activeOrderCount;
  });

  return ranked[0];
}

function agentDistance(agent: AgentCandidate, target: AssignmentTarget): number | null {
  if (agent.currentLat == null || agent.currentLng == null) return null;
  if (target.pickupLat == null || target.pickupLng == null) return null;
  return haversineDistanceKm(
    { lat: agent.currentLat, lng: agent.currentLng },
    { lat: target.pickupLat, lng: target.pickupLng },
  );
}
