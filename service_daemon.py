import os
import sys
import time
import socket
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_PY = os.path.join(BASE_DIR, "server.py")
PYTHON_EXE = sys.executable

def is_port_listening(port=8090):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1.0)
            return s.connect_ex(('127.0.0.1', port)) == 0
    except Exception:
        return False

def ensure_server_running():
    if not is_port_listening(8090):
        try:
            subprocess.Popen([PYTHON_EXE, SERVER_PY], cwd=BASE_DIR, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
            time.sleep(2.5)
        except Exception:
            pass

def main():
    while True:
        ensure_server_running()
        time.sleep(5)

if __name__ == "__main__":
    main()
