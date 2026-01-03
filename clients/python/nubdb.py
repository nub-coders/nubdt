"""
NubDB Python Client

Simple client library for connecting to NubDB database.
Requires NubDB to run in TCP server mode.
"""

import socket
from typing import Optional


class NubDB:
    """NubDB Python Client"""

    def __init__(self, host: str = 'localhost', port: int = 6379):
        """
        Connect to NubDB server.
        
        Args:
            host: Server hostname
            port: Server port
        """
        self.host = host
        self.port = port
        self.sock = None
        self.file = None
        self.connect()

    def connect(self):
        """Establish connection to NubDB"""
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.connect((self.host, self.port))
        self.file = self.sock.makefile('rw')

    def send_command(self, command: str) -> str:
        """Send command and get response"""
        self.file.write(command + '\n')
        self.file.flush()
        response = self.file.readline().strip()
        return response

    def set(self, key: str, value: str, ttl: int = 0) -> bool:
        """
        SET key-value pair.
        
        Args:
            key: The key
            value: The value
            ttl: Time-to-live in seconds (optional)
            
        Returns:
            True if successful
        """
        cmd = f'SET {key} "{value}"'
        if ttl > 0:
            cmd += f' {ttl}'
        response = self.send_command(cmd)
        return response == 'OK'

    def get(self, key: str) -> Optional[str]:
        """
        GET value by key.
        
        Args:
            key: The key
            
        Returns:
            The value or None if not found
        """
        response = self.send_command(f'GET {key}')
        if response == '(nil)':
            return None
        # Remove quotes
        return response.strip('"')

    def delete(self, key: str) -> bool:
        """
        DELETE key.
        
        Args:
            key: The key
            
        Returns:
            True if deleted
        """
        response = self.send_command(f'DELETE {key}')
        return response == 'OK'

    def exists(self, key: str) -> bool:
        """
        EXISTS check if key exists.
        
        Args:
            key: The key
            
        Returns:
            True if exists
        """
        response = self.send_command(f'EXISTS {key}')
        return response == '1'

    def incr(self, key: str) -> int:
        """
        INCR increment counter.
        
        Args:
            key: The key
            
        Returns:
            New value
        """
        response = self.send_command(f'INCR {key}')
        return int(response)

    def decr(self, key: str) -> int:
        """
        DECR decrement counter.
        
        Args:
            key: The key
            
        Returns:
            New value
        """
        response = self.send_command(f'DECR {key}')
        return int(response)

    def size(self) -> int:
        """
        SIZE get number of keys.
        
        Returns:
            Number of keys
        """
        response = self.send_command('SIZE')
        return int(response.split()[0])

    def clear(self) -> bool:
        """
        CLEAR delete all keys.
        
        Returns:
            True if successful
        """
        response = self.send_command('CLEAR')
        return response == 'OK'

    def close(self):
        """Close connection"""
        if self.file:
            try:
                self.send_command('QUIT')
            except:
                pass
            self.file.close()
        if self.sock:
            self.sock.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def __del__(self):
        self.close()


# Example usage
if __name__ == '__main__':
    print("NubDB Python Client - Example\n")

    with NubDB() as client:
        # SET operations
        client.set('name', 'Alice')
        client.set('age', '30')
        client.set('city', 'New York')

        # GET operations
        print(f"name: {client.get('name')}")
        print(f"age: {client.get('age')}")
        print(f"city: {client.get('city')}")

        # Counter
        client.set('counter', '100')
        print(f"\ncounter: {client.incr('counter')}")
        print(f"counter: {client.incr('counter')}")
        print(f"counter: {client.decr('counter')}")

        # Size
        print(f"\nTotal keys: {client.size()}")

        print("\n✓ Example completed!")
