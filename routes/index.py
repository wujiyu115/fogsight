from datetime import datetime

import pytz
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

shanghai_tz = pytz.timezone("Asia/Shanghai")
templates = Jinja2Templates(directory="templates")

router = APIRouter()


@router.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse(
        "index.html", {
            "request": request,
            "time": datetime.now(shanghai_tz).strftime("%Y%m%d%H%M%S")})
