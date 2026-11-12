import os
import sys
import subprocess
import time
import win32serviceutil
import win32service
import win32event
import servicemanager

BASE_DIR = r"D:\Desktop\闲鱼\用户_76994842"
PYTHON_EXE = r"D:\1EnvironmentConfiguration\Python 3.13.7\python.exe"
SERVER_PY = os.path.join(BASE_DIR, "server.py")

class KindergartenService(win32serviceutil.ServiceFramework):
    _svc_name_ = "KindergartenServer"
    _svc_display_name_ = "幼儿园作品智能评测服务 (KindergartenServer)"
    _svc_description_ = "小小领航员/高青寻宝记幼儿园作品智能评测后台与双屏互动服务"

    def __init__(self, args):
        super().__init__(args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        self.proc = None
        self.running = True

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        self.running = False
        win32event.SetEvent(self.hWaitStop)
        if self.proc:
            try:
                self.proc.terminate()
            except Exception:
                pass

    def SvcDoRun(self):
        while self.running:
            if not self.proc or self.proc.poll() is not None:
                self.proc = subprocess.Popen(
                    [PYTHON_EXE, SERVER_PY],
                    cwd=BASE_DIR,
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
            rc = win32event.WaitForSingleObject(self.hWaitStop, 3000)
            if rc == win32event.WAIT_OBJECT_0:
                break
        if self.proc:
            try:
                self.proc.terminate()
            except Exception:
                pass

if __name__ == '__main__':
    win32serviceutil.HandleCommandLine(KindergartenService)
