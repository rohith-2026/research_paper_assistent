import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import PageShell from "../../components/layout/PageShell";
import PaperCard from "../../components/papers/PaperCard";
import { apiListSavedPapers, apiQueryText, apiSavePaper, PaperItem, SavedPaper } from "../../api/assistant.api";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../utils/errors";
import { getIstYear } from "../../utils/time";
import VoiceButton from "../../components/ui/VoiceButton";

const seedPapers: PaperItem[] = [
  {
    title: "Graph Neural Networks for Scientific Discovery",
    abstract:
      "We introduce a scalable GNN framework that links citations, topics, and methods across multi-source corpora.",
    authors: ["Zhang", "Patel", "Li"],
    year: 2024,
    venue: "NeurIPS",
    source: "Semantic Scholar",
  },
];

export default function PaperExplorer() {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("Any");
  const [venue, setVenue] = useState("Any");
  const [source, setSource] = useState("Any");

  const [papers, setPapers] = useState<PaperItem[]>(seedPapers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [skip, setSkip] = useState(0);

  const filtered = useMemo(() => {
    return papers.filter((p) => {
      if (year !== "Any" && String(p.year) !== year) return false;
      if (venue !== "Any" && p.venue !== venue) return false;
      if (source !== "Any" && p.source !== source) return false;
      if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [query, year, venue, source, papers]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const handleApply = async () => {
    if (!query || query.trim().length < 3) {
      setError("Enter at least 3 characters to search.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await apiQueryText(query.trim());
      setPapers(res.top_papers || []);
      setSkip(0);
      setVisibleCount(6);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to search papers."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      if (query && query.trim().length >= 3) return;
      try {
        const res: SavedPaper[] = await apiListSavedPapers(12, skip);
        const mapped: PaperItem[] = res.map((p) => ({
          title: p.title,
          abstract: p.abstract || null,
          year: p.created_at ? getIstYear(new Date(p.created_at)) : null,
          venue: p.subject_area || null,
          source: "Saved",
          authors: [],
        }));
        setPapers((prev) => (skip === 0 ? mapped : [...prev, ...mapped]));
      } catch {
        // ignore
      }
    };
    run();
  }, [skip, query]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((v) => Math.min(v + 4, filtered.length));
          if (!query || query.trim().length < 3) {
            setSkip((s) => s + 12);
          }
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length, query]);

  return (
    <PageShell title="Paper Explorer" subtitle="Search, filter, and save papers">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-5 border border-white/10"
      >
        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search papers by title, topic, or author..."
            className="input-field flex-1"
          />
          <VoiceButton
            value={query}
            onChange={setQuery}
            className="btn-secondary h-10 w-12 rounded-xl flex items-center justify-center"
          />
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <select className="input-field" value={year} onChange={(e) => setYear(e.target.value)}>
            {["Any", "2024", "2023", "2022"].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          <select className="input-field" value={venue} onChange={(e) => setVenue(e.target.value)}>
            {["Any", "NeurIPS", "ACL", "KDD", "EMNLP"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select className="input-field" value={source} onChange={(e) => setSource(e.target.value)}>
            {["Any", "Semantic Scholar", "OpenAlex", "Crossref", "arXiv"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button className="btn-primary rounded-xl" onClick={handleApply} disabled={loading}>
            {loading ? "Searching..." : "Apply Filters"}
          </button>
        </div>
        {error && (
          <div className="mt-3 text-sm text-red-300">{error}</div>
        )}
      </motion.div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {visible.map((p, idx) => (
          <PaperCard
            key={`${p.title}-${p.url || "no-url"}-${p.year || "no-year"}-${idx}`}
            title={p.title}
            abstract={p.abstract || "No abstract available."}
            authors={(p.authors || []).join(", ")}
            year={p.year ? String(p.year) : "--"}
            venue={p.venue || "Unknown"}
            source={p.source || "Unknown"}
            onSave={async () => {
              try {
                await apiSavePaper(p);
                toast.success("Paper saved");
              } catch (e: unknown) {
                toast.error(getErrorMessage(e, "Failed to save paper"));
              }
            }}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-8 glass rounded-2xl p-6 text-center text-white/60">
          No papers match your filters.
        </div>
      )}

      <div ref={loadMoreRef} className="mt-6 flex justify-center">
        {visible.length < filtered.length ? (
          <div className="text-xs text-white/50">Loading more...</div>
        ) : (
          <div className="text-xs text-white/50">End of results.</div>
        )}
      </div>
    </PageShell>
  );
}

