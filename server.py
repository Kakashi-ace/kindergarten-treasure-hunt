import os
import io
import json
import time
import uuid
import socket
import psutil
import qrcode
from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from recognizer import analyze_sheet_image, simulate_path

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_header(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSS_DIR = os.path.join(BASE_DIR, "css")
JS_DIR = os.path.join(BASE_DIR, "js")
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
PRESET_DIR = os.path.join(DATA_DIR, "presets")
ASSETS_DIR = os.path.join(BASE_DIR, "assets")

app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")
app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

active_connections = set()
PORT = int(os.environ.get("PORT", 8090))
PUBLIC_DOMAIN = os.environ.get("PUBLIC_DOMAIN", os.environ.get("RENDER_EXTERNAL_URL", "https://kids.k78.dpdns.org")).rstrip("/")

def get_lan_ip():
    candidates = []
    for _, snics in psutil.net_if_addrs().items():
        for snic in snics:
            if snic.family == socket.AF_INET and not snic.address.startswith("127."):
                ip = snic.address
                if ip.startswith("192.168.1.") or ip.startswith("192.168.0."):
                    return ip
                if ip.startswith("192.168."):
                    candidates.append((1, ip))
                elif ip.startswith("10."):
                    candidates.append((2, ip))
                elif ip.startswith("172."):
                    candidates.append((3, ip))
                else:
                    candidates.append((4, ip))
    if candidates:
        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]
    return "127.0.0.1"

works_db = []

def init_presets():
    global works_db
    works_db = []
    preset_configs = [
        {"name": "张子轩 (实拍)", "steps": [{"direction": "↑", "steps": 2}, {"direction": "←", "steps": 3}], "file": "child_01.jpg"},
        {"name": "李沐宸", "steps": [{"direction": "←", "steps": 3}, {"direction": "↑", "steps": 2}], "file": "child_02.jpg"},
        {"name": "王梓涵", "steps": [{"direction": "↑", "steps": 1}, {"direction": "←", "steps": 1}, {"direction": "↑", "steps": 1}, {"direction": "←", "steps": 2}], "file": "child_03.jpg"},
        {"name": "陈思睿", "steps": [{"direction": "↑", "steps": 2}, {"direction": "←", "steps": 3}], "file": "child_04.jpg"},
        {"name": "刘欣怡", "steps": [{"direction": "←", "steps": 2}, {"direction": "↑", "steps": 2}, {"direction": "←", "steps": 1}], "file": "child_05.jpg"},
        {"name": "赵子豪", "steps": [{"direction": "↑", "steps": 2}, {"direction": "←", "steps": 2}], "file": "child_06.jpg"},
        {"name": "孙浩然", "steps": [{"direction": "←", "steps": 3}, {"direction": "↑", "steps": 2}], "file": "child_07.jpg"},
        {"name": "周雨桐", "steps": [{"direction": "←", "steps": 3}, {"direction": "↑", "steps": 1}], "file": "child_08.jpg"},
        {"name": "吴若熙", "steps": [{"direction": "↑", "steps": 1}, {"direction": "←", "steps": 3}, {"direction": "↑", "steps": 1}], "file": "child_09.jpg"},
        {"name": "徐乐天", "steps": [{"direction": "↑", "steps": 2}, {"direction": "←", "steps": 3}], "file": "child_10.jpg"},
        {"name": "朱浩轩", "steps": [{"direction": "←", "steps": 3}, {"direction": "↑", "steps": 2}], "file": "child_11.jpg"},
        {"name": "胡欣妍", "steps": [{"direction": "↑", "steps": 2}, {"direction": "←", "steps": 3}], "file": "child_12.jpg"},
        {"name": "郭佳琪", "steps": [{"direction": "↑", "steps": 3}], "file": "child_13.jpg"},
        {"name": "林嘉航", "steps": [{"direction": "↑", "steps": 2}, {"direction": "←", "steps": 3}], "file": "child_14.jpg"},
        {"name": "高博文", "steps": [{"direction": "←", "steps": 1}, {"direction": "↑", "steps": 2}, {"direction": "←", "steps": 2}], "file": "child_15.jpg"},
        {"name": "黄梓墨", "steps": [{"direction": "↑", "steps": 2}, {"direction": "←", "steps": 3}], "file": "child_16.jpg"}
    ]
    for idx, item in enumerate(preset_configs):
        sim = simulate_path(item["steps"])
        works_db.append({
            "id": f"work_{idx + 1:02d}",
            "name": item["name"],
            "image_url": f"/data/presets/{item['file']}",
            "steps": item["steps"],
            "simulation": sim,
            "created_at": time.strftime("%H:%M:%S", time.localtime(time.time() - (16 - idx) * 90)),
            "is_preset": True
        })

