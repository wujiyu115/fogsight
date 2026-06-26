import json

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from config import MODEL, PROVIDER
from llm import llm_event_stream
from logging_config import GenTracker

router = APIRouter()


@router.post("/test-llm")
async def test_llm(request: Request):
    test_prompt = "请用一句话介绍自己，然后输出一个最简单的HTML: <html><body><h1>Hello</h1></body></html>，用```html包裹。"
    test_system = "You are a helpful assistant. Reply concisely."

    collected = ""
    tracker = GenTracker("/test-llm", test_prompt, "test")
    try:
        async for chunk in llm_event_stream(test_prompt, system_prompt=test_system):
            if "event" in chunk and "[DONE]" in chunk:
                break
            if chunk.startswith("data: "):
                try:
                    data = json.loads(chunk[6:])
                    if "token" in data:
                        collected += data["token"]
                        tracker.add_token(data["token"])
                    elif "error" in data:
                        tracker.error = str(data["error"])
                        tracker.finish(has_html=False, has_code=False)
                        return JSONResponse({"ok": False, "error": data["error"], "model": MODEL, "provider": PROVIDER, "raw": collected})
                except json.JSONDecodeError:
                    pass
    except Exception as e:
        tracker.error = str(e)
        tracker.finish(has_html=False, has_code=False)
        return JSONResponse({"ok": False, "error": str(e), "model": MODEL, "provider": PROVIDER, "raw": collected})

    has_code_block = "```" in collected
    has_html = "<html" in collected.lower() or "<!doctype" in collected.lower()
    tracker.finish(has_html=has_html, has_code=has_code_block)

    return JSONResponse({
        "ok": True,
        "model": MODEL,
        "provider": PROVIDER,
        "response_length": len(collected),
        "has_code_block": has_code_block,
        "has_html_tag": has_html,
        "raw": collected[:3000],
    })
