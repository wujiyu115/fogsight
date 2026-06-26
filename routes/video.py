import json
import time

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

from llm import llm_event_stream
from logging_config import GenTracker, logger
from models import ChatRequest
from renderers import get_renderer

router = APIRouter()


@router.post("/generate-video")
async def generate_video(chat_request: ChatRequest, request: Request):
    renderer = get_renderer()
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
    if not scene_data:
        logger.warning("[render-video] 400 missing sceneData")
        return JSONResponse({"error": "Missing sceneData"}, status_code=400)

    renderer = get_renderer()
    if not renderer.is_available():
        logger.warning("[render-video] 503 renderer unavailable")
        return JSONResponse(
            {"error": "Renderer service unavailable"},
            status_code=503,
        )
    gen_id = body.get("genId")

    t0 = time.monotonic()
    try:
        result = renderer.submit_render(scene_data, gen_id)
        dur = time.monotonic() - t0
        task_id = result.get("taskId") if isinstance(result, dict) else None
        scene_count = 0
        if isinstance(scene_data, dict) and isinstance(scene_data.get("scenes"), list):
            scene_count = len(scene_data["scenes"])
        logger.info("[render-video] gen=%s task=%s scenes=%s duration=%.2fs",
                    gen_id or "-", task_id, scene_count, dur)
        return JSONResponse(result)
    except Exception as e:
        logger.error("[render-video] gen=%s error=%s duration=%.2fs",
                     gen_id or "-", str(e), time.monotonic() - t0)
        return JSONResponse({"error": str(e)}, status_code=503)


@router.get("/video-status/{task_id}")
async def video_status(task_id: str):
    renderer = get_renderer()
    try:
        return JSONResponse(renderer.get_status(task_id))
    except Exception:
        return JSONResponse({"error": "Renderer service unavailable"}, status_code=503)


@router.get("/videos/{task_id}.mp4")
async def get_video(task_id: str):
    renderer = get_renderer()
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
