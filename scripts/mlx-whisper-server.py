#!/usr/bin/env python3
"""Tiny local HTTP bridge for MLX Whisper word timestamps."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import cgi
import json
import os
import tempfile

import mlx_whisper

HOST = os.getenv("WHISPER_HOST", "127.0.0.1")
PORT = int(os.getenv("WHISPER_PORT", "8787"))
MODEL = os.getenv("WHISPER_MODEL", "mlx-community/whisper-large-v3-turbo")

class Handler(BaseHTTPRequestHandler):
    def _json(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {"ok": True, "model": MODEL})
            return
        self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/transcribe":
            self._json(404, {"error": "not found"})
            return
        try:
            ctype, _ = cgi.parse_header(self.headers.get("content-type", ""))
            if ctype != "multipart/form-data":
                self._json(400, {"error": "expected multipart/form-data"})
                return
            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": self.headers.get("content-type", "")})
            upload = form["file"] if "file" in form else None
            if not upload or not getattr(upload, "filename", None):
                self._json(400, {"error": "missing file"})
                return
            suffix = os.path.splitext(upload.filename)[1] or ".mp4"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(upload.file.read())
                audio_path = tmp.name
            try:
                result = mlx_whisper.transcribe(audio_path, path_or_hf_repo=MODEL, word_timestamps=True)
                words = []
                for segment in result.get("segments", []):
                    for word in segment.get("words", []):
                        words.append({
                            "word": word.get("word", "").strip(),
                            "start": float(word.get("start", 0)),
                            "end": float(word.get("end", 0)),
                        })
                self._json(200, {"text": result.get("text", ""), "words": words, "segments": result.get("segments", [])})
            finally:
                try:
                    os.remove(audio_path)
                except OSError:
                    pass
        except Exception as exc:
            self._json(500, {"error": str(exc)})

if __name__ == "__main__":
    print(f"[MLX Whisper] http://{HOST}:{PORT} model={MODEL}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
