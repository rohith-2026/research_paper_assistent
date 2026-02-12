import { motion } from "framer-motion";

const pillars = [
  {
    title: "ML + Infrastructure",
    items: [
      "FastAPI backend loads TensorFlow/Keras models",
      "MongoDB handles history, analytics, and compliance artifacts",
      "APScheduler snapshots system health on a schedule"
    ]
  },
  {
    title: "Data + Ops",
    items: [
      "Rate limiting + blocklist middleware guard abuse",
      "JWT-based auth + admin allowlists",
      "Uploads served via FastAPI mount with file validation"
    ]
  },
  {
    title: "Experience + Insights",
    items: [
      "React + Tailwind UI for dashboards, admin, and chat",
      "Playwright/Cypress configs protect UI regressions",
      "Analytics, summaries, and graph data stay accessible"
    ]
  }
];

const pillarVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5 }
  })
};

export default function Pillars() {
  return (
    <motion.section
      id="pillars"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="grid gap-6 md:grid-cols-3"
    >
      {pillars.map((pillar, index) => (
        <motion.div
          key={pillar.title}
          custom={index}
          variants={pillarVariants}
          className="parallax-card glow-border hover-lift transform-gpu rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-800/60 p-6 shadow-[0_0_30px_rgba(45,212,191,0.25)]"
        >
          <div className="text-xs uppercase tracking-[0.5em] text-white/40">Pillar</div>
          <h3 className="text-2xl font-semibold">{pillar.title}</h3>
          <ul className="mt-4 space-y-2 text-sm text-white/70 list-disc list-inside">
            {pillar.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </motion.div>
      ))}
    </motion.section>
  );
}
