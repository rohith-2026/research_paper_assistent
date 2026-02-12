from __future__ import annotations


class PromptBuilder:
    def __init__(self, max_chars: int = 12000):
        self.max_chars = max_chars

    def build(
        self,
        system_instructions: str,
        user_question: str,
        history: list[dict],
        queries: list[dict],
        summaries: list[dict],
        graph_edges: list[dict],
        notes: list[str],
    ) -> str:
        parts = ["SYSTEM:", system_instructions.strip(), ""]

        if history:
            parts.append("CONTEXT:")
            for m in history:
                role = m.get("role", "user")
                content = (m.get("content") or "").strip()
                if content:
                    parts.append(f"{role}: {content}")
            parts.append("")

        if queries:
            parts.append("PAPERS:")
            for q in queries:
                subject = q.get("subject_area") or "Unknown"
                parts.append(f"- Subject: {subject}")
            parts.append("")

        if summaries:
            parts.append("SUMMARIES:")
            for s in summaries:
                title = s.get("title") or s.get("paper_id") or "Unknown"
                content = s.get("content") or ""
                parts.append(f"- Title: {title}")
                parts.append(f"  Summary: {content}")
            parts.append("")

        if graph_edges:
            parts.append("GRAPH:")
            for e in graph_edges:
                src = e.get("source") or e.get("paper_id")
                tgt = e.get("target") or e.get("related_paper_id")
                weight = e.get("weight", 0.0)
                rel = e.get("relation_type")
                parts.append(f"- {src} -> {tgt} (weight={weight}, type={rel})")
            parts.append("")

        if notes:
            parts.append("NOTES:")
            for n in notes:
                parts.append(f"- {n}")
            parts.append("")

        parts.append("USER QUESTION:")
        parts.append(user_question.strip())

        prompt = "\n".join(parts)
        if len(prompt) > self.max_chars:
            prompt = prompt[: self.max_chars]
        return prompt
