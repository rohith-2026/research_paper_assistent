import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import PageShell from "../../components/layout/PageShell";
import Loader from "../../components/ui/Loader";
import PaperMeta from "../../components/papers/PaperMeta";
import Badge from "../../components/ui/Badge";
import {
  apiGenerateSummary,
  apiListSummaries,
  SummaryItem,
  SummaryType,
} from "../../api/summaries.api";
import { apiHistory, HistoryItem, PaperItem, apiPapersByQuery, apiListSavedPapers, apiSavePaper, SavedPaper } from "../../api/assistant.api";
import { getErrorMessage } from "../../utils/errors";
import toast from "react-hot-toast";
import api from "../../api/axios";
import VoiceButton from "../../components/ui/VoiceButton";
import SpeakButton from "../../components/ui/SpeakButton";

const summaryModes: { label: string; value: SummaryType }[] = [
  { label: "Short", value: "short" },
  { label: "Detailed", value: "detailed" },
];

function formatDateTime(dateStr?: string) {
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
}

function formatDate(iso?: string) {
  if (!iso) return "--";
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--";
  }
}

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function highlightText(text: string, query: string) {
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
}

function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function clampText(text: string, max = 1800) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export default function PaperSummary() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<HistoryItem | null>(null);
  const [selectedPaperUid, setSelectedPaperUid] = useState<string | null>(null);
  const [summaryType, setSummaryType] = useState<SummaryType>("short");
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [summaryFilter, setSummaryFilter] = useState<SummaryType | "all">("all");
  const [summarySearch, setSummarySearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiHistory(100, 0);
        const items = res.items || [];
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
      try {
        const res = await apiListSavedPapers(200, 0);
        setSavedPapers(res || []);
      } catch {
        setSavedPapers([]);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!selectedQueryId) {
      setSelectedQuery(null);
      setSelectedPaperUid(null);
      return;
    }
    const query = history.find((h) => h.id === selectedQueryId) || null;
    setSelectedQuery(query);
    const first = query?.papers?.[0];
    setSelectedPaperUid(first?.paper_uid || null);
  }, [selectedQueryId, history]);

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

  const selectedPaper: PaperItem | null = useMemo(() => {
    if (!selectedPaperUid) return null;
    return papers.find((p) => p.paper_uid === selectedPaperUid) || null;
  }, [papers, selectedPaperUid]);

  const abstract = (selectedPaper?.abstract || "").trim();
  const abstractUnavailable = !abstract || abstract === "NOT_AVAILABLE";
  const titleFallback = (selectedPaper?.title || "").trim() || "Untitled paper";

  useEffect(() => {
    const run = async () => {
      if (!selectedQueryId || !selectedPaperUid) {
        setSummaries([]);
        return;
      }
      try {
        const res = await apiListSummaries(selectedQueryId, selectedPaperUid);
        const items = res.items || [];
        const seen = new Set<string>();
        const deduped = items.filter((s) => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        setSummaries(deduped);
      } catch {
        setSummaries([]);
      }
    };
    run();
  }, [selectedQueryId, selectedPaperUid]);

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

  const generate = async () => {
    if (!selectedQueryId || !selectedPaperUid) return;
    try {
      setSummaryLoading(true);
      setError(null);
      setCountdown(45);
      const startedAt = Date.now();
      const res = await apiGenerateSummary(
        selectedQueryId,
        selectedPaperUid,
        summaryType
      );
      setLatencyMs(Date.now() - startedAt);
      setSummaries((prev) => [res, ...prev.filter((p) => p.id !== res.id)]);
      toast.success("Summary generated");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to generate summary."));
    } finally {
      setSummaryLoading(false);
      setCountdown(null);
    }
  };

  const latestSummaryByType = useMemo(() => {
    const latest: Partial<Record<SummaryType, SummaryItem>> = {};
    for (const s of summaries) {
      if (!latest[s.summary_type]) {
        latest[s.summary_type] = s;
      }
    }
    return latest;
  }, [summaries]);

  const latestSummary = latestSummaryByType[summaryType] || summaries[0];
  const filteredSummaries = useMemo(() => {
    const q = summarySearch.trim().toLowerCase();
    return summaries.filter((s) => {
      if (summaryFilter !== "all" && s.summary_type !== summaryFilter) return false;
      if (!q) return true;
      return (s.content || "").toLowerCase().includes(q);
    });
  }, [summaries, summaryFilter, summarySearch]);
  const queryText = selectedQuery?.text || selectedQuery?.input_text || "";
  const inputTypeLabel =
    selectedQuery?.input_type === "file" ? "File upload" : "Text query";

  const savedLookup = useMemo(() => {
    const map = new Map<string, SavedPaper>();
    for (const p of savedPapers) {
      if (p.title) map.set(normalize(p.title), p);
      if (p.url) map.set(normalize(p.url), p);
    }
    return map;
  }, [savedPapers]);

  const ensureSavedPaper = async () => {
    if (!selectedPaper) return null;
    const key = normalize(selectedPaper.title) || normalize(selectedPaper.url || "");
    const existing =
      (selectedPaper.title && savedLookup.get(normalize(selectedPaper.title))) ||
      (selectedPaper.url && savedLookup.get(normalize(selectedPaper.url || "")));
    if (existing) return existing;
    try {
      const saved = await apiSavePaper({
        ...selectedPaper,
        subject_area: selectedQuery?.subject_area,
      });
      setSavedPapers((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        if (exists) return prev;
        return [saved, ...prev];
      });
      return saved;
    } catch {
      return null;
    }
  };

  const saveSummaryAsNote = async (which: "latest" | "short" | "detailed") => {
    const picked =
      which === "latest"
        ? latestSummary
        : which === "short"
        ? latestSummaryByType.short
        : latestSummaryByType.detailed;
    if (!picked?.content || !selectedPaper) return;
    const savedPaper = await ensureSavedPaper();
    if (!savedPaper) {
      toast.error("Save paper first to attach notes.");
      return;
    }
    try {
      const header = [
        `# Summary (${picked.summary_type})`,
        selectedPaper.title ? `**Paper:** ${selectedPaper.title}` : "",
        selectedQuery?.subject_area ? `**Subject:** ${selectedQuery.subject_area}` : "",
        selectedQuery?.text || selectedQuery?.input_text
          ? `**Query:** ${selectedQuery?.text || selectedQuery?.input_text}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      const content = `${header}\n\n${picked.content}`;
      await api.post("/notes", { paper_id: savedPaper.id, content });
      try {
        window.dispatchEvent(
          new CustomEvent("notes-updated", { detail: { paper_id: savedPaper.id } })
        );
      } catch {
        /* ignore */
      }
      toast.success("Summary saved to notes");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to save note"));
    }
  };

  useEffect(() => {
    if (!summaryLoading) return;
    if (countdown === null) return;
    const id = window.setInterval(() => {
      setCountdown((c) => {
        if (c === null) return c;
        if (c <= 1) return 0;
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [summaryLoading, countdown]);

  useEffect(() => {
    if (!summaries.length) return;
    const latestForType = summaries.find((s) => s.summary_type === summaryType);
    if (latestForType) {
      setLatencyMs(null);
    }
  }, [summaryType, summaries]);

  return (
    <PageShell
      title="Paper Summary"
      subtitle="Select a query and paper, then generate a summary"
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
              Subject: {selectedQuery.subject_area || "Unknown"} -{" "}
              {formatDateTime(selectedQuery.created_at)}
            </div>
          </>
        )}

        {error && <div className="mt-4 text-xs text-red-300">{error}</div>}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <PaperMeta label="Query Type" value={selectedQuery ? inputTypeLabel : "--"} />
        <PaperMeta label="Query Time" value={formatDateTime(selectedQuery?.created_at)} />
        <PaperMeta label="Results" value={`${papers.length || 0} papers`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
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
                  key={`${p.paper_uid || "paper"}-${idx}`}
                  onClick={() => setSelectedPaperUid(p.paper_uid || null)}
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

        <div className="glass rounded-2xl p-6 border border-white/10 space-y-6">
          {!selectedPaper && (
            <div className="text-sm text-white/60">Select a paper to view details.</div>
          )}

          {selectedPaper && (
            <>
              <div>
                <div className="text-xs text-white/50">Paper Detail</div>
                <h3 className="mt-2 text-2xl font-extrabold leading-snug">
                  {selectedPaper.title || "Untitled paper"}
                </h3>
                <div className="mt-2 text-xs text-white/50">
                  {selectedPaper.year ? `${selectedPaper.year} - ` : ""}
                  {selectedPaper.venue || "Unknown venue"} -{" "}
                  {selectedPaper.source || "Unknown source"}
                </div>
              </div>

              <div>
                <div className="text-xs text-white/50">Abstract</div>
                <div className="mt-3 max-h-64 overflow-y-auto text-sm text-white/80 leading-relaxed scrollbar-custom">
                  {abstractUnavailable
                    ? "Abstract not available. Summary will use the paper title."
                    : abstract}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                  <span className="px-2 py-1 rounded-full border border-white/10">
                    Words: {abstractUnavailable ? 0 : countWords(abstract)}
                  </span>
                  <span className="px-2 py-1 rounded-full border border-white/10">
                    Characters: {abstractUnavailable ? 0 : abstract.length}
                  </span>
                  <button
                    className="btn-secondary rounded-xl px-3 py-1.5 text-xs"
                  disabled={abstractUnavailable}
                  onClick={async () => {
                    if (abstractUnavailable) return;
                    try {
                      await navigator.clipboard.writeText(abstract);
                        toast.success("Abstract copied");
                      } catch {
                        toast.error("Failed to copy abstract");
                      }
                    }}
                  >
                    Copy abstract
                  </button>
                  <SpeakButton text={abstract} />
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {summaryModes.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setSummaryType(m.value)}
                    className={`px-4 py-2 rounded-xl text-sm border ${
                      summaryType === m.value
                        ? "bg-emerald-400/15 border-emerald-300/30 text-emerald-100"
                        : "bg-white/5 border-white/10 text-white/70"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
                <button
                  className="btn-secondary px-4 py-2 rounded-xl"
                  onClick={generate}
                  disabled={summaryLoading || !selectedPaperUid}
                >
                  <RefreshCw className="w-4 h-4" />
                  {summaryLoading ? "Generating..." : "Generate Summary"}
                </button>
              </div>

              {summaryLoading && (
                <div className="text-xs text-white/50">
                  Local model is running. Please wait{" "}
                  {typeof countdown === "number" ? `(~${countdown}s)` : ""}.
                </div>
              )}

              <div className="rounded-2xl bg-black/30 border border-white/10 p-5">
                <div className="text-xs text-white/50">Summary Output</div>
                <div className="mt-3 max-h-72 overflow-y-auto scrollbar-custom">
                  {summaryLoading ? (
                    <Loader size="md" text="Generating summary. Please wait..." />
                  ) : latestSummary?.content ? (
                    <div className="text-sm text-white/80 leading-relaxed">
                      {latestSummary.content}
                    </div>
                  ) : (
                    <div className="text-sm text-white/60">
                      Click "Generate Summary" to create one.
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                  <span className="px-2 py-1 rounded-full border border-white/10">
                    Latest: {latestSummary ? formatDate(latestSummary.created_at) : "--"}
                  </span>
                  <span className="px-2 py-1 rounded-full border border-white/10">
                    Type: {latestSummary ? latestSummary.summary_type : "--"}
                  </span>
                  <span className="px-2 py-1 rounded-full border border-white/10">
                    Words: {latestSummary ? countWords(latestSummary.content) : 0}
                  </span>
                  <span className="px-2 py-1 rounded-full border border-white/10">
                    Latency: {latencyMs !== null ? `${Math.round(latencyMs / 1000)}s` : "--"}
                  </span>
                  <button
                    className="btn-secondary rounded-xl px-3 py-1.5 text-xs"
                    disabled={!latestSummary?.content}
                    onClick={async () => {
                      if (!latestSummary?.content) return;
                      try {
                        await navigator.clipboard.writeText(latestSummary.content);
                        toast.success("Summary copied");
                      } catch {
                        toast.error("Failed to copy summary");
                      }
                    }}
                  >
                    Copy summary
                  </button>
                  <SpeakButton text={latestSummary?.content || ""} />
                  <button
                    className="btn-secondary rounded-xl px-3 py-1.5 text-xs"
                    disabled={!latestSummary?.content}
                    onClick={() => {
                      if (!latestSummary?.content) return;
                      const blob = new Blob([latestSummary.content], {
                        type: "text/plain;charset=utf-8",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `summary-${selectedPaperUid || "paper"}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export txt
                  </button>
                  <div className="inline-flex items-center gap-2">
                    <select
                      id="save-summary-mode"
                      className="input-field text-[11px] max-w-[140px]"
                      defaultValue="latest"
                    >
                      <option value="latest">Save latest</option>
                      <option value="short">Save short</option>
                      <option value="detailed">Save detailed</option>
                    </select>
                    <button
                      className="btn-secondary rounded-xl px-3 py-1.5 text-xs"
                      disabled={
                        !latestSummary?.content &&
                        !latestSummaryByType.short?.content &&
                        !latestSummaryByType.detailed?.content
                      }
                      onClick={() => {
                        const selectEl = document.querySelector(
                          "#save-summary-mode"
                        ) as HTMLSelectElement | null;
                        const mode = (selectEl?.value || "latest") as
                          | "latest"
                          | "short"
                          | "detailed";
                        saveSummaryAsNote(mode);
                      }}
                    >
                      Save to notes
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 border border-white/10 p-5">
                <div className="text-xs text-white/50 mb-3">Compare Short vs Detailed</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[11px] text-white/50 mb-2">Short</div>
                    <div className="text-xs text-white/80 leading-relaxed max-h-56 overflow-y-auto scrollbar-custom">
                      {latestSummaryByType.short?.content || "Generate a short summary to compare."}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[11px] text-white/50 mb-2">Detailed</div>
                    <div className="text-xs text-white/80 leading-relaxed max-h-56 overflow-y-auto scrollbar-custom">
                      {latestSummaryByType.detailed?.content || "Generate a detailed summary to compare."}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 border border-white/10 p-5">
                <div className="text-xs text-white/50 mb-3">
                  Previously Generated Summaries
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <select
                    className="input-field text-xs max-w-[160px]"
                    value={summaryFilter}
                    onChange={(e) =>
                      setSummaryFilter(e.target.value as SummaryType | "all")
                    }
                  >
                    <option value="all">All types</option>
                    <option value="short">Short</option>
                    <option value="detailed">Detailed</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      className="input-field text-xs max-w-[260px]"
                      placeholder="Search summaries..."
                      value={summarySearch}
                      onChange={(e) => setSummarySearch(e.target.value)}
                    />
                    <VoiceButton value={summarySearch} onChange={setSummarySearch} />
                  </div>
                </div>
                {summaries.length === 0 && !summaryLoading && (
                  <div className="text-xs text-white/60">
                    No summaries available yet.
                  </div>
                )}
                <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-custom">
                  {filteredSummaries.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="text-[11px] text-white/50">
                        {s.summary_type.toUpperCase()} - {formatDate(s.created_at)}
                      </div>
                      <div className="mt-2 text-xs text-white/80 leading-relaxed">
                        {clampText(s.content)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 border border-white/10 p-5">
                <div className="text-xs text-white/50 mb-3">Suggestions</div>
                <ul className="text-xs text-white/70 space-y-2">
                  <li>Try both summary types to compare depth and clarity.</li>
                  <li>If the abstract is short, use Short for accuracy.</li>
                  <li>If the abstract is dense, use Detailed for more context.</li>
                  <li>Re-generate after switching the summary type.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

    </PageShell>
  );
}
