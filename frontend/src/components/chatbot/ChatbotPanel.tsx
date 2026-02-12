import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import ChatWindow from "./ChatWindow";
import ChatInput from "./ChatInput";
import Loader from "../ui/Loader";
import {
  apiAskChatbot,
  apiCreateChatSession,
  apiGetChatMessages,
  apiListChatSessions,
  ChatMessage,
} from "../../api/chatbot.api";
import { getErrorMessage } from "../../utils/errors";

type UIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: Record<string, unknown>;
};

type ChatbotPanelProps = {
  contextLabel?: string;
  paperIds?: string[];
  sourceLinks?: Record<string, string>;
};

export default function ChatbotPanel({
  contextLabel,
  paperIds,
  sourceLinks,
}: ChatbotPanelProps) {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamIntervalId, setStreamIntervalId] = useState<number | null>(null);
  const [responseStyle, setResponseStyle] = useState<"Concise" | "Detailed">(
    "Concise"
  );

  const suggestions = [
    "Summarize the key findings from the selected paper.",
    "What are the main methods used in this study?",
    "List the limitations or open questions.",
    "What should I read next based on this paper?",
  ];

  useEffect(() => {
    const run = async () => {
      try {
        setLoadingSessions(true);
        const list = await apiListChatSessions();
        if (list && list.length) {
          setActiveSession(list[0].id);
        } else {
          const created = await apiCreateChatSession();
          setActiveSession(created.session_id);
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
      if (!activeSession) return;
      try {
        setLoadingMessages(true);
        const msgs = await apiGetChatMessages(activeSession);
        const mapped: UIMessage[] = (msgs || []).map((m: ChatMessage) => ({
          id: m.id,
          role: (m.role === "user" ? "user" : "assistant"),
          content: m.content,
          meta: m.meta || {},
        }));
        setMessages(mapped);
      } catch {
        // ignore
      } finally {
        setLoadingMessages(false);
      }
    };
    run();
  }, [activeSession]);

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
          paperIds && paperIds.length ? paperIds : undefined
        );
        const userId = String(Date.now());
        const assistantId = String(Date.now() + 1);
        const noSources = !res.sources || res.sources.length === 0;

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
        if (streamIntervalId) window.clearInterval(streamIntervalId);
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

  const contextHint = useMemo(() => {
    if (contextLabel) return `Context: ${contextLabel}`;
    return "Context: Selected papers";
  }, [contextLabel]);

  return (
    <div className="glass rounded-2xl p-5 border border-white/10 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-white/50">Chatbot</div>
          <div className="text-sm text-white/70">{contextHint}</div>
        </div>
        <button
          className="btn-secondary rounded-xl px-3 py-1.5 text-xs"
          onClick={() => setMessages([])}
          disabled={!messages.length}
        >
          Clear
        </button>
      </div>

      {loadingSessions && (
        <div className="text-xs text-white/60">Loading sessions...</div>
      )}
      {!loadingSessions && (
        <>
          <ChatWindow messages={messages} />
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
          <ChatInput value={input} onChange={setInput} onSend={onSend} disabled={sending} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/50">Style:</span>
            {(["Concise", "Detailed"] as const).map((opt) => (
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
              onClick={onSend}
              disabled={sending || !input.trim()}
            >
              <RefreshCw className="w-3 h-3" />
              Regenerate
            </button>
          </div>
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
        </>
      )}

      {error && <div className="text-xs text-red-300">{error}</div>}
    </div>
  );
}
