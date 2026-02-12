import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Copy, Mail, ShieldCheck } from "lucide-react";

import { apiForgotPassword } from "../../api/auth.api";
import { getErrorMessage } from "../../utils/errors";
import { getIstYear } from "../../utils/time";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.trim().length > 3, [email]);

  const container = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { staggerChildren: 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  const copyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setOk("Token copied");
      setTimeout(() => setOk(null), 1200);
    } catch {
      setOk("Copy failed");
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setToken(null);

    try {
      setLoading(true);
      const res = await apiForgotPassword(email.trim());
      if (res?.reset_token) {
        setToken(res.reset_token);
      }
      setOk(res?.message || "If the account exists, a reset token was generated.");
    } catch (error: unknown) {
      setErr(getErrorMessage(error, "Request failed"));
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
              Account recovery
            </motion.div>
            <motion.h1 variants={item} className="text-4xl md:text-5xl font-black leading-tight">
              Reset access and get back to your research.
            </motion.h1>
            <motion.p variants={item} className="text-white/60 max-w-xl">
              We will generate a secure reset token for your account. Use it on the next screen
              to set a new password.
            </motion.p>
            <motion.div variants={item} className="glass-soft rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="h-4 w-4 text-emerald-300" />
                Quick tip
              </div>
              <div className="text-xs text-white/50 mt-2">
                Make sure you have access to the email used during registration.
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
                <h2 className="text-2xl font-semibold">Generate reset token</h2>
                <p className="text-sm text-white/50 mt-1">Enter your account email below.</p>
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

                {err && (
                  <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">
                    {err}
                  </div>
                )}

                {ok && (
                  <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 rounded-xl px-3 py-2">
                    {ok}
                  </div>
                )}

                {token && (
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span>Reset token</span>
                      <button type="button" onClick={copyToken} className="hover:text-white">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-xs break-all text-white/80">{token}</div>
                    <Link to="/reset-password" className="text-xs text-emerald-300 hover:text-emerald-200">
                      Continue to reset password
                    </Link>
                  </div>
                )}

                <button
                  disabled={!canSubmit || loading}
                  className="w-full rounded-xl bg-emerald-500 text-black py-3 text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {loading ? "Generating..." : "Generate token"}
                  <ArrowRight className="h-4 w-4" />
                </button>
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
