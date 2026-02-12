import { motion } from "framer-motion";

type PaperItem = {
  title: string;
  url?: string | null;
  authors?: string[] | null;
  year?: number | null;
  venue?: string | null;
  source?: string | null;
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
      {children}
    </span>
  );
}

export default function PapersList({ papers }: { papers: PaperItem[] }) {
  return (
    <div className="glass rounded-[28px] p-5 md:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-black tracking-tight">Top 10 Papers</div>
          <p className="text-sm text-white/65 mt-1">
            Aggregated from SemanticScholar + Crossref + OpenAlex + arXiv
          </p>
        </div>

        <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
          Total: <b className="text-white/85">{papers?.length ?? 0}</b>
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {papers?.length ? (
          papers.slice(0, 10).map((p, idx) => {
            const clickable = !!p.url;

            const Card = (
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.18 }}
                className={`glass-soft rounded-[22px] p-4 border border-white/10 ${
                  clickable ? "hover:border-white/20 hover:shadow-glow cursor-pointer" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-white/55 font-semibold">
                      Paper {idx + 1}
                    </div>

                    <div className="mt-1 font-extrabold leading-snug text-white/95">
                      {p.title || "Untitled"}
                    </div>
                  </div>

                  <div className="text-white/45 font-bold">↗</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {p.year ? <Chip>{p.year}</Chip> : null}
                  {p.venue ? <Chip>{p.venue}</Chip> : null}
                  {p.source ? <Chip>{p.source}</Chip> : null}
                </div>

                {p.url ? (
                  <div className="mt-3 text-xs text-emerald-200/90 break-all">
                    {p.url}
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-white/50 italic">
                    No link available
                  </div>
                )}
              </motion.div>
            );

            return clickable ? (
              <a
                key={idx}
                href={p.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                {Card}
              </a>
            ) : (
              <div key={idx}>{Card}</div>
            );
          })
        ) : (
          <div className="text-white/65 text-sm">No papers found.</div>
        )}
      </div>
    </div>
  );
}
