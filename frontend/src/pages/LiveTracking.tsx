import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BatteryFull, Clock3, Gauge, MapPinned, Route as RouteIcon, Thermometer } from "lucide-react";
import { api } from "../api/client";
import { Order } from "../types";
import { useDeliverySimulation } from "../hooks/useDeliverySimulation";
import { DeliveryScene, CameraMode } from "../components/3d/DeliveryScene";
import { TrackerOverlay } from "../components/hud/TrackerOverlay";
import { TrackingHeader } from "../components/hud/TrackingHeader";
import { TelemetryCard } from "../components/hud/TelemetryCard";
import { ScrubberTimeline } from "../components/hud/ScrubberTimeline";
import { CameraModeToggle } from "../components/hud/CameraModeToggle";

function formatEta(seconds: number): string {
  if (seconds <= 0) return "Arrived";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function LiveTrackingContent({ order }: { order: Order }) {
  const sim = useDeliverySimulation(order);
  const [cameraMode, setCameraMode] = useState<CameraMode>("chase");

  const dashboard = [
    <TelemetryCard key="eta" icon={Clock3} label="ETA" value={formatEta(sim.telemetry.etaSeconds)} />,
    <TelemetryCard
      key="distance"
      icon={RouteIcon}
      label="Distance remaining"
      value={`${sim.telemetry.distanceRemainingKm.toFixed(1)} km`}
    />,
    <TelemetryCard key="stop" icon={MapPinned} label="Stops" value={sim.telemetry.stopLabel} />,
    <TelemetryCard
      key="battery"
      icon={BatteryFull}
      label="EV battery"
      value={`${sim.telemetry.batteryPct.toFixed(0)}%`}
      accent="emerald"
    />,
    <TelemetryCard key="speed" icon={Gauge} label="Speed" value={`${sim.telemetry.speedKmh.toFixed(0)} km/h`} />,
    <TelemetryCard
      key="temp"
      icon={Thermometer}
      label="Cargo temp"
      value={`${sim.telemetry.cargoTempC.toFixed(1)}°C`}
      accent="emerald"
    />,
  ];

  const idle = order.status === "CREATED";

  return (
    <div className="fixed inset-0 bg-void">
      <div className="pointer-events-none absolute inset-0">
        <DeliveryScene route={sim.route} progress={sim.progress} cameraMode={cameraMode} />
      </div>

      <TrackerOverlay
        header={<TrackingHeader />}
        banner={
          <div className="pointer-events-none self-start rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 backdrop-blur-xl">
            Order {order.id.slice(0, 8)} · {sim.phaseLabel}
            {idle && " — route preview, live motion begins once picked up"}
          </div>
        }
        dashboard={dashboard}
        scrubber={
          <ScrubberTimeline
            progress={sim.progress}
            isLive={sim.isLive}
            ticks={sim.historyTicks}
            onScrub={sim.scrubTo}
            onGoLive={() => sim.scrubTo(null)}
          />
        }
        cameraToggle={<CameraModeToggle mode={cameraMode} onChange={setCameraMode} />}
      />
    </div>
  );
}

export default function LiveTracking() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOrder(null);
    setError(null);
    api
      .get(`/orders/${id}`)
      .then((res) => {
        if (!cancelled) setOrder(res.data.order);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error ?? "Could not load this order");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-void px-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-center text-zinc-200 backdrop-blur-xl">
          <p className="mb-3">{error}</p>
          <Link to="/" className="text-blue-400 underline">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-void text-zinc-400">
        Loading live tracking…
      </div>
    );
  }

  return <LiveTrackingContent order={order} />;
}
