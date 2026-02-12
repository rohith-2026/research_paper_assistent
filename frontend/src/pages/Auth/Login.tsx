import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";

import { apiLogin } from "../../api/auth.api";
import { getErrorMessage } from "../../utils/errors";
import { getIstYear } from "../../utils/time";
import { useAuth } from "../../auth/useAuth";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.trim().length > 0,
    [email, password]
  );
  const container = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { staggerChildren: 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    try {
      setLoading(true);
      const data = (await apiLogin({ email: email.trim(), password })) as {
        access_token?: string;
        refresh_token?: string;
        user?: unknown;
      };
      const token = data.access_token;
      const refresh = data.refresh_token;
      if (!token) throw new Error("Token missing");
      if (refresh) localStorage.setItem("rpa_refresh_token", refresh);
      login(token, data.user ?? null);
      nav("/dashboard", { replace: true });
    } catch (error: unknown) {
      setErr(getErrorMessage(error, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen flex flex-col relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />

      <header className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div className="text-sm font-semibold tracking-wide">Research Assistant</div>
        <Link to="/" className="text-sm text-white/60 hover:text-white">
          Back
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-5xl grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <motion.section
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <motion.div variants={item} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Trusted workspace
            </motion.div>
            <motion.h1 variants={item} className="text-4xl md:text-5xl font-black leading-tight">
              Welcome back. Continue where your research left off.
            </motion.h1>
            <motion.p variants={item} className="text-white/60 max-w-xl">
              Sign in to resume saved papers, notes, and analytics. Everything stays synced across devices.
            </motion.p>
            <motion.div variants={item} className="grid gap-3 sm:grid-cols-2">
              <div className="glass-soft rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  Secure sessions
                </div>
                <div className="text-xs text-white/50 mt-2">
                  Encrypted tokens and scoped access.
                </div>
              </div>
              <div className="glass-soft rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-emerald-300" />
                  Smart tracking
                </div>
                <div className="text-xs text-white/50 mt-2">
                  View usage insights instantly.
                </div>
              </div>
            </motion.div>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full"
          >
            <div className="glass rounded-3xl p-8 border border-white/10 shadow-glow">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold">Sign in</h2>
                <p className="text-sm text-white/50 mt-1">Use your account email and password.</p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <input
                  className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
                  type="email"
                  placeholder="Email address"
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
                  className="w-full rounded-xl bg-emerald-500 text-black py-3 text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {loading ? "Signing in..." : "Sign in"}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="flex justify-between text-xs text-white/60 pt-2">
                  <Link to="/forgot-password" className="hover:text-white">
                    Forgot password?
                  </Link>
                  <Link to="/register" className="hover:text-white">
                    Create account
                  </Link>
                </div>

                <div className="flex justify-between text-xs text-white/50">
                  <Link to="/" className="hover:text-white">
                    Back to landing
                  </Link>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="text-center text-xs text-white/40 py-4">
        (c) {getIstYear()}
      </footer>
    </div>
  );
}

