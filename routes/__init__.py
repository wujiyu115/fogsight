from fastapi import FastAPI

from routes.index import router as index_router
from routes.generate import router as generate_router
from routes.video import router as video_router
from routes.test import router as test_router


def register_routes(app: FastAPI):
    app.include_router(index_router)
    app.include_router(generate_router)
    app.include_router(video_router)
    app.include_router(test_router)
