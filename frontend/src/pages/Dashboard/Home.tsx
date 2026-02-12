import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FileText, Upload, History, Sparkles } from "lucide-react";
import PageShell from "../../components/layout/PageShell";

const quickActions = [
  {
    title: "Query Text",
    description: "Analyze research text and get subject predictions",
    icon: <FileText className="w-6 h-6" />,
    to: "/dashboard/query-text",
    color: "from-emerald-400 to-emerald-600",
  },
  {
    title: "Query File",
    description: "Upload PDF or DOCX for analysis",
    icon: <Upload className="w-6 h-6" />,
    to: "/dashboard/query-file",
    color: "from-blue-400 to-blue-600",
  },
  {
    title: "View History",
    description: "Browse your past queries and results",
    icon: <History className="w-6 h-6" />,
    to: "/dashboard/history",
    color: "from-amber-400 to-amber-600",
  },
];

export default function Home() {
  const nav = useNavigate();

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-white/70">AI-Powered Research Assistant</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome Back</h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Analyze research papers, predict subject areas, and discover relevant publications.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {quickActions.map((action, idx) => (
            <motion.button
              key={action.to}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              onClick={() => nav(action.to)}
              className="card card-hover hover-lift text-left group"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                {action.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
              <p className="text-sm text-white/60">{action.description}</p>
            </motion.button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-10 glass-soft rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold mb-3">Highlights</h3>
          <div className="grid md:grid-cols-2 gap-3 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>ML-powered subject prediction</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Multi-source paper search</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>PDF and DOCX support</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>History, notes, and downloads workflow</span>
            </div>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
}

