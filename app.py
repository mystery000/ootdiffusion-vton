import os
import aiohttp
import logging
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, Response

app = FastAPI()

@app.middleware("http")
async def cache_control(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.endswith('.js') or request.url.path.endswith('.css'):
        response.headers.setdefault('Cache-Control', 'no-cache')
    return response

@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        # Pre-flight request. Reply successfully:
        return Response()
    else:
        response = await call_next(request)

    response.headers['Access-Control-Allow-Origin'] = "*"
    response.headers['Access-Control-Allow-Methods'] = 'POST, GET, DELETE, PUT, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

max_upload_size = round(300 * 1024 * 1024) 
web_root = os.path.join(os.path.dirname(os.path.realpath(__file__)), "web")

@app.get("/")
async def get_root():
    return FileResponse(os.path.join(web_root, "index.html"))

@app.get("/web/{path:path}")
async def serve_static(path: str):
    return FileResponse(os.path.join(web_root, path))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
