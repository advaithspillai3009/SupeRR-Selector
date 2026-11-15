import os
import sys

# Ensure project root is in the Python search path
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Expose the FastAPI instance
from web.server import app

if __name__ == "__main__":
    import uvicorn
    print("\n========================================================")
    print("  SupeRR Selector — Pressure Performance Intelligence")
    print("  Running via main.py on http://127.0.0.1:8000")
    print("========================================================\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
