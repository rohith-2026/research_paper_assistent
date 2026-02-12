import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import PaperMeta from "../../components/papers/PaperMeta";
import Badge from "../../components/ui/Badge";
import {
  apiHistory,
  apiHistoryById,
  apiPaperDetail,
  apiPapersByQuery,
  HistoryItem,
  PaperItem,
} from "../../api/assistant.api";
import { getErrorMessage } from "../../utils/errors";
import VoiceButton from "../../components/ui/VoiceButton";

export default function PaperDetail() {
  const [params] = useSearchParams();
  const historyId = params.get("history_id");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(historyId);
  const [selectedQuery, setSelectedQuery] = useState<HistoryItem | null>(null);
  const [selectedPaperUid, setSelectedPaperUid] = useState<string | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<PaperItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [paperLoading, setPaperLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [splitView, setSplitView] = useState(true);
  const [showFullAbstract, setShowFullAbstract] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (historyId) setSelectedQueryId(historyId);
  }, [historyId]);

  const formatDateTime = (dateStr?: string) => {
    try {
      if (!dateStr) return "--";
      return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "--";
    }
  };

  const normalize = (value?: string | null) =>
    (value || "").trim().toLowerCase();

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "ig"));
    return parts.map((part, idx) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={`${part}-${idx}`} className="bg-emerald-400/20 text-emerald-100 rounded px-1">
          {part}
        </mark>
      ) : (
        <span key={`${part}-${idx}`}>{part}</span>
      )
    );
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const hRes = await apiHistory(100, 0);
        const items = hRes.items || [];
        setHistory(items);
        if (!selectedQueryId && items.length) {
          setSelectedQueryId(items[0].id);
        }
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load query history."));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!selectedQueryId) {
        setSelectedQuery(null);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const query = await apiHistoryById(selectedQueryId);
        setSelectedQuery(query);
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load query details."));
        setSelectedQuery(null);
      } finally {
        setLoading(false);
      }
    };
    run();
    setSelectedPaperUid(null);
    setSelectedPaper(null);
  }, [selectedQueryId]);

  useEffect(() => {
    const run = async () => {
      if (!selectedQueryId) return;
      try {
        await apiPapersByQuery(selectedQueryId, 10);
      } catch {
        // ignore
      }
    };
    run();
  }, [selectedQueryId]);

  const papers = useMemo(() => {
    const list = selectedQuery?.papers || [];
    return list.slice(0, 10);
  }, [selectedQuery]);

  const filteredPapers = useMemo(() => {
    if (!searchTerm.trim()) return papers;
    const q = normalize(searchTerm);
    return papers.filter((p) => {
      const haystack = [
        p.title,
        p.venue,
        p.source,
        (p.authors || []).join(" "),
        p.abstract,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [papers, searchTerm]);

  useEffect(() => {
    if (!papers.length) {
      setSelectedPaperUid(null);
      setSelectedPaper(null);
      return;
    }
    if (!selectedPaperUid && papers[0]?.paper_uid) {
      setSelectedPaperUid(papers[0].paper_uid || null);
      setSelectedPaper(papers[0]);
    }
  }, [papers, selectedPaperUid]);

  const selectByIndex = (idx: number) => {
    if (!filteredPapers.length) return;
    const clamped = Math.max(0, Math.min(filteredPapers.length - 1, idx));
    const p = filteredPapers[clamped];
    if (p) handleSelectPaper(p);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (!filteredPapers.length) return;
      const currentIdx = filteredPapers.findIndex(
        (p) => p.paper_uid && p.paper_uid === selectedPaperUid
      );
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectByIndex(currentIdx + 1);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        selectByIndex(currentIdx - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filteredPapers, selectedPaperUid]);

  const handleSelectPaper = async (paper: PaperItem) => {
    if (!selectedQueryId || !paper.paper_uid) {
      setSelectedPaper(paper);
      setSelectedPaperUid(null);
      return;
    }
    try {
      setPaperLoading(true);
      setError(null);
      const detail = await apiPaperDetail(selectedQueryId, paper.paper_uid);
      setSelectedPaper(detail);
      setSelectedPaperUid(paper.paper_uid);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load paper details."));
      setSelectedPaper(null);
    } finally {
      setPaperLoading(false);
    }
  };

  const queryText = selectedQuery?.text || selectedQuery?.input_text || "";
  const inputTypeLabel =
    selectedQuery?.input_type === "file" ? "File upload" : "Text query";

  const handleCopy = async (value: string | undefined, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setActionMessage(`${label} copied`);
      setTimeout(() => setActionMessage(null), 2000);
    } catch {
      setActionMessage(`Failed to copy ${label.toLowerCase()}`);
      setTimeout(() => setActionMessage(null), 2000);
    }
  };

  return (
    <PageShell
      title="Paper Detail"
      subtitle="Select a query, then choose a paper to view details"
    >
      <div className="glass rounded-2xl p-6 border border-white/10">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs text-white/50">Select query</label>
            <select
              className="input-field mt-2"
              value={selectedQueryId || ""}
              onChange={(e) => setSelectedQueryId(e.target.value)}
              disabled={loading}
            >
              {history.length === 0 && <option value="">No queries found</option>}
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {`${formatDateTime(h.created_at)} - ${
                    h.input_type === "file" ? "File" : "Text"
                  } - ${
                    h.subject_area || h.predicted_topics?.[0]?.label || "Unknown"
                  } - ${h.text || h.input_text || "Query"}`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`btn-secondary rounded-xl px-3 py-2 text-xs ${
                splitView ? "shadow-glow" : ""
              }`}
              onClick={() => setSplitView((v) => !v)}
            >
              {splitView ? "Split view" : "List view"}
            </button>
          </div>
        </div>

        {loading && (
          <div className="mt-4 text-sm text-white/60">Loading queries...</div>
        )}

        {!loading && !selectedQuery && (
          <div className="mt-4 text-sm text-white/60">
            No query selected. Run a query to see papers here.
          </div>
        )}

        {selectedQuery && (
          <>
            <div className="mt-6 text-xs text-white/50">Selected query</div>
            <h2 className="mt-2 text-xl font-extrabold leading-snug">
              {queryText || "Untitled query"}
            </h2>
            <div className="mt-2 text-xs text-white/50">
              Subject: {selectedQuery.subject_area || "Unknown"} - {" "}
              {formatDateTime(selectedQuery.created_at)}
            </div>
          </>
        )}

        {actionMessage && (
          <div className="mt-3 text-xs text-emerald-200">{actionMessage}</div>
        )}
        {error && <div className="mt-4 text-xs text-red-300">{error}</div>}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <PaperMeta label="Query Type" value={selectedQuery ? inputTypeLabel : "--"} />
        <PaperMeta label="Query Time" value={formatDateTime(selectedQuery?.created_at)} />
        <PaperMeta label="Results" value={`${papers.length || 0} papers`} />
      </div>

      <div
        className={`mt-6 grid gap-4 ${
          splitView ? "lg:grid-cols-[1.1fr_1.4fr]" : "lg:grid-cols-1"
        }`}
      >
        <div className="glass rounded-2xl p-4 border border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-white/50 uppercase tracking-[0.2em]">
              Papers (Top 10)
            </div>
            <div className="flex items-center gap-2">
              <input
                className="input-field text-xs max-w-[260px]"
                placeholder="Search within these papers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <VoiceButton value={searchTerm} onChange={setSearchTerm} />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {filteredPapers.length === 0 && (
              <div className="text-sm text-white/60">No papers found.</div>
            )}
            {filteredPapers.map((p, idx) => {
              const active = p.paper_uid && p.paper_uid === selectedPaperUid;
              return (
                <button
                  key={`${p.title}-${idx}`}
                  onClick={() => handleSelectPaper(p)}
                  className={`w-full text-left glass-soft rounded-xl p-4 border ${
                    active
                      ? "border-emerald-300/30 bg-emerald-400/10"
                      : "border-white/10"
                  } hover:border-white/20`}
                >
                  <div className="text-xs text-white/50 font-semibold">
                    Paper {idx + 1}
                  </div>
                  <div className="mt-1 text-sm font-bold leading-snug">
                    {p.title ? highlightText(p.title, searchTerm) : "Untitled paper"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.source && <Badge variant="accent">{p.source}</Badge>}
                    {p.year && <Badge>{p.year}</Badge>}
                    {p.venue && <Badge>{p.venue}</Badge>}
                  </div>
                  <div className="mt-2 text-xs text-white/60 line-clamp-2">
                    {p.abstract === "NOT_AVAILABLE"
                      ? "Abstract not available from the source."
                      : (p.abstract && highlightText(p.abstract, searchTerm)) ||
                        "Abstract not available from the source."}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-2xl p-6 border border-white/10">
          {!selectedPaper && (
            <div className="text-sm text-white/60">
              {paperLoading ? "Loading paper..." : "Select a paper to view details."}
            </div>
          )}
          {selectedPaper && (
            <>
              <div className="text-xs text-white/50">Paper Detail</div>
              <h3 className="mt-2 text-2xl font-extrabold leading-snug">
                {selectedPaper.title || "Untitled paper"}
              </h3>
              <div className="mt-2 text-xs text-white/50">
                {selectedPaper.year ? `${selectedPaper.year} - ` : ""}
                {selectedPaper.venue || "Unknown venue"}
              </div>

              <div className="mt-4 text-sm text-white/70">
                <span className="text-white/80 font-semibold">Authors:</span>{" "}
                {selectedPaper.authors?.length
                  ? selectedPaper.authors.join(", ")
                  : "--"}
              </div>
              <div className="mt-2 text-sm text-white/70">
                <span className="text-white/80 font-semibold">Source:</span>{" "}
                {selectedPaper.source || "--"}
              </div>
              <div className="mt-2 text-sm text-white/70">
                <span className="text-white/80 font-semibold">URL:</span>{" "}
                {selectedPaper.url || "--"}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="btn-secondary rounded-xl px-3 py-2 text-xs"
                  onClick={() => handleCopy(selectedPaper.title, "Title")}
                >
                  Copy title
                </button>
                <button
                  className="btn-secondary rounded-xl px-3 py-2 text-xs"
                  onClick={() => handleCopy(selectedPaper.url, "URL")}
                  disabled={!selectedPaper.url}
                >
                  Copy URL
                </button>
                <button
                  className="btn-secondary rounded-xl px-3 py-2 text-xs"
                  onClick={() => setShowFullAbstract((v) => !v)}
                >
                  {showFullAbstract ? "Compact abstract" : "Full abstract"}
                </button>
              </div>

              <div className="mt-6">
                <div className="text-xs text-white/50">Abstract</div>
                <div
                  className={`mt-3 overflow-y-auto text-sm text-white/70 leading-relaxed scrollbar-custom ${
                    showFullAbstract ? "max-h-96" : "max-h-64"
                  }`}
                >
                  {selectedPaper.abstract === "NOT_AVAILABLE"
                    ? "Abstract not available from the source."
                    : selectedPaper.abstract || "Abstract not available from the source."}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

    </PageShell>
  );
}
