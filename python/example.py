#!/usr/bin/env python3
"""
Simple NubDB Python Example

This demonstrates basic usage of NubDB from Python using simple subprocess calls.
"""

import subprocess
import sys

def nubdb_command(cmd):
    """Execute a single NubDB command and return result"""
    full_cmd = f'echo "{cmd}" | ../zig-out/bin/nubdt 2>/dev/null | grep -v "NubDB" | grep -v "Initializing" | grep -v "Replaying" | grep -v "Database ready" | grep -v "^>" | grep -v "Syncing" | grep -v "Goodbye" | tail -1'
    
    result = subprocess.run(full_cmd, shell=True, capture_output=True, text=True, timeout=2)
    return result.stdout.strip()

def main():
    print("=== NubDB Python Example ===\n")
    
    # Example 1: Simple SET and GET
    print("1. Basic Operations:")
    nubdb_command("SET name Alice")
    result = nubdb_command("GET name")
    print(f"   GET name: {result}")
    
    # Example 2: Counter
    print("\n2. Counter:")
    nubdb_command("SET counter 100")
    result = nubdb_command("INCR counter")
    print(f"   INCR counter: {result}")
    
    # Example 3: Multiple keys
    print("\n3. Multiple Keys:")
    nubdb_command("SET user:1 Alice")
    nubdb_command("SET user:2 Bob")
    nubdb_command("SET user:3 Charlie")
    result = nubdb_command("SIZE")
    print(f"   SIZE: {result}")
    
    print("\n✓ Done!")

if __name__ == "__main__":
    main()
