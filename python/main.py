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
                send_response(client_socket, {"ok": True, "rows": []})
                return

            df = pd.read_csv(io.StringIO(csv_text))
            result_df = engine.run_pipeline(df)
            rows = json.loads(result_df.to_json(orient="records", date_format="iso"))
            send_response(client_socket, {"ok": True, "rows": rows})
        except Exception as e:
            print(f"Exception caught : {e}")
            try:
                send_response(client_socket, {"ok": False, "error": str(e)})
            except Exception as send_error:
                print(f"Failed to send error response: {send_error}")
        finally:
            client_socket.close()
            
                
    print(f"[DISCONNECTED] {client_address} disconnected.")

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
    start_server()
