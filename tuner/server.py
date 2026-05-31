"""Tuner service — lightweight Flask app that proxies config to the engine."""

import json
import os
import socket
import struct

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

ENGINE_HOST = os.environ.get("ENGINE_HOST", "engine")
ENGINE_CONFIG_PORT = int(os.environ.get("ENGINE_CONFIG_PORT", "3002"))


# ── TCP helpers (same framing as the engine) ─────────────────────────────────

def _recv_exact(sock: socket.socket, size: int) -> bytes:
    data = b""
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk:
            raise ConnectionError("Socket closed before receiving all data")
        data += chunk
    return data


def _send_to_engine(payload: dict, timeout: float = 5.0) -> dict:
    """Send a JSON command to the engine config server and return the response."""
    body = json.dumps(payload).encode("utf-8")
    header = struct.pack(">I", len(body))

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)

    try:
        sock.connect((ENGINE_HOST, ENGINE_CONFIG_PORT))
        sock.sendall(header + body)

        # Read 4-byte response length
        resp_header = _recv_exact(sock, 4)
        resp_length = struct.unpack(">I", resp_header)[0]

        # Read response body
        resp_body = _recv_exact(sock, resp_length)
        return json.loads(resp_body.decode("utf-8"))
    finally:
        sock.close()


# ── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/config", methods=["GET"])
def get_config():
    try:
        result = _send_to_engine({"action": "get_config"})
        return jsonify(result)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 502


@app.route("/api/config", methods=["POST"])
def set_config():
    try:
        data = request.get_json(force=True)
        result = _send_to_engine({"action": "set_config", "data": data})
        return jsonify(result)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 502


@app.route("/api/config/reset", methods=["POST"])
def reset_config():
    try:
        result = _send_to_engine({"action": "reset_config"})
        return jsonify(result)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 502


@app.route("/api/config/defaults", methods=["GET"])
def get_defaults():
    try:
        result = _send_to_engine({"action": "get_default_config"})
        return jsonify(result)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 502


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5555, debug=True)
