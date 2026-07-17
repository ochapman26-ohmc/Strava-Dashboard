"""Vercel Python serverless function: POST /api/garmin-sync"""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler

from garmin_lib import sync_activities


def _authorized(headers: dict[str, str]) -> bool:
    """Only enforce auth when GARMIN_INTERNAL_SECRET is explicitly set."""
    raw = os.environ.get("GARMIN_INTERNAL_SECRET")
    if not raw or not raw.strip():
        return True
    secret = raw.splitlines()[0].strip().split()[0]
    return headers.get("x-internal-secret") == secret


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._json(400, {"error": "Invalid JSON body"})
            return

        if not _authorized({k.lower(): v for k, v in self.headers.items()}):
            self._json(401, {"error": "Unauthorized"})
            return

        email = str(body.get("email") or "").strip()
        password = str(body.get("password") or "")
        limit = int(body.get("limit") or 50)

        if not email or not password:
            self._json(400, {"error": "email and password are required"})
            return

        try:
            payload = sync_activities(email, password, limit)
            self._json(200, payload)
        except Exception as error:  # noqa: BLE001
            self._json(500, {"error": str(error)})

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return

    def _json(self, status: int, payload: dict) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
