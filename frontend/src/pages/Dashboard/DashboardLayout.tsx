import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useAuth } from '../../auth/useAuth';
import SideNav from '../../components/layout/SideNav';
import TopNav from '../../components/layout/TopNav';
import { useI18n } from "../../i18n";

export default function DashboardLayout() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useI18n();

  const handleLogout = () => {
    logout();
    nav('/login', { replace: true });
  };

  // Close the mobile drawer immediately after navigating to another page.
  useEffect(() => {
    setSidebarOpen(false);
  }, [loc.pathname]);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[var(--bg-primary)]">
      <div className="hidden lg:flex lg:w-[30%] lg:max-w-[360px] lg:min-w-[280px]">
        <SideNav onLogout={handleLogout} />
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
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] z-50 lg:hidden"
            >
              <SideNav onLogout={handleLogout} onNavigate={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="lg:hidden h-14 flex items-center justify-between px-4 border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/5"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="text-sm font-medium">{t("Research Assistant")}</span>
          <div className="w-9" />
        </div>

        <div className="hidden lg:block">
          <TopNav onLogout={handleLogout} />
        </div>

        <main className="flex-1 overflow-auto scrollbar-custom">
          <div className="h-full p-6">
            <Outlet />
          </div>
        </main>
        <button
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-glow bg-emerald-400/90 text-black font-semibold hover:bg-emerald-300 transition animate-pulse"
          onClick={() => nav('/dashboard/chatbot')}
          title={t("Open Chatbot")}
          aria-label={t("Open Chatbot")}
        >
          {t("Chat")}
        </button>
      </div>
    </div>
  );
}
