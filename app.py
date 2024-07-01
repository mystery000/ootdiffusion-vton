import os
import asyncio
import aiohttp
import logging
from aiohttp import web

async def send_socket_catch_exception(function, message):
    try:
        await function(message)
    except (aiohttp.ClientError, aiohttp.ClientPayloadError, ConnectionResetError) as err:
        logging.warning("send error: {}".format(err))

@web.middleware
async def cache_control(request: web.Request, handler):
    response: web.Response = await handler(request)
    if request.path.endswith('.js') or request.path.endswith('.css'):
        response.headers.setdefault('Cache-Control', 'no-cache')
    return response

def create_cors_middleware(allowed_origin: str):
    @web.middleware
    async def cors_middleware(request: web.Request, handler):
        if request.method == "OPTIONS":
            # Pre-flight request. Reply successfully:
            response = web.Response()
        else:
            response = await handler(request)

        response.headers['Access-Control-Allow-Origin'] = allowed_origin
        response.headers['Access-Control-Allow-Methods'] = 'POST, GET, DELETE, PUT, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

    return cors_middleware


async def start():
    routes = web.RouteTableDef()

    max_upload_size = round(300 * 1024 * 1024) 
    app = web.Application(client_max_size=max_upload_size, middlewares=[cache_control, create_cors_middleware("*")])
    web_root = os.path.join(os.path.dirname(os.path.realpath(__file__)), "web")
    
    @routes.get("/")
    async def get_root(request):
        return web.FileResponse(os.path.join(web_root, "index.html"))
    
    app.add_routes([web.static('/web', web_root)])
    app.add_routes(routes)

    runner = web.AppRunner(app, access_log=None)
    await runner.setup()

    site = web.TCPSite(runner, "localhost", "5000")
    await site.start()

    # To keep the main loop running
    print("Server started at http://localhost:5000")
    await asyncio.Event().wait()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    try:
        asyncio.run(start())
    except KeyboardInterrupt:
        print("Server stopped by user.")
