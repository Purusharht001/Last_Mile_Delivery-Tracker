import { NavLink, Outlet } from "react-router-dom";
import { LogOut, Package } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/cn";
import { buttonClasses } from "../ui/Button";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
    isActive ? "bg-electric-blue/15 text-blue-300" : "text-zinc-400 hover:bg-white/10 hover:text-zinc-100",
  );
}

function Topbar() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-50">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-electric-blue/20 text-blue-400">
            <Package size={16} />
          </span>
          Last-Mile <span className="text-blue-400">Tracker</span>
        </NavLink>

        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {user?.role === "CUSTOMER" && (
            <>
              <NavLink to="/orders/new" className={navLinkClass}>Place order</NavLink>
              <NavLink to="/orders" className={navLinkClass}>My orders</NavLink>
            </>
          )}
          {user?.role === "AGENT" && <NavLink to="/orders" className={navLinkClass}>My queue</NavLink>}
          {user?.role === "ADMIN" && (
            <>
              <NavLink to="/admin/orders" className={navLinkClass}>Orders</NavLink>
              <NavLink to="/admin/zones" className={navLinkClass}>Zones</NavLink>
              <NavLink to="/admin/rate-cards" className={navLinkClass}>Rate cards</NavLink>
              <NavLink to="/admin/agents" className={navLinkClass}>Agents</NavLink>
              <NavLink to="/orders/new" className={navLinkClass}>Place order</NavLink>
            </>
          )}
        </nav>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-zinc-400 sm:inline">
              {user.name} <span className="text-zinc-600">·</span> {user.role}
            </span>
            <button onClick={logout} className={buttonClasses("secondary", "!px-3 !py-1.5")}>
              <LogOut size={14} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <NavLink to="/login" className={navLinkClass}>Log in</NavLink>
            <NavLink to="/register" className={navLinkClass}>Register</NavLink>
          </div>
        )}
      </div>
    </header>
  );
}

/** Wraps every "normal" page in the shared Topbar. The full-screen 3D live
 * tracking route deliberately renders outside this layout (see App.tsx). */
export function StandardLayout() {
  return (
    <div className="min-h-screen bg-void text-zinc-100">
      <Topbar />
      <Outlet />
    </div>
  );
}
