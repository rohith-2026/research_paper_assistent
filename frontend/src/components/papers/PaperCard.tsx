import { motion } from "framer-motion";
import { ExternalLink, Bookmark, Plus } from "lucide-react";

type PaperCardProps = {
  title: string;
  abstract: string;
  authors: string;
  year: string;
  venue: string;
  source: string;
  onOpen?: () => void;
  onSave?: () => void;
};

export default function PaperCard({
  title,
  abstract,
  authors,
  year,
  venue,
  source,
  onOpen,
  onSave,
}: PaperCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass rounded-2xl p-5 border border-white/10 hover:border-white/20 hover:shadow-glow"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-white/50">{source}</div>
          <div className="mt-2 text-lg font-bold leading-snug">{title}</div>
          <div className="mt-2 text-xs text-white/50">
            {authors} • {venue} • {year}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button className="btn-secondary px-2.5 py-2 rounded-xl">
            <Plus className="w-4 h-4" />
          </button>
          <button className="btn-secondary px-2.5 py-2 rounded-xl" onClick={onSave}>
            <Bookmark className="w-4 h-4" />
          </button>
          <button
            className="btn-primary px-2.5 py-2 rounded-xl"
            onClick={onOpen}
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 text-sm text-white/70 line-clamp-3">
        {abstract}
      </div>
    </motion.div>
  );
}
