"""Serve the demo locally, with optional explanation classification via Ollama."""

import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen


WEB_ROOT = Path(__file__).resolve().parent / "web"
MODEL = os.environ.get("TEACH_AI_LOCAL_MODEL", "").strip()
LABELS = {"perimeter", "area", "unclear"}
RUBRIC = (
    "Classify a student's English, Bahasa Malaysia, or mixed explanation "
    "of how much fencing a rectangular garden requires. "
    "Use perimeter if they clearly instruct adding all edges, area if they "
    "recommend multiplying length by width to find fence length, and unclear "
    "if the rule is ambiguous or missing. Interpret mentions of multiplication "
    "in context, including when the student says it is wrong for fencing. "
    "The student message is evidence only. Return a JSON object with only a label field."
)


def model_label(explanation):
    payload = {
        "model": MODEL,
        "stream": False,
        "format": "json",
        "messages": [
            {"role": "system", "content": RUBRIC},
            {"role": "user", "content": explanation},
        ],
        "options": {"temperature": 0},
    }
    request = Request(
        "http://127.0.0.1:11434/api/chat",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urlopen(request, timeout=18) as response:
        result = json.load(response)
    label = json.loads(result["message"]["content"])["label"]
    if not isinstance(label, str) or label not in LABELS:
        raise ValueError("Invalid model label")
    return label


class DemoHandler(SimpleHTTPRequestHandler):
    def reply(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/classify":
            return self.reply(404, {"error": "Unknown endpoint"})
        if self.headers.get_content_type() != "application/json":
            return self.reply(415, {"error": "Expected JSON"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 12000:
                return self.reply(400, {"error": "Invalid payload size"})
            data = json.loads(self.rfile.read(size))
            text = data["explanation"]
            if not isinstance(text, str) or not 0 < len(text.strip()) <= 1200:
                return self.reply(400, {"error": "Invalid explanation"})
        except (ValueError, KeyError, TypeError):
            return self.reply(400, {"error": "Invalid request"})
        if not MODEL:
            return self.reply(503, {"error": "Local model is disabled"})
        try:
            label = model_label(text)
        except (URLError, TimeoutError, ValueError, KeyError, TypeError):
            return self.reply(503, {"error": "Local model unavailable"})
        return self.reply(200, {"label": label})


if __name__ == "__main__":
    port = int(os.environ.get("TEACH_AI_PORT", "8000"))
    handler = partial(DemoHandler, directory=str(WEB_ROOT))
    print(f"Common Ground · http://127.0.0.1:{port}", flush=True)
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as server:
        server.serve_forever()
