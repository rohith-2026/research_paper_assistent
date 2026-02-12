# app/services/file_parser.py
import io
from typing import Tuple
from pypdf import PdfReader
from docx import Document


class FileParser:
    @staticmethod
    def parse_pdf(file_bytes: bytes) -> str:
        reader = PdfReader(io.BytesIO(file_bytes))
        parts = []
        for page in reader.pages:
            txt = page.extract_text() or ""
            if txt.strip():
                parts.append(txt)
        return "\n".join(parts).strip()

    @staticmethod
    def parse_docx(file_bytes: bytes) -> str:
        doc = Document(io.BytesIO(file_bytes))
        parts = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
        return "\n".join(parts).strip()

    @staticmethod
    def parse_txt(file_bytes: bytes) -> str:
        return file_bytes.decode("utf-8", errors="ignore").strip()

    @staticmethod
    def parse(filename: str, file_bytes: bytes) -> Tuple[str, str]:
        """
        Returns: (ext, text)
        """
        name = (filename or "").lower()
        if name.endswith(".pdf"):
            return ("pdf", FileParser.parse_pdf(file_bytes))
        if name.endswith(".docx"):
            return ("docx", FileParser.parse_docx(file_bytes))
        if name.endswith(".txt"):
            return ("txt", FileParser.parse_txt(file_bytes))

        # fallback: try as txt
        return ("unknown", FileParser.parse_txt(file_bytes))
