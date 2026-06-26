from typing import Optional

import requests as http_requests

from config import HYPERFRAMES_URL
from prompts.hyperframes import get_hyperframes_prompt
from renderers.base import BaseRenderer


class HyperFramesRenderer(BaseRenderer):
    name = "hyperframes"
    temperature = 0.8
    output_format = "html"

    def get_system_prompt(self, topic: str) -> str:
        return get_hyperframes_prompt(topic)

    def submit_render(self, data, gen_id: Optional[str] = None) -> dict:
        headers = {"X-Gen-Id": gen_id} if gen_id else {}
        resp = http_requests.post(
            f"{HYPERFRAMES_URL}/render",
            json={"html": data} if isinstance(data, str) else data,
            headers=headers,
            timeout=10,
        )
        try:
            return resp.json()
        except ValueError:
            return {"error": f"renderer returned non-json (status {resp.status_code})"}

    def get_status(self, task_id: str) -> dict:
        resp = http_requests.get(f"{HYPERFRAMES_URL}/status/{task_id}", timeout=5)
        return resp.json()

    def get_video_stream(self, task_id: str):
        resp = http_requests.get(
            f"{HYPERFRAMES_URL}/videos/{task_id}.mp4",
            timeout=300,
            stream=True,
        )
        if resp.status_code != 200:
            return None
        return resp

    def is_available(self) -> bool:
        try:
            resp = http_requests.get(f"{HYPERFRAMES_URL}/health", timeout=2)
            return resp.status_code == 200
        except Exception:
            return False
