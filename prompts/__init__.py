from prompts.html_prompt import get_html_prompt
from prompts.remotion import get_remotion_prompt
from prompts.hyperframes import get_hyperframes_prompt
from prompts.rendervid import get_rendervid_prompt


RENDERER_PROMPTS = {
    "remotion": get_remotion_prompt,
    "hyperframes": get_hyperframes_prompt,
    "rendervid": get_rendervid_prompt,
}


def get_video_prompt(topic: str, renderer: str = "remotion") -> str:
    fn = RENDERER_PROMPTS.get(renderer, get_remotion_prompt)
    return fn(topic)
