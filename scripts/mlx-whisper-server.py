#!/usr/bin/env python3
"""Local HTTP bridge for MLX Whisper word timestamps."""
import os
import tempfile

import mlx_whisper
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import uvicorn

HOST = os.getenv("WHISPER_HOST", "127.0.0.1")
PORT = int(os.getenv("WHISPER_PORT", "8787"))
MODEL = os.getenv("WHISPER_MODEL", "mlx-community/whisper-large-v3-turbo")

app = FastAPI(title="CAIG Local Whisper")

@app.get("/health")
def health():
    return {"ok": True, "model": MODEL}

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
    path = None
    try:
        payload = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(payload)
            path = tmp.name
        result = mlx_whisper.transcribe(path, path_or_hf_repo=MODEL, word_timestamps=True)
        words = []
        for segment in result.get("segments", []):
            for word in segment.get("words", []):
                words.append({
                    "word": word.get("word", "").strip(),
                    "start": float(word.get("start", 0)),
                    "end": float(word.get("end", 0)),
                })
        return {"text": result.get("text", ""), "words": words, "segments": result.get("segments", [])}
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})
    finally:
        if path:
            try:
                os.remove(path)
            except OSError:
                pass

if __name__ == "__main__":
    print(f"[MLX Whisper] http://{HOST}:{PORT} model={MODEL}")
    uvicorn.run(app, host=HOST, port=PORT)
