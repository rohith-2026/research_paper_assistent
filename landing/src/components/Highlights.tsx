import { motion } from "framer-motion";

const highlights = [
  "Subject detection",
  "Live PSNR/SSIM",
  "History + downloads",
  "Ollama chat access"
];

const highlightVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 }
  })
};

export default function Highlights() {
  return (
    <motion.section
      id="highlights"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      className="grid gap-6 md:grid-cols-2"
    >
      {highlights.map((item, index) => (
        <motion.div
          key={item}
          custom={index}
          variants={highlightVariant}
          className="glass-soft glow-border hover-lift rounded-3xl border border-white/10 p-6 shadow-[0px_0px_30px_rgba(52,211,153,0.35)]"
        >
          <p className="text-lg font-semibold">{item}</p>
        </motion.div>
      ))}
    </motion.section>
  );
}
