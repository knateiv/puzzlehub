@echo off
chcp 65001 >nul
title Puzzle Hub - may chu thu nghiem
cd /d "%~dp0"
echo ============================================================
echo   PUZZLE HUB (ban web) dang chay. DUNG TAT cua so nay.
echo   Tren iPhone (cung Wi-Fi), mo Safari va go dia chi:
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo        http:%%a:8765
echo.
echo   (Neu Windows hoi Firewall, chon "Allow access" cho Private network)
echo ============================================================
python -m http.server 8765 --bind 0.0.0.0
pause
