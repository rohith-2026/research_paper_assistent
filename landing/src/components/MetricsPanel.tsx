import { useEffect, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";

const metrics = [
  { label: "Capacity used", value: 82, suffix: "%" },
  { label: "PSNR", value: 43.2, suffix: " dB" },
  { label: "SSIM", value: 0.981, suffix: "" },
  { label: "Payloads", value: 0, suffix: "text, audio, image, file" }
];

export default function MetricsPanel() {
  const [active, setActive] = useState(false);
  const [displayValues, setDisplayValues] = useState(metrics.map((metric) => metric.value));
  const motionValues = metrics.map(() => useMotionValue(0));

  useEffect(() => {
    if (!active) return;
    const stopFns = motionValues.map((mv, index) => {
      const animation = animate(mv, metrics[index].value, {
        duration: 1.5,
        ease: "easeOut",
        onUpdate: (value) => {
          setDisplayValues((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
          });
        }
      });
      return () => animation.kill();
    });
    return () => stopFns.forEach((stop) => stop());
  }, [active, motionValues]);

  return (
    <motion.section
      id="metrics"
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      onViewportEnter={() => setActive(true)}
      className="grid gap-6 md:grid-cols-4"
    >
      {metrics.map((metric, index) => {
        const decimals = metric.label === "PSNR" ? 1 : metric.label === "SSIM" ? 3 : 0;
        return (
          <motion.div
            key={metric.label}
            className="glass glow-border hover-lift rounded-2xl border border-white/10 p-6 text-center shadow-[0px_0px_40px_rgba(34,197,94,0.35)]"
          >
            <motion.p className="text-4xl font-black">
              {metric.suffix.includes("text") ? (
                metric.suffix
              ) : (
                `${displayValues[index].toFixed(decimals)}${metric.suffix}`
              )}
            </motion.p>
            <p className="text-xs uppercase tracking-[0.5em] text-white/50">{metric.label}</p>
          </motion.div>
        );
      })}
    </motion.section>
  );
}
