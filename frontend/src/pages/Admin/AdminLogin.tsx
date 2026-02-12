import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

import { apiAdminLogin } from "../../api/adminAuth.api";
import { useAdminAuth } from "../../admin/useAdminAuth";
import { getErrorMessage } from "../../utils/errors";

export default function AdminLogin() {
  const nav = useNavigate();
  const { login } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.trim().length > 0,
    [email, password]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      setLoading(true);
      const res = await apiAdminLogin({ email: email.trim(), password });
      const raw = res?.access_token ? String(res.access_token) : "";
      const token = raw.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();
      if (!token || token.split(".").length !== 3) throw new Error("Token missing");
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload?.type && !["admin_access", "access"].includes(payload.type)) {
          throw new Error("Invalid admin token");
        }
      } catch (e) {
        throw new Error("Invalid admin token");
      }
      login(token, { id: res.admin_id, email: email.trim() });
      toast.success("Welcome back");
      nav("/admin", { replace: true });
    } catch (error: unknown) {
      setErr(getErrorMessage(error, "Admin login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen flex items-center justify-center px-6" data-no-translate="true">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm glass rounded-3xl p-8 border border-white/10"
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          Admin
        </div>
        <h1 className="text-2xl font-semibold mt-4">Admin access</h1>
        <p className="text-sm text-white/60 mt-1">Sign in to manage the system.</p>

        <form onSubmit={onSubmit} className="space-y-4 mt-6">
          <input
            className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
            type="email"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <div className="relative">
            <input
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50 pr-12"
              type={show ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {err && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">
              {err}
            </div>
          )}
          <button
            disabled={!canSubmit || loading}
            className="w-full rounded-xl bg-emerald-500 text-black py-3 text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-xs text-white/60">
          <Link to="/" className="hover:text-white">
            Back to landing
          </Link>
          <Link to="/login" className="hover:text-white">
            User login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
