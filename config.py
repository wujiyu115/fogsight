import json
import os

import pytz

shanghai_tz = pytz.timezone("Asia/Shanghai")

credentials = json.load(open("credentials.json"))
API_KEY = credentials["API_KEY"]
BASE_URL = credentials.get("BASE_URL", "")
MODEL = credentials.get("MODEL", "gemini-2.5-pro")
PROVIDER = credentials.get("PROVIDER", "").strip().lower()

if API_KEY.startswith("sk-REPLACE_ME"):
    raise RuntimeError("请在环境变量里配置 API_KEY")

if not PROVIDER:
    if API_KEY.startswith("sk-ant-") or "anthropic" in BASE_URL.lower():
        PROVIDER = "anthropic"
    elif API_KEY.startswith("sk-"):
        PROVIDER = "openai"
    else:
        PROVIDER = "gemini"

anthropic_client = None
client = None
gemini_client = None

if PROVIDER == "anthropic":
    try:
        import anthropic
    except ModuleNotFoundError:
        raise RuntimeError("请安装 anthropic: pip install anthropic")
    anthropic_client = anthropic.AsyncAnthropic(
        api_key=API_KEY,
        base_url=BASE_URL or None,
    )
elif PROVIDER == "openai":
    from openai import AsyncOpenAI
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
    try:
        import google.generativeai as genai
    except ModuleNotFoundError:
        from google import genai
    gemini_client = genai.Client()
else:
    raise RuntimeError(f"不支持的 PROVIDER: {PROVIDER}（可选: anthropic / openai / gemini）")

USE_GEMINI = (PROVIDER == "gemini")

RENDERER_URL = os.environ.get("RENDERER_URL", "http://localhost:3001")
