from typing import List, Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    topic: str
    history: Optional[List[dict]] = None
    mode: Optional[str] = "html"
    genId: Optional[str] = None
    renderer: Optional[str] = None
