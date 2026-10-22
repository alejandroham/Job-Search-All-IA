Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Iniciando NexusJob AI - Agente de Empleo" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot

if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "Creando entorno virtual..." -ForegroundColor Yellow
    python -m venv venv
    & .\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
    & .\venv\Scripts\python.exe -m pip install python-multipart
}

Write-Host "Iniciando servidor en http://localhost:8000..." -ForegroundColor Green
Start-Process "http://localhost:8000"
& .\venv\Scripts\python.exe backend\run.py
