import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.mcp_server import run_mcp_stdio_server

if __name__ == "__main__":
    run_mcp_stdio_server()
