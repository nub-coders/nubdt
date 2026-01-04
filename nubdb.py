"""
NubDB Python Client

A Python client library for connecting to NubDB database.
Supports all NubDB operations: SET, GET, DELETE, EXISTS, INCR, DECR, SIZE, CLEAR.

Usage:
    from nubdb import NubDB
    
    db = NubDB()
    db.set("key", "value")
    value = db.get("key")
    db.close()
"""

import subprocess
import os
from typing import Optional, Union


class NubDBError(Exception):
    """Base exception for NubDB errors"""
    pass


class NubDB:
    """
    NubDB Python Client
    
    Provides a high-level interface to interact with NubDB database.
    Uses subprocess communication with the nubdt binary.
    """
    
    def __init__(self, nubdt_path: str = "./zig-out/bin/nubdt"):
        """
        Initialize NubDB client.
        
        Args:
            nubdt_path: Path to the nubdt executable
        """
        self.nubdt_path = nubdt_path
        self.process = None
        self._start_process()
    
    def _start_process(self):
        """Start the NubDB process"""
        if not os.path.exists(self.nubdt_path):
            raise NubDBError(f"NubDB binary not found at {self.nubdt_path}")
        
        self.process = subprocess.Popen(
            [self.nubdt_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        
        # Read startup messages
        for _ in range(5):
            line = self.process.stdout.readline()
            if "Database ready" in line:
                break
    
    def _send_command(self, command: str) -> str:
        """
        Send a command to NubDB and get the response.
        
        Args:
            command: Command string to send
            
        Returns:
            Response from the database
        """
        if self.process is None or self.process.poll() is not None:
            raise NubDBError("Database connection is closed")
        
        self.process.stdin.write(command + "\n")
        self.process.stdin.flush()
        
        # Skip the prompt
        self.process.stdout.readline()
        
        # Read the response
        response = self.process.stdout.readline().strip()
        return response
    
    def set(self, key: str, value: Union[str, int, float], ttl: int = 0) -> bool:
        """
        Set a key-value pair.
        
        Args:
            key: The key to set
            value: The value to store
            ttl: Time-to-live in seconds (0 = no expiration)
            
        Returns:
            True if successful
        """
        cmd = f'SET {key} "{value}"'
        if ttl > 0:
            cmd += f" {ttl}"
        
        response = self._send_command(cmd)
        return response == "OK"
    
    def get(self, key: str) -> Optional[str]:
        """
        Get a value by key.
        
        Args:
            key: The key to retrieve
            
        Returns:
            The value, or None if not found
        """
        response = self._send_command(f"GET {key}")
        if response == "(nil)":
            return None
        # Remove quotes if present
        if response.startswith('"') and response.endswith('"'):
            return response[1:-1]
        return response
    
    def delete(self, key: str) -> bool:
        """
        Delete a key.
        
        Args:
            key: The key to delete
            
        Returns:
            True if deleted, False if not found
        """
        response = self._send_command(f"DELETE {key}")
        return response == "OK"
    
    def exists(self, key: str) -> bool:
        """
        Check if a key exists.
        
        Args:
            key: The key to check
            
        Returns:
            True if exists, False otherwise
        """
        response = self._send_command(f"EXISTS {key}")
        return response == "1"
    
    def incr(self, key: str) -> int:
        """
        Increment a key's integer value by 1.
        
        Args:
            key: The key to increment
            
        Returns:
            The new value
        """
        response = self._send_command(f"INCR {key}")
        return int(response)
    
    def decr(self, key: str) -> int:
        """
        Decrement a key's integer value by 1.
        
        Args:
            key: The key to decrement
            
        Returns:
            The new value
        """
        response = self._send_command(f"DECR {key}")
        return int(response)
    
    def size(self) -> int:
        """
        Get the number of keys in the database.
        
        Returns:
            Number of keys
        """
        response = self._send_command("SIZE")
        # Parse "N keys" format
        return int(response.split()[0])
    
    def clear(self) -> bool:
        """
        Delete all keys from the database.
        
        Returns:
            True if successful
        """
        response = self._send_command("CLEAR")
        return response == "OK"
    
    def close(self):
        """Close the database connection"""
        if self.process and self.process.poll() is None:
            try:
                self.process.stdin.write("QUIT\n")
                self.process.stdin.flush()
                self.process.wait(timeout=2)
            except:
                self.process.terminate()
                self.process.wait(timeout=1)
            finally:
                self.process = None
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()
    
    def __del__(self):
        """Destructor"""
        self.close()


# Simple synchronous API for one-off operations
def quick_set(key: str, value: Union[str, int, float], ttl: int = 0, 
              nubdt_path: str = "./zig-out/bin/nubdt") -> bool:
    """Quick set operation without keeping connection open"""
    with NubDB(nubdt_path) as db:
        return db.set(key, value, ttl)


def quick_get(key: str, nubdt_path: str = "./zig-out/bin/nubdt") -> Optional[str]:
    """Quick get operation without keeping connection open"""
    with NubDB(nubdt_path) as db:
        return db.get(key)


if __name__ == "__main__":
    # Example usage
    print("NubDB Python Client - Demo")
    print("-" * 40)
    
    with NubDB() as db:
        # Set some values
        print("Setting values...")
        db.set("name", "Alice")
        db.set("age", 30)
        db.set("city", "New York")
        
        # Get values
        print(f"name = {db.get('name')}")
        print(f"age = {db.get('age')}")
        print(f"city = {db.get('city')}")
        
        # Check existence
        print(f"'name' exists: {db.exists('name')}")
        print(f"'unknown' exists: {db.exists('unknown')}")
        
        # Counters
        print("\nCounter operations:")
        db.set("counter", 100)
        print(f"Initial counter: {db.get('counter')}")
        print(f"After INCR: {db.incr('counter')}")
        print(f"After INCR: {db.incr('counter')}")
        print(f"After DECR: {db.decr('counter')}")
        
        # Size
        print(f"\nTotal keys: {db.size()}")
        
        # Delete
        print("\nDeleting 'city'...")
        db.delete("city")
        print(f"'city' exists: {db.exists('city')}")
        print(f"Total keys: {db.size()}")
    
    print("\n✓ Demo complete!")
