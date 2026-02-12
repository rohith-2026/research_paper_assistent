import { motion } from "framer-motion";
import { cn } from "../../utils/cn";
import SpeakButton from "../ui/SpeakButton";

type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  meta?: string | Record<string, unknown>;
};

export default function MessageBubble({ role, content, meta }: MessageBubbleProps) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 border",
          isUser
            ? "bg-emerald-400/10 border-emerald-300/20 text-emerald-50"
            : "bg-white/5 border-white/10 text-white/85"
        )}
      >
        <div className="text-sm leading-relaxed">{content}</div>
        {!isUser && content?.trim() ? (
          <div className="mt-3 flex items-center gap-2">
            <SpeakButton text={content} />
          </div>
        ) : null}
        {meta ? (
          <div className="mt-2 text-[11px] text-white/40">
            {typeof meta === "string"
              ? meta
              : typeof meta === "object" &&
                "sources" in meta &&
                Array.isArray((meta as { sources?: unknown }).sources) ? (
                  <div className="flex flex-wrap gap-2">
                    {(meta as { sources: string[]; sourceLinks?: Record<string, string> }).sources.map(
                      (s) => {
                        const links =
                          (meta as { sourceLinks?: Record<string, string> }).sourceLinks || {};
                        const url = links[s];
                        return url ? (
                          <a
                            key={s}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/60 hover:border-white/20"
                          >
                            {s}
                          </a>
                        ) : (
                          <span
                            key={s}
                            className="px-2 py-1 rounded-full border border-white/10 bg-white/5 text-white/60"
                          >
                            {s}
                          </span>
                        );
                      }
                    )}
                  </div>
                ) : (
                  "Context attached"
                )}
          </div>
        ) : null}
        {meta && typeof meta === "object" && "warning" in meta ? (
          (meta as { warning?: boolean }).warning ? (
            <div className="mt-2 text-[11px] text-yellow-300">
              No sources returned. Answer may be incomplete.
            </div>
          ) : null
        ) : null}
      </div>
    </motion.div>
  );
}
