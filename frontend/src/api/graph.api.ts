import api from "./axios";

export type GraphNode = {
  id: string;
  label: string;
  type?: string;
};

export type GraphEdge = {
  from: string;
  to: string;
  weight?: number;
  relation?: string | null;
};

export type GraphResponse = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type ConnectedNode = {
  id: string;
  title: string;
  year?: number | null;
  venue?: string | null;
  authors?: string[] | null;
  source?: string | null;
  url?: string | null;
};

export type ConnectedEdge = {
  source: string;
  target: string;
  weight: number;
  type: "similarity";
};

export type ConnectedGraphResponse = {
  nodes: ConnectedNode[];
  edges: ConnectedEdge[];
};

export async function apiGraphForQuery(query_id: string) {
  const res = await api.get<GraphResponse>(`/graph/query/${query_id}`);
  return res.data;
}

export async function apiGraphForPaper(paper_id: string, limit = 50) {
  const res = await api.get<GraphResponse>(`/graph/paper/${paper_id}`, {
    params: { limit },
  });
  return res.data;
}

export async function apiGraphNeighbors(paper_id: string, limit = 20) {
  const res = await api.get<GraphEdge[]>(`/graph/neighbors/${paper_id}`, {
    params: { limit },
  });
  return res.data;
}

export async function apiConnectedGraph(query_id: string) {
  const res = await api.get<ConnectedGraphResponse>(`/graph/${query_id}`);
  return res.data;
}
