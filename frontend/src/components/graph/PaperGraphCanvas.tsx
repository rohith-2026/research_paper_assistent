import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from "d3-force";

type NodeGroup = "core" | "related" | "cluster";

type Node = {
  id: string;
  label: string;
  group: NodeGroup;
  degree: number;
  type?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

type Edge = {
  from: string;
  to: string;
  weight?: number;
  relation?: string | null;
};

const fallbackNodes: Node[] = [
  { id: "n1", label: "Graph Neural Networks", group: "core", degree: 6 },
  { id: "n2", label: "RAG Pipelines", group: "related", degree: 3 },
  { id: "n3", label: "Topic Modeling", group: "cluster", degree: 2 },
  { id: "n4", label: "Summarization", group: "related", degree: 4 },
  { id: "n5", label: "Citation Graphs", group: "cluster", degree: 2 },
  { id: "n6", label: "LLM Alignment", group: "cluster", degree: 2 },
];

const fallbackEdges: Edge[] = [
  { from: "n1", to: "n2" },
  { from: "n1", to: "n4" },
  { from: "n1", to: "n5" },
  { from: "n2", to: "n6" },
  { from: "n3", to: "n4" },
];

const colorMap: Record<NodeGroup, string> = {
  core: "rgba(16,185,129,0.95)",
  related: "rgba(74,144,255,0.95)",
  cluster: "rgba(74,144,255,0.65)",
};

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export default function PaperGraphCanvas({
  nodes,
  edges,
  showLabels = true,
  density = "sparse",
  focusTerm = "",
  resetKey = 0,
  onHover,
  onHoverEdge,
  onNodeClick,
  lockedNodeId = null,
}: {
  nodes?: { id: string; label: string; type?: string }[];
  edges?: { from: string; to: string; weight?: number; relation?: string | null }[];
  showLabels?: boolean;
  density?: "sparse" | "dense";
  focusTerm?: string;
  resetKey?: number;
  onHover?: (node: { id: string; label: string; degree: number; type?: string } | null) => void;
  onHoverEdge?: (edge: { from: string; to: string; weight?: number; relation?: string | null } | null) => void;
  onNodeClick?: (nodeId: string, label?: string) => void;
  lockedNodeId?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [last, setLast] = useState<{ x: number; y: number } | null>(null);
  const [touchDist, setTouchDist] = useState<number | null>(null);
  const [bounds, setBounds] = useState({ width: 720, height: 420 });
  const [layoutNodes, setLayoutNodes] = useState<Node[]>(fallbackNodes);
  const [layoutEdges, setLayoutEdges] = useState<Edge[]>(fallbackEdges);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<Edge | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hasRealNodes = !!nodes?.length;
  const simRef = useRef<ReturnType<typeof forceSimulation> | null>(null);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [isolatedNodeId, setIsolatedNodeId] = useState<string | null>(null);

  const focus = focusTerm.trim().toLowerCase();

  const normalized = useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return { nodes: fallbackNodes, edges: fallbackEdges };
    }

    const idSet = new Set(nodes.map((n) => n.id));
    const safeEdges = (edges || []).filter((e) => idSet.has(e.from) && idSet.has(e.to));
    const deg = new Map<string, number>();
    safeEdges.forEach((e) => {
      deg.set(e.from, (deg.get(e.from) || 0) + 1);
      deg.set(e.to, (deg.get(e.to) || 0) + 1);
    });
    nodes.forEach((n) => {
      if (!deg.has(n.id)) deg.set(n.id, 0);
    });

    const sorted = [...deg.values()].sort((a, b) => a - b);
    const p70 = sorted[Math.floor(sorted.length * 0.7)] ?? 0;
    const maxDegree = sorted[sorted.length - 1] ?? 0;

    const coreId =
      nodes.find((n) => n.type?.toLowerCase().includes("core"))?.id ||
      nodes.find((n) => n.type?.toLowerCase().includes("seed"))?.id ||
      nodes.find((n) => deg.get(n.id) === maxDegree)?.id ||
      nodes[0].id;

    const mapped = nodes.map((n) => {
      const degree = deg.get(n.id) || 0;
      const group: NodeGroup =
        n.id === coreId ? "core" : degree >= p70 ? "related" : "cluster";
      return {
        id: n.id,
        label: n.label,
        group,
        degree,
        type: n.type,
      } as Node;
    });

    return { nodes: mapped, edges: safeEdges };
  }, [nodes, edges]);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const update = () => {
      setBounds({
        width: Math.max(520, el.clientWidth),
        height: Math.max(320, el.clientHeight),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoom = e.deltaY > 0 ? 0.92 : 1.08;
      setScale((prev) => {
        const next = clamp(prev * zoom, 0.5, 2.6);
        const k = next / prev;
        setOffset((o) => ({
          x: (o.x - mouseX) * k + mouseX,
          y: (o.y - mouseY) * k + mouseY,
        }));
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const baseEdges = hasRealNodes ? normalized.edges : fallbackEdges;
    const cleaned = baseEdges.filter((e) => e.from && e.to);
    const filtered =
      density === "dense" ? cleaned : cleaned.filter((_, idx) => idx % 2 === 0);

    const simNodes = normalized.nodes.map((n) => ({
      ...n,
      x: bounds.width / 2 + (Math.random() - 0.5) * 140,
      y: bounds.height / 2 + (Math.random() - 0.5) * 120,
    }));
    const nodeIdSet = new Set(simNodes.map((n) => n.id));
    const safeLinks = filtered.filter((e) => nodeIdSet.has(e.from) && nodeIdSet.has(e.to));
    const simLinks = safeLinks.map((e) => ({
      ...e,
      source: e.from,
      target: e.to,
    }));
    if (lockedNodeId) {
      const locked = simNodes.find((n) => n.id === lockedNodeId);
      if (locked) {
        locked.fx = bounds.width / 2;
        locked.fy = bounds.height / 2;
      }
    }

    const sim = forceSimulation(simNodes as any)
      .force(
        "link",
        forceLink(simLinks)
          .id((d) => (d as Node).id)
          .distance((l) => {
            const link = l as { source: Node; target: Node };
            const minDegree = Math.min(link.source.degree, link.target.degree);
            const base = density === "dense" ? 70 : 100;
            return clamp(base + (6 - minDegree) * 6, 70, 160);
          })
          .strength(0.7)
      )
      .force(
        "charge",
        forceManyBody().strength(density === "dense" ? -90 : -180)
      )
      .force("center", forceCenter(bounds.width / 2, bounds.height / 2))
      .force(
        "collide",
        forceCollide()
          .radius((d) => (d.group === "core" ? 24 : d.group === "related" ? 18 : 14))
          .iterations(2)
      );

    let tick = 0;
    sim.on("tick", () => {
      tick += 1;
      if (tick % 6 === 0) setLayoutNodes([...simNodes]);
      if (tick > 60) {
        sim.stop();
        setLayoutNodes((prev) => prev.map((n) => ({ ...n, fx: n.x, fy: n.y })));
      }
    });

    sim.on("end", () => {
      setLayoutNodes([...simNodes]);
      setLayoutEdges(safeLinks);
    });

    sim.alpha(1).restart();
    simRef.current = sim;

    return () => {
      sim.stop();
      if (simRef.current === sim) {
        simRef.current = null;
      }
    };
  }, [normalized, bounds, density, lockedNodeId]);

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    setLast(null);
    setTouchDist(null);
  }, [resetKey]);

  const focusedNodes = useMemo(() => {
    if (!focus && !lockedNodeId) return new Set<string>();
    const set = new Set<string>();
    layoutNodes.forEach((n) => {
      if (lockedNodeId && n.id === lockedNodeId) set.add(n.id);
      if (focus && n.label.toLowerCase().includes(focus)) set.add(n.id);
    });
    return set;
  }, [focus, layoutNodes, lockedNodeId]);

  const coreNode = useMemo(() => {
    return layoutNodes.find((n) => n.group === "core") || null;
  }, [layoutNodes]);

  const boundsBox = useMemo(() => {
    if (!layoutNodes.length) return null;
    const xs = layoutNodes.map((n) => n.x ?? 0);
    const ys = layoutNodes.map((n) => n.y ?? 0);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { minX, maxX, minY, maxY };
  }, [layoutNodes]);

  const connectedSet = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const set = new Set<string>();
    layoutEdges.forEach((e) => {
      if (e.from === hoveredId) set.add(e.to);
      if (e.to === hoveredId) set.add(e.from);
    });
    set.add(hoveredId);
    return set;
  }, [hoveredId, layoutEdges]);

  const isolatedSet = useMemo(() => {
    if (!isolatedNodeId) return null;
    const set = new Set<string>();
    layoutEdges.forEach((e) => {
      if (e.from === isolatedNodeId) set.add(e.to);
      if (e.to === isolatedNodeId) set.add(e.from);
    });
    set.add(isolatedNodeId);
    return set;
  }, [isolatedNodeId, layoutEdges]);

  const edgeWeights = useMemo(() => {
    const weights = layoutEdges.map((e) => e.weight || 1);
    const min = Math.min(...weights, 1);
    const max = Math.max(...weights, 1);
    return { min, max };
  }, [layoutEdges]);

  const clusterEllipses = useMemo(() => {
    const groups: Record<NodeGroup, Node[]> = { core: [], related: [], cluster: [] };
    layoutNodes.forEach((n) => groups[n.group].push(n));
    return (["related", "cluster"] as NodeGroup[]).map((group) => {
      const nodes = groups[group];
      if (nodes.length < 2) return null;
      const xs = nodes.map((n) => n.x ?? 0);
      const ys = nodes.map((n) => n.y ?? 0);
      const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
      const rx = Math.max(60, Math.max(...xs.map((x) => Math.abs(x - cx))) + 40);
      const ry = Math.max(40, Math.max(...ys.map((y) => Math.abs(y - cy))) + 30);
      return { group, cx, cy, rx, ry };
    });
  }, [layoutNodes]);

  return (
    <div
      ref={ref}
      className="relative h-[540px] w-full rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_25%_20%,rgba(59,130,246,0.18),transparent_45%),radial-gradient(circle_at_70%_25%,rgba(16,185,129,0.14),transparent_50%),radial-gradient(circle_at_40%_85%,rgba(30,41,59,0.35),transparent_55%),linear-gradient(140deg,rgba(6,10,20,0.98),rgba(9,14,24,0.94))] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.55)]"
      onMouseMove={(e) => {
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
      }}
      onTouchStart={(e) => {
        if (e.touches.length === 2) {
          const a = e.touches.item(0);
          const b = e.touches.item(1);
          if (!a || !b) return;
          const dx = a.clientX - b.clientX;
          const dy = a.clientY - b.clientY;
          setTouchDist(Math.hypot(dx, dy));
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length === 2) {
          const a = e.touches.item(0);
          const b = e.touches.item(1);
          if (!a || !b) return;
          const dx = a.clientX - b.clientX;
          const dy = a.clientY - b.clientY;
          const dist = Math.hypot(dx, dy);
          if (touchDist) {
            const delta = (dist - touchDist) / 180;
            setScale((s) => clamp(s + delta, 0.5, 2.4));
          }
          setTouchDist(dist);
        }
      }}
      onTouchEnd={() => {
        setTouchDist(null);
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
        <div className="glass-soft border border-white/10 rounded-full px-4 py-2 text-xs text-white/70 backdrop-blur">
          Drag nodes to reposition - Scroll to zoom
        </div>
        <button
          className="glass-soft border border-white/10 rounded-full px-3 py-1.5 text-[11px] text-white/70"
          onClick={() => {
            if (!boundsBox) return;
            const padding = 40;
            const w = boundsBox.maxX - boundsBox.minX + padding * 2;
            const h = boundsBox.maxY - boundsBox.minY + padding * 2;
            const sx = bounds.width / Math.max(w, 1);
            const sy = bounds.height / Math.max(h, 1);
            const nextScale = clamp(Math.min(sx, sy), 0.5, 2.2);
            const centerX = (boundsBox.minX + boundsBox.maxX) / 2;
            const centerY = (boundsBox.minY + boundsBox.maxY) / 2;
            const targetX = bounds.width / 2 - centerX * nextScale;
            const targetY = bounds.height / 2 - centerY * nextScale;
            setScale(nextScale);
            setOffset({ x: targetX, y: targetY });
          }}
        >
          Fit to view
        </button>
        <button
          className="glass-soft border border-white/10 rounded-full px-3 py-1.5 text-[11px] text-white/70"
          onClick={() => setShowMiniMap((s) => !s)}
        >
          {showMiniMap ? "Hide map" : "Show map"}
        </button>
        <button
          className="glass-soft border border-white/10 rounded-full px-3 py-1.5 text-[11px] text-white/70"
          onClick={() => setIsolatedNodeId(null)}
          disabled={!isolatedNodeId}
        >
          Clear focus
        </button>
      </div>
      {coreNode && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-900/80 px-5 py-2 text-[11px] text-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur">
          {coreNode.label}
        </div>
      )}

      <div
        className="w-full h-full"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: "center",
          transition: "transform 120ms ease-out",
        }}
      >
        <svg
          viewBox={`0 0 ${bounds.width} ${bounds.height}`}
          className="w-full h-full"
          onPointerMove={(e) => {
            if (!dragNodeId || !ref.current) return;
            const rect = ref.current.getBoundingClientRect();
            const x = (e.clientX - rect.left - offset.x) / scale;
            const y = (e.clientY - rect.top - offset.y) / scale;
            setLayoutNodes((prev) =>
              prev.map((n) => (n.id === dragNodeId ? { ...n, x, y, fx: x, fy: y } : n))
            );
            const sim = simRef.current;
            if (sim) sim.alpha(0.2).restart();
          }}
          onPointerUp={() => {
            if (!dragNodeId) return;
            const releasedId = dragNodeId;
            setDragNodeId(null);
            setLayoutNodes((prev) =>
              prev.map((n) => (n.id === releasedId ? { ...n, fx: null, fy: null } : n))
            );
          }}
          onPointerLeave={() => {
            if (!dragNodeId) return;
            const releasedId = dragNodeId;
            setDragNodeId(null);
            setLayoutNodes((prev) =>
              prev.map((n) => (n.id === releasedId ? { ...n, fx: null, fy: null } : n))
            );
          }}
        >
          {coreNode && (
            <>
              <circle
                cx={coreNode.x ?? 0}
                cy={coreNode.y ?? 0}
                r={165}
                fill="none"
                stroke="rgba(59,130,246,0.12)"
                strokeWidth="16"
                strokeDasharray="320 1200"
                strokeLinecap="round"
              />
              <circle
                cx={coreNode.x ?? 0}
                cy={coreNode.y ?? 0}
                r={130}
                fill="none"
                stroke="rgba(16,185,129,0.22)"
                strokeWidth="10"
                strokeDasharray="220 1000"
                strokeLinecap="round"
              />
              <circle
                cx={coreNode.x ?? 0}
                cy={coreNode.y ?? 0}
                r={98}
                fill="rgba(16,185,129,0.03)"
                stroke="rgba(16,185,129,0.16)"
                strokeWidth="1"
              />
              <circle
                cx={coreNode.x ?? 0}
                cy={coreNode.y ?? 0}
                r={72}
                fill="rgba(16,185,129,0.06)"
                stroke="rgba(16,185,129,0.22)"
                strokeWidth="1"
              />
            </>
          )}
          {clusterEllipses.map((ellipse) => {
            if (!ellipse) return null;
            const label = ellipse.group === "related" ? "Strongly connected" : "Peripheral";
            return (
              <g key={ellipse.group}>
                <ellipse
                  cx={ellipse.cx}
                  cy={ellipse.cy}
                  rx={ellipse.rx}
                  ry={ellipse.ry}
                  fill={ellipse.group === "related" ? "rgba(59,130,246,0.08)" : "rgba(139,92,246,0.08)"}
                  stroke={ellipse.group === "related" ? "rgba(59,130,246,0.25)" : "rgba(139,92,246,0.25)"}
                  strokeWidth="1"
                />
                <text
                  x={ellipse.cx}
                  y={ellipse.cy - ellipse.ry + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill={ellipse.group === "related" ? "rgba(147,197,253,0.9)" : "rgba(196,181,253,0.9)"}
                  fontFamily="Space Grotesk, sans-serif"
                >
                  {label}
                </text>
              </g>
            );
          })}
          {layoutEdges.map((e, i) => {
            const a = layoutNodes.find((n) => n.id === e.from);
            const b = layoutNodes.find((n) => n.id === e.to);
            if (!a || !b) return null;
            if (isolatedSet && (!isolatedSet.has(a.id) || !isolatedSet.has(b.id))) {
              return null;
            }
            const focused =
              focusedNodes.size === 0 ||
              focusedNodes.has(a.id) ||
              focusedNodes.has(b.id);
            const coreEdge = a.group === "core" || b.group === "core";
            const weight = e.weight || 1;
            const weightScale =
              edgeWeights.max === edgeWeights.min
                ? 1
                : (weight - edgeWeights.min) / (edgeWeights.max - edgeWeights.min);
            const strokeWidth = clamp(0.9 + weightScale * 1.6, 0.8, 2.6);
            const edgeOpacity = scale > 1.2 ? 0.5 : 0.2;
            return (
              <motion.line
                key={`${e.from}-${e.to}-${i}`}
                x1={a.x ?? 0}
                y1={a.y ?? 0}
                x2={b.x ?? 0}
                y2={b.y ?? 0}
                stroke={coreEdge ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}
                strokeWidth={coreEdge ? strokeWidth : strokeWidth}
                opacity={coreEdge ? edgeOpacity + 0.1 : edgeOpacity}
                onMouseEnter={() => {
                  setHoveredEdge(e);
                  onHoverEdge?.(e);
                }}
                onMouseLeave={() => {
                  setHoveredEdge(null);
                  onHoverEdge?.(null);
                }}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: i * 0.02 }}
              />
            );
          })}

          {layoutNodes.map((n, i) => {
            const focused = focusedNodes.size === 0 || focusedNodes.has(n.id);
            const connected = connectedSet.size === 0 || connectedSet.has(n.id);
            const isolated = isolatedSet ? isolatedSet.has(n.id) : true;
            const nodeOpacity = focused ? (connected && isolated ? 1 : 0.45) : 0.2;
            const labelVisible =
              showLabels && n.group === "core" && scale > 1.05;
            return (
              <motion.g
                key={n.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                onMouseEnter={() => {
                  setHoveredId(n.id);
                  onHover?.({ id: n.id, label: n.label, degree: n.degree, type: n.type });
                }}
                onMouseLeave={() => {
                  setHoveredId(null);
                  onHover?.(null);
                }}
                onClick={() => onNodeClick?.(n.id, n.label)}
                onDoubleClick={() => setIsolatedNodeId((prev) => (prev === n.id ? null : n.id))}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDragNodeId(n.id);
                  const rect = ref.current?.getBoundingClientRect();
                  if (rect) {
                    const x = (e.clientX - rect.left - offset.x) / scale;
                    const y = (e.clientY - rect.top - offset.y) / scale;
                    setLayoutNodes((prev) =>
                      prev.map((p) => (p.id === n.id ? { ...p, x, y, fx: x, fy: y } : p))
                    );
                    const sim = simRef.current;
                    if (sim) sim.alpha(0.2).restart();
                  }
                }}
                onPointerUp={() => {
                  setDragNodeId(null);
                  setLayoutNodes((prev) =>
                    prev.map((p) => (p.id === n.id ? { ...p, fx: null, fy: null } : p))
                  );
                }}
                style={{ cursor: "grab" }}
              >
                {hoveredId === n.id && (
                  <circle
                    cx={n.x ?? 0}
                    cy={n.y ?? 0}
                    r={n.group === "core" ? 30 : 22}
                    fill="rgba(255,255,255,0.06)"
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth="1"
                    opacity={nodeOpacity}
                  />
                )}
                {n.group === "core" && (
                  <circle
                    cx={n.x ?? 0}
                    cy={n.y ?? 0}
                    r={36}
                    fill="rgba(16,185,129,0.08)"
                    stroke="rgba(16,185,129,0.25)"
                    strokeWidth="1"
                    opacity={nodeOpacity}
                  />
                )}
                {n.group === "core" && (
                  <circle
                    cx={n.x ?? 0}
                    cy={n.y ?? 0}
                    r={28}
                    fill="rgba(16,185,129,0.12)"
                    stroke="rgba(16,185,129,0.4)"
                    strokeWidth="1"
                    opacity={nodeOpacity}
                  />
                )}
                <circle
                  cx={n.x ?? 0}
                  cy={n.y ?? 0}
                  r={n.group === "core" ? 18 : 9}
                  fill={colorMap[n.group]}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1"
                  opacity={nodeOpacity}
                />
                {labelVisible && (
                  <text
                    x={(n.x ?? 0) + 16}
                    y={(n.y ?? 0) + 4}
                    fill={focused ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)"}
                    fontSize="10"
                    fontFamily="Space Grotesk, sans-serif"
                  >
                    {n.label}
                  </text>
                )}
              </motion.g>
            );
          })}
        </svg>
      </div>
      {hoveredEdge && (
        <div
          className="absolute z-20 pointer-events-none glass-soft border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white/80"
          style={{ left: mousePos.x - 120, top: mousePos.y - 80 }}
        >
          <div className="text-white/60">Connection</div>
          <div>
            {hoveredEdge.from.slice(0, 6)} {"->"} {hoveredEdge.to.slice(0, 6)}
          </div>
          {hoveredEdge.relation && (
            <div className="text-white/60">Relation: {hoveredEdge.relation}</div>
          )}
          {hoveredEdge.weight && (
            <div className="text-white/60">Weight: {hoveredEdge.weight}</div>
          )}
        </div>
      )}
      {showMiniMap && boundsBox && (
        <div className="absolute bottom-4 right-4 rounded-2xl border border-white/10 bg-slate-900/80 p-2 text-[10px] text-white/60 backdrop-blur">
          <div className="mb-2 text-[10px] text-white/50">Mini map</div>
          <svg width={140} height={90} viewBox={`0 0 ${bounds.width} ${bounds.height}`}>
            {layoutEdges.map((e, i) => {
              const a = layoutNodes.find((n) => n.id === e.from);
              const b = layoutNodes.find((n) => n.id === e.to);
              if (!a || !b) return null;
              return (
                <line
                  key={`mm-${i}`}
                  x1={a.x ?? 0}
                  y1={a.y ?? 0}
                  x2={b.x ?? 0}
                  y2={b.y ?? 0}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />
              );
            })}
            {layoutNodes.map((n) => (
              <circle
                key={`mm-${n.id}`}
                cx={n.x ?? 0}
                cy={n.y ?? 0}
                r={3}
                fill={n.group === "core" ? "rgba(16,185,129,0.9)" : "rgba(74,144,255,0.7)"}
              />
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}
