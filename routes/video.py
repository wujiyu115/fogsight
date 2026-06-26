import json
import time

import requests as http_requests
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

from config import RENDERER_URL
from llm import llm_event_stream
from logging_config import GenTracker, logger
from models import ChatRequest
from prompts import get_video_prompt
from renderers import get_renderer, task_renderer_map

router = APIRouter()


@router.post("/generate-video")
async def generate_video(chat_request: ChatRequest, request: Request):
    renderer_name = chat_request.renderer or "remotion"
    renderer = get_renderer(renderer_name)
    system_prompt = renderer.get_system_prompt(chat_request.topic)
    temperature = renderer.temperature

    async def event_generator():
        tracker = GenTracker("/generate-video", chat_request.topic, "video", gen_id=chat_request.genId)
        collected = ""
        try:
            async for chunk in llm_event_stream(
                chat_request.topic,
                chat_request.history,
                system_prompt=system_prompt,
                temperature=temperature,
            ):
                collected += chunk
                if chunk.startswith("data: "):
                    try:
                        d = json.loads(chunk[6:])
                        if "token" in d:
                            tracker.add_token(d["token"])
                        elif "error" in d:
                            tracker.error = str(d["error"])
                    except json.JSONDecodeError:
                        pass
                if await request.is_disconnected():
                    tracker.disconnected = True
                    break
                yield chunk
        except Exception as e:
            tracker.error = str(e)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            low = collected.lower()
            has_json = '"scenes"' in low and '"meta"' in low
            tracker.finish(has_scenes=has_json, has_error='"error"' in low)

    headers = {
        "Cache-Control": "no-store",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_generator(), headers=headers)


@router.post("/render-video")
async def render_video(request: Request):
    body = await request.json()
    scene_data = body.get("sceneData")
    renderer_name = body.get("renderer", "remotion")
    if not scene_data:
        logger.warning("[render-video] 400 missing sceneData")
        return JSONResponse({"error": "Missing sceneData"}, status_code=400)

    renderer = get_renderer(renderer_name)
    if not renderer.is_available():
        logger.warning("[render-video] 503 renderer %s unavailable", renderer_name)
        return JSONResponse(
            {"error": f"Renderer '{renderer_name}' service unavailable"},
            status_code=503,
        )
    gen_id = body.get("genId")

    t0 = time.monotonic()
    try:
        result = renderer.submit_render(scene_data, gen_id)
        dur = time.monotonic() - t0
        task_id = result.get("taskId") if isinstance(result, dict) else None
        if task_id:
            task_renderer_map[task_id] = renderer_name
        scene_count = 0
        if isinstance(scene_data, dict) and isinstance(scene_data.get("scenes"), list):
            scene_count = len(scene_data["scenes"])
        logger.info("[render-video] gen=%s renderer=%s task=%s scenes=%s duration=%.2fs",
                    gen_id or "-", renderer_name, task_id, scene_count, dur)
        return JSONResponse(result)
    except Exception as e:
        logger.error("[render-video] gen=%s renderer=%s error=%s duration=%.2fs",
                     gen_id or "-", renderer_name, str(e), time.monotonic() - t0)
        return JSONResponse({"error": str(e)}, status_code=503)


def _resolve_renderer(task_id: str):
    """Find which renderer owns this task, searching all if map was lost on restart."""
    name = task_renderer_map.get(task_id)
    if name:
        return get_renderer(name)
    from renderers import registry
    for rname, r in registry.items():
        try:
            status = r.get_status(task_id)
            if isinstance(status, dict) and "error" not in status:
                task_renderer_map[task_id] = rname
                return r
        except Exception:
            continue
    return get_renderer("remotion")


@router.get("/video-status/{task_id}")
async def video_status(task_id: str):
    renderer = _resolve_renderer(task_id)
    try:
        return JSONResponse(renderer.get_status(task_id))
    except Exception:
        return JSONResponse({"error": "Renderer service unavailable"}, status_code=503)


@router.get("/videos/{task_id}.mp4")
async def get_video(task_id: str):
    renderer = _resolve_renderer(task_id)
    try:
        resp = renderer.get_video_stream(task_id)
        if resp is None:
            return JSONResponse({"error": "Video not found"}, status_code=404)
        return StreamingResponse(
            resp.iter_content(chunk_size=8192),
            media_type="video/mp4",
            headers={"Content-Disposition": f"inline; filename={task_id}.mp4"},
        )
    except Exception:
        return JSONResponse({"error": "Renderer service unavailable"}, status_code=503)


@router.get("/renderers")
async def list_renderers():
    from renderers import registry
    result = []
    for name, r in registry.items():
        result.append({
            "name": name,
            "available": r.is_available(),
            "outputFormat": r.output_format,
        })
    return JSONResponse(result)
