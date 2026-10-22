import uvicorn
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"\n==================================================")
    print(f"  NexusJob AI - Agente Autónomo de Búsqueda de Empleo")
    print(f"  Servidor Iniciado en: http://localhost:{port}")
    print(f"  Documentación Swagger: http://localhost:{port}/docs")
    print(f"==================================================\n")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
