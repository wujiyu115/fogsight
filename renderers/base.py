from abc import ABC, abstractmethod
from typing import Optional


class BaseRenderer(ABC):
    name: str = ""
    temperature: float = 0.7
    output_format: str = "json"  # "json" or "html"

    @abstractmethod
    def get_system_prompt(self, topic: str) -> str:
        ...

    @abstractmethod
    def submit_render(self, data, gen_id: Optional[str] = None) -> dict:
        ...

    @abstractmethod
    def get_status(self, task_id: str) -> dict:
        ...

    @abstractmethod
    def get_video_stream(self, task_id: str):
        ...

    @abstractmethod
    def is_available(self) -> bool:
        ...