init_presets()

async def broadcast_change(new_work=None):
    payload = {"type": "refresh", "total": len(works_db)}
    if new_work:
        payload = {"type": "new_work", "work": new_work, "total": len(works_db)}
    data = json.dumps(payload)
    disconnected = set()
    for ws in active_connections:
        try:
            await ws.send_text(data)
        except Exception:
            disconnected.add(ws)
    for ws in disconnected:
        active_connections.remove(ws)

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    active_connections.add(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(ws)

@app.get("/", response_class=HTMLResponse)
async def get_index():
    with open(os.path.join(BASE_DIR, "index.html"), "r", encoding="utf-8") as f:
        return f.read()

@app.get("/mobile", response_class=HTMLResponse)
async def get_mobile():
    with open(os.path.join(BASE_DIR, "mobile.html"), "r", encoding="utf-8") as f:
        return f.read()

@app.get("/api/info")
async def get_info():
    lan_ip = get_lan_ip()
    pub_url = f"{PUBLIC_DOMAIN}/mobile"
    lan_url = f"http://{lan_ip}:{PORT}/mobile"
    return {
        "lan_ip": lan_ip,
        "port": PORT,
        "public_url": pub_url,
        "lan_url": lan_url,
        "mobile_url": pub_url,
        "works_count": len(works_db),
        "success_count": sum(1 for w in works_db if w["simulation"]["reached"]),
        "fail_count": sum(1 for w in works_db if not w["simulation"]["reached"])
    }

@app.get("/api/qr")
async def get_qr(mode: str = "public"):
    lan_ip = get_lan_ip()
    if mode == "lan":
        target_url = f"http://{lan_ip}:{PORT}/mobile"
    else:
        target_url = f"{PUBLIC_DOMAIN}/mobile"
    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(target_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#2C3E50", back_color="#FFFFFF")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

@app.get("/api/works")
async def get_works():
    return JSONResponse(works_db)

@app.post("/api/upload")
async def upload_work(file: UploadFile = File(...), child_name: str = Form(None)):
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_id = str(uuid.uuid4())[:8]
    fname = f"upload_{unique_id}.{ext}"
    fpath = os.path.join(UPLOAD_DIR, fname)
    contents = await file.read()
    with open(fpath, "wb") as f:
        f.write(contents)
    steps, sim, _ = analyze_sheet_image(fpath)
    name = child_name.strip() if child_name and child_name.strip() else f"小朋友 {len(works_db) + 1}号"
    work_item = {
        "id": f"work_{unique_id}",
        "name": name,
        "image_url": f"/data/uploads/{fname}",
        "steps": steps,
        "simulation": sim,
        "created_at": time.strftime("%H:%M:%S", time.localtime()),
        "is_preset": False
    }
    works_db.insert(0, work_item)
    await broadcast_change(new_work=work_item)
    return JSONResponse(work_item)

@app.post("/api/update/{work_id}")
async def update_work(work_id: str, payload: dict):
    target = None
    for item in works_db:
        if item["id"] == work_id:
            target = item
            break
    if not target:
        return JSONResponse({"status": "error", "message": "Not found"}, status_code=404)
    if "name" in payload:
        target["name"] = payload["name"]
    if "steps" in payload:
        target["steps"] = payload["steps"]
        target["simulation"] = simulate_path(payload["steps"])
    await broadcast_change()
    return JSONResponse(target)

@app.post("/api/delete/{work_id}")
async def delete_work(work_id: str):
    global works_db
    works_db = [w for w in works_db if w["id"] != work_id]
    await broadcast_change()
    return JSONResponse({"status": "ok"})

@app.post("/api/clear")
async def clear_works():
    global works_db
    works_db = []
    await broadcast_change()
    return JSONResponse({"status": "ok", "total": 0})

@app.post("/api/reset")
async def reset_works():
    init_presets()
    await broadcast_change()
    return JSONResponse({"status": "ok", "total": len(works_db)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
