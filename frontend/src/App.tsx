import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { StandardLayout } from "./components/layout/StandardLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PlaceOrder from "./pages/PlaceOrder";
import MyOrders from "./pages/MyOrders";
import OrderDetail from "./pages/OrderDetail";
import AdminZones from "./pages/AdminZones";
import AdminRateCards from "./pages/AdminRateCards";
import AdminAgents from "./pages/AdminAgents";
import AdminOrders from "./pages/AdminOrders";

// three.js/@react-three pull the bundle up by ~1MB — code-split so that
// weight only loads for users who actually open the live tracking view.
const LiveTracking = lazy(() => import("./pages/LiveTracking"));

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "CUSTOMER") return <Navigate to="/orders" replace />;
  if (user.role === "AGENT") return <Navigate to="/orders" replace />;
  return <Navigate to="/admin/orders" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Full-screen 3D live tracking view — deliberately outside
          StandardLayout so it isn't wrapped in the shared Topbar. */}
      <Route
        path="/track/:id"
        element={
          <ProtectedRoute>
            <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-void text-zinc-400">Loading live tracking…</div>}>
              <LiveTracking />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route element={<StandardLayout />}>
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
      </Route>
    </Routes>
  );
}
