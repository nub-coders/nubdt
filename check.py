import socket
import os

class NubDBClient:
    def __init__(self, host=None, port=6379):
        """
        Initialize NubDB client with automatic host detection.
        
        Priority:
        1. Explicit host parameter
        2. NUBDB_HOST environment variable
        3. Auto-detect: 'db.nubcoder.com' for production, 'localhost' for local
        """
        if host is None:
            host = os.getenv('NUBDB_HOST')
            if host is None:
                # Default to domain for production, localhost for development
                host = 'db.nubcoder.com'
        
        self.host = host
        self.port = port
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        
        try:
            self.sock.connect((host, port))
            print(f"✓ Connected to NubDB at {host}:{port}")
        except socket.gaierror:
            # Fallback to localhost if domain not resolved
            print(f"✗ Could not resolve {host}, trying localhost...")
            self.host = 'localhost'
            self.sock.connect((self.host, port))
            print(f"✓ Connected to NubDB at {self.host}:{port}")
    
    def set(self, key, value):
        cmd = f"SET {key} {value}\n"
        self.sock.sendall(cmd.encode())
        return self.sock.recv(1024).decode().strip()
    
    def get(self, key):
        cmd = f"GET {key}\n"
        self.sock.sendall(cmd.encode())
        return self.sock.recv(1024).decode().strip()
    
    def size(self):
        cmd = "SIZE\n"
        self.sock.sendall(cmd.encode())
        return self.sock.recv(1024).decode().strip()
    
    def delete(self, key):
        cmd = f"DEL {key}\n"
        self.sock.sendall(cmd.encode())
        return self.sock.recv(1024).decode().strip()
    
    def close(self):
        self.sock.close()

# Usage examples
if __name__ == "__main__":
    # Will use db.nubcoder.com by default, or localhost if domain not resolved
    client = NubDBClient()
    
    # Set a value
    print("\nSetting key: greeting = Hello from Python!")
    result = client.set('greeting', 'Hello from Python!')
    print(f"Response: {result}")
    
    # Get the value
    print("\nGetting key: greeting")
    result = client.get('greeting')
    print(f"Response: {result}")
    
    # Check database size
    print("\nChecking database size")
    result = client.size()
    print(f"Response: {result}")
    
    # Close connection
    client.close()
    print("\n✓ Connection closed")
