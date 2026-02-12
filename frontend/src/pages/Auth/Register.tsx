import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Sparkles, UserPlus } from "lucide-react";

import { apiRegister } from "../../api/auth.api";
import { getErrorMessage } from "../../utils/errors";
import { getIstYear } from "../../utils/time";

export default function Register() {
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      name.trim().length >= 2 &&
      email.trim().length > 3 &&
      password.trim().length >= 6,
    [name, email, password]
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
      await apiRegister({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      nav("/login", { replace: true });
    } catch (error: unknown) {
      setErr(getErrorMessage(error, "Registration failed"));
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
            <motion.div
              variants={item}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50"
            >
              <UserPlus className="h-4 w-4 text-emerald-300" />
              New workspace
            </motion.div>
            <motion.h1 variants={item} className="text-4xl md:text-5xl font-black leading-tight">
              Create your research command center in minutes.
            </motion.h1>
            <motion.p variants={item} className="text-white/60 max-w-xl">
              Organize papers, track insights, and build collections with a personalized workspace.
            </motion.p>
            <motion.div variants={item} className="grid gap-3 sm:grid-cols-2">
              <div className="glass-soft rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-emerald-300" />
                  Fast onboarding
                </div>
                <div className="text-xs text-white/50 mt-2">
                  Start saving and summarizing instantly.
                </div>
              </div>
              <div className="glass-soft rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <UserPlus className="h-4 w-4 text-emerald-300" />
                  Personalized defaults
                </div>
                <div className="text-xs text-white/50 mt-2">
                  Set your own export and summary preferences.
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
                <h2 className="text-2xl font-semibold">Create account</h2>
                <p className="text-sm text-white/50 mt-1">Join the Research Assistant platform.</p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <input
                  className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />

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
                    placeholder="Password (min 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
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
                  {loading ? "Creating..." : "Create account"}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="flex justify-between text-xs text-white/60 pt-2">
                  <Link to="/login" className="hover:text-white">
                    Sign in
                  </Link>
                  <Link to="/" className="hover:text-white">
                    Landing
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
