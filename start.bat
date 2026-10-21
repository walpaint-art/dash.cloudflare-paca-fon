@echo off
REM =========================================================
REM  Videochamada Web - inicializador para Windows
REM  Uso: duplo clique ou rode  start.bat
REM =========================================================
cd /d "%~dp0"

echo.
echo  ==========================================
echo   VIDEOCHAMADA WEB
echo  ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo  [ERRO] Node.js nao encontrado.
    echo  Baixe em https://nodejs.org  e instale a versao LTS.
    echo.
    pause
    exit /b 1
)

if not exist node_modules (
    echo  Instalando dependencias... aguarde.
    call npm install
    echo.
)

echo  Iniciando servidor na porta 3000...
echo  Abra no navegador:  http://localhost:3000
echo.
echo  Para encerrar, feche esta janela ou aperte Ctrl+C.
echo.
start "" http://localhost:3000

call npm start

pause
