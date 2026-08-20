import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Wifi } from "lucide-react";

/**
 * Order IDs are full UUIDs; there's no backend prefix-search endpoint, so
 * this is a direct-ID jump (paste a full order ID), not a fuzzy search.
 */
export function TrackingHeader() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const id = query.trim();
    if (id) navigate(`/track/${id}`);
  }

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-lg shadow-black/40 backdrop-blur-xl">
      <Link to="/" className="shrink-0 text-sm font-semibold tracking-wide text-zinc-50">
        Last-Mile <span className="text-blue-400">Tracker</span>
      </Link>

      <form
        onSubmit={onSubmit}
        className="flex min-w-[160px] flex-1 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5"
      >
        <Search size={14} className="shrink-0 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jump to order ID…"
          className="w-full bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
        />
      </form>

      <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <Wifi size={12} />
        Live (simulated)
      </div>
    </div>
  );
}
