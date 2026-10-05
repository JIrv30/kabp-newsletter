import { Navigate, Route, Routes } from "react-router";
import { AuthProvider, RequireAdmin } from "./AuthProvider";
import AdminLayout from "./AdminLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EditorPage from "./pages/EditorPage";
import AnalyticsPage from "./pages/AnalyticsPage";

export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="edit/:id" element={<EditorPage />} />
          <Route path="stats/:id" element={<AnalyticsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AuthProvider>
  );
}
