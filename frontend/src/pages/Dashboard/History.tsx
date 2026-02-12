import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Calendar,
  TrendingUp,
  ExternalLink,
  X,
  Copy,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import {
  apiHistory,
  apiDeleteHistoryItem,
  apiListSavedPapers,
  apiSavePaper,
  HistoryItem,
  PaperItem,
  SavedPaper,
} from "../../api/assistant.api";
import api from "../../api/axios";
import { apiListCollections, apiListCollectionItems, Collection } from "../../api/collections.api";

import PageShell from "../../components/layout/PageShell";
import Loader from "../../components/ui/Loader";
import Badge from "../../components/ui/Badge";
import { getErrorMessage } from "../../utils/errors";
import VoiceButton from "../../components/ui/VoiceButton";

type NotePreview = {
  id: string;
  paper_id: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
};

/* ---------------- helpers ---------------- */

function formatDate(dateStr?: string) {
  try {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "--";
  }
}

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function getSubject(item: HistoryItem) {
  return (
    item.subject_area ||
    item.predicted_topics?.[0]?.label ||
    item.top_predictions?.[0]?.label ||
    "Unknown"
  );
}

function getConfidence(item: HistoryItem) {
  if (typeof item.confidence === "number") return item.confidence;
  if (typeof item.predicted_topics?.[0]?.score === "number")
    return item.predicted_topics[0].score;
  if (typeof item.top_predictions?.[0]?.score === "number")
    return item.top_predictions[0].score;
  return null;
}

function abstractText(paper: PaperItem) {
  if (paper.abstract === "NOT_AVAILABLE") {
    return "Abstract not available from the source.";
  }
  return paper.abstract || "Abstract not available from the source.";
}

function isWithinDays(dateStr: string | undefined, days: number) {
  if (!dateStr) return false;
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  if (Number.isNaN(d)) return false;
  const diff = now - d;
  return diff <= days * 24 * 60 * 60 * 1000;
}

/* ---------------- Papers Modal ---------------- */

