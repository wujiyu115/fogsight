from renderers.remotion import RemotionRenderer
from renderers.hyperframes import HyperFramesRenderer
from renderers.rendervid import RenderVidRenderer

registry = {
    "remotion": RemotionRenderer(),
    "hyperframes": HyperFramesRenderer(),
    "rendervid": RenderVidRenderer(),
}

task_renderer_map: dict[str, str] = {}


def get_renderer(name: str = "remotion"):
    return registry.get(name, registry["remotion"])
