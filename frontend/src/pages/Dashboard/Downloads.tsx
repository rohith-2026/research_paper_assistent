import { useEffect, useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import { Download, FileText, Database, FileSpreadsheet } from "lucide-react";
import { apiListDownloads, apiRecordDownload, DownloadItem } from "../../api/downloads.api";
import { getErrorMessage } from "../../utils/errors";
import { toIstIsoString } from "../../utils/time";
import { apiListSavedPapers, apiHistory, apiSavePaper, SavedPaper, HistoryItem, PaperItem } from "../../api/assistant.api";
import { apiListSummaries } from "../../api/summaries.api";
import api from "../../api/axios";
import toast from "react-hot-toast";
import { apiListCollections, apiListCollectionItems } from "../../api/collections.api";

export default function Downloads() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [papers, setPapers] = useState<SavedPaper[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [tab, setTab] = useState<"saved" | "query">("saved");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<string>("");
  const [querySelectedPaper, setQuerySelectedPaper] = useState<PaperItem | null>(null);
  const [filter, setFilter] = useState<
    "all" | "pdf" | "bibtex" | "csv" | "json" | "notes" | "summary"
  >("all");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await apiListDownloads();
        setDownloads(res || []);
        const saved = await apiListSavedPapers(50, 0);
        setPapers(saved || []);
        if (saved.length) setSelected(saved[0].id);
        const hist = await apiHistory(50, 0);
        setHistory(hist.items || []);
        if (hist.items?.length) setSelectedQuery(hist.items[0].id);
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load downloads."));
      }
    };
    run();
  }, []);

  const record = async (
    format: "pdf" | "bibtex" | "csv" | "json" | "notes" | "summary"
  ) => {
    if (!selected) {
      setError("Select a saved paper first.");
      return;
    }
    try {
      const res = await apiRecordDownload(selected, format);
      setDownloads((prev) => [res, ...prev]);
      toast.success("Download recorded");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to record download."));
    }
  };

  const recordWithId = async (
    paperId: string,
    format: "pdf" | "bibtex" | "csv" | "json" | "notes" | "summary"
  ) => {
    try {
      const res = await apiRecordDownload(paperId, format);
      setDownloads((prev) => [res, ...prev]);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to record download."));
    }
  };

  const ensureSavedForDownload = async (paper: PaperItem) => {
    if (tab === "saved" && selected) return selected;
    const exists = papers.find((x) => x.title === paper.title);
    if (exists) {
      setSelected(exists.id);
      setTab("saved");
      return exists.id;
    }
    try {
      const savedPaper = await apiSavePaper({
        ...paper,
        subject_area: history.find((h) => h.id === selectedQuery)?.subject_area,
      });
      setPapers((prev) => [savedPaper, ...prev]);
      setSelected(savedPaper.id);
      setTab("saved");
      return savedPaper.id;
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to save paper"));
      return null;
    }
  };

  const selectedPaper = useMemo(() => papers.find((p) => p.id === selected), [papers, selected]);
  const queryPapers = useMemo(() => {
    const q = history.find((h) => h.id === selectedQuery);
    return q?.papers || [];
  }, [history, selectedQuery]);
  const effectivePaper = tab === "query" ? querySelectedPaper : selectedPaper;
  const canExport = !!effectivePaper;

  const filteredDownloads = useMemo(() => {
    if (filter === "all") return downloads;
    return downloads.filter((d) => d.format === filter);
  }, [downloads, filter]);

  const downloadText = (filename: string, content: string, type = "text/plain") => {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (!effectivePaper) return;
    const savedId = await ensureSavedForDownload(effectivePaper);
    const content = `
      <html>
        <head>
          <title>Paper Export</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 8px; }
            .meta { color: #475569; font-size: 12px; margin-bottom: 16px; }
            .section { margin-top: 16px; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1>${effectivePaper.title || "Untitled"}</h1>
          <div class="meta">Year: ${effectivePaper.year || ""} â€¢ Source: ${effectivePaper.source || ""}</div>
          <div class="section">Abstract</div>
          <div>${(effectivePaper.abstract || "N/A").replace(/\n/g, "<br/>")}</div>
        </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(content);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 300);
    }
    if (savedId) await recordWithId(savedId, "pdf");
  };

  const exportBibtex = async () => {
    if (!effectivePaper) return;
    const savedId = await ensureSavedForDownload(effectivePaper);
    const year = effectivePaper.year || "YYYY";
    const title = effectivePaper.title || "Untitled";
    const authors = (effectivePaper.authors || []).join(" and ");
    const venue = effectivePaper.venue || "Unknown";
    const key = title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "paper";
    const bib = `@article{${key}${year},\n  title={${title}},\n  author={${authors}},\n  journal={${venue}},\n  year={${year}}\n}`;
    downloadText(`paper-${key}${year}.bib`, bib, "text/plain");
    if (savedId) await recordWithId(savedId, "bibtex");
  };

  const exportCsv = async () => {
    if (!effectivePaper) return;
    const savedId = await ensureSavedForDownload(effectivePaper);
    const row = [
      savedId || (effectivePaper as any).paper_uid || "",
      `"${effectivePaper.title}"`,
      effectivePaper.year || "",
      effectivePaper.source || "",
      effectivePaper.url || "",
    ].join(",");
    const key = savedId || (effectivePaper as any).paper_uid || "paper";
    downloadText(`paper-${key}.csv`, `id,title,year,source,url\n${row}`, "text/csv");
    if (savedId) await recordWithId(savedId, "csv");
  };

  const exportNotes = async () => {
    if (!effectivePaper) return;
    const savedId = await ensureSavedForDownload(effectivePaper);
    if (!savedId) {
      setError("Failed to save paper for notes export.");
      return;
    }
    try {
      const res = await api.get(`/notes/paper/${savedId}`);
      const notes = res.data || [];
      const text = notes
        .map((n: { content: string }, i: number) => `# Note ${i + 1}\n\n${n.content}\n`)
        .join("\n");
      downloadText(`notes-${savedId}.md`, text, "text/markdown");
      await recordWithId(savedId, "notes");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to export notes."));
    }
  };

  const exportSummary = async () => {
    if (!effectivePaper) return;
    const savedId = await ensureSavedForDownload(effectivePaper);
    if (!savedId) {
      setError("Failed to save paper for summary export.");
      return;
    }
    try {
      const queryId = (effectivePaper as { query_id?: string }).query_id;
      const paperUid = (effectivePaper as { paper_uid?: string }).paper_uid;
      if (!queryId || !paperUid) {
        setError("No query/paper info for this saved paper.");
        return;
      }
      const res = await apiListSummaries(queryId, paperUid);
      const latest = res.items?.[0];
      if (!latest?.content) {
        setError("No summary available for this paper.");
        return;
      }
      downloadText(`summary-${paperUid}.txt`, latest.content, "text/plain");
      await recordWithId(savedId, "summary");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to export summary."));
    }
  };

  const exportJson = async () => {
    if (!effectivePaper) return;
    const savedId = await ensureSavedForDownload(effectivePaper);
    const payload = { paper: effectivePaper, exported_at: toIstIsoString() };
    const key = savedId || (effectivePaper as any).paper_uid || "paper";
    downloadText(`paper-${key}.json`, JSON.stringify(payload, null, 2), "application/json");
    if (savedId) await recordWithId(savedId, "json");
  };

  const exportAll = async () => {
    if (!papers.length) return;
    const rows = papers.map((p) => [
      p.id,
      `"${p.title}"`,
      p.year || "",
      p.source || "",
      p.url || "",
    ].join(","));
    downloadText("papers.csv", ["id,title,year,source,url", ...rows].join("\n"), "text/csv");
    toast.success("Exported saved papers");
  };

  const exportAllJson = () => {
    if (!papers.length) return;
    const payload = { exported_at: toIstIsoString(), papers };
    downloadText("papers.json", JSON.stringify(payload, null, 2), "application/json");
    toast.success("Exported JSON");
  };

  const exportAllBibtex = () => {
    if (!papers.length) return;
    const bib = papers
      .map((p) => {
        const year = p.year || "YYYY";
        const title = p.title || "Untitled";
        const authors = (p.authors || []).join(" and ");
        const venue = p.venue || "Unknown";
        const key = title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "paper";
        return `@article{${key}${year},\n  title={${title}},\n  author={${authors}},\n  journal={${venue}},\n  year={${year}}\n}`;
      })
      .join("\n\n");
    downloadText("papers.bib", bib, "text/plain");
    toast.success("Exported BibTeX");
  };

  const exportAllNotesSummaries = async () => {
    if (!papers.length) return;
    try {
      const chunks: string[] = [];
      for (const p of papers) {
        chunks.push(`# ${p.title || "Untitled"}\n`);
        chunks.push(`Source: ${p.source || "Unknown"}  Year: ${p.year || ""}\n`);
        chunks.push(`URL: ${p.url || ""}\n`);
        if (p.abstract) chunks.push(`\nAbstract:\n${p.abstract}\n`);
        const notesRes = await api.get(`/notes/paper/${p.id}`);
        const notes = notesRes.data || [];
        if (notes.length) {
          chunks.push(`\nNotes:\n`);
          notes.forEach((n: { content: string }, i: number) => {
            chunks.push(`- Note ${i + 1}:\n${n.content}\n`);
          });
        }
        const queryId = (p as { query_id?: string }).query_id;
        const paperUid = (p as { paper_uid?: string }).paper_uid;
        if (queryId && paperUid) {
          const sumRes = await apiListSummaries(queryId, paperUid);
          const sums = sumRes.items || [];
          if (sums.length) {
            chunks.push(`\nSummaries:\n`);
            sums.forEach((s) => {
              chunks.push(`- ${s.summary_type.toUpperCase()} (${s.created_at}):\n${s.content}\n`);
            });
          }
        }
        chunks.push("\n---\n\n");
      }
      downloadText("papers_notes_summaries.md", chunks.join(""), "text/markdown");
      toast.success("Exported notes + summaries");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to export notes/summaries."));
    }
  };

  const exportAllNotes = async () => {
    if (!papers.length) return;
    try {
      const chunks: string[] = [];
      for (const p of papers) {
        chunks.push(`# ${p.title || "Untitled"}\n`);
        const notesRes = await api.get(`/notes/paper/${p.id}`);
        const notes = notesRes.data || [];
        if (!notes.length) continue;
        notes.forEach((n: { content: string }, i: number) => {
          chunks.push(`- Note ${i + 1}:\n${n.content}\n`);
        });
        chunks.push("\n---\n\n");
      }
      downloadText("all_notes.md", chunks.join(""), "text/markdown");
      toast.success("Exported all notes");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to export all notes."));
    }
  };

  const exportCollections = async () => {
    try {
      const collections = await apiListCollections();
      const items = await Promise.all(
        collections.map(async (c) => {
          const rows = await apiListCollectionItems(c.id);
          return { id: c.id, name: c.name, tags: c.tags || [], items: rows };
        })
      );
      const payload = {
        exported_at: toIstIsoString(),
        collections: items,
      };
      downloadText("collections.json", JSON.stringify(payload, null, 2), "application/json");
      toast.success("Exported collections");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to export collections."));
    }
  };

  return (
    <PageShell title="Downloads" subtitle="Export PDFs, BibTeX, and CSV">
      <div className="glass rounded-2xl p-5 border border-white/10">
        <div className="mb-4 flex items-center gap-2">
          <button
            className={`btn-secondary rounded-full px-3 py-1 text-xs ${tab === "saved" ? "shadow-glow" : ""}`}
            onClick={() => setTab("saved")}
          >
            Saved Papers
          </button>
          <button
            className={`btn-secondary rounded-full px-3 py-1 text-xs ${tab === "query" ? "shadow-glow" : ""}`}
            onClick={() => setTab("query")}
          >
            Query Papers
          </button>
        </div>

        {tab === "saved" && (
          <div className="mb-4">
            <div className="text-xs text-white/50">Saved Papers</div>
            <div className="mt-3 grid md:grid-cols-2 gap-3">
              {papers.map((p) => (
                <button
                  key={p.id}
                  className={`glass-soft rounded-xl p-4 border text-left ${
                    selected === p.id ? "border-emerald-300/30 bg-emerald-400/10" : "border-white/10"
                  }`}
                  onClick={() => setSelected(p.id)}
                >
                  <div className="text-sm font-semibold">{p.title}</div>
                  <div className="mt-2 text-xs text-white/50">
                    {p.source || "Unknown"} {p.year ? `â€¢ ${p.year}` : ""}
                  </div>
                </button>
              ))}
              {papers.length === 0 && (
                <div className="text-sm text-white/60">No saved papers</div>
              )}
            </div>
          </div>
        )}

        {tab === "query" && (
          <div className="mb-4 space-y-3">
            <label className="text-xs text-white/50">Query</label>
            <select
              className="input-field mt-2"
              value={selectedQuery}
              onChange={(e) => setSelectedQuery(e.target.value)}
            >
              {history.length === 0 && <option value="">No queries</option>}
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.text || h.input_text || h.subject_area || "Query"}
                </option>
              ))}
            </select>
            <div className="text-xs text-white/60">Papers in query</div>
            {!querySelectedPaper && (
              <div className="text-xs text-white/50">Select a paper below to enable downloads.</div>
            )}
            <div className="grid md:grid-cols-2 gap-3">
              {queryPapers.map((p, idx) => (
                <button
                  key={`${(p as any).paper_uid || "paper"}-${idx}`}
                  className={`glass-soft rounded-xl p-4 border text-left ${
                    (querySelectedPaper as any)?.paper_uid === (p as any).paper_uid
                      ? "border-emerald-300/30 bg-emerald-400/10"
                      : "border-white/10"
                  }`}
                  onClick={() => setQuerySelectedPaper(p)}
                >
                  <div className="text-sm font-semibold">{p.title}</div>
                  <div className="mt-2 text-xs text-white/50">
                    {p.source || "Unknown"} {p.year ? `â€¢ ${p.year}` : ""}
                  </div>
                  <div className="mt-3 text-[11px] text-white/50">
                    Click to select
                  </div>
                </button>
              ))}
              {queryPapers.length === 0 && (
                <div className="text-sm text-white/60">No query papers found.</div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            className="glass-soft rounded-xl p-4 text-left border border-white/10 hover:border-white/20 disabled:opacity-60"
            onClick={exportPdf}
            disabled={!canExport}
          >
            <FileText className="w-4 h-4 text-emerald-200" />
            <div className="mt-2 text-sm font-semibold">Export PDF</div>
            <div className="text-xs text-white/50">Summary bundle</div>
          </button>
          <button
            className="glass-soft rounded-xl p-4 text-left border border-white/10 hover:border-white/20 disabled:opacity-60"
            onClick={exportBibtex}
            disabled={!canExport}
          >
            <Database className="w-4 h-4 text-cyan-200" />
            <div className="mt-2 text-sm font-semibold">Export BibTeX</div>
            <div className="text-xs text-white/50">References</div>
          </button>
          <button
            className="glass-soft rounded-xl p-4 text-left border border-white/10 hover:border-white/20 disabled:opacity-60"
            onClick={exportCsv}
            disabled={!canExport}
          >
            <FileSpreadsheet className="w-4 h-4 text-violet-200" />
            <div className="mt-2 text-sm font-semibold">Export CSV</div>
            <div className="text-xs text-white/50">Citations</div>
          </button>
          <button
            className="glass-soft rounded-xl p-4 text-left border border-white/10 hover:border-white/20 disabled:opacity-60"
            onClick={exportJson}
            disabled={!canExport}
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <div className="mt-2 text-sm font-semibold">Export JSON</div>
            <div className="text-xs text-white/50">Graph data</div>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            className="glass-soft rounded-xl p-4 text-left border border-white/10 hover:border-white/20 disabled:opacity-60"
            onClick={exportNotes}
            disabled={!canExport}
          >
            <FileText className="w-4 h-4 text-emerald-200" />
            <div className="mt-2 text-sm font-semibold">Export Notes</div>
            <div className="text-xs text-white/50">Markdown</div>
          </button>
          <button
            className="glass-soft rounded-xl p-4 text-left border border-white/10 hover:border-white/20 disabled:opacity-60"
            onClick={exportSummary}
            disabled={!canExport}
          >
            <FileText className="w-4 h-4 text-cyan-200" />
            <div className="mt-2 text-sm font-semibold">Export Summary</div>
            <div className="text-xs text-white/50">Latest summary</div>
          </button>
          <button
            className="glass-soft rounded-xl p-4 text-left border border-white/10 hover:border-white/20 disabled:opacity-60"
            onClick={exportAll}
          >
            <Database className="w-4 h-4 text-violet-200" />
            <div className="mt-2 text-sm font-semibold">Batch Export</div>
            <div className="text-xs text-white/50">All saved papers</div>
          </button>
          <button
            className="glass-soft rounded-xl p-4 text-left border border-white/10 hover:border-white/20"
            onClick={exportAllJson}
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <div className="mt-2 text-sm font-semibold">Export All JSON</div>
            <div className="text-xs text-white/50">Metadata dump</div>
          </button>
          <button
            className="glass-soft rounded-xl p-4 text-left border border-white/10 hover:border-white/20"
            onClick={exportAllBibtex}
          >
            <Database className="w-4 h-4 text-cyan-200" />
            <div className="mt-2 text-sm font-semibold">Export All BibTeX</div>
            <div className="text-xs text-white/50">References</div>
          </button>
          <button
            className="glass-soft rounded-xl p-4 text-left border border-white/10 hover:border-white/20"
            onClick={exportAllNotesSummaries}
          >
            <FileText className="w-4 h-4 text-emerald-200" />
            <div className="mt-2 text-sm font-semibold">Notes + Summaries</div>
            <div className="text-xs text-white/50">Single .md file</div>
          </button>
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-5 border border-white/10">
        <div className="text-sm font-semibold">Recent Downloads</div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
          {(["all", "pdf", "bibtex", "csv", "json", "notes", "summary"] as const).map((f) => (
            <button
              key={f}
              className={`rounded-full px-3 py-1 border ${
                filter === f ? "border-white/30 bg-white/10" : "border-white/10"
              }`}
              onClick={() => setFilter(f)}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {filteredDownloads.map((d) => (
            <div
              key={d.id}
              className="glass-soft rounded-xl p-3 border border-white/10 flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-semibold">
                  {papers.find((p) => p.id === d.paper_id)?.title || d.paper_id}
                </div>
                <div className="text-xs text-white/50">
                  {d.format.toUpperCase()} â€¢ {new Date(d.created_at).toLocaleString()}
                </div>
              </div>
              <button className="btn-secondary px-3 py-2 rounded-xl">
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
          {!downloads.length && (
            <div className="text-sm text-white/60">No downloads yet.</div>
          )}
          {error && <div className="text-xs text-red-300">{error}</div>}
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-5 border border-white/10">
        <div className="text-sm font-semibold">Notes & Collections Exports</div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            className="glass-soft rounded-xl p-4 text-left border border-white/10 hover:border-white/20"
            onClick={exportAllNotes}
          >
            <FileText className="w-4 h-4 text-emerald-200" />
            <div className="mt-2 text-sm font-semibold">Export All Notes</div>
            <div className="text-xs text-white/50">Single .md file</div>
          </button>
          <button
            className="glass-soft rounded-xl p-4 text-left border border-white/10 hover:border-white/20"
            onClick={exportCollections}
          >
            <Database className="w-4 h-4 text-cyan-200" />
            <div className="mt-2 text-sm font-semibold">Export Collections</div>
            <div className="text-xs text-white/50">JSON archive</div>
          </button>
        </div>
      </div>
    </PageShell>
  );
}