function PapersModal({
  open,
  onClose,
  subject,
  papers,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  subject: string;
  papers: PaperItem[];
  onSave: (paper: PaperItem, subjectArea: string) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-4xl glass rounded-3xl border border-white/10 overflow-hidden"
          >
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <div className="text-xs text-white/50">Papers for</div>
                <div className="text-lg font-extrabold truncate">
                  {subject}
                </div>
              </div>

              <button
                onClick={onClose}
                className="btn-secondary px-3 py-2 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {!papers.length && (
                <div className="text-center text-white/60 py-16">
                  No papers found for this query.
                </div>
              )}

              {papers.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                  {papers.map((p, idx) => (
                    <div
                      key={idx}
                      className="block glass-soft rounded-2xl p-4 border border-white/10 hover:border-white/20 hover:shadow-glow"
                    >
                      <div className="text-xs text-white/50 font-semibold">
                        Paper {idx + 1}
                      </div>

                      <div className="mt-1 font-bold leading-snug">
                        {p.title || "Untitled paper"}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {p.year && (
                          <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
                            {p.year}
                          </span>
                        )}
                        {p.source && (
                          <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
                            {p.source}
                          </span>
                        )}
                        {p.venue && (
                          <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
                            {p.venue}
                          </span>
                        )}
                      </div>

                      {p.url && (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 text-xs text-emerald-200 break-all flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {p.url}
                        </a>
                      )}

                      <div className="mt-3 text-xs text-white/60">
                        {abstractText(p)}
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          className="btn-secondary rounded-xl px-3 py-2 text-xs"
                          onClick={() => onSave(p, subject)}
                        >
                          Save paper
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Main Page ---------------- */

export default function History() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([]);
  const [noteFlags, setNoteFlags] = useState<Record<string, boolean>>({});
  const [noteCache, setNoteCache] = useState<Record<string, NotePreview[]>>({});
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionItems, setCollectionItems] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "saved" | "notes" | "collections">("history");

  const [openPapersFor, setOpenPapersFor] = useState<HistoryItem | null>(null);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiHistory(50, 0);
      setItems(res.items || []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load history"));
    } finally {
      setLoading(false);
    }
  };

  const loadSaved = async () => {
    try {
    const res = await apiListSavedPapers(100, 0);
      setSavedPapers(res || []);
    } catch {
      setSavedPapers([]);
    }
  };

  useEffect(() => {
    loadHistory();
    loadSaved();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const cols = await apiListCollections();
        setCollections(cols || []);
        const items = await Promise.all(
          (cols || []).map(async (c) => {
            try {
              const rows = await apiListCollectionItems(c.id);
              return { id: c.id, items: rows.map((r) => r.paper_id) };
            } catch {
              return { id: c.id, items: [] as string[] };
            }
          })
        );
        const map: Record<string, string[]> = {};
        items.forEach((i) => {
          map[i.id] = i.items;
        });
        setCollectionItems(map);
      } catch {
        setCollections([]);
        setCollectionItems({});
      }
    };
    run();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, range, activeTab]);

  useEffect(() => {
    if (activeTab === "saved" || activeTab === "notes") {
      loadSaved();
    }
  }, [activeTab]);

  useEffect(() => {
    const loadNotes = async () => {
      if (activeTab !== "saved" && activeTab !== "notes") return;
      const ids = savedPapers.map((p) => p.id).slice(0, 40);
      if (!ids.length) return;
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const res = await api.get<NotePreview[]>(`/notes/paper/${id}`);
              const list = Array.isArray(res.data) ? res.data : [];
              return { id, hasNotes: list.length > 0, notes: list };
            } catch {
              return { id, hasNotes: false, notes: [] as NotePreview[] };
            }
          })
        );
        setNoteFlags((prev) => {
          const next = { ...prev };
          results.forEach((r) => {
            next[r.id] = r.hasNotes;
          });
          return next;
        });
        setNoteCache((prev) => {
          const next = { ...prev };
          results.forEach((r) => {
            next[r.id] = r.notes;
          });
          return next;
        });
      } catch {
        /* ignore */
      }
    };
    loadNotes();
  }, [activeTab, savedPapers]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { paper_id?: string } | undefined;
      if (!detail?.paper_id) return;
      api
        .get<NotePreview[]>(`/notes/paper/${detail.paper_id}`)
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : [];
          const hasNotes = list.length > 0;
          setNoteFlags((prev) => ({ ...prev, [detail.paper_id as string]: hasNotes }));
          setNoteCache((prev) => ({ ...prev, [detail.paper_id as string]: list }));
        })
        .catch(() => {
          setNoteFlags((prev) => ({ ...prev, [detail.paper_id as string]: false }));
          setNoteCache((prev) => ({ ...prev, [detail.paper_id as string]: [] }));
        });
    };
    window.addEventListener("notes-updated", handler as EventListener);
    return () => window.removeEventListener("notes-updated", handler as EventListener);
  }, []);

  useEffect(() => {
    const onSaved = () => {
      if (activeTab === "saved") {
        loadSaved();
      }
    };
    const onSavedWithDetail = (e: Event) => {
      const detail = (e as CustomEvent).detail as SavedPaper | undefined;
      if (detail?.id) {
        setSavedPapers((prev) => {
          const exists = prev.some((p) => p.id === detail.id);
          if (exists) return prev;
          return [detail, ...prev];
        });
      }
      onSaved();
    };
    window.addEventListener("saved-papers-updated", onSavedWithDetail as EventListener);
    return () => window.removeEventListener("saved-papers-updated", onSavedWithDetail as EventListener);
  }, [activeTab]);

  const handleDelete = async (id: string) => {
    try {
      await apiDeleteHistoryItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      /* silent */
    }
  };

  const handleSavePaper = async (paper: PaperItem, subjectArea: string) => {
    try {
      const saved = await apiSavePaper({
        ...paper,
        subject_area: subjectArea,
      });
      setSavedPapers((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        if (exists) return prev;
        return [saved, ...prev];
      });
      toast.success("Paper saved");
    } catch {
      toast.error("Failed to save paper");
    }
  };

  const savedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const p of savedPapers) {
      if (p.title) keys.add(normalize(p.title));
      if (p.url) keys.add(normalize(p.url));
    }
    return keys;
  }, [savedPapers]);

  const savedLookup = useMemo(() => {
    const map = new Map<string, SavedPaper>();
    for (const p of savedPapers) {
      if (p.title) map.set(normalize(p.title), p);
      if (p.url) map.set(normalize(p.url), p);
    }
    return map;
  }, [savedPapers]);

  const savedByQuery = useMemo(() => {
    return items
      .map((item) => {
        const papers = item.papers || [];
        const saved = papers.filter((p) => {
          if (p.title && savedKeys.has(normalize(p.title))) return true;
          if (p.url && savedKeys.has(normalize(p.url))) return true;
          return false;
        });
        return { item, saved };
      })
      .filter((entry) => entry.saved.length > 0);
  }, [items, savedKeys]);

  const collectionNameByPaper = useMemo(() => {
    const map = new Map<string, string[]>();
    collections.forEach((c) => {
      const ids = collectionItems[c.id] || [];
      ids.forEach((pid) => {
        const list = map.get(pid) || [];
        if (!list.includes(c.name)) list.push(c.name);
        map.set(pid, list);
      });
    });
    return map;
  }, [collections, collectionItems]);

  const groupedSavedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const entry of savedByQuery) {
      for (const p of entry.saved) {
        if (p.title) keys.add(normalize(p.title));
        if (p.url) keys.add(normalize(p.url));
      }
    }
    return keys;
  }, [savedByQuery]);

  const ungroupedSaved = useMemo(() => {
    return savedPapers.filter((p) => {
      if (p.title && groupedSavedKeys.has(normalize(p.title))) return false;
      if (p.url && groupedSavedKeys.has(normalize(p.url))) return false;
      return true;
    });
  }, [savedPapers, groupedSavedKeys]);

  const filteredHistory = useMemo(() => {
    const q = normalize(search);
    return items.filter((item) => {
      const text = `${item.text || item.input_text || ""} ${getSubject(item)}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (range === "7d" && !isWithinDays(item.created_at, 7)) return false;
      if (range === "30d" && !isWithinDays(item.created_at, 30)) return false;
      if (range === "90d" && !isWithinDays(item.created_at, 90)) return false;
      return true;
    });
  }, [items, search, range]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const pagedHistory = filteredHistory.slice((page - 1) * pageSize, page * pageSize);

  return (
    <PageShell title="Query History" subtitle="View and manage your past queries">
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          className={`btn-secondary rounded-xl px-4 py-2 text-xs ${
            activeTab === "history" ? "shadow-glow" : ""
          }`}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
        <button
          className={`btn-secondary rounded-xl px-4 py-2 text-xs ${
            activeTab === "saved" ? "shadow-glow" : ""
          }`}
          onClick={() => setActiveTab("saved")}
        >
          Saved Papers
        </button>
        <button
          className={`btn-secondary rounded-xl px-4 py-2 text-xs ${
            activeTab === "notes" ? "shadow-glow" : ""
          }`}
          onClick={() => setActiveTab("notes")}
        >
          Notes
        </button>
        <button
          className={`btn-secondary rounded-xl px-4 py-2 text-xs ${
            activeTab === "collections" ? "shadow-glow" : ""
          }`}
          onClick={() => setActiveTab("collections")}
        >
          Collections
        </button>
      </div>

      {activeTab === "history" && (
        <div className="glass rounded-2xl p-4 border border-white/10 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                className="input-field text-xs max-w-[280px]"
                placeholder="Search history..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <VoiceButton value={search} onChange={setSearch} />
            </div>
            <select
              className="input-field text-xs max-w-[160px]"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="all">All time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <div className="text-xs text-white/50">
              {filteredHistory.length} results
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader size="lg" text="Loading history..." />
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-300 text-sm">
          {error}
        </div>
      )}

      {!loading && activeTab === "history" && filteredHistory.length === 0 && (
        <div className="text-center py-16 text-white/60">
          No queries yet.
        </div>
      )}

      {!loading && activeTab === "history" && filteredHistory.length > 0 && (
        <div className="space-y-3">
          {pagedHistory.map((item, idx) => {
            const subject = getSubject(item);
            const conf = getConfidence(item);
            const papers = item.papers || [];
            const firstPaperUrl = papers[0]?.url;
            const notePaper =
              papers.find((p) => p.title && savedLookup.has(normalize(p.title))) ||
              papers.find((p) => p.url && savedLookup.has(normalize(p.url || "")));
            const noteTarget = notePaper
              ? savedLookup.get(normalize(notePaper.title || notePaper.url || ""))?.id
              : undefined;
            const collectionNames = new Set<string>();
            papers.forEach((p) => {
              const saved =
                (p.title && savedLookup.get(normalize(p.title))) ||
                (p.url && savedLookup.get(normalize(p.url || "")));
              if (saved) {
                const names = collectionNameByPaper.get(saved.id) || [];
                names.forEach((n) => collectionNames.add(n));
              }
            });

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className="glass rounded-2xl p-5 group hover-lift"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="accent">
                        <TrendingUp className="w-3 h-3" />
                        {subject}
                      </Badge>

                      {conf != null && (
                        <span className="text-xs text-white/50">
                          {(conf * 100).toFixed(1)}% confidence
                        </span>
                      )}

                      {papers.length > 0 && (
                        <span className="text-xs text-white/40">
                          {papers.length} papers
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-white/80 line-clamp-2 mb-3">
                      {item.text || item.input_text || "No text"}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.created_at)}
                      </div>

                      {papers.length > 0 && (
                        <button
                          onClick={() => setOpenPapersFor(item)}
                          className="text-emerald-200 hover:text-emerald-100 font-semibold"
                        >
                          View {papers.length} papers
                        </button>
                      )}

                      <Link
                        to={`/dashboard/paper-detail?history_id=${item.id}`}
                        className="text-emerald-200 hover:text-emerald-100 font-semibold inline-flex items-center gap-1"
                      >
                        View in Paper Detail
                        <ArrowRight className="w-3 h-3" />
                      </Link>

                      {firstPaperUrl && (
                        <a
                          href={firstPaperUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-200 hover:text-emerald-100 font-semibold inline-flex items-center gap-1"
                        >
                          Open first paper
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      <button
                        onClick={() => navigator.clipboard.writeText(item.text || item.input_text || "")}
                        className="text-emerald-200 hover:text-emerald-100 font-semibold inline-flex items-center gap-1"
                      >
                        Copy query
                        <Copy className="w-3 h-3" />
                      </button>
                      {noteTarget && (
                        <Link
                          to={`/dashboard/notes?paper_id=${noteTarget}`}
                          className="text-emerald-200 hover:text-emerald-100 font-semibold inline-flex items-center gap-1"
                        >
                          Open notes
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                      {collectionNames.size > 0 && (
                        <span className="text-[10px] text-white/40">
                          In collections: {Array.from(collectionNames).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-white/50 hover:text-red-300 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && activeTab === "history" && filteredHistory.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-xs text-white/50">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-secondary rounded-xl px-3 py-2 text-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <button
              className="btn-secondary rounded-xl px-3 py-2 text-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {!loading && activeTab === "saved" && savedPapers.length === 0 && (
        <div className="text-center py-16 text-white/60">
          No saved papers yet.
        </div>
      )}

      {!loading && activeTab === "saved" && savedByQuery.length > 0 && (
        <div className="space-y-4">
          {savedByQuery.map(({ item, saved }, idx) => {
            const subject = getSubject(item);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <div className="text-xs text-white/50">Query</div>
                    <div className="text-sm font-semibold truncate">
                      {item.text || item.input_text || "Query"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      <Badge variant="accent">
                        <TrendingUp className="w-3 h-3" />
                        {subject}
                      </Badge>
                      <span className="text-xs text-white/40">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-white/50">
                    {saved.length} saved
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {saved.map((p, pIdx) => {
                    const noteId =
                      (p.title && savedLookup.get(normalize(p.title))?.id) ||
                      (p.url && savedLookup.get(normalize(p.url))?.id);
                    const noteList = noteId ? noteCache[noteId] || [] : [];
                    return (
                    <div
                      key={`${p.title}-${pIdx}`}
                      className="glass-soft rounded-xl p-4 border border-white/10"
                    >
                      <div className="text-xs text-white/50 font-semibold">
                        Saved paper {pIdx + 1}
                      </div>
                      <div className="mt-1 font-bold leading-snug">
                        {p.title || "Untitled paper"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {p.year && (
                          <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
                            {p.year}
                          </span>
                        )}
                        {p.source && (
                          <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
                            {p.source}
                          </span>
                        )}
                        {p.venue && (
                          <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
                            {p.venue}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 text-xs text-white/60">
                        {abstractText(p)}
                      </div>
                      {p.url && (
                        <div className="mt-3 text-xs text-emerald-200 break-all flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          {p.url}
                        </div>
                      )}
                      {noteId && (
                        <Link
                          to={`/dashboard/notes?paper_id=${noteId}`}
                          className="mt-3 text-xs text-emerald-200 inline-flex items-center gap-1"
                        >
                          Open notes
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                      {noteId && noteFlags[noteId] && (
                        <div className="mt-2 inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-200">
                          Notes
                        </div>
                      )}
                      {noteList.length > 0 && (
                        <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                          <div className="text-[10px] text-white/50 mb-1">Latest note</div>
                          {noteList[0].content.slice(0, 180)}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {!loading && activeTab === "saved" && ungroupedSaved.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <div className="text-xs text-white/50 uppercase tracking-[0.2em]">
            Saved Papers (Ungrouped)
          </div>
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            {ungroupedSaved.map((p, pIdx) => (
              <div
                key={`${p.title}-${pIdx}`}
                className="glass-soft rounded-xl p-4 border border-white/10"
              >
                <div className="text-xs text-white/50 font-semibold">
                  Saved paper {pIdx + 1}
                </div>
                <div className="mt-1 font-bold leading-snug">
                  {p.title || "Untitled paper"}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.year && (
                    <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      {p.year}
                    </span>
                  )}
                  {p.source && (
                    <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      {p.source}
                    </span>
                  )}
                  {p.venue && (
                    <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      {p.venue}
                    </span>
                  )}
                </div>
                <div className="mt-3 text-xs text-white/60">
                  {abstractText(p)}
                </div>
                {p.url && (
                  <div className="mt-3 text-xs text-emerald-200 break-all flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    {p.url}
                  </div>
                )}
                <Link
                  to={`/dashboard/notes?paper_id=${p.id}`}
                  className="mt-3 text-xs text-emerald-200 inline-flex items-center gap-1"
                >
                  Open notes
                  <ArrowRight className="w-3 h-3" />
                </Link>
                {noteFlags[p.id] && (
                  <div className="mt-2 inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-200">
                    Notes
                  </div>
                )}
                {noteCache[p.id]?.length ? (
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
                    <div className="text-[10px] text-white/50 mb-1">Latest note</div>
                    {noteCache[p.id][0].content.slice(0, 180)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && activeTab === "notes" && savedPapers.length === 0 && (
        <div className="text-center py-16 text-white/60">
          No saved papers yet.
        </div>
      )}

      {!loading && activeTab === "notes" && savedPapers.length > 0 && (
        <div className="space-y-4">
          {savedPapers
            .filter((p) => (noteCache[p.id]?.length || 0) > 0)
            .map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <div className="text-xs text-white/50">Paper</div>
                    <div className="text-sm font-semibold truncate">{p.title}</div>
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      {p.source && (
                        <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
                          {p.source}
                        </span>
                      )}
                      {p.year && (
                        <span className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
                          {p.year}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/dashboard/notes?paper_id=${p.id}`}
                    className="text-emerald-200 hover:text-emerald-100 text-xs inline-flex items-center gap-1"
                  >
                    Open notes
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {(noteCache[p.id] || []).slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      className="glass-soft rounded-xl p-4 border border-white/10 text-xs text-white/70"
                    >
                      <div className="text-[10px] text-white/50 mb-1">
                        {n.updated_at || n.created_at}
                      </div>
                      <div>{n.content.slice(0, 220)}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          {savedPapers.filter((p) => (noteCache[p.id]?.length || 0) > 0).length === 0 && (
            <div className="text-center py-16 text-white/60">
              No notes saved yet.
            </div>
          )}
        </div>
      )}

      {!loading && activeTab === "collections" && collections.length === 0 && (
        <div className="text-center py-16 text-white/60">
          No collections yet.
        </div>
      )}

      {!loading && activeTab === "collections" && collections.length > 0 && (
        <div className="space-y-4">
          {collections.map((c, idx) => {
            const paperIds = collectionItems[c.id] || [];
            const papers = savedPapers.filter((p) => paperIds.includes(p.id));
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <div className="text-xs text-white/50">Collection</div>
                    <div className="text-sm font-semibold truncate">{c.name}</div>
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      {(c.tags || []).map((t) => (
                        <span key={t} className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-white/50">{papers.length} papers</span>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {papers.slice(0, 4).map((p) => (
                    <div key={p.id} className="glass-soft rounded-xl p-4 border border-white/10">
                      <div className="text-sm font-semibold">{p.title}</div>
                      <div className="mt-2 text-xs text-white/50">
                        {p.source || "Unknown"} {p.year ? `• ${p.year}` : ""}
                      </div>
                      {p.abstract && (
                        <div className="mt-2 text-xs text-white/60 line-clamp-2">
                          {p.abstract}
                        </div>
                      )}
                      <Link
                        to={`/dashboard/notes?paper_id=${p.id}`}
                        className="mt-3 text-xs text-emerald-200 inline-flex items-center gap-1"
                      >
                        Open notes
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                  {papers.length === 0 && (
                    <div className="text-sm text-white/60">No papers in this collection.</div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* PAPERS MODAL */}
      <PapersModal
        open={!!openPapersFor}
        onClose={() => setOpenPapersFor(null)}
        subject={openPapersFor ? getSubject(openPapersFor) : ""}
        papers={openPapersFor?.papers || []}
        onSave={handleSavePaper}
      />
    </PageShell>
  );
}
