import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Ensure the src directory is in the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from nubdb import NubDB

class TestMgetPerformance(unittest.TestCase):
    def setUp(self):
        # Mock the connection to avoid actual socket operations
        with patch('nubdb.client.socket.socket'):
            with patch.object(NubDB, 'connect'):
                self.db = NubDB()
                self.db._connected = True

    def test_mget_command_count(self):
        """Benchmark the number of commands sent during an mget operation."""
        keys = ["key1", "key2", "key3", "key4", "key5"]

        with patch.object(self.db, '_send_command', return_value='"value"') as mock_send:
            self.db.mget(*keys)

            call_count = mock_send.call_count
            print(f"\n[Benchmark] mget with {len(keys)} keys sent {call_count} commands.")

            # Current implementation should send one GET command per key
            # After optimization, it should send only 1 MGET command
            if call_count == len(keys):
                print("[Baseline] Detected N+1 query pattern.")
            elif call_count == 1:
                print("[Optimized] Single batch command used.")
            else:
                print(f"[Unexpected] Sent {call_count} commands.")

if __name__ == "__main__":
    unittest.main()
