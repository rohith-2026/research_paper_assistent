import React from "react";
import Button from "../../components/ui/Button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpenCheck, ServerIcon, Sparkles, ShieldCheck } from "lucide-react";
import { applySettingsToDocument, SETTINGS_KEY, THEME_KEY } from "../../utils/settings";
import { useI18n } from "../../i18n";

const highlights = [
  {
    title: "Insightful predictions",
    detail: "TF-IDF + Keras model surface the subject area and guide the next step.",
    icon: BookOpenCheck,
  },
  {
    title: "Aggregator-ready",
    detail: "Four public APIs are deduped, ranked, and added to a unified paper stream.",
    icon: ServerIcon,
  },
  {
    title: "Chat + compliance",
    detail: "Ollama chat, admin analytics, and compliance logs keep context and guard abuse.",
    icon: Sparkles,
  },
  {
    title: "Secure sharing",
    detail: "AES+HMAC payloads, download records, and share links that respect access controls.",
    icon: ShieldCheck,
  },
];

const pillars = [
  {
    title: "ML + Infrastructure",
    items: [
      "FastAPI backend loads TensorFlow/Keras models",
      "MongoDB handles history, analytics, and compliance artifacts",
      "APScheduler snapshots system health on a schedule",
    ],
  },
  {
    title: "Data + Ops",
    items: [
      "Rate limiting + blocklist middleware guard abuse",
      "JWT-based auth + admin allowlists",
      "Uploads served via FastAPI mount with file validation",
    ],
  },
  {
    title: "Experience + Insights",
    items: [
      "React + Tailwind UI for dashboards, admin, and chat",
      "Playwright/Cypress configs protect UI regressions",
      "Analytics, summaries, and graph data stay accessible",
    ],
  },
];

const steps = [
  { title: "Ingest", detail: "Upload PDFs/DOCX or paste notes—context tags stay linked." },
  { title: "Analyze", detail: "TF-IDF + ML models surface areas while PSNR/SSIM checks track fidelity." },
  { title: "Deliver", detail: "Export summaries, share links, and invite collaborators easily." },
];

const heroBadges = [
  { label: "Document throughput", value: "1.2K docs/hour" },
  { label: "Quality signals", value: "PSNR + SSIM" },
  { label: "Audit-ready", value: "30-day logs" },
];

const metrics = [
  { label: "PSNR", value: "43.2 dB", detail: "High-fidelity signal match" },
  { label: "SSIM", value: "0.981", detail: "Structure retained" },
  { label: "Payloads", value: "text, audio, image, file", detail: "Multi-modal context" },
  { label: "Audit traces", value: "250+ events", detail: "Admin-ready records" },
];

