import { ReactNode } from "react";

interface TrackerOverlayProps {
  header: ReactNode;
  banner?: ReactNode;
  dashboard: ReactNode[];
  scrubber: ReactNode;
  cameraToggle: ReactNode;
}

/**
 * Floating glass HUD grid over the full-screen 3D canvas. The root and every
 * plain layout wrapper here are pointer-events-none so clicks/drags pass
 * through to the canvas (for future camera interaction); each actual
 * control re-enables pointer-events-auto on itself.
 */
export function TrackerOverlay({ header, banner, dashboard, scrubber, cameraToggle }: TrackerOverlayProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col p-3 sm:p-5">
      <div className="flex flex-col gap-2">
        {header}
        {banner}
      </div>

      {/* desktop: telemetry cards float in a column on the right */}
      <div className="pointer-events-none absolute right-3 top-28 hidden w-60 flex-col gap-2 sm:right-5 md:flex">
        {dashboard}
      </div>

      {/* desktop: camera toggle sits above the telemetry column */}
      <div className="pointer-events-none absolute right-3 top-20 hidden justify-end sm:right-5 md:flex">
        {cameraToggle}
      </div>

      <div className="mt-auto flex flex-col items-center gap-4">
        {/* mobile: telemetry cards become a horizontally-scrollable shelf */}
        <div className="pointer-events-auto flex w-full items-center gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-2 shadow-lg shadow-black/40 backdrop-blur-xl md:hidden">
          {dashboard}
        </div>
        <div className="flex justify-center md:hidden">{cameraToggle}</div>
        {scrubber}
      </div>
    </div>
  );
}
