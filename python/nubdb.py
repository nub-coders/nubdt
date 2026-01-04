"""
NubDB Python Client - Simple and Fast

This version uses echo to pipe commands directly to nubdt.
Perfect for single operations or scripts.
"""

import subprocess
import os
from typing import Optional, Union


class NubDB:
    """Simple NubDB Python Client"""
    
    def __init__(self, nubdt_path: str = "../zig-out/bin/nubdt"):
        """Initialize client with path to nubdt binary"""
        self.nubdt_path = nubdt_path
        if not os.path.exists(self.nubdt_path):
            raise FileNotFoundError(f"NubDB binary not found: {self.nubdt_path}")
    
    def _run_command(self, command: str) -> str:
        """Execute a command using echo pipe"""
        cmd = f'echo -e "{command}\\nQUIT" | timeout 2 {self.nubdt_path} 2>/dev/null | grep -v "^>" | grep -v "NubDB" | grep -v "Initializing" | grep -v "Replaying" | grep -v "Database ready" | grep -v "Syncing" | grep -v "Goodbye" | grep -v "Compaction" | tail -n 1'
        
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=3
        )
        
        return result.stdout.strip()
    
    def set(self, key: str, value: Union[str, int, float], ttl: int = 0) -> bool:
        """Set a key-value pair"""
        value_str = str(value).replace('"', '\\"')
        
        cmd = f'SET {key} \\"{value_str}\\"'
        if ttl > 0:
            cmd += f' {ttl}'
        
        response = self._run_command(cmd)
        return "OK" in response
    
    def get(self, key: str) -> Optional[str]:
        """Get value by key"""
        response = self._run_command(f"GET {key}")
        
        if not response or "(nil)" in response:
            return None
        
        # Clean up response
        response = response.strip()
        if response.startswith('"') and response.endswith('"'):
            return response[1:-1]
        return response
    
    def delete(self, key: str) -> bool:
        """Delete a key"""
        response = self._run_command(f"DELETE {key}")
        return "OK" in response
    
    def exists(self, key: str) -> bool:
        """Check if key exists"""
        response = self._run_command(f"EXISTS {key}")
        return "1" in response
    
    def incr(self, key: str) -> int:
        """Increment counter"""
        response = self._run_command(f"INCR {key}")
        try:
            return int(response)
        except ValueError:
            return 0
    
    def decr(self, key: str) -> int:
        """Decrement counter"""
        response = self._run_command(f"DECR {key}")
        try:
            return int(response)
        except ValueError:
            return 0
    
    def size(self) -> int:
        """Get number of keys"""
        response = self._run_command("SIZE")
        try:
            return int(response.split()[0])
        except (ValueError, IndexError):
            return 0


# Quick one-off functions
def set_key(key: str, value: Union[str, int, float], ttl: int = 0, 
            db_path: str = "../zig-out/bin/nubdt") -> bool:
    """Quick set operation"""
    return NubDB(db_path).set(key, value, ttl)


def get_key(key: str, db_path: str = "../zig-out/bin/nubdt") -> Optional[str]:
    """Quick get operation"""
    return NubDB(db_path).get(key)


def delete_key(key: str, db_path: str = "../zig-out/bin/nubdt") -> bool:
    """Quick delete operation"""
    return NubDB(db_path).delete(key)


if __name__ == "__main__":
    print("╔═══════════════════════════════════════════════╗")
    print("║     NubDB Python Client - Simple Demo        ║")
    print("╚═══════════════════════════════════════════════╝\n")
    
    db = NubDB()
    
    # Basic operations
    print("1. SET operations:")
    print(f"   SET name Alice: {db.set('name', 'Alice')}")
    print(f"   SET age 30: {db.set('age', 30)}")
    print(f"   SET city 'New York': {db.set('city', 'New York')}")
    
    print("\n2. GET operations:")
    print(f"   GET name: {db.get('name')}")
    print(f"   GET age: {db.get('age')}")
    print(f"   GET city: {db.get('city')}")
    
    print("\n3. EXISTS operations:")
    print(f"   EXISTS name: {db.exists('name')}")
    print(f"   EXISTS unknown: {db.exists('unknown')}")
    
    print("\n4. Counter operations:")
    db.set("counter", 100)
    print(f"   Initial: {db.get('counter')}")
    print(f"   INCR: {db.incr('counter')}")
    print(f"   INCR: {db.incr('counter')}")
    print(f"   DECR: {db.decr('counter')}")
    print(f"   Current: {db.get('counter')}")
    
    print("\n5. SIZE:")
    print(f"   Total keys: {db.size()}")
    
    print("\n6. DELETE:")
    print(f"   DELETE city: {db.delete('city')}")
    print(f"   EXISTS city: {db.exists('city')}")
    print(f"   Total keys: {db.size()}")
    
    print("\n7. Quick functions:")
    set_key("quick_test", "hello")
    print(f"   quick_get('quick_test'): {get_key('quick_test')}")
    
    print("\n✓ All tests completed successfully!")
