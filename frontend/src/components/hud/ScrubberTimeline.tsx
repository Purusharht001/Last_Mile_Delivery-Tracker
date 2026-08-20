import { useState } from "react";
import { Radio } from "lucide-react";

interface Tick {
  progress: number;
  status: string;
  createdAt: string;
}

interface ScrubberTimelineProps {
  progress: number;
  isLive: boolean;
  ticks: Tick[];
  onScrub: (progress: number) => void;
  onGoLive: () => void;
}

export function ScrubberTimeline({ progress, isLive, ticks, onScrub, onGoLive }: ScrubberTimelineProps) {
  const [hoverTick, setHoverTick] = useState<Tick | null>(null);

  return (
    <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-lg shadow-black/40 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-400">
        <span>Pickup</span>
        {!isLive && (
          <button
            onClick={onGoLive}
            className="flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300 hover:bg-emerald-500/20"
          >
            <Radio size={12} /> Go live
          </button>
        )}
        <span>Delivered</span>
      </div>

      <div className="relative h-6">
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
        <div
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
          style={{ width: `${progress * 100}%` }}
        />
        {ticks.map((t, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoverTick(t)}
            onMouseLeave={() => setHoverTick(null)}
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-zinc-900"
            style={{ left: `${t.progress * 100}%` }}
          />
        ))}
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => onScrub(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          aria-label="Scrub delivery timeline"
        />
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500 shadow shadow-blue-500/60"
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      <div className="mt-2 h-4 text-center text-xs text-zinc-300">
        {hoverTick ? `${hoverTick.status.replace(/_/g, " ")} — ${new Date(hoverTick.createdAt).toLocaleString()}` : " "}
      </div>
    </div>
  );
}
