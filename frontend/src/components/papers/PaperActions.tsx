import { Bookmark, MessageSquare, FileText, Network } from "lucide-react";

type PaperActionsProps = {
  onSummary?: () => void;
  onChat?: () => void;
  onGraph?: () => void;
  onSave?: () => void;
};

export default function PaperActions({
  onSummary,
  onChat,
  onGraph,
  onSave,
}: PaperActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <button onClick={onSummary} className="btn-primary px-4 py-2 rounded-xl">
        <FileText className="w-4 h-4" />
        Summary
      </button>
      <button onClick={onChat} className="btn-secondary px-4 py-2 rounded-xl">
        <MessageSquare className="w-4 h-4" />
        Chat
      </button>
      <button onClick={onGraph} className="btn-secondary px-4 py-2 rounded-xl">
        <Network className="w-4 h-4" />
        Graph
      </button>
      <button onClick={onSave} className="btn-secondary px-4 py-2 rounded-xl">
        <Bookmark className="w-4 h-4" />
        Save
      </button>
    </div>
  );
}
