import os
import sys
import time
import urllib.request
from datetime import datetime

TARGET_URLS = [
    "https://kids.k78.dpdns.org/api/info",
    "https://kindergarten-treasure-hunt.onrender.com/api/info"
]
INTERVAL_SECONDS = 540

def ping_target(url):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    start_time = time.time()
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Render-KeepAlive-Bot/1.0"}
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            latency = int((time.time() - start_time) * 1000)
            print(f"[{now_str}] 保活心跳成功: {url} -> HTTP {resp.status} ({latency}ms)")
            return True
    except Exception as e:
        latency = int((time.time() - start_time) * 1000)
        print(f"[{now_str}] 心跳异常: {url} -> {e} ({latency}ms)")
        return False

def ping_all():
    for u in TARGET_URLS:
        ping_target(u)

def main():
    print("=" * 60)
    print("  Render 24小时防休眠保活守护进程")
    print(f"  主域名: {TARGET_URLS[0]}")
    print(f"  备用域名: {TARGET_URLS[1]}")
    print(f"  心跳频率: 每 {INTERVAL_SECONDS // 60} 分钟")
    print("=" * 60)
    ping_all()
    while True:
        time.sleep(INTERVAL_SECONDS)
        ping_all()

if __name__ == "__main__":
    main()
