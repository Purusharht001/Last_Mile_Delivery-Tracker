import { Navigate, Route, Routes, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PlaceOrder from "./pages/PlaceOrder";
import MyOrders from "./pages/MyOrders";
import OrderDetail from "./pages/OrderDetail";
import AdminZones from "./pages/AdminZones";
import AdminRateCards from "./pages/AdminRateCards";
import AdminAgents from "./pages/AdminAgents";
import AdminOrders from "./pages/AdminOrders";

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

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "CUSTOMER") return <Navigate to="/orders" replace />;
  if (user.role === "AGENT") return <Navigate to="/orders" replace />;
  return <Navigate to="/admin/orders" replace />;
}

export default function App() {
  return (
    <div className="app-shell">
      <Topbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/orders/new"
          element={
            <ProtectedRoute roles={["CUSTOMER", "ADMIN"]}>
              <PlaceOrder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute roles={["CUSTOMER", "AGENT"]}>
              <MyOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/orders"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/zones"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminZones />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/rate-cards"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminRateCards />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/agents"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminAgents />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
