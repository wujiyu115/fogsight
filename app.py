import asyncio
import json
import os
from datetime import datetime
from typing import AsyncGenerator, List, Optional

import pytz
import requests as http_requests
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI, OpenAIError
from pydantic import BaseModel
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
try:
    import anthropic
except ModuleNotFoundError:
    anthropic = None
try:
    import google.generativeai as genai
except ModuleNotFoundError:
    from google import genai
# -----------------------------------------------------------------------
# 0. 配置
# -----------------------------------------------------------------------
shanghai_tz = pytz.timezone("Asia/Shanghai")

credentials = json.load(open("credentials.json"))
API_KEY = credentials["API_KEY"]
BASE_URL = credentials.get("BASE_URL", "")
MODEL = credentials.get("MODEL", "gemini-2.5-pro")
# 显式 provider 配置：可选值为 "anthropic" / "openai" / "gemini"
# 留空则按 API_KEY / BASE_URL 自动推断
PROVIDER = credentials.get("PROVIDER", "").strip().lower()

if API_KEY.startswith("sk-REPLACE_ME"):
    raise RuntimeError("请在环境变量里配置 API_KEY")

# Provider 推断（仅当 credentials.json 未显式指定 PROVIDER 时生效）：
#   sk-ant-* 或 BASE_URL 含 anthropic  -> anthropic
#   sk-*                               -> openai-compatible (OpenRouter / DashScope 等)
#   其它                                -> gemini
if not PROVIDER:
    if API_KEY.startswith("sk-ant-") or "anthropic" in BASE_URL.lower():
        PROVIDER = "anthropic"
    elif API_KEY.startswith("sk-"):
        PROVIDER = "openai"
    else:
        PROVIDER = "gemini"

if PROVIDER == "anthropic":
    if anthropic is None:
        raise RuntimeError("请安装 anthropic: pip install anthropic")
    # 必须显式传入 base_url，否则 SDK 默认请求 api.anthropic.com，
    # 三方 anthropic 兼容端点（如 DashScope /apps/anthropic）会返回 403
    anthropic_client = anthropic.AsyncAnthropic(
        api_key=API_KEY,
        base_url=BASE_URL or None,
    )
elif PROVIDER == "openai":
    extra_headers = {}
    if "openrouter.ai" in BASE_URL.lower():
        extra_headers = {
            "HTTP-Referer": "https://github.com/fogsightai/fogsight",
            "X-Title": "Fogsight - AI Animation Generator"
        }
    client = AsyncOpenAI(
        api_key=API_KEY,
        base_url=BASE_URL,
        default_headers=extra_headers
    )
elif PROVIDER == "gemini":
    os.environ["GEMINI_API_KEY"] = API_KEY
    gemini_client = genai.Client()
else:
    raise RuntimeError(f"不支持的 PROVIDER: {PROVIDER}（可选: anthropic / openai / gemini）")

USE_GEMINI = (PROVIDER == "gemini")

templates = Jinja2Templates(directory="templates")

