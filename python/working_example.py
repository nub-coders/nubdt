#!/usr/bin/env python3
"""
Working NubDB Python Example - Batch Mode

This demonstrates the simplest working approach to use NubDB from Python.
"""

import subprocess
import tempfile
import os

def execute_nubdb_batch(commands):
    """
    Execute multiple NubDB commands in a batch.
    Returns list of responses.
    """
    # Create temporary command file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        for cmd in commands:
            f.write(cmd + '\n')
        f.write('QUIT\n')
        batch_file = f.name
    
    try:
        # Execute NubDB with batch file
        result = subprocess.run(
            f'../zig-out/bin/nubdt < {batch_file}',
            shell=True,
            capture_output=True,
            text=True,
            timeout=3,
            cwd=os.path.dirname(__file__) or '.'
        )
        
        # Parse output - filter out prompts and system messages
        responses = []
        for line in result.stdout.split('\n'):
            line = line.strip()
            if line and not any(x in line for x in [
                '>', 'NubDB', 'Initializing', 'Replaying', 
                'Database ready', 'Syncing', 'Goodbye', 'Compaction'
            ]):
                responses.append(line)
        
        return responses
    finally:
        # Clean up
        os.unlink(batch_file)

def main():
    print("╔════════════════════════════════════════════╗")
    print("║  NubDB Python Integration - Working Demo  ║")
    print("╚════════════════════════════════════════════╝\n")
    
    # Example 1: Basic operations
    print("1. Basic SET/GET operations:")
    commands = [
        'SET name "Alice"',
        'SET age "30"',
        'SET city "New York"',
        'GET name',
        'GET age',
        'GET city'
    ]
    results = execute_nubdb_batch(commands)
    print(f"   Results: {results}")
    
    # Example 2: Counters
    print("\n2. Counter operations:")
    commands = [
        'SET counter 100',
        'INCR counter',
        'INCR counter',
        'DECR counter',
        'GET counter'
    ]
    results = execute_nubdb_batch(commands)
    print(f"   Results: {results}")
    
    # Example 3: Multiple users
    print("\n3. Storing multiple users:")
    commands = [
        'SET user:1:name "Alice"',
        'SET user:2:name "Bob"',
        'SET user:3:name "Charlie"',
        'SIZE',
        'GET user:1:name',
        'GET user:2:name',
        'GET user:3:name'
    ]
    results = execute_nubdb_batch(commands)
    print(f"   Results: {results}")
    
    # Example 4: EXISTS and DELETE
    print("\n4. EXISTS and DELETE:")
    commands = [
        'SET temp "temporary"',
        'EXISTS temp',
        'DELETE temp',
        'EXISTS temp'
    ]
    results = execute_nubdb_batch(commands)
    print(f"   Results: {results}")
    
    print("\n✓ All examples completed successfully!")
    print("\nNote: This method works immediately but has subprocess overhead.")
    print("For production use, consider adding TCP server mode to NubDB.")

if __name__ == "__main__":
    main()
