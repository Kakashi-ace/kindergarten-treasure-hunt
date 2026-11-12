@echo off
chcp 936 >nul
title 幼儿园作品评测系统 - 一体机大屏与公网手机联动

echo ========================================================
echo   小小领航员 · 寻宝水车大作战 (幼儿园作品评测系统)
echo ========================================================
echo.

echo [1/3] 正在检查 Cloudflare 全球公网隧道系统服务...
sc query Cloudflared | findstr /i "RUNNING" >nul
if %errorlevel% neq 0 (
    echo     - 正在启动 Cloudflared 系统服务...
    net start Cloudflared >nul 2>&1
) else (
    echo     - Cloudflared 隧道服务已在运行中。
)

echo [2/3] 正在检查本地智能识别评测服务 (端口 8090)...
netstat -ano | findstr /r "8090.*LISTENING" >nul
if %errorlevel% neq 0 (
    echo     - 正在启动本地 Python 服务中枢...
    start "KG_Server" /min "D:\1EnvironmentConfiguration\Python 3.13.7\python.exe" "D:\Desktop\闲鱼\用户_76994842\server.py"
    timeout /t 2 /nobreak >nul
) else (
    echo     - 本地识别服务已在运行中。
)

echo [3/3] 正在打开一体机大屏界面...
start http://127.0.0.1:8090

echo.
echo ========================================================
echo   【服务全部就绪】
echo.
echo   一体机大屏端访问: http://127.0.0.1:8090
echo   公网手机扫码直传: https://kids.k78.dpdns.org/mobile
echo.
echo   特点：手机使用移动流量、Wi-Fi 或微信扫码均可秒传！
echo   已配置 Windows 开机自动静默运行，无需重复操作。
echo ========================================================
echo.
timeout /t 3 >nul
exit
