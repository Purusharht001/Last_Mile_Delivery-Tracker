import { OrderStatus, OrderStatusHistoryEntry } from "../types";

/**
 * How far along the pickup->drop route each status represents. This is the
 * only place "what does 65% progress mean" is decided, so the 3D scene, the
 * telemetry cards, and the scrubber timeline all agree with each other.
 */
const PHASE_TARGET: Record<Exclude<OrderStatus, "FAILED">, number> = {
  CREATED: 0,
  ASSIGNED: 0.05,
  PICKED_UP: 0.15,
  IN_TRANSIT: 0.65,
  OUT_FOR_DELIVERY: 0.9,
  DELIVERED: 1,
  RESCHEDULED: 0.05,
};

const PHASE_LABEL: Record<OrderStatus, string> = {
  CREATED: "Awaiting agent assignment",
  ASSIGNED: "Agent en route to pickup",
  PICKED_UP: "Package picked up",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  FAILED: "Delivery attempt failed",
  RESCHEDULED: "Rescheduled — awaiting reassignment",
};

// How long (ms) the vehicle takes to ease from one phase's target progress
// to the next after a status change, purely for a believable animated feel
// — there's no real telemetry driving this cadence.
const PHASE_EASE_DURATION_MS = 18000;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Progress reached by the time a given history entry was recorded. */
export function targetProgressForEntry(
  entry: OrderStatusHistoryEntry,
  history: OrderStatusHistoryEntry[],
  index: number,
): number {
  if (entry.status === "FAILED") {
    const prior = history[index - 1];
    if (!prior || prior.status === "FAILED") return 0.5;
    return PHASE_TARGET[prior.status as Exclude<OrderStatus, "FAILED">] ?? 0.5;
  }
  return PHASE_TARGET[entry.status];
}

export interface DeliveryPhase {
  progress: number;
  phaseLabel: string;
  isMoving: boolean;
}

/**
 * Pure function: (current status, full history, wall-clock time) -> where
 * the vehicle should be along the route right now. Deterministic — the same
 * inputs always produce the same output, so a page refresh or a re-render
 * doesn't jump the vehicle around.
 */
export function computeLivePhase(
  status: OrderStatus,
  history: OrderStatusHistoryEntry[],
  nowMs: number,
): DeliveryPhase {
  if (history.length === 0) {
    return { progress: 0, phaseLabel: PHASE_LABEL.CREATED, isMoving: false };
  }

  const lastIndex = history.length - 1;
  const last = history[lastIndex];
  const prior = history[lastIndex - 1];

  const currentTarget = targetProgressForEntry(last, history, lastIndex);
  const priorTarget = prior ? targetProgressForEntry(prior, history, lastIndex - 1) : 0;

  const elapsedMs = nowMs - new Date(last.createdAt).getTime();
  const t = Math.min(Math.max(elapsedMs / PHASE_EASE_DURATION_MS, 0), 1);
  const eased = easeInOutCubic(t);
  const progress = priorTarget + (currentTarget - priorTarget) * eased;

  return {
    progress,
    phaseLabel: PHASE_LABEL[status],
    isMoving: t < 1 && Math.abs(currentTarget - priorTarget) > 0.001,
  };
}

/** Progress + label for an arbitrary scrub position, for the timeline. */
export function phaseLabelForProgress(progress: number): string {
  const entries = Object.entries(PHASE_TARGET) as [Exclude<OrderStatus, "FAILED">, number][];
  const sorted = entries.sort((a, b) => a[1] - b[1]);
  let match: Exclude<OrderStatus, "FAILED"> = "CREATED";
  for (const [status, target] of sorted) {
    if (progress >= target - 0.001) match = status;
  }
  return PHASE_LABEL[match];
}
