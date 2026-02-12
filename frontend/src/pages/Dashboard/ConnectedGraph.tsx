import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import PaperGraphCanvas from "../../components/graph/PaperGraphCanvas";
import { apiGraphForQuery, apiGraphNeighbors } from "../../api/graph.api";
import { apiHistory } from "../../api/assistant.api";
import { getErrorMessage } from "../../utils/errors";
import VoiceButton from "../../components/ui/VoiceButton";

export default function ConnectedGraph() {
  const [params] = useSearchParams();
  const queryId = params.get("query_id");
  const [nodes, setNodes] = useState<{ id: string; label: string; type?: string }[]>([]);
  const [edges, setEdges] = useState<
    { from: string; to: string; weight?: number; relation?: string | null }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [queries, setQueries] = useState<{ id: string; label: string }[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(queryId);
  const [loading, setLoading] = useState(false);
  const [querySearch, setQuerySearch] = useState("");
  const [showLabels, setShowLabels] = useState(true);
  const [density, setDensity] = useState<"sparse" | "dense">("sparse");
  const [focusTerm, setFocusTerm] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [hovered, setHovered] = useState<{
    id: string;
    label: string;
    degree?: number;
    type?: string;
  } | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<{
    from: string;
    to: string;
    weight?: number;
    relation?: string | null;
  } | null>(null);
  const [expanding, setExpanding] = useState(false);
  const [lockedNode, setLockedNode] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setError(null);
        setLoading(true);
        if (selectedQuery) {
          const res = await apiGraphForQuery(selectedQuery);
          setNodes(res.nodes);
          setEdges(
            res.edges.map((e) => ({
              from: e.from,
              to: e.to,
              weight: e.weight,
              relation: e.relation ?? null,
            }))
          );
          return;
        }
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load graph"));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [selectedQuery]);

  const handleExpand = async (paper_id: string) => {
    if (!paper_id || expanding) return;
    try {
      setExpanding(true);
      const newEdges = await apiGraphNeighbors(paper_id, 20);
      setEdges((prev) => {
        const seen = new Set(prev.map((e) => `${e.from}-${e.to}-${e.relation ?? ""}`));
        const merged = [...prev];
        newEdges.forEach((e) => {
          const key = `${e.from}-${e.to}-${e.relation ?? ""}`;
          if (!seen.has(key)) {
            merged.push({
              from: e.from,
              to: e.to,
              weight: e.weight,
              relation: e.relation ?? null,
            });
            seen.add(key);
          }
        });
        return merged;
      });
      setNodes((prev) => {
        const known = new Map(prev.map((n) => [n.id, n.label]));
        newEdges.forEach((e) => {
          if (!known.has(e.from)) {
            known.set(e.from, `Paper ${e.from.slice(0, 6)}`);
          }
          if (!known.has(e.to)) {
            known.set(e.to, `Paper ${e.to.slice(0, 6)}`);
          }
        });
        return Array.from(known.entries()).map(([id, label]) => ({ id, label }));
      });
    } finally {
      setExpanding(false);
    }
  };

  const handleLock = (nodeId: string, label?: string) => {
    if (!nodeId) return;
    setLockedNode((prev) => {
      if (prev?.id === nodeId) return null;
      return { id: nodeId, label: label || nodeId };
    });
  };

  useEffect(() => {
    const run = async () => {
      try {
        const res = await apiHistory(20, 0);
        const items = res.items || [];
        setQueries(
          items.map((i, idx) => {
            const rawText = i.text || i.input_text || "";
            const subject = i.subject_area || "";
            const subjectLabel =
              subject && !subject.toLowerCase().startsWith("class_")
                ? subject
                : "";
            const label =
              rawText.slice(0, 60) ||
              subjectLabel ||
              `Query ${items.length - idx}`;
            return { id: i.id, label };
          })
        );
        if (!selectedQuery && items.length) setSelectedQuery(items[0].id);
      } catch {
        // ignore
      }
    };
    run();
  }, [selectedQuery]);

  const filteredQueries = useMemo(() => {
    if (!querySearch.trim()) return queries;
    const q = querySearch.trim().toLowerCase();
    return queries.filter((i) => i.label.toLowerCase().includes(q));
  }, [queries, querySearch]);

  const stats = useMemo(() => {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const densityLabel =
      density === "dense" ? "High density" : "Low density";
    return { nodeCount, edgeCount, densityLabel };
  }, [nodes, edges, density]);

  const seedPaper = useMemo(() => {
    if (!nodes.length) return null;
    const byType = nodes.find((n) => n.type?.toLowerCase().includes("core") || n.type?.toLowerCase().includes("seed"));
    if (byType) return byType;
    const deg = new Map<string, number>();
    edges.forEach((e) => {
      deg.set(e.from, (deg.get(e.from) || 0) + 1);
      deg.set(e.to, (deg.get(e.to) || 0) + 1);
    });
    let best = nodes[0];
    let bestDeg = deg.get(best.id) || 0;
    nodes.forEach((n) => {
      const d = deg.get(n.id) || 0;
      if (d > bestDeg) {
        best = n;
        bestDeg = d;
      }
    });
    return best;
  }, [nodes, edges]);

  return (
    <PageShell title="Connected Papers" subtitle="Explore relationships between papers in a query">
      <div className="glass rounded-2xl border border-white/10 p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-white/50">Query-driven graph</div>
              <div className="text-lg font-semibold">Connections Overview</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-secondary rounded-full px-4 py-2 text-xs"
                onClick={() => {
                  setShowLabels(true);
                  setDensity("sparse");
                  setFocusTerm("");
                  setResetKey((k) => k + 1);
                }}
              >
                Reset view
              </button>
              <button
                className="btn-primary rounded-full px-4 py-2 text-xs"
                onClick={() => setDensity((d) => (d === "dense" ? "sparse" : "dense"))}
              >
                {density === "dense" ? "Sparse layout" : "Dense layout"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[280px_1fr_300px]">
            <div className="glass-soft rounded-2xl border border-white/10 p-4 space-y-4">
              <div>
                <div className="text-xs text-white/50">Query history</div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    className="input-field text-xs flex-1"
                    placeholder="Search queries..."
                    value={querySearch}
                    onChange={(e) => setQuerySearch(e.target.value)}
                  />
                  <VoiceButton value={querySearch} onChange={setQuerySearch} />
                </div>
                <select
                  className="input-field mt-2"
                  value={selectedQuery || ""}
                  onChange={(e) => setSelectedQuery(e.target.value)}
                >
                  {filteredQueries.length === 0 && <option value="">No queries</option>}
                  {filteredQueries.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-xs text-white/50">Focus keyword</div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    className="input-field text-xs flex-1"
                    placeholder="graph, diffusion, llm"
                    value={focusTerm}
                    onChange={(e) => setFocusTerm(e.target.value)}
                  />
                  <VoiceButton value={focusTerm} onChange={setFocusTerm} />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70 space-y-2">
                <div className="text-white/50">Graph stats</div>
                <div>Nodes: {stats.nodeCount}</div>
                <div>Edges: {stats.edgeCount}</div>
                <div>Density: {stats.densityLabel}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70 space-y-2">
                <div className="text-white/50">Legend</div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                  Focus paper
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-400/90" />
                  Connected
                </div>
              </div>
            </div>

            <div className="glass-soft rounded-2xl border border-white/10 p-4">
              {loading ? (
                <div className="text-sm text-white/60">Loading graph...</div>
              ) : (
                <PaperGraphCanvas
                  nodes={nodes}
                  edges={edges}
                  showLabels={showLabels}
                  density={density}
                  focusTerm={focusTerm}
                  resetKey={resetKey}
                  onHover={setHovered}
                  onHoverEdge={setHoveredEdge}
                  onNodeClick={(nodeId, label) => {
                    handleLock(nodeId, label);
                    handleExpand(nodeId);
                  }}
                  lockedNodeId={lockedNode?.id || null}
                />
              )}
              {!selectedQuery && (
                <div className="mt-3 text-xs text-white/50">
                  Select a query to load the graph.
                </div>
              )}
              {error && <div className="mt-3 text-xs text-red-300">{error}</div>}
            </div>

            <div className="glass-soft rounded-2xl border border-white/10 p-4 space-y-4">
              <div>
                <div className="text-xs text-white/50">Paper detail</div>
                <div className="mt-2 text-sm font-semibold">
                  {hovered?.label || "Hover a node to inspect"}
                </div>
                <div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                  <div className="text-[11px] text-white/50">Seed paper</div>
                  <div className="font-semibold text-white">
                    {seedPaper?.label || "Not available"}
                  </div>
                </div>
                <div className="mt-2 text-xs text-white/60">
                  {lockedNode
                    ? `Locked: ${lockedNode.label}`
                    : "Click a node to lock focus."}
                </div>
                <div className="mt-2 text-xs text-white/60">
                  {hovered?.degree != null
                    ? `Connections: ${hovered.degree}`
                    : "Connections update on hover."}
                </div>
                <div className="mt-2 text-xs text-white/60">
                  {hovered?.type ? `Type: ${hovered.type}` : "Type: Not available"}
                </div>
                <button
                  className="btn-secondary mt-4 w-full rounded-xl px-3 py-2 text-xs"
                  onClick={() => hovered?.id && handleExpand(hovered.id)}
                  disabled={!hovered?.id || expanding}
                >
                  {expanding ? "Expanding neighbors..." : "Expand neighbors"}
                </button>
              </div>

              <div>
                <div className="text-xs text-white/50">Edge detail</div>
                <div className="mt-2 text-xs text-white/70">
                  {hoveredEdge
                    ? `${hoveredEdge.from.slice(0, 6)} -> ${hoveredEdge.to.slice(0, 6)}${
                        hoveredEdge.relation ? ` - ${hoveredEdge.relation}` : ""
                      }${hoveredEdge.weight ? ` - weight ${hoveredEdge.weight}` : ""}`
                    : "Hover an edge to see connection metadata."}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70 space-y-2">
                <div className="text-white/50">Usage tips</div>
                <div>Use query filters to reduce noise.</div>
                <div>Lock a node to keep focus.</div>
                <div>Use focus keyword to highlight topics.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
