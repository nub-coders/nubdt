import socket

class NubDBClient:
    def __init__(self, host='nubdb-server', port=6379):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.connect((host, port))
    
    def set(self, key, value):
        cmd = f"SET {key} {value}\n"
        self.sock.sendall(cmd.encode())
        return self.sock.recv(1024).decode().strip()
    
    def get(self, key):
        cmd = f"GET {key}\n"
        self.sock.sendall(cmd.encode())
        return self.sock.recv(1024).decode().strip()

# Usage
client = NubDBClient()
client.set('greeting', 'Hello from Python!')
result = client.get('greeting')
print(result)  # "Hello from Python!"
