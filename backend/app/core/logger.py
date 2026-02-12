# app/core/logger.py
import os
import sys
import json
import logging
from logging.handlers import RotatingFileHandler


def setup_logging(level: str = "INFO") -> None:
    """
    Production logging setup:
      - Console logging
      - Rotating file logging (logs/app.log)
    """

    log_level = getattr(logging, level.upper(), logging.INFO)

    # prevent duplicate handlers (important when running uvicorn)
    root = logging.getLogger()
    if root.handlers:
        return

    root.setLevel(log_level)

    # logs folder
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    logs_dir = os.path.join(base_dir, "logs")
    os.makedirs(logs_dir, exist_ok=True)

    file_path = os.path.join(logs_dir, "app.log")

    class JsonFormatter(logging.Formatter):
        def format(self, record: logging.LogRecord) -> str:
            payload = {
                "ts": self.formatTime(record, "%Y-%m-%d %H:%M:%S"),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
            }
            return json.dumps(payload)

    log_format = os.getenv("LOG_FORMAT", "text").lower()
    if log_format == "json":
        formatter = JsonFormatter()
    else:
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    # 1) Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)

    # 2) File handler (rotating)
    file_handler = RotatingFileHandler(
        file_path,
        maxBytes=5 * 1024 * 1024,  # 5MB
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(formatter)

    root.addHandler(console_handler)
    root.addHandler(file_handler)

    # Reduce noise
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
