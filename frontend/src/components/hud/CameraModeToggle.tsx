import { Car, LucideIcon, Plane, Target } from "lucide-react";
import { CameraMode } from "../3d/DeliveryScene";
import { cn } from "../../lib/cn";

const MODES: { key: CameraMode; label: string; icon: LucideIcon }[] = [
  { key: "drone", label: "Drone", icon: Plane },
  { key: "chase", label: "Chase", icon: Car },
  { key: "destination", label: "Destination", icon: Target },
];

interface CameraModeToggleProps {
  mode: CameraMode;
  onChange: (mode: CameraMode) => void;
}

export function CameraModeToggle({ mode, onChange }: CameraModeToggleProps) {
  return (
    <div className="pointer-events-auto flex gap-1 rounded-full border border-white/10 bg-white/5 p-1 shadow-lg shadow-black/40 backdrop-blur-xl">
      {MODES.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          title={label}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            mode === key
              ? "bg-blue-500/90 text-white shadow shadow-blue-500/40"
              : "text-zinc-300 hover:bg-white/10",
          )}
        >
          <Icon size={14} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
