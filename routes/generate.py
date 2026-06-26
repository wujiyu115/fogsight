import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from llm import llm_event_stream
from logging_config import GenTracker
from models import ChatRequest

router = APIRouter()


@router.post("/generate")
async def generate(chat_request: ChatRequest, request: Request):
    accumulated_response = ""

    async def event_generator():
        nonlocal accumulated_response
        tracker = GenTracker("/generate", chat_request.topic, "html", gen_id=chat_request.genId)
        try:
            async for chunk in llm_event_stream(chat_request.topic, chat_request.history):
                accumulated_response += chunk
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
            low = accumulated_response.lower()
            tracker.finish(
                has_html="<html" in low or "<!doctype" in low,
                has_code="```" in accumulated_response,
            )

    headers = {
        "Cache-Control": "no-store",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_generator(), headers=headers)
