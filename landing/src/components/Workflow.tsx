import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const steps = [
  {
    title: "Ingest",
    detail: "Upload PDFs/DOCX or paste notes—context tags stay linked."
  },
  {
    title: "Analyze",
    detail: "TF-IDF + ML models surface areas while PSNR/SSIM checks track fidelity."
  },
  {
    title: "Deliver",
    detail: "Export summaries, share links, and invite collaborators easily."
  }
];

export default function Workflow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (prefersReduced) return;
    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top 80%",
      end: "bottom 60%",
      onUpdate: (self) => {
        if (lineRef.current) {
          lineRef.current.style.transform = `scaleY(${Math.min(self.progress + 0.1, 1)})`;
        }
      }
    });
    return () => {
      trigger.kill();
    };
  }, [prefersReduced]);

  return (
    <motion.section
      id="workflow"
      className="cta-glow relative flex flex-col gap-8 overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900/60 to-slate-800/50 p-8 shadow-[0_30px_70px_rgba(2,6,23,0.6)]"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      ref={containerRef}
    >
      <div className="absolute left-10 top-20 bottom-10 w-px bg-gradient-to-b from-transparent via-emerald-400/40 to-transparent">
        <div
          ref={lineRef}
          className="origin-top bg-gradient-to-b from-emerald-400 to-transparent"
          style={{ width: "2px", height: "100%", transform: "scaleY(0)", transformOrigin: "top" }}
        />
      </div>
      <div className="flex flex-col gap-8 md:flex-row md:gap-6">
        {steps.map((step, index) => (
          <motion.article
            key={step.title}
            className="group hover-lift relative w-full rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-lg"
            whileHover={{ y: -4, scale: 1.01 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.5em] text-white/60">Step {index + 1}</span>
              <span className="text-emerald-300 text-xs">{step.title}</span>
            </div>
            <h3 className="text-2xl font-semibold">{step.title}</h3>
            <p className="text-sm text-white/70">{step.detail}</p>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}
