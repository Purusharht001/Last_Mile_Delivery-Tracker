import { NavLink, Outlet } from "react-router-dom";
import { LogOut, Package } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/cn";
import { buttonClasses } from "../ui/Button";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );
}

function Topbar() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Package size={16} />
          </span>
          Last-Mile <span className="text-primary">Tracker</span>
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
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user.name} <span className="text-border">·</span> {user.role}
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
    <div className="min-h-screen bg-background text-foreground">
      <Topbar />
      <Outlet />
    </div>
  );
}
