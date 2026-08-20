import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function Topbar() {
  const { user, logout } = useAuth();
  return (
    <div className="topbar">
      <Link to="/" style={{ fontWeight: 600, textDecoration: "none" }}>Last-Mile Tracker</Link>
      <nav>
        {user?.role === "CUSTOMER" && (
          <>
            <Link to="/orders/new">Place order</Link>
            <Link to="/orders">My orders</Link>
          </>
        )}
        {user?.role === "AGENT" && <Link to="/orders">My queue</Link>}
        {user?.role === "ADMIN" && (
          <>
            <Link to="/admin/orders">Orders</Link>
            <Link to="/admin/zones">Zones</Link>
            <Link to="/admin/rate-cards">Rate cards</Link>
            <Link to="/admin/agents">Agents</Link>
            <Link to="/orders/new">Place order</Link>
          </>
        )}
        {user ? (
          <>
            <span className="muted">{user.name} ({user.role})</span>
            <button className="secondary" onClick={logout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
    </div>
  );
}

/** Wraps every "normal" page in the shared Topbar. The full-screen 3D live
 * tracking route deliberately renders outside this layout (see App.tsx). */
export function StandardLayout() {
  return (
    <div className="app-shell">
      <Topbar />
      <Outlet />
    </div>
  );
}