# -----------------------------------------------------------------------
# 1. FastAPI 初始化
# -----------------------------------------------------------------------
app = FastAPI(title="AI Animation Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)
app.mount("/static", StaticFiles(directory="static"), name="static")

RENDERER_URL = os.environ.get("RENDERER_URL", "http://localhost:3001")

class ChatRequest(BaseModel):
    topic: str
    history: Optional[List[dict]] = None
    mode: Optional[str] = "html"

# -----------------------------------------------------------------------
# 2. 核心：流式生成器 (现在会使用 history)
# -----------------------------------------------------------------------
async def llm_event_stream(
    topic: str,
    history: Optional[List[dict]] = None,
    model: str = None, # Will use MODEL from config if not specified
) -> AsyncGenerator[str, None]:
    history = history or []
    
    # Use configured model if not specified
    if model is None:
        model = MODEL
    
    # The system prompt is now more focused
    system_prompt = f"""请你生成一个非常精美的动态动画,讲讲 {topic}
要动态的,要像一个完整的,正在播放的视频。包含一个完整的过程，能把知识点讲清楚。
页面极为精美，好看，有设计感，同时能够很好的传达知识。知识和图像要准确
附带一些旁白式的文字解说,从头到尾讲清楚一个小的知识点
不需要任何互动按钮,直接开始播放
使用和谐好看，广泛采用的浅色配色方案，使用很多的，丰富的视觉元素。双语字幕
**请保证任何一个元素都在一个2k分辨率的容器中被摆在了正确的位置，避免穿模，字幕遮挡，图形位置错误等等问题影响正确的视觉传达**
html+css+js+svg，放进一个html里"""

    if PROVIDER == "gemini":
        try:
            full_prompt = system_prompt + "\n\n" + topic
            if history:
                history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history])
                full_prompt = history_text + "\n\n" + full_prompt

            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: gemini_client.models.generate_content(
                    model=model,
                    contents=full_prompt
                )
            )

            text = response.text
            chunk_size = 50

            for i in range(0, len(text), chunk_size):
                chunk = text[i:i+chunk_size]
                payload = json.dumps({"token": chunk}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0.05)

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

    elif PROVIDER == "anthropic":
        messages = []
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": topic})

        try:
            async with anthropic_client.messages.stream(
                model=model,
                max_tokens=16000,
                system=system_prompt,
                messages=messages,
                temperature=0.8,
            ) as stream:
                async for text in stream.text_stream:
                    if text:
                        payload = json.dumps({"token": text}, ensure_ascii=False)
                        yield f"data: {payload}\n\n"
        except anthropic.APIError as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

    else:
        messages = [
            {"role": "system", "content": system_prompt},
            *history,
            {"role": "user", "content": topic},
        ]

        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                temperature=0.8,
            )
        except OpenAIError as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        async for chunk in response:
            choices = getattr(chunk, "choices", None)
            if not choices:
                continue
            delta = getattr(choices[0], "delta", None)
            if not delta:
                continue
            token = getattr(delta, "content", None) or ""
            if not token:
                continue
            payload = json.dumps({"token": token}, ensure_ascii=False)
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.001)

    yield 'data: {"event":"[DONE]"}\n\n'


VIDEO_SYSTEM_PROMPT_TEMPLATE = """你是一个教学动画场景设计师。请根据用户给出的概念，生成一个结构化的动画场景描述 JSON。
这个 JSON 将被 Remotion 视频渲染引擎解析并渲染为高质量的教学视频。

概念: {topic}

请严格按照以下 JSON schema 输出，不要输出任何其他内容，不要用 markdown 代码块包裹：

{{
  "meta": {{
    "title": "标题",
    "fps": 30,
    "width": 1920,
    "height": 1080
  }},
  "theme": {{
    "background": "#hex颜色 (深色背景)",
    "primary": "#hex颜色 (主色)",
    "accent": "#hex颜色 (强调色)",
    "textColor": "#hex颜色 (文字色，浅色)",
    "fontFamily": "Inter, sans-serif"
  }},
  "scenes": [
    // 场景数组，每个场景有 type 和 duration(秒)
  ]
}}

可用的场景类型：

1. "title" - 标题页
   {{"type": "title", "duration": 3, "title": "主标题", "subtitle": "英文副标题", "description": "一句话描述"}}

2. "content" - 内容页（文字+可视化）
   {{"type": "content", "duration": 5, "title": "标题", "body": "详细说明文字",
    "visual": {{"type": "array", "data": [5,3,8,1], "highlight": [0,1], "animation": "swap"}}
   }}
   visual.type 可以是: "array"（数组柱状图）
   visual.animation 可以是: "swap", "insert", "highlight", "fade", "grow"

3. "steps" - 步骤演示页（逐步动画）
   {{"type": "steps", "duration": 8, "title": "步骤标题",
    "steps": [
      {{"data": [5,3,8,1], "highlight": [0,1], "action": "swap", "label": "比较并交换"}},
      {{"data": [3,5,8,1], "highlight": [1,2], "action": "keep", "label": "保持不变"}}
    ]
   }}
   action 可以是: "swap", "insert", "compare", "keep", "remove"

4. "code" - 代码展示页
   {{"type": "code", "duration": 6, "title": "代码实现", "language": "python",
    "code": "def bubble_sort(arr):\\n    ...", "highlights": [2, 3]
   }}

5. "compare" - 对比页
   {{"type": "compare", "duration": 5, "title": "对比标题",
    "left": {{"label": "左侧标签", "items": ["项目1", "项目2"]}},
    "right": {{"label": "右侧标签", "items": ["项目1", "项目2"]}}
   }}

6. "summary" - 总结页
   {{"type": "summary", "duration": 4, "title": "总结", "points": ["要点1", "要点2", "要点3"]}}

要求：
- 生成 4-8 个场景，总时长 20-45 秒
- 第一个场景必须是 title 类型
- 最后一个场景建议是 summary 类型
- 使用和谐的深色配色方案
- 内容要准确、清晰地讲解知识点
- 包含中英文双语内容
- 直接输出 JSON，不要包裹在代码块中"""


