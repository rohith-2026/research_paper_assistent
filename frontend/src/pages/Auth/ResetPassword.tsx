import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";

import { apiResetPassword } from "../../api/auth.api";
import { getErrorMessage } from "../../utils/errors";
import { getIstYear } from "../../utils/time";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = useMemo(
    () => token.trim().length > 10 && password.trim().length >= 6,
    [token, password]
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
    setError(null);

    try {
      setLoading(true);
      await apiResetPassword(token.trim(), password.trim());
      setSuccess(true);

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Password reset failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen flex flex-col relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />

      <header className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div className="text-sm font-semibold tracking-wide">Research Assistant</div>
        <Link to="/login" className="text-sm text-white/60 hover:text-white">
          Back
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-5xl grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center">
          <motion.section
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <motion.div
              variants={item}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Password reset
            </motion.div>
            <motion.h1 variants={item} className="text-4xl md:text-5xl font-black leading-tight">
              Secure a new password in one step.
            </motion.h1>
            <motion.p variants={item} className="text-white/60 max-w-xl">
              Paste your reset token and choose a new password. You will be redirected to sign in
              after success.
            </motion.p>
            <motion.div variants={item} className="glass-soft rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="h-4 w-4 text-emerald-300" />
                Secure tip
              </div>
              <div className="text-xs text-white/50 mt-2">
                Use a unique password you have not used before.
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
                <h2 className="text-2xl font-semibold">Reset password</h2>
                <p className="text-sm text-white/50 mt-1">Enter your reset token and new password.</p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <input
                  className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
                  placeholder="Reset token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />

                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 pr-12 text-sm outline-none focus:border-emerald-300/50"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && (
                  <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 rounded-xl px-3 py-2">
                    Password reset successful. Redirecting to login...
                  </div>
                )}

                <button
                  disabled={!canSubmit || loading}
                  className="w-full rounded-xl bg-emerald-500 text-black py-3 text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {loading ? "Resetting..." : "Reset password"}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="flex justify-between text-xs text-white/60">
                  <Link to="/forgot-password" className="hover:text-white">
                    Back
                  </Link>
                  <Link to="/login" className="hover:text-white">
                    Login
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
