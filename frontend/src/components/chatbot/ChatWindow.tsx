import { useEffect, useRef, useState } from "react";
import MessageBubble from "./MessageBubble";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: string | Record<string, unknown>;
};

type ChatWindowProps = {
  messages: ChatMessage[];
};

export default function ChatWindow({ messages }: ChatWindowProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showJump, setShowJump] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const threshold = 120;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      setShowJump(!atBottom);
    };
    el.addEventListener("scroll", onScroll);
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="glass rounded-2xl p-5 h-[420px] overflow-y-auto scrollbar-custom border border-white/10 space-y-3"
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} meta={m.meta} />
        ))}
      </div>
      {showJump && (
        <button
          className="btn-secondary rounded-full px-3 py-1.5 text-xs absolute bottom-3 right-3"
          onClick={() => {
            const el = containerRef.current;
            if (el) el.scrollTop = el.scrollHeight;
          }}
        >
          Jump to latest
        </button>
      )}
    </div>
  );
}
