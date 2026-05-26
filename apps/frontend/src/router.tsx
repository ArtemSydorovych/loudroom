import { Navigate, createBrowserRouter } from "react-router-dom";
import { Join } from "./audience/Join.js";
import { Poll } from "./audience/Poll.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { AuthPage } from "./presenter/AuthPage.js";
import { Dashboard } from "./presenter/Dashboard.js";
import { LiveSession } from "./presenter/LiveSession.js";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/sessions/:id",
    element: (
      <ProtectedRoute>
        <LiveSession />
      </ProtectedRoute>
    ),
  },
  {
    path: "/join",
    element: <Join />,
  },
  {
    path: "/join/:code",
    element: <Join />,
  },
  {
    path: "/audience/sessions/:id",
    element: <Poll />,
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
