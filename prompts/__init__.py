from prompts.html_prompt import get_html_prompt
from prompts.remotion import get_remotion_prompt


def get_video_prompt(topic: str) -> str:
    return get_remotion_prompt(topic)
