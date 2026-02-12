import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, User, RefreshCw, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { apiGetMe } from "../../api/auth.api";
import { useI18n } from "../../i18n";
import Logo from "../common/Logo";

type Me = {
  id: string;
  name: string;
  email: string;
};

interface TopNavProps {
  onLogout: () => void;
}

function initials(email?: string) {
  if (!email) return "U";
  return email.slice(0, 2).toUpperCase();
}

export default function TopNav({ onLogout }: TopNavProps) {
  const nav = useNavigate();
  const { accessToken } = useAuth();
  const { t } = useI18n();

  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGetMe()
      .then(setMe)
      .catch(() => {
        setMe(null);
      });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const maskedToken = accessToken
    ? `${accessToken.slice(0, 8)}...${accessToken.slice(-8)}`
    : t("No token");

  return (
    <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
      <div className="flex items-center gap-4">
        <Logo size={32} showText={false} />
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-white/60">{t("Active Session")}</span>
        </div>
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((s) => !s)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5"
        >
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center font-bold">
            {initials(me?.email)}
          </div>

          <div className="hidden md:block text-left">
            <div className="text-sm font-semibold leading-tight">
              {me?.name || t("User")}
            </div>
            <div className="text-xs text-white/50 truncate">
              {me?.email || ""}
            </div>
          </div>

          <ChevronDown
            className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-72 glass rounded-xl overflow-hidden z-50"
            >
              <div className="p-4 border-b border-white/10">
                <div className="text-xs text-white/50">{t("Signed in as")}</div>
                <div className="text-sm font-semibold truncate">
                  {me?.email || "-"}
                </div>
                <div className="text-xs text-white/50 mt-1">ID: {me?.id || "-"}</div>
              </div>

              <div className="p-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    nav("/dashboard/profile");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5"
                >
                  <User className="w-4 h-4" />
                  {t("Profile")}
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t("Refresh")}
                </button>

                <div className="my-2 h-px bg-white/10" />

                <div className="px-3 py-2">
                  <div className="text-xs text-white/50 mb-1">{t("Session Token")}</div>
                  <div className="text-xs font-mono text-white/70 break-all">
                    {maskedToken}
                  </div>
                </div>

                <div className="px-3 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-white/60">{t("Session Active")}</span>
                </div>

                <div className="my-2 h-px bg-white/10" />

                <button
                  onClick={() => {
                    setOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-300"
                >
                  <LogOut className="w-4 h-4" />
                  {t("Logout")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
