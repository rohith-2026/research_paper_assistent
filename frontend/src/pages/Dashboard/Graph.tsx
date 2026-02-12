import { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import { apiConnectedGraph } from "../../api/graph.api";
import { apiHistory } from "../../api/assistant.api";
import { getErrorMessage } from "../../utils/errors";
import VoiceButton from "../../components/ui/VoiceButton";

type GraphNode = {
  id: string;
  title: string;
  year?: number | null;
  venue?: string | null;
  authors?: string[] | null;
  source?: string | null;
  url?: string | null;
};

type GraphEdge = {
  source: string;
  target: string;
  weight: number;
  type: "similarity";
};

type SimNode = GraphNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
  degree: number;
  radius: number;
};

const SOURCE_COLORS: Record<string, string> = {
  "Semantic Scholar": "#34D399",
  OpenAlex: "#60A5FA",
  Crossref: "#FBBF24",
  arXiv: "#FB7185",
  Unknown: "#94A3B8",
};

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export default function Graph() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<number | null>(null);
  const simRef = useRef<{ nodes: SimNode[]; edges: GraphEdge[] } | null>(null);
  const viewRef = useRef({ x: 0, y: 0, scale: 1 });
  const viewTargetRef = useRef<{ x: number; y: number; scale: number } | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, dirty: false });

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [queries, setQueries] = useState<{ id: string; label: string }[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [neighborDepth, setNeighborDepth] = useState(1);
  const [edgeMode, setEdgeMode] = useState<"all" | "author">("all");
  const [edgeFilters, setEdgeFilters] = useState<{ author: boolean; venue: boolean; year: boolean }>({
    author: true,
    venue: true,
    year: true,
  });
  const [freeze, setFreeze] = useState(false);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set());
  const [clusterMode, setClusterMode] = useState<"none" | "source" | "venue">("source");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [panelTab, setPanelTab] = useState<"details" | "pinned">("details");
  const stableRef = useRef(false);

  const adj = useMemo(() => {
    const map = new Map<string, Set<string>>();
    edges.forEach((e) => {
      if (!map.has(e.source)) map.set(e.source, new Set());
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.source)!.add(e.target);
      map.get(e.target)!.add(e.source);
    });
    return map;
  }, [edges]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId]
  );

  const hoveredNode = useMemo(
    () => nodes.find((n) => n.id === hoverId) || null,
    [nodes, hoverId]
  );

  const selectedQueryMeta = useMemo(() => {
    const item = queries.find((q) => q.id === selectedQuery);
    return item?.label || "";
  }, [queries, selectedQuery]);

  const edgeTypeLookup = useMemo(() => {
    const map = new Map<string, "author" | "venue" | "year">();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    edges.forEach((e) => {
      const a = nodeMap.get(e.source);
      const b = nodeMap.get(e.target);
      if (!a || !b) return;
      const aAuthors = new Set((a.authors || []).map((x) => x.toLowerCase()));
      const bAuthors = new Set((b.authors || []).map((x) => x.toLowerCase()));
      if ([...aAuthors].some((x) => bAuthors.has(x))) {
        map.set(`${e.source}|${e.target}`, "author");
        return;
      }
      if (a.venue && b.venue && a.venue.toLowerCase() === b.venue.toLowerCase()) {
        map.set(`${e.source}|${e.target}`, "venue");
        return;
      }
      if (a.year && b.year && Math.abs(a.year - b.year) === 1) {
        map.set(`${e.source}|${e.target}`, "year");
      }
    });
    return map;
  }, [nodes, edges]);

  const pinnedNodes = useMemo(
    () => nodes.filter((n) => pinned.has(n.id)),
    [nodes, pinned]
  );

  useEffect(() => {
    const run = async () => {
      try {
        const res = await apiHistory(40, 0);
        const items = res.items || [];
        setQueries(
          items.map((i, idx) => {
            const text = i.text || i.input_text || "";
            const subject = i.subject_area || "";
            const subjectLabel =
              subject && !subject.toLowerCase().startsWith("class_")
                ? subject
                : "";
            const label = text.slice(0, 60) || subjectLabel || `Query ${items.length - idx}`;
            return { id: i.id, label };
          })
        );
        if (!selectedQuery && items.length) {
          setSelectedQuery(items[0].id);
        }
      } catch {
        /* ignore */
      }
    };
    run();
  }, [selectedQuery]);

  useEffect(() => {
    if (!selectedQuery) return;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiConnectedGraph(selectedQuery);
        const safeNodes = (res.nodes || []).slice(0, 100);
        const nodeSet = new Set(safeNodes.map((n) => n.id));
        const safeEdges = (res.edges || []).filter(
          (e) => nodeSet.has(e.source) && nodeSet.has(e.target)
        );
        setNodes(safeNodes);
        setEdges(safeEdges);
        setSelectedId(null);
        setHistory([]);
        setHistoryIndex(-1);
        setPinned(new Set());
        stableRef.current = false;
        setActiveSources(new Set(safeNodes.map((n) => n.source || "Unknown")));
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load graph"));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [selectedQuery]);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const degreeMap = new Map<string, number>();
    edges.forEach((e) => {
      degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
      degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
    });
    const maxDegree = Math.max(...Array.from(degreeMap.values()), 0);
    const centerId =
      nodes.find((n) => degreeMap.get(n.id) === maxDegree)?.id || nodes[0]?.id;

    let maxRadius = 0;
    const clusterKeys = nodes.map((n) => {
      if (clusterMode === "venue") return n.venue || "Unknown";
      if (clusterMode === "source") return n.source || "Unknown";
      return "all";
    });
    const uniqueClusters = Array.from(new Set(clusterKeys));
    const clusterCenters = new Map<string, { x: number; y: number }>();
    const ring = Math.max(160, Math.min(centerX, centerY) - 60);
    uniqueClusters.forEach((key, idx) => {
      const angle = (idx / Math.max(uniqueClusters.length, 1)) * Math.PI * 2;
      clusterCenters.set(key, {
        x: centerX + Math.cos(angle) * ring,
        y: centerY + Math.sin(angle) * ring,
      });
    });
    const simNodes: SimNode[] = nodes.map((n, idx) => {
      const key =
        clusterMode === "venue"
          ? n.venue || "Unknown"
          : clusterMode === "source"
          ? n.source || "Unknown"
          : "all";
      const base = clusterCenters.get(key) || { x: centerX, y: centerY };
      const angle = (idx / Math.max(nodes.length, 1)) * Math.PI * 2;
      const radius = clusterMode === "none" ? 140 + Math.random() * 90 : 60 + Math.random() * 60;
      const degree = degreeMap.get(n.id) || 0;
      const size = clamp(6 + degree, 6, 22);
      if (size > maxRadius) maxRadius = size;
      return {
        ...n,
        x: base.x + Math.cos(angle) * radius,
        y: base.y + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        degree,
        radius: size,
        fx: n.id === centerId ? centerX : null,
        fy: n.id === centerId ? centerY : null,
      };
    });
    simNodes.forEach((n) => {
      if (n.id === centerId) n.radius = maxRadius + 6;
    });

    simRef.current = { nodes: simNodes, edges };
  }, [nodes, edges, clusterMode]);

  useEffect(() => {
    const step = () => {
      const sim = simRef.current;
      const canvas = canvasRef.current;
      if (!sim || !canvas) {
        animRef.current = requestAnimationFrame(step);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { nodes: simNodes, edges: simEdges } = sim;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      // physics
      if (!freeze && !stableRef.current) {
        let energy = 0;
      for (let i = 0; i < simNodes.length; i++) {
        const a = simNodes[i];
        for (let j = i + 1; j < simNodes.length; j++) {
          const b = simNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist2 = dx * dx + dy * dy + 0.01;
          const force = 120 / dist2;
          const fx = (dx / Math.sqrt(dist2)) * force;
          const fy = (dy / Math.sqrt(dist2)) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      const nodeById = new Map(simNodes.map((n) => [n.id, n]));
      simEdges.forEach((e) => {
        const s = nodeById.get(e.source);
        const t = nodeById.get(e.target);
        if (!s || !t) return;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const desired = 90;
        const strength = 0.015 * e.weight;
        const force = (dist - desired) * strength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      });

      simNodes.forEach((n) => {
        const dx = centerX - n.x;
        const dy = centerY - n.y;
        n.vx += dx * 0.0005;
        n.vy += dy * 0.0005;
        n.vx *= 0.85;
        n.vy *= 0.85;
        energy += Math.abs(n.vx) + Math.abs(n.vy);
        if (n.fx != null && n.fy != null) {
          n.x = n.fx;
          n.y = n.fy;
          n.vx = 0;
          n.vy = 0;
        } else {
          n.x += n.vx;
          n.y += n.vy;
        }
      });
      if (energy / Math.max(simNodes.length, 1) < 0.01) {
        stableRef.current = true;
      }
      }

      // hover detect (throttled)
      if (pointerRef.current.dirty) {
        pointerRef.current.dirty = false;
        const { x, y } = pointerRef.current;
        const world = screenToWorld(x, y);
        const hit = simNodes.find(
          (n) => Math.hypot(n.x - world.x, n.y - world.y) <= n.radius + 4
        );
        setHoverId(hit ? hit.id : null);
        setHoverPos(hit ? { x, y } : null);
      }

      // draw
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      if (viewTargetRef.current) {
        const target = viewTargetRef.current;
        const vx = viewRef.current.x + (target.x - viewRef.current.x) * 0.12;
        const vy = viewRef.current.y + (target.y - viewRef.current.y) * 0.12;
        const vs = viewRef.current.scale + (target.scale - viewRef.current.scale) * 0.12;
        viewRef.current = { x: vx, y: vy, scale: vs };
        if (
          Math.abs(target.x - vx) < 0.2 &&
          Math.abs(target.y - vy) < 0.2 &&
          Math.abs(target.scale - vs) < 0.002
        ) {
          viewRef.current = target;
          viewTargetRef.current = null;
        }
      }
      const { x: ox, y: oy, scale } = viewRef.current;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);

      const hoverSet = hoverId ? adj.get(hoverId) || new Set() : null;
      const focusRoot = hoverId;
      const depthLimit = neighborDepth;
      const depthSet = new Set<string>();
      if (focusRoot) {
        const queue: { id: string; d: number }[] = [{ id: focusRoot, d: 0 }];
        depthSet.add(focusRoot);
        while (queue.length) {
          const { id, d } = queue.shift()!;
          if (d >= depthLimit) continue;
          const neighbors = adj.get(id) || new Set();
          neighbors.forEach((n) => {
            if (!depthSet.has(n)) {
              depthSet.add(n);
              queue.push({ id: n, d: d + 1 });
            }
          });
        }
      }

      const nodeById = new Map(simNodes.map((n) => [n.id, n]));
      simEdges.forEach((e) => {
        const s = nodeById.get(e.source);
        const t = nodeById.get(e.target);
        if (!s || !t) return;
        if (depthSet.size && (!depthSet.has(s.id) || !depthSet.has(t.id))) return;
        if (!activeSources.has(s.source || "Unknown") || !activeSources.has(t.source || "Unknown")) return;
        const tkey = `${e.source}|${e.target}`;
        const rkey = `${e.target}|${e.source}`;
        const edgeType = edgeTypeLookup.get(tkey) || edgeTypeLookup.get(rkey);
        if (edgeMode === "author" && edgeType !== "author") return;
        if (edgeType === "author" && !edgeFilters.author) return;
        if (edgeType === "venue" && !edgeFilters.venue) return;
        if (edgeType === "year" && !edgeFilters.year) return;
        const isNeighbor =
          hoverSet && (hoverSet.has(s.id) || hoverSet.has(t.id) || s.id === hoverId);
        ctx.strokeStyle = isNeighbor ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)";
        ctx.lineWidth = Math.max(1, e.weight * 2) / scale;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      });

      simNodes.forEach((n) => {
        if (depthSet.size && !depthSet.has(n.id)) return;
        if (!activeSources.has(n.source || "Unknown")) return;
        const isNeighbor =
          hoverId &&
          (n.id === hoverId || (hoverSet && hoverSet.has(n.id)));
        const color = SOURCE_COLORS[n.source || "Unknown"] || SOURCE_COLORS.Unknown;
        const isHovered = hoverId === n.id;
        const isSelected = selectedId === n.id;
        if (isSelected) {
          ctx.beginPath();
          ctx.fillStyle = "rgba(250,204,21,0.18)";
          ctx.arc(n.x, n.y, n.radius + 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.strokeStyle = "rgba(250,204,21,0.45)";
          ctx.lineWidth = 2 / scale;
          ctx.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (hoverId) {
          ctx.fillStyle = isHovered ? "rgba(15,23,42,0.92)" : `${color}66`;
          ctx.strokeStyle = isHovered ? color : "rgba(255,255,255,0.1)";
        } else {
          ctx.fillStyle = isNeighbor ? color : `${color}CC`;
          ctx.strokeStyle = "rgba(255,255,255,0.12)";
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1 / scale;
        ctx.stroke();
        const showLabel = scale > 1.1 || isHovered || isSelected;
        if (showLabel) {
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.font = `${12 / scale}px Space Grotesk, sans-serif`;
          ctx.fillText(n.title.slice(0, 36), n.x + n.radius + 4, n.y + 4);
        }
      });

      // minimap
      const mmW = 140;
      const mmH = 90;
      const pad = 16;
      const mmX = width - mmW - pad;
      const mmY = height - mmH - pad;
      const xs = simNodes.map((n) => n.x);
      const ys = simNodes.map((n) => n.y);
      const minX = Math.min(...xs, 0);
      const maxX = Math.max(...xs, 1);
      const minY = Math.min(...ys, 0);
      const maxY = Math.max(...ys, 1);
      const scaleX = mmW / Math.max(maxX - minX, 1);
      const scaleY = mmH / Math.max(maxY - minY, 1);
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = "rgba(15,23,42,0.85)";
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(mmX, mmY, mmW, mmH, 8);
      ctx.fill();
      ctx.stroke();
      simNodes.forEach((n) => {
        const px = mmX + (n.x - minX) * scaleX;
        const py = mmY + (n.y - minY) * scaleY;
        ctx.fillStyle = n.id === selectedId ? "#FACC15" : "rgba(148,163,184,0.7)";
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      ctx.restore();
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [
    adj,
    hoverId,
    selectedId,
    neighborDepth,
    edgeMode,
    edgeFilters,
    activeSources,
    freeze,
  ]);

  const screenToWorld = (sx: number, sy: number) => {
    const { x, y, scale } = viewRef.current;
    return { x: (sx - x) / scale, y: (sy - y) / scale };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const zoom = e.deltaY > 0 ? 0.92 : 1.08;
      const next = clamp(viewRef.current.scale * zoom, 0.5, 2.4);
      const k = next / viewRef.current.scale;
      viewRef.current = {
        scale: next,
        x: (viewRef.current.x - mx) * k + mx,
        y: (viewRef.current.y - my) * k + my,
      };
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dragging = false;
    let last = { x: 0, y: 0 };

    const onDown = (e: MouseEvent) => {
        dragging = true;
        last = { x: e.clientX, y: e.clientY };
      };
    const onUp = () => {
      dragging = false;
    };
    const onMove = (e: MouseEvent) => {
      pointerRef.current = { x: e.offsetX, y: e.offsetY, dirty: true };
      if (!dragging) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      viewRef.current = {
        ...viewRef.current,
        x: viewRef.current.x + dx,
        y: viewRef.current.y + dy,
      };
      last = { x: e.clientX, y: e.clientY };
    };
    const onClick = (e: MouseEvent) => {
      const world = screenToWorld(e.offsetX, e.offsetY);
      const sim = simRef.current;
      if (!sim) return;
      const hit = sim.nodes.find(
        (n) => Math.hypot(n.x - world.x, n.y - world.y) <= n.radius + 4
      );
      if (!hit) {
        setSelectedId(null);
        return;
      }
      setSelectedId(hit.id);
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(hit.id);
        setHistoryIndex(next.length - 1);
        return next;
      });
      if (e.shiftKey) {
        setPinned((prev) => {
          const next = new Set(prev);
          next.delete(hit.id);
          return next;
        });
        hit.fx = null;
        hit.fy = null;
      } else {
        setPinned((prev) => new Set(prev).add(hit.id));
        hit.fx = hit.x;
        hit.fy = hit.y;
      }
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", onUp);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);
    return () => {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mouseleave", onUp);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
    };
  }, [historyIndex, history]);

  return (
    <PageShell title="Graph" subtitle="Connected Papers-style visualization">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="glass-soft rounded-2xl border border-white/10 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="input-field w-[240px] text-xs"
              value={selectedQuery || ""}
              onChange={(e) => setSelectedQuery(e.target.value)}
            >
              {queries.length === 0 && <option value="">No queries</option>}
              {queries.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                className="input-field w-[200px] text-xs"
                placeholder="Search paper..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const term = search.trim().toLowerCase();
                  if (!term) return;
                  const match = nodes.find((n) => n.title.toLowerCase().includes(term));
                  if (!match) return;
                  setSelectedId(match.id);
                  const sim = simRef.current;
                  const hit = sim?.nodes.find((n) => n.id === match.id);
                  if (hit) {
                    hit.fx = hit.x;
                    hit.fy = hit.y;
                  }
                }}
              />
              <VoiceButton value={search} onChange={setSearch} />
            </div>
            <button
              className="btn-secondary rounded-full px-3 py-2 text-xs"
              onClick={() => {
                const sim = simRef.current;
                if (!sim) return;
                const xs = sim.nodes.map((n) => n.x);
                const ys = sim.nodes.map((n) => n.y);
                const minX = Math.min(...xs, 0);
                const maxX = Math.max(...xs, 1);
                const minY = Math.min(...ys, 0);
                const maxY = Math.max(...ys, 1);
                const w = Math.max(maxX - minX, 1);
                const h = Math.max(maxY - minY, 1);
                const pad = 80;
                const canvasW = canvasRef.current?.clientWidth || 1;
                const canvasH = canvasRef.current?.clientHeight || 1;
                const scale = clamp(
                  Math.min((canvasW - pad) / w, (canvasH - pad) / h),
                  0.6,
                  2.0
                );
                const offsetX = (canvasW - w * scale) / 2 - minX * scale;
                const offsetY = (canvasH - h * scale) / 2 - minY * scale;
                viewTargetRef.current = { scale, x: offsetX, y: offsetY };
              }}
            >
              Fit to view
            </button>
            <button
              className="btn-secondary rounded-full px-3 py-2 text-xs"
              disabled={historyIndex <= 0}
              onClick={() => {
                const nextIndex = historyIndex - 1;
                const id = history[nextIndex];
                if (!id) return;
                setHistoryIndex(nextIndex);
                setSelectedId(id);
              }}
            >
              Back
            </button>
            <button
              className="btn-secondary rounded-full px-3 py-2 text-xs"
              disabled={historyIndex < 0 || historyIndex >= history.length - 1}
              onClick={() => {
                const nextIndex = historyIndex + 1;
                const id = history[nextIndex];
                if (!id) return;
                setHistoryIndex(nextIndex);
                setSelectedId(id);
              }}
            >
              Forward
            </button>
            <button
              className="btn-secondary rounded-full px-3 py-2 text-xs"
              onClick={() => setFreeze((v) => !v)}
            >
              {freeze ? "Resume physics" : "Freeze layout"}
            </button>
            <button
              className="btn-secondary rounded-full px-3 py-2 text-xs"
              onClick={() => {
                setPinned(new Set());
        stableRef.current = false;
                const sim = simRef.current;
                if (!sim) return;
                sim.nodes.forEach((n) => {
                  n.fx = null;
                  n.fy = null;
                });
              }}
              disabled={pinned.size === 0}
            >
              Clear pins
            </button>
            <button
              className="btn-secondary rounded-full px-3 py-2 text-xs"
              onClick={() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const legendItems = Object.entries(SOURCE_COLORS).filter(([k]) => activeSources.has(k));
                const exportCanvas = document.createElement("canvas");
                exportCanvas.width = canvas.width;
                exportCanvas.height = canvas.height;
                const ctx = exportCanvas.getContext("2d");
                if (!ctx) return;
                ctx.drawImage(canvas, 0, 0);
                ctx.save();
                ctx.fillStyle = "rgba(15,23,42,0.85)";
                ctx.fillRect(16, 16, 260, 24 + legendItems.length * 18);
                ctx.fillStyle = "rgba(255,255,255,0.9)";
                ctx.font = "12px Space Grotesk, sans-serif";
                ctx.fillText("Connected Graph", 26, 34);
                legendItems.forEach(([label, color], idx) => {
                  const y = 52 + idx * 18;
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(26, y - 5, 5, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.fillStyle = "rgba(255,255,255,0.8)";
                  ctx.fillText(label, 40, y);
                });
                ctx.restore();
                const url = exportCanvas.toDataURL("image/png");
                const a = document.createElement("a");
                a.href = url;
                a.download = "graph.png";
                a.click();
              }}
            >
              Export PNG
            </button>
            {loading && <span className="text-xs text-white/60">Loading...</span>}
            {error && <span className="text-xs text-red-300">{error}</span>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-white/70">
            <label className="flex items-center gap-2">
              <span>Neighbor depth</span>
              <input
                type="range"
                min={1}
                max={3}
                value={neighborDepth}
                onChange={(e) => setNeighborDepth(Number(e.target.value))}
              />
              <span>{neighborDepth}</span>
            </label>
            <label className="flex items-center gap-2">
              <span>Edges</span>
              <select
                className="input-field w-[140px] text-xs"
                value={edgeMode}
                onChange={(e) => setEdgeMode(e.target.value as "all" | "author")}
              >
                <option value="all">All similarity</option>
                <option value="author">Shared author only</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span>Clusters</span>
              <select
                className="input-field w-[140px] text-xs"
                value={clusterMode}
                onChange={(e) => setClusterMode(e.target.value as "none" | "source" | "venue")}
              >
                <option value="source">By source</option>
                <option value="venue">By venue</option>
                <option value="none">None</option>
              </select>
            </label>
            <div className="flex items-center gap-2">
              <span>Edge types</span>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={edgeFilters.author}
                  onChange={(e) =>
                    setEdgeFilters((prev) => ({ ...prev, author: e.target.checked }))
                  }
                />
                Author
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={edgeFilters.venue}
                  onChange={(e) =>
                    setEdgeFilters((prev) => ({ ...prev, venue: e.target.checked }))
                  }
                />
                Venue
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={edgeFilters.year}
                  onChange={(e) =>
                    setEdgeFilters((prev) => ({ ...prev, year: e.target.checked }))
                  }
                />
                Year
              </label>
            </div>
          </div>
          <div ref={wrapRef} className="relative mt-4 h-[520px] w-full">
            <canvas ref={canvasRef} className="h-full w-full rounded-2xl" />
            {hoveredNode && hoverPos && (
              <div
                className="absolute z-10 rounded-lg border border-white/10 bg-slate-900/90 px-3 py-2 text-[11px] text-white/80 shadow-lg"
                style={{ left: hoverPos.x + 12, top: hoverPos.y + 12 }}
              >
                <div className="text-[12px] font-semibold text-white">
                  {hoveredNode.title}
                </div>
                <div className="mt-1 text-white/60">
                  {hoveredNode.year ? `Year: ${hoveredNode.year}` : "Year: N/A"}
                </div>
                <div className="text-white/60">
                  {hoveredNode.venue ? `Venue: ${hoveredNode.venue}` : "Venue: N/A"}
                </div>
                <div className="text-white/60">
                  {hoveredNode.authors?.length
                    ? `Authors: ${hoveredNode.authors.slice(0, 3).join(", ")}${hoveredNode.authors.length > 3 ? "..." : ""}`
                    : "Authors: N/A"}
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-white/60">
            {Object.entries(SOURCE_COLORS).map(([k, v]) => (
              <button
                key={k}
                className={`inline-flex items-center gap-2 rounded-full px-2 py-1 border ${
                  activeSources.has(k) ? "border-white/30" : "border-white/10"
                }`}
                onClick={() => {
                  setActiveSources((prev) => {
                    const next = new Set(prev);
                    if (next.has(k)) next.delete(k);
                    else next.add(k);
                    if (next.size === 0) return new Set(Object.keys(SOURCE_COLORS));
                    return next;
                  });
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: v }} />
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-soft rounded-2xl border border-white/10 p-4">
          <div className="text-xs text-white/50">Paper detail</div>
          <div className="mt-2 text-sm font-semibold">
            {selectedNode?.title || "Click a node to inspect"}
          </div>
          <div className="mt-2 text-xs text-white/70">
            {selectedNode?.year ? `Year: ${selectedNode.year}` : "Year: Not available"}
          </div>
          <div className="mt-2 text-xs text-white/70">
            {selectedNode?.venue ? `Venue: ${selectedNode.venue}` : "Venue: Not available"}
          </div>
          <div className="mt-2 text-xs text-white/70">
            {selectedNode?.authors?.length
              ? `Authors: ${selectedNode.authors.join(", ")}`
              : "Authors: Not available"}
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
            <div className="text-white/50">Data quality</div>
            <div>
              {selectedNode?.authors?.length ? "Authors present" : "Missing authors"}
            </div>
            <div>
              {selectedNode?.venue ? "Venue present" : "Missing venue"}
            </div>
            <div>
              {selectedNode?.year ? "Year present" : "Missing year"}
            </div>
          </div>
          {selectedNode?.url && (
            <a
              className="btn-secondary mt-4 inline-flex rounded-xl px-3 py-2 text-xs"
              href={selectedNode.url}
              target="_blank"
              rel="noreferrer"
            >
              Open paper link
            </a>
          )}
          {pinnedNodes.length > 0 && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
              <div className="text-white/50">Pinned nodes</div>
              <div className="mt-2 space-y-1">
                {pinnedNodes.map((n) => (
                  <div key={n.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{n.title}</span>
                    <button
                      className="btn-ghost text-[10px]"
                      onClick={() => {
                        setPinned((prev) => {
                          const next = new Set(prev);
                          next.delete(n.id);
                          return next;
                        });
                        const sim = simRef.current;
                        const hit = sim?.nodes.find((x) => x.id === n.id);
                        if (hit) {
                          hit.fx = null;
                          hit.fy = null;
                        }
                      }}
                    >
                      Unpin
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 text-[11px] text-white/50">
            Query: {selectedQueryMeta || "Not available"}
          </div>
        </div>
      </div>
    </PageShell>
  );
}





