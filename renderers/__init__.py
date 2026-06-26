from renderers.remotion import RemotionRenderer

registry = {
    "remotion": RemotionRenderer(),
}

task_renderer_map: dict[str, str] = {}


def get_renderer(name: str = "remotion"):
    return registry.get(name, registry["remotion"])
