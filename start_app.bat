@echo off
echo ==================================================
echo   Iniciando NexusJob AI - Agente de Empleo
echo ==================================================

cd /d "%~dp0"

if not exist "venv\Scripts\python.exe" (
    echo Creando entorno virtual...
    python -m venv venv
    call venv\Scripts\python.exe -m pip install -r backend\requirements.txt
    call venv\Scripts\python.exe -m pip install python-multipart
)

echo Iniciando servidor en http://localhost:8000...
start http://localhost:8000
venv\Scripts\python.exe backend\run.py
pause
