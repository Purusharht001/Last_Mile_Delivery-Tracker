import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Order } from "../types";
import { buildRoute, SimRoute } from "../lib/geo-sim";
import { computeLivePhase, phaseLabelForProgress, targetProgressForEntry } from "../lib/delivery-progress";

const SCENE_UNIT_TO_KM = 0.35;
const BATTERY_DRAIN_PER_MIN = 0.4;
const HUD_TICK_MS = 100; // React state commit rate; the rAF loop itself runs at display refresh rate

export interface Telemetry {
  speedKmh: number;
  batteryPct: number;
  cargoTempC: number;
  etaSeconds: number;
  distanceRemainingKm: number;
  stopLabel: string;
}

export interface SimulationState {
  route: SimRoute;
  progress: number;
  phaseLabel: string;
  isMoving: boolean;
  isLive: boolean;
  vehiclePosition: THREE.Vector3;
  vehicleTangent: THREE.Vector3;
  telemetry: Telemetry;
  scrubTo: (progress: number | null) => void;
  historyTicks: { progress: number; status: string; createdAt: string }[];
}

function totalTripSeconds(route: SimRoute): number {
  return 22 * 60 + route.length * 15;
}

function computeTelemetry(
  route: SimRoute,
  progress: number,
  isMoving: boolean,
  referenceMs: number,
  orderCreatedMs: number,
): Telemetry {
  const elapsedMin = Math.max(0, referenceMs - orderCreatedMs) / 60000;
  const batteryPct = Math.max(
    12,
    96 - elapsedMin * BATTERY_DRAIN_PER_MIN + Math.sin(referenceMs / 4000) * 0.3,
  );
  const speedKmh = isMoving ? Math.max(0, 30 + Math.sin(referenceMs / 1500) * 10) : 0;
  const cargoTempC = 22 + Math.sin(referenceMs / 6000) * 0.8;
  const total = totalTripSeconds(route);
  const etaSeconds = progress >= 1 ? 0 : Math.round(total * (1 - progress));
  const distanceRemainingKm = Math.max(0, route.length * SCENE_UNIT_TO_KM * (1 - progress));

  return {
    speedKmh: Math.round(speedKmh * 10) / 10,
    batteryPct: Math.round(batteryPct * 10) / 10,
    cargoTempC: Math.round(cargoTempC * 10) / 10,
    etaSeconds,
    distanceRemainingKm: Math.round(distanceRemainingKm * 10) / 10,
    stopLabel: "Stop 1 of 1",
  };
}

const MILESTONES = [0.25, 0.5, 0.75, 0.999];

export function useDeliverySimulation(order: Order): SimulationState {
  const route = useMemo(
    () => buildRoute(order.pickupArea?.pincode ?? "unknown", order.dropArea?.pincode ?? "unknown"),
    [order.pickupArea?.pincode, order.dropArea?.pincode],
  );

  const history = order.statusHistory ?? [];
  const orderCreatedMs = useMemo(() => new Date(order.createdAt).getTime(), [order.createdAt]);

  const [scrubProgress, setScrubProgress] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const lastMilestoneRef = useRef(-1);
  const lastCommitRef = useRef(0);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const t = Date.now();
      if (t - lastCommitRef.current >= HUD_TICK_MS) {
        lastCommitRef.current = t;
        setNowMs(t);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const isLive = scrubProgress === null;
  const livePhase = computeLivePhase(order.status, history, nowMs);

  const progress = isLive ? livePhase.progress : scrubProgress;
  const phaseLabel = isLive ? livePhase.phaseLabel : phaseLabelForProgress(progress);
  const isMoving = isLive ? livePhase.isMoving : progress > 0.001 && progress < 0.999;

  // Milestone haptics only fire during live tracking, not while scrubbing —
  // dragging the timeline shouldn't buzz the device on every tick crossed.
  useEffect(() => {
    if (!isLive) return;
    const bucket = MILESTONES.findIndex((m) => progress < m);
    const reached = bucket === -1 ? MILESTONES.length : bucket;
    if (reached > lastMilestoneRef.current && lastMilestoneRef.current >= 0) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(60);
      }
    }
    lastMilestoneRef.current = reached;
  }, [progress, isLive]);

  // While scrubbing, derive a synthetic reference time from the scrub
  // position itself (not wall-clock) so telemetry is a pure function of the
  // slider value: the same scrub position always shows the same numbers.
  const referenceMs = isLive ? nowMs : orderCreatedMs + progress * totalTripSeconds(route) * 1000;

  const telemetry = computeTelemetry(route, progress, isMoving, referenceMs, orderCreatedMs);
  const vehiclePosition = route.pointAt(progress);
  const vehicleTangent = route.tangentAt(progress);

  const historyTicks = useMemo(
    () =>
      history.map((entry, index) => ({
        progress: targetProgressForEntry(entry, history, index),
        status: entry.status,
        createdAt: entry.createdAt,
      })),
    [history],
  );

  function scrubTo(nextProgress: number | null) {
    setScrubProgress(nextProgress === null ? null : THREE.MathUtils.clamp(nextProgress, 0, 1));
  }

  return {
    route,
    progress,
    phaseLabel,
    isMoving,
    isLive,
    vehiclePosition,
    vehicleTangent,
    telemetry,
    scrubTo,
    historyTicks,
  };
}
