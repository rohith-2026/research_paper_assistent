import { motion } from "framer-motion";

const features = [
  {
    title: "Insightful predictions",
    detail: "TF-IDF + Keras model surface the subject area and guide the next step."
  },
  {
    title: "Aggregator-ready",
    detail: "Four public APIs are deduped, ranked, and added to a unified paper stream."
  },
  {
    title: "Chat + compliance",
    detail: "Ollama chat, admin analytics, and compliance logs keep context and guard abuse."
  },
  {
    title: "Secure sharing",
    detail: "AES+HMAC payloads, download records, and share links that respect access controls."
  }
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 }
  })
};

export default function Features() {
  return (
    <motion.section
      id="features"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
    >
      {features.map((feature, index) => (
        <motion.article
          key={feature.title}
          custom={index}
          variants={cardVariants}
          className="slide-card glass glow-border hover-lift rounded-[28px] border border-white/10 p-6 shadow-lg backdrop-blur"
        >
          <div className="text-xs uppercase tracking-[0.5em] text-white/40">Feature</div>
          <h3 className="text-xl font-semibold">{feature.title}</h3>
          <p className="text-sm text-white/60">{feature.detail}</p>
        </motion.article>
      ))}
    </motion.section>
  );
}
