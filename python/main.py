import socket
import threading
import engine
import struct
import io
import os
import json
import pandas as pd

# Server configuration
HOST = os.environ.get('PY_ENGINE_HOST', '0.0.0.0')
PORT = int(os.environ.get('PY_ENGINE_PORT', '3001'))
CONFIG_PORT = int(os.environ.get('PY_CONFIG_PORT', '3002'))
CONFIG_PATH = os.environ.get('PY_CONFIG_PATH', '/app/config.json')

def recv_exact(sock, size):
    data = b''

    while len(data) < size:
        chunk = sock.recv(size - len(data))

        if not chunk:
            raise ConnectionError("Socket closed")

        data += chunk

    return data



def send_response(sock: socket.socket, payload: dict):
    body = json.dumps(payload).encode('utf-8')
    header = struct.pack(">I", len(body))
    sock.sendall(header + body)


def handle_client(client_socket: socket.socket, client_address):
    """Handles communication with a single connected client."""
    print(f"[NEW CONNECTION] {client_address} connected.")
    
    with client_socket:
        try:
            # Read 4-byte length
            header = recv_exact(client_socket, 4)
            payload_length = struct.unpack(">I", header)[0]

            # Read payload
            payload = recv_exact(client_socket, payload_length)

            print(f"Received {payload_length} bytes")
            csv_text = payload.decode('utf-8')
            if csv_text.strip() == '__ping__':
                print("Reply to ping")
                send_response(client_socket, {"ok": True, "rows": []})
                return

            df = pd.read_csv(io.StringIO(csv_text))
            result = engine.run_pipeline(df, return_metrics=True)
            if isinstance(result, tuple):
                result_df, metrics = result
            else:
                result_df, metrics = result, None
            rows = json.loads(result_df.to_json(orient="records", date_format="iso"))
            send_response(client_socket, {"ok": True, "rows": rows, "metrics": metrics})
        except Exception as e:
            print(f"Exception caught : {e}")
            try:
                send_response(client_socket, {"ok": False, "error": str(e)})
            except Exception as send_error:
                print(f"Failed to send error response: {send_error}")
        finally:
            print("Client closed")
            client_socket.close()
            
                
    print(f"[DISCONNECTED] {client_address} disconnected.")


# ─────────────────────────────────────────────────────────────────────────────
# Config TCP Server (port 3002)
# ─────────────────────────────────────────────────────────────────────────────
def handle_config_client(client_socket: socket.socket, client_address):
    """Handle a config get/set request on the config TCP channel."""
    print(f"[CONFIG] Connection from {client_address}")

    with client_socket:
        try:
            # Read 4-byte length header
            header = recv_exact(client_socket, 4)
            payload_length = struct.unpack(">I", header)[0]

            # Read JSON payload
            raw = recv_exact(client_socket, payload_length)
            request = json.loads(raw.decode('utf-8'))

            action = request.get("action", "")

            if action == "get_config":
                config = engine.get_config()
                send_response(client_socket, {"ok": True, "config": config})

            elif action == "get_default_config":
                config = engine.get_default_config()
                send_response(client_socket, {"ok": True, "config": config})

            elif action == "set_config":
                data = request.get("data", {})
                updated = engine.set_config(data)
                engine.save_config(CONFIG_PATH)
                send_response(client_socket, {"ok": True, "config": updated})

            elif action == "reset_config":
                default = engine.get_default_config()
                engine.set_config(default)
                engine.save_config(CONFIG_PATH)
                send_response(client_socket, {"ok": True, "config": engine.get_config()})

            else:
                send_response(client_socket, {
                    "ok": False,
                    "error": f"Unknown action: {action}"
                })

        except Exception as e:
            print(f"[CONFIG] Error: {e}")
            try:
                send_response(client_socket, {"ok": False, "error": str(e)})
            except Exception:
                pass
        finally:
            client_socket.close()

    print(f"[CONFIG] {client_address} disconnected.")


def start_config_server():
    """Start the config TCP server on CONFIG_PORT."""
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, CONFIG_PORT))
    server.listen()
    print(f"[CONFIG] Listening on {HOST}:{CONFIG_PORT}")

    while True:
        client_socket, client_address = server.accept()
        t = threading.Thread(
            target=handle_config_client,
            args=(client_socket, client_address),
        )
        t.start()


def start_server():
    """Starts the main server loop to listen for multiple clients."""
    # Create an IPv4 TCP socket
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    
    # Avoid "Address already in use" errors on restart
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    server.bind((HOST, PORT))
    server.listen()
    print(f"[LISTENING] Server is listening on {HOST}:{PORT}")
    
    while True:
        # Accept incoming client connections
        client_socket, client_address = server.accept()
        
        # Create a new thread to handle the client concurrently
        client_thread = threading.Thread(
            target=handle_client, 
            args=(client_socket, client_address)
        )
        
        # Start the thread
        client_thread.start()
        
        # Count total active threads (minus the main thread)
        print(f"[ACTIVE CONNECTIONS] {threading.active_count() - 1}")

if __name__ == "__main__":
    # Load saved config from disk (if exists)
    engine.load_config(CONFIG_PATH)

    # Start config server in a background thread
    config_thread = threading.Thread(target=start_config_server, daemon=True)
    config_thread.start()

    # Start analysis server on the main thread
    start_server()
