import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import ChatWindow from "../../components/chatbot/ChatWindow";
import ChatInput from "../../components/chatbot/ChatInput";
import Loader from "../../components/ui/Loader";
import VoiceButton from "../../components/ui/VoiceButton";
import {
  apiAskChatbot,
  apiCreateChatSession,
  apiGetChatMessages,
  apiListChatSessions,
  apiRenameChatSession,
  apiClearChatMessages,
  apiDeleteChatSession,
  ChatMessage,
  ChatSession,
} from "../../api/chatbot.api";
import { apiHistory, apiPapersByQuery, HistoryItem, QueryPaper } from "../../api/assistant.api";
import { getErrorMessage } from "../../utils/errors";
import { getIstHour } from "../../utils/time";

type UIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: Record<string, unknown>;
};

export default function Chatbot() {
  const [params] = useSearchParams();
  const paperId = params.get("paper_id");
  const queryIdParam = params.get("query_id");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [queryPapers, setQueryPapers] = useState<QueryPaper[]>([]);
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
  const [streamIntervalId, setStreamIntervalId] = useState<number | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionTitleDraft, setSessionTitleDraft] = useState("");
  const [userName, setUserName] = useState("there");

  const suggestions = [
    "Summarize the key findings from the selected paper.",
    "What are the main methods used in this study?",
    "List the limitations or open questions.",
    "How does this paper relate to the previous query?",
  ];

  const responseStyleOptions = ["Concise", "Detailed"] as const;
  const [responseStyle, setResponseStyle] = useState<(typeof responseStyleOptions)[number]>("Concise");

  const buildGreeting = () => {
    const hour = getIstHour();
    const timeOfDay =
      hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return `${timeOfDay}, ${userName}. What would you like to explore today?`;
  };

  const greetingMessage = (): UIMessage => ({
    id: `greet-${Date.now()}`,
    role: "assistant",
    content: buildGreeting(),
    meta: { system: true },
  });

  const filteredSessions = useMemo(() => {
    if (!sessionSearch.trim()) return sessions;
    const q = sessionSearch.trim().toLowerCase();
    return sessions.filter((s) => (s.title || "").toLowerCase().includes(q));
  }, [sessions, sessionSearch]);

  const formatDate = (value?: string | null) => {
    if (!value) return "New session";
    try {
      return new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "New session";
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rpa_user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.name) setUserName(u.name);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoadingSessions(true);
        const list = await apiListChatSessions();
        setSessions(list || []);
        if (list && list.length) {
          setActiveSession(list[0].id);
        } else {
          const created = await apiCreateChatSession();
          setActiveSession(created.session_id);
          setSessions([{ id: created.session_id, user_id: "", title: "New session" }]);
          setMessages([greetingMessage()]);
        }
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load sessions."));
      } finally {
        setLoadingSessions(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await apiHistory(50, 0);
        const items = res.items || [];
        setHistory(items);
        if (!selectedQueryId && queryIdParam) {
          setSelectedQueryId(queryIdParam);
        } else if (!selectedQueryId && items.length) {
          setSelectedQueryId(items[0].id);
        }
      } catch {
        // ignore
      }
    };
    run();
  }, [selectedQueryId, queryIdParam]);

  useEffect(() => {
    const run = async () => {
      if (!selectedQueryId) {
        setQueryPapers([]);
        setSelectedPaperIds([]);
        return;
      }
      try {
        const rows = await apiPapersByQuery(selectedQueryId, 10);
        setQueryPapers(rows || []);
        setSelectedPaperIds((prev) => {
          if (prev.length) return prev;
          if (paperId) {
            const match = rows?.find((p) => p.paper_uid === paperId);
            if (match?.id) return [match.id];
          }
          const first = rows?.[0]?.id;
          return first ? [first] : [];
        });
      } catch {
        setQueryPapers([]);
      }
    };
    run();
  }, [selectedQueryId, paperId]);

  useEffect(() => {
    const run = async () => {
      if (!activeSession) return;
      const cached = localStorage.getItem(`chat_messages_${activeSession}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as UIMessage[];
          if (parsed?.length) setMessages(parsed);
        } catch {
          // ignore
        }
      }
      try {
        setLoadingMessages(true);
        const msgs = await apiGetChatMessages(activeSession);
        const mapped: UIMessage[] = (msgs || []).map((m: ChatMessage) => ({
          id: m.id,
          role: (m.role === "user" ? "user" : "assistant"),
          content: m.content,
          meta: m.meta || {},
        }));
        if (mapped.length) {
          setMessages(mapped);
        } else {
          setMessages([greetingMessage()]);
        }
      } catch {
        // ignore
      } finally {
        setLoadingMessages(false);
      }
    };
    run();
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession) return;
    try {
      localStorage.setItem(
        `chat_messages_${activeSession}`,
        JSON.stringify(messages)
      );
    } catch {
      // ignore
    }
  }, [messages, activeSession]);

  const onSend = () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput("");
    const run = async () => {
      try {
        setSending(true);
        const stylePrefix =
          responseStyle === "Concise"
            ? "Answer concisely. "
            : "Answer in detail. ";
        const finalMessage = `${stylePrefix}${msg}`;

        const res = await apiAskChatbot(
          finalMessage,
          activeSession || undefined,
          selectedPaperIds.length ? selectedPaperIds : paperId ? [paperId] : undefined
        );
        const noSources = !res.sources || res.sources.length === 0;
        const userId = String(Date.now());
        const assistantId = String(Date.now() + 1);
        const sourceLinks: Record<string, string> = {};
        for (const p of queryPapers) {
          const title = (p.title || "").trim();
          if (title && p.url) sourceLinks[title] = p.url;
        }

        setMessages((prev) => [
          ...prev,
          { id: userId, role: "user", content: msg, meta: {} },
          {
            id: assistantId,
            role: "assistant",
            content: "Thinking...",
            meta: { sources: res.sources, sourceLinks, warning: noSources },
          },
        ]);

        let i = 0;
        const text = res.answer || "";
        if (streamIntervalId) {
          window.clearInterval(streamIntervalId);
        }
        const timer = window.setInterval(() => {
          i = Math.min(i + 6, text.length);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: text.slice(0, i) } : m
            )
          );
          if (i >= text.length) clearInterval(timer);
        }, 20);
        setStreamIntervalId(timer);
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Chat failed."));
      } finally {
        setSending(false);
      }
    };
    run();
  };

  const stopStreaming = () => {
    if (streamIntervalId) {
      window.clearInterval(streamIntervalId);
      setStreamIntervalId(null);
    }
    setSending(false);
  };

  const regenerateLast = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser?.content) return;
    setInput(lastUser.content);
    onSend();
  };

  const createNewSession = async () => {
    try {
      const created = await apiCreateChatSession();
      const next = {
        id: created.session_id,
        user_id: "",
        title: "New session",
      };
      setSessions((prev) => [next, ...prev]);
      setActiveSession(created.session_id);
      setMessages([greetingMessage()]);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to create session."));
    }
  };

  const clearActiveSession = async () => {
    if (!activeSession) return;
    try {
      await apiClearChatMessages(activeSession);
      setMessages([greetingMessage()]);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to clear messages."));
    }
  };

  const deleteActiveSession = async () => {
    if (!activeSession) return;
    try {
      await apiDeleteChatSession(activeSession);
      const remaining = sessions.filter((s) => s.id !== activeSession);
      setSessions(remaining);
      const nextId = remaining[0]?.id || null;
      setActiveSession(nextId);
      setMessages(nextId ? [] : [greetingMessage()]);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to delete session."));
    }
  };

  const startRename = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setSessionTitleDraft(session.title || "");
  };

  const saveRename = async (sessionId: string) => {
    const title = sessionTitleDraft.trim();
    if (!title) return;
    try {
      const updated = await apiRenameChatSession(sessionId, title);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: updated.title } : s))
      );
      setEditingSessionId(null);
      setSessionTitleDraft("");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to rename session."));
    }
  };

  return (
    <PageShell title="AI Chatbot" subtitle="Context-aware research assistant">
      <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
        <div className="glass rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-white/50 uppercase tracking-[0.2em]">
              Sessions
            </div>
            <button
              className="btn-secondary px-3 py-1.5 rounded-xl text-xs"
              onClick={createNewSession}
              disabled={loadingSessions}
            >
              New
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              className="input-field text-xs flex-1"
              placeholder="Search sessions..."
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
            />
            <VoiceButton value={sessionSearch} onChange={setSessionSearch} />
          </div>
          <div className="mt-4 space-y-2">
            {loadingSessions && (
              <div className="text-xs text-white/60">Loading sessions...</div>
            )}
            {!loadingSessions && filteredSessions.length === 0 && (
              <div className="text-xs text-white/60">No sessions found.</div>
            )}
            {filteredSessions.map((s) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveSession(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveSession(s.id);
                  }
                }}
                className={`w-full text-left glass-soft rounded-xl p-3 border cursor-pointer ${
                  activeSession === s.id
                    ? "border-emerald-300/30 bg-emerald-400/10"
                    : "border-white/10"
                } hover:border-white/20`}
              >
                {editingSessionId === s.id ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        className="input-field text-xs flex-1"
                        value={sessionTitleDraft}
                        onChange={(e) => setSessionTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveRename(s.id);
                          }
                        }}
                      />
                      <VoiceButton value={sessionTitleDraft} onChange={setSessionTitleDraft} />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="btn-secondary rounded-xl px-3 py-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveRename(s.id);
                        }}
                      >
                        Save
                      </button>
                      <button
                        className="btn-secondary rounded-xl px-3 py-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-semibold">{s.title}</div>
                    <div className="text-xs text-white/50">
                      {formatDate(s.last_used_at)}
                    </div>
                    <div className="mt-2">
                      <button
                        className="btn-secondary rounded-xl px-3 py-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          startRename(s);
                        }}
                      >
                        Rename
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-white/50 mb-2">Context</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs text-white/50">Query</label>
                <select
                  className="input-field mt-2"
                  value={selectedQueryId || ""}
                  onChange={(e) => setSelectedQueryId(e.target.value)}
                >
                  {history.length === 0 && <option value="">No queries</option>}
                  {history.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.subject_area || "Unknown"} - {h.text || h.input_text || "Query"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50">Papers</label>
                <div className="mt-2 max-h-36 overflow-y-auto scrollbar-custom space-y-2">
                  {queryPapers.length === 0 && (
                    <div className="text-xs text-white/60">No papers found.</div>
                  )}
                  {queryPapers.map((p) => {
                    const active = selectedPaperIds.includes(p.id || "");
                    return (
                      <button
                        key={p.id}
                        className={`w-full text-left px-3 py-2 rounded-xl border text-xs ${
                          active
                            ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                            : "border-white/10 bg-white/5 text-white/70"
                        }`}
                        onClick={() => {
                          if (!p.id) return;
                          setSelectedPaperIds((prev) =>
                            prev.includes(p.id)
                              ? prev.filter((id) => id !== p.id)
                              : [...prev, p.id]
                          );
                        }}
                      >
                        {p.title || "Untitled paper"}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-white/50">
                  <span className="px-2 py-1 rounded-full border border-white/10">
                    Selected: {selectedPaperIds.length}
                  </span>
                  <button
                    className="btn-secondary rounded-xl px-3 py-1 text-xs"
                    onClick={() => setSelectedPaperIds([])}
                  >
                    Clear selection
                  </button>
                </div>
              </div>
            </div>
            {paperId && (
              <div className="mt-3 text-xs text-white/60">
                Tip: This chat is scoped to the selected query papers.
              </div>
            )}
            {!selectedPaperIds.length && !paperId && (
              <div className="mt-3 text-xs text-red-300">
                No context selected. Answers may be incomplete.
              </div>
            )}
          </div>

          {paperId && (
            <div className="glass rounded-2xl p-4 border border-white/10 text-xs text-white/70">
              Context: This chat is scoped to the selected paper.
            </div>
          )}
          <ChatWindow messages={messages} />
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn-secondary rounded-full px-3 py-1.5 text-xs"
              onClick={clearActiveSession}
              disabled={!activeSession || !messages.length}
            >
              Clear chat
            </button>
            <button
              className="btn-secondary rounded-full px-3 py-1.5 text-xs"
              onClick={deleteActiveSession}
              disabled={!activeSession}
            >
              Delete session
            </button>
          </div>
          {loadingMessages && (
            <div className="glass rounded-2xl p-4 border border-white/10">
              <Loader size="sm" text="Loading messages..." />
            </div>
          )}
          {sending && (
            <div className="glass rounded-2xl p-4 border border-white/10 flex items-center justify-between">
              <Loader size="sm" text="Assistant is thinking..." />
              <button
                className="btn-secondary rounded-xl px-3 py-1.5 text-xs"
                onClick={stopStreaming}
              >
                Stop
              </button>
            </div>
          )}
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={onSend}
            disabled={sending}
          />
          <div className="glass rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-white/50 mb-2">Response Style</div>
            <div className="flex flex-wrap gap-2">
              {responseStyleOptions.map((opt) => (
                <button
                  key={opt}
                  className={`btn-secondary rounded-full px-3 py-1.5 text-xs ${
                    responseStyle === opt ? "shadow-glow" : ""
                  }`}
                  onClick={() => setResponseStyle(opt)}
                >
                  {opt}
                </button>
              ))}
              <button
                className="btn-secondary rounded-full px-3 py-1.5 text-xs"
                onClick={regenerateLast}
                disabled={!messages.some((m) => m.role === "user")}
              >
                Regenerate last
              </button>
            </div>
          </div>
          {!messages.length && !loadingMessages && (
            <div className="glass rounded-2xl p-4 text-sm text-white/60">
              No messages yet. Start a new conversation.
            </div>
          )}
          {!sending && (
            <div className="glass rounded-2xl p-4 border border-white/10">
              <div className="text-xs text-white/50 mb-2">Suggestions</div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="btn-secondary rounded-full px-3 py-1.5 text-xs"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <div className="text-xs text-red-300">{error}</div>}
        </div>
      </div>
    </PageShell>
  );
}
