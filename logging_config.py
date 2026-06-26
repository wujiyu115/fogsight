import logging
import os
import time
import uuid
from logging.handlers import RotatingFileHandler
from typing import Optional

from config import BASE_URL, MODEL, PROVIDER

LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logger = logging.getLogger("fogsight")
logger.setLevel(logging.INFO)
logger.propagate = False
if not logger.handlers:
    _fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    _fh = RotatingFileHandler(
        os.path.join(LOG_DIR, "fogsight.log"),
        maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8",
    )
    _fh.setFormatter(_fmt)
    _sh = logging.StreamHandler()
    _sh.setFormatter(_fmt)
    logger.addHandler(_fh)
    logger.addHandler(_sh)

logger.info("=== fogsight backend starting | provider=%s model=%s base_url=%s ===",
            PROVIDER, MODEL, BASE_URL or "(default)")


def _clip(s: str, n: int = 80) -> str:
    s = (s or "").replace("\n", " ").strip()
    return s[:n] + ("…" if len(s) > n else "")


class GenTracker:
    def __init__(self, endpoint: str, topic: str, kind: str, gen_id: Optional[str] = None):
        self.gen_id = (gen_id or uuid.uuid4().hex[:12])
        self.endpoint = endpoint
        self.kind = kind
        self.topic = topic or ""
        self.start = time.monotonic()
        self.token_chunks = 0
        self.text_len = 0
        self.error = None
        self.disconnected = False
        logger.info(
            "[START] gen=%s kind=%s endpoint=%s model=%s provider=%s topic=%s",
            self.gen_id, self.kind, self.endpoint, MODEL, PROVIDER, _clip(self.topic),
        )

    def add_token(self, text):
        self.token_chunks += 1
        self.text_len += len(text or "")

    def finish(self, **extra):
        dur = time.monotonic() - self.start
        if self.error:
            status = "error"
        elif self.disconnected:
            status = "disconnected"
        else:
            status = "ok"
        parts = [
            f"gen={self.gen_id}", f"kind={self.kind}", f"status={status}",
            f"duration={dur:.2f}s", f"tokens={self.token_chunks}",
            f"text_len={self.text_len}",
        ]
        for k, v in extra.items():
            parts.append(f"{k}={v}")
        if self.error:
            parts.append(f"error={self.error!r}")
        logger.info("[END] " + " ".join(parts))
