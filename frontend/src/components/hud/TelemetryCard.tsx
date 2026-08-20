import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

interface TelemetryCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: "blue" | "emerald";
  className?: string;
}

export function TelemetryCard({ icon: Icon, label, value, accent = "blue", className }: TelemetryCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3, rotateX: 4, rotateY: -4 }}
      style={{ transformPerspective: 600 }}
      className={cn(
        "pointer-events-auto flex w-40 shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 shadow-lg shadow-black/40 backdrop-blur-xl md:w-full",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          accent === "blue" ? "bg-blue-500/15 text-blue-400" : "bg-emerald-500/15 text-emerald-400",
        )}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</div>
        <motion.div
          key={value}
          initial={{ opacity: 0.4, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="truncate text-sm font-semibold text-zinc-50"
        >
          {value}
        </motion.div>
      </div>
    </motion.div>
  );
}
