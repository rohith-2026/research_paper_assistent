import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";
import AdminProtectedRoute from "./AdminProtectedRoute";
import AdminPublicRoute from "./AdminPublicRoute";

import Loader from "../components/ui/Loader";

const Landing = lazy(() => import("../pages/Landing/Landing"));
const Login = lazy(() => import("../pages/Auth/Login"));
const Register = lazy(() => import("../pages/Auth/Register"));
const ForgotPassword = lazy(() => import("../pages/Auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/Auth/ResetPassword"));

const DashboardLayout = lazy(() => import("../pages/Dashboard/DashboardLayout"));
const Home = lazy(() => import("../pages/Dashboard/Home"));
const QueryText = lazy(() => import("../pages/Dashboard/QueryText"));
const QueryFile = lazy(() => import("../pages/Dashboard/QueryFile"));
const QueryResultPage = lazy(() => import("../pages/Dashboard/QueryResultPage"));
const History = lazy(() => import("../pages/Dashboard/History"));
const Analytics = lazy(() => import("../pages/Dashboard/Analytics"));
const PaperExplorer = lazy(() => import("../pages/Dashboard/PaperExplorer"));
const PaperDetail = lazy(() => import("../pages/Dashboard/PaperDetail"));
const PaperSummary = lazy(() => import("../pages/Dashboard/PaperSummary"));
const Chatbot = lazy(() => import("../pages/Dashboard/Chatbot"));
const Notes = lazy(() => import("../pages/Dashboard/Notes"));
const Collections = lazy(() => import("../pages/Dashboard/Collections"));
const Downloads = lazy(() => import("../pages/Dashboard/Downloads"));
const Feedback = lazy(() => import("../pages/Dashboard/Feedback"));
const Graph = lazy(() => import("../pages/Dashboard/Graph"));
const Profile = lazy(() => import("../pages/Dashboard/Profile"));
const Settings = lazy(() => import("../pages/Dashboard/Settings"));
const NotFound = lazy(() => import("../pages/NotFound"));

const AdminLayout = lazy(() => import("../pages/Admin/AdminLayout"));
const AdminLogin = lazy(() => import("../pages/Admin/AdminLogin"));
const AdminDashboard = lazy(() => import("../pages/Admin/AdminDashboard"));
const AdminAnalytics = lazy(() => import("../pages/Admin/AdminAnalytics"));
const AdminUsers = lazy(() => import("../pages/Admin/AdminUsers"));
const AdminUserAnalytics = lazy(() => import("../pages/Admin/AdminUserAnalytics"));
const AdminApiUsage = lazy(() => import("../pages/Admin/AdminApiUsage"));
const AdminFeedback = lazy(() => import("../pages/Admin/AdminFeedback"));
const AdminModelPerformance = lazy(() => import("../pages/Admin/AdminModelPerformance"));
const AdminAbuse = lazy(() => import("../pages/Admin/AdminAbuse"));
const AdminSystemHealth = lazy(() => import("../pages/Admin/AdminSystemHealth"));
const AdminSettings = lazy(() => import("../pages/Admin/AdminSettings"));
const AdminRolesAccess = lazy(() => import("../pages/Admin/AdminRolesAccess"));
const AdminAuditLog = lazy(() => import("../pages/Admin/AdminAuditLog"));
const AdminCompliance = lazy(() => import("../pages/Admin/AdminCompliance"));
const AdminProfile = lazy(() => import("../pages/Admin/AdminProfile"));
const AdminSessions = lazy(() => import("../pages/Admin/AdminSessions"));
const AdminNotifications = lazy(() => import("../pages/Admin/AdminNotifications"));
const AdminSafetyReview = lazy(() => import("../pages/Admin/AdminSafetyReview"));

export default function AppRoutes() {
  const fallback = (
    <div className="p-6">
      <Loader size="sm" text="Loading page..." />
    </div>
  );

  return (
    <Suspense fallback={fallback}>
      <Routes>
        {/* Public */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />

        <Route
          path="/admin/login"
          element={
            <AdminPublicRoute>
              <AdminLogin />
            </AdminPublicRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:userId" element={<AdminUserAnalytics />} />
          <Route path="api-usage" element={<AdminApiUsage />} />
          <Route path="feedback" element={<AdminFeedback />} />
          <Route path="model-performance" element={<AdminModelPerformance />} />
          <Route path="abuse" element={<AdminAbuse />} />
          <Route path="system-health" element={<AdminSystemHealth />} />
          <Route path="roles-access" element={<AdminRolesAccess />} />
          <Route path="audit-log" element={<AdminAuditLog />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="safety-review" element={<AdminSafetyReview />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="compliance" element={<AdminCompliance />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="query-text" element={<QueryText />} />
          <Route path="query-file" element={<QueryFile />} />
          <Route path="query-result" element={<QueryResultPage />} />
          <Route path="history" element={<History />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="paper-explorer" element={<PaperExplorer />} />
          <Route path="paper-detail" element={<PaperDetail />} />
          <Route path="paper-summary" element={<PaperSummary />} />
          <Route path="chatbot" element={<Chatbot />} />
          <Route path="notes" element={<Notes />} />
          <Route path="collections" element={<Collections />} />
          <Route path="downloads" element={<Downloads />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="connected-graph" element={<Graph />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