async def llm_video_event_stream(
    topic: str,
    history: Optional[List[dict]] = None,
    model: str = None,
) -> AsyncGenerator[str, None]:
    history = history or []
    if model is None:
        model = MODEL

    system_prompt = VIDEO_SYSTEM_PROMPT_TEMPLATE.format(topic=topic)

    if PROVIDER == "gemini":
        try:
            full_prompt = system_prompt + "\n\n" + topic
            if history:
                history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history])
                full_prompt = history_text + "\n\n" + full_prompt

            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: gemini_client.models.generate_content(
                    model=model,
                    contents=full_prompt
                )
            )

            text = response.text
            chunk_size = 50
            for i in range(0, len(text), chunk_size):
                chunk = text[i:i+chunk_size]
                payload = json.dumps({"token": chunk}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0.05)

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

    elif PROVIDER == "anthropic":
        messages = []
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": topic})

        try:
            async with anthropic_client.messages.stream(
                model=model,
                max_tokens=16000,
                system=system_prompt,
                messages=messages,
                temperature=0.7,
            ) as stream:
                async for text in stream.text_stream:
                    if text:
                        payload = json.dumps({"token": text}, ensure_ascii=False)
                        yield f"data: {payload}\n\n"
        except anthropic.APIError as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

    else:
        messages = [
            {"role": "system", "content": system_prompt},
            *history,
            {"role": "user", "content": topic},
        ]

        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                temperature=0.7,
            )
        except OpenAIError as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        async for chunk in response:
            choices = getattr(chunk, "choices", None)
            if not choices:
                continue
            delta = getattr(choices[0], "delta", None)
            if not delta:
                continue
            token = getattr(delta, "content", None) or ""
            if not token:
                continue
            payload = json.dumps({"token": token}, ensure_ascii=False)
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.001)

    yield 'data: {"event":"[DONE]"}\n\n'


