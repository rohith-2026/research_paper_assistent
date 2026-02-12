export default function FinalCTA() {
  return (
    <section id="cta" className="cta-glow hover-lift space-y-4 rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-10 shadow-[0_40px_60px_rgba(2,6,23,0.7)]">
      <p className="text-2xl font-semibold text-white">Ready to move research forward?</p>
      <p className="text-sm text-white/60">
        Launch the Research Paper Assistant to ingest, analyze, and share secure insights with one click.
      </p>
      <a href="#hero">
        <button className="button-magnetic rounded-full border border-white/30 px-6 py-3 text-sm font-semibold uppercase tracking-[0.4em] text-white transition hover:bg-white/10">
          Get Started
        </button>
      </a>
    </section>
  );
}
