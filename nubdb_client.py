"""
NubDB Python Client - Simple File-based Communication

This client uses a simpler approach: writes commands to stdin and reads from stdout.
Works with the existing NubDB binary without modifications.
"""

import subprocess
import os
import time
from typing import Optional, Union


class NubDB:
    """NubDB Python Client using direct command execution"""
    
    def __init__(self, nubdt_path: str = "./zig-out/bin/nubdt"):
        """Initialize NubDB client"""
        self.nubdt_path = nubdt_path
        if not os.path.exists(self.nubdt_path):
            raise FileNotFoundError(f"NubDB binary not found at {self.nubdt_path}")
    
    def _execute(self, command: str) -> str:
        """Execute a single command and return the result"""
        # Create a temporary command file
        cmd_input = f"{command}\nQUIT\n"
        
        result = subprocess.run(
            [self.nubdt_path],
            input=cmd_input,
            capture_output=True,
            text=True,
            timeout=5
        )
        
        # Parse output - skip headers and prompts
        lines = result.stdout.strip().split('\n')
        for i, line in enumerate(lines):
            if line.startswith('>'):
                # Found a response line, get the next one
                if i + 1 < len(lines):
                    response = lines[i + 1]
                    if not response.startswith('>'):
                        return response.strip()
        
        return ""
    
    def set(self, key: str, value: Union[str, int, float], ttl: int = 0) -> bool:
        """Set a key-value pair"""
        value_str = str(value)
        # Quote strings with spaces
        if ' ' in value_str or isinstance(value, str):
            value_str = f'"{value_str}"'
        
        cmd = f'SET {key} {value_str}'
        if ttl > 0:
            cmd += f' {ttl}'
        
        response = self._execute(cmd)
        return response == "OK"
    
    def get(self, key: str) -> Optional[str]:
        """Get a value by key"""
        response = self._execute(f"GET {key}")
        if response == "(nil)":
            return None
        # Remove quotes if present
        if response.startswith('"') and response.endswith('"'):
            return response[1:-1]
        return response
    
    def delete(self, key: str) -> bool:
        """Delete a key"""
        response = self._execute(f"DELETE {key}")
        return response == "OK"
    
    def exists(self, key: str) -> bool:
        """Check if a key exists"""
        response = self._execute(f"EXISTS {key}")
        return response == "1"
    
    def incr(self, key: str) -> int:
        """Increment a key's value"""
        response = self._execute(f"INCR {key}")
        try:
            return int(response)
        except ValueError:
            return 0
    
    def decr(self, key: str) -> int:
        """Decrement a key's value"""
        response = self._execute(f"DECR {key}")
        try:
            return int(response)
        except ValueError:
            return 0
    
    def size(self) -> int:
        """Get number of keys"""
        response = self._execute("SIZE")
        try:
            return int(response.split()[0])
        except (ValueError, IndexError):
            return 0
    
    def clear(self) -> bool:
        """Clear all keys"""
        response = self._execute("CLEAR")
        return response == "OK"


class NubDBBatch:
    """
    Batch operations client for better performance.
    Executes multiple commands in a single database session.
    """
    
    def __init__(self, nubdt_path: str = "./zig-out/bin/nubdt"):
        self.nubdt_path = nubdt_path
        self.commands = []
    
    def set(self, key: str, value: Union[str, int, float], ttl: int = 0):
        """Add SET command to batch"""
        value_str = str(value)
        if ' ' in value_str or isinstance(value, str):
            value_str = f'"{value_str}"'
        
        cmd = f'SET {key} {value_str}'
        if ttl > 0:
            cmd += f' {ttl}'
        self.commands.append(cmd)
        return self
    
    def get(self, key: str):
        """Add GET command to batch"""
        self.commands.append(f"GET {key}")
        return self
    
    def delete(self, key: str):
        """Add DELETE command to batch"""
        self.commands.append(f"DELETE {key}")
        return self
    
    def incr(self, key: str):
        """Add INCR command to batch"""
        self.commands.append(f"INCR {key}")
        return self
    
    def decr(self, key: str):
        """Add DECR command to batch"""
        self.commands.append(f"DECR {key}")
        return self
    
    def execute(self) -> list:
        """Execute all batched commands and return results"""
        if not self.commands:
            return []
        
        cmd_input = '\n'.join(self.commands) + '\nQUIT\n'
        
        result = subprocess.run(
            [self.nubdt_path],
            input=cmd_input,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        # Parse all responses
        lines = result.stdout.strip().split('\n')
        responses = []
        
        for line in lines:
            if not line.startswith('>') and not line.startswith('NubDB') and \
               not line.startswith('Initializing') and not line.startswith('Replaying') and \
               not line.startswith('Database ready') and not line.startswith('Syncing') and \
               not line.startswith('Goodbye') and line.strip():
                responses.append(line.strip())
        
        self.commands = []  # Clear for reuse
        return responses


# Convenience functions
def quick_set(key: str, value: Union[str, int, float], ttl: int = 0) -> bool:
    """Quick set without keeping client instance"""
    return NubDB().set(key, value, ttl)


def quick_get(key: str) -> Optional[str]:
    """Quick get without keeping client instance"""
    return NubDB().get(key)


if __name__ == "__main__":
    print("╔════════════════════════════════════════╗")
    print("║   NubDB Python Client - Demo          ║")
    print("╚════════════════════════════════════════╝\n")
    
    db = NubDB()
    
    # Test SET and GET
    print("1. Testing SET and GET:")
    db.set("name", "Alice")
    db.set("age", 30)
    db.set("city", "New York")
    print(f"   name = {db.get('name')}")
    print(f"   age = {db.get('age')}")
    print(f"   city = {db.get('city')}")
    
    # Test EXISTS
    print("\n2. Testing EXISTS:")
    print(f"   'name' exists: {db.exists('name')}")
    print(f"   'unknown' exists: {db.exists('unknown')}")
    
    # Test counters
    print("\n3. Testing INCR/DECR:")
    db.set("counter", 100)
    print(f"   Initial: {db.get('counter')}")
    print(f"   After INCR: {db.incr('counter')}")
    print(f"   After INCR: {db.incr('counter')}")
    print(f"   After DECR: {db.decr('counter')}")
    
    # Test SIZE
    print(f"\n4. Total keys: {db.size()}")
    
    # Test DELETE
    print("\n5. Testing DELETE:")
    db.delete("city")
    print(f"   'city' exists after delete: {db.exists('city')}")
    print(f"   Total keys: {db.size()}")
    
    # Test batch operations
    print("\n6. Testing Batch Operations:")
    batch = NubDBBatch()
    batch.set("user:1", "Alice").set("user:2", "Bob").set("user:3", "Charlie")
    results = batch.execute()
    print(f"   Batch results: {results}")
    
    print("\n✓ All tests completed!")
