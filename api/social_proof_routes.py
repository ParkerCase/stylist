from fastapi import APIRouter
from fastapi.responses import JSONResponse
import subprocess
import json
import os
import time

router = APIRouter()

CACHE_FILE = "celebrity_styles.json"
CACHE_MAX_AGE = 2 * 24 * 60 * 60  # 2 days in seconds


@router.get("/celebrity-styles")
def get_celebrity_styles():
    # Serve cached data if it exists and is fresh
    if os.path.exists(CACHE_FILE):
        mtime = os.path.getmtime(CACHE_FILE)
        age = time.time() - mtime
        if age < CACHE_MAX_AGE:
            with open(CACHE_FILE, "r") as f:
                try:
                    data = json.load(f)
                    return JSONResponse(content={"items": data})
                except Exception as e:
                    return JSONResponse(
                        content={"error": f"Failed to load cached data: {e}"},
                        status_code=500,
                    )
    # If no fresh cache, run the scraper
    try:
        result = subprocess.run(
            ["npx", "ts-node", "services/social-proof/whoWhatWearScraper.ts"],
            capture_output=True,
            text=True,
            check=True,
        )
        data = json.loads(result.stdout)
        # Save to cache
        with open(CACHE_FILE, "w") as f:
            json.dump(data, f)
        return JSONResponse(content={"items": data})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
