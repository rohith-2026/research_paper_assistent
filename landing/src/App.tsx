import Navbar from "./components/Navbar";
import Hero3D from "./components/Hero3D";
import Highlights from "./components/Highlights";
import MetricsPanel from "./components/MetricsPanel";
import Features from "./components/Features";
import Pillars from "./components/Pillars";
import Workflow from "./components/Workflow";
import About from "./components/About";
import FinalCTA from "./components/FinalCTA";
import Footer from "./components/Footer";

const heroItems = [
  "Subject detection",
  "Live PSNR/SSIM",
  "History + downloads",
  "Ollama chat access"
];

export default function App() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-primary text-white">
      <Navbar />
      <Hero3D />
      <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden" aria-hidden>
        <div className="aurora" />
        <div className="hero-orb orb-1" />
        <div className="hero-orb orb-2" />
      </div>
      <div className="absolute inset-0 bg-noise opacity-20" aria-hidden />
      <main className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 pt-28 pb-20">
        <section id="hero" className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-6">
            <p className="fade-in-up delay-1 text-xs uppercase tracking-[0.6em] text-white/40">
              Production-ready research assistant
            </p>
            <h1 className="fade-in-up delay-2 text-4xl font-black leading-tight text-white md:text-5xl">
              Research Paper Assistant turns raw documents into secure insights with a premium single-pane workflow.
            </h1>
            <p className="fade-in-up delay-3 max-w-3xl text-lg text-white/70">
              Upload papers, ask questions, record history, and export summaries while the backend ML predicts the most relevant subject areas and tracks quality with PSNR/SSIM snapshots.
            </p>
            <div className="fade-in-up delay-4 flex flex-wrap gap-4">
              <a href="#cta">
                <button className="button-magnetic rounded-full bg-gradient-to-r from-accent to-accentSoft px-6 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-primary transition hover:scale-[1.01]">
                  Get Started
                </button>
              </a>
              <a href="#highlights">
                <button className="button-magnetic rounded-full border border-white/30 px-6 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-white transition hover:border-white/60 hover:bg-white/10">
                  View Highlights
                </button>
              </a>
            </div>
            <div className="fade-in-up delay-5 grid grid-cols-2 gap-4 text-sm text-white/60 md:grid-cols-4">
              {heroItems.map((item, index) => (
                <div
                  key={item}
                  className="floating-pill hover-lift rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <Highlights />
        <MetricsPanel />
        <Features />
        <Pillars />
        <Workflow />
        <About />
        <FinalCTA />
        <Footer />
      </main>
    </div>
  );
}
