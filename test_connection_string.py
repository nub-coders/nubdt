import sys
import os

# Add local package to python path
sys.path.insert(0, os.path.abspath("nubdb-python/src"))

from nubdb.client import NubDB

def test_connection_string():
    url = "nubdb://db.nubcoder.com:6379"
    print(f"Connecting to {url}...")
    
    try:
        db = NubDB(url)
        print("Connected successfully!")
        
        # Test basic commands
        print("Setting key 'connection_test'...")
        db.set("connection_test", "Hello from Connection String!")
        
        val = db.get("connection_test")
        print(f"Retrieved value: {val}")
        
        size = db.size()
        print(f"Database size: {size}")
        
        db.close()
        print("Connection closed.")
        
    except Exception as e:
        print(f"Connection failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_connection_string()
