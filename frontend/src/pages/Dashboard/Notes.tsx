import toast from "react-hot-toast";
import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { Search, Save, Plus, Trash2, Pin, PinOff, Download } from "lucide-react";
import api from "../../api/axios";
import {
  apiHistory,
  apiListSavedPapers,
  apiSavePaper,
  HistoryItem,
  PaperItem,
} from "../../api/assistant.api";
import { getErrorMessage } from "../../utils/errors";
import { toIstIsoString } from "../../utils/time";
import VoiceButton from "../../components/ui/VoiceButton";

type Note = {
  id: string;
  paper_id: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
};

type NoteMeta = {
  tags: string[];
  pinned: boolean;
  versions: { content: string; saved_at: string }[];
};

const NOTE_META_KEY = "note_meta_v1";

function loadNoteMeta(): Record<string, NoteMeta> {
  try {
    const raw = localStorage.getItem(NOTE_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveNoteMeta(meta: Record<string, NoteMeta>) {
  localStorage.setItem(NOTE_META_KEY, JSON.stringify(meta));
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(src: string) {
  const escaped = escapeHtml(src);
  const lines = escaped.split(/\r?\n/);
  const html: string[] = [];
  let inList = false;
  lines.forEach((line) => {
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      const level = heading[1].length;
      html.push(`<h${level}>${heading[2]}</h${level}>`);
      return;
    }
    const list = line.match(/^[-*]\s+(.*)$/);
    if (list) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${list[1]}</li>`);
      return;
    }
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
    let p = line
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html.push(`<p>${p || "<br />"}</p>`);
  });
  if (inList) html.push("</ul>");
  return html.join("");
}

export default function Notes() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [active, setActive] = useState<Note | null>(null);
  const [content, setContent] = useState("");
  const [paperId, setPaperId] = useState<string | null>(params.get("paper_id"));
  const [papers, setPapers] = useState<{ id: string; title: string; abstract?: string | null; url?: string | null; year?: number | null; source?: string | null }[]>([]);
  const [tab, setTab] = useState<"saved" | "query">("saved");
  const [queryHistory, setQueryHistory] = useState<HistoryItem[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview" | "split">("split");
  const [noteMeta, setNoteMeta] = useState<Record<string, NoteMeta>>(() => loadNoteMeta());
  const [tagInput, setTagInput] = useState("");
  const [template, setTemplate] = useState<"summary" | "critique" | "experiment" | null>(null);
  const [globalQuery, setGlobalQuery] = useState("");
  const [globalResults, setGlobalResults] = useState<{ paperId: string; paperTitle: string; noteId: string; preview: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedRef = useRef<string>("");
  const updateContent = (next: string) => {
    setContent(next);
    setDirty(next !== lastSavedRef.current);
  };

  useEffect(() => {
    const run = async () => {
      try {
        if (!paperId) {
          const saved = await apiListSavedPapers(50);
          setPapers(saved.map((p) => ({ id: p.id, title: p.title, abstract: p.abstract, url: p.url, year: p.year, source: p.source })));
          if (saved.length) setPaperId(saved[0].id);
        } else if (!papers.length) {
          const saved = await apiListSavedPapers(50);
          setPapers(saved.map((p) => ({ id: p.id, title: p.title, abstract: p.abstract, url: p.url, year: p.year, source: p.source })));
        }
      } catch {
        // ignore
      }
    };
    run();
  }, [paperId, papers.length]);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await apiHistory(50, 0);
        setQueryHistory(res.items || []);
        if (!selectedQuery && res.items?.length) {
          setSelectedQuery(res.items[0].id);
        }
      } catch {
        setQueryHistory([]);
      }
    };
    run();
  }, [selectedQuery]);

  useEffect(() => {
    const handle = window.setTimeout(() => setQuery(queryInput), 400);
    return () => window.clearTimeout(handle);
  }, [queryInput]);

  useEffect(() => {
    const run = async () => {
      if (!paperId) return;
      try {
        setError(null);
        const res = await api.get<Note[]>(`/notes/paper/${paperId}`, {
          params: query ? { q: query } : undefined,
        });
        setNotes(res.data || []);
        if (res.data?.length) {
          const next = active ? res.data.find((n) => n.id === active.id) : res.data[0];
          setActive(next || res.data[0]);
          setContent((next || res.data[0]).content);
          lastSavedRef.current = (next || res.data[0]).content;
          setDirty(false);
        } else {
          setActive(null);
          setContent("");
          lastSavedRef.current = "";
          setDirty(false);
        }
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load notes."));
      }
    };
    run();
  }, [paperId, query]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const term = globalQuery.trim();
      if (!term || term.length < 2) {
        setGlobalResults([]);
        return;
      }
      const run = async () => {
        try {
          const targets = papers.slice(0, 30);
          const results = await Promise.all(
            targets.map(async (p) => {
              try {
                const res = await api.get<Note[]>(`/notes/paper/${p.id}`, { params: { q: term } });
                const notes = res.data || [];
                return notes.map((n) => ({
                  paperId: p.id,
                  paperTitle: p.title,
                  noteId: n.id,
                  preview: n.content.slice(0, 120),
                }));
              } catch {
                return [];
              }
            })
          );
          setGlobalResults(results.flat().slice(0, 12));
        } catch {
          setGlobalResults([]);
        }
      };
      run();
    }, 400);
    return () => window.clearTimeout(handle);
  }, [globalQuery, papers]);

  const saveNote = async (silent = false) => {
    if (!paperId || !content.trim()) return;
    try {
      setError(null);
      setSavingState("saving");
      if (active?.id) {
        try {
          await api.put(`/notes/${active.id}`, { content });
        } catch (err: unknown) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 404) {
            const res = await api.post<Note>("/notes", { paper_id: paperId, content });
            setActive(res.data);
          } else {
            throw err;
          }
        }
      } else {
        const res = await api.post<Note>("/notes", { paper_id: paperId, content });
        setActive(res.data);
      }
      try {
        const res = await api.get<Note[]>(`/notes/paper/${paperId}`);
        setNotes(res.data || []);
      } catch {
        /* ignore */
      }
      if (active?.id) {
        setNoteMeta((prev) => {
          const next = { ...prev };
          const meta = next[active.id] || { tags: [], pinned: false, versions: [] };
          if (lastSavedRef.current && lastSavedRef.current !== content) {
            meta.versions = [
              { content: lastSavedRef.current, saved_at: toIstIsoString() },
              ...meta.versions,
            ].slice(0, 3);
          }
          next[active.id] = meta;
          saveNoteMeta(next);
          return next;
        });
      }
      lastSavedRef.current = content;
      setDirty(false);
      setSavingState("saved");
      setSavedAt(toIstIsoString());
      try {
        window.dispatchEvent(
          new CustomEvent("notes-updated", { detail: { paper_id: paperId } })
        );
      } catch {
        /* ignore */
      }
      if (!silent) toast.success("Note saved");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to save note."));
      setSavingState("error");
      if (!silent) toast.error("Failed to save note");
    }
  };

  useEffect(() => {
    if (!paperId) return;
    if (!dirty) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveNote(true);
    }, 900);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [content, dirty, paperId]);

  const queryPapers = useMemo(() => {
    const item = queryHistory.find((q) => q.id === selectedQuery);
    return item?.papers || [];
  }, [queryHistory, selectedQuery]);

  const activePaper = useMemo(() => {
    return papers.find((p) => p.id === paperId) || null;
  }, [papers, paperId]);

  const activeMeta = useMemo(() => {
    if (!active?.id) return { tags: [], pinned: false, versions: [] as NoteMeta["versions"] };
    return noteMeta[active.id] || { tags: [], pinned: false, versions: [] };
  }, [active?.id, noteMeta]);

  const wordStats = useMemo(() => {
    const words = content.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const minutes = wordCount ? Math.max(1, Math.round(wordCount / 200)) : 0;
    return { wordCount, minutes };
  }, [content]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNote(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPreviewMode((prev) => (prev === "preview" ? "edit" : "preview"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [content, paperId, active]);

  const selectedQueryLabel = useMemo(() => {
    const item = queryHistory.find((q) => q.id === selectedQuery);
    return item?.text || item?.input_text || item?.subject_area || "Query";
  }, [queryHistory, selectedQuery]);

  return (
    <PageShell title="Notes" subtitle="Markdown notes per paper with autosave">
      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <div className="glass rounded-2xl p-4 border border-white/10">
          <div className="mb-3">
            <label className="text-xs text-white/50">Search all notes</label>
            <div className="mt-2 flex items-center gap-2 glass-soft rounded-xl p-2 border border-white/10">
              <Search className="w-4 h-4 text-white/50" />
              <input
                className="bg-transparent outline-none text-sm flex-1"
                placeholder="Search across saved notes..."
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
              />
              <VoiceButton
                value={globalQuery}
                onChange={setGlobalQuery}
                className="btn-secondary h-8 w-10 rounded-lg flex items-center justify-center"
              />
            </div>
            {globalResults.length > 0 && (
              <div className="mt-2 space-y-2 max-h-40 overflow-auto">
                {globalResults.map((r) => (
                  <button
                    key={`${r.paperId}-${r.noteId}`}
                    className="w-full text-left glass-soft rounded-xl p-2 border border-white/10 hover:border-white/20"
                    onClick={async () => {
                      setPaperId(r.paperId);
                      try {
                        const res = await api.get<Note[]>(`/notes/paper/${r.paperId}`);
                        setNotes(res.data || []);
                        const hit = (res.data || []).find((n) => n.id === r.noteId);
                        if (hit) {
                          setActive(hit);
                          setContent(hit.content);
                          lastSavedRef.current = hit.content;
                          setDirty(false);
                        }
                      } catch {
                        /* ignore */
                      }
                    }}
                  >
                    <div className="text-xs text-white/50">{r.paperTitle}</div>
                    <div className="text-xs text-white/70">{r.preview}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <button
              className={`flex-1 rounded-full px-3 py-1 text-xs border ${
                tab === "saved" ? "border-white/30 bg-white/10" : "border-white/10"
              }`}
              onClick={() => {
                setTab("saved");
                if (!paperId && papers.length) setPaperId(papers[0].id);
              }}
            >
              Saved Papers
            </button>
            <button
              className={`flex-1 rounded-full px-3 py-1 text-xs border ${
                tab === "query" ? "border-white/30 bg-white/10" : "border-white/10"
              }`}
              onClick={() => {
                setTab("query");
                setPaperId(null);
                setNotes([]);
                setActive(null);
                setContent("");
                lastSavedRef.current = "";
                setDirty(false);
              }}
            >
              Query Papers
            </button>
          </div>
          <div className="flex items-center gap-2 glass-soft rounded-xl p-2 border border-white/10">
            <Search className="w-4 h-4 text-white/50" />
            <input
              className="bg-transparent outline-none text-sm flex-1"
              placeholder="Search notes..."
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
            />
            <VoiceButton
              value={queryInput}
              onChange={setQueryInput}
              className="btn-secondary h-8 w-10 rounded-lg flex items-center justify-center"
            />
          </div>
          {tab === "saved" && (
            <div className="mt-3">
              <label className="text-xs text-white/50">Saved Paper</label>
              <select
                className="input-field mt-2"
                value={paperId || ""}
                onChange={(e) => {
                  if (dirty && !window.confirm("You have unsaved changes. Switch paper anyway?")) {
                    return;
                  }
                  setPaperId(e.target.value);
                }}
              >
                {papers.length === 0 && <option value="">No saved papers</option>}
                {papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          {tab === "query" && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs text-white/50">Query</label>
                <select
                  className="input-field mt-2"
                  value={selectedQuery || ""}
                  onChange={(e) => setSelectedQuery(e.target.value)}
                >
                  {queryHistory.length === 0 && <option value="">No queries</option>}
                  {queryHistory.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.text || q.input_text || q.subject_area || "Query"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-white/60">Papers in {selectedQueryLabel}</div>
              <div className="space-y-2 max-h-48 overflow-auto">
                {queryPapers.length === 0 && (
                  <div className="text-xs text-white/40">No papers in this query.</div>
                )}
                {queryPapers.map((p) => (
                  <div
                    key={p.paper_uid || p.title}
                    className="glass-soft rounded-xl p-3 border border-white/10"
                  >
                    <div className="text-sm font-semibold">{p.title}</div>
                    <div className="mt-1 text-[11px] text-white/50">
                      {p.source || "Unknown"} {p.year ? `• ${p.year}` : ""}
                    </div>
                    <button
                      className="btn-secondary mt-2 rounded-full px-3 py-1 text-[11px]"
                      onClick={async () => {
                        try {
                          const payload: PaperItem & { subject_area?: string } = {
                            ...p,
                            subject_area:
                              queryHistory.find((q) => q.id === selectedQuery)?.subject_area || undefined,
                          };
                          const saved = await apiSavePaper(payload);
                          setPapers((prev) => [{ id: saved.id, title: saved.title }, ...prev]);
                          setPaperId(saved.id);
                          setTab("saved");
                          toast.success("Paper saved. Notes enabled.");
                        } catch (e: unknown) {
                          toast.error(getErrorMessage(e, "Failed to save paper"));
                        }
                      }}
                    >
                      Save to enable notes
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 space-y-2">
            {notes
              .slice()
              .sort((a, b) => {
                const aPinned = noteMeta[a.id]?.pinned ? 1 : 0;
                const bPinned = noteMeta[b.id]?.pinned ? 1 : 0;
                if (aPinned !== bPinned) return bPinned - aPinned;
                return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
              })
              .map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (dirty && !window.confirm("You have unsaved changes. Switch note anyway?")) {
                    return;
                  }
                  setActive(n);
                  setContent(n.content);
                  lastSavedRef.current = n.content;
                  setDirty(false);
                }}
                className={`w-full text-left glass-soft rounded-xl p-3 border hover:border-white/20 ${
                  active?.id === n.id ? "border-white/30" : "border-white/10"
                }`}
              >
                <div className="text-sm font-semibold">
                  {n.content.slice(0, 40) || "Untitled"}
                </div>
                <div className="text-xs text-white/50">
                  {n.updated_at || n.created_at}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(noteMeta[n.id]?.tags || []).slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] rounded-full border border-white/10 bg-white/5 px-2 py-0.5"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            ))}
            {notes.length === 0 && (
              <div className="text-xs text-white/50 mt-3">
                No notes yet. Create one to get started.
              </div>
            )}
          </div>
          {notes.some((n) => noteMeta[n.id]?.pinned) && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/50 mb-2">Pinned notes</div>
              <div className="space-y-2 text-xs text-white/70">
                {notes
                  .filter((n) => noteMeta[n.id]?.pinned)
                  .slice(0, 3)
                  .map((n) => (
                    <button
                      key={n.id}
                      className="w-full text-left hover:text-white"
                      onClick={() => {
                        setActive(n);
                        setContent(n.content);
                        lastSavedRef.current = n.content;
                        setDirty(false);
                      }}
                    >
                      {n.content.slice(0, 80)}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Markdown Editor</div>
              <div className="text-xs text-white/50">
                {savingState === "saving"
                  ? "Saving..."
                  : savingState === "saved"
                  ? "Saved"
                  : savingState === "error"
                  ? "Save failed"
                  : "Autosave enabled"}
              </div>
              {savedAt && (
                <div className="text-[10px] text-white/40">
                  Last saved {new Date(savedAt).toLocaleTimeString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary px-3 py-2 rounded-xl"
                onClick={() => {
                  if (!active?.id) return;
                  setNoteMeta((prev) => {
                    const next = { ...prev };
                    const meta = next[active.id] || { tags: [], pinned: false, versions: [] };
                    meta.pinned = !meta.pinned;
                    next[active.id] = meta;
                    saveNoteMeta(next);
                    return next;
                  });
                }}
              >
                {activeMeta.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                {activeMeta.pinned ? "Unpin" : "Pin"}
              </button>
              <button
                className="btn-secondary px-3 py-2 rounded-xl"
                onClick={() => {
                  setActive(null);
                  setContent("");
                  lastSavedRef.current = "";
                  setDirty(false);
                }}
              >
                <Plus className="w-4 h-4" />
                New note
              </button>
              <button className="btn-secondary px-3 py-2 rounded-xl" onClick={() => saveNote(false)}>
                <Save className="w-4 h-4" />
                Save Now
              </button>
              {active?.id && (
                <button
                  className="btn-secondary px-3 py-2 rounded-xl text-red-200"
                  onClick={async () => {
                    if (!window.confirm("Delete this note?")) return;
                    try {
                      await api.delete(`/notes/${active.id}`);
                      setNotes((prev) => prev.filter((n) => n.id !== active.id));
                      setActive(null);
                      setContent("");
                      lastSavedRef.current = "";
                      setDirty(false);
                      setNoteMeta((prev) => {
                        const next = { ...prev };
                        delete next[active.id];
                        saveNoteMeta(next);
                        return next;
                      });
                      try {
                        if (paperId) {
                          window.dispatchEvent(
                            new CustomEvent("notes-updated", { detail: { paper_id: paperId } })
                          );
                        }
                      } catch {
                        /* ignore */
                      }
                      toast.success("Note deleted");
                    } catch (e: unknown) {
                      toast.error(getErrorMessage(e, "Failed to delete note"));
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          </div>
          {activePaper && (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
              <div className="text-[10px] text-white/50 mb-1">Paper context</div>
              <div className="text-sm font-semibold">{activePaper.title}</div>
              <div className="text-[11px] text-white/50">
                {activePaper.source || "Unknown"} {activePaper.year ? `• ${activePaper.year}` : ""}
              </div>
              {activePaper.abstract && (
                <div className="mt-2 text-white/60">{activePaper.abstract.slice(0, 160)}</div>
              )}
              {activePaper.url && (
                <a
                  className="mt-2 inline-flex text-emerald-200 text-[11px]"
                  href={activePaper.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open paper link
                </a>
              )}
              <a
                className="mt-2 ml-3 inline-flex text-emerald-200 text-[11px]"
                href="/dashboard/paper-summary"
              >
                Open summary page
              </a>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
            <button
              className={`rounded-full px-3 py-1 border ${
                previewMode === "edit" ? "border-white/30 bg-white/10" : "border-white/10"
              }`}
              onClick={() => setPreviewMode("edit")}
            >
              Edit
            </button>
            <button
              className={`rounded-full px-3 py-1 border ${
                previewMode === "preview" ? "border-white/30 bg-white/10" : "border-white/10"
              }`}
              onClick={() => setPreviewMode("preview")}
            >
              Preview
            </button>
            <button
              className={`rounded-full px-3 py-1 border ${
                previewMode === "split" ? "border-white/30 bg-white/10" : "border-white/10"
              }`}
              onClick={() => setPreviewMode("split")}
            >
              Split
            </button>
            {dirty && <span className="ml-2 text-amber-200">Unsaved changes</span>}
            <span className="ml-auto text-white/40">
              {wordStats.wordCount} words • {wordStats.minutes} min read
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/60">
            <div className="text-white/50">Templates</div>
            {["summary", "critique", "experiment"].map((t) => (
              <button
                key={t}
                className={`rounded-full px-3 py-1 border ${
                  template === t ? "border-white/30 bg-white/10" : "border-white/10"
                }`}
                onClick={() => {
                  const next = t as "summary" | "critique" | "experiment";
                  setTemplate(next);
                  if (content && !window.confirm("Replace current content with template?")) return;
                  if (next === "summary") {
                    setContent(
                      "# Summary\n\n## Key Ideas\n- \n\n## Evidence\n- \n\n## Notes\n- \n"
                    );
                  }
                  if (next === "critique") {
                    setContent(
                      "# Critique\n\n## Strengths\n- \n\n## Weaknesses\n- \n\n## Questions\n- \n"
                    );
                  }
                  if (next === "experiment") {
                    setContent(
                      "# Experiment Plan\n\n## Hypothesis\n- \n\n## Method\n- \n\n## Metrics\n- \n\n## Risks\n- \n"
                    );
                  }
                  setDirty(true);
                }}
              >
                {t}
              </button>
            ))}
            <button
              className="rounded-full px-3 py-1 border border-white/10"
              onClick={() => {
                const blob = new Blob([content || ""], { type: "text/markdown;charset=utf-8" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `note_${active?.id || "new"}.md`;
                a.click();
              }}
            >
              <Download className="w-3 h-3 inline-block mr-1" />
              Export .md
            </button>
            <button
              className="rounded-full px-3 py-1 border border-white/10"
              onClick={() => {
                const blob = new Blob([content || ""], { type: "text/plain;charset=utf-8" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `note_${active?.id || "new"}.txt`;
                a.click();
              }}
            >
              <Download className="w-3 h-3 inline-block mr-1" />
              Export .txt
            </button>
            <button
              className="rounded-full px-3 py-1 border border-white/10"
              onClick={() => {
                if (!notes.length) return;
                const text = notes
                  .map((n, i) => `# Note ${i + 1}\n\n${n.content}\n`)
                  .join("\n");
                const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `paper_${paperId}_notes.md`;
                a.click();
              }}
            >
              <Download className="w-3 h-3 inline-block mr-1" />
              Export all
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
            <div className="text-white/50">Tags</div>
            <input
              className="input-field text-xs w-[200px]"
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
            />
            <button
              className="btn-secondary rounded-full px-3 py-1 text-[11px]"
              onClick={() => {
                if (!active?.id) return;
                const tag = tagInput.trim();
                if (!tag) return;
                setNoteMeta((prev) => {
                  const next = { ...prev };
                  const meta = next[active.id] || { tags: [], pinned: false, versions: [] };
                  if (!meta.tags.includes(tag)) meta.tags = [...meta.tags, tag];
                  next[active.id] = meta;
                  saveNoteMeta(next);
                  return next;
                });
                setTagInput("");
              }}
            >
              Add
            </button>
            <div className="flex flex-wrap gap-1">
              {activeMeta.tags.map((t) => (
                <button
                  key={t}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px]"
                  onClick={() => {
                    if (!active?.id) return;
                    setNoteMeta((prev) => {
                      const next = { ...prev };
                      const meta = next[active.id] || { tags: [], pinned: false, versions: [] };
                      meta.tags = meta.tags.filter((x) => x !== t);
                      next[active.id] = meta;
                      saveNoteMeta(next);
                      return next;
                    });
                  }}
                >
                  {t} ×
                </button>
              ))}
            </div>
          </div>
          {activeMeta.versions.length > 0 && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
              <div className="text-[10px] text-white/50 mb-2">Version history</div>
              <div className="space-y-2">
                {activeMeta.versions.map((v, idx) => (
                  <div key={`${v.saved_at}-${idx}`} className="flex items-center justify-between gap-2">
                    <span>{new Date(v.saved_at).toLocaleString()}</span>
                    <button
                      className="btn-secondary rounded-full px-2 py-1 text-[10px]"
                      onClick={() => {
                        if (!window.confirm("Restore this version?")) return;
                        setContent(v.content);
                        setDirty(true);
                      }}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-xs text-white/50">
            <span>Voice input</span>
            <VoiceButton value={content} onChange={updateContent} />
          </div>
          <div className={`mt-3 grid gap-4 ${previewMode === "split" ? "lg:grid-cols-2" : ""}`}>
            {(previewMode === "edit" || previewMode === "split") && (
              <textarea
                className="textarea-field min-h-[260px]"
                value={content}
                onChange={(e) => {
                  updateContent(e.target.value);
                }}
              />
            )}
            {(previewMode === "preview" || previewMode === "split") && (
              <div className="glass-soft rounded-2xl p-4 border border-white/10 min-h-[260px]">
                <div className="text-xs text-white/50 mb-2">Preview</div>
                <div
                  className="text-sm text-white/80 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: content ? renderMarkdown(content) : "<p>Nothing to preview yet.</p>",
                  }}
                />
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-white/50">
            {paperId ? "Autosave ready." : "Provide a paper_id to load notes."}
          </div>
          {error && <div className="mt-2 text-xs text-red-300">{error}</div>}
        </div>
      </div>
    </PageShell>
  );
}


