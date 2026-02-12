import { useEffect, useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import { FolderPlus, GripVertical, Trash2, Plus, X } from "lucide-react";
import { getErrorMessage } from "../../utils/errors";
import toast from "react-hot-toast";
import VoiceButton from "../../components/ui/VoiceButton";
import {
  apiCreateCollection,
  apiDeleteCollection,
  apiListCollections,
  apiListCollectionItems,
  apiAddCollectionItem,
  apiRemoveCollectionItem,
  apiReorderCollections,
  apiUpdateCollectionTags,
} from "../../api/collections.api";
import {
  apiHistory,
  apiListSavedPapers,
  apiSavePaper,
  HistoryItem,
  PaperItem,
  SavedPaper,
} from "../../api/assistant.api";

type CollectionView = {
  id: string;
  name: string;
  count?: number;
  tags?: string[];
};

export default function Collections() {
  const [collections, setCollections] = useState<CollectionView[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [activeCollection, setActiveCollection] = useState<CollectionView | null>(null);
  const [items, setItems] = useState<string[]>([]);
  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<"saved" | "query">("saved");
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await apiListCollections();
        setCollections(res.map((c: any) => ({ id: c.id, name: c.name, count: c.count, tags: c.tags || [] })));
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load collections."));
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
      try {
        const res = await apiHistory(50, 0);
        setHistory(res.items || []);
        if (!selectedQuery && res.items?.length) {
          setSelectedQuery(res.items[0].id);
        }
      } catch {
        setHistory([]);
      }
    };
    run();
  }, [selectedQuery]);

  useEffect(() => {
    if (!activeCollection) return;
    apiListCollectionItems(activeCollection.id)
      .then((rows) => {
        setItems(rows.map((r) => r.paper_id));
      })
      .catch(() => setItems([]));
  }, [activeCollection]);

  const add = async () => {
    if (!name.trim()) return;
    try {
      const res = await apiCreateCollection(name.trim());
      setCollections((prev) => [{ id: res.id, name: res.name }, ...prev]);
      setName("");
      toast.success("Collection created");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to create collection."));
    }
  };

  const remove = async (id: string) => {
    try {
      await apiDeleteCollection(id);
      setCollections((prev) => prev.filter((c) => c.id !== id));
      toast.success("Collection deleted");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to delete collection."));
    }
  };

  const onDragStart = (id: string) => setDragId(id);
  const onDrop = (id: string) => {
    if (!dragId || dragId === id) return;
    setCollections((prev) => {
      const a = prev.findIndex((c) => c.id === dragId);
      const b = prev.findIndex((c) => c.id === id);
      if (a < 0 || b < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(a, 1);
      next.splice(b, 0, moved);
      apiReorderCollections(next.map((c) => c.id)).catch(() => {
        setError("Failed to persist order.");
      });
      return next;
    });
    setDragId(null);
  };

  const activeMeta = useMemo(() => {
    if (!activeCollection) return { tags: [] as string[] };
    return { tags: activeCollection.tags || [] };
  }, [activeCollection]);

  const queryPapers = useMemo(() => {
    const q = history.find((h) => h.id === selectedQuery);
    return q?.papers || [];
  }, [history, selectedQuery]);

  const filteredSaved = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return savedPapers;
    return savedPapers.filter((p) => (p.title || "").toLowerCase().includes(q));
  }, [savedPapers, search]);

  const filteredQueryPapers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return queryPapers;
    return queryPapers.filter((p) => (p.title || "").toLowerCase().includes(q));
  }, [queryPapers, search]);

  return (
    <PageShell title="Collections" subtitle="Organize papers into folders">
      <div className="glass rounded-2xl p-5 border border-white/10">
        <div className="flex items-center gap-3">
          <input
            className="input-field flex-1"
            placeholder="Create a new collection..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <VoiceButton value={name} onChange={setName} />
          <button className="btn-primary px-4 py-2 rounded-xl" onClick={add}>
            <FolderPlus className="w-4 h-4" />
            Add
          </button>
        </div>
        {error && <div className="mt-3 text-xs text-red-300">{error}</div>}
      </div>

      <div className="mt-4 glass rounded-2xl p-5 border border-white/10">
        <div className="text-sm font-semibold">Suggestions</div>
        <div className="mt-3 grid md:grid-cols-3 gap-3 text-xs text-white/70">
          <div className="glass-soft rounded-xl p-3 border border-white/10">
            Create a collection for your most common subject area.
          </div>
          <div className="glass-soft rounded-xl p-3 border border-white/10">
            Add papers from your latest query to keep context together.
          </div>
          <div className="glass-soft rounded-xl p-3 border border-white/10">
            Use tags to group collections by topic or project.
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {collections.map((c) => (
          <div
            key={c.id}
            draggable
            onDragStart={() => onDragStart(c.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(c.id)}
            className="glass rounded-2xl p-5 border border-white/10 hover:border-white/20 hover-lift cursor-grab"
            onClick={() => setActiveCollection(c)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-bold">{c.name}</div>
                <div className="text-xs text-white/50">{c.count ?? 0} papers</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary px-2.5 py-2 rounded-xl">
                  <GripVertical className="w-4 h-4" />
                </button>
                <button
                  className="btn-secondary px-2.5 py-2 rounded-xl"
                  onClick={() => remove(c.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/60">
              <div className="glass-soft rounded-xl p-3">Last update: 2h ago</div>
              <div className="glass-soft rounded-xl p-3">Team: Personal</div>
            </div>
          </div>
        ))}
      </div>

      {activeCollection && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveCollection(null)} />
          <div className="relative w-full max-w-4xl glass rounded-3xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <div className="text-xs text-white/50">Collection</div>
                <div className="text-lg font-extrabold">{activeCollection.name}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-secondary px-3 py-2 rounded-xl" onClick={() => setAddOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Add papers
                </button>
                <button className="btn-secondary px-3 py-2 rounded-xl" onClick={() => setActiveCollection(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs text-white/60">
                <div className="text-white/50">Tags</div>
                <input
                  className="input-field text-xs w-[200px]"
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                />
                  <button
                    className="btn-secondary rounded-full px-3 py-1 text-[11px]"
                    onClick={async () => {
                      if (!tagInput.trim()) return;
                      const nextTags = Array.from(
                        new Set([...(activeCollection.tags || []), tagInput.trim()])
                      );
                      await apiUpdateCollectionTags(activeCollection.id, nextTags);
                    setCollections((prev) =>
                      prev.map((c) =>
                        c.id === activeCollection.id ? { ...c, tags: nextTags } : c
                      )
                    );
                    setActiveCollection((prev) =>
                      prev ? { ...prev, tags: nextTags } : prev
                    );
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
                      onClick={async () => {
                        const nextTags = (activeCollection.tags || []).filter((x) => x !== t);
                        await apiUpdateCollectionTags(activeCollection.id, nextTags);
                        setCollections((prev) =>
                          prev.map((c) =>
                            c.id === activeCollection.id ? { ...c, tags: nextTags } : c
                          )
                        );
                        setActiveCollection((prev) =>
                          prev ? { ...prev, tags: nextTags } : prev
                        );
                      }}
                    >
                      {t} ×
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {items.length === 0 && (
                  <div className="text-sm text-white/60">No papers in this collection yet.</div>
                )}
                {items.map((paperId) => {
                  const paper = savedPapers.find((p) => p.id === paperId);
                  if (!paper) return null;
                  return (
                    <div key={paperId} className="glass-soft rounded-xl p-4 border border-white/10">
                      <div className="text-sm font-semibold">{paper.title}</div>
                      <div className="mt-2 text-xs text-white/50">
                        {paper.source || "Unknown"} {paper.year ? `• ${paper.year}` : ""}
                      </div>
                      <div className="mt-2 text-xs text-white/60 line-clamp-2">
                        {paper.abstract || "Abstract not available."}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          className="btn-secondary rounded-xl px-3 py-1.5 text-xs"
                          onClick={() => window.location.assign(`/dashboard/notes?paper_id=${paper.id}`)}
                        >
                          Notes
                        </button>
                        <button
                          className="btn-secondary rounded-xl px-3 py-1.5 text-xs"
                          onClick={() => window.location.assign(`/dashboard/paper-summary`)}
                        >
                          Summary
                        </button>
                        <button
                          className="btn-secondary rounded-xl px-3 py-1.5 text-xs"
                          onClick={() => apiRemoveCollectionItem(activeCollection.id, paperId).then(() => {
                            setItems((prev) => prev.filter((id) => id !== paperId));
                          })}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {addOpen && activeCollection && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAddOpen(false)} />
          <div className="relative w-full max-w-4xl glass rounded-3xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="text-lg font-bold">Add papers</div>
              <button className="btn-secondary px-3 py-2 rounded-xl" onClick={() => setAddOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-custom">
              <div className="flex items-center gap-2">
                <button
                  className={`btn-secondary rounded-full px-3 py-1 text-xs ${addTab === "saved" ? "shadow-glow" : ""}`}
                  onClick={() => setAddTab("saved")}
                >
                  Saved Papers
                </button>
                <button
                  className={`btn-secondary rounded-full px-3 py-1 text-xs ${addTab === "query" ? "shadow-glow" : ""}`}
                  onClick={() => setAddTab("query")}
                >
                  Query Papers
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <input
                    className="input-field text-xs max-w-[260px]"
                    placeholder="Search papers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <VoiceButton value={search} onChange={setSearch} />
                </div>
              </div>

              {addTab === "saved" && (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn-secondary rounded-full px-3 py-1 text-xs"
                      onClick={async () => {
                        for (const p of filteredSaved) {
                          try {
                            await apiAddCollectionItem(activeCollection.id, p.id);
                            setItems((prev) => (prev.includes(p.id) ? prev : [...prev, p.id]));
                          } catch {
                            /* ignore */
                          }
                        }
                        toast.success("Added saved papers");
                      }}
                    >
                      Add all saved
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 mt-3">
                    {filteredSaved.map((p) => (
                      <div key={p.id} className="glass-soft rounded-xl p-4 border border-white/10">
                        <div className="text-sm font-semibold">{p.title}</div>
                        <div className="mt-2 text-xs text-white/50">
                          {p.source || "Unknown"} {p.year ? `• ${p.year}` : ""}
                        </div>
                        <button
                          className="btn-secondary mt-3 rounded-xl px-3 py-1.5 text-xs"
                          onClick={async () => {
                            try {
                              await apiAddCollectionItem(activeCollection.id, p.id);
                              setItems((prev) => (prev.includes(p.id) ? prev : [...prev, p.id]));
                              toast.success("Paper added");
                            } catch (e: unknown) {
                              toast.error(getErrorMessage(e, "Failed to add paper"));
                            }
                          }}
                        >
                          Add to collection
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {addTab === "query" && (
                <div className="space-y-3">
                  <select
                    className="input-field text-xs max-w-[360px]"
                    value={selectedQuery || ""}
                    onChange={(e) => setSelectedQuery(e.target.value)}
                  >
                    {history.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.text || h.input_text || h.subject_area || "Query"}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn-secondary rounded-full px-3 py-1 text-xs"
                      onClick={async () => {
                        for (const p of filteredQueryPapers) {
                          try {
                            const saved = await apiSavePaper({
                              ...p,
                              subject_area: history.find((h) => h.id === selectedQuery)?.subject_area,
                            });
                            setSavedPapers((prev) => {
                              const exists = prev.some((x) => x.id === saved.id);
                              if (exists) return prev;
                              return [saved, ...prev];
                            });
                            await apiAddCollectionItem(activeCollection.id, saved.id);
                            setItems((prev) => (prev.includes(saved.id) ? prev : [...prev, saved.id]));
                          } catch {
                            /* ignore */
                          }
                        }
                        toast.success("Saved & added query papers");
                      }}
                    >
                      Save & add all
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {filteredQueryPapers.map((p, idx) => (
                      <div key={`${p.paper_uid || "paper"}-${idx}`} className="glass-soft rounded-xl p-4 border border-white/10">
                        <div className="text-sm font-semibold">{p.title}</div>
                        <div className="mt-2 text-xs text-white/50">
                          {p.source || "Unknown"} {p.year ? `• ${p.year}` : ""}
                        </div>
                        <button
                          className="btn-secondary mt-3 rounded-xl px-3 py-1.5 text-xs"
                          onClick={async () => {
                            try {
                              const saved = await apiSavePaper({
                                ...p,
                                subject_area: history.find((h) => h.id === selectedQuery)?.subject_area,
                              });
                              setSavedPapers((prev) => {
                                const exists = prev.some((x) => x.id === saved.id);
                                if (exists) return prev;
                                return [saved, ...prev];
                              });
                              await apiAddCollectionItem(activeCollection.id, saved.id);
                              setItems((prev) => (prev.includes(saved.id) ? prev : [...prev, saved.id]));
                              toast.success("Saved & added");
                            } catch (e: unknown) {
                              toast.error(getErrorMessage(e, "Failed to add paper"));
                            }
                          }}
                        >
                          Save & add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

