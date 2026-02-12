import { motion } from "framer-motion";

export default function About() {
  return (
    <motion.section
      id="about"
      className="grid gap-6 lg:grid-cols-2"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <article className="glass-soft glow-border hover-lift rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-8">
        <p className="text-xs uppercase tracking-[0.6em] text-white/40">About the project</p>
        <h3 className="text-3xl font-semibold">Research Paper Assistant</h3>
        <p className="mt-4 text-sm text-white/70">
          Built as a production-ready research assistant, this stack marries TF-IDF + Keras predictions, FastAPI/MongoDB services, and admin dashboards to give labs context-rich answers.
        </p>
        <p className="mt-3 text-sm text-white/70">
          The assistant stores histories, papers, notes, summaries, graphs, analytics, and admin compliance artifacts while guarding abuse with rate limiting and blocklists.
        </p>
      </article>

      <article className="glass-soft glow-border hover-lift rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/60 p-8 space-y-4">
        <p className="text-xs uppercase tracking-[0.6em] text-white/40">Contact</p>
        <div className="text-sm text-white/70">
          Questions, feedback, or collaboration ideas? Email:
        </div>
        <a
          className="text-emerald-300 underline-offset-4 hover:text-emerald-200"
          href="mailto:anumandlarohithreddy2004@gmail.com"
        >
          anumandlarohithreddy2004@gmail.com
        </a>
        <div className="text-xs uppercase tracking-[0.6em] text-white/40">Workflow notes</div>
        <ul className="list-disc space-y-1 pl-4 text-sm text-white/70">
          <li>ML pipeline: ingest vectorize predict aggregate store.</li>
          <li>Chatbot and summary contexts pull from history, notes, graph edges, and papers.</li>
          <li>Compliance jobs, analytics, and admin tools live alongside the user experience.</li>
        </ul>
      </article>
    </motion.section>
  );
}