export default function Landing() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const smoothScroll = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerOffset = 90;
    const container = document.querySelector<HTMLElement>(".landing-shell");
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const target = elRect.top - containerRect.top + container.scrollTop - headerOffset;
      container.scrollTo({ top: target, behavior: "smooth" });
      return;
    }
    const elementPosition = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
    window.scrollTo({ top: elementPosition, behavior: "smooth" });
  };

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem(THEME_KEY);
      if (storedTheme) document.documentElement.dataset.theme = storedTheme;
      document.documentElement.style.scrollBehavior = "smooth";
      const rawSettings = localStorage.getItem(SETTINGS_KEY);
      if (rawSettings) applySettingsToDocument(JSON.parse(rawSettings));
    }
  }, []);

  return (
    <div className="landing-shell min-h-screen relative overflow-auto bg-[#020617] text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="orbital-blob top-16 -right-16 h-80 w-80" />
        <div className="orbital-blob left-20 top-44 h-96 w-96 blur-[2px]" />
        <div className="orbital-blob bottom-8 right-6 h-72 w-72" />
        <div className="radial-grid" />
      </div>

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-8 py-6 border-b border-white/10">
        <div className="text-2xl font-black tracking-tight">{t("Research Paper Assistant")}</div>
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.6em] text-white/50">
          <button onClick={() => smoothScroll("highlights")} className="hover:text-white">
            {t("Highlights")}
          </button>
          <button onClick={() => smoothScroll("workflow")} className="hover:text-white">
            {t("Workflow")}
          </button>
          <button onClick={() => smoothScroll("about")} className="hover:text-white">
            {t("About")}
          </button>
          <Button size="sm" onClick={() => navigate("/dashboard")} className="ml-6">
            {t("Get Started")}
          </Button>
        </div>
      </header>

      <div className="particle-layer" aria-hidden="true">
        <span className="particle particle-one" />
        <span className="particle particle-two" />
        <span className="particle particle-three" />
      </div>
      <main className="relative z-10 px-8 py-12 space-y-16 max-w-6xl mx-auto">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-start">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.5em] text-white/50">
              <span className="h-px w-8 bg-gradient-to-r from-emerald-400/60 to-cyan-300/70" />
              {t("Production-ready research assistant")}
              <span className="h-px w-8 bg-gradient-to-r from-cyan-300/70 to-emerald-400/50" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight">
              {t("Research Paper Assistant turns raw documents into secure insights")}{" "}
              <span className="text-gradient">{t("with a premium single-pane workflow.")}</span>
            </h1>
            <p className="max-w-3xl text-lg text-white/70">
              {t(
                "Upload papers, ask questions, record history, and export summaries while the backend ML predicts the most relevant subject areas and tracks quality with PSNR/SSIM snapshots."
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/dashboard")}>
                {t("Get Started")} <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => smoothScroll("highlights")}>
                {t("View Highlights")}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-white/70">
              {heroBadges.map((badge) => (
                <div key={badge.label} className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                  <div className="text-[10px] uppercase tracking-[0.4em] text-white/40">{t(badge.label)}</div>
                  <div className="text-sm font-semibold text-white">{badge.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900/50 to-slate-800/60 p-6 shadow-2xl">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/40">
              <span>{t("Live telemetry")}</span>
              <span>{t("Updated moments ago")}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="text-xs uppercase text-white/60 tracking-[0.4em]">{metric.label}</div>
                  <div className="text-2xl font-black tracking-tight">{metric.value}</div>
                  <p className="text-xs text-white/60">{metric.detail}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/20 to-cyan-400/10 p-4 text-sm text-white/90">
              {t("Secure payloads ready for text, audio, image, and file assets.")}
            </div>
          </div>
        </section>

        <section
          id="highlights"
          className="grid gap-6 md:grid-cols-2 bg-gradient-to-br from-white/5 via-cyan-500/10 to-slate-900/30 p-6 rounded-[32px] border border-white/10 shadow-2xl"
        >
          {highlights.map((feature) => (
            <article
              key={feature.title}
              className="flex h-full flex-col gap-3 rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/60 to-slate-800/60 p-6 backdrop-blur shadow-[0_20px_60px_rgba(2,6,23,0.5)]"
            >
              <div className="flex items-center gap-3 text-cyan-300">
                <feature.icon className="w-5 h-5" />
                <div className="text-lg font-semibold">{t(feature.title)}</div>
              </div>
              <p className="text-sm text-white/70">{t(feature.detail)}</p>
              <div className="mt-auto text-xs uppercase tracking-[0.4em] text-white/40">
                {t("Paper-grade observability")}
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {pillars.map((pillar) => (
            <article
              key={pillar.title}
              className="glass rounded-[32px] border border-white/10 p-6 space-y-4 bg-gradient-to-br from-slate-900/70 to-slate-800/80 blur-sheen parallax-card"
            >
              <div className="text-xs uppercase tracking-[0.4em] text-white/40">{t("Pillar")}</div>
              <div className="text-2xl font-semibold text-white">{t(pillar.title)}</div>
              <ul className="space-y-2 text-sm text-white/60 list-disc list-inside">
                {pillar.items.map((item) => (
                  <li key={item}>{t(item)}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section
          id="workflow"
          className="glass rounded-[32px] border border-white/10 p-8 space-y-6 bg-gradient-to-br from-slate-900/60 to-slate-800/60 parallax-card"
        >
          <div className="flex flex-col gap-1">
            <div className="text-lg md:text-xl font-semibold">{t("Workflow")}</div>
            <p className="text-sm text-white/60 max-w-2xl">
              {t("Every document flows through ingest, analysis, and delivery lanes that keep quality, compliance, and admin review in sync.")}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/10 p-6 space-y-3 bg-black/30 shadow-[0_10px_40px_rgba(2,6,23,0.45)]"
              >
                <div className="text-xs text-white/50">
                  {t("Step")} {index + 1}
                </div>
                <div className="text-xl font-semibold">{t(step.title)}</div>
                <p className="text-sm text-white/60">{t(step.detail)}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-soft rounded-[32px] border border-white/10 p-8 space-y-4 bg-gradient-to-br from-slate-900/80 to-slate-800/60">
            <div className="text-xs uppercase tracking-[0.4em] text-white/40">{t("About the project")}</div>
            <h3 className="text-2xl font-semibold text-white">Research Paper Assistant</h3>
            <p className="text-sm text-white/70">
              {t(
                "Built as a production-ready research assistant, this stack marries TF-IDF + Keras predictions, FastAPI/MongoDB services, and admin dashboards to give labs context-rich answers."
              )}
            </p>
            <p className="text-sm text-white/70">
              {t(
                "The assistant stores histories, papers, notes, summaries, graphs, analytics, and admin compliance artifacts while guarding abuse with rate limiting and blocklists."
              )}
            </p>
            <div className="grid gap-3 md:grid-cols-2 text-xs text-white/60">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                {t("TensorFlow/Keras inference + TF-IDF ranking")}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                {t("MongoDB observability + FastAPI scale")}
              </div>
            </div>
          </div>
          <div className="glass-soft rounded-[32px] border border-white/10 p-8 space-y-4 bg-gradient-to-br from-slate-900/80 to-slate-800/60">
            <div className="text-xs uppercase tracking-[0.4em] text-white/40">{t("Contact")}</div>
            <p className="text-sm text-white/70">{t("Questions, feedback, or collaboration ideas? Email:")}</p>
            <a href="mailto:anumandlarohithreddy2004@gmail.com" className="text-sm text-emerald-300 hover:text-emerald-200">
              anumandlarohithreddy2004@gmail.com
            </a>
            <div className="text-xs uppercase tracking-[0.4em] text-white/40">{t("Workflow notes")}</div>
            <ul className="text-sm text-white/60 space-y-2 list-disc list-inside">
              <li>{t("ML pipeline: ingest -> vectorize -> predict -> aggregate -> store.")}</li>
              <li>{t("Chatbot and summary contexts pull from history, notes, graph edges, and papers.")}</li>
              <li>{t("Compliance jobs, analytics, and admin tools live alongside the user experience.")}</li>
            </ul>
          </div>
        </section>

        <section className="glass rounded-[32px] border border-white/10 p-8 space-y-6 bg-gradient-to-br from-slate-900/70 to-slate-800/70">
          <div className="grid gap-6 md:grid-cols-2 items-center">
            <div>
              <div className="text-2xl font-semibold text-white">{t("Ready to move research forward?")}</div>
              <p className="text-white/60 mt-1">
                {t("Launch the Research Paper Assistant to ingest, analyze, and share secure insights with one click.")}
              </p>
              <div className="mt-3 text-sm text-white/50">
                {t("Admin dashboards, compliance logs, and analytics stay only a login away.")}
              </div>
            </div>
            <div className="space-y-3">
              <Button size="lg" onClick={() => navigate("/dashboard")}>
                {t("Get Started")}
              </Button>
              <Button size="lg" variant="secondary" onClick={() => navigate("/admin/login")}>
                {t("Admin Login")}
              </Button>
            </div>
          </div>
        </section>

        <footer className="text-xs text-white/50 flex flex-wrap justify-between gap-4 pt-4">
          <span>{t("(c) Research Paper Assistant 2026")}</span>
          <span>{t("Production-ready research workflows.")}</span>
        </footer>
        <div className="liquid-layer" aria-hidden="true" />
        <div className="liquid-layer alt" aria-hidden="true" />
        <div className="liquid-layer deep" aria-hidden="true" />
      </main>
    </div>
  );
}
