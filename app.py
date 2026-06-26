import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import config  # noqa: F401 — triggers credential loading & LLM client init
import logging_config  # noqa: F401 — sets up logger & GenTracker
from routes import register_routes

app = FastAPI(title="AI Animation Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)
app.mount("/static", StaticFiles(directory="static"), name="static")

register_routes(app)

if __name__ == "__main__":
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
            reload_includes=["*.py"],
            reload_excludes=[
                "renderer", "renderer-hyperframes", "renderer-rendervid",
                "logs", "node_modules",
            ],
        )
    else:
        uvicorn.run(app, host="0.0.0.0", port=port)
