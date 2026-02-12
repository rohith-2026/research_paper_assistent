import { Send } from "lucide-react";
import VoiceButton from "../ui/VoiceButton";

type ChatInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
};

export default function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  return (
    <div className="glass rounded-2xl p-3 flex items-center gap-3 border border-white/10">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask about the paper, summary, or query..."
        className="flex-1 bg-transparent outline-none text-sm text-white/90"
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <VoiceButton value={value} onChange={onChange} disabled={disabled} />
      <button
        onClick={onSend}
        className="btn-primary px-4 py-2 rounded-xl"
        disabled={disabled}
      >
        <Send className="w-4 h-4" />
        Send
      </button>
    </div>
  );
}
