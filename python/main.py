import socket
import threading
import numpy as np
import engine
import struct
import io

# Server configuration
HOST = '0.0.0.0'  # Localhost
PORT = 3001        # High port number for testing

def recv_exact(sock, size):
    data = b''

    while len(data) < size:
        chunk = sock.recv(size - len(data))

        if not chunk:
            raise ConnectionError("Socket closed")

        data += chunk

    return data



def handle_client(client_socket:socket.socket, client_address):
    """Handles communication with a single connected client."""
    print(f"[NEW CONNECTION] {client_address} connected.")
    
    with client_socket:
        try:
            # Read 4-byte length
            header = recv_exact(client_socket, 4)
            payload_length = struct.unpack(">I", header)[0]

            # Read payload
            payload = recv_exact(client_socket, payload_length).decode()

            print(f"Received {payload_length} bytes")
            array = np.loadtxt(
                io.StringIO(payload),
                delimiter=",",
                skiprows=1,  # if CSV has a header
            )
            response = engine.run_pipeline(payload)
            client_socket.sendall(response.to_json())
        except Exception as e:
            print(f"Exception caught : {e}")
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
