from pypdf import PdfReader


def extract_text_from_pdf(path: str) -> str:
    reader = PdfReader(path)
    chunks = []
    for page in reader.pages:
        chunks.append(page.extract_text() or "")
    return "\n".join(chunks).strip()