# -----------------------------------------------------------------------
# 3. 路由 (CHANGED: Now a POST request)
# -----------------------------------------------------------------------
@app.post("/generate")
async def generate(
    chat_request: ChatRequest, # CHANGED: Use the Pydantic model
    request: Request,
):
    """
    Main endpoint: POST /generate
    Accepts a JSON body with "topic" and optional "history".
    Returns an SSE stream.
    """
    accumulated_response = ""  # for caching flow results

    async def event_generator():
        nonlocal accumulated_response
        try:
            async for chunk in llm_event_stream(chat_request.topic, chat_request.history):
                accumulated_response += chunk
                if await request.is_disconnected():
                    break
                yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"


    async def wrapped_stream():
        async for chunk in event_generator():
            yield chunk

    headers = {
        "Cache-Control": "no-store",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(wrapped_stream(), headers=headers)

@app.post("/test-llm")
async def test_llm(request: Request):
    """Send a short test prompt to verify LLM connectivity and response format."""
    test_prompt = "请用一句话介绍自己，然后输出一个最简单的HTML: <html><body><h1>Hello</h1></body></html>，用```html包裹。"

    collected = ""
    try:
        async for chunk in llm_event_stream(test_prompt):
            if "event" in chunk and "[DONE]" in chunk:
                break
            if chunk.startswith("data: "):
                try:
                    data = json.loads(chunk[6:])
                    if "token" in data:
                        collected += data["token"]
                    elif "error" in data:
                        return JSONResponse({"ok": False, "error": data["error"], "model": MODEL, "provider": PROVIDER, "raw": collected})
                except json.JSONDecodeError:
                    pass
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e), "model": MODEL, "provider": PROVIDER, "raw": collected})

    has_code_block = "```" in collected
    has_html = "<html" in collected.lower() or "<!doctype" in collected.lower()

    return JSONResponse({
        "ok": True,
        "model": MODEL,
        "provider": PROVIDER,
        "response_length": len(collected),
        "has_code_block": has_code_block,
        "has_html_tag": has_html,
        "raw": collected[:3000],
    })


@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse(
        "index.html", {
            "request": request,
            "time": datetime.now(shanghai_tz).strftime("%Y%m%d%H%M%S")})


@app.post("/generate-video")
async def generate_video(
    chat_request: ChatRequest,
    request: Request,
):
    async def event_generator():
        try:
            async for chunk in llm_video_event_stream(chat_request.topic, chat_request.history):
                if await request.is_disconnected():
                    break
                yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    headers = {
        "Cache-Control": "no-store",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_generator(), headers=headers)


@app.post("/render-video")
async def render_video(request: Request):
    body = await request.json()
    scene_data = body.get("sceneData")
    if not scene_data:
        return JSONResponse({"error": "Missing sceneData"}, status_code=400)

    try:
        resp = http_requests.post(
            f"{RENDERER_URL}/render",
            json=scene_data,
            timeout=10,
        )
        return JSONResponse(resp.json(), status_code=resp.status_code)
    except http_requests.exceptions.ConnectionError:
        return JSONResponse(
            {"error": "Renderer service unavailable"},
            status_code=503,
        )


@app.get("/video-status/{task_id}")
async def video_status(task_id: str):
    try:
        resp = http_requests.get(
            f"{RENDERER_URL}/status/{task_id}",
            timeout=5,
        )
        return JSONResponse(resp.json(), status_code=resp.status_code)
    except http_requests.exceptions.ConnectionError:
        return JSONResponse(
            {"error": "Renderer service unavailable"},
            status_code=503,
        )


@app.get("/videos/{task_id}.mp4")
async def get_video(task_id: str):
    try:
        resp = http_requests.get(
            f"{RENDERER_URL}/videos/{task_id}.mp4",
            timeout=300,
            stream=True,
        )
        if resp.status_code != 200:
            return JSONResponse({"error": "Video not found"}, status_code=404)

        return StreamingResponse(
            resp.iter_content(chunk_size=8192),
            media_type="video/mp4",
            headers={"Content-Disposition": f"inline; filename={task_id}.mp4"},
        )
    except http_requests.exceptions.ConnectionError:
        return JSONResponse(
            {"error": "Renderer service unavailable"},
            status_code=503,
        )

# -----------------------------------------------------------------------
# 4. 本地启动命令
# -----------------------------------------------------------------------
# uvicorn app:app --reload --host 0.0.0.0 --port 8000


if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    hot_reload = os.environ.get("HOT_RELOAD", "0") == "1"
    if hot_reload:
        uvicorn.run(
            "app:app",
            host="0.0.0.0",
            port=port,
            reload=True,
            reload_dirs=[".", "templates", "static"],
            reload_includes=["*.py", "*.html", "*.css", "*.js"],
        )
    else:
        uvicorn.run(app, host="0.0.0.0", port=port)
