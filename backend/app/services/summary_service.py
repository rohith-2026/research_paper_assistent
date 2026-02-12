from app.utils.gemini_client import GeminiClient


class SummaryService:
    """
    Pure summarization service.
    - Accepts text + summary_type
    - Returns summary text
    - No database access
    """

    def __init__(self):
        self.llm = GeminiClient(
            model_env="GEMINI_SUMMARY_MODEL",
            default_model="gemini-2.5-flash-lite",
            timeout_s=90.0,
        )

    async def summarize(self, text: str, summary_type: str, title: str | None = None) -> str:
        cleaned = (text or "").strip()
        if not cleaned and not (title or "").strip():
            return ""

        style = "bullet points" if summary_type == "short" else "detailed paragraphs"
        head = (title or "").strip()
        body = cleaned
        if len(body) > 12000:
            body = body[:12000]
        prompt = "Summarize the following research content as " + style + ". Be concise and factual.\n\n"
        if head:
            prompt += "Title: " + head + "\n\n"
        prompt += body or head
        result = await self.llm.generate(prompt=prompt, fallback_text="")
        if result:
            return result

        # Fallback: extractive summary if Gemini is unavailable
        fallback_source = body or head
        if summary_type == "short":
            return fallback_source[:500]
        return fallback_source[:1500]
