import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, AlertTriangle, BarChart3, Database, Gauge, MessageSquare, Settings, Shield, Users, ClipboardList, UserCog, Menu, X, Bell, ShieldAlert } from "lucide-react";
import { useAdminAuth } from "../../admin/useAdminAuth";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: <Gauge className="h-4 w-4" /> },
  { to: "/admin/analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  { to: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
  { to: "/admin/roles-access", label: "Roles", icon: <UserCog className="h-4 w-4" /> },
  { to: "/admin/audit-log", label: "Audit Log", icon: <ClipboardList className="h-4 w-4" /> },
  { to: "/admin/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { to: "/admin/safety-review", label: "Safety Review", icon: <ShieldAlert className="h-4 w-4" /> },
  { to: "/admin/api-usage", label: "API Usage", icon: <Activity className="h-4 w-4" /> },
  { to: "/admin/feedback", label: "Feedback", icon: <MessageSquare className="h-4 w-4" /> },
  { to: "/admin/model-performance", label: "Model Perf", icon: <BarChart3 className="h-4 w-4" /> },
  { to: "/admin/sessions", label: "Sessions", icon: <Shield className="h-4 w-4" /> },
  { to: "/admin/abuse", label: "Abuse", icon: <AlertTriangle className="h-4 w-4" /> },
  { to: "/admin/system-health", label: "System", icon: <Database className="h-4 w-4" /> },
  { to: "/admin/compliance", label: "Compliance", icon: <ClipboardList className="h-4 w-4" /> },
  { to: "/admin/profile", label: "Profile", icon: <Users className="h-4 w-4" /> },
  { to: "/admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export default function AdminLayout() {
  const { logout } = useAdminAuth();
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [live, setLive] = useState(false);
  const [showSecure, setShowSecure] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("admin_live");
    setLive(raw === "true");
  }, []);

  return (
    <div
      className="admin-shell h-screen w-screen flex overflow-hidden bg-[radial-gradient(circle_at_15%_0%,_rgba(16,185,129,0.18),_transparent_40%),radial-gradient(circle_at_85%_10%,_rgba(59,130,246,0.16),_transparent_42%),radial-gradient(circle_at_40%_100%,_rgba(14,116,144,0.14),_transparent_45%)]"
      data-no-translate="true"
    >
      <div className={`hidden lg:flex ${collapsed ? "lg:w-[96px]" : "lg:w-[300px]"} lg:min-w-[96px] lg:max-w-[320px]`}>
        <aside className={`h-full w-full ${collapsed ? "px-2" : "px-5"} py-6`}>
          <div className="h-full rounded-[26px] admin-panel-strong p-5 flex flex-col gap-5 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center">
                <img src="/logo.png" alt="Research Paper Assistant" className="h-9 w-9 object-contain" />
              </div>
              {!collapsed && (
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-white/40">Admin Suite</div>
                  <div className="text-lg font-semibold text-white/90">Control Center</div>
                </div>
              )}
            </div>
            {!collapsed && (
              <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                <div className="text-xs text-white/50">System status</div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm text-emerald-200">Stable</div>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <div className="mt-3 text-[11px] text-white/40">Last check: just now</div>
              </div>
            )}
            <nav className="space-y-1.5 overflow-y-auto scrollbar-custom pr-1 max-h-[calc(100vh-320px)]">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/admin"}
                  className={({ isActive }) =>
                    `group flex items-center ${collapsed ? "justify-center px-2" : "justify-between px-3"} gap-3 rounded-xl py-2.5 text-sm border transition ${
                      isActive
                        ? "bg-white/10 text-white border-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                        : "text-white/60 border-transparent hover:text-white hover:bg-white/5"
                    }`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <span
                    className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
                  >
                    {item.icon}
                    {!collapsed && item.label}
                  </span>
                  {!collapsed && <span className="h-2 w-2 rounded-full bg-white/10 group-hover:bg-white/30" />}
                </NavLink>
              ))}
            </nav>
            <div className="pt-4 border-t border-white/10 space-y-2">
              <button className="text-xs text-white/50 hover:text-white" onClick={logout}>
                Sign out
              </button>
            </div>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] z-50 lg:hidden"
            >
              <aside className="h-full w-full px-4 py-6 admin-panel-strong border-r border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center">
                    <img src="/logo.png" alt="Research Paper Assistant" className="h-9 w-9 object-contain" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.35em] text-white/40">Admin Suite</div>
                    <div className="text-lg font-semibold text-white/90">Control Center</div>
                  </div>
                </div>
                <nav className="space-y-1.5 overflow-y-auto scrollbar-custom pr-1 max-h-[calc(100vh-220px)]">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/admin"}
                      className={({ isActive }) =>
                        `group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm border transition ${
                          isActive
                            ? "bg-white/10 text-white border-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                            : "text-white/60 border-transparent hover:text-white hover:bg-white/5"
                        }`
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="flex items-center gap-3">
                        {item.icon}
                        {item.label}
                      </span>
                    </NavLink>
                  ))}
                </nav>
                <div className="pt-4 border-t border-white/10 mt-4">
                  <button className="text-xs text-white/50 hover:text-white" onClick={logout}>
                    Sign out
                  </button>
                </div>
              </aside>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden h-14 flex items-center justify-between px-4 border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/5"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Research Paper Assistant" className="h-7 w-7 object-contain" />
            <span className="text-sm font-medium">Admin Console</span>
          </div>
          <div className="w-9" />
        </div>

        <div className="hidden lg:block border-b border-white/10 admin-panel-strong px-6 py-3 relative z-50 overflow-visible">
          <div className="flex items-center justify-between overflow-visible">
            <div>
              <div className="text-[11px] uppercase tracking-[0.35em] text-white/40">Admin Workspace</div>
              <div className="text-lg font-semibold text-white/90">Operations</div>
            </div>
            <div className="flex items-center gap-2 relative z-50">
              <button
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-white/60"
                onClick={() => setCollapsed((v) => !v)}
              >
                {collapsed ? "Expand" : "Collapse"}
              </button>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <button
                  className="px-2 py-1 rounded-full bg-white/5 border border-white/10 hover:text-white"
                  onClick={() => setShowSecure((v) => !v)}
                >
                  Secure
                </button>
                <button
                  className={`px-2 py-1 rounded-full border ${
                    live ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-200" : "bg-white/5 border-white/10"
                  }`}
                  onClick={() => {
                    const next = !live;
                    setLive(next);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("admin_live", String(next));
                    }
                    window.dispatchEvent(new CustomEvent("admin:live", { detail: next }));
                  }}
                >
                  Live
                </button>
              </div>
              <button
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-white/60"
                onClick={() => nav("/admin/profile")}
              >
                Admin
              </button>
              {showSecure && (
                <div className="absolute right-24 top-12 z-50 w-56 rounded-2xl admin-popover p-4 text-xs text-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                  <div className="text-white/90 text-sm font-semibold">Security Status</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>DB</span>
                    <span className="text-emerald-200">OK</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span>API</span>
                    <span className="text-emerald-200">OK</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span>Auth</span>
                    <span className="text-emerald-200">OK</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-auto scrollbar-custom relative z-10">
          <div className="p-6">
            <div className="max-w-[1500px] mx-auto">
              <div className="rounded-[28px] admin-panel-soft p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                <Outlet />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
